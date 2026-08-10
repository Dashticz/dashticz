<?php
require_once(__DIR__ . '/../vendor/dashticz/security.php');
require_once(__DIR__ . '/configwriter.php');

dashticz_require_same_origin();
dashticz_require_csrf();

if (!isset($_SERVER['REQUEST_METHOD']) || $_SERVER['REQUEST_METHOD'] !== 'POST') {
    dashticz_json_error(405, 'Only POST requests are allowed.');
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false) {
    dashticz_json_error(400, 'Unable to read request body.');
}

$data = json_decode($rawBody, true);
if (json_last_error() !== JSON_ERROR_NONE
    || !is_array($data)
    || !isset($data['widgets'])
    || !is_array($data['widgets'])
) {
    dashticz_json_error(400, 'Invalid widgets list.');
}

// Grid-mode screens size widgets via their grid cell (x/y/w/h); a block-level
// pixel height only makes sense as a legacy fallback for column layouts,
// which need a height estimate to pack columns.
$gridMode = !empty($data['gridMode']);

// Allowed widget config settings and their types
$allowedSettings = [
    // weather
    'owm_api'                => 'string',
    'owm_city'               => 'string',
    'owm_name'               => 'string',
    'owm_country'            => 'string',
    'owm_lang'               => 'string',
    'owm_days'               => 'bool',
    'owm_cnt'                => 'number',
    'owm_min'                => 'bool',
    'wu_api'                 => 'string',
    'wu_city'                => 'string',
    'wu_name'                => 'string',
    'wu_country'             => 'string',
    'use_fahrenheit'         => 'bool',
    'use_beaufort'           => 'bool',
    'translate_windspeed'    => 'bool',
    'static_weathericons'    => 'bool',
    'weather_show_rain'      => 'bool',
    'weather_show_description' => 'bool',
    'weather_show_wind'      => 'bool',
    'weather_show_gust'      => 'bool',
    'weather_icons'          => 'weather_icons',
    // clock
    'boss_stationclock'      => 'string',
    'hide_seconds'           => 'bool',
    'hide_seconds_stationclock' => 'bool',
    'clock_size'             => 'number',
    'clock_scale'            => 'number',
    // garbage
    'garbage_company'        => 'garbage_company',
    'garbage_icalurl'        => 'string',
    'google_api_key'         => 'string',
    'garbage_calendar_id'    => 'string',
    'garbage_zipcode'        => 'string',
    'garbage_street'         => 'string',
    'garbage_housenumber'    => 'string',
    'garbage_housenumberadd' => 'string',
    'garbage_maxitems'       => 'number',
    'garbage_maxdays'        => 'number',
    'garbage_width'          => 'number',
    'garbage_hideicon'       => 'bool',
    'garbage_icon_use_colors'=> 'bool',
    'garbage_use_colors'     => 'bool',
    'garbage_use_names'      => 'bool',
    'garbage_use_cors_prefix'=> 'bool',
    // sonarr
    'sonarr_url'             => 'string',
    'sonarr_apikey'          => 'string',
    'sonarr_maxitems'        => 'number',
    // spotify
    'spot_clientid'          => 'string',
    // calendar
    'calendarformat'         => 'string',
    'calendarlanguage'       => 'calendar_language',
    'calendar_maxitems'      => 'number',
    // security panel
    'security_button_icons'  => 'bool',
    'security_panel_lock'    => 'bool',
    // traffic info
    'anwb_apikey'            => 'string',
    // google maps
    'gm_api'                 => 'string',
    'gm_zoomlevel'           => 'number',
    'gm_latitude'            => 'string',
    'gm_longitude'           => 'string',
    // air quality (WAQI)
    'waqi_city'              => 'string',
    'waqi_layout'            => 'waqi_layout',
    // moon
    'idx_moonpicture'        => 'string',
    // news
    'default_news_url'       => 'string',
    'news_scroll_after'      => 'number',
    // xmltvguide
    'xmltv_url'              => 'string',
    'xmltv_channels'         => 'string',
    'xmltv_maxitems'         => 'number',
    'xmltv_layout'           => 'number',
    'xmltv_separator'        => 'string',
    'xmltv_refresh'          => 'number',
];

$allowedGarbageCompanies = [
    'afvalinfo','afvalalert','afvalstoffendienst','almere','alphenaandenrijn','area',
    'avalex','avri','barafvalbeheer','best','blink','circulusberkel','cure','cyclusnv',
    'dar','deafvalapp','edg','gad','gemeenteberkelland','goes','googlecalendar',
    'groningen','hvc','ical','katwijk','maashorst','meerlanden','mijnafvalwijzer',
    'omrin','purmerend','rd4','recycleapp','rmn','rova','sudwestfryslan','suez',
    'twentemilieu','uden','veldhoven','venlo','venray','vianen','waalre','waardlanden',
];

