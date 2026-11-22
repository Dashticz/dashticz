<?php
/**
 * Extra dashboard configurations (custom/CONFIG<name>.js).
 *
 * GET  lists the configuration files that can be opened with ?cfg=<file>.
 * POST creates a new one (an empty config, a copy of an existing one, or only
 *      the base settings of one), or
 *      deletes an extra one (action "delete").
 *
 * Only bare file names that match CONFIG[A-Za-z0-9_-]*.js are handled, the
 * same pattern configwriter_resolve_config_path() accepts for ?cfg=, so every
 * editor can write to the files created here. An existing file is never
 * overwritten and the default CONFIG.js can only be used as a copy source:
 * it is never deleted. The stylesheet that belongs to a deleted config
 * (CONFIG2.js -> custom2.css) is deleted with it; custom.css never is.
 */
require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();

$customDir = __DIR__ . '/../custom';
$namePattern = '/^CONFIG[A-Za-z0-9_-]*\.js$/';

/* The CSS file that goes with a config: CONFIG.js -> custom.css and
   CONFIG2.js -> custom2.css, matching the lookup in js/main.js. */
function dashticz_config_css_name($cfgFile)
{
    return 'custom' . preg_replace('/\.js$/i', '', preg_replace('/^CONFIG/i', '', $cfgFile)) . '.css';
}

function dashticz_list_configs($customDir, $namePattern)
{
    $configs = [];
    $entries = is_dir($customDir) ? @scandir($customDir) : false;
    if (is_array($entries)) {
        foreach ($entries as $entry) {
            if (!preg_match($namePattern, $entry) || $entry === 'CONFIG_DEFAULT.js') {
                continue;
            }
            $path = $customDir . '/' . $entry;
            if (!is_file($path) || is_link($path)) {
                continue;
            }
            $configs[] = $entry;
        }
    }
    natcasesort($configs);
    $configs = array_values($configs);
    // The default config always comes first.
    $configs = array_values(array_diff($configs, ['CONFIG.js']));
    if (is_file($customDir . '/CONFIG.js')) {
        array_unshift($configs, 'CONFIG.js');
    }
    return $configs;
}

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';

if ($method === 'GET') {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => true,
        'configs' => dashticz_list_configs($customDir, $namePattern),
    ]);
    exit;
}

if ($method !== 'POST') {
    dashticz_json_error(405, 'Only GET and POST requests are allowed.');
}

dashticz_require_csrf();

$data = json_decode((string) file_get_contents('php://input'), true);
if (json_last_error() !== JSON_ERROR_NONE || !is_array($data)) {
    dashticz_json_error(400, 'Invalid JSON body.');
}

if (isset($data['action']) && $data['action'] === 'delete') {
    $file = isset($data['file']) && is_string($data['file']) ? $data['file'] : '';
    if ($file === 'CONFIG.js') {
        dashticz_json_error(400, 'The default configuration cannot be deleted.');
    }
    if (!in_array($file, dashticz_list_configs($customDir, $namePattern), true)) {
        dashticz_json_error(404, 'Unknown configuration.');
    }
    if (!@unlink($customDir . '/' . $file)) {
        dashticz_json_error(500, 'Unable to delete the configuration file.');
    }
    // Only the stylesheet that belongs to exactly this config: CONFIG<name>.js
    // -> custom<name>.css with a non-empty name, so custom.css is never hit.
    $cssDeleted = false;
    $cssName = dashticz_config_css_name($file);
    $cssPath = $customDir . '/' . $cssName;
    if (preg_match('/^custom[A-Za-z0-9_-]+\.css$/', $cssName) && is_file($cssPath) && !is_link($cssPath)) {
        $cssDeleted = @unlink($cssPath);
    }
    header('Content-Type: application/json');
    echo json_encode(['success' => true, 'file' => $file, 'css_deleted' => $cssDeleted]);
    exit;
}

$name = isset($data['name']) && is_string($data['name']) ? trim($data['name']) : '';
if (!preg_match('/^[A-Za-z0-9_-]{1,40}$/', $name)) {
    dashticz_json_error(400, 'Invalid configuration name.');
}
$newFile = 'CONFIG' . $name . '.js';
if ($newFile === 'CONFIG_DEFAULT.js') {
    dashticz_json_error(400, 'Invalid configuration name.');
}

$source = isset($data['source']) && is_string($data['source']) ? $data['source'] : '';
$copyCss = !empty($data['copy_css']);
$existing = dashticz_list_configs($customDir, $namePattern);
if ($source !== '' && !in_array($source, $existing, true)) {
    dashticz_json_error(400, 'Unknown source configuration.');
}

if (!is_dir($customDir) || !is_writable($customDir)) {
    dashticz_json_error(500, 'The custom directory is not writable by the web server.');
}

$newPath = $customDir . '/' . $newFile;
if (file_exists($newPath) || is_link($newPath)) {
    dashticz_json_error(409, 'This configuration already exists.');
}

/* A "base" copy keeps only the plain settings of the source (Domoticz address
   and login, language, theme, ...): the single-line config['key'] = value;
   statements. Tiles, screens, columns and other blocks are left out. */
function dashticz_config_base($contents)
{
    $skip = '/^(screens?|columns?|blocks?|buttons?|layout|grid)/i';
    $lines = ["var config = {};"];
    foreach (preg_split('/\r\n|\n|\r/', $contents) as $line) {
        if (!preg_match('/^\s*config\[([\'"])([A-Za-z0-9_]+)\1\]\s*=\s*.+;\s*(\/\/.*)?$/', $line, $m)) {
            continue;
        }
        if (preg_match($skip, $m[2])) {
            continue;
        }
        $lines[] = trim($line);
    }
    return implode("\n", $lines) . "\n";
}

$contents = "var config = {};\n";
if ($source !== '') {
    $contents = @file_get_contents($customDir . '/' . $source);
    if ($contents === false) {
        dashticz_json_error(500, 'Unable to read the source configuration.');
    }
    if (!empty($data['base_only'])) {
        $contents = dashticz_config_base($contents);
    }
}

// Mode 'x' fails when the file exists, so a concurrent request cannot overwrite it.
$handle = @fopen($newPath, 'x');
if ($handle === false) {
    dashticz_json_error(500, 'Unable to create the configuration file.');
}
$written = fwrite($handle, $contents);
fclose($handle);
if ($written === false || $written !== strlen($contents)) {
    @unlink($newPath);
    dashticz_json_error(500, 'Unable to write the configuration file.');
}

$cssCopied = false;
if ($copyCss && $source !== '') {
    $sourceCss = $customDir . '/' . dashticz_config_css_name($source);
    $newCss = $customDir . '/' . dashticz_config_css_name($newFile);
    if (is_file($sourceCss) && !is_link($sourceCss) && !file_exists($newCss)) {
        $cssCopied = @copy($sourceCss, $newCss);
    }
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'file' => $newFile,
    'css_copied' => $cssCopied,
]);
