<?php
/* Helpers of the Weather Info bridge (index.php), kept apart so the tests can
 * load them without running a request. They follow the domoticz_weatherinfo
 * plugin (https://github.com/MadPatrick/domoticz_weatherinfo): the rain
 * forecast comes from the Buienradar raintext feed, the current weather from
 * the measurements of the nearest Buienradar weather station, so both come
 * from one source. */

define('DASHTICZ_WEATHERINFO_RAIN_URL', 'https://gpsgadget.buienradar.nl/data/raintext?lat=%s&lon=%s');
define('DASHTICZ_WEATHERINFO_FEED_URL', 'https://data.buienradar.nl/2.0/feed/json');
// The Buienradar weather stations report every 10 minutes; the feed is shared
// by all locations and widgets, so it is cached for that long.
define('DASHTICZ_WEATHERINFO_FEED_TTL', 600);
// A location further than this from every weather station gets no weather
// (the stations are in the Netherlands).
define('DASHTICZ_WEATHERINFO_MAX_KM', 75);

/* A latitude or longitude from the request -> "52.37" (two decimals, like the
 * plugin), or null when it is not a number within the range. */
function dashticz_weatherinfo_coordinate($value, $min, $max)
{
    $value = str_replace(',', '.', trim((string) $value));
    if ($value === '' || !is_numeric($value)) {
        return null;
    }
    $number = (float) $value;
    if ($number < $min || $number > $max) {
        return null;
    }
    return sprintf('%.2f', $number);
}

/* Buienradar raintext ("000|12:00" per line: a raw value 0-255 and the time)
 * -> list of [raw, "HH:MM"]. The conversion to mm/h happens in the widget. */
function dashticz_weatherinfo_parse_rain($text)
{
    $values = array();
    foreach (preg_split('/\r?\n/', (string) $text) as $line) {
        if (strpos($line, '|') === false) {
            continue;
        }
        $parts = explode('|', $line, 2);
        $raw = trim($parts[0]);
        if (!preg_match('/^\d{1,3}$/', $raw)) {
            continue;
        }
        $time = trim($parts[1]);
        $values[] = array((int) $raw, preg_match('/^\d{1,2}:\d{2}$/', $time) ? $time : '');
    }
    if (!$values) {
        throw new RuntimeException('Unexpected format in the Buienradar response.');
    }
    return $values;
}

/* Buienradar JSON feed -> the weather stations that have a position, each as
 * name, lat, lon, icon (the code in the icon file name: "c", or "cc" at
 * night), description (Dutch) and, when the station measures them,
 * temperature (degrees Celsius), windBft (Beaufort) and windDirection
 * (degrees). */
function dashticz_weatherinfo_parse_stations($json)
{
    $data = is_string($json) ? json_decode($json, true) : $json;
    $measurements = is_array($data) && isset($data['actual']['stationmeasurements'])
        ? $data['actual']['stationmeasurements']
        : null;
    if (!is_array($measurements)) {
        throw new RuntimeException('Unexpected format in the Buienradar weather feed.');
    }
    $stations = array();
    foreach ($measurements as $item) {
        if (!is_array($item) || !isset($item['lat'], $item['lon']) || !is_numeric($item['lat']) || !is_numeric($item['lon'])) {
            continue;
        }
        $icon = '';
        if (isset($item['iconurl']) && is_string($item['iconurl'])) {
            $icon = strtolower(pathinfo(parse_url($item['iconurl'], PHP_URL_PATH) ?: '', PATHINFO_FILENAME));
        }
        $station = array(
            'name' => isset($item['stationname']) ? preg_replace('/^Meetstation\s+/', '', (string) $item['stationname']) : '',
            'lat' => (float) $item['lat'],
            'lon' => (float) $item['lon'],
            'icon' => preg_match('/^[a-z]{1,2}$/', $icon) ? $icon : '',
            'description' => isset($item['weatherdescription']) ? trim((string) $item['weatherdescription']) : '',
        );
        if (isset($item['temperature']) && is_numeric($item['temperature'])) {
            $station['temperature'] = (float) $item['temperature'];
        }
        if (isset($item['windspeedBft']) && is_numeric($item['windspeedBft'])
            && isset($item['winddirectiondegrees']) && is_numeric($item['winddirectiondegrees'])) {
            $station['windBft'] = max(0, min(12, (int) $item['windspeedBft']));
            $station['windDirection'] = (int) $item['winddirectiondegrees'];
        }
        $stations[] = $station;
    }
    if (!$stations) {
        throw new RuntimeException('The Buienradar weather feed has no weather stations.');
    }
    return $stations;
}

