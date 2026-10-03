<?php
// Helpers of the TVgids bridge (index.php), separate so the tests can load
// them without running a request.

// channels.json (the channel groups of tvgids24.nl that the widget offers,
// each with its channels) -> id => name.
function dashticz_tvgids_channels()
{
    $groups = json_decode((string) @file_get_contents(__DIR__ . '/channels.json'), true);
    $channels = array();
    foreach (is_array($groups) ? $groups : array() as $group) {
        if (!isset($group['channels']) || !is_array($group['channels'])) {
            continue;
        }
        foreach ($group['channels'] as $channel) {
            if (isset($channel['id'], $channel['name']) && preg_match('/^[a-z0-9_]{1,40}$/', $channel['id'])) {
                $channels[$channel['id']] = (string) $channel['name'];
            }
        }
    }
    return $channels;
}

// The TV day of tvgids24.nl, which is a Dutch site.
function dashticz_tvgids_today()
{
    $now = new DateTime('now', new DateTimeZone('Europe/Amsterdam'));
    return $now->format('Y-m-d');
}

function dashticz_tvgids_programmes($id, $ttl)
{
    $dir = dashticz_cache_dir('tvgids');
    $file = $dir === null ? null : $dir . '/' . $id . '.json';
    $cached = $file && is_file($file) ? json_decode((string) @file_get_contents($file), true) : null;
    $today = dashticz_tvgids_today();
    if (is_array($cached) && isset($cached['date'], $cached['fetchedAt'], $cached['programmes'])
        && $cached['date'] === $today && time() - $cached['fetchedAt'] < $ttl) {
        return $cached['programmes'];
    }
    try {
        $page = dashticz_fetch_remote('https://www.tvgids24.nl/zender/' . $id . '/vandaag', 2097152);
        $programmes = dashticz_tvgids_parse($page['body']);
        if (!$programmes) {
            throw new RuntimeException('No programmes found for ' . $id . '.');
        }
    } catch (RuntimeException $error) {
        // Stale data beats an error when the site is temporarily down.
        if (is_array($cached) && isset($cached['programmes'])) {
            return $cached['programmes'];
        }
        throw new RuntimeException('Unable to fetch the TV guide of ' . $id . '.');
    }
    if ($file) {
        $data = array('date' => $today, 'fetchedAt' => time(), 'programmes' => $programmes);
        $tmp = $file . '.tmp';
        if (@file_put_contents($tmp, json_encode($data), LOCK_EX) !== false) {
            @rename($tmp, $file);
        }
    }
    return $programmes;
}

// A tvgids24.nl channel page -> its programmes, sorted by start time. Each
// programme is a schema.org BroadcastEvent:
//   <li itemscope itemtype="https://schema.org/BroadcastEvent">
//   <meta itemprop="name" content="Beste Zangers">
//   <meta itemprop="startDate" content="2026-10-03T20:30+02:00">
//   <meta itemprop="endDate" content="2026-10-03T21:35+02:00">
//   ... <a class="prog" href="51829621/beste-zangers">Beste Zangers</a></li>
function dashticz_tvgids_parse($html)
{
    $programmes = array();
    $items = preg_split('#<li[^>]*itemtype="https?://schema\.org/BroadcastEvent"#i', (string) $html);
    array_shift($items);
    foreach ($items as $item) {
        $item = explode('</li>', $item)[0];
        $title = dashticz_tvgids_meta($item, 'name');
        $start = strtotime((string) dashticz_tvgids_meta($item, 'startDate'));
        $end = strtotime((string) dashticz_tvgids_meta($item, 'endDate'));
        if ($title === null || $title === '' || !$start || !$end || $end <= $start) {
            continue;
        }
        $url = '';
        if (preg_match('#<a[^>]*class="prog"[^>]*href="(\d+/[a-z0-9-]*)"#i', $item, $m)) {
            $url = 'https://www.tvgids24.nl/' . $m[1];
        }
        $programmes[] = array(
            'start' => $start,
            'end' => $end,
            'title' => preg_replace('/^(.{200}).+$/us', '$1', $title),
            'url' => $url,
        );
    }
    usort($programmes, function ($a, $b) {
        return $a['start'] - $b['start'];
    });
    return $programmes;
}

// The content of the first <meta itemprop="$name" content="..."> (the
// BroadcastEvent's own name comes before its BroadcastService's name).
function dashticz_tvgids_meta($item, $name)
{
    if (!preg_match('#<meta[^>]*itemprop="' . preg_quote($name, '#') . '"[^>]*content="([^"]*)"#i', $item, $m)) {
        return null;
    }
    $value = trim(html_entity_decode($m[1], ENT_QUOTES | ENT_HTML5, 'UTF-8'));
    // tvgids24.nl sometimes lost the backslash of a JSON escape: "Spanje -
    // Tsjechiu00eb" for "Spanje - Tsjechië". Only accented letters
    // (U+00C0-U+00FF) are restored, so ordinary text is never touched.
    return preg_replace_callback('/(?<=[a-z])u00([c-f][0-9a-f])/i', function ($match) {
        return html_entity_decode('&#x' . $match[1] . ';', ENT_QUOTES, 'UTF-8');
    }, $value);
}
