<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}
if (isset($_SERVER['CONTENT_LENGTH'])
    && (int)$_SERVER['CONTENT_LENGTH'] > 1048576
) {
    dashticz_json_error(413, 'Grid layout request is too large.');
}

$rawBody = file_get_contents('php://input');
if ($rawBody !== false && strlen($rawBody) > 1048576) {
    dashticz_json_error(413, 'Grid layout request is too large.');
}
$data = json_decode($rawBody ?: '', true);
if (json_last_error() !== JSON_ERROR_NONE
    || !is_array($data)
    || !isset($data['items'])
    || !is_array($data['items'])
) {
    dashticz_json_error(400, 'Invalid grid layout items.');
}
if (count($data['items']) > 500) {
    dashticz_json_error(400, 'A grid screen supports up to 500 blocks.');
}

$screenNumber = configwriter_parse_screen_number($data, 1);

$gridColumns = isset($data['gridColumns']) ? (int)$data['gridColumns'] : 24;
$rowHeight = isset($data['rowHeight']) ? (int)$data['rowHeight'] : 20;
// Whether to persist gridColumns/rowHeight explicitly on this screen, or
// leave it following the dashboard-wide Settings > Weergave default. The
// client only sets these to true when the screen's current value actually
// diverges from that default; default to true (preserve, same as before
// this existed) if an older client build doesn't send them at all.
$pinGridColumns = !isset($data['pinGridColumns']) || (bool)$data['pinGridColumns'];
$pinRowHeight = !isset($data['pinRowHeight']) || (bool)$data['pinRowHeight'];
if (isset($data['gap']) && !is_numeric($data['gap'])) {
    dashticz_json_error(400, 'gap must be numeric.');
}
$gap = isset($data['gap']) && is_numeric($data['gap'])
    ? (float)$data['gap']
    : 0;
$mobileLayout = isset($data['mobileLayout'])
    ? (string)$data['mobileLayout']
    : 'stack';
if ($gridColumns < 1 || $gridColumns > 100) {
    dashticz_json_error(400, 'gridColumns must be between 1 and 100.');
}
if ($rowHeight < 1 || $rowHeight > 2000) {
    dashticz_json_error(400, 'rowHeight must be between 1 and 2000.');
}
if ($gap < 0 || $gap > 200) {
    dashticz_json_error(400, 'gap must be between 0 and 200.');
}
if ($mobileLayout !== 'stack') {
    dashticz_json_error(400, 'Unsupported mobile layout.');
}

