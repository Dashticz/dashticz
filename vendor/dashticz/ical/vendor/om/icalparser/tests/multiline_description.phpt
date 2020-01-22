<?php
/**
 * @author Aaron Parecki <aaron@parecki.com>
 */

use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();
date_default_timezone_set('Europe/Prague');

// sort by date
$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/multiline_description.ics');
$events = $cal->getSortedEvents();
Assert::same('30.6.2012 06:00:00', $events[0]['DTSTART']->format('j.n.Y H:i:s'));
Assert::same("Here is a description that spans multiple lines!\n\nThis should be on a new line as well because the description contains newline characters.", $events[0]['DESCRIPTION']);
