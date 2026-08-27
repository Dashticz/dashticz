<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

function _validate_custom_device_value($value, $depth = 0)
{
    if ($depth > 4) {
        return false;
    }
    if (is_string($value)) {
        return strlen($value) <= 4096;
    }
    if (is_int($value) || is_float($value) || is_bool($value) || $value === null) {
        return true;
    }
    if (is_object($value)) {
        $value = get_object_vars($value);
    }
    if (!is_array($value) || count($value) > 100) {
        return false;
    }
    foreach ($value as $nestedKey => $nestedValue) {
        if (is_string($nestedKey)
            && (strlen($nestedKey) > 100 || preg_match('/[\x00-\x1F]/', $nestedKey))
        ) {
            return false;
        }
        if (!_validate_custom_device_value($nestedValue, $depth + 1)) {
            return false;
        }
    }
    return true;
}

/** The Device Editor's Dial checkbox is the only supported way to set a
 * block's type; 'type' itself stays a reserved/rejected custom field. */
function _dashticz_editor_block_type($entry)
{
    return (is_array($entry) && isset($entry['type']) && $entry['type'] === 'dial')
        ? 'dial'
        : null;
}

function _normalise_custom_device_fields($entry)
{
    if (!is_array($entry) || !isset($entry['custom_fields'])) {
        return [];
    }
    if (!is_array($entry['custom_fields']) || count($entry['custom_fields']) > 50) {
        dashticz_json_error(400, 'custom_fields must contain at most 50 fields.');
    }
    $protectedFields = [
        'type', 'id', 'key', 'kind', 'width', 'height', 'grid', 'idx', 'subidx',
        'title', 'icon', 'hide_data', 'last_update', 'switch', 'hide_title',
        'text_alignment', 'text_align', 'custom_fields',
        '__proto__', 'prototype', 'constructor',
    ];
    $customFields = [];
    $seen = [];
    foreach ($entry['custom_fields'] as $field => $value) {
        $fieldKey = is_string($field) ? strtolower($field) : '';
        if (!is_string($field)
            || !preg_match('/^[A-Za-z_$][A-Za-z0-9_$]*$/', $field)
            || in_array($fieldKey, $protectedFields, true)
            || stripos($field, '_dashticz') === 0
        ) {
            dashticz_json_error(400, 'Invalid or reserved custom device field.');
        }
        if (isset($seen[$fieldKey])) {
            dashticz_json_error(400, 'Duplicate custom device field.');
        }
        $value = configwriter_restore_editor_value($value);
        if (!_validate_custom_device_value($value)) {
            dashticz_json_error(400, 'Invalid custom device field value.');
        }
        $seen[$fieldKey] = true;
        $customFields[$field] = $value;
    }
    if (strlen(json_encode($customFields)) > 32768) {
        dashticz_json_error(400, 'Custom device fields are too large.');
    }
    return $customFields;
}

/* Special-block kinds recognized by the Device Editor's own quick-add
   popups (js/deviceeditor.js), centralized here instead of repeating the
   list at every call site below - adding another repeatable special
   (see the iframe/calendar/publictransport/timegraph/xmltvguide entries
   for the pattern) then only touches one array per list, and js/
   configwriter.php's matching per-kind $props branch. 'slidebutton' is
   checked separately below (its own key pattern differs from every
   other kind here). */
