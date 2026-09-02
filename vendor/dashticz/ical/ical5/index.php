<?php
require_once(__DIR__ . '/../../security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
require_once(__DIR__ . '/SG_iCal.php');
if (!empty($argv[1])) {
	parse_str($argv[1], $_GET);
  }
$ICS = isset($_GET['url']) ? (string)$_GET['url'] : '';
$MAXITEMS = isset($_GET['maxitems']) ? max(1, min(500, (int)$_GET['maxitems'])) : 100;
if ($ICS === '') {
	dashticz_json_error(400, 'Calendar URL is required.');
}
$ICS = str_replace('#','%23',$ICS);
try {
	$remoteCalendar = dashticz_fetch_remote($ICS, 2097152);
} catch (RuntimeException $error) {
	dashticz_json_error(400, $error->getMessage());
}
$ical = new SG_iCalReader(false);
SG_iCal_Parser::ParseString($remoteCalendar['body'], $ical);
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
