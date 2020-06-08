<?php
/**
 * @author Roman Ozana <ozana@omdesign.cz>
 */

use om\IcalParser;
use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();
date_default_timezone_set('Europe/Prague');

// sort by date
$cal = new IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/basic.ics');
$events = $cal->getSortedEvents();
Assert::same('1.1.2013 00:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));

// reverse sort (parseFile)
$cal = new IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/basic.ics');
$events = $cal->getReverseSortedEvents();
Assert::same('26.12.2015 00:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));

// reverse sort (parseString)
$cal = new IcalParser();
$results = $cal->parseString(file_get_contents(__DIR__ . '/cal/basic.ics'));
$events = $cal->getReverseSortedEvents();
Assert::same('26.12.2015 00:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));
