/* global Dashticz DT_function Domoticz */
//# sourceURL=js/components/weatherinfo.js
/* Weather Info widget: the rain forecast and the current weather of a
 * location, based on the domoticz_weatherinfo plugin
 * (https://github.com/MadPatrick/domoticz_weatherinfo). It is standalone - no
 * Domoticz device needed. The Buienradar rain forecast and the Open-Meteo
 * current weather are downloaded by vendor/dashticz/weatherinfo/index.php, a
 * same-origin PHP bridge like the F1 and HP iLO widgets; the texts below
 * mirror the plugin's status line.
 *
 * It is a repeatable block (Widgets -> Weather info, multiple per screen),
 * configured per block, and dispatched on wimode ('forecast'):
 *
 *   wilat, wilon   optional location; empty = the location of Domoticz
 *   wipollminutes  how often the rain forecast is downloaded (default 5)
 *   wilanguage     'nl' (default) | 'en': language of the status text, the
 *                  weather description and the wind direction
 *   wiparts        the parts of the text and their order, comma separated;
 *                  parts: status (the rain status), temp, desc, wind and logo
 *                  (the weather icon), shown after each other on one row. Default 'status,temp,desc,wind,logo' (the
 *                  plugin's Text device); a part that is left out is hidden
 *   wiicons        'animated' (default): animated SVG weather icons; 'emoji':
 *                  the emoji of the plugin
 *   wishowrainfall an extra row with the current rain intensity in mm/h, the
 *                  value of the plugin's Rainfall device (default off)
 *   wifontsize     optional font size in px (8-60); empty = the theme's
 */
