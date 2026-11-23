<?php
/* DHL helpers for vendor/dashticz/dhl/index.php: login, fetch and the
 * mapping of DHL parcels to the widget's {status, who, from, to,
 * deliveryDate} entries. No output of its own, so tests can load it. */

// My DHL (DHL eCommerce NL / DHL Parcel) consumer API - the same endpoints
// the my.dhlecommerce.nl website itself uses.
define('DASHTICZ_DHL_LOGIN_URL', 'https://my.dhlecommerce.nl/api/user/login');
define('DASHTICZ_DHL_PARCELS_URL', 'https://my.dhlecommerce.nl/receiver-parcel-api/parcels');
define('DASHTICZ_DHL_SENT_URL', 'https://my.dhlecommerce.nl/api/orders/sentShipments?max=250');

function dashticz_dhl_read_input()
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid DHL request.');
    }

    $username = isset($input['username']) ? trim((string) $input['username']) : '';
    $password = isset($input['password']) ? (string) $input['password'] : '';
    if ($username === '' || $password === '') {
        throw new RuntimeException('Enter your My DHL e-mail address and password in the widget settings.');
    }

    $days = isset($input['days']) ? (int) $input['days'] : 2;
    $days = max(1, min(30, $days));

    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 60;
    $pollMinutes = max(15, min(720, $pollMinutes));

    return array(
        'username' => $username,
        'password' => $password,
        'days' => $days,
        'pollMinutes' => $pollMinutes,
    );
}

// ---------------------------------------------------------------- caching

function dashticz_dhl_cache_file($username, $password)
{
    $dir = dashticz_cache_dir('dhl');
    if ($dir === null) {
        throw new RuntimeException('DHL cache directory is not writable.');
    }
    // Keyed with the password too, like the PostNL cache: a changed password
    // starts a new cache file (and a new login).
    return $dir . '/' . hash_hmac('sha256', strtolower($username), (string) $password) . '.json';
}

function dashticz_dhl_read_cache($cacheFile)
{
    if (!is_file($cacheFile)) {
        return null;
    }
    $body = @file_get_contents($cacheFile);
    if ($body === false || $body === '') {
        return null;
    }
    $data = json_decode($body, true);
    return is_array($data) ? $data : null;
}

function dashticz_dhl_write_cache($cacheFile, $days, $incoming, $sent)
{
    $data = array(
        'days' => $days,
        'fetchedAt' => time(),
        'incoming' => $incoming,
        'sent' => $sent,
    );
    dashticz_atomic_write_file($cacheFile, json_encode($data), 0600);
}

// -------------------------------------------------------------- http/curl

function dashticz_dhl_http($url, $jsonBody, $extraHeaders, $cookieFile)
{
    $options = array(
        'connectTimeout' => 10,
        'timeout' => 20,
        'cookieFile' => $cookieFile,
        'userAgent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'headers' => array_merge(array('Accept: application/json'), $extraHeaders),
    );
    if ($jsonBody !== null) {
        $options['post'] = true;
        $options['body'] = json_encode($jsonBody);
        $options['headers'][] = 'Content-Type: application/json';
    }
    $response = dashticz_http_request($url, $options);
    if ($response['failed']) {
        throw new RuntimeException('Unable to reach DHL.');
    }
    return array('body' => $response['body'], 'status' => $response['status']);
}

// Reads one cookie's value from the Netscape-format cookie jar curl wrote
// (the XSRF-TOKEN cookie has to be sent back as the x-xsrf-token header).
function dashticz_dhl_cookie_value($cookieFile, $name)
{
    if (!is_file($cookieFile)) {
        return null;
    }
    $lines = @file($cookieFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return null;
    }
    foreach ($lines as $line) {
        // curl writes HttpOnly cookies with a '#HttpOnly_' prefix.
        if (strpos($line, '#HttpOnly_') === 0) {
            $line = substr($line, 10);
        } elseif ($line === '' || $line[0] === '#') {
            continue;
        }
        $fields = explode("\t", $line);
        if (count($fields) >= 7 && $fields[5] === $name) {
            return $fields[6];
        }
    }
    return null;
}