$allowedCalendarLanguages = [
    'zh_CN','da_DK','de_DE','en_US','es_ES','fi_FI','fr_FR','hu_HU','it_IT',
    'ja_JP','lt_LT','nl_NL','nb_NO','pl_PL','pt_PT','ro_RO','ru_RU','sk_SK',
    'sl_SL','sv_SE','uk_UA',
];

$allowedWeatherIcons = ['line', 'linestatic', 'fill', 'static', 'meteo'];

$allowedWaqiLayouts = ['xsmall', 'small', 'large', 'xlarge', 'xxl'];

// Process optional config settings
$configSettings = [];
if (isset($data['settings']) && is_array($data['settings'])) {
    foreach ($data['settings'] as $key => $value) {
        if (!preg_match('/^[A-Za-z0-9_]+$/', $key) || !isset($allowedSettings[$key])) {
            continue; // silently skip unknown keys
        }
        $type = $allowedSettings[$key];
        if ($type === 'bool') {
            $configSettings[$key] = (int)(bool)$value;
        } elseif ($type === 'number') {
            $configSettings[$key] = is_numeric($value) ? (float)$value : 0;
            if ($configSettings[$key] == (int)$configSettings[$key]) {
                $configSettings[$key] = (int)$configSettings[$key];
            }
        } elseif ($type === 'garbage_company') {
            if (in_array((string)$value, $allowedGarbageCompanies, true)) {
                $configSettings[$key] = (string)$value;
            }
        } elseif ($type === 'calendar_language') {
            if (in_array((string)$value, $allowedCalendarLanguages, true)) {
                $configSettings[$key] = (string)$value;
            }
        } elseif ($type === 'weather_icons') {
            if (in_array((string)$value, $allowedWeatherIcons, true)) {
                $configSettings[$key] = (string)$value;
            }
        } elseif ($type === 'waqi_layout') {
            if (in_array((string)$value, $allowedWaqiLayouts, true)) {
                $configSettings[$key] = (string)$value;
            }
        } else {
            // string: sanitize
            $str = (string)$value;
            if (strlen($str) <= 2048) {
                $configSettings[$key] = $str;
            }
        }
    }
}

$catalog = [
    'weather' => ['key' => 'widget_weather', 'width' => 4, 'height' => 120],
    'garbage' => ['key' => 'widget_garbage', 'width' => 5, 'height' => 160],
    'spotify' => ['key' => 'widget_spotify', 'width' => 4, 'height' => 120],
    'sonarr' => ['key' => 'widget_sonarr', 'width' => 4, 'height' => 120],
    'clock' => ['key' => 'widget_clock', 'width' => 4],
    'calendar' => ['key' => 'widget_calendar', 'width' => 4, 'height' => 120],
    'secpanel' => ['key' => 'widget_secpanel', 'width' => 12],
    'publictransport' => ['key' => 'widget_publictransport', 'width' => 4, 'height' => 260],
    'trafficinfo' => ['key' => 'widget_trafficinfo', 'width' => 4, 'height' => 260],
    'alarmmeldingen' => ['key' => 'widget_alarmmeldingen', 'width' => 4, 'height' => 160],
    'camera' => ['key' => 'widget_cameras', 'width' => 4, 'height' => 320],
    'map' => ['key' => 'widget_map', 'width' => 4, 'height' => 500],
    'longfonds' => ['key' => 'widget_longfonds', 'width' => 4, 'height' => 120],
    'moon' => ['key' => 'widget_moon', 'width' => 3],
    'news' => ['key' => 'widget_news', 'width' => 4, 'height' => 240],
    // iframe widget: embeds any URL in an inline frame
    'iframe' => ['key' => 'widget_iframe', 'width' => 6, 'height' => 400],
    // xmltvguide widget: TV programme guide from an XMLTV-format URL
    'xmltvguide' => ['key' => 'widget_xmltvguide', 'width' => 6, 'height' => 300],
];

function _validate_custom_widget_value($value, $depth = 0)
{
    if ($depth > 4) {
        return false;
    }
    if (is_string($value)) {
        return strlen($value) <= 4096;
    }
    if (is_int($value) || is_float($value) || is_bool($value) || $value === null) {
        return true;
    }
    if (is_object($value)) {
        $value = get_object_vars($value);
    }
    if (!is_array($value) || count($value) > 100) {
        return false;
    }
    foreach ($value as $nestedKey => $nestedValue) {
        if (is_string($nestedKey) &&
            (strlen($nestedKey) > 100 || preg_match('/[\x00-\x1F]/', $nestedKey))) {
            return false;
        }
        if (!_validate_custom_widget_value($nestedValue, $depth + 1)) {
            return false;
        }
    }
    return true;
}

