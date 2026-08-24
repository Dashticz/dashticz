<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$customFolder = isset($_POST['custom_folder']) ? trim((string) $_POST['custom_folder']) : 'custom';
if (!preg_match('/^[A-Za-z0-9_-]+$/', $customFolder)) {
    dashticz_json_error(400, 'Invalid custom folder.');
}
$customDir = __DIR__ . '/../' . $customFolder;
$customJsPath = $customDir . '/custom.js';
$source = isset($_POST['source']) ? trim((string) $_POST['source']) : '';
$rulesJson = isset($_POST['rules']) ? (string) $_POST['rules'] : '[]';
$handler = isset($_POST['custom_js_handler'])
    ? trim((string) $_POST['custom_js_handler'])
    : '';
$cssFile = isset($_POST['css_file']) ? trim((string) $_POST['css_file']) : 'custom.css';

if ($source === '' || strlen($source) > 200 || preg_match('/[\x00-\x1F\x7F]/', $source)) {
    dashticz_json_error(400, 'Invalid Device Rules source block.');
}
if (!preg_match('/^[A-Za-z0-9_-]+\.css$/', $cssFile)) {
    dashticz_json_error(400, 'Invalid custom CSS filename.');
}
if (strlen($rulesJson) > 32768 || strlen($handler) > 100) {
    dashticz_json_error(413, 'Device Rules payload is too large.');
}
if ($handler !== '' && !preg_match('/^(?:getStatus_)?[A-Za-z_$][A-Za-z0-9_$]*$/', $handler)) {
    dashticz_json_error(400, 'Invalid custom.js handler name.');
}

$decodedRules = json_decode($rulesJson, true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($decodedRules)) {
    dashticz_json_error(400, 'Invalid Device Rules payload.');
}
if (count($decodedRules) > 50) {
    dashticz_json_error(400, 'Too many Device Rules in one source block.');
}

$allowedOperators = array(
    'eq', 'ne', 'lt', 'lte', 'gt', 'gte',
    'contains', 'notcontains', 'empty', 'notempty',
);
$allowedModes = array(
    'existing', 'background', 'border', 'text',
    'background-border', 'background-text', 'background-border-text',
);
$allowedBorderStyles = array('solid', 'dashed', 'dotted', 'double');

function device_rules_valid_hex_color($value)
{
    $value = strtolower(trim((string) $value));
    return preg_match('/^#[0-9a-f]{6}$/', $value) ? $value : null;
}

function device_rules_safe_property($value)
{
    $value = trim((string) $value);
    if ($value === '' || strlen($value) > 120) {
        return null;
    }
    if (!preg_match('/^[A-Za-z_$][A-Za-z0-9_$]*(?:\.[A-Za-z_$][A-Za-z0-9_$]*)*$/', $value)) {
        return null;
    }
    foreach (explode('.', strtolower($value)) as $part) {
        if (in_array($part, array('__proto__', 'prototype', 'constructor'), true)) {
            return null;
        }
    }
    return $value;
}

function device_rules_safe_target($value)
{
    $value = trim((string) $value);
    if ($value === '' || strlen($value) > 200 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
        return null;
    }
    return $value;
}

function device_rules_safe_class_list($value)
{
    $value = trim((string) $value);
    if ($value === '' || strlen($value) > 200) {
        return null;
    }
    $classes = preg_split('/\s+/', $value);
    if (!$classes || count($classes) > 10) {
        return null;
    }
    foreach ($classes as $className) {
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $className)) {
            return null;
        }
    }
    return implode(' ', $classes);
}

function device_rules_mode_uses($mode, $part)
{
    return in_array($part, explode('-', $mode), true);
}

function device_rules_rgba($hex, $opacity)
{
    $raw = substr($hex, 1);
    $red = hexdec(substr($raw, 0, 2));
    $green = hexdec(substr($raw, 2, 2));
    $blue = hexdec(substr($raw, 4, 2));
    return 'rgba(' . $red . ', ' . $green . ', ' . $blue . ', '
        . number_format($opacity, 2, '.', '') . ')';
}

