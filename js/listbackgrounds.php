<?php
/**
 * List bundled background images under img/ for the Settings background pickers.
 * Read-only: same-origin only (no CSRF) so the settings UI can populate the select.
 * Returns img/bg*.{jpg,png,...} entries shown as BG_* labels in the UI.
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
        // Only expose simple image files from img/ (no path traversal).
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

natcasesort($images);
$images = array_values($images);

header('Content-Type: application/json');
echo json_encode(['success' => true, 'images' => $images]);
