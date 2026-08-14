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
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$screenNumber = configwriter_parse_screen_number($data, 1);
$blockLines = configwriter_extract_block_lines($config);
list($widgetStartMarker, $widgetEndMarker) = configwriter_editor_markers(
    'widget',
    $screenNumber
);
$widgetSettings = configwriter_extract_section_config_settings(
    $config,
    $widgetStartMarker,
    $widgetEndMarker
);
if (empty($widgetSettings) && $screenNumber !== 1) {
    list($widgetStartMarker1, $widgetEndMarker1) = configwriter_editor_markers(
        'widget',
        1
    );
    $widgetSettings = configwriter_extract_section_config_settings(
        $config,
        $widgetStartMarker1,
        $widgetEndMarker1
    );
}
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
 * device/widget sections for the active screen into one readable generated
 * area. Standby (screen 0) writes columns_standby instead of screens[].
 * Widget settings are global, so retain them in the root config for every
 * screen before removing the active screen's temporary widget section.
 */
$config = configwriter_upsert_root_config_settings(
    $config,
    $widgetSettings,
    true
);

if ($screenNumber === 0) {
    // $blockLines was extracted at request start, after saveblocks/savewidgets
    // already wrote the new block definitions into temporary editor sections.
    $config = configwriter_remove_editor_sections($config, 0);
    $config = configwriter_remove_section(
        $config,
        '// [standby-editor-start]',
        '// [standby-editor-end]'
    );
    $config = rtrim($config);

    $startMarker = '// [standby-editor-start]';
    $endMarker = '// [standby-editor-end]';
    if (!empty($items)) {
        $section = configwriter_build_standby_layout_section($blockLines, $items, 12);
    } else {
        $section = configwriter_emit_columns_standby([], 12);
    }
    $config .= configwriter_wrap_section($startMarker, $endMarker, $section);

    $writeError = configwriter_write_config($configPath, $customDir, $config);
    if ($writeError !== null) {
        dashticz_json_error(500, $writeError);
    }

    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'screen' => 'standby']);
    exit;
}

list($startMarker, $endMarker) = configwriter_editor_markers(
    'dashboard',
    $screenNumber
);
$config = configwriter_remove_editor_sections($config, $screenNumber);
if ($screenNumber === 1) {
    $config = configwriter_remove_section(
        $config,
        '// [standby-editor-start]',
        '// [standby-editor-end]'
    );
}
$config = rtrim($config);

if (!empty($items)) {
    list($section, $columnKeys) = configwriter_build_layout_section(
        $blockLines,
        $items,
        $screenNumber,
        12
    );

    $config .= configwriter_wrap_section($startMarker, $endMarker, $section);
}
if ($screenNumber === 1 && $standbySection !== '') {
    $config = rtrim($config) . "\n\n" . $standbySection;
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'columns' => $columnKeys ?? []]);
