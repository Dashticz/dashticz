<?php
/* DPD helpers for vendor/dashticz/dpd/index.php: login, fetch and the
 * mapping of DPD parcels to the widget's {status, who, from, to,
 * deliveryDate} entries. No output of its own, so tests can load it. */

// myDPD consumer API (DPD Netherlands, shared myDPD backend) - the same
// chain the myDPD mobile app uses: Keycloak password login, a guest token
// with the app's own client credentials, then consignee-SSO for the user
// token. Endpoints as documented by the ha-dpd Home Assistant integration.
define('DASHTICZ_DPD_KEYCLOAK_URL', 'https://login.dpdgroup.com/auth/realms/login/protocol/openid-connect/token');
define('DASHTICZ_DPD_KEYCLOAK_CLIENT_ID', 'MOBILE-APP-PROD');
define('DASHTICZ_DPD_GUEST_TOKEN_URL', 'https://www.dpdgroup.com/concept/webservice/oauth/token?grant_type=client_credentials');
define('DASHTICZ_DPD_SSO_URL', 'https://www.dpdgroup.com/concept/webservice/users/login/consignee-sso?bu=DPD-NL');
define('DASHTICZ_DPD_PARCELS_URL', 'https://www.dpdgroup.com/concept/webservice/v7/parcels?bu=DPD-NL&lang=en');
// base64 of the myDPD app's "<client_id>:<client_secret>" (shipped inside the app).
define('DASHTICZ_DPD_BASIC_TOKEN', 'bXlEUEQgTW9iaWxlIEFwcDpaMVdzeTQ4RGpseWcweDdVWjhvWTlYdmZIT2xIbW4yTmpJdnYycmpVVjY3N1hDOGhiTGlkNHY2OWpCQzlvZnpU');
define('DASHTICZ_DPD_USER_AGENT', 'okhttp/4.12.0');

