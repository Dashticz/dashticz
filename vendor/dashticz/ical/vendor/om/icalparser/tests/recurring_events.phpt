<?php
/**
 * @author PC Drew <pc@schoolblocks.com>
 */

use om\IcalParser;
use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();

$cal = new IcalParser();

$results = $cal->parseFile(__DIR__ . '/cal/recur_instances_finite.ics');
$events = $cal->getSortedEvents();

// DTSTART;TZID=America/Los_Angeles:20121002T100000
// DTEND;TZID=America/Los_Angeles:20121002T103000
// RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=1TU;UNTIL=20121231T100000
// RDATE;TZID=America/Los_Angeles:20121110T100000
// RDATE;TZID=America/Los_Angeles:20121105T100000
Assert::equal(5, sizeof($events));
Assert::equal('2.10.2012 10:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('5.11.2012 10:00:00', $events[1]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('6.11.2012 10:00:00', $events[2]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('10.11.2012 10:00:00', $events[3]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('4.12.2012 10:00:00', $events[4]['DTSTART']->format('j.n.Y H:i:s'));

$results = $cal->parseFile(__DIR__ . '/cal/recur_instances.ics');
$events = $cal->getSortedEvents();

$recurrences = [];
foreach ($events as $i => $event) {
	$recurrences[] = $event['DTSTART'];
}

// DTSTART;TZID=America/Los_Angeles:20121002T100000
// DTEND;TZID=America/Los_Angeles:20121002T103000
// RRULE:FREQ=MONTHLY;INTERVAL=1;BYDAY=1TU
// RDATE;TZID=America/Los_Angeles:20121105T100000
// RDATE;TZID=America/Los_Angeles:20121110T100000,20121130T100000
// EXDATE;TZID=America/Los_Angeles:20130402T100000
// EXDATE;TZID=America/Los_Angeles:20121204T100000
// EXDATE;TZID=America/Los_Angeles:20130205T100000
//      because there is no "UNTIL", we calculate until 3 years from now of repeating events
$now = new \DateTime('now');
$diff = $now->diff(new \DateTime('20121002T100000'));
$count = ($diff->y + 3) * 12 + $diff->m;
Assert::equal($count, sizeof($recurrences));
Assert::equal('02.10.2012 15:00:00', $recurrences[0]->format('d.m.Y H:i:s'));
Assert::equal('06.11.2012 20:00:00', $recurrences[1]->format('d.m.Y H:i:s'));
Assert::equal('10.11.2012 10:00:00', $recurrences[2]->format('d.m.Y H:i:s'));
Assert::equal('30.11.2012 10:00:00', $recurrences[3]->format('d.m.Y H:i:s'));
Assert::equal('01.01.2013 10:00:00', $recurrences[4]->format('d.m.Y H:i:s'));
Assert::equal('05.03.2013 10:00:00', $recurrences[5]->format('d.m.Y H:i:s'));
Assert::equal('07.05.2013 10:00:00', $recurrences[6]->format('d.m.Y H:i:s'));
Assert::equal('04.06.2013 10:00:00', $recurrences[7]->format('d.m.Y H:i:s'));
Assert::equal('02.07.2013 10:00:00', $recurrences[8]->format('d.m.Y H:i:s'));
Assert::equal('06.08.2013 10:00:00', $recurrences[9]->format('d.m.Y H:i:s'));
Assert::equal('03.09.2013 10:00:00', $recurrences[10]->format('d.m.Y H:i:s'));
Assert::equal('01.10.2013 10:00:00', $recurrences[11]->format('d.m.Y H:i:s'));
Assert::equal('05.11.2013 10:00:00', $recurrences[12]->format('d.m.Y H:i:s'));
Assert::equal('03.12.2013 10:00:00', $recurrences[13]->format('d.m.Y H:i:s'));
Assert::equal('07.01.2014 10:00:00', $recurrences[14]->format('d.m.Y H:i:s'));
Assert::equal('04.02.2014 10:00:00', $recurrences[15]->format('d.m.Y H:i:s'));
Assert::equal('04.03.2014 10:00:00', $recurrences[16]->format('d.m.Y H:i:s'));
Assert::equal('01.04.2014 10:00:00', $recurrences[17]->format('d.m.Y H:i:s'));
Assert::equal('06.05.2014 10:00:00', $recurrences[18]->format('d.m.Y H:i:s'));
Assert::equal('03.06.2014 10:00:00', $recurrences[19]->format('d.m.Y H:i:s'));
Assert::equal('01.07.2014 10:00:00', $recurrences[20]->format('d.m.Y H:i:s'));
Assert::equal('05.08.2014 10:00:00', $recurrences[21]->format('d.m.Y H:i:s'));
Assert::equal('02.09.2014 10:00:00', $recurrences[22]->format('d.m.Y H:i:s'));
Assert::equal('07.10.2014 10:00:00', $recurrences[23]->format('d.m.Y H:i:s'));
Assert::equal('04.11.2014 10:00:00', $recurrences[24]->format('d.m.Y H:i:s'));
Assert::equal('02.12.2014 10:00:00', $recurrences[25]->format('d.m.Y H:i:s'));
Assert::equal('06.01.2015 10:00:00', $recurrences[26]->format('d.m.Y H:i:s'));
Assert::equal('03.02.2015 10:00:00', $recurrences[27]->format('d.m.Y H:i:s'));
Assert::equal('03.03.2015 10:00:00', $recurrences[28]->format('d.m.Y H:i:s'));
Assert::equal('07.04.2015 10:00:00', $recurrences[29]->format('d.m.Y H:i:s'));
Assert::equal('05.05.2015 10:00:00', $recurrences[30]->format('d.m.Y H:i:s'));
Assert::equal('02.06.2015 10:00:00', $recurrences[31]->format('d.m.Y H:i:s'));
Assert::equal('07.07.2015 10:00:00', $recurrences[32]->format('d.m.Y H:i:s'));
Assert::equal('04.08.2015 10:00:00', $recurrences[33]->format('d.m.Y H:i:s'));
Assert::equal('01.09.2015 10:00:00', $recurrences[34]->format('d.m.Y H:i:s'));

foreach ($events[0]['EXDATES'] as $exDate) {
	Assert::notContains($exDate, $recurrences);
}

$results = $cal->parseFile(__DIR__ . '/cal/recur_instances_with_modifications.ics');
$events = $cal->getSortedEvents();

Assert::false(empty($events[0]['RECURRENCES']));
// the 12th entry is the modified event, related to the remaining recurring events
Assert::true(empty($events[12]['RECURRENCES']));

$recurrences = $events[0]['RECURRENCES'];
$modifiedEvent = $events[12];

// There should be 35 total recurrences because the modified event should've removed 1 recurrence
Assert::equal(35, sizeof($recurrences));
// There should be 36 total events because of the modified event + 35 recurrences
Assert::equal(36, sizeof($events));
Assert::notContains($modifiedEvent['DTSTART'], $recurrences);

$results = $cal->parseFile(__DIR__ . '/cal/recur_instances_with_modifications_and_interval.ics');

// Build the cache of RECURRENCE-IDs and EXDATES first, so that we can properly determine the interval
$eventCache = [];
foreach ($results['VEVENT'] as $event) {
	$eventSequence = empty($event['SEQUENCE']) ? "0" : $event['SEQUENCE'];
	$eventRecurrenceID = empty($event['RECURRENCE-ID']) ? "0" : $event['RECURRENCE-ID'];

	$eventCache[$event['UID']][$eventRecurrenceID][$eventSequence] = $event;
}
$trueEvents = [];
foreach ($results['VEVENT'] as $event) {
	if (empty($event['RECURRENCES'])) {
		$trueEvents[] = $event;
	} else {
		$eventUID = $event['UID'];
		foreach ($event['RECURRENCES'] as $recurrence) {
			$eventRecurrenceID = $recurrence->format("Ymd");
			if (empty($eventCache[$eventUID][$eventRecurrenceID])) {
				$trueEvents[$eventRecurrenceID] = ['DTSTART' => $recurrence];
			} else {
				krsort($eventCache[$eventUID][$eventRecurrenceID]);
				$keys = array_keys($eventCache[$eventUID][$eventRecurrenceID]);
				$trueEvents[$eventRecurrenceID] = $eventCache[$eventUID][$eventRecurrenceID][$keys[0]];
			}
		}
	}
}

usort(
	$trueEvents,
	static function ($a, $b): int {
		return ($a['DTSTART'] > $b['DTSTART']) ? 1 : -1;
	}
);

$events = $cal->getSortedEvents();
Assert::false(empty($events[0]['RECURRENCES']));
Assert::equal(count($trueEvents), count($events));
foreach ($trueEvents as $index => $trueEvent) {
	Assert::equal($trueEvent['DTSTART']->format("Ymd"), $events[$index]['DTSTART']->format("Ymd"));
}

// There is still an issue that needs to be resolved when modifications are made to the initial event that is the
// base of the recurrences.  The below ICS file has a great edge case example: one event, no recurrences in the
// recurring ruleset, and a modification to the initial event.
$results = $cal->parseFile(__DIR__ . '/cal/recur_instances_with_modifications_to_first_day.ics');
$events = $cal->getSortedEvents();
Assert::true(empty($events[0]['RECURRENCES'])); // edited event
Assert::true(empty($events[1]['RECURRENCES'])); // recurring event base with no recurrences
Assert::equal(1, count($events));

$results = $cal->parseFile(__DIR__ . '/cal/daily_recur.ics');
$events = $cal->getSortedEvents();
$period = new DatePeriod(new DateTime('20120801T050000'), new DateInterval('P1D'), 365 * 3);
foreach ($period as $i => $day) {
	Assert::equal($day->format('j.n.Y H:i:s'), $events[$i]['DTSTART']->format('j.n.Y H:i:s'));
}

$results = $cal->parseFile(__DIR__ . '/cal/daily_recur2.ics');
$events = $cal->getSortedEvents();

Assert::equal(4, sizeof($events));
Assert::equal('21.8.2017 00:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('28.8.2017 00:00:00', $events[1]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('4.9.2017 00:00:00', $events[2]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('11.9.2017 00:00:00', $events[3]['DTSTART']->format('j.n.Y H:i:s'));

//https://github.com/OzzyCzech/icalparser/issues/38
$results = $cal->parseFile(__DIR__ . '/cal/38_weekly_recurring_event_missing_day.ics');
$events = $cal->getSortedEvents();

//first monday
Assert::equal('25.2.2019 09:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));
//rest of week
Assert::equal('26.2.2019 09:00:00', $events[1]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('27.2.2019 09:00:00', $events[2]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('28.2.2019 09:00:00', $events[3]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('1.3.2019 09:00:00', $events[4]['DTSTART']->format('j.n.Y H:i:s'));
//now check the next 4 mondays to make sure they exist as well
Assert::equal('4.3.2019 09:00:00', $events[5]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('11.3.2019 09:00:00', $events[10]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('18.3.2019 09:00:00', $events[15]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('25.3.2019 09:00:00', $events[20]['DTSTART']->format('j.n.Y H:i:s'));

//Last week that works correctly
Assert::equal('1.4.2019 09:00:00', $events[25]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('2.4.2019 09:00:00', $events[26]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('3.4.2019 09:00:00', $events[27]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('4.4.2019 09:00:00', $events[28]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('5.4.2019 09:00:00', $events[29]['DTSTART']->format('j.n.Y H:i:s'));

//This week starts failing
Assert::equal('8.4.2019 09:00:00', $events[30]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('9.4.2019 09:00:00', $events[31]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('10.4.2019 09:00:00', $events[32]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('11.4.2019 09:00:00', $events[33]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('12.4.2019 09:00:00', $events[34]['DTSTART']->format('j.n.Y H:i:s'));

Assert::equal('15.4.2019 09:00:00', $events[35]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('16.4.2019 09:00:00', $events[36]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('17.4.2019 09:00:00', $events[37]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('18.4.2019 09:00:00', $events[38]['DTSTART']->format('j.n.Y H:i:s'));
Assert::equal('19.4.2019 09:00:00', $events[39]['DTSTART']->format('j.n.Y H:i:s'));
