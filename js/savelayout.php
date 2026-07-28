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
if (json_last_error() !== JSON_ERROR_NONE
    || !is_array($data)
    || !isset($data['items'])
    || !is_array($data['items'])
) {
    dashticz_json_error(400, 'Invalid layout items.');
}

$customDir = __DIR__ . '/../custom';
$configPath = $customDir . '/CONFIG.js';
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$blockLines = configwriter_extract_block_lines($config);
$widgetSettings = configwriter_extract_section_config_settings(
    $config,
    '// [widget-editor-start]',
    '// [widget-editor-end]'
);
$standbySection = configwriter_extract_wrapped_section(
    $config,
    '// [standby-editor-start]',
    '// [standby-editor-end]'
);

$items = [];
foreach ($data['items'] as $entry) {
    if (!is_array($entry)
        || !isset($entry['ref'])
        || !is_string($entry['ref'])
        || !preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $entry['ref'])
    ) {
        dashticz_json_error(400, 'Each layout item requires a safe block reference.');
    }
    $width = isset($entry['width']) ? (int)$entry['width'] : 1;
    $item = [
        'ref' => $entry['ref'],
        'width' => max(1, min(12, $width)),
    ];

    // Prefer explicit height from the layout editor; fall back to CONFIG.js.
    if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
        $item['height'] = (int)$entry['height'];
    } elseif (isset($blockLines[$entry['ref']])) {
        $fromBlock = configwriter_height_from_block_props($blockLines[$entry['ref']]);
        if ($fromBlock !== null) {
            $item['height'] = $fromBlock;
        }
    }

    $items[] = $item;
}

/*
 * Every visual editor finishes with this endpoint. Consolidate the temporary
 * device/widget sections and any older layout section into one readable
 * generated area: all blocks, then columns, then screens. Widget settings are
 * moved into the regular config group above it.
 */
$startMarker = '// [dashboard-editor-start]';
$endMarker = '// [dashboard-editor-end]';
$config = configwriter_remove_editor_sections($config);
$config = configwriter_remove_section(
    $config,
    '// [standby-editor-start]',
    '// [standby-editor-end]'
);
$config = configwriter_upsert_root_config_settings(
    $config,
    $widgetSettings,
    true
);
$config = rtrim($config);

if (!empty($items)) {
    list($section, $columnKeys) = configwriter_build_layout_section(
        $blockLines,
        $items,
        1,
        12
    );

    $config .= configwriter_wrap_section($startMarker, $endMarker, $section);
}
if ($standbySection !== '') {
    $config = rtrim($config) . "\n\n" . $standbySection;
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'columns' => $columnKeys ?? []]);