function dashticz_dpd_read_input()
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid DPD request.');
    }

    $username = isset($input['username']) ? trim((string) $input['username']) : '';
    $password = isset($input['password']) ? (string) $input['password'] : '';
    if ($username === '' || $password === '') {
        throw new RuntimeException('Enter your myDPD e-mail address and password in the widget settings.');
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

function dashticz_dpd_cache_file($username, $password)
{
    $dir = dashticz_cache_dir('dpd');
    if ($dir === null) {
        throw new RuntimeException('DPD cache directory is not writable.');
    }
    // Keyed with the password too, like the PostNL and DHL caches.
    return $dir . '/' . hash_hmac('sha256', strtolower($username), (string) $password) . '.json';
}

function dashticz_dpd_read_cache($cacheFile)
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

function dashticz_dpd_write_cache($cacheFile, $days, $incoming, $sent)
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

function dashticz_dpd_post($url, $body, $headers)
{
    $response = dashticz_http_request($url, array(
        'connectTimeout' => 10,
        'timeout' => 20,
        'post' => true,
        'body' => $body,
        'userAgent' => DASHTICZ_DPD_USER_AGENT,
        'headers' => array_merge(array('Accept: application/json'), $headers),
    ));
    if ($response['failed']) {
        throw new RuntimeException('Unable to reach DPD.');
    }
    $data = json_decode($response['body'], true);
    return array('status' => $response['status'], 'data' => is_array($data) ? $data : array());
}

function dashticz_dpd_login($username, $password)
{
    $kc = dashticz_dpd_post(
        DASHTICZ_DPD_KEYCLOAK_URL,
        http_build_query(array(
            'client_id' => DASHTICZ_DPD_KEYCLOAK_CLIENT_ID,
            'grant_type' => 'password',
            'scope' => 'openid',
            'username' => $username,
            'password' => $password,
        )),
        array('Content-Type: application/x-www-form-urlencoded')
    );
    if (empty($kc['data']['access_token'])) {
        if ($kc['status'] >= 500) {
            throw new RuntimeException('DPD login failed.');
        }
        throw new RuntimeException('DPD rejected the e-mail address or password.');
    }

    $guest = dashticz_dpd_post(
        DASHTICZ_DPD_GUEST_TOKEN_URL,
        '',
        array('Authorization: Basic ' . DASHTICZ_DPD_BASIC_TOKEN, 'Content-Type: application/json')
    );
    if (empty($guest['data']['access_token'])) {
        throw new RuntimeException('DPD login failed.');
    }

    $sso = dashticz_dpd_post(
        DASHTICZ_DPD_SSO_URL,
        (string) $kc['data']['access_token'],
        array('Authorization: Bearer ' . $guest['data']['access_token'], 'Content-Type: text/plain')
    );
    if (empty($sso['data']['access_token'])) {
        throw new RuntimeException('DPD login failed.');
    }
    return (string) $sso['data']['access_token'];
}

function dashticz_dpd_get_parcels($token)
{
    $r = dashticz_dpd_post(
        DASHTICZ_DPD_PARCELS_URL,
        json_encode(array(
            'incomingParcels' => array(),
            'sendingParcels' => array(),
            'confirmedParcels' => null,
            'shipmentCollections' => array(),
            'confirmedShipmentCollections' => null,
        )),
        array('Authorization: Bearer ' . $token, 'Content-Type: application/json')
    );
    if ($r['status'] !== 200) {
        throw new RuntimeException('Fetching DPD shipments failed.');
    }
    return $r['data'];
}

// ---------------------------------------------------------------- mapping

// DPD gives the expected day, plus a local from/to time once it is known
// (the Follow My Parcel window on the day of delivery wins). Times are
// local (Europe/Amsterdam) without an offset, which moment() reads as local.
function dashticz_dpd_window($item)
{
    $fmp = (isset($item['fmpDeliveryDateAndTime']) && is_array($item['fmpDeliveryDateAndTime']))
        ? $item['fmpDeliveryDateAndTime']
        : array();
    $range = (isset($fmp['timeRange']) && is_array($fmp['timeRange'])) ? $fmp['timeRange'] : array();
    if (!empty($fmp['deliveryDate']) && !empty($range['from'])) {
        $day = substr((string) $fmp['deliveryDate'], 0, 10);
        return array(
            $day . 'T' . $range['from'],
            !empty($range['to']) ? $day . 'T' . $range['to'] : '',
        );
    }
    $day = isset($item['deliveryDate']) ? substr((string) $item['deliveryDate'], 0, 10) : '';
    if ($day === '') {
        return array('', '');
    }
    $from = !empty($item['deliveryTimeFrom']) ? $day . 'T' . $item['deliveryTimeFrom'] : $day;
    $to = !empty($item['deliveryTimeTo']) ? $day . 'T' . $item['deliveryTimeTo'] : '';
    return array($from, $to);
}

// One DPD shipment -> {status, who, from, to, deliveryDate}, with the same
// status keywords as the PostNL and DHL bridges.
function dashticz_dpd_build_entry($item, $role)
{
    list($from, $to) = dashticz_dpd_window($item);
    $statusBlock = (isset($item['status']) && is_array($item['status'])) ? $item['status'] : array();
    $description = isset($statusBlock['description']) ? (string) $statusBlock['description'] : '';
    if ($description === 'DELIVERED') {
        $status = 'Delivered';
    } elseif ($description === 'RETURN_TO_SENDER') {
        $status = 'ReturnToSender';
    } elseif ($description === 'AVAILABLE_FOR_COLLECTION') {
        $status = 'AtPickupPoint';
    } elseif ($description === 'UNSUCCESSFUL_DELIVERY_ATTEMPT') {
        $status = 'Problem';
    } else {
        $status = $from ? 'Open' : 'InTransit';
    }

    $nameKey = $role === 'receiver' ? 'senderName' : 'receiverName';
    $who = (isset($item[$nameKey]) && is_string($item[$nameKey])) ? $item[$nameKey] : '';

    $delivered = $status === 'Delivered';
    $deliveredAt = '';
    if ($delivered) {
        $deliveredAt = !empty($statusBlock['eventDateAndTime'])
            ? (string) $statusBlock['eventDateAndTime']
            : (isset($item['deliveryDate']) ? (string) $item['deliveryDate'] : '');
    }
    return array(
        'status' => $status,
        'who' => $who,
        'from' => $delivered ? '' : $from,
        'to' => $delivered ? '' : $to,
        'deliveryDate' => $deliveredAt,
    );
}

// usort() is not stable before PHP 8.0; ties keep their original order.
function dashticz_dpd_stable_sort($list, $compare)
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
function dashticz_dpd_pending_entries($entries)
{
    $pending = array_values(array_filter($entries, function ($entry) {
        return $entry['status'] !== 'Delivered' && $entry['status'] !== 'ReturnToSender';
    }));
    return array_slice(dashticz_dpd_stable_sort($pending, function ($a, $b) {
        return strcmp($a['from'], $b['from']);
    }), 0, 10);
}

// Delivered within the last $days days, newest first.
function dashticz_dpd_recent_delivered($entries, $days)
{
    $cutoff = time() - $days * 86400;
    $delivered = array_values(array_filter($entries, function ($entry) use ($cutoff) {
        $ts = strtotime($entry['deliveryDate']);
        return $entry['status'] === 'Delivered' && $ts !== false && $ts >= $cutoff;
    }));
    return array_slice(dashticz_dpd_stable_sort($delivered, function ($a, $b) {
        return strcmp($b['deliveryDate'], $a['deliveryDate']);
    }), 0, 10);
}

// Splits the myDPD parcels answer into the widget's incoming/sent lists.
function dashticz_dpd_split($payload, $days)
{
    $lists = array('incoming' => 'incomingShipments', 'sent' => 'sendingShipments');
    $result = array();
    foreach ($lists as $key => $field) {
        $entries = array();
        $items = (isset($payload[$field]) && is_array($payload[$field])) ? $payload[$field] : array();
        foreach ($items as $item) {
            if (is_array($item)) {
                $entries[] = dashticz_dpd_build_entry($item, $key === 'incoming' ? 'receiver' : 'sender');
            }
        }
        $result[$key] = array_slice(array_merge(
            dashticz_dpd_pending_entries($entries),
            dashticz_dpd_recent_delivered($entries, $days)
        ), 0, 10);
    }
    return $result;
}

// -------------------------------------------------------------- orchestration

function dashticz_dpd_get_shipments($username, $password, $days, $ttlSeconds)
{
    $cacheFile = dashticz_dpd_cache_file($username, $password);
    $cache = dashticz_dpd_read_cache($cacheFile);

    if ($cache && isset($cache['fetchedAt']) && isset($cache['days']) && (int) $cache['days'] === $days
        && (time() - (int) $cache['fetchedAt']) < $ttlSeconds) {
        return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
    }

    // A refresh that failed a moment ago is not repeated for a few minutes: a
    // rejected password repeated by every dashboard can get the account blocked.
    if (dashticz_cache_failure_recent($cache, 300)) {
        if (isset($cache['incoming'], $cache['sent'])) {
            return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
        }
        throw new RuntimeException($cache['error']);
    }

    try {
        $token = dashticz_dpd_login($username, $password);
        $result = dashticz_dpd_split(dashticz_dpd_get_parcels($token), $days);
        dashticz_dpd_write_cache($cacheFile, $days, $result['incoming'], $result['sent']);
        return $result;
    } catch (RuntimeException $error) {
        // A transient DPD/network hiccup falls back to the last known good
        // result rather than blanking the tile, like the other bridges.
        dashticz_cache_note_failure($cacheFile, $cache, $error->getMessage());
        if ($cache && isset($cache['incoming'], $cache['sent'])) {
            return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
        }
        throw $error;
    }
}
