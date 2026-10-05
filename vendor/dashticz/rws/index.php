<?php
require_once(__DIR__ . '/../security.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Traffic and Traffic info widgets
 * (js/components/traffic.js, trafficinfo.js). Downloads Rijkswaterstaat's
 * public traffic data (no API key) and caches it for two minutes
 * (custom/cache/rws/traffic.json), so every dashboard and every widget
 * shares one download of the national list. Stale data is used when RWS
 * can't be reached; filtering happens in the browser.
 *
 * Request: GET. Response: the JSON of the RWS API, unchanged.
 */
try {
    $dir = dashticz_cache_dir('rws');
    $file = $dir === null ? null : $dir . '/traffic.json';
    $data = dashticz_cached_json($file, 120, function () {
        try {
            $response = dashticz_fetch_remote('https://api.rwsverkeersinfo.nl/api/traffic/', 5242880);
        } catch (RuntimeException $error) {
            throw new RuntimeException('Unable to fetch the traffic information.');
        }
        $data = json_decode($response['body'], true);
        if (!is_array($data)) {
            throw new RuntimeException('Unable to fetch the traffic information.');
        }
        return $data;
    }, '', 60);
    echo json_encode($data);
} catch (RuntimeException $error) {
    dashticz_json_error(502, $error->getMessage());
}
