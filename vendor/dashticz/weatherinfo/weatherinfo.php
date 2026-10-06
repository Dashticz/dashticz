<?php
/* Helpers of the Weather Info bridge (index.php), kept apart so the tests can
 * load them without running a request. They follow the domoticz_weatherinfo
 * plugin (https://github.com/MadPatrick/domoticz_weatherinfo): the rain
 * forecast comes from the Buienradar raintext feed, the current weather from
 * Open-Meteo. */

define('DASHTICZ_WEATHERINFO_RAIN_URL', 'https://gpsgadget.buienradar.nl/data/raintext?lat=%s&lon=%s');
define('DASHTICZ_WEATHERINFO_CURRENT_URL', 'https://api.open-meteo.com/v1/forecast?latitude=%s&longitude=%s'
    . '&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code,is_day');
// Like the plugin, the current weather is fetched once every 15 minutes,
// whatever the poll interval of the rain forecast is.
define('DASHTICZ_WEATHERINFO_CURRENT_TTL', 900);

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

/* Open-Meteo JSON -> the current values (temperature in degrees Celsius, wind
 * in km/h, wind direction in degrees, WMO weather code, is day). A value that
 * is missing is left out, like the plugin does. */
function dashticz_weatherinfo_parse_current($json)
{
    $data = is_string($json) ? json_decode($json, true) : $json;
    if (!is_array($data) || empty($data['current']) || !is_array($data['current'])) {
        throw new RuntimeException('Unexpected format in the Open-Meteo response.');
    }
    $current = $data['current'];
    $result = array();
    $map = array(
        'temperature' => 'temperature_2m',
        'windSpeed' => 'wind_speed_10m',
        'windDirection' => 'wind_direction_10m',
    );
    foreach ($map as $key => $field) {
        if (isset($current[$field]) && is_numeric($current[$field])) {
            $result[$key] = (float) $current[$field];
        }
    }
    if (isset($current['weather_code']) && is_numeric($current['weather_code'])) {
        $result['weatherCode'] = (int) $current['weather_code'];
    }
    if (isset($current['is_day']) && is_numeric($current['is_day'])) {
        $result['isDay'] = (int) $current['is_day'] !== 0;
    }
    if (!$result) {
        throw new RuntimeException('Missing current data in the Open-Meteo response.');
    }
    return $result;
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
        $response = dashticz_fetch_remote($url, 262144);
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

function dashticz_weatherinfo_current($lat, $lon)
{
    return dashticz_cached_json(dashticz_weatherinfo_cache_file('current', $lat, $lon), DASHTICZ_WEATHERINFO_CURRENT_TTL, function () use ($lat, $lon) {
        $url = sprintf(DASHTICZ_WEATHERINFO_CURRENT_URL, rawurlencode($lat), rawurlencode($lon));
        return dashticz_weatherinfo_parse_current(dashticz_weatherinfo_download($url, 'the Open-Meteo weather'));
    });
}
