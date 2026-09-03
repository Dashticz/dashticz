<?php
/**
 * Maps a station's m3u tvg-id to a locally stored logo file placed in
 * img/custom/radio/, so the StreamPlayer widget can prefer a local image
 * over a playlist's own remote tvg-logo URL.
 *
 * Returns a flat JSON object: {"<tvg-id>": "<filename>", ...}, matching
 * js/components/streamplayer.js's loadLocalLogos() expectations.
 */
require_once(__DIR__ . '/security.php');

dashticz_require_same_origin();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'GET') {
    dashticz_json_error(405, 'Only GET requests are allowed.');
}

$logoDir = realpath(__DIR__ . '/../../img/custom/radio');
if ($logoDir === false || !is_dir($logoDir)) {
    header('Content-Type: application/json');
    echo json_encode(new stdClass());
    exit;
}

$logos = array();
$entries = @scandir($logoDir);
if (is_array($entries)) {
    foreach ($entries as $entry) {
        if (!preg_match('/^[a-z0-9][a-z0-9._-]*\.(?:jpe?g|png|webp|gif)$/i', $entry)) {
            continue;
        }
        $full = $logoDir . DIRECTORY_SEPARATOR . $entry;
        if (!is_file($full) || is_link($full)) {
            continue;
        }
        $tvgId = strtolower(pathinfo($entry, PATHINFO_FILENAME));
        $logos[$tvgId] = $entry;
    }
}

header('Content-Type: application/json');
echo json_encode(empty($logos) ? new stdClass() : $logos);
