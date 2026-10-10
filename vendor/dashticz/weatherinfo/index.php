<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/weatherinfo.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Weather Info widget (js/components/weatherinfo.js),
 * based on the domoticz_weatherinfo plugin. Both parts come from Buienradar:
 * the rain forecast (raintext feed, cached for the poll interval per
 * location) and the current weather, the measurements of the nearest weather
 * station of the Buienradar JSON feed (cached for 10 minutes, one file for
 * all locations), in custom/cache/weatherinfo/. Several connected dashboards
 * share one download. The texts, icons and units are made in the browser.
 *
 * Request (JSON): {"lat": 52.37, "lon": 4.9, "pollMinutes": 5}
 * Response: {"rain": [[raw, "HH:MM"], ...] | null,
 *            "weather": {"station": "Schiphol", "distance": 12 (km),
 *                        "icon": "c" ("cc" at night), "description":
 *                        "Zwaar bewolkt", "isDay": true,
 *                        "temperature": 17.2, "windBft": 3,
 *                        "windDirection": 69 (degrees)} | null,
 *            "errors": ["..."]}
 *            temperature and wind are left out when no station within range
 *            measures them. Either part is null (with a message in errors)
 *            when only that source failed; when both fail the response is an
 *            error.
 */
try {
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid Weather Info request.');
    }
    $lat = dashticz_weatherinfo_coordinate(isset($input['lat']) ? $input['lat'] : '', -90, 90);
    $lon = dashticz_weatherinfo_coordinate(isset($input['lon']) ? $input['lon'] : '', -180, 180);
    if ($lat === null || $lon === null) {
        throw new RuntimeException('No valid location found. Check lat/lon in Domoticz or in the widget settings.');
    }
    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 5;
    $pollMinutes = max(1, min(60, $pollMinutes));

    $result = array('rain' => null, 'weather' => null, 'errors' => array());
    try {
        $result['rain'] = dashticz_weatherinfo_rain($lat, $lon, $pollMinutes * 60);
    } catch (RuntimeException $error) {
        $result['errors'][] = $error->getMessage();
    }
    try {
        $result['weather'] = dashticz_weatherinfo_current($lat, $lon);
    } catch (RuntimeException $error) {
        $result['errors'][] = $error->getMessage();
    }
    if ($result['rain'] === null && $result['weather'] === null) {
        throw new RuntimeException($result['errors'][0]);
    }
    echo json_encode($result);
} catch (RuntimeException $error) {
    dashticz_json_error(502, $error->getMessage());
}
