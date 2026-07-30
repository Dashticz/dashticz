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
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || !array_key_exists('devices', $data)) {
    dashticz_json_error(400, 'Invalid request body.');
}

if (!is_array($data['devices'])) {
    dashticz_json_error(400, 'Invalid devices list.');
}

$devices = [];
foreach ($data['devices'] as $entry) {
    if (is_int($entry) && $entry > 0) {
        $devices[] = [
            'idx' => $entry,
            'subidx' => 0,
            'name' => 'Device ' . $entry,
            'width' => 3,
            'height' => null,
            'key' => null,
        ];
    } elseif (is_array($entry)
        && isset($entry['idx']) && is_int($entry['idx']) && $entry['idx'] > 0
    ) {
        $name = (isset($entry['name']) && is_string($entry['name']))
            ? substr(trim($entry['name']), 0, 100)
            : 'Device ' . $entry['idx'];
        if ($name === '') {
            $name = 'Device ' . $entry['idx'];
        }
        $width = 3;
        if (isset($entry['width'])) {
            $width = (int)$entry['width'];
        }
        if ($width < 1) {
            $width = 1;
        } elseif ($width > 12) {
            $width = 12;
        }
        $subidx = 0;
        if (isset($entry['subidx'])) {
            $subidx = (int)$entry['subidx'];
            if ($subidx < 0) {
                $subidx = 0;
            }
        }
        $height = null;
        if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
            $height = (int)$entry['height'];
            $height = (int)(round($height / 10) * 10);
            if ($height < 50) {
                $height = 50;
            } elseif ($height > 2000) {
                $height = 2000;
            }
        }
        $devices[] = [
            'idx' => $entry['idx'],
            'subidx' => $subidx,
            'name' => $name,
            'width' => $width,
            'height' => $height,
            'key' => isset($entry['key'])
                && is_string($entry['key'])
                && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $entry['key'])
                    ? $entry['key']
                    : null,
        ];
    } else {
        dashticz_json_error(400, 'Each device entry must be a positive integer or an object with an integer idx.');
    }
}

$customDir = __DIR__ . '/../custom';
$configPath = $customDir . '/CONFIG.js';
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$screenNumber = configwriter_parse_screen_number($data, 1);
list($startMarker, $endMarker) = configwriter_editor_markers('device', $screenNumber);
$config = configwriter_remove_section($config, $startMarker, $endMarker);
$config = rtrim($config);

$blockKeys = [];
$blocksOnly = !empty($data['blocksOnly']);
if (!empty($devices)) {
    $usedKeys = array_keys(configwriter_extract_declared_block_refs($config));
    $requestKeys = [];
    foreach ($devices as &$device) {
        if ($device['key'] !== null && !isset($requestKeys[$device['key']])) {
            $requestKeys[$device['key']] = true;
        } else {
            $device['key'] = configwriter_make_block_key($device['name'], $usedKeys);
            $requestKeys[$device['key']] = true;
        }
        $blockKeys[] = $device['key'];
    }
    unset($device);

    $section = configwriter_section_header('BLOCKS') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";
    foreach ($devices as $device) {
        $section .= configwriter_emit_block_line(
            $device['key'],
            configwriter_device_block_props($device)
        );
    }

    if (!$blocksOnly) {
        $section .= "\n" . configwriter_section_header('COLUMNS') . "\n";
        $section .= "if (typeof columns === 'undefined') var columns = {}\n";
        $layoutItems = array_map(function ($device) {
            $item = [
                'ref' => $device['key'],
                'width' => $device['width'],
            ];
            if (isset($device['height']) && is_int($device['height'])) {
                $item['height'] = $device['height'];
            }
            return $item;
        }, $devices);
        $columnKeys = [];
        $prefix = configwriter_column_prefix('de', $screenNumber);
        foreach (configwriter_pack_columns_by_height($layoutItems, 12, $prefix) as $column) {
            $columnKeys[] = $column['key'];
            $section .= configwriter_emit_column_line(
                $column['key'],
                $column['blocks'],
                $column['width']
            );
        }

        if ($screenNumber > 0) {
            $section .= "\n" . configwriter_section_header('SCREENS') . "\n";
            $section .= configwriter_emit_screen_columns($screenNumber, $columnKeys, 'merge');
        }
    }

    $wrapped = configwriter_wrap_section($startMarker, $endMarker, $section);

    list($widgetStartMarker) = configwriter_editor_markers('widget', $screenNumber);
    $widgetStartPos = strpos($config, $widgetStartMarker);
    if ($widgetStartPos !== false) {
        $beforeWidgets = rtrim(substr($config, 0, $widgetStartPos));
        $widgetSection = ltrim(substr($config, $widgetStartPos));
        $config = $beforeWidgets . $wrapped . "\n\n" . $widgetSection;
    } else {
        $config .= $wrapped;
    }
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'blockKeys' => $blockKeys,
]);
