<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/husqvarna.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Mower widget (js/components/mower.js) when its data
 * source is Dashticz. It talks to the Husqvarna Automower Connect API, the
 * same calls the Domoticz Husqvarna plugin makes. The client secret stays on
 * the server: the browser only talks to this file.
 *
 * Request (JSON): {"clientId": "...", "clientSecret": "...", "mower": "",
 *                  "pollMinutes": 5, "action": "status"}
 *   action 'status' (default): the response is {"name": "...", "status":
 *     "Mowing", "activity": "MOWING", "state": "IN_OPERATION", "parked": bool,
 *     "running": bool, "nextStart": ms|null, "reason": "...",
 *     "battery": 0-100|null}. The answer is cached for pollMinutes (1-60), so
 *     several dashboards share the API quota of the application (the quota
 *     is shared with the Domoticz plugin).
 *   action 'command': "command" is Start (with "minutes", default 120),
 *     ResumeSchedule, Pause, ParkUntilNextSchedule or ParkUntilFurtherNotice;
 *     the response is {"ok": true}
 * "mower" is the name of the mower; empty = the first mower.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the Mower widget.');
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid Mower request.');
    }
    $clientId = isset($input['clientId']) ? trim((string) $input['clientId']) : '';
    $clientSecret = isset($input['clientSecret']) ? trim((string) $input['clientSecret']) : '';
    if (!preg_match('/^[A-Za-z0-9._-]{1,100}$/', $clientId) || $clientSecret === '' || strlen($clientSecret) > 200) {
        throw new RuntimeException('Enter the client ID and client secret of your Husqvarna application in the widget settings.');
    }
    $name = isset($input['mower']) ? trim((string) $input['mower']) : '';
    if (strlen($name) > 100) {
        $name = '';
    }
    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 5;
    $pollMinutes = max(1, min(60, $pollMinutes));

    $cacheDir = dashticz_cache_dir('husqvarna');
    $key = sha1($clientId . "\n" . $name);
    $statusFile = $cacheDir === null ? null : $cacheDir . '/status-' . $key . '.json';
    $action = isset($input['action']) ? (string) $input['action'] : 'status';

    if ($action === 'command') {
        $body = dashticz_husqvarna_action_body(
            isset($input['command']) ? (string) $input['command'] : '',
            isset($input['minutes']) ? $input['minutes'] : 120
        );
        $token = dashticz_husqvarna_token($clientId, $clientSecret, $cacheDir);
        $list = dashticz_husqvarna_request('GET', dashticz_husqvarna_api_url() . 'mowers', dashticz_husqvarna_headers($clientId, $token));
        $mower = dashticz_husqvarna_pick($list, $name);
        if (empty($mower['id']) || !preg_match('/^[A-Za-z0-9-]{1,100}$/', (string) $mower['id'])) {
            throw new RuntimeException('Unable to find the mower.');
        }
        dashticz_husqvarna_request(
            'POST',
            dashticz_husqvarna_api_url() . 'mowers/' . $mower['id'] . '/actions',
            dashticz_husqvarna_headers($clientId, $token, true),
            $body
        );
        // The next status request asks Husqvarna again.
        if ($statusFile !== null && is_file($statusFile)) {
            @unlink($statusFile);
        }
        echo json_encode(array('ok' => true));
    } else {
        echo json_encode(dashticz_cached_json($statusFile, $pollMinutes * 60, function () use ($clientId, $clientSecret, $name, $cacheDir) {
            $token = dashticz_husqvarna_token($clientId, $clientSecret, $cacheDir);
            $list = dashticz_husqvarna_request('GET', dashticz_husqvarna_api_url() . 'mowers', dashticz_husqvarna_headers($clientId, $token));
            return dashticz_husqvarna_summary(dashticz_husqvarna_pick($list, $name));
        }, '', 60));
    }
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}
