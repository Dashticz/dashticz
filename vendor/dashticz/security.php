<?php

function dashticz_json_error($status, $message)
{
    http_response_code($status);
    header('Content-Type: application/json');
    die(json_encode(array('error' => $message)));
}

function dashticz_request_origin()
{
    if (empty($_SERVER['HTTP_ORIGIN'])) {
        return null;
    }

    $origin = parse_url($_SERVER['HTTP_ORIGIN']);
    if (!$origin || empty($origin['host'])) {
        return false;
    }

    $requestHost = isset($_SERVER['HTTP_HOST']) ? strtolower($_SERVER['HTTP_HOST']) : '';
    $originHost = strtolower($origin['host']);
    if (isset($origin['port'])) {
        $originHost .= ':' . $origin['port'];
    }

    return hash_equals($requestHost, $originHost);
}

function dashticz_require_same_origin()
{
    if (dashticz_request_origin() === false) {
        dashticz_json_error(403, 'Cross-origin requests are not allowed.');
    }

    if (isset($_SERVER['HTTP_SEC_FETCH_SITE']) && $_SERVER['HTTP_SEC_FETCH_SITE'] === 'cross-site') {
        dashticz_json_error(403, 'Cross-site requests are not allowed.');
    }
}

function dashticz_start_session()
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    $secure = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
    if (PHP_VERSION_ID >= 70300) {
        session_set_cookie_params(array(
            'lifetime' => 0,
            'path' => '/',
            'secure' => $secure,
            'httponly' => true,
            'samesite' => 'Strict',
        ));
    } else {
        session_set_cookie_params(0, '/', '', $secure, true);
    }
    session_start();
}

