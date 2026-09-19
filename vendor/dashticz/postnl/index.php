<?php
require_once(__DIR__ . '/../security.php');

// Fixed PostNL/Akamai(Janrain) identity constants - mirrors the account web
// app exactly. Defined before the request runs below (define() is not hoisted).
define('DASHTICZ_POSTNL_TENANT', 'https://login.postnl.nl/101112a0-4a0f-4bbb-8176-2f1b2d370d7c');
define('DASHTICZ_POSTNL_OIDC_CLIENT', 'deb0a372-6d72-4e09-83fe-997beacbd137');
define('DASHTICZ_POSTNL_REDIRECT_URI', 'postnl://login');
define('DASHTICZ_POSTNL_SCOPE', 'openid profile email poa-profiles-api');
define('DASHTICZ_POSTNL_CAPTURE_SERVER', 'https://login.postnl.nl');
define('DASHTICZ_POSTNL_GRAPHQL_URL', 'https://jouw.postnl.nl/account/api/graphql');
define('DASHTICZ_POSTNL_TT_URL', 'https://jouw.postnl.nl/track-and-trace/api/trackAndTrace');
define('DASHTICZ_POSTNL_GRAPHQL_QUERY', '{ trackedShipments { receiverShipments { key creationDateTime title barcode delivered deliveredTimeStamp deliveryWindowFrom deliveryWindowTo shipmentType deliveryAddressType sourceDisplayName } senderShipments { key creationDateTime title barcode delivered deliveredTimeStamp deliveryWindowFrom deliveryWindowTo shipmentType deliveryAddressType sourceDisplayName } } }');

// This endpoint promises JSON even when PHP itself raises a fatal error.
@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// The full login flow below is ~10 sequential requests to login.postnl.nl;
// give it a time budget comfortably above what that can realistically take
// so a slow response is handled by this file's own try/catch, not by the
// host cutting the script off first with an unparseable empty response.
if (function_exists('set_time_limit')) {
    @set_time_limit(60);
}

