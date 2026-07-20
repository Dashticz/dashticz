<?php

require_once(__DIR__ . '/../vendor/dashticz/security.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

 
$localip = "192.168.1.201"; // IP of mediabox
$localport = 5900; // Controlport of mediabox


/*
Script (C) KixAss 2016 - horizon@kixass.net
 
Possible keys:
KEY_POWER		= E0 00
KEY_OK 			= E0 01
KEY_BACK 		= E0 02
KEY_CHAN_UP		= E0 06
KEY_CHAN_DWN	= E0 07
KEY_HELP		= E0 09
KEY_MENU		= E0 0a
KEY_GUIDE		= E0 0b
KEY_INFO		= E0 0e
KEY_TEXT		= E0 0f
KEY_MENU1		= E0 11
KEY_MENU2		= E0 15
KEY_DPAD_UP		= E1 00
KEY_DPAD_DOWN	= E1 01
KEY_DPAD_LEFT	= E1 02
KEY_DPAD_RIGHT	= E1 03
KEY_NUM_0		= E3 00
KEY_NUM_1		= E3 01
KEY_NUM_2		= E3 02
KEY_NUM_3		= E3 03
KEY_NUM_4		= E3 04
KEY_NUM_5		= E3 05
KEY_NUM_6		= E3 06
KEY_NUM_7		= E3 07
KEY_NUM_8		= E3 08
KEY_NUM_9		= E3 09
KEY_PAUSE		= E4 00
KEY_STOP		= E4 02
KEY_RECORD		= E4 03
KEY_FWD			= E4 05
KEY_RWD			= E4 07
KEY_MENU3		= Ef 00
KEY_UNKNOWN_0 	= Ef 06;	// TIMESHIFT INF
KEY_UNKNOWN_1	= Ef 15;	// POWE
KEY_UNKNOWN_2	= Ef 16;	// N
KEY_UNKNOWN_3	= Ef 17;	// RC PAIRIN
KEY_UNKNOWN_4	= Ef 19;	// TIMIN
KEY_ONDEMAND	= Ef 28
KEY_DVR 		= Ef 29
KEY_TV = Ef 2a;
*/
 
function makeBuffer($data)
{
    $data = str_replace(" ", "", $data);
    return hex2bin($data);
}
 
$allowedKeys = array(
    'E0X00', 'E0X01', 'E0X02', 'E0X06', 'E0X07', 'E0X09', 'E0X0A',
    'E0X0B', 'E0X0E', 'E0X0F', 'E0X11', 'E0X15', 'E1X00', 'E1X01',
    'E1X02', 'E1X03', 'E3X00', 'E3X01', 'E3X02', 'E3X03', 'E3X04',
    'E3X05', 'E3X06', 'E3X07', 'E3X08', 'E3X09', 'E4X00', 'E4X02',
    'E4X03', 'E4X05', 'E4X07', 'EFX28', 'EFX29', 'EFX2A'
);
$requestedKey = isset($_POST['key']) ? strtoupper($_POST['key']) : '';
if (!in_array($requestedKey, $allowedKeys, true)) {
    dashticz_json_error(400, 'Invalid remote-control key.');
}
$key = str_replace('X', ' ', $requestedKey);

if ($sock = fsockopen($localip, $localport, $errorCode, $errorMessage, 3))
{
    $data = fgets($sock); // readVersionMsg
    echo "recv version: " . $data . "<br>";
 
    echo "-----------------------------<br>";
 
    fwrite($sock, $data); // Send the same version back
 
    $data = fgets($sock, 2); // Get OKE
    echo "recv: " . $data . "<br>";
 
    echo "-----------------------------<br>";
 
    fwrite($sock, makeBuffer("01")); // Send Authorization type (none)
 
    $data = fgets($sock, 4); // Get OKE
    echo "recv: " . $data . "<br>";
 
    echo "-----------------------------<br>";
 
    $data = fgets($sock, 24); // Get init data
    echo "recv: " . $data . "<br>";
 
    fwrite($sock, makeBuffer("04 01 00 00 00 00 " . $key)); // Turn key on
    usleep(400);
    fwrite($sock, makeBuffer("04 00 00 00 00 00 " . $key)); // Turn key off
 
    fclose($sock);
}
?>
