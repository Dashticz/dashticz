<?php
require_once(__DIR__ . '/../security.php');

@ini_set('display_errors', '0');

dashticz_require_same_origin();
header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

/* Backend bridge for the F1 widget (js/components/f1.js). Downloads the F1
 * calendar ICS feed that the domoticz_F1 plugin
 * (https://github.com/MadPatrick/domoticz_F1) uses, parses it into a list of
 * sessions and caches that list for the poll interval
 * (custom/cache/f1/<sha1 of url>.json), so several connected dashboards
 * share one download. Filtering and time formatting happen in the browser.
 *
 * Request (JSON): {"url": "https://...ics", "pollMinutes": 60}
 * Response: {"events": [{"start": ts, "end": ts, "session": "...",
 *            "gp": "...", "location": "..."}]} (unix timestamps, UTC)
 */
try {
    if (!function_exists('curl_init')) {
        throw new RuntimeException('The PHP curl extension is required for the F1 widget.');
    }
    $input = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new RuntimeException('Invalid F1 request.');
    }
    $url = dashticz_f1_check_url(isset($input['url']) ? $input['url'] : '');
    $pollMinutes = isset($input['pollMinutes']) ? (int) $input['pollMinutes'] : 60;
    $pollMinutes = max(5, min(1440, $pollMinutes));
    echo json_encode(array('events' => dashticz_f1_events($url, $pollMinutes * 60)));
} catch (RuntimeException $error) {
    dashticz_json_error(502, $error->getMessage());
}

// The server fetches this URL, so only public https hosts are accepted.
function dashticz_f1_check_url($url)
{
    $url = trim((string) $url);
    $parts = parse_url($url);
    if (!$parts || empty($parts['host']) || !isset($parts['scheme']) || strtolower($parts['scheme']) !== 'https'
        || strlen($url) > 2048) {
        throw new RuntimeException('The F1 calendar URL must be a valid https URL.');
    }
    $ip = filter_var($parts['host'], FILTER_VALIDATE_IP) ? $parts['host'] : gethostbyname($parts['host']);
    if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        throw new RuntimeException('The F1 calendar URL must point to a public host.');
    }
    return $url;
}

function dashticz_f1_cache_file($url)
{
    $baseDir = dirname(__DIR__, 2) . '/custom/cache/f1';
    if (!is_dir($baseDir)) {
        @mkdir($baseDir, 0775, true);
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        $baseDir = rtrim(sys_get_temp_dir(), '/\\') . '/dashticz-f1-cache';
        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0775, true);
        }
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        return null;
    }
    return $baseDir . '/' . sha1($url) . '.json';
}

function dashticz_f1_events($url, $ttl)
{
    $file = dashticz_f1_cache_file($url);
    $cached = null;
    if ($file && is_file($file)) {
        $cached = json_decode((string) @file_get_contents($file), true);
        if (is_array($cached) && isset($cached['fetchedAt'], $cached['events'])
            && time() - $cached['fetchedAt'] < $ttl) {
            return $cached['events'];
        }
    }
    try {
        $events = dashticz_f1_parse(dashticz_f1_download($url));
    } catch (RuntimeException $error) {
        // Stale data beats an error when the feed is temporarily down.
        if (is_array($cached) && isset($cached['events'])) {
            return $cached['events'];
        }
        throw $error;
    }
    if ($file) {
        $tmp = $file . '.tmp';
        if (@file_put_contents($tmp, json_encode(array('fetchedAt' => time(), 'events' => $events)), LOCK_EX) !== false) {
            @rename($tmp, $file);
        }
    }
    return $events;
}

function dashticz_f1_download($url)
{
    $ch = curl_init($url);
    curl_setopt_array($ch, array(
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CONNECTTIMEOUT => 5,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTPS,
    ));
    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($body === false || $status !== 200 || strpos($body, 'BEGIN:VCALENDAR') === false) {
        throw new RuntimeException('Unable to fetch the F1 calendar.');
    }
    return $body;
}

// ICS text -> list of sessions, sorted by start time.
function dashticz_f1_parse($ics)
{
    $ics = preg_replace("/\r?\n[ \t]/", '', $ics); // unfold long lines
    $events = array();
    foreach (preg_split('/BEGIN:VEVENT/', $ics) as $i => $chunk) {
        if ($i === 0) {
            continue;
        }
        $chunk = explode('END:VEVENT', $chunk)[0];
        $props = array();
        foreach (preg_split('/\r?\n/', $chunk) as $line) {
            if (preg_match('/^([A-Z-]+)(?:;[^:]*)?:(.*)$/', $line, $m)) {
                $props[$m[1]] = trim($m[2]);
            }
        }
        if (!isset($props['SUMMARY'], $props['DTSTART'])) {
            continue;
        }
        $start = dashticz_f1_time($props['DTSTART']);
        if ($start === null) {
            continue;
        }
        $end = isset($props['DTEND']) ? dashticz_f1_time($props['DTEND']) : null;
        if ($end === null) {
            $end = $start + 7200;
        }
        $summary = dashticz_f1_unescape($props['SUMMARY']);
        $summary = preg_replace('/^F1:\s*/i', '', $summary);
        $session = $summary;
        $gp = '';
        if (preg_match('/^(.*?)\s*\((.*)\)\s*$/', $summary, $m)) {
            $session = $m[1];
            $gp = $m[2];
        }
        $events[] = array(
            'start' => $start,
            'end' => $end,
            'session' => $session,
            'gp' => $gp,
            'location' => isset($props['LOCATION']) ? dashticz_f1_unescape($props['LOCATION']) : '',
        );
    }
    usort($events, function ($a, $b) {
        return $a['start'] - $b['start'];
    });
    return $events;
}

function dashticz_f1_unescape($text)
{
    return preg_replace('/\\\\([,;\\\\])/', '$1', str_replace(array('\\n', '\\N'), ' ', $text));
}

// 20260306T013000Z (UTC) -> unix timestamp; floating times are read as UTC.
function dashticz_f1_time($value)
{
    if (!preg_match('/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/', $value, $m)) {
        return null;
    }
    return gmmktime((int) $m[4], (int) $m[5], (int) $m[6], (int) $m[2], (int) $m[3], (int) $m[1]);
}
