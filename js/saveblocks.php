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
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data) || !array_key_exists('devices', $data)) {
    dashticz_json_error(400, 'Invalid request body.');
}

if (!is_array($data['devices'])) {
    dashticz_json_error(400, 'Invalid devices list.');
}

/* ---- normalise device list --------------------------------------------- */
/* Accept both bare integers (legacy) and {idx, name, subidx} objects     */
$devices = [];
foreach ($data['devices'] as $entry) {
    if (is_int($entry) && $entry > 0) {
        $devices[] = ['idx' => $entry, 'subidx' => 0, 'name' => 'Device ' . $entry, 'width' => 2, 'height' => null];
    } elseif (is_array($entry)
        && isset($entry['idx']) && is_int($entry['idx']) && $entry['idx'] > 0
    ) {
        $name = (isset($entry['name']) && is_string($entry['name']))
            ? substr(trim($entry['name']), 0, 100)
            : 'Device ' . $entry['idx'];
        if ($name === '') {
            $name = 'Device ' . $entry['idx'];
        }
        $width = 2;
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
        $devices[] = ['idx' => $entry['idx'], 'subidx' => $subidx, 'name' => $name, 'width' => $width, 'height' => $height];
    } else {
        dashticz_json_error(400, 'Each device entry must be a positive integer or an object with an integer idx.');
    }
}

/* ---- read CONFIG.js ---------------------------------------------------- */
$customDir  = __DIR__ . '/../custom';
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

/* ---- remove existing device-editor section ----------------------------- */
$startMarker = '// [device-editor-start]';
$endMarker   = '// [device-editor-end]';

$startPos = strpos($config, $startMarker);
if ($startPos !== false) {
    $endPos = strpos($config, $endMarker, $startPos);
    if ($endPos !== false) {
        $after  = substr($config, $endPos + strlen($endMarker));
        $config = substr($config, 0, $startPos) . $after;
    } else {
        $config = substr($config, 0, $startPos);
    }
}

$config = rtrim($config);

/* ---- build new device-editor section ----------------------------------- */
if (!empty($devices)) {
    /* derive unique JS identifier keys from device names */
    $usedKeys = [];
    foreach ($devices as &$d) {
        $d['key'] = _makeBlockKey($d['name'], $usedKeys);
    }
    unset($d);

    $columnWidth      = 12;
    $defaultBlockWidth = 2;
    $chunks           = _chunkBlockKeysByWidth($devices, $columnWidth, $defaultBlockWidth);

    $section  = "\n\n" . $startMarker . "\n";

    /* blocks */
    $section .= "if(typeof blocks==='undefined') var blocks={};\n";
    foreach ($devices as $d) {
        $key   = $d['key'];
        $idx   = $d['idx'];
        $title = _jsStringEscape($d['name']);
        $blockWidth = (isset($d['width']) && is_int($d['width']) && $d['width'] > 0)
            ? $d['width']
            : $defaultBlockWidth;
        if (!empty($d['subidx']) && $d['subidx'] > 0) {
            $blockDef = "{idx:'" . $idx . '_' . (int)$d['subidx'] . "'";
        } else {
            $blockDef = "{idx:" . $idx;
        }
        $blockDef .= ",width:" . $blockWidth . ",hide_data:true,last_update:false,title:'" . $title . "'";
        if (isset($d['height']) && is_int($d['height'])) {
            $blockDef .= ",height:" . $d['height'];
        }
        $blockDef .= "}";
        $section .= "blocks['" . $key . "']=" . $blockDef . ";\n";
    }

    /* columns */
    $colKeys  = [];
    $section .= "if(typeof columns==='undefined') var columns={};\n";
    foreach ($chunks as $i => $chunk) {
        $colKey    = 'de_col' . ($i + 1);
        $colKeys[] = $colKey;
        $section  .= "columns['" . $colKey . "']={blocks:['" . implode("','", $chunk) . "'],width:" . $columnWidth . "};\n";
    }

    /* screens */
    $section .= "if(typeof screens==='undefined') var screens={};\n";
    $section .= "if(typeof screens[1]==='undefined') screens[1]={};\n";
    $section .= "if(!Array.isArray(screens[1]['columns'])) screens[1]['columns']=[];\n";
    foreach ($colKeys as $colKey) {
        $section .= "if(screens[1]['columns'].indexOf('" . $colKey . "')<0) screens[1]['columns'].push('" . $colKey . "');\n";
    }

    $section .= $endMarker;
    $config  .= $section;
}

/* ---- write CONFIG.js --------------------------------------------------- */
if (!file_exists($configPath) && !is_writable($customDir)) {
    dashticz_json_error(500, 'The directory "custom/" is not writable by the web server' .
        dashticz_owner_info($customDir) .
        '. From the Dashticz directory, run: sh tools/install-dashticz-write-access');
}

if (file_exists($configPath) && !is_writable($configPath)) {
    @chmod($configPath, 0664);
    if (!is_writable($configPath)) {
        dashticz_json_error(500, 'CONFIG.js is not writable' .
            dashticz_owner_info($configPath) .
            '. From the Dashticz directory, run: sh tools/install-dashticz-write-access');
    }
}

if (file_put_contents($configPath, $config . "\n", LOCK_EX) === false) {
    dashticz_json_error(500, 'Unable to write CONFIG.js.');
}
@chmod($configPath, 0664);

header('Content-Type: application/json');
echo json_encode(array('success' => true));

/* ---- helpers ----------------------------------------------------------- */

/**
 * Escape a string for use inside a single-quoted JavaScript string literal.
 */
function _jsStringEscape($str) {
    return str_replace(['\\', "'"], ['\\\\', "\\'"], $str);
}

/**
 * Convert a device name into a valid, unique JavaScript identifier.
 * Spaces and non-alphanumeric characters are replaced with underscores.
 * Consecutive underscores are collapsed; leading/trailing underscores are stripped.
 * A digit-only start is prefixed with 'd'.
 * Duplicate keys get a numeric suffix (_2, _3, …).
 */
function _makeBlockKey($name, &$usedKeys) {
    $key = preg_replace('/[^a-zA-Z0-9_]/', '_', $name);
    $key = preg_replace('/_+/', '_', $key);
    $key = trim($key, '_');
    if ($key === '' || ctype_digit(substr($key, 0, 1))) {
        $key = 'd' . $key;
    }
    $base   = $key;
    $suffix = 2;
    while (in_array($key, $usedKeys, true)) {
        $key = $base . '_' . $suffix++;
    }
    $usedKeys[] = $key;
    return $key;
}

/**
 * Group block keys into columns by summing block widths until the column is full.
 */
function _chunkBlockKeysByWidth($devices, $columnWidth, $defaultBlockWidth) {
    $chunks = [];
    $currentChunk = [];
    $currentWidth = 0;

    foreach ($devices as $device) {
        $blockWidth = (isset($device['width']) && is_int($device['width']) && $device['width'] > 0)
            ? $device['width']
            : $defaultBlockWidth;
        $blockWidth = min($blockWidth, $columnWidth);

        if (!empty($currentChunk) && ($currentWidth + $blockWidth) > $columnWidth) {
            $chunks[] = $currentChunk;
            $currentChunk = [];
            $currentWidth = 0;
        }

        $currentChunk[] = $device['key'];
        $currentWidth += $blockWidth;
    }

    if (!empty($currentChunk)) {
        $chunks[] = $currentChunk;
    }

    return $chunks;
}
