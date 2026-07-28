<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');

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
    || !isset($data['widgets'])
    || !is_array($data['widgets'])
) {
    dashticz_json_error(400, 'Invalid widgets list.');
}

$catalog = [
    'weather' => ['key' => 'widget_weather', 'width' => 12],
    'garbage' => ['key' => 'widget_garbage', 'width' => 6],
    'spotify' => ['key' => 'widget_spotify', 'width' => 6],
    'sonarr' => ['key' => 'widget_sonarr', 'width' => 8],
    'clock' => ['key' => 'widget_clock', 'width' => 4],
    'calendar' => ['key' => 'widget_calendar', 'width' => 8],
];

$widgets = [];
$seen = [];
foreach ($data['widgets'] as $entry) {
    if (!is_array($entry) || !isset($entry['id']) || !is_string($entry['id'])) {
        dashticz_json_error(400, 'Each widget must contain a valid id.');
    }

    $id = $entry['id'];
    if (!isset($catalog[$id])) {
        dashticz_json_error(400, 'Unknown widget id.');
    }
    if (isset($seen[$id])) {
        continue;
    }
    $seen[$id] = true;

    $widget = [
        'id' => $id,
        'key' => $catalog[$id]['key'],
        'width' => isset($entry['width'])
            ? max(1, min(12, (int)$entry['width']))
            : $catalog[$id]['width'],
        'height' => null,
    ];
    if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
        $height = (int)(round(((int)$entry['height']) / 10) * 10);
        $widget['height'] = max(50, min(2000, $height));
    }

    if ($id === 'weather') {
        $provider = isset($entry['provider']) && is_string($entry['provider'])
            ? $entry['provider']
            : 'openweather';
        if ($provider !== 'openweather' && $provider !== 'wunderground') {
            dashticz_json_error(400, 'Unknown weather provider.');
        }
        $widget['provider'] = $provider;
    }

    if ($id === 'calendar') {
        $icalurl = isset($entry['icalurl']) && is_string($entry['icalurl'])
            ? trim($entry['icalurl'])
            : '';
        if (strlen($icalurl) > 2048 || !preg_match('#^https?://[^\s]+$#i', $icalurl)) {
            dashticz_json_error(400, 'Calendar requires a valid http(s) ICS URL.');
        }
        $widget['icalurl'] = $icalurl;
    }

    if ($id === 'clock') {
        $clockType = isset($entry['clockType']) && is_string($entry['clockType'])
            ? $entry['clockType']
            : 'basicclock';
        $allowedClockTypes = ['basicclock', 'stationclock', 'flipclock', 'haymanclock', 'miniclock'];
        if (!in_array($clockType, $allowedClockTypes, true)) {
            dashticz_json_error(400, 'Unknown clock type.');
        }
        $widget['clockType'] = $clockType;
    }

    $widgets[] = $widget;
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

$config = _widgetRemoveSection(
    $config,
    '// [layout-editor-start]',
    '// [layout-editor-end]'
);

$startMarker = '// [widget-editor-start]';
$endMarker = '// [widget-editor-end]';
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

if (!empty($widgets)) {
    $section = "\n\n" . $startMarker . "\n";
    $section .= "if(typeof blocks==='undefined') var blocks={};\n";

    foreach ($widgets as $widget) {
        $width = $widget['width'];
        $height = $widget['height'] !== null
            ? ",height:" . $widget['height']
            : '';
        $section .= "blocks['" . $widget['key'] . "']=";
        switch ($widget['id']) {
            case 'weather':
                $weatherType = $widget['provider'] === 'wunderground'
                    ? 'wunderground'
                    : 'weather';
                $section .= "{type:'" . $weatherType . "',widget_provider:'"
                    . $widget['provider']
                    . "',width:" . $width . ",title:'Weer'" . $height . "}";
                break;
            case 'garbage':
                $section .= "{type:'garbage',width:" . $width . ",title:'Afval'" . $height . "}";
                break;
            case 'spotify':
                $section .= "{type:'spotify',width:" . $width . ",title:'Spotify'" . $height . "}";
                break;
            case 'sonarr':
                $section .= "{type:'sonarr',width:" . $width
                    . ",title:'Sonarr',title_position:'left',view:'banner'" . $height . "}";
                break;
            case 'clock':
                $section .= "{type:'" . $widget['clockType'] . "',width:"
                    . $width . ",title:'Klok'" . $height . "}";
                break;
            case 'calendar':
                $section .= "{type:'calendar',width:" . $width
                    . ",title:'Kalender',icalurl:'"
                    . _widgetJsStringEscape($widget['icalurl'])
                    . "'" . $height . "}";
                break;
        }
        $section .= ";\n";
    }

    $chunks = _widgetChunks($widgets, 12);
    $columnKeys = [];
    $section .= "if(typeof columns==='undefined') var columns={};\n";
    foreach ($chunks as $index => $chunk) {
        $columnKey = 'we_col' . ($index + 1);
        $columnKeys[] = $columnKey;
        $keys = array_map(function ($widget) {
            return $widget['key'];
        }, $chunk);
        $section .= "columns['" . $columnKey . "']={blocks:['"
            . implode("','", $keys)
            . "'],width:12};\n";
    }

    $section .= "if(typeof screens==='undefined') var screens={};\n";
    $section .= "if(typeof screens[1]==='undefined') screens[1]={};\n";
    $section .= "if(!Array.isArray(screens[1]['columns'])) screens[1]['columns']=[];\n";
    foreach ($columnKeys as $columnKey) {
        $section .= "if(screens[1]['columns'].indexOf('" . $columnKey
            . "')<0) screens[1]['columns'].push('" . $columnKey . "');\n";
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
echo json_encode([
    'success' => true,
    'blockKeys' => array_map(function ($widget) {
        return $widget['key'];
    }, $widgets),
]);

function _widgetRemoveSection($config, $startMarker, $endMarker)
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

function _widgetJsStringEscape($value)
{
    return str_replace(['\\', "'"], ['\\\\', "\\'"], $value);
}

function _widgetChunks($widgets, $columnWidth)
{
    $chunks = [];
    $current = [];
    $width = 0;

    foreach ($widgets as $widget) {
        if (!empty($current) && ($width + $widget['width']) > $columnWidth) {
            $chunks[] = $current;
            $current = [];
            $width = 0;
        }
        $current[] = $widget;
        $width += $widget['width'];
    }

    if (!empty($current)) {
        $chunks[] = $current;
    }
    return $chunks;
}
