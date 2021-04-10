<?php

use om\IcalParser;
use Tester\Assert;
use Tester\Environment;

require_once __DIR__ . '/../vendor/autoload.php';
Environment::setup();
date_default_timezone_set('Europe/Prague');

$cal = new IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/multiple_categories.ics');
$events = $cal->getSortedEvents();

foreach ($events as $event) {
	Assert::type('array', $event['CATEGORIES']);
	Assert::same(['one', 'two', 'three'], $event['CATEGORIES']);
}