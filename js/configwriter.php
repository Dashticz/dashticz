<?php
/**
 * Shared helpers for writing readable CONFIG.js sections from the editors.
 */

function configwriter_read_config($configPath)
{
    if (file_exists($configPath)) {
        $config = @file_get_contents($configPath);
        if ($config === false) {
            return [null, 'Unable to read CONFIG.js.'];
        }
        if (trim($config) === '#EMPTY#') {
            return ["var config = {}\n", null];
        }
        return [$config, null];
    }

    return ["var config = {}\n", null];
}

function configwriter_write_config($configPath, $customDir, $config)
{
    if (!file_exists($configPath) && !is_writable($customDir)) {
        return 'The directory "custom/" is not writable by the web server'
            . dashticz_owner_info($customDir)
            . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access';
    }

    if (file_exists($configPath) && !is_writable($configPath)) {
        @chmod($configPath, 0664);
        if (!is_writable($configPath)) {
            return 'CONFIG.js is not writable'
                . dashticz_owner_info($configPath)
                . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access';
        }
    }

    if (file_put_contents($configPath, rtrim($config) . "\n", LOCK_EX) === false) {
        return 'Unable to write CONFIG.js.';
    }

    @chmod($configPath, 0664);
    return null;
}

function configwriter_remove_section($config, $startMarker, $endMarker)
{
    $startPos = strpos($config, $startMarker);
    if ($startPos === false) {
        return $config;
    }

    $endPos = strpos($config, $endMarker, $startPos);
    if ($endPos === false) {
        return substr($config, 0, $startPos);
    }

    return substr($config, 0, $startPos)
        . substr($config, $endPos + strlen($endMarker));
}

function configwriter_extract_wrapped_section($config, $startMarker, $endMarker)
{
    $startPos = strpos($config, $startMarker);
    if ($startPos === false) {
        return '';
    }

    $endPos = strpos($config, $endMarker, $startPos);
    if ($endPos === false) {
        return '';
    }

    return trim(substr(
        $config,
        $startPos,
        $endPos + strlen($endMarker) - $startPos
    ));
}

function configwriter_remove_editor_sections($config)
{
    $markers = [
        ['// [device-editor-start]', '// [device-editor-end]'],
        ['// [widget-editor-start]', '// [widget-editor-end]'],
        ['// [layout-editor-start]', '// [layout-editor-end]'],
        ['// [dashboard-editor-start]', '// [dashboard-editor-end]'],
    ];

    foreach ($markers as $markerPair) {
        $config = configwriter_remove_section($config, $markerPair[0], $markerPair[1]);
    }

    return rtrim($config);
}

/**
 * Move editor-owned config values into the main config block.
 *
 * Older Widget Editor output stored its settings between the widget markers,
 * below the generated blocks and columns. Keeping those values immediately
 * after the regular config assignments makes CONFIG.js readable without
 * changing hand-written content outside the editor sections.
 */
