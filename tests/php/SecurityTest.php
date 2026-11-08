<?php

use PHPUnit\Framework\TestCase;

/* Tests for vendor/dashticz/security.php. Written without attributes or
   data provider annotations so the same file runs on PHPUnit 9 (PHP 7.4)
   up to the newest PHPUnit (PHP 8.x). */
class SecurityTest extends TestCase
{
    /** @var string|false */
    private $allowedHosts;

    protected function setUp(): void
    {
        $this->allowedHosts = getenv('DASHTICZ_ALLOWED_REMOTE_HOSTS');
        putenv('DASHTICZ_ALLOWED_REMOTE_HOSTS');
    }

    protected function tearDown(): void
    {
        if ($this->allowedHosts === false) {
            putenv('DASHTICZ_ALLOWED_REMOTE_HOSTS');
        } else {
            putenv('DASHTICZ_ALLOWED_REMOTE_HOSTS=' . $this->allowedHosts);
        }
    }

    public function testNormalizeHostInputStripsSchemePathAndPort(): void
    {
        $cases = array(
            'http://192.168.1.6/' => '192.168.1.6',
            'https://lms.local:9000/jsonrpc.js' => 'lms.local',
            '  192.168.1.6:9000  ' => '192.168.1.6',
            'example.com.' => 'example.com',
            'example.com?x=1#y' => 'example.com',
            '' => '',
        );
        foreach ($cases as $input => $expected) {
            $this->assertSame($expected, dashticz_normalize_host_input($input), 'input: ' . $input);
        }
    }

    public function testNormalizeHostInputKeepsIpv6Literals(): void
    {
        $this->assertSame('fe80::1', dashticz_normalize_host_input('fe80::1'));
        $this->assertSame('[::1]:9000', dashticz_normalize_host_input('[::1]:9000'));
    }

    public function testIpIsPublic(): void
    {
        foreach (array('8.8.8.8', '1.1.1.1', '2001:4860:4860::8888') as $ip) {
            $this->assertTrue(dashticz_ip_is_public($ip), $ip);
        }
        foreach (array('127.0.0.1', '10.0.0.1', '172.16.5.4', '192.168.1.6', '0.0.0.0', '::1', 'not-an-ip') as $ip) {
            $this->assertFalse(dashticz_ip_is_public($ip), $ip);
        }
    }

    public function testAllowedRemoteHostsComeFromEnvironment(): void
    {
        $this->assertSame(array(), dashticz_allowed_remote_hosts());

        putenv('DASHTICZ_ALLOWED_REMOTE_HOSTS= Domoticz.Local , ,*.lan');
        $this->assertSame(array('domoticz.local', '*.lan'), dashticz_allowed_remote_hosts());
        $this->assertTrue(dashticz_host_is_explicitly_allowed('domoticz.local'));
        $this->assertTrue(dashticz_host_is_explicitly_allowed('DOMOTICZ.local.'));
        $this->assertTrue(dashticz_host_is_explicitly_allowed('nas.lan'));
        $this->assertFalse(dashticz_host_is_explicitly_allowed('evil.example'));
        $this->assertFalse(dashticz_host_is_explicitly_allowed('domoticz.local.evil.example'));
    }

    public function testValidateRemoteUrlAcceptsPublicIp(): void
    {
        $this->assertSame('https://8.8.8.8/x', dashticz_validate_remote_url('https://8.8.8.8/x'));
    }

    public function testValidateRemoteUrlAllowsPrivateIpOnlyWhenAsked(): void
    {
        $this->assertSame('http://192.168.1.6/', dashticz_validate_remote_url('http://192.168.1.6/', true));
        $this->assertRejected('http://192.168.1.6/');
        $this->assertRejected('http://127.0.0.1:8080/json.htm');
    }

    public function testValidateRemoteUrlRejectsBadUrls(): void
    {
        $this->assertRejected('ftp://8.8.8.8/file');
        $this->assertRejected('file:///etc/passwd');
        $this->assertRejected('https://user:secret@8.8.8.8/');
        $this->assertRejected('not a url');
        $this->assertRejected(array('https://8.8.8.8/'));
        $this->assertRejected('https://8.8.8.8/' . str_repeat('a', 4100));
    }

