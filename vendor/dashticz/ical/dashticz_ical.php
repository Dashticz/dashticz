<?php
/* Shared iCalendar parsing for Dashticz (calendar, garbage and F1 bridges).
 *
 * All iCalendar data goes through sabre/vobject (vendor/, kept up to date
 * with Composer), so recurrence rules (RRULE/RDATE/EXDATE), moved
 * occurrences (RECURRENCE-ID) and time zones (VTIMEZONE, Olson and Windows
 * names) are handled the same way everywhere.
 */

require_once __DIR__ . '/vendor/autoload.php';

use Sabre\VObject\Reader;
use Sabre\VObject\Recur\EventIterator;
use Sabre\VObject\Recur\NoInstancesException;

/* A single recurring event never takes more iteration steps than this (an
 * hourly series that started years ago); past it the series is cut off and a
 * warning is returned instead of letting one event stall the whole request. */
const DASHTICZ_ICAL_MAX_STEPS = 300000;

/* webcal:// is http(s) with another name; everything else is left to
 * dashticz_validate_remote_url(). */
function dashticz_ical_normalize_url($url)
{
    return preg_replace('#^webcals?://#i', 'https://', trim((string) $url));
}

/**
 * Parses iCalendar text and returns the occurrences that overlap
 * [$from, $to), sorted by start time.
 *
 * @param string            $ics      iCalendar text
 * @param int               $from     unix timestamp, start of the window
 * @param int               $to       unix timestamp, end of the window
 * @param DateTimeZone|null $timeZone zone for all-day and floating times
 *                                    (default: PHP's default time zone)
 * @param int               $maxItems maximum number of occurrences returned
 * @param array             $warnings receives non-fatal problems
 *
 * @return array list of array(
 *   'title', 'desc', 'location' => string,
 *   'start' => int, 'end' => int|null (null: the event has no DTEND/DURATION),
 *   'allDay' => bool (DTSTART is a date without a time),
 *   'date' => 'Y-m-d' of the start in $timeZone,
 *   'uid' => string)
 */
function dashticz_ical_occurrences($ics, $from, $to, $timeZone = null, $maxItems = 500, &$warnings = array())
{
    if (!is_array($warnings)) {
        $warnings = array();
    }
    if ($timeZone === null) {
        $timeZone = new DateTimeZone(date_default_timezone_get());
    }
    if (strpos((string) $ics, 'BEGIN:VCALENDAR') === false) {
        throw new RuntimeException('The response is not an iCalendar file.');
    }
    $calendar = Reader::read($ics, Reader::OPTION_FORGIVING | Reader::OPTION_IGNORE_INVALID_LINES);
    if (!$calendar || $calendar->name !== 'VCALENDAR') {
        throw new RuntimeException('The response is not an iCalendar file.');
    }

    // Our own step limit (DASHTICZ_ICAL_MAX_STEPS) replaces sabre's global
    // one, which also counts the occurrences before the window.
    $previousMax = \Sabre\VObject\Settings::$maxRecurrences;
    \Sabre\VObject\Settings::$maxRecurrences = -1;

    // Group the VEVENTs by UID: a series and its moved occurrences belong
    // together. Events without a UID are independent.
    $groups = array();
    foreach ($calendar->select('VEVENT') as $index => $vevent) {
        $uid = isset($vevent->UID) ? (string) $vevent->UID : '';
        $key = $uid === '' ? "\0" . $index : $uid;
        $groups[$key][] = $vevent;
    }

    $fromDate = (new DateTimeImmutable('@' . (int) $from));
    $toDate = (new DateTimeImmutable('@' . (int) $to));
    $events = array();
    try {
        foreach ($groups as $key => $vevents) {
            try {
                dashticz_ical_expand_group($vevents, $fromDate, $toDate, $timeZone, $maxItems, $events);
            } catch (NoInstancesException $error) {
                // Every occurrence is excluded (EXDATE): nothing to show.
            } catch (Exception $error) {
                $summary = isset($vevents[0]->SUMMARY) ? (string) $vevents[0]->SUMMARY : (string) $key;
                $warnings[] = 'Skipped event "' . mb_substr($summary, 0, 80) . '": ' . $error->getMessage();
            }
        }
    } finally {
        \Sabre\VObject\Settings::$maxRecurrences = $previousMax;
    }

    usort($events, function ($a, $b) {
        if ($a['start'] !== $b['start']) {
            return $a['start'] < $b['start'] ? -1 : 1;
        }
        return strcmp($a['title'], $b['title']);
    });
    return array_slice($events, 0, max(0, (int) $maxItems));
}