$widgets = [];
$seen = [];
foreach ($data['widgets'] as $entry) {
    if (!is_array($entry) || !isset($entry['id']) || !is_string($entry['id'])) {
        dashticz_json_error(400, 'Each widget must contain a valid id.');
    }

    $id = $entry['id'];
    if (!isset($catalog[$id])) {
        dashticz_json_error(400, 'Unknown widget id.');
    }
    if (isset($seen[$id])) {
        continue;
    }
    $seen[$id] = true;

    $widget = [
        'id' => $id,
        'key' => isset($entry['key'])
            && is_string($entry['key'])
            && preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $entry['key'])
                ? $entry['key']
                : $catalog[$id]['key'],
        'width' => isset($entry['width'])
            ? max(1, min(12, (int)$entry['width']))
            : $catalog[$id]['width'],
        'height' => (!$gridMode && isset($catalog[$id]['height']))
            ? $catalog[$id]['height']
            : null,
        'hide_title' => !empty($entry['hide_title']),
        'icon' => null,
        'hide_data' => !empty($entry['hide_data']),
        'last_update' => !empty($entry['last_update']),
    ];
    if (isset($entry['icon']) && is_string($entry['icon'])) {
        $icon = trim($entry['icon']);
        if (strlen($icon) <= 100) {
            // Empty hides the icon; non-empty values preserve legacy custom icons.
            $widget['icon'] = $icon;
        }
    }
    if (isset($entry['title']) && is_string($entry['title'])) {
        $title = trim($entry['title']);
        if ($title !== '' && strlen($title) <= 100) {
            $widget['title'] = $title;
        }
    }
    if (isset($entry['custom_fields'])) {
        if (!is_array($entry['custom_fields']) || count($entry['custom_fields']) > 50) {
            dashticz_json_error(400, 'custom_fields must contain at most 50 fields.');
        }
        // These properties are controlled by the normal widget payload. Older
        // editor state can still contain duplicate copies in custom_fields
        // (especially the Icon/Data/Update/Title checkbox properties). Ignore
        // those stale copies instead of rejecting the complete widget save.
        $managedCustomFields = [
            'type', 'id', 'key', 'width', 'height', 'grid', 'idx', 'subidx',
            'icon', 'hide_data', 'last_update', 'hide_title',
            'text_alignment', 'text_align', 'custom_fields',
        ];
        $dangerousCustomFields = ['__proto__', 'prototype', 'constructor'];
        $widget['custom_fields'] = [];
        $seenCustomFields = [];
        foreach ($entry['custom_fields'] as $field => $value) {
            if (!is_string($field) ||
                !preg_match('/^[A-Za-z_$][A-Za-z0-9_$]*$/', $field)) {
                dashticz_json_error(400, 'Invalid custom widget field.');
            }
            $fieldKey = strtolower($field);
            if (in_array($fieldKey, $dangerousCustomFields, true)) {
                dashticz_json_error(400, 'Invalid or reserved custom widget field.');
            }
            if (in_array($fieldKey, $managedCustomFields, true)) {
                continue;
            }
            if (isset($seenCustomFields[$fieldKey])) {
                dashticz_json_error(400, 'Duplicate custom widget field.');
            }
            $value = configwriter_restore_editor_value($value);
            if (!_validate_custom_widget_value($value)) {
                dashticz_json_error(400, 'Invalid custom widget field value.');
            }
            $seenCustomFields[$fieldKey] = true;
            $widget['custom_fields'][$field] = $value;
        }
        if (strlen(json_encode($widget['custom_fields'])) > 32768) {
            dashticz_json_error(400, 'Custom widget fields are too large.');
        }
    }
    if ($id === 'garbage' && isset($entry['displayTitle']) && is_string($entry['displayTitle'])) {
        $displayTitle = trim($entry['displayTitle']);
        if ($displayTitle !== '' && strlen($displayTitle) <= 100) {
            $widget['displayTitle'] = $displayTitle;
        }
    }
    if ($id === 'garbage') {
        $maxitems = isset($entry['maxitems']) && is_numeric($entry['maxitems'])
            ? (int)$entry['maxitems']
            : 4;
        $maxdays = isset($entry['maxdays']) && is_numeric($entry['maxdays'])
            ? (int)$entry['maxdays']
            : 32;
        $widget['maxitems'] = max(1, min(500, $maxitems));
        $widget['maxdays'] = max(1, min(3660, $maxdays));
    }
    if (array_key_exists('height', $entry) && $entry['height'] !== null && $entry['height'] !== '') {
        $height = (int)(round(((int)$entry['height']) / 10) * 10);
        $widget['height'] = max(50, min(2000, $height));
    }

    if ($id === 'weather') {
        $provider = isset($entry['provider']) && is_string($entry['provider'])
            ? $entry['provider']
            : 'openweather';
        if ($provider !== 'openweather' && $provider !== 'wunderground') {
            dashticz_json_error(400, 'Unknown weather provider.');
        }
        $widget['provider'] = $provider;

        $widget['showRain'] = array_key_exists('showRain', $entry)
            ? (int)(bool)$entry['showRain']
            : 1;
        $widget['showDescription'] = array_key_exists('showDescription', $entry)
            ? (int)(bool)$entry['showDescription']
            : 1;
        $widget['showWind'] = array_key_exists('showWind', $entry)
            ? (int)(bool)$entry['showWind']
            : 0;
        $widget['showGust'] = array_key_exists('showGust', $entry)
            ? (int)(bool)$entry['showGust']
            : 0;
        $icons = isset($entry['icons']) && is_string($entry['icons'])
            ? $entry['icons']
            : 'line';
        if (!in_array($icons, $allowedWeatherIcons, true)) {
            $icons = 'line';
        }
        $widget['icons'] = $icons;
    }

    if ($id === 'calendar') {
        $icalurl = isset($entry['icalurl']) ? $entry['icalurl'] : null;
        if (is_string($icalurl)) {
            $icalurl = trim($icalurl);
            if (strlen($icalurl) > 2048 || !preg_match('#^https?://[^\s]+$#i', $icalurl)) {
                dashticz_json_error(400, 'Calendar requires a valid http(s) ICS URL.');
            }
            $widget['icalurl'] = $icalurl;
        } elseif (is_array($icalurl) && count($icalurl) > 0 && count($icalurl) <= 20) {
            $widget['icalurl'] = [];
            foreach ($icalurl as $name => $source) {
                if (!is_string($name) || $name === '' || strlen($name) > 100 ||
                    preg_match('/[\x00-\x1F]/', $name) ||
                    in_array(strtolower($name), ['__proto__', 'prototype', 'constructor'], true)) {
                    dashticz_json_error(400, 'Each calendar requires a valid unique name.');
                }
                if (!is_array($source)) {
                    dashticz_json_error(400, 'Each calendar requires valid settings.');
                }
                $ics = isset($source['ics']) && is_string($source['ics'])
                    ? trim($source['ics'])
                    : '';
                if ($ics === '' || strlen($ics) > 2048 || !preg_match('#^https?://[^\s]+$#i', $ics)) {
                    dashticz_json_error(400, 'Calendar ' . $name . ' requires a valid http(s) ICS URL.');
                }
                $color = isset($source['color']) && is_string($source['color'])
                    ? trim($source['color'])
                    : 'white';
                if ($color === '' || strlen($color) > 64 ||
                    !preg_match('/^(?:#[0-9A-Fa-f]{3,8}|[A-Za-z][A-Za-z0-9-]{0,31}|rgba?\([0-9.,%\s]+\)|hsla?\([0-9.,%\s]+\))$/', $color)) {
                    dashticz_json_error(400, 'Calendar ' . $name . ' requires a valid color.');
                }
                $widget['icalurl'][$name] = [
                    'ics' => $ics,
                    'color' => $color,
                ];
            }
        } else {
            dashticz_json_error(400, 'Calendar requires one to twenty calendar sources.');
        }
        $maxitems = isset($entry['maxitems']) && is_numeric($entry['maxitems'])
            ? (int)$entry['maxitems']
            : 15;
        $widget['maxitems'] = max(1, min(500, $maxitems));
    }

    if ($id === 'clock') {
        $clockType = isset($entry['clockType']) && is_string($entry['clockType'])
            ? $entry['clockType']
            : 'basicclock';
        $allowedClockTypes = ['basicclock', 'stationclock', 'flipclock', 'haymanclock', 'miniclock'];
        if (!in_array($clockType, $allowedClockTypes, true)) {
            dashticz_json_error(400, 'Unknown clock type.');
        }
        $widget['clockType'] = $clockType;

        if ($clockType !== 'miniclock') {
            if (isset($entry['size']) && $entry['size'] !== '' && is_numeric($entry['size'])) {
                $size = (int)$entry['size'];
                if ($size > 0 && $size <= 2000) {
                    $widget['size'] = $size;
                }
            }
            if (isset($entry['scale']) && $entry['scale'] !== '' && is_numeric($entry['scale'])) {
                $scale = (float)$entry['scale'];
                if ($scale > 0 && $scale <= 5) {
                    $widget['scale'] = $scale == (int)$scale ? (int)$scale : $scale;
                }
            }
        }

        if ($clockType === 'flipclock') {
            $widget['showSeconds'] = array_key_exists('showSeconds', $entry)
                ? (int)(bool)$entry['showSeconds']
                : 1;
            $clockFace = isset($entry['clockFace']) ? (string)$entry['clockFace'] : '24';
            $widget['clockFace'] = ($clockFace === '12') ? 12 : 24;
        }

        if ($clockType === 'stationclock') {
            $stationEnums = [
                'body' => ['NoBody', 'SmallWhiteBody', 'RoundBody', 'RoundGreenBody', 'SquareBody', 'ViennaBody'],
                'dial' => ['NoDial', 'GermanHourStrokeDial', 'GermanStrokeDial', 'AustriaStrokeDial', 'SwissStrokeDial', 'ViennaStrokeDial'],
                'hourhand' => ['PointedHourHand', 'BarHourHand', 'SwissHourHand', 'ViennaHourHand'],
                'minutehand' => ['PointedMinuteHand', 'BarMinuteHand', 'SwissMinuteHand', 'ViennaMinuteHand'],
                'secondhand' => ['NoSecondHand', 'BarSecondHand', 'HoleShapedSecondHand', 'NewHoleShapedSecondHand', 'SwissSecondHand'],
                'boss' => ['NoBoss', 'BlackBoss', 'RedBoss', 'ViennaBoss'],
                'minutehandbehavior' => ['CreepingMinuteHand', 'BouncingMinuteHand', 'ElasticBouncingMinuteHand'],
                'secondhandbehavior' => ['CreepingSecondHand', 'BouncingSecondHand', 'ElasticBouncingSecondHand', 'OverhastySecondHand'],
            ];
            foreach ($stationEnums as $prop => $allowed) {
                if (!isset($entry[$prop])) {
                    continue;
                }
                $val = $entry[$prop];
                if (is_string($val) && in_array($val, $allowed, true)) {
                    $widget[$prop] = $val;
                } elseif (is_numeric($val)) {
                    $widget[$prop] = (int)$val;
                }
            }
        }
    }

    if ($id === 'publictransport') {
        $station = isset($entry['station']) && is_string($entry['station'])
            ? trim($entry['station'])
            : 'UT';
        if ($station === '' || strlen($station) > 64 || !preg_match('/^[A-Za-z0-9_\-]+$/', $station)) {
            dashticz_json_error(400, 'Invalid public transport station id.');
        }
        $provider = isset($entry['provider']) && is_string($entry['provider'])
            ? $entry['provider']
            : 'treinen';
        $allowedProviders = ['treinen', 'ovapi', 'drgl', 'irailbe', 'delijnbe'];
        if (!in_array($provider, $allowedProviders, true)) {
            dashticz_json_error(400, 'Unknown public transport provider.');
        }
        $widget['station'] = $station;
        $widget['provider'] = $provider;
    }

    if ($id === 'camera') {
        $cameraList = isset($entry['cameras']) && is_array($entry['cameras'])
            ? $entry['cameras']
            : [];
        if (count($cameraList) > 12) {
            dashticz_json_error(400, 'A camera widget supports up to 12 cameras.');
        }
        if (!empty($cameraList)) {
            $widget['cameras'] = [];
            foreach ($cameraList as $index => $camera) {
                if (!is_array($camera)) {
                    dashticz_json_error(400, 'Each camera requires valid settings.');
                }
                $imageUrl = isset($camera['imageUrl']) && is_string($camera['imageUrl'])
                    ? trim($camera['imageUrl'])
                    : '';
                if ($imageUrl === '' || strlen($imageUrl) > 2048 || !preg_match('#^https?://[^\s]+$#i', $imageUrl)) {
                    dashticz_json_error(400, 'Camera ' . ($index + 1) . ' requires a valid http(s) image URL.');
                }
                $cameraEntry = [
                    'title' => isset($camera['title']) && is_string($camera['title'])
                        ? trim($camera['title'])
                        : 'Camera ' . ($index + 1),
                    'imageUrl' => $imageUrl,
                ];
                if ($cameraEntry['title'] === '' || strlen($cameraEntry['title']) > 100) {
                    $cameraEntry['title'] = 'Camera ' . ($index + 1);
                }
                if (isset($camera['videoUrl']) && is_string($camera['videoUrl'])) {
                    $videoUrl = trim($camera['videoUrl']);
                    if ($videoUrl !== '' && (strlen($videoUrl) > 2048 || !preg_match('#^https?://[^\s]+$#i', $videoUrl))) {
                        dashticz_json_error(400, 'Camera ' . ($index + 1) . ' requires a valid http(s) video URL.');
                    }
                    if ($videoUrl !== '') {
                        $cameraEntry['videoUrl'] = $videoUrl;
                    }
                }
                $widget['cameras'][] = $cameraEntry;
            }
        } else {
            $imageUrl = isset($entry['imageUrl']) && is_string($entry['imageUrl'])
                ? trim($entry['imageUrl'])
                : '';
            if ($imageUrl === '' || strlen($imageUrl) > 2048 || !preg_match('#^https?://[^\s]+$#i', $imageUrl)) {
                dashticz_json_error(400, 'Camera requires a valid http(s) image URL.');
            }
            $widget['imageUrl'] = $imageUrl;
            if (isset($entry['title']) && is_string($entry['title'])) {
                $title = trim($entry['title']);
                if ($title !== '' && strlen($title) <= 100) {
                    $widget['cameraTitle'] = $title;
                }
            }
            if (isset($entry['videoUrl']) && is_string($entry['videoUrl'])) {
                $videoUrl = trim($entry['videoUrl']);
                if ($videoUrl !== '' && strlen($videoUrl) <= 2048 && preg_match('#^https?://[^\s]+$#i', $videoUrl)) {
                    $widget['videoUrl'] = $videoUrl;
                }
            }
        }
    }

    if ($id === 'alarmmeldingen') {
        $rss = isset($entry['rss']) && is_string($entry['rss'])
            ? trim($entry['rss'])
            : 'https://www.alarmeringen.nl/feeds/all.rss';
        if (strlen($rss) > 2048 || !preg_match('#^https?://[^\s]+$#i', $rss)) {
            dashticz_json_error(400, '112 requires a valid http(s) RSS URL.');
        }
        $widget['rss'] = $rss;
        if (isset($entry['filter']) && is_string($entry['filter']) && strlen($entry['filter']) <= 256) {
            $widget['filter'] = $entry['filter'];
        }
    }

    // Validate and store iframe-specific block properties
    if ($id === 'iframe') {
        $frameurl = isset($entry['frameurl']) && is_string($entry['frameurl'])
            ? trim($entry['frameurl'])
            : '';
        if ($frameurl === '' || strlen($frameurl) > 2048) {
            dashticz_json_error(400, 'iFrame requires a non-empty URL (max 2048 characters).');
        }
        $widget['frameurl'] = $frameurl;

        // Optional: scrollbars (boolean, default true)
        $widget['scrollbars'] = !isset($entry['scrollbars']) || (bool)$entry['scrollbars'];

        // Optional: height in pixels
        if (isset($entry['iframeHeight']) && is_numeric($entry['iframeHeight'])) {
            $h = (int)$entry['iframeHeight'];
            if ($h > 0 && $h <= 5000) {
                $widget['iframeHeight'] = $h;
            }
        }

        // Optional: scale-to-fit width
        if (isset($entry['scaletofit']) && is_numeric($entry['scaletofit'])) {
            $s = (int)$entry['scaletofit'];
            if ($s > 0 && $s <= 10000) {
                $widget['scaletofit'] = $s;
            }
        }

        // Optional: responsive iframe height expressed as height / width.
        if (isset($entry['aspectratio']) && is_numeric($entry['aspectratio'])) {
            $ratio = (float)$entry['aspectratio'];
            if ($ratio > 0 && $ratio <= 10) {
                $widget['aspectratio'] = $ratio;
                unset($widget['iframeHeight']);
            }
        }

        // Optional: force cache refresh
        if (!empty($entry['forcerefresh'])) {
            $widget['forcerefresh'] = true;
        }

        // Optional: refresh interval in seconds
        if (isset($entry['refresh']) && is_numeric($entry['refresh'])) {
            $r = (int)$entry['refresh'];
            if ($r > 0 && $r <= 86400) {
                $widget['refresh'] = $r;
            }
        }
    }

    // Validate and store xmltvguide-specific block properties
    if ($id === 'xmltvguide') {
        $xmltvurl = isset($entry['xmltvurl']) && is_string($entry['xmltvurl'])
            ? trim($entry['xmltvurl'])
            : '';
        if ($xmltvurl === '' || strlen($xmltvurl) > 2048) {
            dashticz_json_error(400, 'XMLTV TV Guide requires a non-empty XMLTV URL (max 2048 characters).');
        }
        $widget['xmltvurl'] = $xmltvurl;

        // Optional: channel filter (array of channel IDs or display-names)
        if (isset($entry['channels']) && is_array($entry['channels'])) {
            $channels = [];
            foreach ($entry['channels'] as $ch) {
                if (is_string($ch) && strlen($ch) > 0 && strlen($ch) <= 256) {
                    $channels[] = $ch;
                }
            }
            if (count($channels) > 100) {
                dashticz_json_error(400, 'XMLTV TV Guide supports up to 100 channels.');
            }
            $widget['channels'] = $channels;
        }

        // Optional: max items
        if (isset($entry['maxitems']) && is_numeric($entry['maxitems'])) {
            $m = (int)$entry['maxitems'];
            if ($m > 0 && $m <= 500) {
                $widget['maxitems'] = $m;
            }
        }
        if (isset($entry['layout']) && is_numeric($entry['layout'])) {
            $widget['layout'] = ((int)$entry['layout'] === 1) ? 1 : 0;
        }
        if (isset($entry['separator']) && is_string($entry['separator'])) {
            $separator = trim($entry['separator']);
            if ($separator !== '' && strlen($separator) <= 10) {
                $widget['separator'] = $separator;
            }
        }
        if (isset($entry['refresh']) && is_numeric($entry['refresh'])) {
            $r = (int)$entry['refresh'];
            if ($r > 0 && $r <= 86400) {
                $widget['refresh'] = $r;
            }
        }
    }

    $widgets[] = $widget;
}

