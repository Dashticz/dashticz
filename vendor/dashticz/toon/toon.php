<?php
/* Helpers of the Toon bridge (vendor/dashticz/toon/index.php): the local API
 * of a rooted Toon, the same calls the domoticz_toon plugin
 * (https://github.com/MadPatrick/domoticz_toon) makes. */

// Toon scene id of the plugin (10 Weg, 20 Slapen, 30 Thuis, 40 Comfort, 50 Manual)
// -> the state number of the Toon.
function dashticz_toon_scene_states()
{
    return array(10 => 3, 20 => 2, 30 => 1, 40 => 0);
}

// activeState of the Toon -> scene id of the plugin.
function dashticz_toon_scene($activeState)
{
    $scenes = array(0 => 40, 1 => 30, 2 => 20, 3 => 10);
    return isset($scenes[(int) $activeState]) ? $scenes[(int) $activeState] : 50;
}

// One GET request of the Toon API; returns the decoded JSON.
function dashticz_toon_get($toon, $path)
{
    $ch = curl_init($toon['base'] . $path);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_TIMEOUT => 8,
        CURLOPT_FOLLOWLOCATION => false,
    ));
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failed = ($body === false);
    curl_close($ch);
    if ($failed) {
        throw new RuntimeException('Unable to reach the Toon.');
    }
    if ($status !== 200) {
        throw new RuntimeException('The Toon returned HTTP ' . $status . '.');
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        throw new RuntimeException('The Toon returned an unexpected answer.');
    }
    return $data;
}

// "Next program Thuis (20.0 C) at 01-11-2026 18:00:00": the ProgramInfo text
// of the plugin.
function dashticz_toon_program_info($thermostat)
{
    foreach (array('nextProgram', 'nextSetpoint', 'nextTime', 'nextState') as $key) {
        if (!isset($thermostat[$key])) {
            return '';
        }
    }
    $next = (int) $thermostat['nextProgram'];
    if ($next === -1) {
        return 'No program scheduled';
    }
    if ($next === 0) {
        return 'Program is off';
    }
    $names = array('Weg', 'Slapen', 'Thuis', 'Comfort', 'Manual');
    $state = (int) $thermostat['nextState'];
    return sprintf(
        'Next program %s (%.1f C) at %s',
        isset($names[$state]) ? $names[$state] : (string) $state,
        ((float) $thermostat['nextSetpoint']) / 100,
        date('d-m-Y H:i:s', (int) $thermostat['nextTime'])
    );
}

// Thermostat info and boiler values of the Toon -> what the widget shows.
function dashticz_toon_summary($thermostat, $boiler)
{
    $boilerStates = array(0 => 'off', 1 => 'heating', 2 => 'hotwater');
    $summary = array(
        'room' => isset($thermostat['currentTemp']) ? round(((float) $thermostat['currentTemp']) / 100, 1) : null,
        'setpoint' => isset($thermostat['currentSetpoint']) ? round(((float) $thermostat['currentSetpoint']) / 100, 1) : null,
        'scene' => isset($thermostat['activeState']) ? dashticz_toon_scene($thermostat['activeState']) : null,
        'boiler' => isset($thermostat['burnerInfo'], $boilerStates[(int) $thermostat['burnerInfo']])
            ? $boilerStates[(int) $thermostat['burnerInfo']] : null,
        'program' => dashticz_toon_program_info($thermostat),
        'pressure' => null,
        'modulation' => null,
    );
    // Not every Toon has the boiler values file: the thermostat info has the
    // modulation level too.
    if (isset($thermostat['currentModulationLevel']) && is_numeric($thermostat['currentModulationLevel'])) {
        $summary['modulation'] = max(0, min(100, (int) $thermostat['currentModulationLevel']));
    }
    if (is_array($boiler)) {
        if (isset($boiler['boilerPressure']) && is_numeric($boiler['boilerPressure'])) {
            $summary['pressure'] = round((float) $boiler['boilerPressure'], 1);
        }
        if (isset($boiler['boilerModulationLevel']) && is_numeric($boiler['boilerModulationLevel'])) {
            $summary['modulation'] = max(0, min(100, (int) $boiler['boilerModulationLevel']));
        }
    }
    return $summary;
}

// The status of the Toon. The boiler values are optional (not every Toon has
// them), the thermostat info is not.
function dashticz_toon_status($toon)
{
    $thermostat = dashticz_toon_get($toon, 'happ_thermstat?action=getThermostatInfo');
    try {
        $boiler = dashticz_toon_get($toon, 'boilerstatus/boilervalues.txt');
    } catch (RuntimeException $error) {
        $boiler = null;
    }
    return dashticz_toon_summary($thermostat, $boiler);
}

// A command for the Toon: the path of its API, or a RuntimeException for
// anything that is not allowed.
function dashticz_toon_command_path($command, $value)
{
    if ($command === 'setpoint') {
        if (!is_numeric($value) || (float) $value < 5 || (float) $value > 30) {
            throw new RuntimeException('Enter a setpoint between 5 and 30.');
        }
        return 'happ_thermstat?action=setSetpoint&Setpoint=' . (int) round(((float) $value) * 100);
    }
    if ($command === 'scene') {
        $states = dashticz_toon_scene_states();
        if (!is_numeric($value) || !isset($states[(int) $value])) {
            throw new RuntimeException('Unknown Toon scene.');
        }
        return 'happ_thermstat?action=changeSchemeState&state=2&temperatureState=' . $states[(int) $value];
    }
    throw new RuntimeException('Unknown Toon command.');
}
