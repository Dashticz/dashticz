<?php
require_once(__DIR__ . '/security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
$return = null;
switch(isset($_GET['get']) ? $_GET['get'] : ''){
  case 'phpversion':
    $return=phpversion();
    break;
  case 'csrf':
    $return=array('token' => dashticz_csrf_token());
    break;
  default:
    dashticz_json_error(400, 'Unknown info request.');
}
die(json_encode($return));
