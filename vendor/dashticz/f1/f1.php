<?php
// Helpers of the F1 bridge (index.php), separate so the tests can load
// them without running a request.

// The server fetches this URL, so only https URLs are accepted; the host is
// checked by dashticz_fetch_remote() when the feed is downloaded.
function dashticz_f1_check_url($url)
{
    $url = trim((string) $url);
    $parts = parse_url($url);
    if (!$parts || empty($parts['host']) || !isset($parts['scheme']) || strtolower($parts['scheme']) !== 'https'
        || strlen($url) > 2048) {
        throw new RuntimeException('The F1 calendar URL must be a valid https URL.');
    }
    return $url;
}

function dashticz_f1_cache_file($url)
{
    $baseDir = dashticz_cache_dir('f1');
    return $baseDir === null ? null : $baseDir . '/' . sha1($url) . '.json';
}

function dashticz_f1_events($url, $ttl)
{
    return dashticz_cached_json(dashticz_f1_cache_file($url), $ttl, function () use ($url) {
        return dashticz_f1_parse(dashticz_f1_download($url));
    });
}

function dashticz_f1_download($url)
{
    try {
        $response = dashticz_fetch_remote($url, 2097152);
    } catch (RuntimeException $error) {
        throw new RuntimeException('Unable to fetch the F1 calendar.');
    }
    if (strpos($response['body'], 'BEGIN:VCALENDAR') === false) {
        throw new RuntimeException('Unable to fetch the F1 calendar.');
    }
    return $response['body'];
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
