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
$configPath = $customDir . '/CONFIG.js';
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$line = 'config["config_mode"] = ' . json_encode($mode) . ';';
if (preg_match('/config\[[\'"]config_mode[\'"]\]\s*=\s*[^;]+;/', $config)) {
    $config = preg_replace(
        '/config\[[\'"]config_mode[\'"]\]\s*=\s*[^;]+;/',
        $line,
        $config,
        1
    );
} else {
    $marker = 'var config = {}';
    $pos = strpos($config, $marker);
    if ($pos === false) {
        dashticz_json_error(409, 'CONFIG.js does not contain the expected config marker.');
    }
    $insertAt = $pos + strlen($marker);
    $config = substr($config, 0, $insertAt) . "\n" . $line . substr($config, $insertAt);
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'config_mode' => $mode]);