register_shutdown_function(function () {
    $error = error_get_last();
    if (!$error || !in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
        return;
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(array(
        'error' => 'PostNL request failed unexpectedly.',
        'debug' => array(
            'message' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
        ),
    ));
});

/* Single backend bridge for the PostNL widget (js/components/postnl.js).
 * The user's PostNL e-mail address and password are posted here from the
 * browser on every poll (read from the widget's own global settings,
 * postnl_username/postnl_password - see js/widgeteditor.js), exactly like
 * the Lyrion Music Server block's own credentials (vendor/dashticz/lms/
 * index.php) - so a personal PostNL password never needs to travel to
 * PostNL directly from the browser, and PostNL's own (undocumented,
 * reverse-engineered) login flow only has to be implemented once, here.
 *
 * PostNL has no public consumer API; this ports the login/fetch flow the
 * domoticz_postnl plugin already reverse-engineers
 * (https://github.com/MadPatrick/domoticz_postnl, itself ported from the
 * Toon app's own "postnl" integration). If PostNL changes their login
 * process, this stops working until it's ported again.
 *
 * A successful login's refresh_token, plus the last fetched shipment list,
 * are cached server-side (custom/cache/postnl/<sha1(username)>.json) for
 * postnl_pollminutes (default 60, minimum 15) - both to avoid repeating the
 * heavy ~10-request login flow on every browser poll from every connected
 * dashboard, and because PostNL has been known to flag accounts polled too
 * often. The cache file never stores the password, only the refresh token
 * and the already-fetched (non-secret) shipment summaries.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the PostNL widget.');
    }
    $input = dashticz_postnl_read_input();
    $result = dashticz_postnl_get_shipments(
        $input['username'],
        $input['password'],
        $input['days'],
        $input['pollMinutes'] * 60
    );
    echo json_encode($result);
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}

class DashticzPostNLAuthError extends RuntimeException
{
}

function dashticz_postnl_read_input()
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid PostNL request.');
    }

    $username = isset($input['username']) ? trim((string) $input['username']) : '';
    $password = isset($input['password']) ? (string) $input['password'] : '';
    if ($username === '' || $password === '') {
        throw new RuntimeException('Enter your PostNL e-mail address and password in the widget settings.');
    }

    $days = isset($input['days']) ? (int) $input['days'] : 2;
    $days = max(1, min(30, $days));

    // Never below 15 minutes, matching the reference domoticz_postnl
    // plugin's own minimum poll interval (avoids the account being flagged
    // for polling too often).
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
// Mirrors vendor/dashticz/xmltv.php's own cache helpers: custom/cache/<name>
// with a system-temp fallback when that directory isn't writable.

function dashticz_postnl_cache_dir()
{
    $baseDir = dirname(__DIR__, 2) . '/custom/cache/postnl';
    if (!is_dir($baseDir)) {
        @mkdir($baseDir, 0775, true);
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        $baseDir = rtrim(sys_get_temp_dir(), '/\\') . '/dashticz-postnl-cache';
        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0775, true);
        }
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        throw new RuntimeException('PostNL cache directory is not writable.');
    }
    return $baseDir;
}

function dashticz_postnl_cache_file($username)
{
    return dashticz_postnl_cache_dir() . '/' . sha1(strtolower($username)) . '.json';
}

function dashticz_postnl_read_cache($cacheFile)
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

// Never persists the password - only the refresh token (needed to avoid a
// full re-login on every poll) and the already-fetched, non-secret shipment
// summaries.
function dashticz_postnl_write_cache($cacheFile, $refreshToken, $days, $incoming, $sent)
{
    $data = array(
        'refreshToken' => $refreshToken,
        'days' => $days,
        'fetchedAt' => time(),
        'incoming' => $incoming,
        'sent' => $sent,
    );
    $tmpFile = $cacheFile . '.tmp';
    if (@file_put_contents($tmpFile, json_encode($data), LOCK_EX) === false) {
        return;
    }
    @rename($tmpFile, $cacheFile);
}

// -------------------------------------------------------------- http/curl

// Shared curl helper for every request in the login/fetch flow. $cookieFile
// is used as both CURLOPT_COOKIEJAR and CURLOPT_COOKIEFILE so cookies
// (notably the hosted login page's _csrf_token and the SSO session cookie
// set in step 4) persist across the whole sequence of requests, exactly
// like Python's requests.Session() does. Redirects are never auto-followed
// (CURLOPT_FOLLOWLOCATION off) - several steps below need to read the
// Location header themselves (to detect the hosted-login redirect, or to
// extract the final ?code= from it) rather than have curl swallow it.
function dashticz_postnl_http($url, $postFields, $extraHeaders, $cookieFile)
{
    $ch = curl_init($url);
    $responseHeaders = array();
    $options = array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_COOKIEJAR => $cookieFile,
        CURLOPT_COOKIEFILE => $cookieFile,
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        CURLOPT_HEADERFUNCTION => function ($curlHandle, $headerLine) use (&$responseHeaders) {
            $length = strlen($headerLine);
            $parts = explode(':', $headerLine, 2);
            if (count($parts) === 2) {
                $responseHeaders[strtolower(trim($parts[0]))] = trim($parts[1]);
            }
            return $length;
        },
    );
    if ($postFields !== null) {
        $options[CURLOPT_POST] = true;
        // Always a URL-encoded string, never a raw array: curl treats an
        // array CURLOPT_POSTFIELDS as multipart/form-data, but PostNL's
        // login endpoints expect the plain application/x-www-form-urlencoded
        // body Python's requests.post(data=dict) itself sends.
        $options[CURLOPT_POSTFIELDS] = is_array($postFields) ? http_build_query($postFields) : $postFields;
    }
    if ($extraHeaders) {
        $options[CURLOPT_HTTPHEADER] = $extraHeaders;
    }
    curl_setopt_array($ch, $options);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failed = ($body === false);
    curl_close($ch);

    if ($failed) {
        throw new RuntimeException('Unable to reach PostNL.');
    }

    return array('body' => (string) $body, 'status' => $status, 'headers' => $responseHeaders);
}

function dashticz_postnl_first_match($pattern, $text, $exclude = null)
{
    if (!preg_match_all($pattern, (string) $text, $matches)) {
        return null;
    }
    foreach ($matches[1] as $match) {
        if ($exclude !== null && $match === $exclude) {
            continue;
        }
        return $match;
    }
    return null;
}

function dashticz_postnl_extract_code($location)
{
    if (!$location) {
        return null;
    }
    $query = (string) parse_url($location, PHP_URL_QUERY);
    if ($query === '') {
        return null;
    }
    parse_str($query, $params);
    return isset($params['code']) ? $params['code'] : null;
}

// Reads one cookie's value back out of the Netscape-format cookie jar curl
// just wrote (domain, flag, path, secure, expiry, name, value - tab
// separated) - needed for the hosted login page's _csrf_token, which the
// capture widget expects back as a plain form field, not just as a cookie.
function dashticz_postnl_cookie_value($cookieFile, $name)
{
    if (!is_file($cookieFile)) {
        return null;
    }
    $lines = @file($cookieFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!$lines) {
        return null;
    }
    foreach ($lines as $line) {
        if ($line === '' || $line[0] === '#') {
            continue;
        }
        $fields = explode("\t", $line);
        if (count($fields) >= 7 && $fields[5] === $name) {
            return $fields[6];
        }
    }
    return null;
}

// ------------------------------------------------------- PostNL login flow
// Fixed PostNL/Akamai(Janrain) identity constants - mirrors the account web
// app exactly (see the reference domoticz_postnl plugin's PostNLClient).


// Performs the full (unofficial, reverse-engineered) OIDC + Janrain capture
// widget login PostNL's own account app uses, returning a fresh access
// token (and, when PostNL issues one, a refresh token to avoid repeating
// this on the next poll). Throws RuntimeException with a fixed, generic
// message on any step that doesn't produce what the next step needs -
// never the raw response body, which could otherwise echo back capture
// widget internals.
function dashticz_postnl_full_login($username, $password, $cookieFile)
{
    $codeVerifier = bin2hex(random_bytes(32));
    $codeChallenge = rtrim(strtr(base64_encode(hash('sha256', $codeVerifier, true)), '+/', '-_'), '=');
    $state = bin2hex(random_bytes(16));

    $authParams = array(
        'client_id' => DASHTICZ_POSTNL_OIDC_CLIENT,
        'response_type' => 'code',
        'scope' => DASHTICZ_POSTNL_SCOPE,
        'redirect_uri' => DASHTICZ_POSTNL_REDIRECT_URI,
        'state' => $state,
        'code_challenge' => $codeChallenge,
        'code_challenge_method' => 'S256',
    );
    $authUrl = DASHTICZ_POSTNL_TENANT . '/login/authorize';

    // Step 1: authorize -> redirect to the hosted login page.
    $r1 = dashticz_postnl_http($authUrl . '?' . http_build_query($authParams), null, array(), $cookieFile);
    $authui = isset($r1['headers']['location']) ? $r1['headers']['location'] : '';
    if ($authui === '' || strpos($authui, 'auth-ui') === false) {
        throw new RuntimeException('PostNL login did not respond as expected.');
    }

    // Step 2: load the hosted login page (sets the _csrf_token cookie,
    // exposes the capture widget's own appId/clientId/flowName).
    $r2 = dashticz_postnl_http($authui, null, array(), $cookieFile);
    $appId = dashticz_postnl_first_match('/appId:\s*\'([^\']*)\'/', $r2['body'], 'None');
    $clientId = dashticz_postnl_first_match('/clientId:\s*\'([^\']*)\'/', $r2['body']);
    $flowName = dashticz_postnl_first_match('/flowName:\s*\'([^\']*)\'/', $r2['body']);
    if (!$flowName) {
        $flowName = 'standard';
    }
    if (!$appId || !$clientId) {
        throw new RuntimeException('Could not read the PostNL login page.');
    }
    $csrf = dashticz_postnl_cookie_value($cookieFile, '_csrf_token');

    // Step 2b: the capture widget's own flow file -> current flow version.
    $flowJsUrl = 'https://ssl-static.janraincapture.com/widget_data/flow.js:' . $appId . ':nl-NL:HEAD:' . $flowName;
    $rFlow = dashticz_postnl_http($flowJsUrl, null, array(), $cookieFile);
    $flowVersion = dashticz_postnl_first_match('/"version":\s*"([^"]*)"/', $rFlow['body']);
    if (!$flowVersion) {
        $flowVersion = 'HEAD';
    }

    // Step 3: submit credentials to the capture widget.
    $captureRedirect = $authui . '&socialRedirect=True';
    $transId = bin2hex(random_bytes(20));
    dashticz_postnl_http(
        DASHTICZ_POSTNL_CAPTURE_SERVER . '/widget/traditional_signin.jsonp',
        array(
            'utf8' => "\xE2\x9C\x93",
            'js_version' => 'd445bf4',
            'capture_screen' => 'signIn',
            'capture_transactionId' => $transId,
            'flow' => $flowName,
            'client_id' => $clientId,
            'redirect_uri' => $captureRedirect,
            'response_type' => 'token',
            'flow_version' => $flowVersion,
            'settings_version' => '',
            'locale' => 'nl-NL',
            'recaptcha_version' => '2',
            'form' => 'signInForm',
            'signInEmailAddress' => $username,
            'currentPassword' => $password,
        ),
        array('Referer: ' . $authui, 'Origin: https://login.postnl.nl'),
        $cookieFile
    );

    // Step 3b: fetch the sign-in result (holds the short-lived capture
    // access token, or an explicit invalid-credentials marker).
    $r3b = dashticz_postnl_http(
        DASHTICZ_POSTNL_CAPTURE_SERVER . '/widget/get_result.jsonp?' . http_build_query(array(
            'transactionId' => $transId,
            'cache' => (int) round(microtime(true) * 1000),
        )),
        null,
        array('Referer: ' . $authui),
        $cookieFile
    );
    if (strpos($r3b['body'], 'invalidCredentials') !== false || strpos($r3b['body'], 'invalidPassword') !== false) {
        throw new RuntimeException('PostNL rejected the e-mail address or password.');
    }
    $capToken = dashticz_postnl_first_match('/"accessToken":"([^"]*)"/', $r3b['body']);
    if (!$capToken) {
        throw new RuntimeException('PostNL login failed (no session token received).');
    }

    // Step 4: hand the capture token to auth-ui's token-url, establishing
    // the SSO session cookie.
    $authuiQuery = array();
    parse_str((string) parse_url($authui, PHP_URL_QUERY), $authuiQuery);
    dashticz_postnl_http(
        DASHTICZ_POSTNL_TENANT . '/auth-ui/token-url?' . http_build_query($authuiQuery),
        array(
            'authenticated' => 'True',
            'registering' => 'False',
            'accessToken' => $capToken,
            '_csrf_token' => $csrf ? $csrf : '',
        ),
        array('Referer: ' . $authui),
        $cookieFile
    );

    // Step 4b: re-request authorize; with the SSO cookie set it now
    // redirects with a ?code= somewhere along the chain.
    $r4b = dashticz_postnl_http($authUrl . '?' . http_build_query($authParams), null, array(), $cookieFile);
    $location = isset($r4b['headers']['location']) ? $r4b['headers']['location'] : '';
    $code = dashticz_postnl_extract_code($location);
    $hops = 0;
    while (!$code && $location && strpos($location, 'https://') === 0 && $hops < 6) {
        $hops++;
        $rn = dashticz_postnl_http($location, null, array(), $cookieFile);
        $location = isset($rn['headers']['location']) ? $rn['headers']['location'] : '';
        $code = dashticz_postnl_extract_code($location);
    }
    if (!$code) {
        throw new RuntimeException('PostNL login did not complete.');
    }

    // Step 5: exchange the authorization code for tokens.
    $r5 = dashticz_postnl_http(
        DASHTICZ_POSTNL_TENANT . '/login/token',
        array(
            'grant_type' => 'authorization_code',
            'client_id' => DASHTICZ_POSTNL_OIDC_CLIENT,
            'code' => $code,
            'redirect_uri' => DASHTICZ_POSTNL_REDIRECT_URI,
            'code_verifier' => $codeVerifier,
        ),
        array(),
        $cookieFile
    );
    if ($r5['status'] !== 200) {
        throw new RuntimeException('PostNL login failed.');
    }
    $tokens = json_decode($r5['body'], true);
    if (!is_array($tokens) || empty($tokens['access_token'])) {
        throw new RuntimeException('PostNL login failed.');
    }

    return array(
        'accessToken' => $tokens['access_token'],
        'refreshToken' => isset($tokens['refresh_token']) ? $tokens['refresh_token'] : null,
    );
}

// Lightweight re-login using a previously saved refresh token. Returns null
// (never throws) on any failure, so the caller can fall back to a full
// login exactly like the reference plugin's own get_access_token() does.
function dashticz_postnl_refresh_access_token($refreshToken, $cookieFile)
{
    if (!$refreshToken) {
        return null;
    }
    try {
        $r = dashticz_postnl_http(
            DASHTICZ_POSTNL_TENANT . '/login/token',
            array(
                'grant_type' => 'refresh_token',
                'client_id' => DASHTICZ_POSTNL_OIDC_CLIENT,
                'refresh_token' => $refreshToken,
            ),
            array(),
            $cookieFile
        );
    } catch (RuntimeException $error) {
        return null;
    }
    if ($r['status'] !== 200) {
        return null;
    }
    $tokens = json_decode($r['body'], true);
    if (!is_array($tokens) || empty($tokens['access_token'])) {
        return null;
    }
    return array(
        'accessToken' => $tokens['access_token'],
        'refreshToken' => isset($tokens['refresh_token']) ? $tokens['refresh_token'] : $refreshToken,
    );
}

// ------------------------------------------------------------------ data

function dashticz_postnl_fetch_shipments($accessToken, $cookieFile)
{
    $r = dashticz_postnl_http(
        DASHTICZ_POSTNL_GRAPHQL_URL,
        json_encode(array('query' => DASHTICZ_POSTNL_GRAPHQL_QUERY)),
        array('Authorization: Bearer ' . $accessToken, 'Content-Type: application/json'),
        $cookieFile
    );
    if ($r['status'] === 401) {
        throw new DashticzPostNLAuthError('Unauthorized');
    }
    if ($r['status'] !== 200) {
        throw new RuntimeException('Fetching PostNL shipments failed.');
    }
    $payload = json_decode($r['body'], true);
    $shipments = isset($payload['data']['trackedShipments']) && is_array($payload['data']['trackedShipments'])
        ? $payload['data']['trackedShipments']
        : array();
    return array(
        'receiver' => isset($shipments['receiverShipments']) && is_array($shipments['receiverShipments'])
            ? $shipments['receiverShipments']
            : array(),
        'sender' => isset($shipments['senderShipments']) && is_array($shipments['senderShipments'])
            ? $shipments['senderShipments']
            : array(),
    );
}

// Per-shipment Track & Trace lookup, for the sender/recipient/ETA detail the
// GraphQL shipment list itself doesn't carry. Non-critical: any failure
// (including a network error) falls back to null, same as the reference
// plugin's own track_and_trace(), so one bad lookup can't blank the whole
// tile.
function dashticz_postnl_track_and_trace($key, $barcode, $accessToken, $cookieFile)
{
    if (!$key || !$barcode) {
        return null;
    }
    try {
        $r = dashticz_postnl_http(
            DASHTICZ_POSTNL_TT_URL . '/' . rawurlencode($key) . '?' . http_build_query(array('language' => 'nl')),
            null,
            array('Authorization: Bearer ' . $accessToken),
            $cookieFile
        );
    } catch (RuntimeException $error) {
        return null;
    }
    if ($r['status'] !== 200) {
        return null;
    }
    $data = json_decode($r['body'], true);
    return (is_array($data) && isset($data[$barcode])) ? $data[$barcode] : null;
}

// Combines one GraphQL shipment item with its optional Track & Trace detail
// into {status, who, from, to, deliveryDate} - status text/date formatting
// itself is left to js/components/postnl.js (moment.js + the active
// Dashticz language file), so this only ever returns raw ISO timestamps and
// a fixed English status keyword.
function dashticz_postnl_build_entry($item, $role, $accessToken, $cookieFile)
{
    $barcode = isset($item['barcode']) ? $item['barcode'] : '';
    $key = isset($item['key']) ? $item['key'] : null;
    $title = isset($item['title']) ? $item['title'] : '';
    $delivered = isset($item['delivered']) ? $item['delivered'] : null;
    $dts = isset($item['deliveredTimeStamp']) ? $item['deliveredTimeStamp'] : '';
    $dwf = isset($item['deliveryWindowFrom']) ? $item['deliveryWindowFrom'] : '';
    $dwt = isset($item['deliveryWindowTo']) ? $item['deliveryWindowTo'] : '';

    $senderCompany = $title;
    $senderLast = '';
    $senderTown = '';
    $pickup = '';
    $tfFrom = '';
    $tfTo = '';
    $delDate = '';
    $rcptCompany = '';
    $rcptPerson = '';
    $rcptTown = '';
    $ttDelivered = null;
    $ttReturn = null;
    $ttAtRetail = null;
    $ttDelDate = '';

    $colli = ($key && $barcode) ? dashticz_postnl_track_and_trace($key, $barcode, $accessToken, $cookieFile) : null;
    if (is_array($colli)) {
        $ttDelivered = isset($colli['isDelivered']) ? $colli['isDelivered'] : null;
        $ttReturn = isset($colli['isReturnShipment']) ? $colli['isReturnShipment'] : null;
        $ttAtRetail = isset($colli['isAtRetailLocation']) ? $colli['isAtRetailLocation'] : null;
        $ttDelDate = isset($colli['deliveryDate']) ? $colli['deliveryDate'] : '';
        $eta = (isset($colli['eta']) && is_array($colli['eta'])) ? $colli['eta'] : array();
        $tfFrom = isset($eta['start']) ? $eta['start'] : '';
        $tfTo = isset($eta['end']) ? $eta['end'] : '';
        $senderBlock = (isset($colli['sender']) && is_array($colli['sender'])) ? $colli['sender'] : array();
        $sCompany = isset($senderBlock['companyName']) ? $senderBlock['companyName'] : '';
        $sPerson = isset($senderBlock['personName']) ? $senderBlock['personName'] : '';
        $senderAddr = (isset($senderBlock['address']) && is_array($senderBlock['address'])) ? $senderBlock['address'] : array();
        $senderTown = isset($senderAddr['town']) ? $senderAddr['town'] : '';
        $recipientBlock = (isset($colli['recipient']) && is_array($colli['recipient'])) ? $colli['recipient'] : array();
        $recipientAddr = (isset($recipientBlock['address']) && is_array($recipientBlock['address'])) ? $recipientBlock['address'] : array();
        $rcptCompany = isset($recipientBlock['companyName']) ? $recipientBlock['companyName'] : '';
        $rcptPerson = isset($recipientBlock['personName']) ? $recipientBlock['personName'] : '';
        $rcptTown = isset($recipientAddr['town']) ? $recipientAddr['town'] : '';
        $retailLocation = (isset($colli['retailDeliveryLocation']) && is_array($colli['retailDeliveryLocation']))
            ? $colli['retailDeliveryLocation']
            : array();
        $pickup = isset($retailLocation['name']) ? $retailLocation['name'] : '';
        if (!$senderCompany) {
            $senderCompany = $sCompany ? $sCompany : '';
            if (!$sCompany) {
                $senderLast = $sPerson;
            }
        }
    }

    if ($delivered === true || $ttDelivered === true) {
        $status = 'Delivered';
        $delDate = $dts ? $dts : $ttDelDate;
    } elseif ($ttReturn === true) {
        $status = 'ReturnToSender';
    } elseif ($pickup !== '' || $ttAtRetail === true) {
        $status = 'InTransit';
    } else {
        $f = $tfFrom ? $tfFrom : $dwf;
        $t = $tfTo ? $tfTo : $dwt;
        $status = $f ? 'Open' : 'InTransit';
        $tfFrom = $f;
        $tfTo = $t;
    }
    if (!$tfFrom) {
        $tfFrom = $dwf;
    }
    if (!$tfTo) {
        $tfTo = $dwt;
    }

    // Who to show depends on role: for something arriving TO you, that's
    // the sender; for something YOU are sending, restating your own
    // shipment title is not useful, so identify it by the recipient
    // instead - same reasoning as the reference plugin's build_entry().
    if ($role === 'receiver') {
        $who = $senderCompany ? $senderCompany : ($senderLast ? $senderLast : $senderTown);
    } else {
        $who = $rcptCompany ? $rcptCompany : ($rcptPerson ? $rcptPerson : ($rcptTown ? $rcptTown : $senderCompany));
    }

    return array(
        'status' => $status,
        'who' => (string) $who,
        'from' => $tfFrom,
        'to' => $tfTo,
        'deliveryDate' => $delDate,
    );
}

// Not yet delivered (and not returned), soonest expected first.
function dashticz_postnl_pending_entries($entries)
{
    $pending = array_values(array_filter($entries, function ($entry) {
        return $entry['status'] !== 'Delivered' && $entry['status'] !== 'ReturnToSender';
    }));
    usort($pending, function ($a, $b) {
        return strcmp($a['from'], $b['from']);
    });
    return array_slice($pending, 0, 10);
}

// Delivered within the last $days days, newest first.
function dashticz_postnl_recent_delivered($entries, $days)
{
    $cutoff = date('Y-m-d', time() - $days * 86400);
    $delivered = array_values(array_filter($entries, function ($entry) use ($cutoff) {
        return $entry['status'] === 'Delivered' && substr($entry['deliveryDate'], 0, 10) >= $cutoff;
    }));
    usort($delivered, function ($a, $b) {
        return strcmp($b['deliveryDate'], $a['deliveryDate']);
    });
    return array_slice($delivered, 0, 10);
}

// -------------------------------------------------------------- orchestration

function dashticz_postnl_get_shipments($username, $password, $days, $ttlSeconds)
{
    $cacheFile = dashticz_postnl_cache_file($username);
    $cache = dashticz_postnl_read_cache($cacheFile);

    // A changed "days shown" setting must not keep serving the old list until
    // the cache expires, so it is part of the cache's validity too.
    if ($cache && isset($cache['fetchedAt']) && isset($cache['days']) && (int) $cache['days'] === $days
        && (time() - (int) $cache['fetchedAt']) < $ttlSeconds) {
        return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
    }

    $cookieFile = tempnam(sys_get_temp_dir(), 'dtpostnlck_');
    try {
        $refreshToken = ($cache && !empty($cache['refreshToken'])) ? $cache['refreshToken'] : null;
        $tokens = $refreshToken ? dashticz_postnl_refresh_access_token($refreshToken, $cookieFile) : null;
        if (!$tokens) {
            $tokens = dashticz_postnl_full_login($username, $password, $cookieFile);
        }

        try {
            $shipments = dashticz_postnl_fetch_shipments($tokens['accessToken'], $cookieFile);
        } catch (DashticzPostNLAuthError $error) {
            // The (refreshed) access token was rejected - log in fresh once
            // and retry, exactly like the reference plugin's run_update().
            $tokens = dashticz_postnl_full_login($username, $password, $cookieFile);
            $shipments = dashticz_postnl_fetch_shipments($tokens['accessToken'], $cookieFile);
        }

        $receiverEntries = array();
        foreach ($shipments['receiver'] as $item) {
            $receiverEntries[] = dashticz_postnl_build_entry($item, 'receiver', $tokens['accessToken'], $cookieFile);
        }
        $senderEntries = array();
        foreach ($shipments['sender'] as $item) {
            $senderEntries[] = dashticz_postnl_build_entry($item, 'sender', $tokens['accessToken'], $cookieFile);
        }

        // Both lists: what's still pending plus what was delivered within the
        // last $days days, so a parcel stays visible for a while after it
        // arrived (the reference plugin keeps delivered incoming packages in
        // a separate device, which this single list replaces).
        $incoming = array_slice(
            array_merge(
                dashticz_postnl_pending_entries($receiverEntries),
                dashticz_postnl_recent_delivered($receiverEntries, $days)
            ),
            0,
            10
        );
        $sent = array_slice(
            array_merge(
                dashticz_postnl_pending_entries($senderEntries),
                dashticz_postnl_recent_delivered($senderEntries, $days)
            ),
            0,
            10
        );

        dashticz_postnl_write_cache($cacheFile, $tokens['refreshToken'], $days, $incoming, $sent);

        return array('incoming' => $incoming, 'sent' => $sent);
    } catch (RuntimeException $error) {
        // A transient PostNL/network hiccup falls back to the last known
        // good result rather than blanking the tile, same reasoning as
        // vendor/dashticz/xmltv.php's own stale-cache fallback.
        if ($cache) {
            return array('incoming' => $cache['incoming'], 'sent' => $cache['sent']);
        }
        throw $error;
    } finally {
        @unlink($cookieFile);
    }
}
