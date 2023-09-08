<?php
$uploadfolder = $_SERVER['DOCUMENT_ROOT'].'/uploads/';
if (!is_dir($uploadfolder)) {
  echo $uploadfolder." doesn't exist."."<br>\n";
}
if (!is_writable($uploadfolder)) {
  echo $uploadfolder." not writable for root."."\n";
}
echo move_uploaded_file(
  $_FILES["upfile"]["tmp_name"], 
  $uploadfolder.$_FILES["upfile"]["name"]
) ? "OK" : "ERROR UPLOADING: ".$_FILES["upfile"]["error"];
?>

