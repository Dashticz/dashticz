<?php
/**
 * @author PC Drew <pc@soprisapps.com>
 */

use Tester\Assert;

require_once __DIR__ . '/../vendor/autoload.php';
\Tester\Environment::setup();
date_default_timezone_set('Europe/Prague');

$cal = new \om\IcalParser();
$results = $cal->parseFile(__DIR__ . '/cal/multiple_attachments.ics');

// Backwards compatibility, there is only ever one key displayed
Assert::type('string', $results['VEVENT'][0]['ATTACH']);

// The new key 'ATTACHMENTS' is an array with 1 or more attachments
Assert::type('array', $results['VEVENT'][0]['ATTACHMENTS']);
Assert::count(2, $results['VEVENT'][0]['ATTACHMENTS']);