function configwriter_upsert_root_config_settings($config, $settings, $raw = false)
{
    if (empty($settings)) {
        return $config;
    }

    $lines = [];
    foreach ($settings as $key => $value) {
        if (!preg_match('/^[A-Za-z0-9_]+$/', (string)$key)) {
            continue;
        }

        $pattern = '/^[ \t]*config\[([\'"])'
            . preg_quote((string)$key, '/')
            . '\1\]\s*=\s*[^;\r\n]+;[ \t]*(?:\r?\n|$)/m';
        $config = preg_replace($pattern, '', $config);

        $expression = $raw
            ? trim((string)$value)
            : json_encode(
                $value,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
        $lines[] = 'config[' . json_encode((string)$key) . '] = '
            . $expression . ';';
    }

    if (empty($lines)) {
        return $config;
    }

    $marker = 'var config = {}';
    $markerPos = strpos($config, $marker);
    if ($markerPos === false) {
        return $config;
    }

    /*
     * Find the last regular config assignment before generated layout content.
     * This preserves the existing setting order and keeps every setting in one
     * contiguous group at the top of normal editor-generated CONFIG.js files.
     */
    $generatedPos = strlen($config);
    foreach ([
        '// [standby-editor-start]',
        '// [dashboard-editor-start]',
        '// [device-editor-start]',
        '// [widget-editor-start]',
        '// [layout-editor-start]',
    ] as $generatedMarker) {
        $pos = strpos($config, $generatedMarker);
        if ($pos !== false && $pos < $generatedPos) {
            $generatedPos = $pos;
        }
    }

    $root = substr($config, 0, $generatedPos);
    $insertAt = $markerPos + strlen($marker);
    if (preg_match_all(
        '/^[ \t]*config\[([\'"])[A-Za-z0-9_]+\1\]\s*=\s*[^;\r\n]+;[ \t]*$/m',
        $root,
        $matches,
        PREG_OFFSET_CAPTURE
    )) {
        $last = end($matches[0]);
        $insertAt = $last[1] + strlen($last[0]);
    }

    $before = rtrim(substr($config, 0, $insertAt));
    $after = ltrim(substr($config, $insertAt), "\r\n");

    return $before . "\n" . implode("\n", $lines) . "\n"
        . ($after === '' ? '' : $after);
}

/**
 * Extract config['key'] = value; lines from a marked CONFIG.js section.
 * Returns an associative array of setting name => raw JS value expression.
 */
function configwriter_extract_section_config_settings($config, $startMarker, $endMarker)
{
    $settings = [];
    $startPos = strpos($config, $startMarker);
    if ($startPos === false) {
        return $settings;
    }
    $endPos = strpos($config, $endMarker, $startPos);
    if ($endPos === false) {
        return $settings;
    }

    $section = substr($config, $startPos, $endPos - $startPos);
    if (!preg_match_all(
        "/config\\[(['\\\"])([A-Za-z0-9_]+)\\1\\]\\s*=\\s*([^;]+);/",
        $section,
        $matches,
        PREG_SET_ORDER
    )) {
        return $settings;
    }

    foreach ($matches as $match) {
        $settings[$match[2]] = trim($match[3]);
    }

    return $settings;
}

/**
 * Emit config['key'] = value; lines from either PHP scalars or raw JS expressions.
 */
function configwriter_emit_config_settings($settings, $raw = false)
{
    if (empty($settings)) {
        return '';
    }

    $out = "\n" . configwriter_section_header('WIDGET SETTINGS') . "\n";
    foreach ($settings as $key => $value) {
        if ($raw) {
            $out .= 'config[' . json_encode((string)$key) . '] = ' . $value . ";\n";
            continue;
        }
        $out .= 'config[' . json_encode((string)$key) . '] = '
            . json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . ";\n";
    }

    return $out;
}

function configwriter_js_string_escape($value)
{
    return str_replace(['\\', "'"], ['\\\\', "\\'"], $value);
}

function configwriter_managed_column_pattern()
{
    return '/^(?:de|we|le)_col\\d+$|^col_\\d+$/';
}

function configwriter_section_header($title)
{
    return "// --------------------------------------------------------------------------------------------\n"
        . '// ' . strtoupper($title) . "\n"
        . "// --------------------------------------------------------------------------------------------\n";
}

function configwriter_format_props($props)
{
    $parts = [];
    foreach ($props as $key => $value) {
        if ($value === null) {
            continue;
        }
        if (is_bool($value)) {
            $parts[] = $key . ':' . ($value ? 'true' : 'false');
            continue;
        }
        if (is_int($value) || is_float($value)) {
            $parts[] = $key . ':' . $value;
            continue;
        }
        $parts[] = $key . ":'" . configwriter_js_string_escape((string)$value) . "'";
    }

    return '{' . implode(', ', $parts) . '}';
}

function configwriter_emit_block_line($key, $props)
{
    return "blocks['" . $key . "'] = " . configwriter_format_props($props) . ";\n";
}

function configwriter_emit_column_line($key, $blockKeys, $width)
{
    $quotedBlocks = array_map(function ($blockKey) {
        return "'" . configwriter_js_string_escape($blockKey) . "'";
    }, $blockKeys);

    return "columns['" . $key . "'] = {blocks: ["
        . implode(', ', $quotedBlocks)
        . '], width: ' . (int)$width . "};\n";
}

/**
 * Emit screens[N] column wiring.
 * - merge (default): push column keys if missing (device/widget editors)
 * - replace: drop managed editor columns, then push the provided keys (layout editor)
 */
/**
 * Default visual row height in pixels.
 *
 * Matches the common Dashticz tile height (modern-dark --height-block-default
 * and the layout editor's typical unset-height rendering). Blocks without an
 * explicit height are treated as exactly one row unit tall.
 */
function configwriter_default_row_height()
{
    return 120;
}

/**
 * Normalise a layout item to safe width/height integers.
 *
 * @param array $item  Must contain ref/width; height is optional.
 * @param int   $columnWidth
 * @return array{ref:string,width:int,height:int}
 */
function configwriter_normalise_layout_item($item, $columnWidth)
{
    $width = isset($item['width']) ? (int)$item['width'] : 3;
    $width = max(1, min($columnWidth, $width));

    $height = configwriter_default_row_height();
    if (isset($item['height']) && $item['height'] !== null && $item['height'] !== '') {
        $height = (int)$item['height'];
        // Height snaps to the same 10px grid the layout editor uses.
        $height = (int)(round($height / 10) * 10);
        if ($height < 50) {
            $height = 50;
        } elseif ($height > 2000) {
            $height = 2000;
        }
    }

    return [
        'ref' => (string)$item['ref'],
        'width' => $width,
        'height' => $height,
    ];
}

/**
 * Pack ordered blocks into Bootstrap screen-columns, honouring height.
 *
 * Dashticz screens are a Bootstrap float row of columns. Each column has a
 * width of 1–12 (`col-sm-N`) and contains one or more floated tiles
 * (`col-xs-N`). When every column is width 12, columns stack and a tall tile
 * cannot leave a side pocket for later tiles.
 *
 * This packer detects a tall tile on a filled row and splits that row into:
 *   1. a "short" column of width (gridWidth - tallWidth) for the short tiles
 *   2. a virtual side column of width tallWidth that holds only the tall tile
 *
 * Additional short rows that still fit in the remaining vertical space beside
 * the tall tile are emitted as further columns of width (gridWidth - tallWidth).
 * Bootstrap's float packing then places those columns under the short tiles and
 * beside the tall tile, so all tops align:
 *
 *   [ short A ][ short B ][      ]
 *   [ short C ][ short D ][ TALL ]
 *                         [      ]
 *
 * Side-pocket shorts (C, D) are appended into the SAME short column as A/B.
 * Emitting them as extra Bootstrap columns leaves a flex-wrap gap under A/B,
 * because a new flex line always starts below the tallest item of the previous
 * line. Keeping them in one column stacks (or float-packs) them directly under
 * the opening short tiles — e.g. BMW sits flush under Afval beside a tall UPS.
 *
 * @param array $items        Ordered list of {ref, width, height?}
 * @param int   $columnWidth  Grid width (normally 12)
 * @param string $keyPrefix   Column key prefix, e.g. 'le_col', 'de_col', 'we_col'
 * @return array<int, array{key:string, blocks:string[], width:int}>
 */
function configwriter_pack_columns_by_height($items, $columnWidth = 12, $keyPrefix = 'le_col')
{
    $columnWidth = max(1, min(12, (int)$columnWidth));
    $defaultRowHeight = configwriter_default_row_height();
    $queue = [];
    foreach ($items as $item) {
        if (!isset($item['ref']) || !is_string($item['ref']) || $item['ref'] === '') {
            continue;
        }
        $queue[] = configwriter_normalise_layout_item($item, $columnWidth);
    }

    $packed = [];
    $index = 0;
    $columnNumber = 1;

    while ($index < count($queue)) {
        /*
         * Step 1 — fill one logical row until the 12-wide budget is exhausted.
         * This mirrors classic width-only chunking, but we keep height metadata.
         */
        $row = [];
        $rowWidth = 0;
        while ($index < count($queue)) {
            $candidate = $queue[$index];
            if (!empty($row) && ($rowWidth + $candidate['width']) > $columnWidth) {
                break;
            }
            $row[] = $candidate;
            $rowWidth += $candidate['width'];
            $index++;
        }

        if (empty($row)) {
            // Single block wider than remaining budget: force it into its own column.
            $row[] = $queue[$index];
            $index++;
        }

        /*
         * Step 2 — decide whether this row contains a tall block that should
         * become a virtual side column.
         *
         * Base height = the tallest *short* tile on the row (or the default row
         * height when every tile shares the max). A tile is "tall" when it is
         * strictly taller than that base by at least one full row unit.
         */
        $heights = array_map(function ($item) {
            return $item['height'];
        }, $row);
        $maxHeight = max($heights);
        $minHeight = min($heights);

        $tallIndex = null;
        if ($maxHeight > $minHeight) {
            foreach ($row as $i => $item) {
                if ($item['height'] === $maxHeight) {
                    $tallIndex = $i;
                    break;
                }
            }
        }

        $baseHeight = $minHeight;
        if ($tallIndex === null || $maxHeight < ($baseHeight + $defaultRowHeight)) {
            // No meaningful height difference → emit one full-width column.
            $packed[] = [
                'key' => $keyPrefix . $columnNumber++,
                'blocks' => array_map(function ($item) {
                    return $item['ref'];
                }, $row),
                'width' => $columnWidth,
            ];
            continue;
        }

        $tall = $row[$tallIndex];
        $shortBlocks = [];
        foreach ($row as $i => $item) {
            if ($i === $tallIndex) {
                continue;
            }
            $shortBlocks[] = $item['ref'];
        }

        /*
         * Step 3 — shrink the short column and add the virtual tall column.
         *
         * Current column width becomes (gridWidth - tallWidth) so the short
         * tiles sit on one side. The tall tile gets its own column of width
         * tallWidth. Together they still sum to the full grid width.
         *
         * IMPORTANT (Bootstrap 5 flex rows): do NOT emit the side-pocket short
         * tiles as separate columns. A new flex line always starts below the
         * tallest item of the previous line, which leaves a gap under the
         * short tiles (e.g. BMW sitting below APC instead of under Afval).
         * Instead, append every side-pocket tile into the same short column so
         * they stack (or float-pack) directly under the opening short tiles.
         */
        $sideWidth = max(1, $columnWidth - $tall['width']);
        $tallWidth = $tall['width'];

        /*
         * Step 4 — how many extra short rows still fit beside the tall tile?
         *
         * rowsBeside = floor(tallHeight / baseHeight) - 1
         * (the first baseHeight unit was already consumed by the short tiles
         * on the opening row). Pull those tiles now and append them to
         * shortBlocks before emitting the short column.
         */
        $rowsBeside = (int)floor($maxHeight / max(1, $baseHeight)) - 1;
        for ($rowSlot = 0; $rowSlot < $rowsBeside; $rowSlot++) {
            $sideRowWidth = 0;
            $added = 0;
            while ($index < count($queue)) {
                $candidate = $queue[$index];
                // Do not pull another tall-or-taller tile into the side pocket;
                // it would overflow the remaining vertical space beside TALL.
                if ($candidate['height'] > $baseHeight) {
                    break;
                }
                if ($added > 0 && ($sideRowWidth + $candidate['width']) > $sideWidth) {
                    break;
                }
                if ($added === 0 && $candidate['width'] > $sideWidth) {
                    // Too wide for the pocket — leave it for a later full-width pass.
                    break;
                }
                $shortBlocks[] = $candidate['ref'];
                $sideRowWidth += $candidate['width'];
                $added++;
                $index++;
            }

            if ($added === 0) {
                break;
            }
        }

        if (!empty($shortBlocks)) {
            $packed[] = [
                'key' => $keyPrefix . $columnNumber++,
                'blocks' => $shortBlocks,
                'width' => $sideWidth,
            ];
        }

        $packed[] = [
            'key' => $keyPrefix . $columnNumber++,
            'blocks' => [$tall['ref']],
            'width' => $tallWidth,
        ];
    }

    return $packed;
}

/**
 * Width-only chunking (legacy). Prefer configwriter_pack_columns_by_height when
 * block heights are available.
 */
function configwriter_chunk_items_by_width($items, $columnWidth)
{
    $packed = configwriter_pack_columns_by_height(
        array_map(function ($item) {
            // Force equal heights so the packer reduces to classic width chunking.
            $copy = $item;
            $copy['height'] = configwriter_default_row_height();
            return $copy;
        }, $items),
        $columnWidth,
        'chunk'
    );

    return array_map(function ($column) use ($items) {
        $refs = $column['blocks'];
        $chunk = [];
        foreach ($refs as $ref) {
            foreach ($items as $item) {
                if (isset($item['ref']) && $item['ref'] === $ref) {
                    $chunk[] = $item;
                    break;
                }
            }
        }
        return $chunk;
    }, $packed);
}

/**
 * Emit screens[N]['columns'] as a direct assignment (flat CONFIG style).
 *
 * replace — overwrite the managed editor columns with the provided keys
 * merge   — append missing keys while keeping existing non-managed columns
 */
function configwriter_emit_screen_columns($screenNumber, $columnKeys, $mode = 'merge')
{
    $n = (int)$screenNumber;
    $quoted = array_map(function ($columnKey) {
        return "'" . configwriter_js_string_escape($columnKey) . "'";
    }, $columnKeys);
    $list = '[' . implode(', ', $quoted) . ']';

    $out = "if (typeof screens === 'undefined') var screens = {}\n"
        . "if (typeof screens[{$n}] === 'undefined') screens[{$n}] = {}\n";

    if ($mode === 'replace') {
        // Keep non-managed columns (e.g. hand-written ones), then set the full list.
        $out .= "screens[{$n}]['columns'] = (Array.isArray(screens[{$n}]['columns']) "
            . "? screens[{$n}]['columns'].filter(function (columnKey) {"
            . " return !/^(de|we|le)_col\\d+$|^col_\\d+$/.test(String(columnKey)); })"
            . " : []).concat({$list});\n";
        return $out;
    }

    $out .= "if (!Array.isArray(screens[{$n}]['columns'])) screens[{$n}]['columns'] = []\n";
    foreach ($columnKeys as $columnKey) {
        $safe = configwriter_js_string_escape($columnKey);
        $out .= "if (screens[{$n}]['columns'].indexOf('{$safe}') < 0) "
            . "screens[{$n}]['columns'].push('{$safe}')\n";
    }

    return $out;
}

function configwriter_build_layout_section($blockLines, $items, $screenNumber = 1, $columnWidth = 12)
{
    $section = configwriter_section_header('BLOCKS') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";

    $usedRefs = [];
    foreach ($items as $item) {
        if (!isset($item['ref']) || !is_string($item['ref'])) {
            continue;
        }
        $ref = $item['ref'];
        if (isset($blockLines[$ref]) && !isset($usedRefs[$ref])) {
            $section .= "blocks['" . $ref . "'] = " . $blockLines[$ref] . "\n";
            $usedRefs[$ref] = true;
        }
    }

    $section .= "\n" . configwriter_section_header('COLUMNS') . "\n";
    $section .= "if (typeof columns === 'undefined') var columns = {}\n";

    $columnKeys = [];
    foreach (configwriter_pack_columns_by_height($items, $columnWidth, 'le_col') as $column) {
        $columnKeys[] = $column['key'];
        $section .= configwriter_emit_column_line(
            $column['key'],
            $column['blocks'],
            $column['width']
        );
    }

    $section .= "\n" . configwriter_section_header('SCREENS') . "\n";
    $section .= configwriter_emit_screen_columns($screenNumber, $columnKeys, 'replace');

    return [$section, $columnKeys];
}

function configwriter_emit_columns_standby($blockKeys, $width = 12)
{
    $quotedBlocks = array_map(function ($blockKey) {
        return "'" . configwriter_js_string_escape($blockKey) . "'";
    }, $blockKeys);

    // Standby layout is independent of screens[] — one full-width column.
    $section = configwriter_section_header('STANDBY SCREEN') . "\n";
    $section .= "if (typeof columns_standby === 'undefined') var columns_standby = {};\n";
    $section .= "columns_standby[1] = {};\n";
    $section .= "columns_standby[1]['blocks'] = ["
        . implode(', ', $quotedBlocks)
        . "];\n";
    $section .= "columns_standby[1]['width'] = " . max(1, min(12, (int)$width)) . ";\n";

    return $section;
}

/**
 * Replace (or append) the marked standby-editor section in CONFIG.js.
 * Also strips legacy unmarked columns_standby definitions to avoid duplicates.
 */
function configwriter_replace_standby_section($config, $blockKeys, $width = 12)
{
    $startMarker = '// [standby-editor-start]';
    $endMarker = '// [standby-editor-end]';

    $config = configwriter_remove_section($config, $startMarker, $endMarker);
    $config = configwriter_strip_legacy_columns_standby($config);

    $body = configwriter_emit_columns_standby($blockKeys, $width);
    return rtrim($config) . configwriter_wrap_section($startMarker, $endMarker, $body);
}

/**
 * Remove older hand-written columns_standby blocks that lack editor markers.
 */
function configwriter_strip_legacy_columns_standby($config)
{
    $patterns = [
        '/(?:\/\/\s*-{10,}[^\n]*\n\/\/\s*STANDBY SCREEN[^\n]*\n\/\/\s*-{10,}[^\n]*\n)?'
        . 'if\s*\(\s*typeof\s+columns_standby\s*===\s*[\'"]undefined[\'"]\s*\)\s*var\s+columns_standby\s*=\s*\{\s*\}\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\s*=\s*\{\s*\}\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\[[\'"]blocks[\'"]\]\s*=\s*\[[^\]]*\]\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\[[\'"]width[\'"]\]\s*=\s*\d+\s*;?\s*\r?\n?/i',
        '/var\s+columns_standby\s*=\s*\{\s*\}\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\s*=\s*\{\s*\}\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\[[\'"]blocks[\'"]\]\s*=\s*\[[^\]]*\]\s*;?\s*\r?\n'
        . 'columns_standby\[1\]\[[\'"]width[\'"]\]\s*=\s*\d+\s*;?\s*\r?\n?/i',
    ];

    foreach ($patterns as $pattern) {
        $config = preg_replace($pattern, '', $config);
    }

    return $config;
}

function configwriter_extract_block_lines($config)
{
    $blocks = [];
    if (!preg_match_all(
        "/blocks\\['([^']+)'\\]\\s*=\\s*(\\{[^;]*\\})\\s*;?/",
        $config,
        $matches,
        PREG_SET_ORDER
    )) {
        return $blocks;
    }

    foreach ($matches as $match) {
        $blocks[$match[1]] = $match[2];
    }

    return $blocks;
}

/**
 * Read height:N from a previously emitted block property object string.
 */
function configwriter_height_from_block_props($propsLiteral)
{
    if (!is_string($propsLiteral)) {
        return null;
    }
    if (preg_match('/\bheight\s*:\s*(\d+)/', $propsLiteral, $match)) {
        return (int)$match[1];
    }
    return null;
}

function configwriter_wrap_section($startMarker, $endMarker, $body)
{
    return "\n\n" . $startMarker . "\n" . $body . $endMarker;
}

function configwriter_make_block_key($name, &$usedKeys)
{
    $key = preg_replace('/[^a-zA-Z0-9_]/', '_', $name);
    $key = preg_replace('/_+/', '_', $key);
    $key = trim($key, '_');
    if ($key === '' || ctype_digit(substr($key, 0, 1))) {
        $key = 'd' . $key;
    }

    $base = $key;
    $suffix = 2;
    while (in_array($key, $usedKeys, true)) {
        $key = $base . '_' . $suffix++;
    }
    $usedKeys[] = $key;

    return $key;
}

function configwriter_device_block_props($device, $defaultWidth = 3)
{
    $idx = (int)$device['idx'];
    $title = isset($device['name']) ? (string)$device['name'] : ('Device ' . $idx);
    $width = isset($device['width']) ? (int)$device['width'] : $defaultWidth;
    $width = max(1, min(12, $width));

    $props = [
        'width' => $width,
        'hide_data' => true,
        'last_update' => false,
        'title' => $title,
    ];

    if (!empty($device['subidx']) && (int)$device['subidx'] > 0) {
        $props['idx'] = $idx . '_' . (int)$device['subidx'];
    } else {
        $props['idx'] = $idx;
    }

    if (isset($device['height']) && is_int($device['height'])) {
        $props['height'] = $device['height'];
    }

    return $props;
}