$customDir = __DIR__ . '/../custom';
list($configPath, $cfgFile) = configwriter_resolve_config_path($customDir);
list($config, $readError) = configwriter_read_config($configPath);
if ($readError !== null) {
    dashticz_json_error(500, $readError);
}

$screenNumber = configwriter_parse_screen_number($data, 1);
list($startMarker, $endMarker) = configwriter_editor_markers('widget', $screenNumber);

/*
 * Device/layout editors call this endpoint without a settings payload.
 * Keep previously saved widget config settings unless new ones are provided.
 * Settings are global, so also fall back to the screen-1 widget section.
 */
$existingSettings = configwriter_extract_section_config_settings(
    $config,
    $startMarker,
    $endMarker
);
if (empty($existingSettings) && $screenNumber !== 1) {
    list($s1Start, $s1End) = configwriter_editor_markers('widget', 1);
    $existingSettings = configwriter_extract_section_config_settings(
        $config,
        $s1Start,
        $s1End
    );
}

$config = configwriter_remove_section($config, $startMarker, $endMarker);
$config = rtrim($config);
$blocksOnly = !empty($data['blocksOnly']);

if (!empty($widgets)) {
    // TAAK1: never let a widget silently take over a block key that a
    // different screen already owns; clone it (screen-prefixed) instead.
    $owners = configwriter_extract_screen_block_owners($config, $screenNumber);
    $usedKeys = array_keys(configwriter_extract_declared_block_refs($config));
    foreach ($widgets as &$widget) {
        $widget['key'] = configwriter_ensure_screen_owned_key(
            $widget['key'],
            $screenNumber,
            $owners,
            $usedKeys
        );
    }
    unset($widget);

    $section = configwriter_section_header('BLOCKS') . "\n";
    $section .= "if (typeof blocks === 'undefined') var blocks = {}\n";

    foreach ($widgets as $widget) {
        $props = _widgetBlockProps($widget);
        $section .= configwriter_emit_block_line($widget['key'], $props);
    }

    if (!$blocksOnly) {
        $section .= "\n" . configwriter_section_header('COLUMNS') . "\n";
        $section .= "if (typeof columns === 'undefined') var columns = {}\n";
        $layoutItems = array_map(function ($widget) {
            $item = [
                'ref' => $widget['key'],
                'width' => $widget['width'],
            ];
            if ($widget['height'] !== null) {
                $item['height'] = $widget['height'];
            }
            return $item;
        }, $widgets);
        $columnKeys = [];
        $prefix = configwriter_column_prefix('we', $screenNumber);
        foreach (configwriter_pack_columns_by_height($layoutItems, 12, $prefix) as $column) {
            $columnKeys[] = $column['key'];
            $section .= configwriter_emit_column_line(
                $column['key'],
                $column['blocks'],
                $column['width']
            );
        }

        if ($screenNumber > 0) {
            $section .= "\n" . configwriter_section_header('SCREENS') . "\n";
            $section .= configwriter_emit_screen_columns($screenNumber, $columnKeys, 'merge');
        }
    }

    if (!empty($configSettings)) {
        $section .= configwriter_emit_config_settings($configSettings, false);
    } elseif (!empty($existingSettings)) {
        $section .= configwriter_emit_config_settings($existingSettings, true);
    }

    $config .= configwriter_wrap_section($startMarker, $endMarker, $section);
}