var DT_weatherinfo = (function () {
  var PARTS = ['status', 'temp', 'desc', 'wind', 'logo'];
  var DEFAULT_PARTS = PARTS.join(',');

  var TEXTS = {
    en: {
      rainingNow: 'Raining now',
      rainExpected: 'Rain expected',
      rainExpectedAt: 'rain expected at',
      dry: 'Dry for now',
      range: 'to',
      unit: 'mm/h',
    },
    nl: {
      rainingNow: 'Het regent nu',
      rainExpected: 'Regen verwacht',
      rainExpectedAt: 'regen verwacht om',
      dry: 'Voorlopig droog',
      range: 'tot',
      unit: 'mm/u',
    },
  };

  var COMPASS = {
    nl: ['N', 'NO', 'O', 'ZO', 'Z', 'ZW', 'W', 'NW'],
    en: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
  };

  // WMO weather code -> description, like the plugin.
  var WMO = {
    nl: {
      0: 'Onbewolkt',
      1: 'Hoofdzakelijk helder',
      2: 'Gedeeltelijk bewolkt',
      3: 'Bewolkt',
      45: 'Mist',
      48: 'IJsmist',
      51: 'Motregen',
      53: 'Motregen',
      55: 'Motregen',
      56: 'IJzel',
      57: 'IJzel',
      61: 'Lichte regen',
      63: 'Regen',
      65: 'Zware regen',
      66: 'IJzel',
      67: 'IJzel',
      71: 'Lichte sneeuw',
      73: 'Sneeuw',
      75: 'Zware sneeuw',
      77: 'Sneeuwkorrels',
      80: 'Lichte bui',
      81: 'Bui',
      82: 'Zware bui',
      85: 'Lichte sneeuwbui',
      86: 'Zware sneeuwbui',
      95: 'Onweer',
      96: 'Onweer met hagel',
      99: 'Onweer met zware hagel',
    },
    en: {
      0: 'Clear',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Cloudy',
      45: 'Fog',
      48: 'Rime fog',
      51: 'Drizzle',
      53: 'Drizzle',
      55: 'Drizzle',
      56: 'Freezing drizzle',
      57: 'Freezing drizzle',
      61: 'Light rain',
      63: 'Rain',
      65: 'Heavy rain',
      66: 'Freezing rain',
      67: 'Freezing rain',
      71: 'Light snow',
      73: 'Snow',
      75: 'Heavy snow',
      77: 'Snow grains',
      80: 'Light showers',
      81: 'Showers',
      82: 'Heavy showers',
      85: 'Light snow showers',
      86: 'Heavy snow showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail',
    },
  };

  // The plugin's icons: plain Unicode with U+FE0F (full colour emoji), in the
  // colour of the plugin.
  var SHAPES = {
    sun: '☀️',
    moon: '🌙️',
    cloud: '☁️',
    sun_cloud: '⛅️',
    moon_cloud: '🌙️☁️',
    fog: '🌫️',
    rain_cloud: '🌧️',
    snow: '❄️',
    lightning: '⚡️',
  };
  var WMO_ICONS = {
    0: ['sun', '#FFC107'],
    1: ['sun_cloud', '#FFC107'],
    2: ['sun_cloud', '#FFC107'],
    3: ['cloud', '#D3D3D3'],
    45: ['fog', '#B0B0B0'],
    48: ['fog', '#B0B0B0'],
    51: ['rain_cloud', '#4FC3F7'],
    53: ['rain_cloud', '#4FC3F7'],
    55: ['rain_cloud', '#4FC3F7'],
    56: ['rain_cloud', '#7FB3D5'],
    57: ['rain_cloud', '#7FB3D5'],
    61: ['rain_cloud', '#4FC3F7'],
    63: ['rain_cloud', '#3B82C4'],
    65: ['rain_cloud', '#3B82C4'],
    66: ['rain_cloud', '#7FB3D5'],
    67: ['rain_cloud', '#7FB3D5'],
    71: ['snow', '#E0F7FA'],
    73: ['snow', '#E0F7FA'],
    75: ['snow', '#E0F7FA'],
    77: ['snow', '#E0F7FA'],
    80: ['rain_cloud', '#5DADE2'],
    81: ['rain_cloud', '#5DADE2'],
    82: ['rain_cloud', '#3B82C4'],
    85: ['snow', '#E0F7FA'],
    86: ['snow', '#E0F7FA'],
    95: ['lightning', '#FFC107'],
    96: ['lightning', '#FFC107'],
    99: ['lightning', '#FFC107'],
  };
  // The codes whose icon differs after dark.
  var WMO_ICONS_NIGHT = {
    0: ['moon', '#4A6FA5'],
    1: ['moon_cloud', '#4A6FA5'],
    2: ['moon_cloud', '#4A6FA5'],
  };
  var DEFAULT_ICON = ['cloud', '#D3D3D3'];

  // The animated icons: inline SVG (64x64) animated by css/creative.css
  // (.weatherinfo-svg), no images or libraries. Keyed like SHAPES.
  var CLOUD =
    '<path class="wi-drift" fill="#E3E9F0" d="M20 48h27a10.5 10.5 0 0 0 1.6-20.9A14.5 14.5 0 0 0 21 30.5 8.8 8.8 0 0 0 20 48z"/>';
  var DARK_CLOUD =
    '<path class="wi-drift" fill="#9AA5B1" d="M20 40h27a10.5 10.5 0 0 0 1.6-20.9A14.5 14.5 0 0 0 21 22.5 8.8 8.8 0 0 0 20 40z"/>';
  var SUN =
    '<g class="wi-spin"><g stroke="#FFB300" stroke-width="3" stroke-linecap="round">' +
    '<path d="M32 6v7M32 51v7M6 32h7M51 32h7M13.6 13.6l5 5M45.4 45.4l5 5M13.6 50.4l5-5M45.4 18.6l5-5"/>' +
    '</g></g><circle cx="32" cy="32" r="12" fill="#FFC107"/>';
  var MOON =
    '<path class="wi-glow" fill="#FFE082" d="M40 10a22 22 0 1 0 14 38A18 18 0 0 1 40 10z"/>' +
    '<circle class="wi-twinkle" cx="50" cy="16" r="1.8" fill="#FFF8E1"/>' +
    '<circle class="wi-twinkle wi-d2" cx="56" cy="28" r="1.3" fill="#FFF8E1"/>';
  var DROPS =
    '<g stroke="#4FC3F7" stroke-width="3" stroke-linecap="round">' +
    '<path class="wi-fall" d="M25 52l-2 5"/><path class="wi-fall wi-d2" d="M34 52l-2 5"/>' +
    '<path class="wi-fall wi-d3" d="M43 52l-2 5"/></g>';
  var FLAKES =
    '<g fill="#E0F7FA"><circle class="wi-snowfall" cx="25" cy="54" r="2.2"/>' +
    '<circle class="wi-snowfall wi-d2" cx="34" cy="54" r="2.2"/>' +
    '<circle class="wi-snowfall wi-d3" cx="43" cy="54" r="2.2"/></g>';
  var BOLT =
    '<path class="wi-flash" fill="#FFC107" d="M35 38l-9 13h7l-3 10 12-15h-7l4-8z"/>';
  var FOG =
    '<g stroke="#B0BEC5" stroke-width="4" stroke-linecap="round">' +
    '<path class="wi-slide" d="M14 24h36"/><path class="wi-slide wi-d2" d="M10 34h40"/>' +
    '<path class="wi-slide wi-d3" d="M16 44h34"/></g>';
  var SVG_ICONS = {
    sun: SUN,
    moon: MOON,
    cloud: CLOUD,
    sun_cloud:
      '<svg x="0" y="-4" width="42" height="42" viewBox="0 0 64 64">' +
      SUN +
      '</svg>' +
      CLOUD,
    moon_cloud:
      '<svg x="0" y="-4" width="42" height="42" viewBox="0 0 64 64">' +
      MOON +
      '</svg>' +
      CLOUD,
    fog: FOG,
    rain_cloud: CLOUD + DROPS,
    snow: CLOUD + FLAKES,
    lightning: DARK_CLOUD + BOLT,
  };
  var BEAUFORT = [1, 6, 12, 20, 29, 39, 50, 62, 75, 89, 103, 118];

  return {
    name: 'weatherinfo',
    canHandle: function (block) {
      return !!(block && block.wimode === 'forecast');
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-cloud-sun-rain',
      refresh: 60,
      containerClass: 'weatherinfo-block dt-widget-rows',
    },
    // Mounting calls refresh() itself when block.refresh is set.
    run: function (me) {
      if (!me.block.refresh) refresh(me);
    },
    refresh: refresh,
    // Exposed for the tests.
    parseRain: parseRain,
    rainStatus: rainStatus,
    rawToMm: rawToMm,
    beaufort: beaufort,
    compass: compass,
    weatherIcon: weatherIcon,
    partsList: partsList,
    partsHtml: partsHtml,
    render: render,
    parseCoordinate: parseCoordinate,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function lang(block) {
    return block.wilanguage === 'en' ? 'en' : 'nl';
  }

  // block.wiparts -> the known parts, each once, in the order of the block.
  function partsList(block) {
    var parts = String(
      block && typeof block.wiparts === 'string' ? block.wiparts : DEFAULT_PARTS
    )
      .split(',')
      .map(function (part) {
        return part.trim();
      })
      .filter(function (part, index, list) {
        return PARTS.indexOf(part) > -1 && list.indexOf(part) === index;
      });
    return parts.length ? parts : PARTS.slice();
  }

  // One decimal, with a comma in Dutch.
  function fmt(value, language) {
    var text = value.toFixed(1);
    return language === 'nl' ? text.replace('.', ',') : text;
  }

  // Raw Buienradar value (0-255) -> mm/h.
  function rawToMm(raw) {
    return raw === 0 ? 0 : Math.pow(10, (raw - 109) / 32);
  }

  function beaufort(kmh) {
    for (var bft = 0; bft < BEAUFORT.length; bft++) {
      if (kmh < BEAUFORT[bft]) return bft;
    }
    return 12;
  }

  function compass(degrees, language) {
    var dirs = COMPASS[language] || COMPASS.nl;
    return dirs[((Math.floor((degrees + 22.5) / 45) % 8) + 8) % 8];
  }

  // A latitude or longitude from the block ("52,37" is accepted) -> number,
  // or null when it is empty or not a number.
  function parseCoordinate(value) {
    var text = String(value === undefined || value === null ? '' : value)
      .trim()
      .replace(',', '.');
    var number = parseFloat(text);
    return text !== '' && isFinite(text) && !isNaN(number) ? number : null;
  }

  // The location of the block, else the one of Domoticz: {lat, lon} or null.
  function location(block) {
    var lat = parseCoordinate(block.wilat);
    var lon = parseCoordinate(block.wilon);
    if (lat === null || lon === null) {
      var domoticz = {};
      try {
        domoticz = (Domoticz.getAllDevices()['_settings'] || {}).Location || {};
      } catch (e) {
        domoticz = {};
      }
      if (lat === null) lat = parseCoordinate(domoticz.Latitude);
      if (lon === null) lon = parseCoordinate(domoticz.Longitude);
    }
    return lat === null || lon === null ? null : { lat: lat, lon: lon };
  }

  // [[raw, 'HH:MM'], ...] -> the numbers of the plugin's parse_buienradar().
  function parseRain(rows) {
    var result = {
      maxNowRaw: 0,
      maxSoonRaw: 0,
      maxRaw: 0,
      firstRainAt: '',
    };
    (rows || []).forEach(function (row, counter) {
      var raw = parseInt(row[0], 10);
      if (isNaN(raw)) return;
      if (counter <= 1 && raw > result.maxNowRaw) result.maxNowRaw = raw;
      if (counter <= 3 && raw > result.maxSoonRaw) result.maxSoonRaw = raw;
      if (result.firstRainAt === '' && raw > 0)
        result.firstRainAt = row[1] || '';
      if (raw > result.maxRaw) result.maxRaw = raw;
    });
    result.mmNow = rawToMm(result.maxNowRaw);
    result.mmSoon = rawToMm(result.maxSoonRaw);
    result.mmMax = rawToMm(result.maxRaw);
    return result;
  }

  function hl(text) {
    return '<span class="weatherinfo-hl">' + esc(text) + '</span>';
  }

  // "Raining now 0.8 mm/h", "Rain expected 1.2 to 2.4 mm/h", "Rain expected at
  // 14:35: 2.4 mm/h" or "Dry for now", as html.
  function rainStatus(parsed, language) {
    var texts = TEXTS[language] || TEXTS.nl;
    function amount(prefix, now, max) {
      return (
        esc(prefix) +
        ' ' +
        (max !== null && max > now
          ? hl(fmt(now, language)) +
            ' ' +
            esc(texts.range) +
            ' ' +
            hl(fmt(max, language) + ' ' + texts.unit)
          : hl(fmt(now, language) + ' ' + texts.unit))
      );
    }
    if (parsed.maxNowRaw > 0) {
      return amount(texts.rainingNow, parsed.mmNow, parsed.mmMax);
    }
    if (parsed.maxSoonRaw > 0) {
      return amount(texts.rainExpected, parsed.mmSoon, parsed.mmMax);
    }
    if (parsed.firstRainAt) {
      return (
        hl(fmt(parsed.mmMax, language) + ' ' + texts.unit) +
        ' ' +
        esc(texts.rainExpectedAt) +
        ' ' +
        hl(parsed.firstRainAt)
      );
    }
    return esc(texts.dry);
  }

  // The icon of the plugin: the WMO code decides, day or night; [shape, colour].
  function weatherIcon(weather) {
    var code = weather.weatherCode;
    var icon;
    if (typeof code === 'number') {
      if (weather.isDay === false) icon = WMO_ICONS_NIGHT[code];
      icon = icon || WMO_ICONS[code];
    }
    return icon || DEFAULT_ICON;
  }

  function description(weather, language) {
    return (WMO[language] || WMO.nl)[weather.weatherCode] || '';
  }

  // Direction and force: "NW4"; empty when one of the two is unknown.
  function windText(weather, language) {
    if (
      typeof weather.windSpeed !== 'number' ||
      typeof weather.windDirection !== 'number'
    ) {
      return '';
    }
    return (
      compass(weather.windDirection, language) + beaufort(weather.windSpeed)
    );
  }

  // The html of one part of the text, or '' when there is nothing to show.
  function partHtml(part, res, block) {
    var language = lang(block);
    var weather = res.weather;
    if (part === 'status') {
      return res.rain ? rainStatus(parseRain(res.rain), language) : '';
    }
    if (!weather) return '';
    if (part === 'temp') {
      return typeof weather.temperature === 'number'
        ? esc(fmt(weather.temperature, language) + '°C')
        : '';
    }
    if (part === 'desc') return esc(description(weather, language));
    if (part === 'wind') return esc(windText(weather, language));
    if (part === 'logo') {
      var icon = weatherIcon(weather);
      if (block.wiicons !== 'emoji') {
        return (
          '<svg class="weatherinfo-svg" viewBox="0 0 64 64" role="img" aria-label="' +
          esc(description(weather, language)) +
          '"><title>' +
          esc(description(weather, language)) +
          '</title>' +
          SVG_ICONS[icon[0]] +
          '</svg>'
        );
      }
      return (
        '<span class="weatherinfo-icon" title="' +
        esc(description(weather, language)) +
        '" style="color:' +
        icon[1] +
        '">' +
        SHAPES[icon[0]] +
        '</span>'
      );
    }
    return '';
  }

  // The text: all parts after each other on one row, in the order of the
  // block.
  function partsHtml(res, block) {
    var texts = partsList(block)
      .map(function (part) {
        return partHtml(part, res, block);
      })
      .filter(Boolean);
    return texts.length
      ? '<div class="weatherinfo-row weatherinfo-weather">' +
          texts.join('<span class="weatherinfo-dot"> ● </span>') +
          '</div>'
      : '';
  }

  function render(me, res) {
    var block = me.block;
    var language = lang(block);
    var html = partsHtml(res, block);
    if (res.rain && showRainfall(block)) {
      var texts = TEXTS[language];
      html +=
        '<div class="weatherinfo-row weatherinfo-rainfall"><span class="weatherinfo-label">' +
        esc(DT_function.t('weatherinfo_rainfall', 'Rainfall')) +
        '</span><span class="weatherinfo-value">' +
        esc(fmt(parseRain(res.rain).mmNow, language) + ' ' + texts.unit) +
        '</span></div>';
    }
    if (res.errors && res.errors.length) {
      html +=
        '<div class="weatherinfo-row weatherinfo-error">' +
        esc(res.errors.join(' ')) +
        '</div>';
    }
    me.$mountPoint
      .find('.dt_state')
      .html('<div class="weatherinfo-rows">' + html + '</div>');
  }

  function showRainfall(block) {
    return (
      block.wishowrainfall === true ||
      block.wishowrainfall === 1 ||
      String(block.wishowrainfall).toLowerCase() === 'true'
    );
  }

  function showError(me, text) {
    me.$mountPoint
      .find('.dt_state')
      .html(
        '<div class="weatherinfo-rows"><div class="weatherinfo-row weatherinfo-error">' +
          esc(text) +
          '</div></div>'
      );
  }

  function refresh(me) {
    var block = me.block;
    // Set on every refresh; empty removes the override.
    var fontSize = parseInt(block.wifontsize, 10);
    me.$mountPoint.css(
      '--font-device-title',
      fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : ''
    );
    var where = location(block);
    if (!where) {
      showError(
        me,
        DT_function.t(
          'weatherinfo_nolocation',
          'No location found. Enter the latitude and longitude in the widget settings.'
        )
      );
      return;
    }
    DT_function.bridge('weatherinfo/index.php', {
      lat: where.lat,
      lon: where.lon,
      pollMinutes: DT_function.clampNumber(block.wipollminutes, 5, 1, 60, true),
    }).then(
      function (res) {
        render(me, res || {});
      },
      function (jqXHR) {
        showError(
          me,
          DT_function.bridgeError(
            jqXHR,
            DT_function.t('weatherinfo_error', 'Unable to fetch the weather.')
          )
        );
      }
    );
  }
})();

Dashticz.register(DT_weatherinfo);
