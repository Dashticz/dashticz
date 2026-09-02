<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

// This endpoint manages isolated editor-owned sections in custom.css. Any CSS
// outside these markers remains untouched, including hand-written rules.
dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    dashticz_json_error(400, 'Invalid JSON body.');
}

$updateVars = array_key_exists('vars', $data);
$vars = $updateVars ? $data['vars'] : [];
if ($updateVars && !is_array($vars)) {
    dashticz_json_error(400, 'vars must be an object.');
}
$allowed = [
    '--main-bg', '--home-bg',
    '--border-color-inactive', '--border-color-active', '--border-color-block',
    '--button-bg', '--button-hover', '--button-active',
    '--text-light', '--text-normal', '--text-inactive',
    '--selector-bg', '--blocktitle',
    '--text-title', '--text-status',
    '--font-small', '--font-large', '--font-device-title', '--font-update',
    '--icon-font-size', '--icon-image-size', '--icon-column-width',
];

$sanitized = [];
foreach ($vars as $name => $value) {
    if (!in_array($name, $allowed, true)) {
        dashticz_json_error(400, 'Unknown CSS variable: ' . $name);
    }
    $value = trim((string)$value);
    if ($value !== '' && !preg_match('/^[a-zA-Z0-9#(). ,%\/_\-]+$/', $value)) {
        dashticz_json_error(400, 'Invalid CSS value for ' . $name);
    }
    if ($value !== '') {
        $sanitized[$name] = $value;
    }
}

$customDir = __DIR__ . '/../custom';
$cssPath = $customDir . '/custom.css';
if (!is_dir($customDir) && !mkdir($customDir, 0775, true)) {
    dashticz_json_error(500, 'Could not create custom directory.');
}
$cssLock = dashticz_acquire_file_update_lock($cssPath);
if ($cssLock === false) {
    dashticz_json_error(500, 'Could not lock custom.css for an editor update.');
}
$existing = '';
if (file_exists($cssPath)) {
    $existing = file_get_contents($cssPath);
    if ($existing === false) {
        dashticz_json_error(500, 'Could not read custom.css.');
    }
}

// Replace only the editor-owned theme-variable section when `vars` is posted.
// All hand-written custom.css content remains untouched.
$marker = '/* dashticz-theme-vars */';
$markerEnd = '/* /dashticz-theme-vars */';
$themePattern = '/' . preg_quote($marker, '/') . '.*?' . preg_quote($markerEnd, '/') . '\s*/s';
$themeBlock = '';
if ($updateVars) {
    $existing = preg_replace($themePattern, '', $existing);
}

if ($updateVars && !empty($sanitized)) {
    $lines = [];
    foreach ($sanitized as $name => $value) {
        $lines[] = '  ' . $name . ': ' . $value . ';';
    }
    $themeBlock = $marker . "\n:root {\n" . implode("\n", $lines) . "\n}\n" . $markerEnd . "\n\n";
}

$output = $themeBlock . ltrim($existing, "\r\n");
if (!dashticz_atomic_write_file($cssPath, $output)) {
    dashticz_release_file_update_lock($cssLock);
    dashticz_json_error(500, 'Could not write custom.css.');
}
dashticz_release_file_update_lock($cssLock);

header('Content-Type: application/json');
echo json_encode(['success' => true]);