    public function testValidateRemoteUrlHonoursAllowList(): void
    {
        putenv('DASHTICZ_ALLOWED_REMOTE_HOSTS=*.lan');
        // Allowed by name, so no DNS lookup and no private address check.
        $this->assertSame('http://domoticz.lan:8080/', dashticz_validate_remote_url('http://domoticz.lan:8080/'));
    }

    public function testResolveRedirectUrl(): void
    {
        $base = 'https://example.com:8443/a/b/page.php?x=1';
        $cases = array(
            'https://other.example/z' => 'https://other.example/z',
            '//cdn.example/y' => 'https://cdn.example/y',
            '/root?q=2' => 'https://example.com:8443/root?q=2',
            '?q=3' => 'https://example.com:8443/a/b/page.php?q=3',
            '#top' => 'https://example.com:8443/a/b/page.php?x=1#top',
            'next.php' => 'https://example.com:8443/a/b/next.php',
            '../up/' => 'https://example.com:8443/a/up/',
            './../../../../c' => 'https://example.com:8443/c',
        );
        foreach ($cases as $location => $expected) {
            $this->assertSame($expected, dashticz_resolve_redirect_url($base, $location), 'location: ' . $location);
        }
    }

    public function testResolveRedirectUrlRejectsEmptyLocation(): void
    {
        $this->expectException(RuntimeException::class);
        dashticz_resolve_redirect_url('https://example.com/', '   ');
    }

    public function testHeaderValueIsCaseInsensitive(): void
    {
        $headers = array('HTTP/1.1 200 OK', 'content-type: application/json; charset=utf-8', 'X-Test:  a ');
        $this->assertSame('application/json; charset=utf-8', dashticz_header_value($headers, 'Content-Type'));
        $this->assertSame('a', dashticz_header_value($headers, 'x-test'));
        $this->assertNull(dashticz_header_value($headers, 'Content-Encoding'));
    }

    public function testAtomicWriteFileReplacesContents(): void
    {
        $directory = sys_get_temp_dir() . '/dashticz-phpunit-' . uniqid();
        mkdir($directory);
        $path = $directory . '/CONFIG.js';
        try {
            $this->assertTrue(dashticz_atomic_write_file($path, 'first'));
            $this->assertTrue(dashticz_atomic_write_file($path, 'second'));
            $this->assertSame('second', file_get_contents($path));
            // No temporary write files are left behind.
            $this->assertSame(array('CONFIG.js'), array_values(array_diff(scandir($directory), array('.', '..'))));
        } finally {
            foreach (array_diff(scandir($directory), array('.', '..')) as $file) {
                @unlink($directory . '/' . $file);
            }
            @rmdir($directory);
        }
    }

    public function testAtomicWriteFileFailsForMissingDirectory(): void
    {
        $this->assertFalse(dashticz_atomic_write_file(sys_get_temp_dir() . '/dashticz-missing-' . uniqid() . '/x', 'x'));
    }

    public function testWidgetKindsReadTheManifest(): void
    {
        $manifest = json_decode(file_get_contents(dirname(__DIR__, 2) . '/js/widgets.json'), true);
        $saved = array_keys(array_filter($manifest['kinds'], function ($entry) {
            return !empty($entry['saved']);
        }));
        $this->assertSame($saved, dashticz_widget_kinds('saved'));
        $this->assertContains('title', dashticz_widget_kinds('idxLess'));
        $this->assertSame(array(), dashticz_widget_kinds('no-such-flag'));
        $this->assertSame(12, dashticz_widget_default_width('title'));
        $this->assertSame(3, dashticz_widget_default_width('no-such-kind'));
    }

    /** @param mixed $url */
    private function assertRejected($url): void
    {
        try {
            dashticz_validate_remote_url($url);
        } catch (RuntimeException $e) {
            $this->assertNotSame('', $e->getMessage());
            return;
        }
        $this->fail('URL was accepted: ' . (is_string($url) ? substr($url, 0, 80) : gettype($url)));
    }
}