function device_rules_normalize_style($style)
{
    global $allowedModes, $allowedBorderStyles;

    if (!is_array($style)) {
        $style = array();
    }
    $mode = isset($style['mode']) ? (string) $style['mode'] : 'existing';
    if (!in_array($mode, $allowedModes, true)) {
        return array(null, 'Invalid Device Rules style mode.');
    }

    $backgroundColor = device_rules_valid_hex_color(
        isset($style['backgroundColor']) ? $style['backgroundColor'] : '#ff0000'
    );
    $backgroundOpacity = isset($style['backgroundOpacity'])
        ? (float) $style['backgroundOpacity']
        : 0.35;
    $borderWidth = isset($style['borderWidth']) ? (int) $style['borderWidth'] : 2;
    $borderStyle = isset($style['borderStyle']) ? (string) $style['borderStyle'] : 'solid';
    $borderColor = device_rules_valid_hex_color(
        isset($style['borderColor']) ? $style['borderColor'] : '#ff4040'
    );
    $textColor = device_rules_valid_hex_color(
        isset($style['textColor']) ? $style['textColor'] : '#ffffff'
    );

    if ($backgroundColor === null || $backgroundOpacity < 0.05 || $backgroundOpacity > 1) {
        return array(null, 'Invalid Device Rules background styling.');
    }
    if (
        $borderWidth < 1 ||
        $borderWidth > 8 ||
        !in_array($borderStyle, $allowedBorderStyles, true) ||
        $borderColor === null
    ) {
        return array(null, 'Invalid Device Rules border styling.');
    }
    if ($textColor === null) {
        return array(null, 'Invalid Device Rules text styling.');
    }

    return array(array(
        'mode' => $mode,
        'backgroundColor' => $backgroundColor,
        'backgroundOpacity' => round($backgroundOpacity, 2),
        'borderWidth' => $borderWidth,
        'borderStyle' => $borderStyle,
        'borderColor' => $borderColor,
        'textColor' => $textColor,
    ), null);
}

function device_rules_managed_markers($kind, $sourceHash)
{
    return array(
        '/* [dashticz-device-rules-' . $kind . ':' . $sourceHash . ':start] */',
        '/* [dashticz-device-rules-' . $kind . ':' . $sourceHash . ':end] */',
    );
}

function device_rules_remove_managed_block($contents, $kind, $sourceHash)
{
    list($startMarker, $endMarker) = device_rules_managed_markers($kind, $sourceHash);
    $start = strpos($contents, $startMarker);
    if ($start === false) {
        return array($contents, null);
    }
    $end = strpos($contents, $endMarker, $start + strlen($startMarker));
    if ($end === false) {
        return array(null, 'Managed Device Rules ' . $kind . ' block is incomplete.');
    }
    $end += strlen($endMarker);

    $before = rtrim(substr($contents, 0, $start), " \t\r\n");
    $after = ltrim(substr($contents, $end), " \t\r\n");
    if ($before === '') {
        return array($after, null);
    }
    if ($after === '') {
        return array($before . "\n", null);
    }
    return array($before . "\n\n" . $after, null);
}

function device_rules_append_managed_block($contents, $block)
{
    $contents = rtrim($contents, " \t\r\n");
    if ($contents !== '') {
        $contents .= "\n\n";
    }
    return $contents . $block . "\n";
}

function device_rules_css_for_rules($rules)
{
    $classes = array();
    foreach ($rules as $rule) {
        $style = $rule['style'];
        $mode = $style['mode'];
        if ($mode === 'existing') {
            continue;
        }
        $className = $rule['className'];
        if (!preg_match('/^[A-Za-z_][A-Za-z0-9_-]*$/', $className)) {
            // Disabled/incomplete draft rules do not get generated CSS.
            continue;
        }
        $declarations = array();
        if (device_rules_mode_uses($mode, 'background')) {
            $declarations[] = '  background: '
                . device_rules_rgba($style['backgroundColor'], $style['backgroundOpacity'])
                . ' !important;';
        }
        if (device_rules_mode_uses($mode, 'border')) {
            $declarations[] = '  border: ' . $style['borderWidth'] . 'px '
                . $style['borderStyle'] . ' ' . $style['borderColor'] . ' !important;';
        }
        if (device_rules_mode_uses($mode, 'text')) {
            $declarations[] = '  color: ' . $style['textColor'] . ' !important;';
        }
        if ($declarations) {
            // Last rule using the same class within this source wins.
            $classes[$className] = '.' . $className . " {\n"
                . implode("\n", $declarations) . "\n}";
        }
    }
    return implode("\n\n", array_values($classes));
}

