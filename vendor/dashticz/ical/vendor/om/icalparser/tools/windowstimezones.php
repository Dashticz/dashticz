<?php

/**
 * This file generates a map from windows timezones to tz database timezones
 *
 * @author   Clement Wong <cw@clement.hk>
 * @license  http://www.opensource.org/licenses/mit-license.php  MIT License
 */
$windows_timezones = [];
$windowstimezonexml = new DOMDocument();
$windowstimezonexml->load('https://raw.githubusercontent.com/unicode-org/cldr/master/common/supplemental/windowsZones.xml');
$zones = $windowstimezonexml->getElementsByTagName('mapZone');
foreach ($zones as $zone) {
	if($zone->getAttribute('territory') === '001') {
		$windows_timezones[$zone->getAttribute('other')] = $zone->getAttribute('type');
	}
}

file_put_contents(__DIR__ . '/windows_timezones.php', "<?php\n\$windows_timezones = " . var_export($windows_timezones, true) . ';');