$specialBlockKinds = ['dummy', 'title', 'custom', 'group', 'html', 'iframe', 'calendar', 'publictransport', 'timegraph', 'xmltvguide', 'lms', 'camera', 'news'];
// Kinds whose title is optional (blank is fine) rather than required.
$titleOptionalBlockKinds = ['custom', 'slidebutton', 'group', 'html', 'iframe', 'calendar', 'publictransport', 'timegraph', 'xmltvguide', 'lms', 'camera', 'news'];

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
    $customFields = _normalise_custom_device_fields($entry);
    if (is_array($entry)
        && isset($entry['kind'])
        && (
            in_array($entry['kind'], $specialBlockKinds, true)
            || $entry['kind'] === 'slidebutton'
        )
    ) {
        /* Helper/custom entries are managed by the Device Editor but are not
         selected from the normal Domoticz device list. Keep their explicit key. */
        $kind = $entry['kind'];
        if ($kind === 'dummy') {
            $keyPattern = '/^dummyblock_\d+$/';
        } elseif ($kind === 'title') {
            // Existing hand-written blocktitle keys remain editable; new
            // separators still use the editor-generated Title_N convention.
            $keyPattern = '/^[A-Za-z_$][A-Za-z0-9_$]*$/';
        } else {
            $keyPattern = '/^[A-Za-z_$][A-Za-z0-9_$]*$/';
        }
        if (!isset($entry['key'])
            || !is_string($entry['key'])
            || !preg_match($keyPattern, $entry['key'])
        ) {
            dashticz_json_error(400, 'Invalid special block key.');
        }
        $title = isset($entry['title']) && is_string($entry['title'])
            ? substr(trim($entry['title']), 0, 100)
            : '';
        if ($title === '' && !in_array($kind, $titleOptionalBlockKinds, true)) {
            dashticz_json_error(400, 'A special block title is required.');
        }
        $defaultWidth = 3;
        if ($kind === 'title' || $kind === 'slidebutton') {
            $defaultWidth = 12;
        } elseif ($kind === 'lms' || $kind === 'iframe' || $kind === 'calendar' || $kind === 'timegraph' || $kind === 'xmltvguide') {
            // Cover (100x100) + artist/title/album (lms), an embedded page
            // (iframe), an agenda/calendar table (calendar), a chart
            // (timegraph), or a programme guide (xmltvguide), needs more
            // room than the generic 3-column default other special blocks
            // start at.
            $defaultWidth = 6;
        }
        $width = isset($entry['width']) ? (int)$entry['width'] : $defaultWidth;
        $width = max(1, min(12, $width));
        $height = $kind === 'title' ? 120 : null;
        if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
            $height = max(50, min(2000, (int)(round((int)$entry['height'] / 10) * 10)));
        }
        $idx = null;
        $icon = null;
        $hideData = false;
        $lastUpdate = false;
        $switch = false;
        $type = null;
        if ($kind === 'dummy' || $kind === 'custom') {
            if (!isset($entry['idx']) || !is_int($entry['idx']) || $entry['idx'] < 1) {
                dashticz_json_error(
                    400,
                    $kind === 'dummy'
                        ? 'A dummy block requires a positive integer idx.'
                        : 'A custom device requires a positive integer idx.'
                );
            }
            $idx = $entry['idx'];
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr($entry['icon'], 0, 100)
                : null;
            $hideData = !empty($entry['hide_data']);
            $lastUpdate = !empty($entry['last_update']);
            $switch = !empty($entry['switch']);
            $type = _dashticz_editor_block_type($entry);
        } elseif ($kind === 'title') {
            // A separator/title bar has no data value or idx, but it can still
            // show a leading icon like any other block.
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr($entry['icon'], 0, 100)
                : null;
        } elseif ($kind === 'group' || $kind === 'html' || $kind === 'iframe' || $kind === 'calendar' || $kind === 'publictransport' || $kind === 'xmltvguide' || $kind === 'camera' || $kind === 'news') {
            // Only Icon and Last update apply to these eight (no Data/Switch/
            // Dial - see js/deviceeditor.js's _quickOptionsHtml()).
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr($entry['icon'], 0, 100)
                : null;
            $lastUpdate = !empty($entry['last_update']);
            if ($kind === 'group') {
                // A Group's idx (the Domoticz group/scene whose devices are
                // grouped) is optional - custom_fields.devices below can list
                // plain device ids instead. When given it must still be a
                // positive integer, same as every other idx in this file.
                if (isset($entry['idx']) && $entry['idx'] !== null && $entry['idx'] !== '') {
                    if (!is_int($entry['idx']) || $entry['idx'] < 1) {
                        dashticz_json_error(400, 'A group idx must be a positive integer.');
                    }
                    $idx = $entry['idx'];
                }
                $hasDevices = isset($customFields['devices'])
                    && is_array($customFields['devices'])
                    && count($customFields['devices']) > 0;
                if ($idx === null && !$hasDevices) {
                    dashticz_json_error(400, 'A group block requires an idx or at least one device.');
                }
            } elseif ($kind === 'html') {
                // htmlfile is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here.
                if (
                    !isset($customFields['htmlfile'])
                    || !is_string($customFields['htmlfile'])
                    || strpos($customFields['htmlfile'], '..') !== false
                    || !preg_match('/^[A-Za-z0-9_\-.\/ ]+\.html?$/i', $customFields['htmlfile'])
                ) {
                    dashticz_json_error(400, 'Enter a valid html filename (relative to custom/).');
                }
            } elseif ($kind === 'iframe') {
                // frameurl is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here -
                // same reasoning as html's htmlfile requirement above.
                if (
                    !isset($customFields['frameurl'])
                    || !is_string($customFields['frameurl'])
                    || trim($customFields['frameurl']) === ''
                    || strlen($customFields['frameurl']) > 2048
                ) {
                    dashticz_json_error(400, 'Enter a valid iFrame URL.');
                }
            } elseif ($kind === 'calendar') {
                // icalurl is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here -
                // same reasoning as html's htmlfile requirement above.
                if (
                    !isset($customFields['icalurl'])
                    || !is_string($customFields['icalurl'])
                    || trim($customFields['icalurl']) === ''
                    || strlen($customFields['icalurl']) > 2048
                ) {
                    dashticz_json_error(400, 'Enter a valid calendar (ICS) URL.');
                }
            } elseif ($kind === 'publictransport') {
                // station/tpc are otherwise just other custom fields (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without at least one of them, so
                // at least one is required here - same reasoning as html's
                // htmlfile requirement above.
                $hasStation = isset($customFields['station'])
                    && is_string($customFields['station'])
                    && trim($customFields['station']) !== '';
                $hasTpc = isset($customFields['tpc'])
                    && is_string($customFields['tpc'])
                    && trim($customFields['tpc']) !== '';
                if (!$hasStation && !$hasTpc) {
                    dashticz_json_error(400, 'Enter a station or a tpc code.');
                }
            } elseif ($kind === 'xmltvguide') {
                // xmltvurl is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here -
                // same reasoning as html's htmlfile requirement above.
                if (
                    !isset($customFields['xmltvurl'])
                    || !is_string($customFields['xmltvurl'])
                    || trim($customFields['xmltvurl']) === ''
                    || strlen($customFields['xmltvurl']) > 2048
                ) {
                    dashticz_json_error(400, 'Enter a valid TV Guide (XMLTV) URL.');
                }
            } elseif ($kind === 'camera') {
                // imageUrl is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here -
                // same reasoning as html's htmlfile requirement above.
                // videoUrl (MJPEG) is optional, same as the Widgets catalog's
                // own singleton camera config.
                if (
                    !isset($customFields['imageUrl'])
                    || !is_string($customFields['imageUrl'])
                    || trim($customFields['imageUrl']) === ''
                    || strlen($customFields['imageUrl']) > 2048
                ) {
                    dashticz_json_error(400, 'Enter a valid camera image URL.');
                }
            } else {
                // feed is otherwise just another custom field (see
                // _normalise_custom_device_fields() above), but this block
                // renders nothing at all without one, so it is required here -
                // same reasoning as html's htmlfile requirement above.
                if (
                    !isset($customFields['feed'])
                    || !is_string($customFields['feed'])
                    || trim($customFields['feed']) === ''
                    || strlen($customFields['feed']) > 2048
                ) {
                    dashticz_json_error(400, 'Enter a valid news feed URL.');
                }
            }
        } elseif ($kind === 'timegraph') {
            // Only Icon and Last update apply (no Data/Switch/Dial - see
            // js/deviceeditor.js's _quickOptionsHtml()), but unlike
            // Group/HTML/iFrame/Calendar/Public transport above, the
            // graphed device idx is required (js/components/timegraph.js
            // has no useful default without one).
            if (!isset($entry['idx']) || !is_int($entry['idx']) || $entry['idx'] < 1) {
                dashticz_json_error(400, 'A timegraph block requires a positive integer idx.');
            }
            $idx = $entry['idx'];
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr($entry['icon'], 0, 100)
                : null;
            $lastUpdate = !empty($entry['last_update']);
        } elseif ($kind === 'lms') {
            // Icon defaults off (js/deviceeditor.js's Lyrion Music Server popup
            // uses the cover artwork as its visual, like an HTML Block), but is
            // still available like every other special block.
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr($entry['icon'], 0, 100)
                : null;
        }
        $lmsServer = null;
        $lmsPort = null;
        $lmsUsername = null;
        $lmsPassword = null;
        $lmsPlayer = null;
        $lmsRefresh = null;
        $lmsHideWhenOff = false;
        if ($kind === 'lms') {
            $lmsServer = isset($entry['server']) && is_string($entry['server'])
                ? dashticz_normalize_host_input($entry['server'])
                : '';
            if ($lmsServer === '' || strlen($lmsServer) > 255) {
                dashticz_json_error(400, 'Enter the Lyrion Music Server address.');
            }
            $lmsPort = isset($entry['port']) ? (int)$entry['port'] : 9000;
            if ($lmsPort < 1 || $lmsPort > 65535) {
                dashticz_json_error(400, 'Enter a valid Lyrion Music Server port.');
            }
            $lmsUsername = isset($entry['username']) && is_string($entry['username'])
                ? substr($entry['username'], 0, 100)
                : '';
            $lmsPassword = isset($entry['password']) && is_string($entry['password'])
                ? substr($entry['password'], 0, 200)
                : '';
            $lmsPlayer = isset($entry['player']) && is_string($entry['player'])
                ? trim($entry['player'])
                : '';
            if ($lmsPlayer === '' || strlen($lmsPlayer) > 100) {
                dashticz_json_error(400, 'Select a Lyrion Music Server player.');
            }
            $lmsRefresh = isset($entry['refresh']) ? (int)$entry['refresh'] : 5;
            if ($lmsRefresh < 2 || $lmsRefresh > 3600) {
                dashticz_json_error(400, 'Enter a valid refresh interval.');
            }
            $lmsHideWhenOff = !empty($entry['hide_when_off']);
        }
        $slide = null;
        $buttonKey = null;
        if ($kind === 'slidebutton') {
            $slide = isset($entry['slide']) ? (int)$entry['slide'] : 0;
            if ($slide < 1) {
                dashticz_json_error(400, 'A slide button requires a positive target screen number.');
            }
            $buttonKey = isset($entry['button_key']) && is_string($entry['button_key'])
                ? substr(trim($entry['button_key']), 0, 100)
                : '';
            if ($buttonKey === '') {
                $buttonKey = $title !== '' ? $title : $entry['key'];
            }
            $icon = array_key_exists('icon', $entry) && is_string($entry['icon'])
                ? substr(trim($entry['icon']), 0, 100)
                : null;
        }
        $devices[] = [
            'kind' => $kind,
            'idx' => $idx,
            'isGroup' => false,
            'subidx' => 0,
            'name' => $title,
            'width' => $width,
            'height' => $height,
            'icon' => $icon,
            'slide' => $slide,
            'button_key' => $buttonKey,
            'hide_data' => $hideData,
            'last_update' => $lastUpdate,
            'switch' => $switch,
            'type' => $type,
            'hide_title' => !empty($entry['hide_title']),
            'custom_fields' => $customFields,
            'key' => $entry['key'],
            'lms_server' => $lmsServer,
            'lms_port' => $lmsPort,
            'lms_username' => $lmsUsername,
            'lms_password' => $lmsPassword,
            'lms_player' => $lmsPlayer,
            'lms_refresh' => $lmsRefresh,
            'lms_hide_when_off' => $lmsHideWhenOff,
        ];
    } elseif (is_int($entry) && $entry > 0) {
        $devices[] = [
            'idx' => $entry,
            'isGroup' => false,
            'subidx' => 0,
            'name' => 'Device ' . $entry,
            'width' => 3,
            'height' => null,
            'custom_fields' => [],
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
            'type' => _dashticz_editor_block_type($entry),
            'hide_title' => !empty($entry['hide_title']),
            'custom_fields' => $customFields,
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
            'type' => _dashticz_editor_block_type($entry),
            'hide_title' => !empty($entry['hide_title']),
            'custom_fields' => $customFields,
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
    // TAAK1: never let a device/custom device/separator ('tussenbalk') or
    // slide button silently take over a block key that a different screen
    // already owns; clone it (screen-prefixed) instead.
    $owners = configwriter_extract_screen_block_owners(
        $keyCollisionConfig,
        $screenNumber
    );
    $requestKeys = [];
    foreach ($devices as &$device) {
        if (isset($device['kind']) && (in_array($device['kind'], ['dummy', 'title', 'custom'], true) || $device['kind'] === 'slidebutton')) {
            /* The browser generates stable numbered keys for special blocks. */
            if (isset($requestKeys[$device['key']])) {
                dashticz_json_error(409, 'Special block key already exists.');
            }
            $ownedByOtherScreen = isset($owners[$device['key']])
                && (int)$owners[$device['key']] !== (int)$screenNumber;
            if ($ownedByOtherScreen) {
                $device['key'] = configwriter_ensure_screen_owned_key(
                    $device['key'],
                    $screenNumber,
                    $owners,
                    $usedKeys
                );
                $device['preserveExisting'] = false;
            } else {
                /* Reuse an equivalent hand-written CONFIG.js block without
                 * overwriting or duplicating its additional custom properties. */
                $device['preserveExisting'] = in_array($device['key'], $usedKeys, true);
            }
            $requestKeys[$device['key']] = true;
        } elseif (!empty($device['isGroup'])) {
            /* group/scene: the key is fixed to the group reference (e.g. 's1') */
            $requestKeys[$device['key']] = true;
        } elseif ($device['key'] !== null && !isset($requestKeys[$device['key']])) {
            $device['key'] = configwriter_ensure_screen_owned_key(
                $device['key'],
                $screenNumber,
                $owners,
                $usedKeys
            );
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
        $props = isset($device['kind'])
            ? configwriter_special_block_props($device)
            : configwriter_device_block_props($device);
        // Custom and multi-device entries are emitted as complete replacement
        // block definitions. Preserve an explicitly unchecked Last update
        // option as last_update:false instead of omitting the property and
        // falling back to the global config['last_update'] after reload (#172).
        if (isset($device['kind']) && $device['kind'] === 'custom') {
            $props['last_update'] = !empty($device['last_update']);
        }
        $section .= configwriter_emit_block_line($device['key'], $props);
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
