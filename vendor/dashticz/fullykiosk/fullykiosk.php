<?php
/* Helpers of the Fully Kiosk bridge (index.php), kept apart so the tests can
 * load them without running a request. */

/* The tablet's getDeviceInfo JSON -> the values the widget needs: battery
 * (0-100 or null), plugged, screenOn, screensaver and motion (bool) and
 * brightness (0-100) as the plugin's devices show them. Mirrors the
 * domoticz_fullykiosk plugin, which clamps the battery level to 0-100 and
 * treats anything that is not a number as unknown. */
function dashticz_fullykiosk_summary($info)
{
    if (!is_array($info)) {
        throw new RuntimeException('Fully Kiosk returned an unexpected response.');
    }
    $battery = null;
    if (isset($info['batteryLevel']) && is_numeric($info['batteryLevel'])) {
        $battery = max(0, min(100, (int) round((float) $info['batteryLevel'])));
    }
    return array(
        'battery' => $battery,
        'plugged' => !empty($info['isPlugged']),
        'screenOn' => !empty($info['screenOn']),
        'screensaver' => !empty($info['isInScreensaver']),
        'motion' => !empty(isset($info['motionDetectionEnabled'])
            ? $info['motionDetectionEnabled']
            : (isset($info['motionDetectorStarted']) ? $info['motionDetectorStarted'] : false)),
        'brightness' => isset($info['screenBrightness']) && is_numeric($info['screenBrightness'])
            ? max(0, min(100, (int) $info['screenBrightness']))
            : 0,
    );
}

/* A widget command -> the Fully Kiosk REST parameters, like the plugin's
 * onCommand(). Only these commands are accepted; 'loadurl' is the plugin's
 * "Load Start URL" and is handled by the caller (it needs the start URL of
 * the tablet first). */
function dashticz_fullykiosk_command_params($command, $value)
{
    $on = ($value === 'on' || $value === true || $value === 1 || $value === '1');
    switch ($command) {
        case 'screen':
            return array('cmd' => $on ? 'screenOn' : 'screenOff');
        case 'screensaver':
            return array('cmd' => $on ? 'startScreensaver' : 'stopScreensaver');
        case 'motion':
            return array('cmd' => 'setConfig', 'key' => 'motionDetectionEnabled', 'value' => $on ? 'true' : 'false');
        case 'brightness':
            return array('cmd' => 'setScreenBrightness', 'value' => (string) max(0, min(100, (int) $value)));
    }
    throw new RuntimeException('Unknown Fully Kiosk command.');
}