$writeError = configwriter_write_config($configPath, $customDir, $config);
if ($writeError !== null) {
    dashticz_json_error(500, $writeError);
}

header('Content-Type: application/json');
echo json_encode([
    'success' => true,
    'blockKeys' => array_map(function ($widget) {
        return $widget['key'];
    }, $widgets),
]);

function _widgetBlockProps($widget)
{
    $props = [
        'width' => $widget['width'],
        'title' => 'Widget',
    ];
    if ($widget['height'] !== null) {
        $props['height'] = $widget['height'];
    }

    switch ($widget['id']) {
        case 'weather':
            $props['type'] = $widget['provider'] === 'wunderground' ? 'wunderground' : 'weather';
            $props['widget_provider'] = $widget['provider'];
            $props['title'] = 'Weer';
            if ($widget['provider'] === 'openweather') {
                $props['showRain'] = !empty($widget['showRain']);
                $props['showDescription'] = !empty($widget['showDescription']);
                $props['showWind'] = !empty($widget['showWind']);
                $props['showGust'] = !empty($widget['showGust']);
                $props['icons'] = $widget['icons'];
            }
            break;
        case 'garbage':
            $props['type'] = 'garbage';
            $props['title'] = isset($widget['displayTitle']) ? $widget['displayTitle'] : 'Afval';
            $props['maxitems'] = $widget['maxitems'];
            $props['maxdays'] = $widget['maxdays'];
            break;
        case 'spotify':
            $props['type'] = 'spotify';
            $props['title'] = 'Spotify';
            break;
        case 'sonarr':
            $props['type'] = 'sonarr';
            $props['title'] = 'Sonarr';
            $props['title_position'] = 'left';
            $props['view'] = 'banner';
            break;
        case 'clock':
            $props['type'] = $widget['clockType'];
            $props['title'] = 'Klok';
            if (isset($widget['size'])) {
                $props['size'] = $widget['size'];
            }
            if (isset($widget['scale'])) {
                $props['scale'] = $widget['scale'];
            }
            if ($widget['clockType'] === 'flipclock') {
                $props['showSeconds'] = !empty($widget['showSeconds']);
                $props['clockFace'] = $widget['clockFace'];
            }
            if ($widget['clockType'] === 'stationclock') {
                foreach ([
                    'body',
                    'dial',
                    'hourhand',
                    'minutehand',
                    'secondhand',
                    'boss',
                    'minutehandbehavior',
                    'secondhandbehavior',
                ] as $prop) {
                    if (isset($widget[$prop])) {
                        $props[$prop] = $widget[$prop];
                    }
                }
            }
            break;
        case 'calendar':
            $props['type'] = 'calendar';
            $props['title'] = 'Kalender';
            $props['icalurl'] = $widget['icalurl'];
            $props['maxitems'] = $widget['maxitems'];
            break;
        case 'secpanel':
            $props['type'] = 'secpanel';
            $props['title'] = 'Security Panel';
            break;
        case 'publictransport':
            $props['type'] = 'publictransport';
            $props['title'] = 'OV';
            $props['provider'] = $widget['provider'];
            $props['station'] = $widget['station'];
            $props['results'] = 5;
            $props['show_via'] = true;
            break;
        case 'trafficinfo':
            $props['title'] = 'Traffic';
            $props['provider'] = 'anwb';
            $props['trafficJams'] = true;
            $props['roadWorks'] = true;
            $props['radars'] = true;
            $props['results'] = 50;
            break;
        case 'alarmmeldingen':
            $props['type'] = 'alarmmeldingen';
            $props['title'] = '112';
            $props['rss'] = $widget['rss'];
            $props['results'] = 5;
            if (!empty($widget['filter'])) {
                $props['filter'] = $widget['filter'];
            }
            break;
        case 'camera':
            $props['type'] = 'camera';
            $props['title'] = isset($widget['cameraTitle'])
                ? $widget['cameraTitle']
                : 'Camera';
            if (!empty($widget['cameras'])) {
                $props['cameras'] = $widget['cameras'];
            } else {
                $props['imageUrl'] = $widget['imageUrl'];
                if (!empty($widget['videoUrl'])) {
                    $props['videoUrl'] = $widget['videoUrl'];
                }
            }
            break;
        case 'map':
            $props['type'] = 'map';
            $props['title'] = 'Google Maps';
            $props['showtraffic'] = true;
            break;
        case 'longfonds':
            // Widget id/key stay 'longfonds' for backward compatibility; the
            // block itself now renders through the WAQI (World Air Quality
            // Index) component, configured via the global waqi_city/
            // waqi_layout settings.
            $props['type'] = 'waqi';
            $props['title'] = 'Air Quality';
            break;
        case 'moon':
            $props['type'] = 'moon';
            $props['title'] = 'Moon';
            break;
        case 'news':
            $props['type'] = 'news';
            $props['title'] = 'News';
            break;
        case 'iframe':
            // iframe widget: generates a block with frameurl for the DT_frame component
            $props['title'] = 'iFrame';
            $props['frameurl'] = $widget['frameurl'];
            $props['scrollbars'] = !empty($widget['scrollbars']);
            if (!empty($widget['iframeHeight'])) {
                // Override the column height with the configured iframe height
                $props['height'] = $widget['iframeHeight'];
            }
            if (!empty($widget['scaletofit'])) {
                $props['scaletofit'] = $widget['scaletofit'];
            }
            if (!empty($widget['aspectratio'])) {
                // Responsive sizing takes precedence over the legacy fixed height.
                unset($props['height']);
                $props['aspectratio'] = $widget['aspectratio'];
            }
            if (!empty($widget['forcerefresh'])) {
                $props['forcerefresh'] = true;
            }
            if (!empty($widget['refresh'])) {
                $props['refresh'] = $widget['refresh'];
            }
            break;
        case 'xmltvguide':
            $props['type'] = 'xmltvguide';
            // xmltvguide widget: TV programme guide from an XMLTV-format URL
            $props['title'] = 'TV Guide';
            break;
    }

    if (isset($widget['title']) && is_string($widget['title'])) {
        $title = trim($widget['title']);
        if ($title !== '' && strlen($title) <= 100) {
            $props['title'] = $title;
        }
    }
    if (!empty($widget['hide_title'])) {
        $props['hide_title'] = true;
    }
    if ($widget['icon'] !== null) {
        $props['icon'] = $widget['icon'];
    }
    if (!empty($widget['hide_data'])) {
        $props['hide_data'] = true;
    }
    if (!empty($widget['last_update'])) {
        $props['last_update'] = true;
    }
    if (!empty($widget['custom_fields'])) {
        // Custom fields are merged last so users can intentionally override a
        // normal widget option such as layout, maxitems or title. Core identity
        // and editor-management properties are rejected during validation.
        foreach ($widget['custom_fields'] as $field => $value) {
            $props[$field] = $value;
        }
    }

    return $props;
}

function _widgetChunks($widgets, $columnWidth)
{
    $chunks = [];
    $current = [];
    $width = 0;

    foreach ($widgets as $widget) {
        if (!empty($current) && ($width + $widget['width']) > $columnWidth) {
            $chunks[] = $current;
            $current = [];
            $width = 0;
        }
        $current[] = $widget;
        $width += $widget['width'];
    }

    if (!empty($current)) {
        $chunks[] = $current;
    }
    return $chunks;
}
