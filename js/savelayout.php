<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$rawBody = file_get_contents('php://input');
$data = $rawBody !== false ? json_decode($rawBody, true) : null;
if (json_last_error() !== JSON_ERROR_NONE
    || !is_array($data)
    || !isset($data['items'])
    || !is_array($data['items'])
) {
    dashticz_json_error(400, 'Invalid layout items.');
}

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
    $items[] = [
        'ref' => $entry['ref'],
        'width' => max(1, min(12, $width)),
    ];
}

$customDir = __DIR__ . '/../custom';
$configPath = $customDir . '/CONFIG.js';
if (file_exists($configPath)) {
    $config = @file_get_contents($configPath);
    if ($config === false) {
        dashticz_json_error(500, 'Unable to read CONFIG.js.');
    }
    if (trim($config) === '#EMPTY#') {
        $config = "var config = {}\n";
    }
} else {
    $config = "var config = {}\n";
}

$startMarker = '// [layout-editor-start]';
$endMarker = '// [layout-editor-end]';
$startPos = strpos($config, $startMarker);
if ($startPos !== false) {
    $endPos = strpos($config, $endMarker, $startPos);
    if ($endPos !== false) {
        $config = substr($config, 0, $startPos)
            . substr($config, $endPos + strlen($endMarker));
    } else {
        $config = substr($config, 0, $startPos);
    }
}
$config = rtrim($config);

if (!empty($items)) {
    $section = "\n\n" . $startMarker . "\n";
    $section .= "if(typeof columns==='undefined') var columns={};\n";
    $columnKeys = [];
    foreach (_layoutChunks($items, 12) as $index => $chunk) {
        $columnKey = 'le_col' . ($index + 1);
        $columnKeys[] = $columnKey;
        $references = array_map(function ($item) {
            return $item['ref'];
        }, $chunk);
        $section .= "columns['" . $columnKey . "']={blocks:['"
            . implode("','", $references)
            . "'],width:12};\n";
    }

    $section .= "if(typeof screens==='undefined') var screens={};\n";
    $section .= "if(typeof screens[1]==='undefined') screens[1]={};\n";
    $section .= "if(!Array.isArray(screens[1]['columns'])) screens[1]['columns']=[];\n";
    $section .= "screens[1]['columns']=screens[1]['columns'].filter(function(columnKey){"
        . "return !/^(de|we|le)_col\\d+$/.test(String(columnKey));});\n";
    foreach ($columnKeys as $columnKey) {
        $section .= "screens[1]['columns'].push('" . $columnKey . "');\n";
    }
    $section .= $endMarker;
    $config .= $section;
}

if (!file_exists($configPath) && !is_writable($customDir)) {
    dashticz_json_error(
        500,
        'The directory "custom/" is not writable by the web server'
        . dashticz_owner_info($customDir)
        . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access'
    );
}
if (file_exists($configPath) && !is_writable($configPath)) {
    @chmod($configPath, 0664);
    if (!is_writable($configPath)) {
        dashticz_json_error(
            500,
            'CONFIG.js is not writable'
            . dashticz_owner_info($configPath)
            . '. From the Dashticz directory, run: sh tools/install-dashticz-write-access'
        );
    }
}
if (file_put_contents($configPath, $config . "\n", LOCK_EX) === false) {
    dashticz_json_error(500, 'Unable to write CONFIG.js.');
}
@chmod($configPath, 0664);

header('Content-Type: application/json');
echo json_encode(['success' => true]);

function _layoutChunks($items, $columnWidth)
{
    $chunks = [];
    $current = [];
    $width = 0;
    foreach ($items as $item) {
        if (!empty($current) && ($width + $item['width']) > $columnWidth) {
            $chunks[] = $current;
            $current = [];
            $width = 0;
        }
        $current[] = $item;
        $width += $item['width'];
    }
    if (!empty($current)) {
        $chunks[] = $current;
    }
    return $chunks;
}