function dashticz_dhl_login($username, $password, $cookieFile)
{
    $r = dashticz_dhl_http(
        DASHTICZ_DHL_LOGIN_URL,
        array('email' => $username, 'password' => $password),
        array(),
        $cookieFile
    );
    if ($r['status'] === 401 || $r['status'] === 403) {
        throw new RuntimeException('DHL rejected the e-mail address or password.');
    }
    if ($r['status'] !== 200) {
        throw new RuntimeException('DHL login failed.');
    }
}

function dashticz_dhl_get_json($url, $cookieFile)
{
    $xsrf = dashticz_dhl_cookie_value($cookieFile, 'XSRF-TOKEN');
    $r = dashticz_dhl_http($url, null, $xsrf ? array('x-xsrf-token: ' . $xsrf) : array(), $cookieFile);
    if ($r['status'] !== 200) {
        throw new RuntimeException('Fetching DHL shipments failed.');
    }
    $data = json_decode($r['body'], true);
    return is_array($data) ? $data : array();
}

// ---------------------------------------------------------------- mapping

// Granular DHL statuses: ready to collect at a ServicePoint / locker.
function dashticz_dhl_pickup_statuses()
{
    return array(
        'NOTIFICATION_FOR_PARCELSHOP_COLLECTION_HAS_BEEN_SENT',
        'NOTIFICATION_FOR_PARCELSTATION_COLLECTION_HAS_BEEN_SENT',
        'AWAITING_RECEIVER_COLLECTION',
        'CLOSED_AWAITING_COLLECTION',
        'DELIVERED_AT_ACCESSPOINT',
        'DELIVERED_AT_PARCELSTATION',
        'DELIVERY_CODE_MISSING_PICK_UP',
        'ON_HOLD_FOR_COLLECTION',
        'PARCEL_FOUND_AT_PARCELSHOP',
        'PARCEL_HELD_FOR_COLLECTION_AT_LOCAL_DEPOT',
        'REMINDER_FOR_COLLECTION_SENT_EMAIL',
        'REMINDER_FOR_COLLECTION_SENT_LETTER',
        'REMINDER_FOR_COLLECTION_SENT_SMS',
    );
}

// Granular DHL statuses: delivery failed, the parcel goes back to the sender.
function dashticz_dhl_return_statuses()
{
    return array(
        'ADDRESS_UNKNOWN',
        'CUSTOMS_DATA_INCORRECT_RETURN_TO_SHIPPER',
        'DAMAGE_RETURN',
        'DELIVERED_AT_SHIPPER',
        'DELIVERY_CODE_MISSING_RETURN',
        'DELIVERY_DATA_INCORRECT_RETURN',
        'INTERVENTION_RECEIVER_REQUEST_DELIVERY_CANCELLED',
        'INTERVENTION_SHIPPER_REQUEST_DELIVERY_CANCELLED',
        'MISROUTED_RETURN_TO_SHIPPER',
        'NOT_HOME_RETURN_TO_SHIPPER',
        'ON_ROUTE_TO_SHIPPER',
        'PARCEL_ALREADY_RETURNED',
        'PARCEL_RELABELED_FOR_RETURN_TO_SHIPPER',
        'PARCEL_SCANNED_AT_RETURN_HUB',
        'POSTAL_CODE_INCORRECT',
        'RECEIVER_RETURN',
        'RECEIVER_UNKNOWN_RETURN',
        'REFUSED_AT_PARCELSHOP',
        'REFUSED_BY_RECEIVER',
        'REFUSED_NOT_COLLECTED',
        'REFUSED_RETURN',
        'RETURNED_NOT_COLLECTED',
        'RETURNED_TO_SHIPPER',
        'STORAGE_PERIOD_ENDED_AT_ACCESSPOINT',
        'STORAGE_PERIOD_ENDED_AT_PARCELSHOP',
        'STORAGE_PERIOD_ENDED_AT_PARCELSTATION',
    );
}

