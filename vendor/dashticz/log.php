<?php

/* Server-side log of Dashticz (custom/logs/dashticz.log).
   One JSON object per line: {"t": ISO time, "l": level, "s": source, "m": message}.
   Levels: error, action, debug. Sources: js (written by js/log.php for the
   browser) and php (the PHP bridges themselves).
   The log rotates at 1 MB and keeps 3 older files. The folder is never served
   (.htaccess for Apache, docker/default.conf for nginx). Every message is
   masked (passwords, tokens, keys) and cut to a safe length before it is
   written, so a log never holds secrets. */

const DASHTICZ_LOG_LEVELS = array('error', 'action', 'debug');
const DASHTICZ_LOG_MAX_BYTES = 1048576;
const DASHTICZ_LOG_KEEP = 3;
const DASHTICZ_LOG_MAX_MESSAGE = 1000;
const DASHTICZ_LOG_MAX_PER_MINUTE = 200;

function dashticz_log_dir()
{
    $root = dirname(__DIR__, 2) . '/custom/logs';
    if (!is_dir($root)) {
        @mkdir($root, 0775, true);
    }
    if (!is_dir($root) || !is_writable($root)) {
        return null;
    }
    if (function_exists('dashticz_protect_cache_root')) {
        dashticz_protect_cache_root($root);
    }
    return $root;
}

function dashticz_log_file()
{
    $dir = dashticz_log_dir();
    return $dir === null ? null : $dir . '/dashticz.log';
}

/* Hides the value of passwords, tokens, keys and similar names, user:password
   in URLs and Bearer tokens. */
function dashticz_log_mask($text)
{
    $text = (string) $text;
    $text = preg_replace('#//[^/@\s:]+:[^/@\s]+@#', '//***@', $text);
    $text = preg_replace('/Bearer\s+[A-Za-z0-9._~+\/=-]+/i', 'Bearer ***', $text);
    $text = preg_replace(
        '/((?:pass(?:word|wd)?|pwd|pw|token|secret|api[_-]?key|apikey|authorization|auth|key|pin(?:code)?)["\']?\s*[:=]\s*["\']?)[^&\s"\',}]+/i',
        '$1***',
        $text
    );
    return $text;
}

function dashticz_log_clean_message($message)
{
    $message = dashticz_log_mask(preg_replace('/[\x00-\x08\x0B-\x1F\x7F]/', ' ', (string) $message));
    if (function_exists('mb_substr')) {
        return mb_substr($message, 0, DASHTICZ_LOG_MAX_MESSAGE, 'UTF-8');
    }
    return substr($message, 0, DASHTICZ_LOG_MAX_MESSAGE);
}

function dashticz_log_rotate($file)
{
    clearstatcache(true, $file);
    if (!is_file($file) || filesize($file) < DASHTICZ_LOG_MAX_BYTES) {
        return;
    }
    @unlink($file . '.' . DASHTICZ_LOG_KEEP);
    for ($i = DASHTICZ_LOG_KEEP - 1; $i >= 1; $i--) {
        if (is_file($file . '.' . $i)) {
            @rename($file . '.' . $i, $file . '.' . ($i + 1));
        }
    }
    @rename($file, $file . '.1');
}

/* Appends one line. Returns false when the level is unknown or the log can't
   be written. Never throws: logging must not break a request. */
function dashticz_log_write($level, $source, $message, $time = null)
{
    if (!in_array($level, DASHTICZ_LOG_LEVELS, true) || !in_array($source, array('js', 'php'), true)) {
        return false;
    }
    $file = dashticz_log_file();
    if ($file === null) {
        return false;
    }
    $line = json_encode(array(
        't' => $time !== null ? $time : gmdate('Y-m-d\TH:i:s\Z'),
        'l' => $level,
        's' => $source,
        'm' => dashticz_log_clean_message($message),
    ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($line === false) {
        return false;
    }
    $lock = @fopen($file . '.lock', 'c');
    if (!$lock) {
        return false;
    }
    $ok = false;
    if (flock($lock, LOCK_EX)) {
        dashticz_log_rotate($file);
        $ok = @file_put_contents($file, $line . "\n", FILE_APPEND) !== false;
        flock($lock, LOCK_UN);
    }
    fclose($lock);
    return $ok;
}

/* Allows at most DASHTICZ_LOG_MAX_PER_MINUTE lines per minute from the
   browser, so a broken or abusive client can't fill the disk. Returns how
   many of $count lines may be written. */
function dashticz_log_allowance($count)
{
    $dir = dashticz_log_dir();
    if ($dir === null) {
        return 0;
    }
    $handle = @fopen($dir . '/.rate', 'c+');
    if (!$handle) {
        return 0;
    }
    $allowed = 0;
    if (flock($handle, LOCK_EX)) {
        $minute = (int) floor(time() / 60);
        $parts = explode(' ', trim((string) stream_get_contents($handle)));
        $used = (count($parts) === 2 && (int) $parts[0] === $minute) ? (int) $parts[1] : 0;
        $allowed = max(0, min($count, DASHTICZ_LOG_MAX_PER_MINUTE - $used));
        ftruncate($handle, 0);
        rewind($handle);
        fwrite($handle, $minute . ' ' . ($used + $allowed));
        flock($handle, LOCK_UN);
    }
    fclose($handle);
    return $allowed;
}

/* The newest $limit entries (newest last), optionally of one level. */
function dashticz_log_read($limit = 300, $level = '')
{
    $file = dashticz_log_file();
    $entries = array();
    if ($file === null) {
        return $entries;
    }
    // Oldest file first: dashticz.log.3 ... dashticz.log.
    $files = array();
    for ($i = DASHTICZ_LOG_KEEP; $i >= 1; $i--) {
        $files[] = $file . '.' . $i;
    }
    $files[] = $file;
    foreach ($files as $path) {
        if (!is_file($path) || is_link($path)) {
            continue;
        }
        $lines = @file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines ?: array() as $line) {
            $entry = json_decode($line, true);
            if (!is_array($entry) || !isset($entry['l'], $entry['m'])) {
                continue;
            }
            if ($level !== '' && $entry['l'] !== $level) {
                continue;
            }
            $entries[] = $entry;
        }
        if (count($entries) > $limit * 2) {
            $entries = array_slice($entries, -$limit);
        }
    }
    return array_slice($entries, -$limit);
}

function dashticz_log_clear()
{
    $file = dashticz_log_file();
    if ($file === null) {
        return;
    }
    @unlink($file);
    for ($i = 1; $i <= DASHTICZ_LOG_KEEP; $i++) {
        @unlink($file . '.' . $i);
    }
}
