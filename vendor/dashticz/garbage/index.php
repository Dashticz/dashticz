<?php

header("Access-Control-Allow-Origin: *");
header('Content-Type: application/json');

$messages = array(); 
$debug = 0;
$ignoressl = false;

if (isset($_GET['ignoressl'])) {
	$ignoressl =  ( true == $_GET['ignoressl']);
}
/*
if ($debug==0) error_reporting(E_ERROR | E_PARSE);
*/

$errors=array();
set_error_handler(function($errno, $errstr, $errfile = 0, $errline = 0, $errcontext = 0) {
	// error was suppressed with the @-operator
//		if (0 === error_reporting()) {
//			return false;
//		}
$errors[]=$errstr;
//		throw new ErrorException($errstr, 0, $errno, $errfile, $errline);
	return false;
});

@$res = getCalendar();

$res[]= (object) [
	'dt_msg' => $messages,
	'errors' => $errors,
];

die(json_encode($res));

function printMessages() {
	global $messages;
	print(json_encode($messages));
}

function report($msg, $type) {
	global $messages;
	$messages[]=array('dt_msg'=>$msg, 'type'=>$type);
	if ($type=='error') {
		printMessages();
		die('Exiting.');
	}
}

function errorMsg($msg) {
	report( $msg, 'error');
}

function warningMsg($msg) {
	report( $msg, 'warning');
}

function debugMsg($msg) {
	global $debug;
	if ($debug==1) {
		report( $msg, 'debug');
	}
	if ($debug==2) {
		print('debug: '.json_encode($msg, JSON_PRETTY_PRINT)."\n");
	}
}

function logMsg($msg) {
	report( $msg, 'msg');
}

function curlPost($url, $data=0) {
//Create curl Post request
	debugMsg($url);
	debugMsg($data);
	$options = array( 
		CURLOPT_POST => 1,
		CURLOPT_POSTFIELDS => $data
	);
	return curlWeb($url, $options);
}

function curlPostJson($url, $data) {
	return json_decode(curlPost($url, $data),true);
}

function fileGetJson($url) {
	return json_decode(file_get_contents($url), true);
}

