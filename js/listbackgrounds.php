<?php
/**
 * List bundled and user background images for the Settings background pickers.
 * Read-only: same-origin only (no CSRF) so the settings UI can populate the select.
 * Returns bundled img/bg* files and images placed directly in img/custom/.
 */
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    dashticz_json_error(405, 'Only GET requests are allowed.');
}

$imgDir = realpath(__DIR__ . '/../img');
if ($imgDir === false || !is_dir($imgDir)) {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'images' => []]);
    exit;
}

$images = [];
$entries = @scandir($imgDir);
if (is_array($entries)) {
    foreach ($entries as $entry) {
        // Bundled backgrounds must keep their existing bg* naming convention.
        if (!preg_match('/^(bg[\w.-]*\.(?:jpe?g|png|webp|gif))$/i', $entry)) {
            continue;
        }
        $full = $imgDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($full)) {
            continue;
        }
        $images[] = 'img/' . $entry;
    }
}

$customDir = $imgDir . DIRECTORY_SEPARATOR . 'custom';
$customEntries = @scandir($customDir);
if (is_array($customEntries)) {
    foreach ($customEntries as $entry) {
        // Only expose direct, simply named image files; never accept a path.
        if (!preg_match('/^([a-z0-9][a-z0-9._ -]*\.(?:jpe?g|png|webp|gif))$/i', $entry)) {
            continue;
        }
        $full = $customDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($full) || is_link($full)) {
            continue;
        }
        $images[] = 'img/custom/' . $entry;
    }
}

natcasesort($images);
$images = array_values($images);

header('Content-Type: application/json');
echo json_encode(['success' => true, 'images' => $images]);