$customDir = __DIR__ . '/../custom';
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}
list($startMarker, $endMarker) = configwriter_editor_markers(
    'grid-layout',
    $screenNumber
);
$existingGridSection = configwriter_extract_wrapped_section(
    $config,
    $startMarker,
    $endMarker
);
$existingGridBlocks = configwriter_extract_block_lines($existingGridSection);
$allBlockLines = configwriter_extract_block_lines($config);
list($widgetStartMarker, $widgetEndMarker) = configwriter_editor_markers(
    'widget',
    $screenNumber
);
$widgetSettings = configwriter_extract_section_config_settings(
    $config,
    $widgetStartMarker,
    $widgetEndMarker
);
$declaredRefs = configwriter_extract_declared_block_refs($config);
// TAAK1: know which screen currently owns each block key, so simply
// repositioning a widget/device within this screen's grid can't silently
// take over (and later be edited to affect) a block owned by another screen.
$screenOwners = configwriter_extract_screen_block_owners($config, $screenNumber);
$items = [];
$usedRefs = [];
$usedBlockKeys = array_keys($declaredRefs);
foreach ($data['items'] as $index => $entry) {
    if (!is_array($entry)
        || !isset($entry['grid'])
        || !is_array($entry['grid'])
    ) {
        dashticz_json_error(400, 'Each grid item requires a safe block reference and grid position.');
    }
    $requestedRef =
        isset($entry['ref'])
        && is_string($entry['ref'])
        && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $entry['ref'])
            ? $entry['ref']
            : '';
    $ref = $requestedRef;
    $props = null;
    $propsLiteral = null;
    $ownedByOtherScreen = $ref !== ''
        && isset($declaredRefs[$ref])
        && isset($screenOwners[$ref])
        && (int)$screenOwners[$ref] !== (int)$screenNumber;
    // log/streamplayer/sunrise are dispatched by their literal block key
    // matching a registered component name (see
    // configwriter_is_component_dispatched_key()); cloning them under a
    // renamed key makes the clone invisible to every component's dispatch
    // check; keep them shared read-only and only ever reposition them.
    $forceClone = !configwriter_is_component_dispatched_key($ref)
        && (($screenNumber === 0 && !empty($entry['clone'])) || $ownedByOtherScreen);

    if ($forceClone
        && $ref !== ''
        && (!isset($entry['create']) || !is_array($entry['create']))
    ) {
        /* Plain repositioning within this screen's grid (drag-and-drop save)
         * never sends a 'create' payload. Clone using the block's own
         * already-known properties instead of failing, so the two screens
         * stop sharing one definition. */
        $cloneSource = isset($allBlockLines[$ref])
            ? $allBlockLines[$ref]
            : (isset($existingGridBlocks[$ref]) ? $existingGridBlocks[$ref] : null);
        if ($cloneSource !== null) {
            $propsLiteral = $cloneSource;
            $ref = configwriter_make_block_key(
                configwriter_screen_key_prefix($screenNumber) . $requestedRef,
                $usedBlockKeys
            );
        }
    }

    if ($propsLiteral === null
        && ($forceClone || $ref === '' || !isset($declaredRefs[$ref]))
    ) {
        if (!isset($entry['create']) || !is_array($entry['create'])) {
            dashticz_json_error(400, 'Grid block is not declared and cannot be created.');
        }
        $create = $entry['create'];
        $name = isset($create['name']) && is_string($create['name'])
            ? trim(substr($create['name'], 0, 100))
            : ($requestedRef !== '' ? $requestedRef : ('Grid block ' . ($index + 1)));
        if (($create['kind'] ?? '') === 'device') {
            $idx = isset($create['idx']) ? (int)$create['idx'] : 0;
            if ($idx < 1) {
                dashticz_json_error(400, 'A converted device requires a positive idx.');
            }
            $width = isset($create['width'])
                ? max(1, min(12, (int)$create['width']))
                : 3;
            $props = [
                'idx' => $idx,
                'title' => $name,
                'width' => $width,
            ];
            if (!empty($create['subidx'])) {
                $props['idx'] = $idx . '_' . (int)$create['subidx'];
            }
            if (!empty($create['height'])) {
                $props['height'] = max(
                    50,
                    min(2000, (int)(round((int)$create['height'] / 10) * 10))
                );
            }
        } elseif (($create['kind'] ?? '') === 'inline') {
            $propsJson = isset($create['propsJson'])
                && is_string($create['propsJson'])
                ? $create['propsJson']
                : '';
            $decodedProps = $propsJson !== ''
                ? json_decode($propsJson)
                : null;
            if (strlen($propsJson) > 10000
                || json_last_error() !== JSON_ERROR_NONE
                || !is_object($decodedProps)
            ) {
                dashticz_json_error(400, 'Inline grid block properties are invalid.');
            }
            $propsLiteral = $propsJson;
        } else {
            dashticz_json_error(400, 'Unsupported converted block type.');
        }
        $ref = configwriter_make_block_key(
            $requestedRef !== '' ? $requestedRef : $name,
            $usedBlockKeys
        );
    } elseif ($propsLiteral === null && isset($allBlockLines[$ref])) {
        // Prefer the full-config block line (picks up any block written by
        // savewidgets.php in the same request chain) over the stale props
        // extracted from the previous grid-layout section alone.
        $propsLiteral = $allBlockLines[$ref];
    } elseif ($propsLiteral === null && isset($existingGridBlocks[$ref])) {
        $propsLiteral = $existingGridBlocks[$ref];
    }
    if (isset($usedRefs[$ref])) {
        dashticz_json_error(400, 'Duplicate grid block reference.');
    }
    foreach (['x', 'y', 'w', 'h'] as $property) {
        if (!array_key_exists($property, $entry['grid'])
            || filter_var(
                $entry['grid'][$property],
                FILTER_VALIDATE_INT,
                ['options' => ['min_range' => 1]]
            ) === false
        ) {
            dashticz_json_error(400, 'Grid coordinates must be positive integers.');
        }
    }
    $usedRefs[$ref] = true;
    $items[] = [
        'ref' => $ref,
        'grid' => configwriter_normalise_grid_position(
            $entry['grid'],
            $gridColumns,
            $index + 1
        ),
    ];
    if ($props !== null) {
        $items[count($items) - 1]['props'] = $props;
    } elseif ($propsLiteral !== null) {
        $items[count($items) - 1]['propsLiteral'] = $propsLiteral;
    }
}

/* An empty Wizard conversion bootstraps a clean CONFIG.js (or an empty
 * existing screen). Only the explicit screen-delete flow may interpret an
 * empty item list as a request to remove and compact a numbered screen. */
if ($screenNumber > 0 && empty($items) && !isset($data['configMode'])) {
    $numberedScreens = configwriter_extract_numbered_screens($config);
    if (count($numberedScreens) > 1
        && in_array($screenNumber, $numberedScreens, true)
    ) {
        $config = configwriter_remove_numbered_screen_and_compact(
            $config,
            $screenNumber
        );
        $writeError = configwriter_write_config($configPath, $customDir, $config);
        if ($writeError !== null) {
            dashticz_json_error(500, $writeError);
        }

        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'blocks' => [],
            'removedScreen' => $screenNumber,
            'screens' => range(1, count($numberedScreens) - 1),
        ]);
        exit;
    }
}

$config = configwriter_upsert_root_config_settings(
    $config,
    $widgetSettings,
    true
);

/* A grid layout supersedes the generated column layout for the same screen.
 * Remove all temporary and consolidated editor sections before emitting the
 * grid section; otherwise an IDX-key migration leaves the old name-keyed
 * blocks in dashboard-editor and creates duplicate device definitions. */
$config = configwriter_remove_editor_sections($config, $screenNumber);
if ($screenNumber === 0) {
    $config = configwriter_remove_section(
        $config,
        '// [standby-editor-start]',
        '// [standby-editor-end]'
    );
}
$config = configwriter_remove_section($config, $startMarker, $endMarker);
$section = configwriter_build_grid_layout_section(
    $items,
    $screenNumber,
    $gridColumns,
    $rowHeight,
    $gap,
    $mobileLayout,
    $pinGridColumns,
    $pinRowHeight
);
$config = rtrim($config)
    . configwriter_wrap_section($startMarker, $endMarker, $section);
if (isset($data['configMode'])) {
    if ($data['configMode'] !== 'wizard') {
        dashticz_json_error(400, 'Grid conversion only supports Wizard mode.');
    }
    $config = configwriter_set_config_mode($config, 'wizard');
    if ($config === null) {
        dashticz_json_error(409, 'CONFIG.js does not contain the expected config marker.');
    }
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode(['success' => true, 'blocks' => array_keys($usedRefs)]);
