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
$results = $cal->parseFile(__DIR__ . '/cal/url.ics');

Assert::true(isset($results['VEVENT'][0]));
$event = reset($results['VEVENT']);
Assert::true(isset($event['URL']));
Assert::equal($event['URL'], urlencode('https://github.com/OzzyCzech/icalparser/'));
