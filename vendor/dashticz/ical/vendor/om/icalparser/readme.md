# PHP iCal Parser

[![Build Status](https://travis-ci.org/OzzyCzech/icalparser.svg?branch=master)](https://travis-ci.org/OzzyCzech/icalparser) [![Latest Stable Version](https://poser.pugx.org/om/icalparser/v/stable.png)](https://packagist.org/packages/om/icalparser) [![Total Downloads](https://poser.pugx.org/om/icalparser/downloads.png)](https://packagist.org/packages/om/icalparser) [![Latest Unstable Version](https://poser.pugx.org/om/icalparser/v/unstable.png)](https://packagist.org/packages/om/icalparser) [![License](https://poser.pugx.org/om/icalparser/license.png)](https://packagist.org/packages/om/icalparser)

Internet Calendaring Parser [rfc2445](https://www.ietf.org/rfc/rfc2445.txt) or iCal parser is simple PHP 5.6+ class for parsing format into array.

## How to install

```bash
composer require om/icalparser
```

##  Usage

```php
<?php
require_once '../vendor/autoload.php';
$cal = new \om\IcalParser();
$results = $cal->parseFile(
	'https://www.google.com/calendar/ical/cs.czech%23holiday%40group.v.calendar.google.com/public/basic.ics'
);

foreach ($cal->getSortedEvents() as $r) {
	echo sprintf('	<li>%s - %s</li>' . PHP_EOL, $r['DTSTART']->format('j.n.Y'), $r['SUMMARY']);
}
```

## Requirements

- PHP 7.0+

## Run tests

iCal parser using [Nette Tester](https://github.com/nette/tester).
The tests can be invoked via [composer](https://getcomposer.org/).

```bash
composer update
composer tests
```
 
## TODO

- add ATTENDEE support https://www.kanzaki.com/docs/ical/attendee.html
