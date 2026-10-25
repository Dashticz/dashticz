<?php
require_once(__DIR__ . '/../security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
http_response_code(500);
$clean_exit = 0;

/* Calendar bridge for the calendar and garbage components.
 *
 * Request (GET, or argv[1]/argv[2] as query strings from the command line):
 *   url       iCalendar URL (http, https or webcal)
 *   maxitems  maximum number of occurrences, 1-500 (default 100)
 *   history   also return occurrences that ended up to this many days ago
 *   days      how many days ahead to look (default 730, max 3650)
 *   method    ignored; kept so existing configurations keep working (all
 *             former parsers were replaced by sabre/vobject)
 * Response: {"0": {"id", "title", "desc", "location", "start", "end",
 *   "allDay", "date"}, ..., "_errors": [...]} (unix timestamps; "date" is
 *   the start date, Y-m-d, in the server's time zone)
 */

register_shutdown_function('fatal_handler');

function fatal_handler()
{
    global $clean_exit;
    if ($clean_exit) {
        return;
    }
    $error = error_get_last();
    if ($error !== null) {
        http_response_code(500);
        print(json_encode(array(
            '_errors' => array('Calendar processing failed.'),
        )));
    }
}

if (!empty($argv[1])) {
    parse_str($argv[1], $_GET);
}
if (!empty($argv[2])) {
    parse_str($argv[2], $_GET);
}

if (PHP_VERSION_ID < 70400) {
    http_response_code(200);
    $clean_exit = 1;
    die(json_encode(array('_errors' => array('The calendar needs PHP 7.4 or newer.'))));
}

require_once(__DIR__ . '/dashticz_ical.php');

$ICS = isset($_GET['url']) ? dashticz_ical_normalize_url($_GET['url']) : '';
$ICS = str_replace('#', '%23', $ICS);
$MAXITEMS = isset($_GET['maxitems']) ? max(1, min(500, (int) $_GET['maxitems'])) : 100;
$HISTORY = isset($_GET['history']) ? max(0, min(3650, (int) $_GET['history'])) : 0;
$DAYS = isset($_GET['days']) ? max(1, min(3650, (int) $_GET['days'])) : 730;

$errors = array();
set_error_handler(function ($errno, $errstr) {
    global $errors;
    if (!($errno & (E_DEPRECATED | E_USER_DEPRECATED))) {
        $errors[] = $errstr;
    }
    return true;
});

//Microsoft expects an useragent
ini_set('user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:72.0) Gecko/20100101 Firefox/72.0');

try {
    // A calendar is very often hosted on the same LAN as Domoticz itself (a
    // NAS, a local web server, etc.) - like xmltv.php and lms/index.php, the
    // private/reserved-IP block dashticz_fetch_remote() applies by default
    // is explicitly lifted here via allowPrivate=true.
    $remoteCalendar = dashticz_fetch_remote($ICS, 2097152, 3, true);
    $res = dashticz_calendar_events($remoteCalendar['body'], $MAXITEMS, $HISTORY, $DAYS, $errors);
} catch (Exception $e) {
    $errors[] = 'Unable to load or parse the calendar.';
    $res = array();
}

$res['_errors'] = $errors;
http_response_code(200);
$clean_exit = 1;
die(json_encode($res));

function dashticz_calendar_events($calendarContent, $maxItems, $history, $days, array &$errors)
{
    $now = time();
    $occurrences = dashticz_ical_occurrences(
        $calendarContent,
        $now - $history * 86400,
        $now + $days * 86400,
        null,
        $maxItems,
        $errors
    );
    $data = array();
    foreach ($occurrences as $id => $occurrence) {
        $start = $occurrence['start'];
        $end = $occurrence['end'] === null ? $start : $occurrence['end'];
        $duration = $end - $start;
        $data[] = array(
            'id' => $id,
            'title' => $occurrence['title'],
            'desc' => $occurrence['desc'],
            'location' => $occurrence['location'],
            'start' => $start,
            'end' => $end,
            // Some calendars (Outlook) write all-day events as whole days
            // instead of as dates.
            'allDay' => $occurrence['allDay']
                || ($duration > 0 && $duration % 86400 === 0),
            'date' => $occurrence['date'],
        );
    }
    return $data;
}
