<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    dashticz_json_error(405, 'Only GET requests are allowed.');
}

$customDir = __DIR__ . '/../custom';
$configPath = $customDir . '/CONFIG.js';
$writable = false;
$message = '';

clearstatcache(true, $configPath);

if (file_exists($configPath)) {
    if (!is_file($configPath) || is_link($configPath)) {
        $message = 'custom/CONFIG.js is not a regular file and cannot be used for setup.';
    } elseif (!is_writable($configPath)) {
        $message = 'custom/CONFIG.js is not writable by the web server. Correct the file owner or write permissions before continuing.';
    } else {
        $writable = true;
    }
} elseif (!is_dir($customDir) || !is_writable($customDir)) {
    $message = 'custom/CONFIG.js does not exist and the custom directory is not writable by the web server. Correct the permissions before continuing.';
} else {
    $writable = true;
}

header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(array(
    'writable' => $writable,
    'message' => $message,
));
