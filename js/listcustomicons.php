<?php
/**
 * List user images that can be selected as a block image.
 *
 * Only direct, regular image files from img/custom are returned. Backgrounds
 * use the reserved BG_ prefix and deliberately stay out of this picker.
 */
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    dashticz_json_error(405, 'Only GET requests are allowed.');
}

$customDir = realpath(__DIR__ . '/../img/custom');
if ($customDir === false || !is_dir($customDir)) {
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'images' => []]);
    exit;
}

$images = [];
$entries = @scandir($customDir);
if (is_array($entries)) {
    foreach ($entries as $entry) {
        if (preg_match('/^bg_/i', $entry)) {
            continue;
        }
        if (!preg_match('/^[a-z0-9][a-z0-9._ -]*\.(?:jpe?g|png|webp|gif)$/i', $entry)) {
            continue;
        }
        $full = $customDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($full) || is_link($full)) {
            continue;
        }
        // blocks.js prefixes image values with img/, so CONFIG.js needs the
        // path relative to that directory rather than img/custom/... itself.
        $images[] = 'custom/' . $entry;
    }
}

natcasesort($images);
$images = array_values($images);

header('Content-Type: application/json');
echo json_encode(['success' => true, 'images' => $images]);