// DHL timestamps are UTC ('...Z'); returned as ISO 8601 with offset, which
// moment() in the widget turns into local time.
function dashticz_dhl_iso($value)
{
    if (!$value) {
        return '';
    }
    $ts = strtotime((string) $value);
    return $ts === false ? (string) $value : gmdate('Y-m-d\TH:i:s\Z', $ts);
}

function dashticz_dhl_party_name($block)
{
    if (!is_array($block)) {
        return '';
    }
    if (!empty($block['name'])) {
        return (string) $block['name'];
    }
    return (isset($block['address']['city']) && is_string($block['address']['city'])) ? $block['address']['city'] : '';
}

// One DHL parcel / sent shipment -> {status, who, from, to, deliveryDate},
// with the same status keywords as the PostNL bridge plus AtPickupPoint and
// Problem.
function dashticz_dhl_build_entry($item, $role)
{
    $indication = (isset($item['receivingTimeIndication']) && is_array($item['receivingTimeIndication']))
        ? $item['receivingTimeIndication']
        : array();
    $type = isset($indication['indicationType']) ? $indication['indicationType'] : '';
    $from = '';
    $to = '';
    if ($type === 'MomentIndication') {
        $from = dashticz_dhl_iso(isset($indication['moment']) ? $indication['moment'] : '');
    } elseif ($type === 'IntervalIndication') {
        $from = dashticz_dhl_iso(isset($indication['start']) ? $indication['start'] : '');
        $to = dashticz_dhl_iso(isset($indication['end']) ? $indication['end'] : '');
    }

    $rawStatus = isset($item['status']) ? (string) $item['status'] : '';
    $category = isset($item['category']) ? (string) $item['category'] : '';
    if ($category === 'DELIVERED') {
        $status = 'Delivered';
    } elseif (in_array($rawStatus, dashticz_dhl_return_statuses(), true)) {
        $status = 'ReturnToSender';
    } elseif (in_array($rawStatus, dashticz_dhl_pickup_statuses(), true)) {
        $status = 'AtPickupPoint';
    } elseif (in_array($category, array('INTERVENTION', 'EXCEPTION', 'PROBLEM'), true)
        && strpos($rawStatus, 'INTERVENTION_RECEIVER_REQUESTS_DELIVERY') !== 0) {
        // A receiver's own request (other day, neighbour, ServicePoint) is
        // not a problem: the parcel is still on its way.
        $status = 'Problem';
    } else {
        $status = $from ? 'Open' : 'InTransit';
    }

    if ($role === 'receiver') {
        $who = dashticz_dhl_party_name(isset($item['sender']) ? $item['sender'] : null);
    } else {
        $who = dashticz_dhl_party_name(isset($item['receiver']) ? $item['receiver'] : null);
        if ($who === '') {
            $who = dashticz_dhl_party_name(isset($item['sender']) ? $item['sender'] : null);
        }
    }

    $delivered = $status === 'Delivered';
    return array(
        'status' => $status,
        'who' => $who,
        'from' => $delivered ? '' : $from,
        'to' => $delivered ? '' : $to,
        'deliveryDate' => $delivered ? $from : '',
    );
}

// usort() is not stable before PHP 8.0, so equal entries could change order
// between PHP versions. Ties keep their original order here.
function dashticz_dhl_stable_sort($list, $compare)
{
    $indexed = array();
    foreach ($list as $i => $entry) {
        $indexed[] = array($i, $entry);
    }
    usort($indexed, function ($a, $b) use ($compare) {
        $result = call_user_func($compare, $a[1], $b[1]);
        return $result !== 0 ? $result : $a[0] - $b[0];
    });
    $sorted = array();
    foreach ($indexed as $pair) {
        $sorted[] = $pair[1];
    }
    return $sorted;
}

