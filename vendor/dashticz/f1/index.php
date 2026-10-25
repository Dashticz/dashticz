<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/f1.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the F1 widget (js/components/f1.js). Downloads the F1
 * calendar ICS feed that the domoticz_F1 plugin
 * (https://github.com/MadPatrick/domoticz_F1) uses, parses it into a list of
 * sessions and caches that list for the poll interval
 * (custom/cache/f1/<sha1 of url>.json), so several connected dashboards
 * share one download. Filtering and time formatting happen in the browser.
 *
 * Request (JSON): {"url": "https://...ics", "pollMinutes": 60,
 *           "lat": 52.37, "lon": 4.9}  (lat/lon optional)
 * Response: {"events": [{"start": ts, "end": ts, "session": "...",
 *            "gp": "...", "location": "..."}] (unix timestamps, UTC),
 *            "timezone": "Europe/Amsterdam"}
 *            timezone is only present when lat/lon were sent and the time
 *            zone of that location could be looked up.
 */
try {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid F1 request.');
    }
    $url = dashticz_f1_check_url(isset($input['url']) ? $input['url'] : '');
    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 60;
    $pollMinutes = max(5, min(1440, $pollMinutes));
    $response = array('events' => dashticz_f1_events($url, $pollMinutes * 60));
    $lat = dashticz_f1_coordinate(isset($input['lat']) ? $input['lat'] : null, -90, 90);
    $lon = dashticz_f1_coordinate(isset($input['lon']) ? $input['lon'] : null, -180, 180);
    if ($lat !== null && $lon !== null) {
        $timezone = dashticz_f1_timezone($lat, $lon);
        if ($timezone !== '') {
            $response['timezone'] = $timezone;
        }
    }
    echo json_encode($response);
} catch (RuntimeException $error) {
    dashticz_json_error(502, $error->getMessage());
}
