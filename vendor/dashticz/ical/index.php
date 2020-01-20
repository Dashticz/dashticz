<?php
/* Additional dependencies:
sudo apt-get install php-mbstring

and don't forget to run:
sudo service apache2 restart

*/
header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

require_once('./vendor/autoload.php');
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

/*$ical = new SG_iCalReader($ICS);
$evts = $ical->getEvents();
$data = array();
if($evts){
	foreach($evts as $id => $ev) {
		$jsEvt = array(
			"id" => ($id+1),
			"title" => $ev->getProperty('summary'),
			"start" => $ev->getStart(),
			"end"   => $ev->getEnd()-1,
			"allDay" => $ev->isWholeDay(),
		);
		if($jsEvt["end"]<0) $jsEvt["end"] = $jsEvt["start"];
		$jsEvt["startt"] = date('Y-m-d H:i:s',$ev->getStart());
		$jsEvt["endt"] = date('Y-m-d H:i:s',$ev->getEnd()-1);
		if(substr($jsEvt["endt"],0,10)=='1970-01-01'){
			$jsEvt["endt"] = $jsEvt["startt"];
			$jsEvt["allDay"]=1;
		}
		$count = 0;
		$start = $ev->getStart();
		if (isset($ev->recurrence)) {
			$freq = $ev->getFrequency();
			$currentdate = time();
			$start=$freq->previousOccurrence($currentdate);
			while ($start && ($count<$MAXITEMS)) {
				$jsEvt["start"] = $start;
				$jsEvt["end"] = $start + $ev->getDuration()-1;
				$jsEvt["startt"] = date('Y-m-d H:i:s',$jsEvt["start"]);
				$jsEvt["endt"] = date('Y-m-d H:i:s',$jsEvt["end"]);
				$data[$start] = $jsEvt;
				$count++;
				$start=$freq->nextOccurrence($start);
			}
		} else {
			if(date('Y',$start)>2016) $data[$start] = $jsEvt;
		}
	}
}
ksort($data);
die(json_encode($data));
echo '<pre>';
print_r($data);
exit();
?>
*/