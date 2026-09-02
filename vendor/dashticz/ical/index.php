<?php
require_once(__DIR__ . '/../security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
http_response_code(500);
$clean_exit = 0;
require_once('./vendor/autoload.php');
use ICal\ICal;


if (!defined('PHP_VERSION_ID')) {
    $version = explode('.', PHP_VERSION);

    define('PHP_VERSION_ID', ($version[0] * 10000 + $version[1] * 100 + $version[2]));
}

// PHP_VERSION_ID is defined as a number, where the higher the number
// is, the newer a PHP version is used. It's defined as used in the above
// expression:
//
// $version_id = $major_version * 10000 + $minor_version * 100 + $release_version;
//
// Now with PHP_VERSION_ID we can check for features this PHP version
// may have, this doesn't require to use version_compare() everytime
// you check if the current PHP version may not support a feature.
//
// For example, we may here define the PHP_VERSION_* constants thats
// not available in versions prior to 5.2.7
register_shutdown_function( "fatal_handler" );

function fatal_handler() {
	global $clean_exit;
	if ($clean_exit) return;
    $error = error_get_last();
    if($error !== NULL) {
        http_response_code(500);
        print(json_encode(array(
            '_errors' => array('Calendar processing failed.'),
        )));
    }
}

if (!empty($argv[1])) {
	parse_str($argv[1], $_GET);
  }
$ICS = isset($_GET['url']) ? $_GET['url'] : '';
/*
//temporarily removed. get_headers doesn't work for local files
$file_headers = @get_headers($ICS);
if(!$file_headers || $file_headers[0] == 'HTTP/1.1 404 Not Found') {
    $exists = false;
}
else {
    $exists = true;
}

if ( !$exists ) {
	http_response_code(404);
	print("Calendar not found: $ICS");
	$cleanexit = 1;
	die();
}
*/
//print "url: ".$ICS . "\n";
if (!empty($argv[2])) {
	parse_str($argv[2], $_GET);
  }
$MAXITEMS = isset($_GET['maxitems']) ? max(1, min(500, (int) $_GET['maxitems'])) : 100;
//print "maxitems: ".$MAXITEMS . "\n";

$HISTORY = isset($_GET['history']) ? $_GET['history'] : 0;

$METHOD = isset($_GET['method']) ? $_GET['method'] : 0;

$ICS = str_replace('#','%23',$ICS);
//echo $ICS . "\n";

//fallback to previous ical implementation in case PHP version < 7.1
//Disadvantage: Yearly recurring events don't work very well ...

if (PHP_VERSION_ID < 70100) {
	$METHOD = 0;
}
//$METHOD = 0;
$errors=array();
set_error_handler(function($errno, $errstr, $errfile = 0, $errline = 0, $errcontext = 0) {
	global $errors;
	$errors[]=$errstr;
	return true;
});

//Microsoft expects an useragent
ini_set('user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:72.0) Gecko/20100101 Firefox/72.0');

try {
	$remoteCalendar = dashticz_fetch_remote($ICS, 2097152);
	$calendarContent = $remoteCalendar['body'];
	if ( $METHOD==0) {
		$res = ical5($calendarContent, $MAXITEMS);
	}
	elseif ( $METHOD==2) {
		$res = icaljg($calendarContent, $MAXITEMS, $HISTORY);
	}
	else {
		$res = ical7($calendarContent, $MAXITEMS, $HISTORY);
	}
}
catch (Exception $e) {
    $errors[]='Unable to load or parse the calendar.';
	$res = array();
}

$res['_errors'] = $errors;
header('Content-Type: application/json');
http_response_code(200);
$clean_exit=1;
die(json_encode($res));


function icaljg($calendarContent, $MAXITEMS, $HISTORY) {

	try {
		$ical = new ICal(false, array(
			'defaultSpan'                 => 2,     // Default value
//			'defaultTimeZone'             => 'UTC',
			'defaultWeekStart'            => 'MO',  // Default value
			'disableCharacterReplacement' => false, // Default value
			'filterDaysAfter'             => 365,  // Default value
			'filterDaysBefore'            => (int)$HISTORY+8,	//for the calendar view we may need one additional week
			'skipRecurrence'              => false, // Default value
		));
		// $ical->initFile('ICal.ics');
		$ical->initString($calendarContent);
//		print_r(json_encode($ical->events(), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

/*
    public function eventsFromInterval($interval)
    {
        $rangeStart = new \DateTime('now', new \DateTimeZone($this->defaultTimeZone));
        $rangeEnd   = new \DateTime('now', new \DateTimeZone($this->defaultTimeZone));

        $dateInterval = \DateInterval::createFromDateString($interval);
        $rangeEnd->add($dateInterval);

        return $this->eventsFromRange($rangeStart->format('Y-m-d'), $rangeEnd->format('Y-m-d'));
    }
*/
		$rangeStart = new \DateTime('now', new \DateTimeZone($ical->defaultTimeZone));
		$realStart = $rangeStart->sub(new DateInterval('P'.$HISTORY.'D'));
//		print_r($realStart->format('Y-m-d'));
		$id=0;
//		$sorted_events = $ical->events();
//		$sorted_events = $ical->eventsFromRange($realStart->format('Y-m-d'),$realStart->add(new DateInterval('P1Y'))->format('Y-m-d'));
//		$sorted_events = $ical->eventsFromRange();
		$sorted_events = $ical->sortEventsWithOrder($ical->events());

//		print_r(json_encode($sorted_events, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
	//	var_dump($sorted_events[0]);
		$data = array();
		foreach ( $sorted_events as $event) {
			$start=$event->dtstart_array[2];
			if (isset($event->dtend_array))
				$end=$event->dtend_array[2];
			else
				$end=$start;
			$duration = $end-$start;

				$jsEvt = array(
					"id" => ($id++),
					"title" => $event->summary,
					"desc" => isset($event->description) ? $event->description : '',
					"location" => isset($event->location) ? $event->location : '',
					"start" => $start,
					"end"   => $end,
					"allDay" => $duration > 0 && ($duration % 86400) == 0,
				);
	/* 			$a=array();
				array_push($a,$ev["ATTENDEE"]); */
				$data[] = $jsEvt;
				if ($id>=500)		//we limit to 500 events. Should be sufficient ...
					break;
		}
		return $data;
	} catch (\Exception $e) {
		throw $e;
	}
}

function ical7($calendarContent, $MAXITEMS, $HISTORY) {
	require_once('./vendor/autoload.php');
	try {
		$cal = new \om\IcalParser();
		$results = $cal->parseString($calendarContent);
		$data = array();
		$id=0;
		$sorted_events = $cal->getSortedEvents();
//		print_r(json_encode($sorted_events, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
	//	var_dump($sorted_events[0]);
		foreach ( $sorted_events as $ev) {
			$start=$ev["DTSTART"]->getTimestamp();
			if (isset($ev["DTEND"]))
				$end=$ev["DTEND"]->getTimestamp();
			else
				$end=$start;
			if ($end>time()-((int)$HISTORY*24*3600)) {
				$duration = $end-$start;
				$jsEvt = array(
					"id" => ($id++),
					"title" => $ev["SUMMARY"],
					"desc" => isset($ev["DESCRIPTION"]) ? $ev["DESCRIPTION"] : '',
					"location" => isset($ev["LOCATION"]) ? $ev["LOCATION"] : '',
					"start" => $start,
					"end"   => $end,
					"allDay" => $duration > 0 && ($duration % 86400) == 0,
				);
	/* 			$a=array();
				array_push($a,$ev["ATTENDEE"]); */
				$data[] = $jsEvt;
				if ($id>=$MAXITEMS)
					break;
			}
		}
		return $data;
	} catch (\Exception $e) {
		throw $e;
	}
}

function ical5($calendarContent, $MAXITEMS) {
	require_once('./ical5/SG_iCal.php');
	$ical = new SG_iCalReader(false);
	SG_iCal_Parser::ParseString($calendarContent, $ical);
$evts = $ical->getEvents();
$data = array();
if($evts){
	$currentdate = time();
	foreach($evts as $id => $ev) {
		$start = $ev->getStart();
		$end = $ev->getEnd();
		$jsEvt = array(
			"id" => ($id+1),
			"title" => $ev->getProperty('summary'),
			"desc" => $ev->getProperty('description'),
			"start" => $start,
			"end"   => $end,
			"allDay" => $ev->isWholeDay(),
		);
		if($jsEvt["end"]<0) $jsEvt["end"] = $jsEvt["start"];
		$jsEvt["startt"] = date('Y-m-d H:i:s',$ev->getStart());
		$jsEvt["endt"] = date('Y-m-d H:i:s',$ev->getEnd());
		if(substr($jsEvt["endt"],0,10)=='1970-01-01'){
			$jsEvt["endt"] = $jsEvt["startt"];
			$jsEvt["allDay"]=1;
		}
		$count = 0;
		if (isset($ev->recurrence)) {
			$freq = $ev->getFrequency();
//			$start = $freq->nextOccurrence($currentdate);
//			$prevstart=$freq->previousOccurrence($currentdate);
//			echo date('Y-m-d H:i:s',$start).date('Y-m-d H:i:s',$prevstart)."<br>";
//			echo $ev->getDuration().$jsEvt["title"];
//			if ($prevstart && $prevstart + $ev->getDuration() > $currentdate) $start = $prevstart;
//			echo date('Y-m-d H:i:s',$start).date('Y-m-d H:i:s',$prevstart)."<br>";
			while ($start && ($count<$MAXITEMS)) {
//				echo date('Y-m-d H:i:s',$start);
				$jsEvt["start"] = $start;
				$jsEvt["end"] = $start + $ev->getDuration();
				$jsEvt["startt"] = date('Y-m-d H:i:s',$jsEvt["start"]);
				$jsEvt["endt"] = date('Y-m-d H:i:s',$jsEvt["end"]);
				if($jsEvt["end"] > $currentdate) {
					$data[] = $jsEvt;
					$count++;
				}
				$start=$freq->nextOccurrence($start);
			}
		} else {
			if($end>$currentdate) {
				$data[] = $jsEvt;
			}
		}
	}
}
//ksort($data);
return $data;
}
