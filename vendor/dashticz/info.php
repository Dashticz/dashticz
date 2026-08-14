<?php
require_once(__DIR__ . '/security.php');

dashticz_require_same_origin();
header('Content-Type: application/json');
$return = null;
switch(isset($_GET['get']) ? $_GET['get'] : ''){
  case 'phpversion':
    $return=phpversion();
    break;
  case 'systeminfo':
    $return=dashticz_system_info();
    break;
  case 'gitinfo':
    $return=dashticz_git_info();
    break;
  case 'csrf':
    $return=array('token' => dashticz_csrf_token());
    break;
  default:
    dashticz_json_error(400, 'Unknown info request.');
}
die(json_encode($return));

function dashticz_system_info()
{
    $family = defined('PHP_OS_FAMILY') ? PHP_OS_FAMILY : PHP_OS;
    $name = php_uname('s');
    $version = php_uname('r');

    if ($family === 'Linux' && is_readable('/etc/os-release')) {
        $release = @parse_ini_file('/etc/os-release', false, INI_SCANNER_RAW);
        if (is_array($release)) {
            if (!empty($release['NAME'])) {
                $name = trim($release['NAME'], "\"'");
            }
            if (!empty($release['VERSION_ID'])) {
                $version = trim($release['VERSION_ID'], "\"'");
            } elseif (!empty($release['VERSION'])) {
                $version = trim($release['VERSION'], "\"'");
            }
        }
    } elseif ($family === 'Windows') {
        $name = 'Windows';
    }

    return array(
        'php_version' => phpversion(),
        'os_family' => $family,
        'os_name' => $name,
        'os_version' => $version,
        'architecture' => php_uname('m'),
    );
}

function dashticz_git_info()
{
    $repoRoot = realpath(__DIR__ . '/../..');
    if ($repoRoot === false) {
        return array('available' => false);
    }

    $gitDir = $repoRoot . DIRECTORY_SEPARATOR . '.git';
    $head = @file_get_contents($gitDir . DIRECTORY_SEPARATOR . 'HEAD');
    $config = @parse_ini_file(
        $gitDir . DIRECTORY_SEPARATOR . 'config',
        true,
        INI_SCANNER_RAW
    );
    if ($head === false || !is_array($config)) {
        return array('available' => false);
    }

    $branch = '';
    if (preg_match('#^ref:\s+refs/heads/([A-Za-z0-9._/-]+)\s*$#', trim($head), $headMatch)) {
        $branch = $headMatch[1];
    }

    $remoteName = isset($config['remote "origin"'])
        ? 'origin'
        : (isset($config['remote "upstream"']) ? 'upstream' : '');
    if ($remoteName === '') {
        return array('available' => false, 'branch' => $branch);
    }

    $remote = $config['remote "' . $remoteName . '"'];
    $url = isset($remote['url']) ? (string) $remote['url'] : '';
    if (!preg_match('#github\.com[/:]([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+?)(?:\.git)?$#i', $url, $urlMatch)) {
        return array('available' => false, 'branch' => $branch);
    }

    return array(
        'available' => true,
        'branch' => $branch,
        'owner' => $urlMatch[1],
        'repository' => preg_replace('/\.git$/i', '', $urlMatch[2]),
        'remote' => $remoteName,
    );
}
