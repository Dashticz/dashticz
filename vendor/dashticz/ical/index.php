<?php
header("Access-Control-Allow-Origin: *");
header('Content-Type: text/html');
http_response_code(500);
$cleanexit = 0;


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
    $errfile = "unknown file";
    $errstr  = "shutdown";
    $errno   = E_CORE_ERROR;
    $errline = 0;

    $error = error_get_last();

    if($error !== NULL) {
        $errno   = $error["type"];
        $errfile = $error["file"];
        $errline = $error["line"];
        $errstr  = $error["message"];
        print(format_error( $errno, $errstr, $errfile, $errline));
    }
}

function format_error( $errno, $errstr, $errfile, $errline ) {
	global $ICS;
    $trace = print_r( debug_backtrace( false ), true );
	$icalurl = isset($ICS) ? $ICS : 'Undefined';
    $content = "
    <table>
        <tbody>
			<tr>
				<th>Icalurl</th>
				<td>$icalurl</td>
			</tr>
			<tr>
                <th>Error</th>
                <td><pre>$errstr</pre></td>
            </tr>
            <tr>
                <th>Errno</th>
                <td><pre>$errno</pre></td>
            </tr>
            <tr>
                <th>File</th>
                <td>$errfile</td>
            </tr>
            <tr>
                <th>Line</th>
                <td>$errline</td>
			</tr>
            <tr>
                <th>Trace</th>
                <td><pre>$trace</pre></td>
            </tr>
        </tbody>
    </table>";
    return $content;
}

if (!empty($argv[1])) {
	parse_str($argv[1], $_GET);
  }
$ICS = $_GET['url'];

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

//print "url: ".$ICS . "\n";
if (!empty($argv[2])) {
	parse_str($argv[2], $_GET);
  }
$MAXITEMS = $_GET['maxitems'];
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

$errors=array();
set_error_handler(function($errno, $errstr, $errfile = 0, $errline = 0, $errcontext = 0) {
	global $errors;
	$errors[]=$errstr;
	return false;
});

try {
	if ( $METHOD==0) {
		@$res = ical5($ICS, $MAXITEMS);
	}
	else {
		@$res = ical7($ICS, $MAXITEMS, $HISTORY);
	}
}
catch (exception $e) {
    $errors[]='Error';
} 

$res['_errors'] = $errors;
header('Content-Type: application/json');
http_response_code(200);
$clean_exit=1;
die(json_encode($res));
 

function ical7($ICS, $MAXITEMS, $HISTORY) {
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
				$data[$start] = $jsEvt;
				if ($id>=$MAXITEMS)
					break;
			}
		}
		return $data;
	} catch (\Exception $e) {
		die($e);
	}
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

