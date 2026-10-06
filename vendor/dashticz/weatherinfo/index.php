<?php
require_once(__DIR__ . '/../security.php');
require_once(__DIR__ . '/weatherinfo.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the Weather Info widget (js/components/weatherinfo.js),
 * based on the domoticz_weatherinfo plugin. It downloads the Buienradar rain
 * forecast and the current weather of Open-Meteo for a location and caches
 * them (custom/cache/weatherinfo/): the rain forecast for the poll interval,
 * the weather for 15 minutes like the plugin, so several connected dashboards
 * share one download. The texts, icons and units are made in the browser.
 *
 * Request (JSON): {"lat": 52.37, "lon": 4.9, "pollMinutes": 5}
 * Response: {"rain": [[raw, "HH:MM"], ...] | null,
 *            "weather": {"temperature": 19.7, "windSpeed": 12.0 (km/h),
 *                        "windDirection": 310 (degrees), "weatherCode": 3,
 *                        "isDay": true} | null,
 *            "errors": ["..."]}
 *            Either part is null (with a message in errors) when only that
 *            source failed; when both fail the response is an error.
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