// Not yet delivered (and not returned), soonest expected first.
function dashticz_dhl_pending_entries($entries)
{
    $pending = array_values(array_filter($entries, function ($entry) {
        return $entry['status'] !== 'Delivered' && $entry['status'] !== 'ReturnToSender';
    }));
    return array_slice(dashticz_dhl_stable_sort($pending, function ($a, $b) {
        return strcmp($a['from'], $b['from']);
    }), 0, 10);
}

// Delivered within the last $days days, newest first.
function dashticz_dhl_recent_delivered($entries, $days)
{
    $cutoff = time() - $days * 86400;
    $delivered = array_values(array_filter($entries, function ($entry) use ($cutoff) {
        $ts = strtotime($entry['deliveryDate']);
        return $entry['status'] === 'Delivered' && $ts !== false && $ts >= $cutoff;
    }));
    return array_slice(dashticz_dhl_stable_sort($delivered, function ($a, $b) {
        return strcmp($b['deliveryDate'], $a['deliveryDate']);
    }), 0, 10);
}

// Splits the raw DHL lists into the widget's incoming/sent lists. A return
// the user ships back (a webshop return label) is listed among the incoming
// parcels with isReturn=true; for the widget it is something sent.
function dashticz_dhl_split($parcels, $sentShipments, $days)
{
    $receiverEntries = array();
    $senderEntries = array();
    foreach ($parcels as $item) {
        if (!is_array($item)) {
            continue;
        }
        if (!empty($item['isReturn'])) {
            $senderEntries[] = dashticz_dhl_build_entry($item, 'sender');
        } else {
            $receiverEntries[] = dashticz_dhl_build_entry($item, 'receiver');
        }
    }
    foreach ($sentShipments as $item) {
        if (!is_array($item) || (isset($item['type']) && $item['type'] !== 'outgoing')) {
            continue;
        }
        $senderEntries[] = dashticz_dhl_build_entry($item, 'sender');
    }
    return array(
        'incoming' => array_slice(array_merge(
            dashticz_dhl_pending_entries($receiverEntries),
            dashticz_dhl_recent_delivered($receiverEntries, $days)
        ), 0, 10),
        'sent' => array_slice(array_merge(
            dashticz_dhl_pending_entries($senderEntries),
            dashticz_dhl_recent_delivered($senderEntries, $days)
        ), 0, 10),
    );
}

// -------------------------------------------------------------- orchestration

function dashticz_dhl_get_shipments($username, $password, $days, $ttlSeconds)
{
    $cacheFile = dashticz_dhl_cache_file($username, $password);
    $cache = dashticz_dhl_read_cache($cacheFile);

    if ($cache && isset($cache['fetchedAt']) && isset($cache['days']) && (int) $cache['days'] === $days
        && (time() - (int) $cache['fetchedAt']) < $ttlSeconds) {
        return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
    }

    $cookieFile = tempnam(sys_get_temp_dir(), 'dtdhlck_');
    try {
        dashticz_dhl_login($username, $password, $cookieFile);
        $parcelsPayload = dashticz_dhl_get_json(DASHTICZ_DHL_PARCELS_URL, $cookieFile);
        $parcels = (isset($parcelsPayload['parcels']) && is_array($parcelsPayload['parcels']))
            ? $parcelsPayload['parcels']
            : array();
        // Sent shipments are a nice-to-have: never lose the incoming list over them.
        try {
            $sentShipments = dashticz_dhl_get_json(DASHTICZ_DHL_SENT_URL, $cookieFile);
            if ($sentShipments && array_keys($sentShipments) !== range(0, count($sentShipments) - 1)) {
                $sentShipments = array();
            }
        } catch (RuntimeException $error) {
            $sentShipments = array();
        }

        $result = dashticz_dhl_split($parcels, $sentShipments, $days);
        dashticz_dhl_write_cache($cacheFile, $days, $result['incoming'], $result['sent']);
        return $result;
    } catch (RuntimeException $error) {
        // A transient DHL/network hiccup falls back to the last known good
        // result rather than blanking the tile, like the PostNL bridge.
        if ($cache) {
            return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
        }
        throw $error;
    } finally {
        @unlink($cookieFile);
    }
}
