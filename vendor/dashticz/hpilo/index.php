<?php
require_once(__DIR__ . '/../security.php');

// This endpoint promises JSON even when PHP itself raises a fatal error.
@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (function_exists('set_time_limit')) {
    @set_time_limit(60);
}

register_shutdown_function(function () {
    $error = error_get_last();
    if (!$error || !in_array($error['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR), true)) {
        return;
    }
    if (!headers_sent()) {
        http_response_code(500);
        header('Content-Type: application/json');
    }
    echo json_encode(array(
        'error' => 'HP iLO request failed unexpectedly.',
        'debug' => array(
            'message' => $error['message'],
            'file' => basename($error['file']),
            'line' => $error['line'],
        ),
    ));
});

/* Single backend bridge for the HP iLO widget (js/components/hpilo.js).
 * The iLO host, port and credentials are posted here from the browser on
 * every poll (read from the widget's own global settings, hpilo_*, see
 * js/widgeteditor.js), exactly like the Lyrion and PostNL widgets: the
 * (LAN-only, self-signed HTTPS) iLO interface never has to be reachable from
 * the browser, and the credentials never end up in a URL.
 *
 * It reads the iLO Redfish API, mirroring the domoticz_HP_ilo plugin
 * (https://github.com/MadPatrick/domoticz_HP_ilo) and Home Assistant's
 * hp_ilo integration: system (power state, health, model, serial, power-on
 * minutes), chassis Thermal (temperatures, fans), chassis Power (watts),
 * manager (iLO firmware) and storage (worst drive/controller health).
 * Only the sections needed by the metrics the widget actually shows are
 * requested, and the result is cached server-side for the poll interval
 * (custom/cache/hpilo/<sha1>.json, never containing the password), so
 * several connected dashboards don't hammer the iLO.
 *
 * iLO uses a self-signed certificate by default, so - like the reference
 * plugin - TLS verification is disabled for this (user configured, LAN)
 * connection.
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the HP iLO widget.');
    }
    $input = dashticz_hpilo_read_input();
    echo json_encode(dashticz_hpilo_get_data($input));
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}

function dashticz_hpilo_metric_sections()
{
    return array(
        'name' => 'system',
        'model' => 'system',
        'serial' => 'system',
        'power' => 'system',
        'health' => 'system',
        'uptime' => 'system',
        'cputemp' => 'thermal',
        'inlettemp' => 'thermal',
        'fanspeed' => 'thermal',
        'watts' => 'power',
        'firmware' => 'manager',
        'network' => 'network',
        'minfan' => 'thermal',
        'thermalconfig' => 'thermal',
        'powerregulator' => 'bios',
        'storage' => 'storage',
        'ssdlife' => 'storage',
    );
}

function dashticz_hpilo_read_input()
{
    $raw = file_get_contents('php://input');
    $input = json_decode((string) $raw, true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid HP iLO request.');
    }

    $host = dashticz_normalize_host_input(isset($input['host']) ? $input['host'] : '');
    $username = isset($input['username']) ? trim((string) $input['username']) : '';
    $password = isset($input['password']) ? (string) $input['password'] : '';
    if ($host === '' || $username === '' || $password === '') {
        throw new RuntimeException('Enter the iLO host, username and password in the widget settings.');
    }
    if (!preg_match('/^[A-Za-z0-9.\-_:\[\]]+$/', $host)) {
        throw new RuntimeException('Invalid iLO host.');
    }

    $port = isset($input['port']) ? (int) $input['port'] : 443;
    if ($port < 1 || $port > 65535) {
        $port = 443;
    }

    // Never below 30 seconds: the iLO management processor is slow.
    $pollSeconds = isset($input['pollSeconds']) ? (int) $input['pollSeconds'] : 300;
    $pollSeconds = max(30, min(86400, $pollSeconds));

    $known = dashticz_hpilo_metric_sections();
    $sections = array();
    $metrics = isset($input['metrics']) && is_array($input['metrics']) ? $input['metrics'] : array();
    foreach ($metrics as $metric) {
        if (is_string($metric) && isset($known[$metric])) {
            $sections[$known[$metric]] = true;
        }
    }
    $sections = array_keys($sections);
    sort($sections);

    return array(
        'host' => $host,
        'port' => $port,
        'username' => $username,
        'password' => $password,
        'pollSeconds' => $pollSeconds,
        'sections' => $sections,
    );
}

// ---------------------------------------------------------------- caching

function dashticz_hpilo_cache_file($input)
{
    $baseDir = dirname(__DIR__, 2) . '/custom/cache/hpilo';
    if (!is_dir($baseDir)) {
        @mkdir($baseDir, 0775, true);
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        $baseDir = rtrim(sys_get_temp_dir(), '/\\') . '/dashticz-hpilo-cache';
        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0775, true);
        }
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        return null;
    }
    $key = strtolower($input['host'] . ':' . $input['port'] . '|' . $input['username'] . '|' . implode(',', $input['sections']));
    return $baseDir . '/' . sha1($key) . '.json';
}

function dashticz_hpilo_read_cache($file)
{
    if (!$file || !is_file($file)) {
        return null;
    }
    $data = json_decode((string) @file_get_contents($file), true);
    return is_array($data) && isset($data['fetchedAt'], $data['data']) ? $data : null;
}

function dashticz_hpilo_write_cache($file, $data)
{
    if (!$file) {
        return;
    }
    $tmp = $file . '.tmp';
    if (@file_put_contents($tmp, json_encode(array('fetchedAt' => time(), 'data' => $data)), LOCK_EX) !== false) {
        @rename($tmp, $file);
    }
}

// ------------------------------------------------------------ Redfish/curl

function dashticz_hpilo_get($input, $path)
{
    $ch = curl_init('https://' . $input['host'] . ':' . $input['port'] . $path);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => $input['username'] . ':' . $input['password'],
        CURLOPT_HTTPHEADER => array('Accept: application/json', 'OData-Version: 4.0'),
    ));
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $failed = ($body === false);
    curl_close($ch);

    if ($failed) {
        throw new RuntimeException('Unable to reach the iLO.');
    }
    if ($status === 401 || $status === 403) {
        throw new RuntimeException('The iLO rejected the username or password.');
    }
    if ($status !== 200) {
        throw new DashticzHpiloHttpError('HTTP ' . $status, $status);
    }
    $data = json_decode((string) $body, true);
    if (!is_array($data)) {
        throw new RuntimeException('The iLO returned an unexpected response.');
    }
    return $data;
}

class DashticzHpiloHttpError extends RuntimeException
{
}

function dashticz_hpilo_first_member($input, $collectionPath)
{
    $collection = dashticz_hpilo_get($input, $collectionPath);
    if (empty($collection['Members'][0]['@odata.id'])) {
        throw new DashticzHpiloHttpError('No members', 404);
    }
    return $collection['Members'][0]['@odata.id'];
}

function dashticz_hpilo_health_rank($health)
{
    $health = strtolower((string) $health);
    if ($health === 'ok') {
        return 0;
    }
    if ($health === 'warning') {
        return 1;
    }
    if ($health === 'critical') {
        return 2;
    }
    return 0;
}

// ---------------------------------------------------------------- sections

function dashticz_hpilo_section_system($input, $systemUri)
{
    $system = dashticz_hpilo_get($input, $systemUri);
    $oem = array();
    if (isset($system['Oem']['Hpe']) && is_array($system['Oem']['Hpe'])) {
        $oem = $system['Oem']['Hpe'];
    } elseif (isset($system['Oem']['Hp']) && is_array($system['Oem']['Hp'])) {
        $oem = $system['Oem']['Hp'];
    }
    return array(
        'name' => isset($system['HostName']) ? (string) $system['HostName'] : null,
        'model' => isset($system['Model']) ? (string) $system['Model'] : null,
        'serial' => isset($system['SerialNumber']) ? (string) $system['SerialNumber'] : null,
        'power' => isset($system['PowerState']) ? (string) $system['PowerState'] : null,
        'health' => isset($system['Status']['Health']) ? (string) $system['Status']['Health'] : null,
        'uptime' => isset($oem['PowerOnMinutes']) && is_numeric($oem['PowerOnMinutes'])
            ? (int) $oem['PowerOnMinutes']
            : null,
    );
}

function dashticz_hpilo_section_thermal($input, $chassisUri)
{
    $thermal = dashticz_hpilo_get($input, rtrim($chassisUri, '/') . '/Thermal');
    $cpu = null;
    $inlet = null;
    if (isset($thermal['Temperatures']) && is_array($thermal['Temperatures'])) {
        foreach ($thermal['Temperatures'] as $sensor) {
            $name = strtolower(isset($sensor['Name']) ? (string) $sensor['Name'] : '');
            $reading = isset($sensor['ReadingCelsius']) ? $sensor['ReadingCelsius'] : null;
            if (!is_numeric($reading)) {
                continue;
            }
            if (strpos($name, 'cpu') !== false && $cpu === null) {
                $cpu = $reading;
            }
            if (strpos($name, 'ambient') !== false) {
                $inlet = $reading;
            } elseif (strpos($name, 'inlet') !== false && strpos($name, 'board') === false && $inlet === null) {
                $inlet = $reading;
            }
        }
    }

    // Fan speed: average of all fans that report a percentage.
    $sum = 0;
    $count = 0;
    if (isset($thermal['Fans']) && is_array($thermal['Fans'])) {
        foreach ($thermal['Fans'] as $fan) {
            $reading = isset($fan['Reading']) ? $fan['Reading'] : (isset($fan['CurrentReading']) ? $fan['CurrentReading'] : null);
            $unit = strtolower(isset($fan['ReadingUnits']) ? (string) $fan['ReadingUnits'] : 'percent');
            if (is_numeric($reading) && $unit === 'percent') {
                $sum += $reading;
                $count++;
            }
        }
    }
    $minFan = dashticz_hpilo_oem_setting($thermal, array(
        'FanPercentMinimum', 'MinimumFanSpeedPercent', 'MinimumFanSpeed', 'MinFanSpeedPercent',
        'MinFanSpeed', 'FanSpeedMinimum', 'FanSpeedMin', 'FanMinimumPercent',
    ));
    $thermalConfig = dashticz_hpilo_oem_setting($thermal, array(
        'ThermalConfiguration', 'ThermalConfig', 'CoolingConfiguration', 'CoolingMode', 'FanConfiguration',
    ));
    return array(
        'cputemp' => $cpu,
        'inlettemp' => $inlet,
        'fanspeed' => $count ? (int) round($sum / $count) : null,
        'minfan' => is_numeric($minFan) ? (int) $minFan : null,
        'thermalconfig' => $thermalConfig === null ? null : dashticz_hpilo_label(
            $thermalConfig,
            dashticz_hpilo_thermal_config_labels()
        ),
    );
}

// Value of the first of $keys found in the HPE OEM block, else in the
// resource itself - same lookup as the reference plugin.
function dashticz_hpilo_oem_setting($data, $keys)
{
    $oem = array();
    if (isset($data['Oem']['Hpe']) && is_array($data['Oem']['Hpe'])) {
        $oem = $data['Oem']['Hpe'];
    } elseif (isset($data['Oem']['Hp']) && is_array($data['Oem']['Hp'])) {
        $oem = $data['Oem']['Hp'];
    }
    foreach (array($oem, $data) as $source) {
        foreach ($keys as $key) {
            if (isset($source[$key]) && !is_array($source[$key])) {
                return $source[$key];
            }
        }
    }
    return null;
}

function dashticz_hpilo_thermal_config_labels()
{
    return array(
        'Optimal Cooling' => array('OptimalCooling', 'Optimal', 'Optimal_Cooling'),
        'Enhanced CPU Cooling' => array('EnhancedCPUCooling', 'EnhancedCpuCooling', 'EnhancedCooling', 'Enhanced_CPU_Cooling'),
        'Increased Cooling' => array('IncreasedCooling', 'Increased', 'Increased_Cooling'),
        'Maximum Cooling' => array('MaximumCooling', 'Maximum', 'MaxCooling', 'Maximum_Cooling'),
        'Smooth Cooling' => array('SmoothCooling', 'Smooth', 'Smooth_Cooling'),
    );
}

function dashticz_hpilo_power_regulator_labels()
{
    return array(
        'Dynamic Power Savings Mode' => array('DynamicPowerSavings', 'DynamicPowerSavingsMode', 'DynamicPowerSavings_Mode'),
        'Static Low Power Mode' => array('StaticLowPower', 'StaticLowPowerMode', 'StaticLowPower_Mode'),
        'Static High Performance Mode' => array('StaticHighPerf', 'StaticHighPerformance', 'StaticHighPerformanceMode', 'StaticHighPerformance_Mode'),
        'OS Control Mode' => array('OSControl', 'OsControl', 'OSControlMode', 'OSControl_Mode'),
    );
}

// Maps a raw Redfish value (any of its known aliases) to a readable label,
// like the reference plugin's option tables; unknown values pass through.
function dashticz_hpilo_label($value, $labels)
{
    $normalize = function ($text) {
        return strtolower(str_replace(array(' ', '_'), '', (string) $text));
    };
    $wanted = $normalize($value);
    foreach ($labels as $label => $aliases) {
        foreach (array_merge(array($label), $aliases) as $candidate) {
            if ($normalize($candidate) === $wanted) {
                return $label;
            }
        }
    }
    return (string) $value;
}

function dashticz_hpilo_section_power($input, $chassisUri)
{
    $power = dashticz_hpilo_get($input, rtrim($chassisUri, '/') . '/Power');
    $watts = null;
    if (isset($power['PowerControl'][0]) && is_array($power['PowerControl'][0])) {
        $control = $power['PowerControl'][0];
        if (isset($control['PowerConsumedWatts']) && is_numeric($control['PowerConsumedWatts'])) {
            $watts = $control['PowerConsumedWatts'];
        } elseif (isset($control['PowerMetrics']['AverageConsumedWatts']) && is_numeric($control['PowerMetrics']['AverageConsumedWatts'])) {
            $watts = $control['PowerMetrics']['AverageConsumedWatts'];
        }
    }
    return array('watts' => $watts);
}

function dashticz_hpilo_section_bios($input, $systemUri)
{
    $bios = dashticz_hpilo_get($input, rtrim($systemUri, '/') . '/Bios');
    $attributes = isset($bios['Attributes']) && is_array($bios['Attributes']) ? $bios['Attributes'] : array();
    $value = null;
    foreach (array('PowerRegulator', 'PowerRegulatorMode', 'PowerProfile') as $key) {
        if (isset($attributes[$key]) && !is_array($attributes[$key])) {
            $value = $attributes[$key];
            break;
        }
    }
    return array(
        'powerregulator' => $value === null ? null : dashticz_hpilo_label($value, dashticz_hpilo_power_regulator_labels()),
    );
}

function dashticz_hpilo_section_network($input, $managersUri)
{
    $managerUri = dashticz_hpilo_first_member($input, $managersUri);
    $eth = dashticz_hpilo_get($input, dashticz_hpilo_first_member($input, rtrim($managerUri, '/') . '/EthernetInterfaces'));
    $ip = isset($eth['IPv4Addresses'][0]['Address']) ? $eth['IPv4Addresses'][0]['Address'] : 'N/A';
    $mac = isset($eth['MACAddress']) ? $eth['MACAddress'] : 'N/A';
    return array('network' => 'IP: ' . $ip . ' | MAC: ' . $mac);
}

function dashticz_hpilo_section_manager($input, $managersUri)
{
    $manager = dashticz_hpilo_get($input, dashticz_hpilo_first_member($input, $managersUri));
    return array(
        'firmware' => isset($manager['FirmwareVersion']) ? (string) $manager['FirmwareVersion'] : null,
    );
}

// Worst health over all drives (or, when the iLO doesn't expose drives, all
// storage controllers), like the reference plugin's Storage device.
function dashticz_hpilo_section_storage($input, $systemUri)
{
    $storage = dashticz_hpilo_get($input, rtrim($systemUri, '/') . '/Storage');
    $worst = null;
    $worstRank = -1;
    $consider = function ($health) use (&$worst, &$worstRank) {
        if ($health === null) {
            return;
        }
        $rank = dashticz_hpilo_health_rank($health);
        if ($rank > $worstRank) {
            $worstRank = $rank;
            $worst = (string) $health;
        }
    };
    $sawDrive = false;
    $ssdLifetimes = array();
    $controllerHealth = array();
    foreach (isset($storage['Members']) && is_array($storage['Members']) ? $storage['Members'] : array() as $member) {
        if (empty($member['@odata.id'])) {
            continue;
        }
        try {
            $controller = dashticz_hpilo_get($input, $member['@odata.id']);
        } catch (DashticzHpiloHttpError $error) {
            continue;
        }
        $controllerHealth[] = isset($controller['Status']['Health']) ? $controller['Status']['Health'] : null;
        foreach (isset($controller['Drives']) && is_array($controller['Drives']) ? $controller['Drives'] : array() as $driveRef) {
            if (empty($driveRef['@odata.id'])) {
                continue;
            }
            try {
                $drive = dashticz_hpilo_get($input, $driveRef['@odata.id']);
            } catch (DashticzHpiloHttpError $error) {
                continue;
            }
            $sawDrive = true;
            $consider(isset($drive['Status']['Health']) ? $drive['Status']['Health'] : null);
            $media = strtolower(isset($drive['MediaType']) ? (string) $drive['MediaType'] : '');
            $life = dashticz_hpilo_drive_lifetime($drive);
            if ($life !== null && in_array($media, array('ssd', 'solidstate', 'solid state drive'), true)) {
                $ssdLifetimes[] = $life;
            }
        }
    }
    if (!$sawDrive) {
        foreach ($controllerHealth as $health) {
            $consider($health);
        }
    }
    return array(
        'storage' => $worst,
        'ssdlife' => $ssdLifetimes ? min($ssdLifetimes) : null,
    );
}

// Remaining SSD life in percent (0..100), like the reference plugin's
// _get_drive_lifetime_percent(): "life left" fields as-is, "life used"
// fields inverted.
function dashticz_hpilo_drive_lifetime($drive)
{
    $left = array('PredictedMediaLifeLeftPercent', 'RemainingLifePercent', 'PercentLifeRemaining', 'MediaLifeLeftPercent', 'SSDLifeLeft');
    $used = array('SSDEnduranceUtilizationPercentage', 'DriveLifeUsedPercent', 'PercentLifeUsed');
    $sources = array();
    foreach (array('Hpe', 'Hp') as $vendor) {
        if (isset($drive['Oem'][$vendor]) && is_array($drive['Oem'][$vendor])) {
            $sources[] = $drive['Oem'][$vendor];
        }
    }
    array_unshift($sources, $drive);
    foreach ($sources as $source) {
        foreach ($left as $key) {
            if (isset($source[$key]) && is_numeric($source[$key])) {
                return max(0, min(100, (int) round($source[$key])));
            }
        }
    }
    foreach ($sources as $source) {
        foreach ($used as $key) {
            if (isset($source[$key]) && is_numeric($source[$key])) {
                return max(0, min(100, (int) round(100 - $source[$key])));
            }
        }
    }
    return null;
}

// -------------------------------------------------------------- orchestration

function dashticz_hpilo_fetch($input)
{
    $root = dashticz_hpilo_get($input, '/redfish/v1/');
    $systemsPath = isset($root['Systems']['@odata.id']) ? $root['Systems']['@odata.id'] : '/redfish/v1/Systems';
    $chassisPath = isset($root['Chassis']['@odata.id']) ? $root['Chassis']['@odata.id'] : '/redfish/v1/Chassis';
    $managersPath = isset($root['Managers']['@odata.id']) ? $root['Managers']['@odata.id'] : '/redfish/v1/Managers';

    $sectionCalls = array(
        'system' => function () use ($input, $systemsPath) {
            return dashticz_hpilo_section_system($input, dashticz_hpilo_first_member($input, $systemsPath));
        },
        'thermal' => function () use ($input, $chassisPath) {
            return dashticz_hpilo_section_thermal($input, dashticz_hpilo_first_member($input, $chassisPath));
        },
        'power' => function () use ($input, $chassisPath) {
            return dashticz_hpilo_section_power($input, dashticz_hpilo_first_member($input, $chassisPath));
        },
        'manager' => function () use ($input, $managersPath) {
            return dashticz_hpilo_section_manager($input, $managersPath);
        },
        'bios' => function () use ($input, $systemsPath) {
            return dashticz_hpilo_section_bios($input, dashticz_hpilo_first_member($input, $systemsPath));
        },
        'network' => function () use ($input, $managersPath) {
            return dashticz_hpilo_section_network($input, $managersPath);
        },
        'storage' => function () use ($input, $systemsPath) {
            return dashticz_hpilo_section_storage($input, dashticz_hpilo_first_member($input, $systemsPath));
        },
    );

    // Like the reference plugin, one failing section (older iLO without
    // Power/Storage, ...) must not blank the others; an auth or
    // connection error, however, aborts the whole poll.
    $result = array();
    foreach ($input['sections'] as $section) {
        try {
            $result = array_merge($result, $sectionCalls[$section]());
        } catch (DashticzHpiloHttpError $error) {
            // Not supported by this iLO: leave those metrics out.
        }
    }
    return $result;
}

function dashticz_hpilo_get_data($input)
{
    $cacheFile = dashticz_hpilo_cache_file($input);
    $cache = dashticz_hpilo_read_cache($cacheFile);
    if ($cache && (time() - (int) $cache['fetchedAt']) < $input['pollSeconds']) {
        return $cache['data'];
    }

    try {
        $data = dashticz_hpilo_fetch($input);
    } catch (RuntimeException $error) {
        // A transient hiccup falls back to the last known good result.
        if ($cache) {
            return $cache['data'];
        }
        throw $error;
    }
    dashticz_hpilo_write_cache($cacheFile, $data);
    return $data;
}
