<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

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

$vars = isset($data['vars']) ? $data['vars'] : [];
if (!is_array($vars)) {
    dashticz_json_error(400, 'vars must be an object.');
}

// Validate CSS variable names and values.
$allowed = [
    '--main-bg', '--home-bg',
    '--border-color-inactive', '--border-color-active', '--border-color-block',
    '--button-bg', '--button-hover', '--button-active',
    '--text-light', '--text-normal', '--text-inactive',
    '--selector-bg', '--blocktitle',
    '--text-title', '--text-status',
    '--font-small', '--font-large',
];

$sanitized = [];
foreach ($vars as $name => $value) {
    if (!in_array($name, $allowed, true)) {
        dashticz_json_error(400, 'Unknown CSS variable: ' . $name);
    }
    // Accept empty string (meaning "remove override"), or a safe CSS value.
    $value = trim((string)$value);
    if ($value !== '' && !preg_match('/^[a-zA-Z0-9#(). ,%\/_\-]+$/', $value)) {
        dashticz_json_error(400, 'Invalid CSS value for ' . $name);
    }
    if ($value !== '') {
        $sanitized[$name] = $value;
    }
}

$customDir = __DIR__ . '/../custom';
$cssPath   = $customDir . '/custom.css';

// Read existing custom.css (create empty if absent).
$existing = '';
if (file_exists($cssPath)) {
    $existing = file_get_contents($cssPath);
    if ($existing === false) {
        dashticz_json_error(500, 'Could not read custom.css.');
    }
}

// Remove any previously injected :root{} block written by this tool.
$marker = '/* dashticz-theme-vars */';
$markerEnd = '/* /dashticz-theme-vars */';
$startPos = strpos($existing, $marker);
$endPos   = strpos($existing, $markerEnd);
if ($startPos !== false && $endPos !== false && $endPos > $startPos) {
    $existing = substr($existing, 0, $startPos)
               . substr($existing, $endPos + strlen($markerEnd));
    $existing = ltrim($existing, "\n");
}

// Build new :root block if there are overrides.
$newBlock = '';
if (!empty($sanitized)) {
    $lines = [];
    foreach ($sanitized as $name => $value) {
        $lines[] = '  ' . $name . ': ' . $value . ';';
    }
    $newBlock = $marker . "\n:root {\n" . implode("\n", $lines) . "\n}\n" . $markerEnd . "\n";
}

$output = $newBlock . $existing;

if (file_put_contents($cssPath, $output) === false) {
    dashticz_json_error(500, 'Could not write custom.css.');
}

header('Content-Type: application/json');
echo json_encode(['success' => true]);
