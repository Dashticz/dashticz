<?php
/**
 * @author Roman Ozana <ozana@omdesign.cz>
 */

use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();

$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/wrong_dates.ics');
$events = $cal->getSortedEvents();
Assert::same('29.9.2014 00:00:00', $events[1]['DTSTART']->format('j.n.Y H:i:s'));
Assert::same(null, $events[1]['DTEND']);

Assert::same(null, $events[0]['DTSTART']);
Assert::same('30.9.2014 00:00:00', $events[0]['DTEND']->format('j.n.Y H:i:s'));
