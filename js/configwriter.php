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

/**
 * Resolve the configuration file selected by main.js (?cfg=CONFIG2.js).
 * Only a bare JavaScript filename is accepted so editor writes stay inside
 * custom/ and every editor targets the same file that the dashboard loaded.
 */
function configwriter_resolve_config_path($customDir)
{
    $cfgFile = isset($_GET['cfg']) ? $_GET['cfg'] : 'CONFIG.js';
    if (!is_string($cfgFile)
        || basename($cfgFile) !== $cfgFile
        || !preg_match('/^[A-Za-z0-9_-]+\.js$/', $cfgFile)
    ) {
        dashticz_json_error(400, 'Invalid cfg filename.');
    }

    return [$customDir . '/' . $cfgFile, $cfgFile];
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

function configwriter_remove_editor_sections($config, $screenNumber = 1)
{
    // Screen 0 = standby; do not coerce to 1 (that wiped screen 1's dashboard).
    $n = (int)$screenNumber;
    if ($n < 0) {
        $n = 1;
    }
    $kinds = ['device', 'widget', 'layout', 'dashboard'];
    foreach ($kinds as $kind) {
        list($startMarker, $endMarker) = configwriter_editor_markers($kind, $n);
        $config = configwriter_remove_section($config, $startMarker, $endMarker);
    }

    return rtrim($config);
}

function configwriter_set_config_mode($config, $mode)
{
    $value = strtolower((string)$mode) === 'custom' ? 'custom' : 'wizard';
    $line = 'config["config_mode"] = ' . json_encode($value) . ';';
    $config = preg_replace(
        '/^[ \t]*config\[[\'"]config_mode[\'"]\]\s*=\s*[^;]+;[ \t]*(?:(?:\/\/)[^\r\n]*)?(?:\r?\n|$)/m',
        '',
        $config
    );
    $marker = 'var config = {}';
    $pos = strpos($config, $marker);
    if ($pos === false) {
        return null;
    }
    $insertAt = $pos + strlen($marker);
    return substr($config, 0, $insertAt)
        . "\n" . $line
        . substr($config, $insertAt);
}

function configwriter_clear_dashboard_layout($config)
{
    $patterns = [
        '/^[ \t]*var\s+blocks\s*=\s*\{\s*\}\s*;?[ \t]*(?:\r?\n|$)/m',
        '/^[ \t]*var\s+columns\s*=\s*\{\s*\}\s*;?[ \t]*(?:\r?\n|$)/m',
        '/^[ \t]*var\s+screens\s*=\s*\{\s*\}\s*;?[ \t]*(?:\r?\n|$)/m',
        '/^[ \t]*var\s+blocks\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*var\s+columns\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*var\s+screens\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*if\s*\(\s*typeof\s+blocks\s*===\s*[\'"]undefined[\'"]\s*\)\s*var\s+blocks\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*if\s*\(\s*typeof\s+columns\s*===\s*[\'"]undefined[\'"]\s*\)\s*var\s+columns\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*if\s*\(\s*typeof\s+screens\s*===\s*[\'"]undefined[\'"]\s*\)\s*var\s+screens\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*var\s+columns_standby\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*if\s*\(\s*typeof\s+columns_standby\s*===\s*[\'"]undefined[\'"]\s*\)\s*var\s+columns_standby\s*=\s*\{\s*\}\s*;?[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
        '/^[ \t]*var\s+defaultcolumns\s*=\s*[^;]+;[ \t]*(?:\/\/[^\r\n]*)?(?:\r?\n|$)/m',
    ];

    foreach ($patterns as $pattern) {
        $config = preg_replace($pattern, '', $config);
    }

    $config = configwriter_remove_assignment_statements(
        $config,
        '/^[ \t]*(?:blocks|columns|screens|columns_standby)\s*\[\s*[^\]]+\s*\](?:\s*\[\s*([\'"])[^\'"]+\1\s*\])?\s*=/m',
        true
    );

    $config = preg_replace(
        '/^[ \t]*if\s*\([^\r\n]*\b(?:blocks|columns|screens|columns_standby)\s*\[\s*[^\]]+\s*\][^\r\n]*(?:\r?\n|$)/m',
        '',
        $config
    );

    $config = configwriter_remove_section(
        $config,
        '// [standby-editor-start]',
        '// [standby-editor-end]'
    );

    $config = configwriter_strip_legacy_columns_standby($config);

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
function configwriter_remove_assignment_statements(
    $config,
    $pattern,
    $allowLineEnd = false
)
{
    if (!preg_match_all(
        $pattern,
        $config,
        $matches,
        PREG_SET_ORDER | PREG_OFFSET_CAPTURE
    )) {
        return $config;
    }

    for ($matchIndex = count($matches) - 1; $matchIndex >= 0; $matchIndex--) {
        $start = $matches[$matchIndex][0][1];
        $scan = $start + strlen($matches[$matchIndex][0][0]);
        $quote = null;
        $escaped = false;
        $lineComment = false;
        $blockComment = false;
        $regexLiteral = false;
        $regexClass = false;
        $lastSignificant = null;
        $parentheses = 0;
        $brackets = 0;
        $braces = 0;
        $length = strlen($config);
        for (; $scan < $length; $scan++) {
            $char = $config[$scan];
            $next = $scan + 1 < $length ? $config[$scan + 1] : '';
            if ($lineComment) {
                if ($char === "\n" || $char === "\r") {
                    $lineComment = false;
                }
                continue;
            }
            if ($blockComment) {
                if ($char === '*' && $next === '/') {
                    $blockComment = false;
                    $scan++;
                }
                continue;
            }
            if ($regexLiteral) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === '[') {
                    $regexClass = true;
                } elseif ($char === ']') {
                    $regexClass = false;
                } elseif ($char === '/' && !$regexClass) {
                    $regexLiteral = false;
                    $lastSignificant = '/';
                }
                continue;
            }
            if ($quote !== null) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === $quote) {
                    $quote = null;
                }
                continue;
            }
            if ($char === '/' && $next === '/') {
                $lineComment = true;
                $scan++;
                continue;
            }
            if ($char === '/' && $next === '*') {
                $blockComment = true;
                $scan++;
                continue;
            }
            $prefix = substr($config, max($start, $scan - 16), min(16, $scan - $start));
            if ($char === '/'
                && ($lastSignificant === null
                    || strpos('=(:,[!&|?{;', $lastSignificant) !== false
                    || preg_match('/\b(?:return|case|throw)\s*$/', $prefix)
                )
            ) {
                $regexLiteral = true;
                $regexClass = false;
                $escaped = false;
                continue;
            }
            if ($char === "'" || $char === '"' || $char === '`') {
                $quote = $char;
                continue;
            }
            if ($char === '(') {
                $parentheses++;
            } elseif ($char === ')') {
                $parentheses = max(0, $parentheses - 1);
            } elseif ($char === '[') {
                $brackets++;
            } elseif ($char === ']') {
                $brackets = max(0, $brackets - 1);
            } elseif ($char === '{') {
                $braces++;
            } elseif ($char === '}') {
                $braces = max(0, $braces - 1);
            }
            if (!ctype_space($char)) {
                $lastSignificant = $char;
            }
            $endsWithSemicolon = $char === ';';
            $endsWithLine = $allowLineEnd
                && ($char === "\n" || $char === "\r");
            if ((!$endsWithSemicolon && !$endsWithLine)
                || $parentheses > 0
                || $brackets > 0
                || $braces > 0) {
                continue;
            }

            $end = $scan + 1;
            if ($char === "\r"
                && $end < $length
                && $config[$end] === "\n"
            ) {
                $end++;
            }
            while ($end < $length && ($config[$end] === ' ' || $config[$end] === "\t")) {
                $end++;
            }
            if (substr($config, $end, 2) !== '//') {
                if (substr($config, $end, 2) === "\r\n") {
                    $end += 2;
                } elseif ($end < $length && ($config[$end] === "\n" || $config[$end] === "\r")) {
                    $end++;
                }
            }
            $config = substr($config, 0, $start) . substr($config, $end);
            break;
        }
    }
    return $config;
}

