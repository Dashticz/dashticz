<?php
require_once(__DIR__ . '/../security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* A genuinely unreachable LMS server can leave curl blocking for several
   seconds (up to dashticz_lms_curl()'s own CONNECTTIMEOUT+TIMEOUT budget -
   worst case 4+20=24s, for the image-proxy cover fetch below) before its
   own try/catch below gets a chance to turn that into a clean JSON error.
   On a host with a shorter max_execution_time than that budget, PHP kills
   the script first - with the Content-Type header already queued but
   nothing echoed yet, the client sees an empty HTTP 500 that its JSON
   parser can't read, which surfaces as a generic client-side fallback
   message instead of any real explanation. Give this endpoint a time budget
   comfortably above curl's own worst case so that timeout is handled here,
   not by the host cutting the script off first; the shutdown handler right
   below is the last-resort net for every other kind of fatal error. */
if (function_exists('set_time_limit')) {
    @set_time_limit(30);
}

/* Guarantees the client always gets parseable JSON - even for a fatal error
   this file's own try/catch can't see (an out-of-memory kill, a disabled
   function, anything unforeseen) - instead of an empty response the AJAX
   call's dataType: 'json' silently fails to parse. The user-facing 'error'
   is always the same fixed string, matching every other failure path here.
   The 'debug' block is safe to include unconditionally: unlike a curl
   transport error (which can embed the request URL/host), a PHP engine
   fatal here (undefined function/class/constant, memory exhaustion, an
   uncaught Error) only ever describes this file's own code, never LMS
   response data or request credentials - and only the basename of the file
   is included, not its full server path. */
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
        'error' => 'Lyrion Music Server request failed unexpectedly.',
        'debug' => array(
            'message' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
        ),
    ));
});

/* Single backend bridge for the Lyrion Music Server block (js/components/lms.js)
   and its Wizard popup (DashticzDeviceEditor's Lyrion Music Server quick-add/edit
   popup in js/deviceeditor.js). Every LMS server address, port and credential is
   posted here from the browser rather than being used directly, so:
   - LMS's own HTTP interface (usually LAN-only, like Domoticz's) never needs to
     be reachable/CORS-enabled from the dashboard's own origin - only this
     same-origin PHP endpoint needs LAN access to it, mirroring how the
     dashboard already talks to Domoticz itself.
   - an HTTPS dashboard talking to a plain-HTTP LMS server never hits a
     mixed-content block, because the browser only ever talks to this
     same-origin endpoint.
   - a username/password never has to travel inside a URL (query string,
     <img src>, browser history) - both the JSON-RPC calls and the cover
     artwork fetch below go through this same POST body, exactly like the
     LMS "status" poll's own credentials do. */
try {
    $input = dashticz_lms_read_input();
    // Checked here, before any CURLOPT_*/CURLE_* constant is referenced
    // anywhere below - dashticz_lms_curl()'s own function_exists('curl_init')
    // guard runs too late to help: dashticz_lms_request() builds a
    // CURLOPT_POST/CURLOPT_POSTFIELDS/CURLOPT_HTTPHEADER array as part of
    // *calling* dashticz_lms_curl(), and PHP evaluates that array (so
    // resolves those constants) before the call - and thus that guard -
    // is ever reached. Without ext-curl those constants are undefined, and
    // on PHP 8+ that is a fatal Error, not a warning: this was silently
    // producing an empty HTTP 500 (a live report's "Content-Length: 0")
    // that the Wizard popup's JSON parser couldn't read at all.
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the Lyrion Music Server block.');
    }
    if ($input['action'] === 'cover') {
        $cover = dashticz_lms_fetch_cover($input);
        echo json_encode(array('dataUrl' => $cover === null ? null : $cover));
    } else {
        echo json_encode(array('result' => dashticz_lms_request($input)));
    }
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}