/* Adds the occurrences of one UID group that overlap the window. */
function dashticz_ical_expand_group(array $vevents, DateTimeImmutable $from, DateTimeImmutable $to, DateTimeZone $timeZone, $maxItems, array &$events)
{
    $master = null;
    foreach ($vevents as $vevent) {
        if (!isset($vevent->{'RECURRENCE-ID'})) {
            $master = $vevent;
            break;
        }
    }
    $recurring = $master !== null && (isset($master->RRULE) || isset($master->RDATE));
    if (!$recurring) {
        // Plain events (and orphaned overrides of a series we never got).
        foreach ($vevents as $vevent) {
            if (!isset($vevent->DTSTART)) {
                continue;
            }
            $occurrence = dashticz_ical_occurrence($vevent, $timeZone);
            if (dashticz_ical_overlaps($occurrence, $from, $to)) {
                $events[] = $occurrence;
            }
        }
        return;
    }

    $iterator = new EventIterator($vevents, null, $timeZone);
    $steps = 0;
    $added = 0;
    while ($iterator->valid()) {
        if (++$steps > DASHTICZ_ICAL_MAX_STEPS) {
            throw new RuntimeException('too many recurrences');
        }
        $start = $iterator->getDtStart();
        if ($start >= $to || $added >= $maxItems) {
            break;
        }
        $end = $iterator->getDtEnd();
        if ($end > $from || ($end == $start && $start >= $from)) {
            $occurrence = dashticz_ical_occurrence($iterator->getEventObject(), $timeZone);
            if (!$occurrence['allDay']) {
                // getEventObject() writes the occurrence in UTC; the iterator
                // has the exact start/end (DURATION, moved occurrences).
                $occurrence['start'] = $start->getTimestamp();
                $occurrence['end'] = $end->getTimestamp();
                $occurrence['date'] = $start->setTimezone($timeZone)->format('Y-m-d');
            }
            $events[] = $occurrence;
            $added++;
        }
        $iterator->next();
    }
}

function dashticz_ical_overlaps(array $occurrence, DateTimeImmutable $from, DateTimeImmutable $to)
{
    $start = $occurrence['start'];
    $end = $occurrence['end'] === null ? $start : $occurrence['end'];
    return $start < $to->getTimestamp() && ($end > $from->getTimestamp() || ($end === $start && $start >= $from->getTimestamp()));
}

/* One VEVENT -> the array documented at dashticz_ical_occurrences(). */
function dashticz_ical_occurrence($vevent, DateTimeZone $timeZone)
{
    $dtstart = $vevent->DTSTART;
    $allDay = !$dtstart->hasTime();
    $start = $dtstart->getDateTime($timeZone);
    $end = null;
    if (isset($vevent->DTEND)) {
        $end = $vevent->DTEND->getDateTime($timeZone);
    } elseif (isset($vevent->DURATION)) {
        $end = $start->add($vevent->DURATION->getDateInterval());
    } elseif ($allDay) {
        // RFC 5545: an all-day event without an end lasts that one day.
        $end = $start->modify('+1 day');
    }
    if ($end !== null && $end < $start) {
        $end = $start;
    }
    return array(
        'uid' => isset($vevent->UID) ? (string) $vevent->UID : '',
        'title' => isset($vevent->SUMMARY) ? (string) $vevent->SUMMARY : '',
        'desc' => isset($vevent->DESCRIPTION) ? (string) $vevent->DESCRIPTION : '',
        'location' => isset($vevent->LOCATION) ? (string) $vevent->LOCATION : '',
        'start' => $start->getTimestamp(),
        'end' => $end === null ? null : $end->getTimestamp(),
        'allDay' => $allDay,
        'date' => $start->format('Y-m-d'),
    );
}
