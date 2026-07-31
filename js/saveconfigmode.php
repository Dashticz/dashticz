<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$rawBody = file_get_contents('php://input');
$data = $rawBody !== false ? json_decode($rawBody, true) : null;
if (json_last_error() !== JSON_ERROR_NONE
    || !is_array($data)
    || !isset($data['config_mode'])
    || !is_string($data['config_mode'])
) {
    dashticz_json_error(400, 'Invalid config_mode.');
}

$mode = strtolower(trim($data['config_mode']));
if ($mode !== 'custom' && $mode !== 'wizard') {
    dashticz_json_error(400, 'config_mode must be custom or wizard.');
}

$customDir = __DIR__ . '/../custom';
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$config = configwriter_set_config_mode($config, $mode);
if ($config === null) {
    dashticz_json_error(409, 'CONFIG.js does not contain the expected config marker.');
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'config_mode' => $mode]);
