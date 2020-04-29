<?php
function parseHeaders( $headers )
{
    $head = array();
    foreach( $headers as $k=>$v )
    {
        $t = explode( ':', $v, 2 );
        if( isset( $t[1] ) )
            $head[ trim($t[0]) ] = trim( $t[1] );
        else
        {
            $head[] = $v;
            if( preg_match( "#HTTP/[0-9\.]+\s+([0-9]+)#",$v, $out ) )
                $head['reponse_code'] = intval($out[1]);
        }
    }
    return $head;
}


//Allow cross origin, prevent caching
header("Access-Control-Allow-Origin: *");
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

//Copy all relevant headers
$reply = file_get_contents($_SERVER["QUERY_STRING"]);
$head = parseHeaders($http_response_header);
$headerList = ["Content-Type","Content-Encoding"];
foreach( $headerList as $header) {
    if (isset($head[$header])) {
        header($header.": ".$head[$header]);
    }
}

//Add the content
echo $reply;
exit();
?>
