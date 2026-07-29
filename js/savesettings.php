<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$customDir = __DIR__ . '/../custom';

// Which config file are we editing? Matches js/main.js's loadConfig(), which
// reads ?cfg=... and falls back to CONFIG.js when absent.
$cfgFile = isset($_GET['cfg']) ? $_GET['cfg'] : 'CONFIG.js';

// Security: only allow a bare filename ending in .js, no path separators or
// traversal sequences, so this endpoint can never be tricked into writing
// outside custom/ (e.g. ?cfg=../../../../etc/passwd).
$cfgFile = basename($cfgFile);
if (!preg_match('/^[A-Za-z0-9_\-]+\.js$/', $cfgFile)) {
    dashticz_json_error(400, 'Invalid cfg filename.');
}

$configPath = $customDir . '/' . $cfgFile;
$before = '';
$rows = [];

if (file_exists($configPath)) {
    $config = @file_get_contents($configPath);
    if ($config === false) {
        dashticz_json_error(500, 'Unable to read ' . $cfgFile . '.');
    }

    if (trim($config) !== '#EMPTY#') {
        $marker = 'var config = {}';
        $markerPosition = strpos($config, $marker);
        if ($markerPosition === false) {
            dashticz_json_error(409, $cfgFile . ' does not contain the expected config marker.');
        }

        $before = substr($config, 0, $markerPosition);
        $conf = substr($config, $markerPosition + strlen($marker));
        $rows = preg_split('/\r\n|\r|\n/', $conf);
        $inWidgetEditorSection = false;
        $customMode = false;
        if (isset($_POST['config_mode'])) {
            $modeValue = json_decode($_POST['config_mode'], true);
            $customMode = is_string($modeValue) && strtolower($modeValue) === 'custom';
        }
        foreach ($rows as $index => $row) {
            if (strpos($row, '// [widget-editor-start]') !== false) {
                $inWidgetEditorSection = true;
            }
            $isConfigLine = substr($row, 0, 6) === 'config' || substr($row, 0, 8) === '//config';
            if ($isConfigLine && substr($row, 0, 17) !== "config['garbage']") {
                // In Custom mode the settings menu is authoritative: drop
                // leftover widget-section config overrides as well.
                if (!$inWidgetEditorSection || $customMode) {
                    unset($rows[$index]);
                }
            }
            if (strpos($row, '// [widget-editor-end]') !== false) {
                $inWidgetEditorSection = false;
            }
        }
    }
}

$newConfig = "var config = {}\n";
foreach ($_POST as $name => $serializedValue) {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        dashticz_json_error(400, 'Invalid setting name.');
    }

    $value = json_decode($serializedValue, true);
    if (json_last_error() !== JSON_ERROR_NONE || is_array($value) || is_object($value)) {
        dashticz_json_error(400, 'Invalid value for setting ' . $name . '.');
    }

    $newConfig .= 'config[' . json_encode($name) . '] = ' .
        json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ";\n";
}

$newContents = $before . $newConfig . implode("\n", $rows);

if (!file_exists($configPath) && !is_writable($customDir)) {
    dashticz_json_error(500, 'The directory "custom/" is not writable by the web server' .
        dashticz_owner_info($customDir) .
        '. From the Dashticz directory, run: sh tools/install-dashticz-write-access');
}

if (file_exists($configPath) && !is_writable($configPath)) {
    // Succeeds when PHP is the file owner (e.g. when running as root during setup).
    @chmod($configPath, 0664);
    if (!is_writable($configPath)) {
        dashticz_json_error(500, $cfgFile . ' is not writable' .
            dashticz_owner_info($configPath) .
            '. From the Dashticz directory, run: sh tools/install-dashticz-write-access');
    }
}

if (file_put_contents($configPath, $newContents, LOCK_EX) === false) {
    dashticz_json_error(500, 'Unable to write ' . $cfgFile . '.');
}
@chmod($configPath, 0664);

header('Content-Type: application/json');
echo json_encode(array('success' => true));
