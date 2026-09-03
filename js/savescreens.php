<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false) {
    dashticz_json_error(400, 'Unable to read request body.');
}

$data = json_decode($rawBody, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    dashticz_json_error(400, 'Invalid request body.');
}

$action = isset($data['action']) && is_string($data['action'])
    ? strtolower(trim($data['action']))
    : '';
if ($action !== 'add' && $action !== 'delete') {
    dashticz_json_error(400, 'Unsupported screens action.');
}

$screenNumber = configwriter_parse_screen_number($data, 0);
if ($screenNumber < 2) {
    dashticz_json_error(400, 'Only extra screens (2+) can be added this way. Screen 1 is always present.');
}

$customDir = __DIR__ . '/../custom';
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

if ($action === 'delete') {
    $numberedScreens = configwriter_extract_numbered_screens($config);
    if (count($numberedScreens) <= 1
        || !in_array($screenNumber, $numberedScreens, true)
    ) {
        dashticz_json_error(400, 'The selected extra screen cannot be deleted.');
    }
    $config = configwriter_remove_numbered_screen_and_compact(
        $config,
        $screenNumber
    );
    $writeError = configwriter_write_config($configPath, $customDir, $config);
    if ($writeError !== null) {
        dashticz_json_error(500, $writeError);
    }

    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'deletedScreen' => $screenNumber,
        'screens' => range(1, count($numberedScreens) - 1),
    ]);
    exit;
}

// Prefer the configured dashboard background when creating a new screen.
$background = '';
if (preg_match(
    '/config\[[\'"]background_image[\'"]\]\s*=\s*[\'"]([^\'"]*)[\'"]\s*;/',
    $config,
    $match
)) {
    $background = $match[1];
}

$config = configwriter_replace_screens_section($config, $screenNumber, $background);
$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'screen' => $screenNumber,
]);
