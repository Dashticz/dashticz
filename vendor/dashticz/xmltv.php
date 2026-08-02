<?php
require_once(__DIR__ . '/security.php');

dashticz_require_same_origin();
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Cache-Control: post-check=0, pre-check=0", false);
header("Pragma: no-cache");

try {
    $url = isset($_GET['url']) ? (string) $_GET['url'] : '';
    $url = dashticz_validate_remote_url($url, true);

    $cacheFile = dashticz_xmltv_cache_file($url);
    $ttl = 86400;
    $cached = dashticz_xmltv_read_cache($cacheFile, $ttl);
    if ($cached !== null) {
        header('Content-Type: application/xml; charset=UTF-8');
        echo $cached;
        exit;
    }

    try {
        $response = dashticz_fetch_remote($url, 52428800, 3, true);
        $xml = dashticz_xmltv_normalize_response(
            $response['body'],
            $response['contentType'],
            $response['contentEncoding'],
            $url
        );
        dashticz_xmltv_write_cache($cacheFile, $xml);
    } catch (RuntimeException $error) {
        $stale = dashticz_xmltv_read_cache($cacheFile, 0);
        if ($stale === null) {
            throw $error;
        }
        $xml = $stale;
    }

    header('Content-Type: application/xml; charset=UTF-8');
    echo $xml;
} catch (RuntimeException $error) {
    dashticz_json_error(400, $error->getMessage());
}

function dashticz_xmltv_cache_file($url)
{
    $baseDir = dirname(__DIR__, 2) . '/custom/cache/xmltv';
    if (!is_dir($baseDir)) {
        @mkdir($baseDir, 0775, true);
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        $baseDir = rtrim(sys_get_temp_dir(), '/\\') . '/dashticz-xmltv-cache';
        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0775, true);
        }
    }
    if (!is_dir($baseDir) || !is_writable($baseDir)) {
        throw new RuntimeException('XMLTV cache directory is not writable.');
    }
    return $baseDir . '/' . sha1($url) . '.xml';
}

function dashticz_xmltv_read_cache($cacheFile, $ttl)
{
    if (!is_file($cacheFile)) {
        return null;
    }
    if ($ttl > 0) {
        $age = time() - (int) @filemtime($cacheFile);
        if ($age > $ttl) {
            return null;
        }
    }
    $body = @file_get_contents($cacheFile);
    return ($body === false || $body === '') ? null : $body;
}

function dashticz_xmltv_write_cache($cacheFile, $xml)
{
    $tmpFile = $cacheFile . '.tmp';
    if (@file_put_contents($tmpFile, $xml, LOCK_EX) === false) {
        return;
    }
    @rename($tmpFile, $cacheFile);
}

function dashticz_xmltv_normalize_response($body, $contentType, $contentEncoding, $url)
{
    if (!is_string($body) || $body === '') {
        throw new RuntimeException('Remote XMLTV response is empty.');
    }

    $xml = $body;
    $type = strtolower((string) $contentType);
    $encoding = strtolower((string) $contentEncoding);
    $path = strtolower((string) parse_url($url, PHP_URL_PATH));

    if (substr($xml, 0, 2) === "\x1f\x8b"
        || strpos($type, 'gzip') !== false
        || strpos($encoding, 'gzip') !== false
        || preg_match('/\.gz$/', $path)
    ) {
        $xml = dashticz_xmltv_decode_gzip($xml);
    } elseif (substr($xml, 0, 4) === "PK\x03\x04"
        || substr($xml, 0, 4) === "PK\x05\x06"
        || substr($xml, 0, 4) === "PK\x07\x08"
        || strpos($type, 'zip') !== false
        || preg_match('/\.zip$/', $path)
    ) {
        $xml = dashticz_xmltv_extract_zip($xml);
    }

    if (!dashticz_xmltv_looks_like_xml($xml)) {
        throw new RuntimeException('Remote XMLTV response is not valid XML.');
    }

    if (strlen($xml) > 104857600) {
        throw new RuntimeException('Remote XMLTV response exceeds the size limit.');
    }

    return $xml;
}

function dashticz_xmltv_decode_gzip($body)
{
    if (!function_exists('gzdecode')) {
        throw new RuntimeException('GZip-compressed XMLTV files are not supported on this PHP installation.');
    }
    $decoded = @gzdecode($body);
    if (!is_string($decoded) || $decoded === '') {
        throw new RuntimeException('Unable to decompress the XMLTV GZip file.');
    }
    return $decoded;
}

function dashticz_xmltv_extract_zip($body)
{
    if (!class_exists('ZipArchive')) {
        throw new RuntimeException('ZIP-compressed XMLTV files are not supported on this PHP installation.');
    }

    $tmpFile = tempnam(sys_get_temp_dir(), 'dtxmltvzip_');
    if ($tmpFile === false) {
        throw new RuntimeException('Unable to create a temporary XMLTV ZIP file.');
    }
    if (@file_put_contents($tmpFile, $body, LOCK_EX) === false) {
        @unlink($tmpFile);
        throw new RuntimeException('Unable to prepare the XMLTV ZIP file.');
    }

    $zip = new ZipArchive();
    $opened = $zip->open($tmpFile);
    if ($opened !== true) {
        @unlink($tmpFile);
        throw new RuntimeException('Unable to open the XMLTV ZIP file.');
    }

    $candidateIndex = -1;
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $stat = $zip->statIndex($i);
        if (!is_array($stat) || empty($stat['name']) || substr($stat['name'], -1) === '/') {
            continue;
        }
        if (!empty($stat['size']) && (int) $stat['size'] > 104857600) {
            continue;
        }
        if ($candidateIndex === -1) {
            $candidateIndex = $i;
        }
        if (preg_match('/\.(xml|xmltv)$/i', $stat['name'])) {
            $candidateIndex = $i;
            break;
        }
    }

    if ($candidateIndex === -1) {
        $zip->close();
        @unlink($tmpFile);
        throw new RuntimeException('The XMLTV ZIP file does not contain a supported XML file.');
    }

    $xml = $zip->getFromIndex($candidateIndex);
    $zip->close();
    @unlink($tmpFile);

    if (!is_string($xml) || $xml === '') {
        throw new RuntimeException('Unable to read XMLTV data from the ZIP file.');
    }

    return $xml;
}

function dashticz_xmltv_looks_like_xml($body)
{
    $body = preg_replace('/^\xEF\xBB\xBF/', '', (string) $body);
    return preg_match('/^\s*</', $body) === 1;
}
