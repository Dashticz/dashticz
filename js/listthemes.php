<?php
/**
 * List valid theme directories for the Settings theme selector.
 * A theme is available only when themes/<name>/<name>.css exists.
 */
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    dashticz_json_error(405, 'Only GET requests are allowed.');
}

$themesDir = realpath(__DIR__ . '/../themes');
if ($themesDir === false || !is_dir($themesDir)) {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'themes' => []]);
    exit;
}

$themes = [];
$entries = @scandir($themesDir);
if (is_array($entries)) {
    foreach ($entries as $entry) {
        if (!preg_match('/^[a-z0-9][a-z0-9_-]*$/i', $entry)) {
            continue;
        }
        $themeDir = $themesDir . DIRECTORY_SEPARATOR . $entry;
        $themeCss = $themeDir . DIRECTORY_SEPARATOR . $entry . '.css';
        if (!is_dir($themeDir) || is_link($themeDir)) {
            continue;
        }
        if (!is_file($themeCss) || is_link($themeCss)) {
            continue;
        }
        $themes[] = $entry;
    }
}

natcasesort($themes);

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'themes' => array_values($themes),
]);
