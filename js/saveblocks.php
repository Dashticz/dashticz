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
    if (is_array($entry)
        && isset($entry['kind'])
        && in_array($entry['kind'], ['dummy', 'title'], true)
    ) {
        /* Dummy/title entries are managed by the Device Editor but are not
         Domoticz devices. Keep their explicit block type and safe key. */
        $kind = $entry['kind'];
        $keyPattern = $kind === 'dummy'
            ? '/^dummyblock_\d+$/'
            : '/^Title_\d+$/';
        if (!isset($entry['key'])
            || !is_string($entry['key'])
            || !preg_match($keyPattern, $entry['key'])
        ) {
            dashticz_json_error(400, 'Invalid special block key.');
        }
        $title = isset($entry['title']) && is_string($entry['title'])
            ? substr(trim($entry['title']), 0, 100)
            : '';
        if ($title === '') {
            dashticz_json_error(400, 'A special block title is required.');
        }
        $width = isset($entry['width']) ? (int)$entry['width'] : ($kind === 'title' ? 12 : 3);
        $width = max(1, min(12, $width));
        $height = $kind === 'title' ? 120 : null;
        if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
            $height = max(50, min(2000, (int)(round((int)$entry['height'] / 10) * 10)));
        }
        $idx = null;
        if ($kind === 'dummy') {
            if (!isset($entry['idx']) || !is_int($entry['idx']) || $entry['idx'] < 1) {
                dashticz_json_error(400, 'A dummy block requires a positive integer idx.');
            }
            $idx = $entry['idx'];
        }
        $devices[] = [
            'kind' => $kind,
            'idx' => $idx,
            'isGroup' => false,
            'subidx' => 0,
            'name' => $title,
            'width' => $width,
            'height' => $height,
            'key' => $entry['key'],
        ];
    } elseif (is_int($entry) && $entry > 0) {
        $devices[] = [
            'idx' => $entry,
            'isGroup' => false,
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
        $title = isset($entry['title']) && is_string($entry['title'])
            ? substr(trim($entry['title']), 0, 100) : '';
        $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
            ? substr($entry['icon'], 0, 100) : null;
        $devices[] = [
            'idx' => $entry['idx'],
            'isGroup' => false,
            'subidx' => $subidx,
            'name' => $name,
            'width' => $width,
            'height' => $height,
            'title' => $title,
            'icon' => $icon,
            'hide_data' => !empty($entry['hide_data']),
            'last_update' => !empty($entry['last_update']),
            'switch' => !empty($entry['switch']),
            'key' => isset($entry['key'])
                && is_string($entry['key'])
                && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $entry['key'])
                    ? $entry['key']
                    : null,
        ];
    } elseif (is_array($entry)
        && isset($entry['idx'])
        && is_string($entry['idx'])
        && preg_match('/^s\d+$/', $entry['idx'])
    ) {
        /* Domoticz group/scene — the idx is the scene key e.g. 's1' */
        $groupKey = $entry['idx'];
        $name = (isset($entry['name']) && is_string($entry['name']))
            ? substr(trim($entry['name']), 0, 100)
            : $groupKey;
        if ($name === '') {
            $name = $groupKey;
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
        $title = isset($entry['title']) && is_string($entry['title'])
            ? substr(trim($entry['title']), 0, 100) : '';
        $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
            ? substr($entry['icon'], 0, 100) : null;
        $devices[] = [
            'idx' => $groupKey,
            'isGroup' => true,
            'subidx' => 0,
            'name' => $name,
            'width' => $width,
            'height' => $height,
            'title' => $title,
            'icon' => $icon,
            'hide_data' => !empty($entry['hide_data']),
            'last_update' => !empty($entry['last_update']),
            'switch' => !empty($entry['switch']),
            'key' => $groupKey,  /* block key IS the group reference */
        ];
    } else {
        dashticz_json_error(400, 'Each device entry must be a positive integer or an object with an integer idx.');
    }
}

$customDir = __DIR__ . '/../custom';
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
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
    $keyCollisionConfig = $config;
    if ($blocksOnly) {
        /* The active screen's editor sections are replaced by savegridlayout.php
         * immediately after this request. Ignore their keys for collision
         * detection so device_1498 is reused instead of becoming device_1498_2.
         * Hand-written blocks outside these sections still reserve their keys. */
        $keyCollisionConfig = configwriter_remove_editor_sections(
            $keyCollisionConfig,
            $screenNumber
        );
        list($gridStartMarker, $gridEndMarker) = configwriter_editor_markers(
            'grid-layout',
            $screenNumber
        );
        $keyCollisionConfig = configwriter_remove_section(
            $keyCollisionConfig,
            $gridStartMarker,
            $gridEndMarker
        );
        if ($screenNumber === 0) {
            $keyCollisionConfig = configwriter_remove_section(
                $keyCollisionConfig,
                '// [standby-editor-start]',
                '// [standby-editor-end]'
            );
        }
    }
    $usedKeys = array_keys(
        configwriter_extract_declared_block_refs($keyCollisionConfig)
    );
    $requestKeys = [];
    foreach ($devices as &$device) {
        if (isset($device['kind']) && in_array($device['kind'], ['dummy', 'title'], true)) {
            /* The browser generates stable numbered keys for special blocks. */
            if (isset($requestKeys[$device['key']])) {
                dashticz_json_error(409, 'Special block key already exists.');
            }
            /* Reuse an equivalent hand-written CONFIG.js block without
             * overwriting or duplicating its additional custom properties. */
            $device['preserveExisting'] = in_array($device['key'], $usedKeys, true);
            $requestKeys[$device['key']] = true;
        } elseif (!empty($device['isGroup'])) {
            /* group/scene: the key is fixed to the group reference (e.g. 's1') */
            $requestKeys[$device['key']] = true;
        } elseif ($device['key'] !== null && !isset($requestKeys[$device['key']])) {
            $requestKeys[$device['key']] = true;
        } else {
            /* Domoticz names are mutable (for example event devices). Use the
             * immutable IDX for editor-generated keys so references stay clear
             * and predictable when a device is renamed. */
            $device['key'] = configwriter_make_device_block_key(
                $device['idx'],
                $device['subidx'],
                $usedKeys
            );
            $requestKeys[$device['key']] = true;
        }
        $blockKeys[] = $device['key'];
    }
    unset($device);

    $section = configwriter_section_header('BLOCKS') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";
    foreach ($devices as $device) {
        if (!empty($device['preserveExisting'])) {
            continue;
        }
        $section .= configwriter_emit_block_line(
            $device['key'],
            isset($device['kind'])
                ? configwriter_special_block_props($device)
                : configwriter_device_block_props($device)
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