function curlWeb($url, $options=0) {
	global $ignoressl;
	$ch = curl_init();
	curl_setopt($ch, CURLOPT_URL, $url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	if ($ignoressl) {
		report('SSL check disabled', 'info');
		curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
	}
	if ($options) {
		foreach($options as $key => $value) {
			curl_setopt($ch, $key, $value);
		}
	}
	$server_output = curl_exec ($ch);
	curl_close ($ch);
	return $server_output;

}

function curlWebJson($url, $headers=0) {
	return json_decode(curlWeb($url, array( CURLOPT_HTTPHEADER=>$headers)));
}

//get match with regexp from webpage
function curlWebMatch($url, $regexp) {
	preg_match($regexp, curlWeb($url), $match);
	return $match;
}

function getCalendar() {
	$allDates=array();
	$zipCode = $_GET['zipcode'];
	$houseNr = $_GET['nr'];
	$houseNrSuf = $_GET['t'];
	$sub = $_GET['sub'];
	$service = $_GET['service'];
/*	$zipCode = '7091xh';
	$houseNr = 57;
	$houseNrSuf = '';
	$sub='';
	$service='rova';*/
	if (!empty($_GET['debug'])) $debug = $_GET['debug'];

	switch($service){
		case 'rova':
			/*
			$options = array(
				CURLOPT_HEADER => 0,
				CURLOPT_COOKIE => "RovaLc_inwoners={\"Id\":0,\"ZipCode\":\"".$zipCode."\",\"HouseNumber\":\"".$houseNr."\",\"HouseAddition\":null,\"Municipality\":null,\"Province\":null,\"Firstname\":null,\"Lastname\":null,\"UserAgent\":\"\",\"School\":null,\"Street\":null,\"Country\":null,\"Portal\":null,\"AreaLevel\":null,\"City\":null,\"Ip\":null}"
			);
			$output = curlWeb(
				'https://www.rova.nl/api/TrashCalendar/GetCalendarItems?portal=inwoners',
				$options
			);*/
			$url = 	'http://api.inzamelkalender.rova.nl/webservices/appsinput/?postcode='.$zipCode.'&street=&huisnummer='.$houseNr.'&toevoeging='.$houseNrSuf.'&apikey=5ef443e778f41c4f75c69459eea6e6ae0c2d92de729aa0fc61653815fbd6a8ca&method=postcodecheck&platform=phone&langs=nl&mobiletype=android&version=3&app_name=rova';
//			$return = json_decode($output,true);
			$return = curlWebJson($url);
//			debugMsg($return);
			//var_dump($return->data);
//			var_dump($return->data->ophaaldagen);
			if ($return->data->ophaaldagen->response == 'OK') {
				foreach($return->data->ophaaldagen->data as $row){
					//debugMsg($row);
//					var_dump($row);
					$title = $row->nameType;
					if(!empty($row->date)){
						list($date,$time)=explode('T',$row->date);
						$allDates[$date][$title] = $date;
					}
				}
			}
			break;
		
		case 'deafvalapp': 
			$url = 'https://dataservice.deafvalapp.nl/dataservice/DataServiceServlet?type=ANDROID&service=OPHAALSCHEMA&land=NL&postcode='.$zipCode.'&straatId=0&huisnr='.$houseNr.'&huisnrtoev='.$houseNrSuf;
			$return = file_get_contents($url);
			$return = explode("\n",$return);
			foreach($return as $row){
				$row = explode(';',$row);
				$title = $row[0];
				foreach($row as $r => $date){
					if($r>0 && !empty($date)){
						list($d,$m,$y) = explode('-',$date);
						$allDates[$y.'-'.$m.'-'.$d][$title] = $y.'-'.$m.'-'.$d;
					}
				}
			}
			break;	
		case 'mijnafvalwijzer': 
			$url = 'http://json.mijnafvalwijzer.nl/?method=postcodecheck&postcode='.$_GET['zipcode'].'&street=&huisnummer='.$_GET['nr'].'&toevoeging='.$_GET['t'];
			$return = fileGetJson($url);
			$return = $return['data']['ophaaldagen']['data'];
			foreach($return as $row){
				$title = $row['type'];
				if(!empty($row['date'])){
					$allDates[$row['date']][$title] = $row['date'];
				}
			}
			
			break;	
		case 'hvc': 
			$url = 'http://inzamelkalender.hvcgroep.nl/push/calendar?postcode='.$_GET['zipcode'].'&huisnummer='.$_GET['nr'];
			$return = fileGetJson($url);
			foreach($return as $row){
				$title = $row['naam'];
				foreach($row['dateTime'] as $date){
					if(!empty($date['date'])){
						list($date,$time)=explode(' ',$date['date']);
						$allDates[$date][$title] = $date;
					}
				}
			}
			break;
		case 'edg': 
			$url = 'https://www.edg.de/JsonHandler.ashx?dates=1&street='.$_GET['street'].'&nr='.$_GET['nr'].'&cmd=findtrash&tbio=0&tpapier=1&trest=1&twert=1&feiertag=0';
			$return = fileGetJson($url);

			foreach($return['data'] as $item) {
				list($d,$m,$y) = explode('.',$item['date']);
				$date = $y.'-'.$m.'-'.$d;
				foreach($item['fraktion'] as $fraktion) {
					$allDates[$date][$fraktion] = $date;
				}
			}
			break;
		case 'ximmio': //currently only meerlanden uses Ximmio
			debugMsg('ximmio');
			$companyCode = "800bf8d7-6dd1-4490-ba9d-b419d6dc8a45";
			if(!empty($_GET['sub'])){
				$companyCode = '';
				switch($_GET['sub']){
					case 'meerlanden'; $companyCode = "800bf8d7-6dd1-4490-ba9d-b419d6dc8a45"; break;
					//https://wasteapi.ximmio.com/api/CallIcal?cn=WaardLanden&x=942abcf6-3775-400d-ae5d-7380d728b23c&ty=Vianen&ua=1200079926&sd=2019-12-21&ed=2023-01-09&path=https://wasteapi.ximmio.com&ln=nl&nt=7
					case 'waardlanden'; $companyCode = "942abcf6-3775-400d-ae5d-7380d728b23c"; break;
					case 'avri';  $companyCode = "78cd4156-394b-413d-8936-d407e334559a"; break;
				}
				if ($companyCode == '') return;
				//Web_Data=perform_webquery('--data "companyCode='..companyCode..'&postCode='..Zipcode..'&houseNumber='..Housenr.."&houseNumberAddition="..Housenrsuf..'" "https://wasteapi.2go-mobile.com/api/FetchAdress"')
				$host = "https://wasteprod2api.ximmio.com";
				$url = $host."/api/FetchAdress";
				$data = "companyCode=".$companyCode.'&postCode='.$zipCode.'&houseNumber='.$houseNr."&houseNumberAddition=".$houseNrSuf;
				$return = curlPostJson($url, $data);	
				if( empty($return) or empty($return['dataList'])){
					$host = "https://wasteapi.2go-mobile.com";
					$url = $host."/api/FetchAdress";
					$data = "companyCode=".$companyCode.'&postCode='.$zipCode.'&houseNumber='.$houseNr."&houseNumberAddition=".$houseNrSuf;
					$return = curlPostJson($url, $data);	
				}
				if( empty($return) or empty($return['dataList'])){
					$return = '';
					errorMsg('no data for Ximmio '.$_GET['sub']);
				}

				$uniqueId = $return['dataList'][0]['UniqueId'];
				debugMsg($uniqueId);

				$startDate=date("Y-m-d");
				$endDate=date("Y-m-d",time()+28*24*60*60);
				$url=$host."/api/GetCalendar";
				$data='companyCode='.$companyCode.'&uniqueAddressID='.$uniqueId.'&startDate='.$startDate."&endDate=".$endDate;
				$return = curlPostJson($url, $data);
				debugMsg($return);
				if( empty($return) or empty($return['dataList'])){
					$return = '';
					errorMsg('no data for Ximmio '.$_GET['sub']);
				}
				$dataList = $return['dataList'];
				foreach($dataList as $row) {
					$title = $row['_pickupTypeText'];
					foreach($row['pickupDates'] as $pickupDate) {
						$allDates[$pickupDate][$title] = $pickupDate;
					}
				}
			};
			break;
		case 'afvalstromen':
			$baseUrl = '';
			if(!empty($_GET['sub'])){
				switch($_GET['sub']){
					case 'sudwestfryslan'; $baseUrl = 'http://afvalkalender.sudwestfryslan.nl'; break;
					case 'alphenaandenrijn'; $baseUrl = 'http://afvalkalender.alphenaandenrijn.nl'; break;
					case 'cure'; $baseUrl = 'https://afvalkalender.cure-afvalbeheer.nl'; break;
					case 'cyclusnv'; $baseUrl = 'https://afvalkalender.cyclusnv.nl'; break;
					case 'gemeenteberkelland'; $baseUrl = 'https://afvalkalender.gemeenteberkelland.nl'; break;
					case 'meerlanden'; $baseUrl = 'https://afvalkalender.meerlanden.nl'; break;
					case 'venray'; $baseUrl = 'https://afvalkalender.venray.nl'; break;
					case 'circulusberkel'; $baseUrl = 'https://afvalkalender.circulus-berkel.nl'; break;
					case 'rmn'; $baseUrl = 'https://inzamelschema.rmn.nl'; break;
					case 'dar'; $baseUrl = 'https://afvalkalender.dar.nl'; break;
					case 'waalre'; $baseUrl = 'https://afvalkalender.waalre.nl'; break;
					case 'avalex'; $baseUrl = 'https://www.avalex.nl'; break;
					case 'hvc'; $baseUrl = 'https://apps.hvcgroep.nl'; break;
				}
			}
			
			$url = $baseUrl.'/rest/adressen/'.$_GET['zipcode'].'-'.$_GET['nr'];
			$return = fileGetJson($url);
			if( empty($return[0]['bagId'])){
				$return = '';
				break;
			}
			$url = $baseUrl.'/rest/adressen/'.$return[0]['bagId'].'/afvalstromen';
			$return = fileGetJson($url);
			
			foreach($return as $row){
				$title = $row['title'];
				$date=$row['ophaaldatum'];
				if(!empty($date)){
					$allDates[$date][$title] = $date;
				}
			}
			
			//$return = json_decode($return,true);
			break;
		case 'omrin':
			$url='https://www.omrin.nl/bij-mij-thuis/afval-regelen/afvalkalender';
			$nr = $_GET['nr'];
			$len = strlen($nr);
			$cookie = "address=".urlencode ("a:3:{s:7:\"ziparea\";s:2:\"".substr($_GET['zipcode'],-2)."\";s:9:\"zipnumber\";s:4:\"".substr($_GET['zipcode'],0,4)."\";s:7:\"housenr\";s:".$len.":\"".$_GET['nr']."\";}");
			$options = array(
				CURLOPT_COOKIE => $cookie,
				CURLOPT_FOLLOWLOCATION => 1,
				CURLINFO_HEADER_OUT, true
			);

			$output = curlWeb($url, $options);
			$key='omrinDataGroups = ';
			$key2=';';
			$pos = strpos($output, $key);
			if($pos!==false) {
				$pos2=strpos($output, $key2, $pos);
				if($pos2===false) {
					die('endkey not found');
				}
				$jsondata=substr($output, $pos+strlen($key), $pos2-$pos-strlen($key));
				$data=json_decode($jsondata);
				foreach($data as $year => $yeardata) {
					foreach($yeardata as $garbagetype => $garbagedata ) {
						$garbagedates = $garbagedata->dates;
						foreach($garbagedates as $month => $monthdata) {
							foreach($monthdata as $day ) {
								$y=$year;
								$m=str_pad($month, 2, '0', STR_PAD_LEFT);
								$d=str_pad($day, 2, '0', STR_PAD_LEFT);
								$allDates[$y.'-'.$m.'-'.$d][$garbagedata->title] = $y.'-'.$m.'-'.$d;
							}
						}
					}
				}
			}
			break;
		case 'recycleapp':
			/*
			First find the secret from main js file (step 1 and 2)
			Then get an access token:

			curl -H "x-consumer: recycleapp.be" -H "x-secret: Qp4KmgmK2We1ydc9Hxso5D6K0frz3a9raj2tqLjWN5n53TnEijmmYz78pKlcma54sjKLKogt6f9WdnNUci6Gbujnz6b34hNbYo4DzyYRZL5yzdJyagFHS15PSi2kPUc4v2yMck81yFKhlk2aWCTe93" "https://recycleapp.be/api/app/v1/access-token" > accesstoken.json

			//Then get the valid zip codes. As authorization use the obtained token.
			curl -H "x-consumer: recycleapp.be" -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1OTc4NTA1MTEsImV4cCI6MTU5Nzg1NDExMSwiYXVkIjoicmVjeWNsZWFwcC5iZSJ9.fuHPCfFgLBDgT3BC245pQtdOeeAKDvKE9OjfXnkzfYA" "https://recycleapp.be/api/app/v1/zipcodes?q=8560" > garbagezip.json
			//Find the street within the zipcodes:
			curl -H "x-consumer: recycleapp.be" -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1OTc3ODAwNjgsImV4cCI6MTU5Nzc4MzY2OCwiYXVkIjoicmVjeWNsZWFwcC5iZSJ9.3W2Px8c1K907R73pOahvlkPxxgh9BoY1HU5xgu3f0nQ" "https://recycleapp.be/api/app/v1/streets?q=tarwelaan&zipcodes=8500-34022" > garbagestreet.json

			//result: id contains the street id

			//Then request the collections for the street id
			curl -H "x-consumer: recycleapp.be" -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE1OTc3ODAwNjgsImV4cCI6MTU5Nzc4MzY2OCwiYXVkIjoicmVjeWNsZWFwcC5iZSJ9.3W2Px8c1K907R73pOahvlkPxxgh9BoY1HU5xgu3f0nQ" "https://recycleapp.be/api/app/v1/collections?zipcodeId=8500-34022&streetId=52738&houseNumber=1&fromDate=2020-08-01&untilDate=2020-09-30&size=100" > garbagefinal.json
			*/

			//step 1: Get main js file
			$match = curlWebMatch("https://recycleapp.be",'/script src="(.static.js.main.*.js)"/');
//			var_dump($match[1]);

			//step 2: Find secret
			$match = curlWebMatch("https://recycleapp.be".$match[1],'/var n="(\w*)",r=".api.v1.assets/');
//			var_dump($match);

			//step 3: get access token
			$headers = [
				'x-consumer: recycleapp.be',
				'x-secret: '.$match[1]
			];

			$data=curlWebJson("https://recycleapp.be/api/app/v1/access-token", $headers);
//			print_r ($data);
//			print $data->accessToken;
			$accessToken = $data->accessToken;

			//*Step 4: get list of addresses
			$headers = [
				'x-consumer: recycleapp.be',
				'Authorization: '.$accessToken
			];
			$data=curlWebJson("https://recycleapp.be/api/app/v1/zipcodes?q=".$_GET['zipcode'],$headers);

//			print_r ($data);
			$zipcode = $data->items[0]->id;
//			print_r($zipcode);

			//Step 5: get street
			$url = "https://recycleapp.be/api/app/v1/streets?q=".urlencode($_GET['sub'])."&zipcodes=".$zipcode;
			$data = curlWebJson($url, $headers);
//			print_r($data);
			$streetid = $data->items[0]->id;
//			print $streetid;

			$startDate=date("Y-m-d");
			$endDate=date("Y-m-d",time()+28*24*60*60);
			//Now finally get the collection info
			$url = "https://recycleapp.be/api/app/v1/collections?zipcodeId=".$zipcode."&streetId=".$streetid."&houseNumber=".$_GET['nr']."&fromDate=".$startDate."&untilDate=".$endDate."&size=100";
			$data=curlWebJson($url, $headers);
//			print_r($data);

			foreach($data->items as $item) {
				$date = $item->timestamp;
				$title = $item->fraction->name->nl;
	//			print $date;
	//			print $title;
				$allDates[$date][$title] = $date;
			}

		break;
	}
	$temp=$allDates;
	$allDates=array();
	foreach($temp as $date => $items){
		foreach($items as $title => $date){
			$allDates[] = array('date'=>$date,'title'=>$title);
		}	
	}
	foreach($messages as $msg) {
		$allDates[] = $msg;
	}
	return $allDates;
}
?>
