<?php
/* Helpers of the Husqvarna bridge (vendor/dashticz/husqvarna/index.php): the
 * Automower Connect API, the same calls the Domoticz Husqvarna plugin makes.
 * https://developer.husqvarnagroup.cloud/apis/automower-connect-api */

function dashticz_husqvarna_token_url()
{
    return 'https://api.authentication.husqvarnagroup.dev/v1/oauth2/token';
}

function dashticz_husqvarna_api_url()
{
    return 'https://api.amc.husqvarna.dev/v1/';
}

// The actions of the Automower Connect API this bridge sends.
function dashticz_husqvarna_actions()
{
    return array('Start', 'ResumeSchedule', 'Pause', 'ParkUntilNextSchedule', 'ParkUntilFurtherNotice');
}

// One request; returns the decoded JSON ({} for an empty answer).
function dashticz_husqvarna_request($method, $url, $headers, $body = null)
{
    $ch = curl_init($url);
    $options = array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
    );
    if ($body !== null) {
        $options[CURLOPT_POSTFIELDS] = $body;
    }
    curl_setopt_array($ch, $options);
    $answer = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failed = ($answer === false);
    curl_close($ch);
    if ($failed) {
        throw new RuntimeException('Unable to reach the Husqvarna service.');
    }
    if ($status === 401 || $status === 403) {
        throw new RuntimeException('Husqvarna rejected the client ID or secret.');
    }
    if ($status === 429) {
        throw new RuntimeException('The Husqvarna API limit is reached, try again later.');
    }
    if ($status < 200 || $status > 299) {
        throw new RuntimeException('Husqvarna returned HTTP ' . $status . '.');
    }
    $data = json_decode((string) $answer, true);
    return is_array($data) ? $data : array();
}

// Access token of the application (kept, with a safety margin, until it
// expires), so a status request is one call instead of two.
function dashticz_husqvarna_token($clientId, $clientSecret, $cacheDir)
{
    $file = $cacheDir === null ? null : $cacheDir . '/token-' . sha1($clientId . "\n" . $clientSecret) . '.json';
    return dashticz_cached_json($file, 3600 * 6, function () use ($clientId, $clientSecret) {
        $answer = dashticz_husqvarna_request(
            'POST',
            dashticz_husqvarna_token_url(),
            array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
            http_build_query(array(
                'grant_type' => 'client_credentials',
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
            ))
        );
        if (empty($answer['access_token']) || !is_string($answer['access_token'])) {
            throw new RuntimeException('Husqvarna did not give an access token.');
        }
        return $answer['access_token'];
    }, '', 60);
}

function dashticz_husqvarna_headers($clientId, $token, $json = false)
{
    $headers = array(
        'Authorization: Bearer ' . $token,
        'Authorization-Provider: husqvarna',
        'X-Api-Key: ' . $clientId,
        'Accept: application/vnd.api+json',
    );
    if ($json) {
        $headers[] = 'Content-Type: application/vnd.api+json';
    }
    return $headers;
}

// The mower to show: the one with the given name, else the first one.
function dashticz_husqvarna_pick($list, $name)
{
    $mowers = isset($list['data']) && is_array($list['data']) ? $list['data'] : array();
    foreach ($mowers as $mower) {
        if ($name !== '' && isset($mower['attributes']['system']['name'])
            && strcasecmp((string) $mower['attributes']['system']['name'], $name) === 0) {
            return $mower;
        }
    }
    if ($name !== '') {
        throw new RuntimeException('Mower "' . $name . '" not found.');
    }
    if (!$mowers) {
        throw new RuntimeException('No mower found at Husqvarna.');
    }
    return $mowers[0];
}

// An API mower -> what the widget shows.
function dashticz_husqvarna_summary($mower)
{
    $attributes = isset($mower['attributes']) && is_array($mower['attributes']) ? $mower['attributes'] : array();
    $mowerInfo = isset($attributes['mower']) && is_array($attributes['mower']) ? $attributes['mower'] : array();
    $planner = isset($attributes['planner']) && is_array($attributes['planner']) ? $attributes['planner'] : array();
    $activities = array(
        'MOWING' => 'Mowing',
        'GOING_HOME' => 'Going home',
        'CHARGING' => 'Charging',
        'LEAVING' => 'Leaving base',
        'PARKED_IN_CS' => 'Parked in base',
        'STOPPED_IN_GARDEN' => 'Stopped in garden',
    );
    $states = array(
        'PAUSED' => 'Paused',
        'WAIT_UPDATING' => 'Updating firmware',
        'WAIT_POWER_UP' => 'Power-up testing',
        'OFF' => 'Switched off',
        'STOPPED' => 'Stopped',
        'ERROR' => 'Error',
        'FATAL_ERROR' => 'Fatal error',
        'ERROR_AT_POWER_UP' => 'Error at power-up',
    );
    $activity = isset($mowerInfo['activity']) ? (string) $mowerInfo['activity'] : '';
    $state = isset($mowerInfo['state']) ? (string) $mowerInfo['state'] : '';
    $text = isset($states[$state]) ? $states[$state] : (isset($activities[$activity]) ? $activities[$activity] : '');
    $reason = isset($planner['restrictedReason']) ? (string) $planner['restrictedReason'] : '';
    $next = isset($planner['nextStartTimestamp']) && is_numeric($planner['nextStartTimestamp'])
        ? (int) $planner['nextStartTimestamp'] : 0;
    $battery = isset($attributes['battery']['batteryPercent']) && is_numeric($attributes['battery']['batteryPercent'])
        ? max(0, min(100, (int) $attributes['battery']['batteryPercent'])) : null;
    return array(
        'name' => isset($attributes['system']['name']) ? (string) $attributes['system']['name'] : '',
        'status' => $text,
        'activity' => $activity,
        'state' => $state,
        'parked' => $reason === 'PARK_OVERRIDE',
        'running' => $activity === 'MOWING' || $activity === 'LEAVING',
        // Milliseconds; the mower's local time written as if it were UTC.
        'nextStart' => $next > 0 ? $next : null,
        'reason' => $reason,
        'battery' => $battery,
    );
}

// The body of an action request, or a RuntimeException for anything that is
// not allowed.
function dashticz_husqvarna_action_body($action, $minutes)
{
    if (!in_array($action, dashticz_husqvarna_actions(), true)) {
        throw new RuntimeException('Unknown mower action.');
    }
    $data = array('type' => $action);
    if ($action === 'Start') {
        $data['attributes'] = array('duration' => max(1, min(1440, (int) $minutes)));
    }
    return json_encode(array('data' => $data));
}