function device_rules_preflight_file($path, $customDir, $label)
{
    if (file_exists($path)) {
        if (is_link($path) || !is_file($path)) {
            return $label . ' is not a regular file.';
        }
        if (filesize($path) > 1048576) {
            return $label . ' is too large for automatic Device Rules updates.';
        }
        if (!is_writable($path)) {
            @chmod($path, 0664);
        }
        if (!is_writable($path)) {
            return $label . ' is not writable by the web server'
                . dashticz_owner_info($path)
                . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access.sh';
        }
    } elseif (!is_writable($customDir)) {
        return 'The custom directory is not writable by the web server'
            . dashticz_owner_info($customDir)
            . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access.sh';
    }
    return null;
}

$rules = array();
foreach ($decodedRules as $index => $rule) {
    if (!is_array($rule)) {
        dashticz_json_error(400, 'Invalid Device Rule at index ' . $index . '.');
    }
    $enabled = !isset($rule['enabled']) || $rule['enabled'] !== false;
    $propertyRaw = isset($rule['property']) ? trim((string) $rule['property']) : '';
    $property = $propertyRaw === '' ? '' : device_rules_safe_property($propertyRaw);
    $operator = isset($rule['operator']) ? (string) $rule['operator'] : 'eq';
    $value = isset($rule['value']) ? (string) $rule['value'] : '';
    $targetRaw = isset($rule['target']) ? trim((string) $rule['target']) : '';
    $target = $targetRaw === '' ? '' : device_rules_safe_target($targetRaw);
    $classRaw = isset($rule['className'])
        ? trim((string) $rule['className'])
        : (isset($rule['class']) ? trim((string) $rule['class']) : '');
    $className = $classRaw === '' ? '' : device_rules_safe_class_list($classRaw);

    if ($propertyRaw !== '' && $property === null) {
        dashticz_json_error(400, 'Invalid Device Rule property at index ' . $index . '.');
    }
    if (!in_array($operator, $allowedOperators, true)) {
        dashticz_json_error(400, 'Invalid Device Rule operator at index ' . $index . '.');
    }
    if (strlen($value) > 500) {
        dashticz_json_error(400, 'Device Rule value is too long at index ' . $index . '.');
    }
    if ($targetRaw !== '' && $target === null) {
        dashticz_json_error(400, 'Invalid Device Rule target at index ' . $index . '.');
    }
    if ($classRaw !== '' && $className === null) {
        dashticz_json_error(400, 'Invalid Device Rule CSS class at index ' . $index . '.');
    }

    list($style, $styleError) = device_rules_normalize_style(
        isset($rule['style']) ? $rule['style'] : array('mode' => 'existing')
    );
    if ($styleError !== null) {
        dashticz_json_error(400, $styleError);
    }

    if ($enabled) {
        if ($property === '' || $target === '' || $className === '') {
            dashticz_json_error(400, 'Enabled Device Rules require property, target and CSS class.');
        }
        if ($operator !== 'empty' && $operator !== 'notempty' && trim($value) === '') {
            dashticz_json_error(400, 'Enabled Device Rules require a comparison value.');
        }
    }
    if ($style['mode'] !== 'existing' && $className !== '' && strpos($className, ' ') !== false) {
        dashticz_json_error(400, 'Generated styling requires exactly one CSS class name.');
    }

    $rules[] = array(
        'enabled' => $enabled,
        'property' => $property,
        'operator' => $operator,
        'value' => $value,
        'action' => 'class',
        'target' => $target,
        'className' => $className,
        'style' => $style,
    );
}

if (is_link($customDir) || !is_dir($customDir)) {
    dashticz_json_error(500, 'The custom directory is unavailable or unsafe.');
}