// Distance in km between two positions (haversine).
function dashticz_weatherinfo_distance($lat1, $lon1, $lat2, $lon2)
{
    $rad = M_PI / 180;
    $a = pow(sin(($lat2 - $lat1) * $rad / 2), 2)
        + cos($lat1 * $rad) * cos($lat2 * $rad) * pow(sin(($lon2 - $lon1) * $rad / 2), 2);
    return 6371 * 2 * atan2(sqrt($a), sqrt(1 - $a));
}

/* The current weather at a position from the nearest stations: the nearest
 * station gives the description and icon, a value that station does not
 * measure (temperature, wind) comes from the nearest station that does,
 * within the maximum distance. isDay follows the icon code (a doubled letter
 * is the night icon, like the plugin reads it). */
function dashticz_weatherinfo_pick($stations, $lat, $lon, $maxKm = DASHTICZ_WEATHERINFO_MAX_KM)
{
    $ranked = array();
    foreach ($stations as $station) {
        $km = dashticz_weatherinfo_distance((float) $lat, (float) $lon, $station['lat'], $station['lon']);
        if ($km <= $maxKm) {
            $ranked[] = array($km, $station);
        }
    }
    if (!$ranked) {
        throw new RuntimeException('No Buienradar weather station within ' . $maxKm . ' km of this location.');
    }
    usort($ranked, function ($a, $b) {
        return $a[0] <=> $b[0];
    });
    $nearest = $ranked[0][1];
    $weather = array(
        'station' => $nearest['name'],
        'distance' => (int) round($ranked[0][0]),
        'icon' => $nearest['icon'],
        'description' => $nearest['description'],
    );
    if (strlen($nearest['icon']) === 2 && $nearest['icon'][0] === $nearest['icon'][1]) {
        $weather['isDay'] = false;
    } elseif ($nearest['icon'] !== '') {
        $weather['isDay'] = true;
    }
    foreach ($ranked as $item) {
        if (!isset($weather['temperature']) && isset($item[1]['temperature'])) {
            $weather['temperature'] = $item[1]['temperature'];
        }
        if (!isset($weather['windBft']) && isset($item[1]['windBft'])) {
            $weather['windBft'] = $item[1]['windBft'];
            $weather['windDirection'] = $item[1]['windDirection'];
        }
    }
    return $weather;
}

function dashticz_weatherinfo_cache_file($kind, $lat, $lon)
{
    $baseDir = dashticz_cache_dir('weatherinfo');
    return $baseDir === null ? null : $baseDir . '/' . $kind . '-' . sha1($lat . ',' . $lon) . '.json';
}

function dashticz_weatherinfo_download($url, $what)
{
    // A failing download is answered with the stale cache, when there is one.
    try {
        $response = dashticz_fetch_remote($url, 1048576);
    } catch (RuntimeException $error) {
        throw new RuntimeException('Unable to fetch ' . $what . '.');
    }
    return $response['body'];
}

function dashticz_weatherinfo_rain($lat, $lon, $ttl)
{
    return dashticz_cached_json(dashticz_weatherinfo_cache_file('rain', $lat, $lon), $ttl, function () use ($lat, $lon) {
        $url = sprintf(DASHTICZ_WEATHERINFO_RAIN_URL, rawurlencode($lat), rawurlencode($lon));
        return dashticz_weatherinfo_parse_rain(dashticz_weatherinfo_download($url, 'the Buienradar rain forecast'));
    });
}

// The parsed stations of the Buienradar feed, cached for 10 minutes.
function dashticz_weatherinfo_stations()
{
    $baseDir = dashticz_cache_dir('weatherinfo');
    $file = $baseDir === null ? null : $baseDir . '/stations.json';
    return dashticz_cached_json($file, DASHTICZ_WEATHERINFO_FEED_TTL, function () {
        return dashticz_weatherinfo_parse_stations(
            dashticz_weatherinfo_download(DASHTICZ_WEATHERINFO_FEED_URL, 'the Buienradar weather feed')
        );
    });
}

function dashticz_weatherinfo_current($lat, $lon)
{
    return dashticz_weatherinfo_pick(dashticz_weatherinfo_stations(), $lat, $lon);
}