function dashticz_lms_read_input()
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid Lyrion Music Server request.');
    }

    $server = isset($input['server']) ? dashticz_normalize_host_input($input['server']) : '';
    if ($server === '') {
        throw new RuntimeException('Enter the Lyrion Music Server address.');
    }

    $port = isset($input['port']) ? (int) $input['port'] : 9000;
    if ($port < 1 || $port > 65535) {
        throw new RuntimeException('Enter a valid Lyrion Music Server port.');
    }

    $action = isset($input['action']) && $input['action'] === 'cover' ? 'cover' : 'rpc';

    $result = array(
        'action' => $action,
        'server' => $server,
        'port' => $port,
        'username' => isset($input['username']) ? (string) $input['username'] : '',
        'password' => isset($input['password']) ? (string) $input['password'] : '',
    );

    if ($action === 'cover') {
        $result['coverid'] = isset($input['coverid']) ? trim((string) $input['coverid']) : '';
        $result['artworkUrl'] = isset($input['artworkUrl']) ? trim((string) $input['artworkUrl']) : '';
        if ($result['coverid'] === '' && $result['artworkUrl'] === '') {
            throw new RuntimeException('Nothing to fetch: no coverid or artwork URL given.');
        }
    } else {
        // Player id is "" for a server-wide query (serverstatus) and the
        // player's MAC-style id for a per-player query (status) - both are
        // valid, LMS itself distinguishes them positionally, see slim.request.
        $result['player'] = isset($input['player']) ? (string) $input['player'] : '';
        $params = isset($input['params']) ? $input['params'] : null;
        if (!is_array($params) || !count($params)) {
            throw new RuntimeException('Invalid Lyrion Music Server request.');
        }
        $result['params'] = array_values($params);
    }

    return $result;
}

/* Forwards one slim.request call to LMS's own JSON-RPC endpoint and returns
   its "result" object. LMS is virtually always reached over the LAN (like
   Domoticz itself), so the private/reserved-IP block dashticz_fetch_remote()
   applies by default is explicitly lifted here via allowPrivate=true -
   mirroring vendor/dashticz/xmltv.php's own dashticz_validate_remote_url()
   call for the same reason. */
function dashticz_lms_request($request)
{
    $url = dashticz_validate_remote_url(
        'http://' . $request['server'] . ':' . $request['port'] . '/jsonrpc.js',
        true
    );

    $body = json_encode(array(
        'id' => 1,
        'method' => 'slim.request',
        'params' => array($request['player'], $request['params']),
    ));

    $response = dashticz_lms_curl($url, $request, array(
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $body,
        CURLOPT_HTTPHEADER => array('Content-Type: application/json'),
    ));

    $decoded = json_decode((string) $response['body'], true);
    if (!is_array($decoded) || !array_key_exists('result', $decoded) || !is_array($decoded['result'])) {
        throw new RuntimeException('Unexpected response from Lyrion Music Server.');
    }

    return $decoded['result'];
}

/* Resolves the currently playing item's artwork and returns it as a data:
   URI, so the browser never needs a direct (and possibly LAN-only/mixed-
   content-blocked) URL to either LMS or wherever an internet radio station's
   own artwork happens to be hosted.
   artwork_url (the 'K' status tag) is preferred whenever LMS provides one:
   for an internet radio track, LMS assigns a synthetic negative coverid
   with no real library artwork (its own /music/<id>/cover_*.jpg lookup
   just returns a generic placeholder), while artwork_url is the actual
   artwork LMS resolved for the currently playing item - confirmed live via
   a real radio station: e.g. "/imageproxy/https%3A%2F%2Flastfm.freetls...
   /image.jpg". That value is LMS-server-relative (LMS's own proxy/cache
   for externally-hosted art, not a bare external URL as originally assumed)
   whenever it starts with "/", so it gets the same trust level as coverid
   below (LMS's own endpoint: allowPrivate, LMS credentials); only a
   genuinely absolute http(s) artwork_url is fetched as a true external
   host, like any other externally-hosted image Dashticz embeds (see
   js/components/garbage.js, js/sonarr.js), without private-IP access or
   LMS credentials. coverid is the fallback only when LMS gave no
   artwork_url at all - the normal case for local library tracks. */