$cssPath = $customDir . '/' . $cssFile;
$preflight = device_rules_preflight_file($customJsPath, $customDir, 'custom.js');
if ($preflight !== null) {
    dashticz_json_error(500, $preflight);
}
$preflight = device_rules_preflight_file($cssPath, $customDir, $cssFile);
if ($preflight !== null) {
    dashticz_json_error(500, $preflight);
}

$jsLock = dashticz_acquire_file_update_lock($customJsPath);
if ($jsLock === false) {
    dashticz_json_error(500, 'Unable to lock custom.js for a Device Rules update.');
}
$cssLock = dashticz_acquire_file_update_lock($cssPath);
if ($cssLock === false) {
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(500, 'Unable to lock ' . $cssFile . ' for a Device Rules update.');
}

$originalJs = file_exists($customJsPath) ? @file_get_contents($customJsPath) : '';
$originalCss = file_exists($cssPath) ? @file_get_contents($cssPath) : '';
if ($originalJs === false || $originalCss === false) {
    dashticz_release_file_update_lock($cssLock);
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(500, 'Unable to read custom.js or ' . $cssFile . '.');
}

$sourceHash = hash('sha256', $source);
list($updatedJs, $jsRemoveError) = device_rules_remove_managed_block(
    $originalJs,
    'js',
    $sourceHash
);
if ($jsRemoveError !== null) {
    dashticz_release_file_update_lock($cssLock);
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(409, $jsRemoveError);
}
list($updatedCss, $cssRemoveError) = device_rules_remove_managed_block(
    $originalCss,
    'css',
    $sourceHash
);
if ($cssRemoveError !== null) {
    dashticz_release_file_update_lock($cssLock);
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(409, $cssRemoveError);
}

if (count($rules) > 0 || $handler !== '') {
    $entry = array(
        'rules' => $rules,
        'customJsHandler' => $handler,
    );
    $sourceJson = json_encode(
        $source,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
    );
    $entryJson = json_encode(
        $entry,
        JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_PRETTY_PRINT
    );
    if ($sourceJson === false || $entryJson === false) {
        dashticz_release_file_update_lock($cssLock);
        dashticz_release_file_update_lock($jsLock);
        dashticz_json_error(500, 'Unable to encode Device Rules for custom.js.');
    }
    list($jsStart, $jsEnd) = device_rules_managed_markers('js', $sourceHash);
    $jsBlock = $jsStart . "\n"
        . 'window.DashticzDeviceRulesConfig = window.DashticzDeviceRulesConfig || {};' . "\n"
        . 'window.DashticzDeviceRulesConfig[' . $sourceJson . '] = ' . $entryJson . ';' . "\n"
        . $jsEnd;
    $updatedJs = device_rules_append_managed_block($updatedJs, $jsBlock);
}

$generatedCss = device_rules_css_for_rules($rules);
if ($generatedCss !== '') {
    list($cssStart, $cssEnd) = device_rules_managed_markers('css', $sourceHash);
    $cssBlock = $cssStart . "\n" . $generatedCss . "\n" . $cssEnd;
    $updatedCss = device_rules_append_managed_block($updatedCss, $cssBlock);
}

// Write CSS first. If the following custom.js write fails, restore the original
// CSS best-effort so rules and styling do not intentionally diverge.
if (!dashticz_atomic_write_file($cssPath, rtrim($updatedCss) . "\n", 0664)) {
    dashticz_release_file_update_lock($cssLock);
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(500, 'Unable to write ' . $cssFile . '.');
}
if (!dashticz_atomic_write_file($customJsPath, rtrim($updatedJs) . "\n", 0664)) {
    dashticz_atomic_write_file($cssPath, rtrim($originalCss) . "\n", 0664);
    dashticz_release_file_update_lock($cssLock);
    dashticz_release_file_update_lock($jsLock);
    dashticz_json_error(500, 'Unable to write custom.js.');
}

dashticz_release_file_update_lock($cssLock);
dashticz_release_file_update_lock($jsLock);

header('Content-Type: application/json');
header('Cache-Control: no-store');
echo json_encode(array(
    'success' => true,
    'source' => $source,
    'custom_js' => 'custom.js',
    'css_file' => $cssFile,
    'rules' => count($rules),
));
