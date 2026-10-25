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

// ICS text -> list of sessions, sorted by start time. Parsed with the shared
// iCalendar helper (sabre/vobject); floating times are read as UTC and
// all-day entries are not sessions, so they are left out.
function dashticz_f1_parse($ics)
{
    require_once __DIR__ . '/../ical/dashticz_ical.php';
    $occurrences = dashticz_ical_occurrences($ics, 0, time() + 10 * 366 * 86400, new DateTimeZone('UTC'), 5000);
    $events = array();
    foreach ($occurrences as $occurrence) {
        if ($occurrence['allDay'] || $occurrence['title'] === '') {
            continue;
        }
        $start = $occurrence['start'];
        $end = $occurrence['end'] === null ? $start + 7200 : $occurrence['end'];
        $summary = dashticz_f1_text($occurrence['title']);
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
            'location' => dashticz_f1_text($occurrence['location']),
        );
    }
    return $events;
}

// Line breaks in a summary or location become spaces.
function dashticz_f1_text($text)
{
    return trim(preg_replace('/\s*\R\s*/', ' ', (string) $text));
}
