<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$configPath = __DIR__ . '/../custom/CONFIG.js';
$config = @file_get_contents($configPath);
if ($config === false) {
    dashticz_json_error(500, 'Unable to read CONFIG.js.');
}

$marker = 'var config = {}';
$markerPosition = strpos($config, $marker);
if ($markerPosition === false) {
    dashticz_json_error(409, 'CONFIG.js does not contain the expected config marker.');
}

$before = substr($config, 0, $markerPosition);
$conf = substr($config, $markerPosition + strlen($marker));
$rows = preg_split('/\r\n|\r|\n/', $conf);
foreach ($rows as $index => $row) {
    if (substr($row, 0, 17) !== "config['garbage']") {
        if (substr($row, 0, 6) === 'config' || substr($row, 0, 8) === '//config') {
            unset($rows[$index]);
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
if (file_put_contents($configPath, $newContents, LOCK_EX) === false) {
    dashticz_json_error(500, 'Unable to write CONFIG.js.');
}

header('Content-Type: application/json');
echo json_encode(array('success' => true));
