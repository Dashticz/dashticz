<?php
/**
 * @author Marc Vachette <marc.vachette@gmail.com>
 */

use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();
date_default_timezone_set('Europe/Paris');

//some clean timezone
$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/blank_description.ics');
Assert::same('America/Los_Angeles', $cal->timezone->getName());

$results = $cal->parseFile(__DIR__ . '/cal/utc_negative_zero.ics');
Assert::same('Etc/GMT', $cal->timezone->getName());

//time zone with custom prefixes (Mozilla files tken from here: https://www.mozilla.org/en-US/projects/calendar/holidays/)
$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/FrenchHolidays.ics');
Assert::same('Europe/Paris', $cal->timezone->getName());

$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/weird_windows_timezones.ics');
$events = $cal->getSortedEvents();
