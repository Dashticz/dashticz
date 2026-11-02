<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/toon.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Toon widget (js/components/toon.js) when its data
 * source is Dashticz. It talks to the local API of a rooted Toon, the same
 * calls the domoticz_toon plugin makes. The Toon is only reachable from the
 * LAN, so the browser never talks to it directly.
 *
 * Request (JSON): {"host": "192.168.1.200", "port": 80, "action": "status"}
 *   action 'status' (default): the response is {"room": 19.7, "setpoint": 20,
 *     "scene": 10|20|30|40|50, "boiler": "off"|"heating"|"hotwater"|null,
 *     "program": "...", "pressure": 1.5|null, "modulation": 0-100|null}
 *   action 'command': "command" is setpoint (value 5-30) or scene (value
 *     10 Weg, 20 Slapen, 30 Thuis, 40 Comfort); the response is {"ok": true}
 * Nothing is cached: the Toon is a local device.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the Toon widget.');
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid Toon request.');
    }
    $host = dashticz_normalize_host_input(isset($input['host']) ? $input['host'] : '');
    if ($host === '' || !preg_match('/^[A-Za-z0-9.\-_:\[\]]+$/', $host)) {
        throw new RuntimeException('Enter the address of the Toon in the widget settings.');
    }
    $port = isset($input['port']) ? (int) $input['port'] : 80;
    if ($port < 1 || $port > 65535) {
        $port = 80;
    }
    $toon = array('base' => 'http://' . $host . ':' . $port . '/');

    $action = isset($input['action']) ? (string) $input['action'] : 'status';
    if ($action === 'command') {
        $path = dashticz_toon_command_path(
            isset($input['command']) ? (string) $input['command'] : '',
            isset($input['value']) ? $input['value'] : null
        );
        dashticz_toon_get($toon, $path);
        echo json_encode(array('ok' => true));
    } else {
        echo json_encode(dashticz_toon_status($toon));
    }
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}
