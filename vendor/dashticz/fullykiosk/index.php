<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/fullykiosk.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Fully Kiosk widget (js/components/fullykiosk.js).
 * It talks to the Fully Kiosk Remote Admin REST API of a tablet, the same
 * calls the domoticz_fullykiosk plugin makes. The tablet is only reachable
 * from the LAN, so the browser never talks to it directly and the Remote
 * Admin password never ends up in a URL of the page.
 *
 * Request (JSON): {"host": "192.168.1.50", "port": 2323, "password": "...",
 *                  "https": false, "action": "status"}
 *   action 'status' (default): ?cmd=getDeviceInfo, the response is
 *     {"battery": 0-100|null, "plugged": bool, "screenOn": bool,
 *      "screensaver": bool, "motion": bool, "brightness": 0-100}
 *   action 'command': "command" is screen, screensaver, motion (value
 *     'on'/'off'), brightness (value 0-100) or loadurl (loads the start URL
 *     of the tablet again); the response is {"ok": true}
 *
 * Nothing is cached: the widget uses the values to decide whether the charger
 * has to be switched. A tablet with HTTPS enabled uses a self-signed
 * certificate, so, like the plugin, certificate verification is skipped for
 * that (user configured, LAN) connection.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the Fully Kiosk widget.');
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid Fully Kiosk request.');
    }
    $host = dashticz_normalize_host_input(isset($input['host']) ? $input['host'] : '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.\-_:\[\]]+$/', $host)) {
        throw new RuntimeException('Enter the host of the tablet in the widget settings.');
    }
    $port = isset($input['port']) ? (int) $input['port'] : 2323;
    if ($port < 1 || $port > 65535) {
        $port = 2323;
    }
    $tablet = array(
        'base' => (!empty($input['https']) ? 'https' : 'http') . '://' . $host . ':' . $port . '/',
        'password' => isset($input['password']) ? (string) $input['password'] : '',
    );

    $action = isset($input['action']) ? (string) $input['action'] : 'status';
    if ($action === 'command') {
        $command = isset($input['command']) ? (string) $input['command'] : '';
        if ($command === 'loadurl') {
            $info = json_decode(dashticz_fullykiosk_get($tablet, array('cmd' => 'getDeviceInfo', 'type' => 'json')), true);
            if (is_array($info) && !empty($info['startUrl']) && is_string($info['startUrl'])) {
                dashticz_fullykiosk_get($tablet, array('cmd' => 'loadUrl', 'url' => $info['startUrl']));
            }
        } else {
            dashticz_fullykiosk_get(
                $tablet,
                dashticz_fullykiosk_command_params($command, isset($input['value']) ? $input['value'] : '')
            );
        }
        echo json_encode(array('ok' => true));
    } else {
        $body = dashticz_fullykiosk_get($tablet, array('cmd' => 'getDeviceInfo', 'type' => 'json'));
        echo json_encode(dashticz_fullykiosk_summary(json_decode($body, true)));
    }
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}

// One Remote Admin request; returns the response body.
function dashticz_fullykiosk_get($tablet, $params)
{
    $params['password'] = $tablet['password'];
    $ch = curl_init($tablet['base'] . '?' . http_build_query($params));
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 5,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ));
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failed = ($body === false);
    curl_close($ch);

    if ($failed) {
        throw new RuntimeException('Unable to reach the tablet.');
    }
    if ($status === 401 || $status === 403) {
        throw new RuntimeException('Fully Kiosk rejected the password.');
    }
    if ($status !== 200) {
        throw new RuntimeException('Fully Kiosk returned HTTP ' . $status . '.');
    }
    return (string) $body;
}