function dashticz_lms_fetch_cover($request)
{
    $artworkUrl = $request['artworkUrl'];
    if ($artworkUrl !== '') {
        if ($artworkUrl[0] === '/') {
            $url = dashticz_validate_remote_url(
                'http://' . $request['server'] . ':' . $request['port'] . $artworkUrl,
                true
            );
            // LMS's own image proxy/cache still has to fetch the externally-
            // hosted artwork itself (over the internet, from LMS's side)
            // before it can respond, which can comfortably exceed every
            // other request here's normal LAN-only timeout budget - give it
            // more room rather than surfacing a spurious timeout error for
            // what is otherwise a perfectly reachable LMS server.
            $response = dashticz_lms_curl($url, $request, array(CURLOPT_TIMEOUT => 20));
        } else {
            $url = dashticz_validate_remote_url($artworkUrl, false);
            $response = dashticz_lms_curl($url, array('username' => '', 'password' => ''), array());
        }
    } else {
        $url = dashticz_validate_remote_url(
            'http://' . $request['server'] . ':' . $request['port'] .
                '/music/' . rawurlencode($request['coverid']) . '/cover_200x200_o.jpg',
            true
        );
        $response = dashticz_lms_curl($url, $request, array());
    }

    if ($response['body'] === '') {
        return null;
    }

    $contentType = $response['contentType'] ? $response['contentType'] : 'image/jpeg';
    if (strpos($contentType, 'image/') !== 0) {
        return null;
    }

    return 'data:' . $contentType . ';base64,' . base64_encode($response['body']);
}

/* Shared curl GET/POST helper. Every failure path throws a fixed, generic
   RuntimeException - never the raw curl error or response body - so a
   misconfigured server/port/username can't leak into a message that might
   echo the password back alongside it. SSL verification is always left at
   curl's secure default (unlike vendor/dashticz/garbage/index.php's
   ignoressl option - LMS has no equivalent legacy need for it). */
function dashticz_lms_curl($url, $request, $extraOptions)
{
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the Lyrion Music Server block.');
    }

    $ch = curl_init($url);
    curl_setopt_array($ch, $extraOptions + array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 4,
        CURLOPT_TIMEOUT => 8,
    ));
    // Basic auth only when a username is actually configured - matches the
    // reference domoticz_lyrion plugin (auth = (user, pwd) if user else None):
    // LMS authentication is optional and off by default.
    if (!empty($request['username'])) {
        curl_setopt($ch, CURLOPT_USERPWD, $request['username'] . ':' . $request['password']);
        curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
    }

    $body = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $contentType = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $failed = ($body === false);
    $errno = $failed ? curl_errno($ch) : 0;
    curl_close($ch);

    if ($failed || $httpCode === 0) {
        // A fixed, curl-errno-based reason - never curl's own free-text error
        // message, which can otherwise echo the target host/path back in the
        // response. This still narrows down the three most common causes
        // without leaking anything request-specific.
        $reason = dashticz_lms_connect_error_reason($errno);
        throw new RuntimeException('Unable to connect to Lyrion Music Server' . $reason . '.');
    }
    if ($httpCode === 401 || $httpCode === 403) {
        throw new RuntimeException('Authentication failed.');
    }
    if ($httpCode === 404) {
        return array('body' => '', 'contentType' => $contentType);
    }
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException('Lyrion Music Server returned an error.');
    }

    return array('body' => (string) $body, 'contentType' => $contentType);
}

/* Narrows a curl connect-level failure down to one of the three causes users
   most often hit (unreachable host/port, DNS, or a slow/unresponsive
   server) using only curl's numeric error code - never curl's own free-text
   error message, which can include the request path (and, for a proxied/
   misconfigured setup, other request details). Only the fixed, enumerated
   reason below is ever used.
   The keys are curl's own CURLE_* error codes, written as their raw,
   ABI-stable integers (6/7/28) rather than the symbolic PHP constants: on
   PHP 8+, referencing an undefined constant is a fatal Error (not a
   warning), so if some exotic curl build ever left one of those undefined,
   using the symbolic form here would turn this diagnostic-only helper into
   an uncaught 500 - silently replacing even the plain, pre-existing
   "Unable to connect to Lyrion Music Server." message with a broken,
   non-JSON response the Wizard popup can't parse at all. */
function dashticz_lms_connect_error_reason($errno)
{
    $reasons = array(
        6 => ': the server address could not be resolved', // CURLE_COULDNT_RESOLVE_HOST
        7 => ': check the address/port and that the server is reachable on your network', // CURLE_COULDNT_CONNECT
        28 => ': the connection timed out', // CURLE_OPERATION_TIMEDOUT
    );
    return isset($reasons[$errno]) ? $reasons[$errno] : '';
}