function configwriter_remove_config_key($config, $key)
{
    $pattern = '/^[ \t]*config\[\s*([\'"])'
        . preg_quote((string)$key, '/')
        . '\1\s*\]\s*=/m';
    return configwriter_remove_assignment_statements($config, $pattern);
}

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

        $config = configwriter_remove_config_key($config, $key);

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
    return str_replace(
        ['\\', "'", "\r", "\n", "\u{2028}", "\u{2029}"],
        ['\\\\', "\\'", '\\r', '\\n', '\\u2028', '\\u2029'],
        $value
    );
}

function configwriter_managed_column_pattern()
{
    // Include legacy de_col1 and multi-screen de_s2_col1 style keys.
    return '/^(de|we|le)_s\\d+_col\\d+$|^(de|we|le)_col\\d+$|^col_\\d+$/';
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
        if (is_array($value) || is_object($value)) {
            $parts[] = $key . ':' . json_encode(
                $value,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            );
            continue;
        }
        $parts[] = $key . ":'" . configwriter_js_string_escape((string)$value) . "'";
    }

    return '{' . implode(', ', $parts) . '}';
}

/** Restore empty JavaScript objects protected during JSON transport.
 * json_decode(..., true) otherwise turns both {} and [] into the same PHP []. */
function configwriter_restore_editor_value($value, $depth = 0)
{
    if ($depth > 8 || !is_array($value)) {
        return $value;
    }
    if (count($value) === 1
        && isset($value['__dashticz_empty_object__'])
        && $value['__dashticz_empty_object__'] === true
    ) {
        return new stdClass();
    }
    foreach ($value as $key => $nestedValue) {
        $value[$key] = configwriter_restore_editor_value($nestedValue, $depth + 1);
    }
    return $value;
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
         * allow following short tiles to fill the space beside it.
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
        $packedBlocks = array_map(function ($item) {
            return $item['ref'];
        }, $row);

        /*
         * Step 3 — calculate the short-tile space beside the tall tile.
         *
         * Child widths remain based on the full grid; this value is used only
         * to decide how many following tiles fit beside the tall tile.
         *
         * The full-width parent column lets the dashboard's float layout place
         * the side-pocket tiles without scaling their configured widths.
         */
        $sideWidth = max(1, $columnWidth - $tall['width']);

        /*
         * Step 4 — how many extra short rows still fit beside the tall tile?
         *
         * rowsBeside = floor(tallHeight / baseHeight) - 1
         * (the first baseHeight unit was already consumed by the short tiles
         * on the opening row). Pull those tiles now and append them to
         * packedBlocks before emitting the full-width parent column.
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
                $packedBlocks[] = $candidate['ref'];
                $sideRowWidth += $candidate['width'];
                $added++;
                $index++;
            }

            if ($added === 0) {
                break;
            }
        }

        /*
         * Keep every tile in one full-width parent column. Tile widths are
         * already expressed on the same 12-column grid; nesting them inside
         * narrower side columns scales them a second time and changes both
         * their visual width and order after saving. The dashboard's float
         * layout packs the short tiles beside the tall tile within this column.
         */
        $packed[] = [
            'key' => $keyPrefix . $columnNumber++,
            'blocks' => $packedBlocks,
            'width' => $columnWidth,
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
 * Managed editor column keys as a JavaScript RegExp literal (including slashes).
 */
function configwriter_managed_column_regex_js()
{
    return configwriter_managed_column_pattern();
}

/**
 * Editor section markers. Screen 1 keeps legacy markers for backward compatibility.
 * Screen 0 = standby overlay.
 *
 * @return array{0:string,1:string} [start, end]
 */
function configwriter_editor_markers($kind, $screenNumber = 1)
{
    $n = (int)$screenNumber;
    if ($n === 0) {
        return [
            '// [' . $kind . '-editor-standby-start]',
            '// [' . $kind . '-editor-standby-end]',
        ];
    }
    if ($n === 1) {
        return ['// [' . $kind . '-editor-start]', '// [' . $kind . '-editor-end]'];
    }
    return [
        '// [' . $kind . '-editor-s' . $n . '-start]',
        '// [' . $kind . '-editor-s' . $n . '-end]',
    ];
}

/**
 * Column key prefix for packed editor columns on a given screen.
 */
function configwriter_column_prefix($kind, $screenNumber = 1)
{
    $n = (int)$screenNumber;
    if ($n === 0) {
        return $kind . '_standby_col';
    }
    if ($n === 1) {
        return $kind . '_col';
    }
    return $kind . '_s' . $n . '_col';
}

/**
 * Return the numbered dashboard screens referenced anywhere in CONFIG.js.
 */
function configwriter_extract_numbered_screens($config)
{
    if (!preg_match_all(
        '/\bscreens\s*\[\s*(\d{1,2})\s*\]/',
        $config,
        $matches
    )) {
        return [];
    }

    $screens = [];
    foreach ($matches[1] as $screenNumber) {
        $n = (int)$screenNumber;
        if ($n >= 1 && $n <= 99) {
            $screens[$n] = true;
        }
    }
    $screens = array_keys($screens);
    sort($screens, SORT_NUMERIC);
    return $screens;
}

/**
 * Remove one numbered screen and compact every higher editor/runtime reference.
 */
function configwriter_remove_numbered_screen_and_compact($config, $screenNumber)
{
    $removed = (int)$screenNumber;
    if ($removed < 1 || $removed > 99) {
        return $config;
    }

    foreach (['device', 'widget', 'layout', 'dashboard', 'grid-layout'] as $kind) {
        list($startMarker, $endMarker) = configwriter_editor_markers(
            $kind,
            $removed
        );
        $config = configwriter_remove_section($config, $startMarker, $endMarker);
    }

    $screenPattern = '/^[ \t]*screens\s*\[\s*'
        . $removed
        . '\s*\](?:\s*\[\s*([\'"])[A-Za-z0-9_]+\1\s*\])?\s*=/m';
    $config = configwriter_remove_assignment_statements(
        $config,
        $screenPattern,
        true
    );

    // Generated screen initialisers and column guards are single-line statements.
    $config = preg_replace(
        '/^[ \t]*if\s*\([^\r\n]*\bscreens\s*\[\s*'
            . $removed
            . '\s*\][^\r\n]*(?:\r?\n|$)/m',
        '',
        $config
    );

    $config = preg_replace_callback(
        '/\bscreens\s*\[\s*(\d{1,2})\s*\]/',
        function ($match) use ($removed) {
            $n = (int)$match[1];
            return $n > $removed ? 'screens[' . ($n - 1) . ']' : $match[0];
        },
        $config
    );

    $config = preg_replace_callback(
        '/\/\/ \[(device|widget|layout|dashboard|grid-layout)-editor-s(\d{1,2})-(start|end)\]/',
        function ($match) use ($removed) {
            $n = (int)$match[2];
            if ($n <= $removed) {
                return $match[0];
            }
            $newNumber = $n - 1;
            $suffix = $newNumber === 1 ? '' : '-s' . $newNumber;
            return '// [' . $match[1] . '-editor' . $suffix . '-' . $match[3] . ']';
        },
        $config
    );

    $config = preg_replace_callback(
        '/\b(de|we|le)_s(\d{1,2})_col\b/',
        function ($match) use ($removed) {
            $n = (int)$match[2];
            if ($n <= $removed) {
                return $match[0];
            }
            $newNumber = $n - 1;
            return $match[1]
                . ($newNumber === 1 ? '' : '_s' . $newNumber)
                . '_col';
        },
        $config
    );

    return rtrim($config);
}

/**
 * Normalize and validate a screen number from request JSON.
 * Returns 0 for standby, or 1..99 for numbered screens.
 */
function configwriter_parse_screen_number($data, $default = 1)
{
    if (!is_array($data) || !array_key_exists('screen', $data)) {
        return max(1, (int)$default);
    }
    if ($data['screen'] === 'standby' || $data['screen'] === 'S' || $data['screen'] === 0 || $data['screen'] === '0') {
        return 0;
    }
    $n = (int)$data['screen'];
    if ($n < 1 || $n > 99) {
        dashticz_json_error(400, 'Invalid screen number.');
    }
    return $n;
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
    $managedRe = configwriter_managed_column_regex_js();

    $out = "if (typeof screens === 'undefined') var screens = {}\n"
        . "if (typeof screens[{$n}] === 'undefined') screens[{$n}] = {}\n";

    if ($mode === 'replace') {
        // Keep non-managed columns (e.g. hand-written ones), then set the full list.
        $out .= "screens[{$n}]['columns'] = (Array.isArray(screens[{$n}]['columns']) "
            . "? screens[{$n}]['columns'].filter(function (columnKey) {"
            . " return !{$managedRe}.test(String(columnKey)); })"
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

/**
 * Emit a new empty screens[N] definition (for the screen switcher "+" action).
 */
function configwriter_emit_new_screen($screenNumber, $background = '')
{
    $n = max(1, (int)$screenNumber);
    $bg = is_string($background) ? trim($background) : '';
    $out = "if (typeof screens === 'undefined') var screens = {}\n"
        . "if (typeof screens[{$n}] === 'undefined') screens[{$n}] = {}\n"
        . "if (!Array.isArray(screens[{$n}]['columns'])) screens[{$n}]['columns'] = []\n";
    if ($bg !== '') {
        $safe = configwriter_js_string_escape($bg);
        $out .= "if (typeof screens[{$n}]['background'] === 'undefined') "
            . "screens[{$n}]['background'] = '{$safe}'\n";
    }
    return $out;
}

/**
 * Replace or append a marked screens-editor section that adds screens[N].
 */
function configwriter_replace_screens_section($config, $screenNumber, $background = '')
{
    $startMarker = '// [screens-editor-start]';
    $endMarker = '// [screens-editor-end]';
    $n = max(1, (int)$screenNumber);

    // Keep previously added screens by appending inside the same marked section.
    $existingBody = '';
    $startPos = strpos($config, $startMarker);
    if ($startPos !== false) {
        $endPos = strpos($config, $endMarker, $startPos);
        if ($endPos !== false) {
            $existingBody = trim(substr(
                $config,
                $startPos + strlen($startMarker),
                $endPos - $startPos - strlen($startMarker)
            ));
        }
    }

    $config = configwriter_remove_section($config, $startMarker, $endMarker);

    $body = '';
    if ($existingBody !== '') {
        // Drop a duplicated SCREENS section header if we re-wrap the body.
        $existingBody = preg_replace(
            '/^\/\/\s*-{5,}.*\R\/\/\s*SCREENS.*\R\/\/\s*-{5,}.*\R?/m',
            '',
            $existingBody,
            1
        );
        $body .= trim($existingBody) . "\n";
    }
    $body = configwriter_section_header('SCREENS') . "\n" . $body;
    $body .= configwriter_emit_new_screen($n, $background);

    return rtrim($config) . configwriter_wrap_section($startMarker, $endMarker, $body);
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

    $prefix = configwriter_column_prefix('le', $screenNumber);
    $columnKeys = [];
    foreach (configwriter_pack_columns_by_height($items, $columnWidth, $prefix) as $column) {
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
 * Build a standby layout section including block definitions used on standby.
 */
function configwriter_build_standby_layout_section($blockLines, $items, $width = 12)
{
    $section = configwriter_section_header('BLOCKS') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";

    $blockKeys = [];
    $usedRefs = [];
    foreach ($items as $item) {
        if (!isset($item['ref']) || !is_string($item['ref'])) {
            continue;
        }
        $ref = $item['ref'];
        $blockKeys[] = $ref;
        if (isset($blockLines[$ref]) && !isset($usedRefs[$ref])) {
            $section .= "blocks['" . $ref . "'] = " . $blockLines[$ref] . "\n";
            $usedRefs[$ref] = true;
        }
    }

    $section .= "\n" . configwriter_emit_columns_standby($blockKeys, $width);
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

function configwriter_extract_declared_block_refs($config)
{
    $refs = [];
    if (preg_match_all(
        '/blocks\s*\[\s*([\'"])([A-Za-z_][A-Za-z0-9_]*)\1\s*\]\s*=/',
        $config,
        $matches
    )) {
        foreach ($matches[2] as $ref) {
            $refs[$ref] = true;
        }
    }
    return $refs;
}

function configwriter_normalise_grid_position($grid, $gridColumns, $fallbackY = 1)
{
    $columns = max(1, min(100, (int)$gridColumns));
    $x = isset($grid['x']) ? (int)$grid['x'] : 1;
    $y = isset($grid['y']) ? (int)$grid['y'] : (int)$fallbackY;
    $w = isset($grid['w']) ? (int)$grid['w'] : $columns;
    $h = isset($grid['h']) ? (int)$grid['h'] : 1;

    $x = max(1, min($columns, $x));
    $y = max(1, min(10000, $y));
    $w = max(1, min($columns - $x + 1, $w));
    $h = max(1, min(1000, $h));

    return ['x' => $x, 'y' => $y, 'w' => $w, 'h' => $h];
}

function configwriter_build_grid_layout_section(
    $items,
    $screenNumber,
    $gridColumns,
    $rowHeight,
    $gap,
    $mobileLayout = 'stack'
) {
    $n = max(0, min(99, (int)$screenNumber));
    $columns = max(1, min(100, (int)$gridColumns));
    $row = max(1, min(2000, (int)$rowHeight));
    $gridGap = max(0, min(200, (float)$gap));
    $mobile = $mobileLayout === 'stack' ? 'stack' : 'stack';
    $blockEntries = [];

    $section = configwriter_section_header('GRID LAYOUT') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";
    foreach ($items as $index => $item) {
        $ref = $item['ref'];
        $position = configwriter_normalise_grid_position(
            $item['grid'],
            $columns,
            $index + 1
        );
        $inlineGrid = configwriter_format_props($position);
        if (isset($item['propsLiteral']) && is_string($item['propsLiteral'])) {
            $section .= "blocks['" . $ref . "'] = "
                . $item['propsLiteral'] . ";\n";
            $section .= "blocks['" . $ref . "']['grid'] = "
                . $inlineGrid . ";\n";
        } elseif (isset($item['props']) && is_array($item['props'])) {
            $props = $item['props'];
            $props['grid'] = $position;
            $section .= configwriter_emit_block_line($ref, $props);
        }
        /* Every item stores its per-screen grid position as an inline
         * {key, grid} descriptor so that the same block key can appear
         * on multiple screens each with its own independent position.
         * renderGridScreen prefers this inline grid over blocks['ref']['grid']. */
        $blockEntries[] = "{key:'" . configwriter_js_string_escape($ref)
            . "', grid:" . $inlineGrid . "}";
    }

    if ($n === 0) {
        $section .= "\nif (typeof standby_screen === 'undefined') var standby_screen = {}\n";
        $target = 'standby_screen';
    } else {
        $section .= "\nif (typeof screens === 'undefined') var screens = {}\n";
        $section .= "if (typeof screens[" . $n . "] === 'undefined') screens[" . $n . "] = {};\n";
        $target = 'screens[' . $n . ']';
    }
    $section .= $target . "['layout'] = 'grid';\n";
    $section .= $target . "['gridColumns'] = " . $columns . ";\n";
    $section .= $target . "['rowHeight'] = " . $row . ";\n";
    $section .= $target . "['gap'] = " . $gridGap . ";\n";
    $section .= $target . "['mobileLayout'] = '" . $mobile . "';\n";
    $section .= $target . "['blocks'] = ["
        . implode(', ', $blockEntries) . "];\n";

    return $section;
}

function configwriter_extract_block_lines($config)
{
    $blocks = [];
    if (!preg_match_all(
        '/blocks\s*\[\s*([\'"])([^\'"]+)\1\s*\]\s*=\s*\{/',
        $config,
        $matches,
        PREG_SET_ORDER | PREG_OFFSET_CAPTURE
    )) {
        return $blocks;
    }

    foreach ($matches as $match) {
        $key = $match[2][0];
        $matchText = $match[0][0];
        $objectStart = $match[0][1] + strrpos($matchText, '{');
        $depth = 0;
        $quote = null;
        $escaped = false;
        $length = strlen($config);

        for ($index = $objectStart; $index < $length; $index++) {
            $char = $config[$index];
            if ($quote !== null) {
                if ($escaped) {
                    $escaped = false;
                } elseif ($char === '\\') {
                    $escaped = true;
                } elseif ($char === $quote) {
                    $quote = null;
                }
                continue;
            }
            if ($char === "'" || $char === '"' || $char === '`') {
                $quote = $char;
                continue;
            }
            if ($char === '{') {
                $depth++;
            } elseif ($char === '}') {
                $depth--;
                if ($depth === 0) {
                    $blocks[$key] = substr(
                        $config,
                        $objectStart,
                        $index - $objectStart + 1
                    );
                    break;
                }
            }
        }
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

/** Build a stable editor-managed key from a Domoticz IDX and optional sub-IDX. */
function configwriter_make_device_block_key($idx, $subidx, &$usedKeys)
{
    $key = 'device_' . (int)$idx;
    if ((int)$subidx > 0) {
        $key .= '_' . (int)$subidx;
    }
    return configwriter_make_block_key($key, $usedKeys);
}

function configwriter_device_block_props($device, $defaultWidth = 3)
{
    $rawIdx = $device['idx'];
    $isGroup = !empty($device['isGroup'])
        || (is_string($rawIdx) && preg_match('/^s\d+$/', $rawIdx));

    $title = isset($device['name']) ? (string)$device['name'] : ($isGroup ? (string)$rawIdx : ('Device ' . (int)$rawIdx));
    $width = isset($device['width']) ? (int)$device['width'] : $defaultWidth;
    $width = max(1, min(12, $width));

    $props = [
        'width' => $width,
        'hide_data' => true,
        'last_update' => false,
        'switch' => false,
    ];
    if (array_key_exists('hide_data', $device)) {
        $props['hide_data'] = !empty($device['hide_data']);
    }
    if (array_key_exists('last_update', $device)) {
        $props['last_update'] = !empty($device['last_update']);
    }
    if (array_key_exists('switch', $device)) {
        $props['switch'] = !empty($device['switch']);
    }
    if (array_key_exists('icon', $device) && $device['icon'] !== null) {
        $props['icon'] = (string)$device['icon'];
    }
    if (isset($device['title']) && trim((string)$device['title']) !== '') {
        $props['title'] = substr(trim((string)$device['title']), 0, 100);
    }
    if (!empty($device['hide_title'])) {
        $props['hide_title'] = true;
    }
    if (!$isGroup) {
        $idx = (int)$rawIdx;
        if (!empty($device['subidx']) && (int)$device['subidx'] > 0) {
            $props['idx'] = $idx . '_' . (int)$device['subidx'];
        } else {
            $props['idx'] = $idx;
        }
    }
    /* For groups/scenes the block key is the scene reference (e.g. 's1'),
     * so no idx property is needed in the block definition itself. Keep an
     * explicit editor title when one was supplied; otherwise use the Domoticz
     * group/scene name as before. */
    if ($isGroup && (!isset($device['title']) || trim((string)$device['title']) === '')) {
        $props['title'] = $title;
    }

    if (isset($device['height']) && is_int($device['height'])) {
        $props['height'] = $device['height'];
    }

    if (!empty($device['custom_fields']) && is_array($device['custom_fields'])) {
        // Custom fields are validated by saveblocks.php and merged last so they
        // remain typed CONFIG.js properties without replacing editor-owned keys.
        foreach ($device['custom_fields'] as $field => $value) {
            $props[$field] = $value;
        }
    }

    return $props;
}

/** Build the exact CONFIG.js properties for Device Editor helper blocks. */
function configwriter_special_block_props($block)
{
    $kind = isset($block['kind']) ? $block['kind'] : '';
    $width = isset($block['width']) ? (int)$block['width'] : ($kind === 'title' ? 12 : 3);
    $width = max(1, min(12, $width));
    $title = isset($block['name']) ? (string)$block['name'] : '';

    if ($kind === 'title') {
        $props = [
            'width' => $width,
            'type' => 'blocktitle',
            'title' => $title,
            'height' => isset($block['height']) && is_int($block['height'])
                ? $block['height']
                : 120,
        ];
        if (array_key_exists('icon', $block) && $block['icon'] !== null && $block['icon'] !== '') {
            $props['icon'] = (string)$block['icon'];
        }
    } elseif ($kind === 'slidebutton') {
        $props = [
            'width' => $width,
            'slide' => isset($block['slide']) ? max(1, (int)$block['slide']) : 1,
            'key' => isset($block['button_key']) && trim((string)$block['button_key']) !== ''
                ? substr(trim((string)$block['button_key']), 0, 100)
                : (trim($title) !== '' ? substr(trim($title), 0, 100) : 'Slide'),
        ];
        if (trim($title) !== '') {
            $props['title'] = $title;
        }
        if (array_key_exists('icon', $block) && $block['icon'] !== null && $block['icon'] !== '') {
            $props['icon'] = (string)$block['icon'];
        }
    } elseif ($kind === 'custom') {
        $props = [
            'idx' => (int)$block['idx'],
            'width' => $width,
        ];
        if (trim($title) !== '') {
            $props['title'] = $title;
        }
        if (array_key_exists('icon', $block) && $block['icon'] !== null && $block['icon'] !== '') {
            $props['icon'] = (string)$block['icon'];
        }
        if (!empty($block['hide_data'])) {
            $props['hide_data'] = true;
        }
        if (!empty($block['last_update'])) {
            $props['last_update'] = true;
        }
        if (!empty($block['switch'])) {
            $props['switch'] = true;
        }
    } else {
        $props = [
            'idx' => (int)$block['idx'],
            'width' => $width,
            'title' => $title,
        ];
        if (array_key_exists('icon', $block) && $block['icon'] !== null) {
            $props['icon'] = (string)$block['icon'];
        }
        $props['hide_data'] = !empty($block['hide_data']);
        $props['last_update'] = !empty($block['last_update']);
        $props['switch'] = !empty($block['switch']);
    }
    if (!empty($block['hide_title'])) {
        $props['hide_title'] = true;
    }
    if ($kind !== 'title' && isset($block['height']) && is_int($block['height'])) {
        $props['height'] = $block['height'];
    }
    if (!empty($block['custom_fields']) && is_array($block['custom_fields'])) {
        foreach ($block['custom_fields'] as $field => $value) {
            $props[$field] = $value;
        }
    }
    return $props;
}

/**
 * TAAK1: keep widgets/devices/custom devices/separators ('tussenbalk') and
 * slide buttons unique per screen.
 *
 * Map every block ref declared inside a screen's own editor-managed
 * sections (device/widget/grid-layout) to the screen number that "owns" it
 * (0 = standby, 1..99 = numbered screens). A ref not found in any of these
 * sections (e.g. a hand-written CONFIG.js block) is left unmapped, since
 * hand-written blocks are already shared on purpose.
 *
 * Only sections belonging to $excludeScreenNumber are skipped, since the
 * calling save-endpoint has typically already stripped and is about to
 * rewrite its own section for that screen.
 */
function configwriter_extract_screen_block_owners($config, $excludeScreenNumber = null)
{
    $owners = [];
    $kinds = ['device', 'widget', 'grid-layout'];
    $screenNumbers = array_merge([0], configwriter_extract_numbered_screens($config));

    foreach ($screenNumbers as $screenNumber) {
        if ($excludeScreenNumber !== null
            && (int)$screenNumber === (int)$excludeScreenNumber
        ) {
            continue;
        }
        foreach ($kinds as $kind) {
            list($startMarker, $endMarker) = configwriter_editor_markers(
                $kind,
                $screenNumber
            );
            $section = configwriter_extract_wrapped_section(
                $config,
                $startMarker,
                $endMarker
            );
            if ($section === '') {
                continue;
            }
            foreach (configwriter_extract_declared_block_refs($section) as $ref => $true) {
                if (!isset($owners[$ref])) {
                    $owners[$ref] = $screenNumber;
                }
            }
        }
    }

    return $owners;
}

/** Stable, readable prefix used when a key must be cloned for a screen. */
function configwriter_screen_key_prefix($screenNumber)
{
    $n = (int)$screenNumber;
    return $n === 0 ? 'screen_standby_' : 'screen' . $n . '_';
}

/**
 * If $key already belongs to a *different* screen than $screenNumber
 * (per $owners, from configwriter_extract_screen_block_owners), return a
 * new, screen-prefixed, still-unique key instead so the two screens stop
 * sharing one block definition. Otherwise $key is returned unchanged.
 */
function configwriter_ensure_screen_owned_key($key, $screenNumber, $owners, &$usedKeys)
{
    if ($key === null || $key === '') {
        return $key;
    }
    if (!isset($owners[$key]) || (int)$owners[$key] === (int)$screenNumber) {
        return $key;
    }
    $prefixed = configwriter_screen_key_prefix($screenNumber) . $key;
    return configwriter_make_block_key($prefixed, $usedKeys);
}
