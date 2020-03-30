<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');


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

if (!empty($argv[1])) {
	parse_str($argv[1], $_GET);
  }
$ICS = $_GET['url'];

//print "url: ".$ICS . "\n";
if (!empty($argv[2])) {
	parse_str($argv[2], $_GET);
  }
$MAXITEMS = $_GET['maxitems'];
//print "maxitems: ".$MAXITEMS . "\n";

$ICS = str_replace('#','%23',$ICS);
//echo $ICS . "\n";

//fallback to previous ical implementation in case PHP version < 7.1
//Disadvantage: Yearly recurring events don't work very well ...
$debug = 0;
if (PHP_VERSION_ID < 70100 || $debug) {
	$errors=array();
	set_error_handler(function($errno, $errstr, $errfile, $errline, $errcontext) {
		// error was suppressed with the @-operator
//		if (0 === error_reporting()) {
//			return false;
//		}
		$errors[]=$errstr;
//		throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
		return false;
	});
	
	@$res = ical5($ICS, $MAXITEMS);
	$res['_errors'] = $errors;
	die(json_encode($res));
} 

require_once('./vendor/autoload.php');
try {
	$cal = new \om\IcalParser();
	$results = $cal->parseFile( $ICS);
	$data = array();
	$id=0;
	$sorted_events = $cal->getSortedEvents();
//	var_dump($sorted_events[0]);
	foreach ( $sorted_events as $ev) {
		$start=$ev["DTSTART"]->getTimestamp();
		if ($ev["DTEND"])
			$end=$ev["DTEND"]->getTimestamp();
		else
			$end=$start;
		if ($end>time()) {
			$duration = $end-$start;
			$jsEvt = array(
				"id" => ($id++),
				"title" => $ev["SUMMARY"],
				"start" => $start,
				"end"   => $end,
				"allDay" => $duration > 0 && ($duration % 86400) == 0,
			);
			$data[$start] = $jsEvt;
			if ($id>=$MAXITEMS)
				break;
		}
	}
	die(json_encode($data));
} catch (\Exception $e) {
    die($e);
}

function ical5($ICS, $MAXITEMS) {
	require_once('./ical5/SG_iCal.php');
	$ical = new SG_iCalReader($ICS);
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
			$start = $freq->nextOccurrence($currentdate);
			$prevstart=$freq->previousOccurrence($currentdate);
			if ($prevstart && $prevstart + $ev->getDuration() > $currentdate) $start = $prevstart;
			while ($start && ($count<$MAXITEMS)) {
				$jsEvt["start"] = $start;
				$jsEvt["end"] = $start + $ev->getDuration();
				$jsEvt["startt"] = date('Y-m-d H:i:s',$jsEvt["start"]);
				$jsEvt["endt"] = date('Y-m-d H:i:s',$jsEvt["end"]);
				$data[$start] = $jsEvt;
				$count++;
				$start=$freq->nextOccurrence($start);
			}
		} else {
			if($end>$currentdate) {
				$data[$start] = $jsEvt;
			}
		}
	}
}
ksort($data);
return $data;
}

