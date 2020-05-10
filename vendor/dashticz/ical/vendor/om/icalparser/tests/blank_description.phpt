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

$cal = new IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/blank_description.ics');

Assert::same('', $results['VEVENT'][0]['DESCRIPTION']);
Assert::same('America/Los_Angeles', $cal->timezone->getName());

Assert::same($results['DAYLIGHT'][0]['RRULE']['FREQ'], 'YEARLY');
