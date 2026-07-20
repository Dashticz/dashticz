<?php
require_once(__DIR__ . '/security.php');

dashticz_require_same_origin();
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

try {
    $response = dashticz_fetch_remote($_SERVER['QUERY_STRING']);
    if ($response['contentType']) {
        header('Content-Type: ' . $response['contentType']);
    }
    if ($response['contentEncoding']) {
        header('Content-Encoding: ' . $response['contentEncoding']);
    }
    echo $response['body'];
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}
