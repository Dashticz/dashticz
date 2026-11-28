<?php
/**
 * Server-side log of Dashticz (custom/logs/dashticz.log).
 *
 * GET              returns the newest entries: ?limit=300&level=error|warning|action|debug
 * POST {entries}   appends entries of the browser: [{l: level, m: message, t: ISO time}]
 * POST {action: "clear"} removes the log
 *
 * Same-origin and CSRF protected like the save endpoints. The number and size
 * of the entries per request and per minute is limited, and every message is
 * masked (passwords, tokens, keys) before it is stored; see
 * vendor/dashticz/log.php.
 */
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/../vendor/dashticz/log.php');

dashticz_require_same_origin();

$method = isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '';

if ($method === 'GET') {
    $limit = isset($_GET['limit']) ? max(1, min(1000, (int) $_GET['limit'])) : 300;
    $level = isset($_GET['level']) && in_array($_GET['level'], DASHTICZ_LOG_LEVELS, true) ? $_GET['level'] : '';
    header('Content-Type: application/json');
    header('Cache-Control: no-store');
    echo json_encode(array('entries' => dashticz_log_read($limit, $level), 'writable' => dashticz_log_dir() !== null));
    exit;
}

if ($method !== 'POST') {
    dashticz_json_error(405, 'Only GET and POST requests are allowed.');
}

dashticz_require_csrf();

$body = file_get_contents('php://input', false, null, 0, 65537);
if ($body === false || strlen($body) > 65536) {
    dashticz_json_error(413, 'The request is too large.');
}
$data = json_decode($body, true);
if (!is_array($data)) {
    dashticz_json_error(400, 'Invalid JSON.');
}

if (isset($data['action'])) {
    if ($data['action'] !== 'clear') {
        dashticz_json_error(400, 'Unknown action.');
    }
    dashticz_log_clear();
    header('Content-Type: application/json');
    echo json_encode(array('cleared' => true));
    exit;
}

if (!isset($data['entries']) || !is_array($data['entries'])) {
    dashticz_json_error(400, 'No entries.');
}

$entries = array_slice($data['entries'], 0, 50);
$allowed = dashticz_log_allowance(count($entries));
$written = 0;
foreach (array_slice($entries, 0, $allowed) as $entry) {
    if (!is_array($entry) || !isset($entry['l'], $entry['m']) || !is_string($entry['l']) || !is_string($entry['m'])) {
        continue;
    }
    $time = isset($entry['t']) && is_string($entry['t']) && preg_match('/^\d{4}-\d\d-\d\dT[\d:.]+Z$/', $entry['t'])
        ? $entry['t'] : null;
    if (dashticz_log_write($entry['l'], 'js', $entry['m'], $time)) {
        $written++;
    }
}

header('Content-Type: application/json');
echo json_encode(array('written' => $written, 'dropped' => count($entries) - $written));