function dashticz_csrf_token()
{
    dashticz_start_session();
    if (empty($_SESSION['dashticz_csrf'])) {
        $_SESSION['dashticz_csrf'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['dashticz_csrf'];
}

function dashticz_require_csrf()
{
    dashticz_start_session();
    $provided = isset($_SERVER['HTTP_X_DASHTICZ_CSRF'])
        ? $_SERVER['HTTP_X_DASHTICZ_CSRF']
        : '';
    $expected = isset($_SESSION['dashticz_csrf'])
        ? $_SESSION['dashticz_csrf']
        : '';

    if (!$provided || !$expected || !hash_equals($expected, $provided)) {
        dashticz_json_error(403, 'Invalid CSRF token.');
    }
}

function dashticz_allowed_remote_hosts()
{
    $configured = getenv('DASHTICZ_ALLOWED_REMOTE_HOSTS');
    if (!$configured) {
        return array();
    }

    return array_values(array_filter(array_map(function ($host) {
        return strtolower(trim($host));
    }, explode(',', $configured))));
}

function dashticz_host_is_explicitly_allowed($host)
{
    $host = strtolower(rtrim($host, '.'));
    foreach (dashticz_allowed_remote_hosts() as $allowed) {
        $allowed = rtrim($allowed, '.');
        if ($host === $allowed) {
            return true;
        }
        if (substr($allowed, 0, 2) === '*.' && substr($host, -strlen(substr($allowed, 1))) === substr($allowed, 1)) {
            return true;
        }
    }
    return false;
}

function dashticz_ip_is_public($ip)
{
    return filter_var(
        $ip,
        FILTER_VALIDATE_IP,
        FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
    ) !== false;
}

function dashticz_validate_remote_url($url)
{
    if (!is_string($url) || strlen($url) > 4096) {
        throw new RuntimeException('Invalid remote URL.');
    }

    $parts = parse_url($url);
    if (
        !$parts ||
        empty($parts['scheme']) ||
        empty($parts['host']) ||
        !in_array(strtolower($parts['scheme']), array('http', 'https'), true) ||
        isset($parts['user']) ||
        isset($parts['pass'])
    ) {
        throw new RuntimeException('Only public HTTP(S) URLs without credentials are allowed.');
    }

    $host = strtolower(rtrim($parts['host'], '.'));
    if (dashticz_host_is_explicitly_allowed($host)) {
        return $url;
    }

    if (filter_var($host, FILTER_VALIDATE_IP)) {
        if (!dashticz_ip_is_public($host)) {
            throw new RuntimeException('Private and reserved addresses are blocked.');
        }
        return $url;
    }

    $records = function_exists('dns_get_record')
        ? @dns_get_record($host, DNS_A | DNS_AAAA)
        : false;
    if (!$records) {
        $ipv4 = @gethostbynamel($host);
        $records = $ipv4 ? array_map(function ($ip) {
            return array('ip' => $ip);
        }, $ipv4) : array();
    }

    if (!$records) {
        throw new RuntimeException('Remote host could not be resolved.');
    }

    foreach ($records as $record) {
        $ip = isset($record['ip']) ? $record['ip'] : (isset($record['ipv6']) ? $record['ipv6'] : null);
        if ($ip && !dashticz_ip_is_public($ip)) {
            throw new RuntimeException('Remote host resolves to a private or reserved address.');
        }
    }

    return $url;
}

function dashticz_header_value($headers, $name)
{
    foreach ($headers as $header) {
        if (stripos($header, $name . ':') === 0) {
            return trim(substr($header, strlen($name) + 1));
        }
    }
    return null;
}

function dashticz_fetch_remote($url, $maxBytes = 5242880, $maxRedirects = 3)
{
    for ($redirects = 0; $redirects <= $maxRedirects; $redirects++) {
        $url = dashticz_validate_remote_url($url);
        $context = stream_context_create(array(
            'http' => array(
                'follow_location' => 0,
                'ignore_errors' => true,
                'timeout' => 10,
                'header' => "User-Agent: Dashticz/3\r\nConnection: close\r\n",
            ),
            'ssl' => array(
                'verify_peer' => true,
                'verify_peer_name' => true,
            ),
        ));

        $handle = @fopen($url, 'rb', false, $context);
        if (!$handle) {
            throw new RuntimeException('Unable to fetch remote URL.');
        }

        $metadata = stream_get_meta_data($handle);
        $headers = isset($metadata['wrapper_data']) && is_array($metadata['wrapper_data'])
            ? $metadata['wrapper_data']
            : array();
        $body = stream_get_contents($handle, $maxBytes + 1);
        fclose($handle);

        if ($body === false) {
            throw new RuntimeException('Unable to read remote response.');
        }
        if (strlen($body) > $maxBytes) {
            throw new RuntimeException('Remote response exceeds the size limit.');
        }

        $status = 0;
        if (isset($headers[0]) && preg_match('#^HTTP/\S+\s+(\d{3})#', $headers[0], $match)) {
            $status = (int) $match[1];
        }

        if ($status >= 300 && $status < 400) {
            $location = dashticz_header_value($headers, 'Location');
            if (!$location || $redirects === $maxRedirects) {
                throw new RuntimeException('Remote redirect was rejected.');
            }
            if (!parse_url($location, PHP_URL_SCHEME)) {
                $base = parse_url($url);
                $port = isset($base['port']) ? ':' . $base['port'] : '';
                if (substr($location, 0, 2) === '//') {
                    $location = $base['scheme'] . ':' . $location;
                } else {
                    $path = substr($location, 0, 1) === '/'
                        ? $location
                        : rtrim(dirname(isset($base['path']) ? $base['path'] : '/'), '/') . '/' . $location;
                    $location = $base['scheme'] . '://' . $base['host'] . $port . $path;
                }
            }
            $url = $location;
            continue;
        }

        if ($status >= 400) {
            throw new RuntimeException('Remote server returned HTTP ' . $status . '.');
        }

        return array(
            'body' => $body,
            'headers' => $headers,
            'contentType' => dashticz_header_value($headers, 'Content-Type'),
            'contentEncoding' => dashticz_header_value($headers, 'Content-Encoding'),
        );
    }

    throw new RuntimeException('Too many redirects.');
}
