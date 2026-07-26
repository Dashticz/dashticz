--- index.php.orig	2026-07-26 11:03:38.566716383 +0000
+++ index.php	2026-07-26 11:03:58.626854139 +0000
@@ -15,7 +15,7 @@
 */
 
 $errors=array();
-set_error_handler(function($errno, $errstr, $errfile = 0, $errline = 0, $errcontext = 0) {
+set_error_handler(function($errno, $errstr, $errfile = 0, $errline = 0, $errcontext = 0) use (&$errors) {
 	// error was suppressed with the @-operator
 //		if (0 === error_reporting()) {
 //			return false;
@@ -129,7 +129,7 @@
 
 }
 
-function curlWebJson($url, $headers=0) {
+function curlWebJson($url, $headers=[]) {
 	return json_decode(curlWeb($url, array( CURLOPT_HTTPHEADER=>$headers)));
 }
 
@@ -336,7 +336,7 @@
 			$options = array(
 				CURLOPT_COOKIE => $cookie,
 				CURLOPT_FOLLOWLOCATION => 1,
-				CURLINFO_HEADER_OUT, true
+				CURLINFO_HEADER_OUT => true
 			);
 
 			$output = curlWeb($url, $options);
@@ -444,8 +444,9 @@
 			$cookie = addCookie($cookie, $cookies, 'residence');
 			$cookie = addCookie($cookie, $cookies, 'selectedHouseType');
 			$options = array(
-				CURLOPT_HTTPHEADER =>
+				CURLOPT_HTTPHEADER => [
 					'Cookie: '.$cookie
+				]
 			);
 
 //			var_dump($url);
