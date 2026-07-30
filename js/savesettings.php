<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

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
$submittedSettings = [];
foreach ($_POST as $name => $serializedValue) {
    if (!preg_match('/^[A-Za-z0-9_]+$/', $name)) {
        dashticz_json_error(400, 'Invalid setting name.');
    }

    $value = json_decode($serializedValue, true);
    if (json_last_error() !== JSON_ERROR_NONE || is_array($value) || is_object($value)) {
        dashticz_json_error(400, 'Invalid value for setting ' . $name . '.');
    }

    $submittedSettings[$name] = $value;
}

list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}
if (strpos($config, 'var config = {}') === false) {
    dashticz_json_error(409, $cfgFile . ' does not contain the expected config marker.');
}
$config = configwriter_upsert_root_config_settings(
    $config,
    $submittedSettings,
    false
);
$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(array('success' => true));
