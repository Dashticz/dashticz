/* global settings columns columns_standby blocks screens standby_screen language DashticzScreenSwitcher standbyActive */
// eslint-disable-next-line no-unused-vars
var DashticzWidgetEditor = (function () {
  'use strict';

  var catalog = [
    {
      id: 'weather',
      blockKey: 'widget_weather',
      title: 'Weather',
      description: 'Weather forecast via OpenWeather or Weather Underground.',
      icon: 'fas fa-cloud-sun',
      width: 4,
      height: 120,
    },
    {
      id: 'garbage',
      blockKey: 'widget_garbage',
      title: 'Garbage',
      description: 'Upcoming waste collections.',
      icon: 'fas fa-trash-alt',
      width: 5,
      height: 160,
    },
    {
      id: 'spotify',
      blockKey: 'widget_spotify',
      title: 'Spotify',
      description: 'Spotify Connect remote control.',
      icon: 'fab fa-spotify',
      width: 4,
      height: 120,
    },
    {
      id: 'sonarr',
      blockKey: 'widget_sonarr',
      title: 'Sonarr',
      description: 'Upcoming episodes from Sonarr.',
      icon: 'fas fa-tv',
      width: 4,
      height: 120,
    },
    {
      id: 'clock',
      blockKey: 'widget_clock',
      title: 'Clock',
      description: 'Large clock with date and weekday.',
      icon: 'far fa-clock',
      width: 4,
    },
    {
      id: 'calendar',
      blockKey: 'widget_calendar',
      title: 'Calendar (ICS)',
      description: 'Events from an online ICS calendar.',
      icon: 'fas fa-calendar-alt',
      width: 4,
      height: 120,
    },
    {
      id: 'secpanel',
      blockKey: 'widget_secpanel',
      title: 'Security panel',
      description: 'Domoticz security panel with PIN code.',
      icon: 'fas fa-shield-alt',
      width: 12,
    },
    {
      id: 'publictransport',
      blockKey: 'widget_publictransport',
      title: 'Public transport',
      description: 'Departure times for trains, buses or trams.',
      icon: 'fas fa-train',
      width: 4,
      height: 260,
    },
    {
      id: 'trafficinfo',
      blockKey: 'widget_trafficinfo',
      title: 'Traffic information',
      description: 'ANWB traffic jams, roadworks and speed cameras.',
      icon: 'fas fa-car',
      width: 4,
      height: 260,
    },
    {
      id: 'alarmmeldingen',
      blockKey: 'widget_alarmmeldingen',
      title: '112',
      description: 'Dutch emergency alerts from alarmeringen.nl.',
      icon: 'fas fa-bullhorn',
      width: 4,
      height: 160,
    },
    {
      id: 'camera',
      blockKey: 'widget_cameras',
      title: 'Cameras',
      description: 'Camera image or MJPEG stream.',
      icon: 'fas fa-video',
      width: 4,
      height: 320,
    },
    {
      id: 'map',
      blockKey: 'widget_map',
      title: 'Google Maps',
      description: 'Map with optional traffic and directions.',
      icon: 'fas fa-map-marked-alt',
      width: 4,
      height: 500,
    },
    {
      id: 'longfonds',
      blockKey: 'widget_longfonds',
      title: 'Air quality',
      description: 'Longfonds / RIVM air quality by postcode.',
      icon: 'fas fa-wind',
      width: 4,
      height: 120,
    },
    {
      id: 'moon',
      blockKey: 'widget_moon',
      title: 'Moon',
      description: 'Current moon phase.',
      icon: 'fas fa-moon',
      width: 3,
    },
    {
      id: 'news',
      blockKey: 'widget_news',
      title: 'News',
      description: 'RSS news feed with automatic scrolling.',
      icon: 'fas fa-newspaper',
      width: 4,
      height: 240,
    },
    // iframe widget: embeds any external URL in an inline frame
    {
      id: 'iframe',
      blockKey: 'widget_iframe',
      title: 'iFrame',
      description: 'Embed any website or local URL in a frame.',
      icon: 'fas fa-window-maximize',
      width: 6,
      height: 400,
    },
    {
      id: 'xmltvguide',
      blockKey: 'widget_xmltvguide',
      title: 'XMLTV TV Guide',
      description: 'TV programme guide from an XMLTV-format URL.',
      icon: 'fas fa-tv',
      width: 6,
      height: 300,
    },
  ];

  function _widgetEditorLanguage() {
    return (
      (typeof language !== 'undefined' &&
        language.settings &&
        language.settings.widgeteditor) ||
      {}
    );
  }

  function _t(key, fallback) {
    return _widgetEditorLanguage()[key] || fallback;
  }

  function _widgetTitle(item) {
    return _t(item.id + '_title', item.title);
  }

  function _widgetDescription(item) {
    return _t(item.id + '_description', item.description);
  }

  function _calendarLanguages() {
    var localize =
      (typeof language !== 'undefined' &&
        language.settings &&
        language.settings.localize) ||
      {};
    return {
      zh_CN: localize.cn || 'Chinese',
      da_DK: localize.da || 'Danish',
      de_DE: localize.de || 'German',
      en_US: localize.en || 'English',
      es_ES: localize.es || 'Spanish',
      fi_FI: localize.fi || 'Finnish',
      fr_FR: localize.fr || 'French',
      hu_HU: localize.hu || 'Hungarian',
      it_IT: localize.it || 'Italian',
      ja_JP: localize.ja || 'Japanese',
      lt_LT: localize.lt || 'Lithuanian',
      nl_NL: localize.nl || 'Dutch',
      nb_NO: localize.no || 'Norwegian',
      pl_PL: localize.pl || 'Polish',
      pt_PT: localize.pt || 'Portuguese',
      ro_RO: localize.ro || 'Romanian',
      ru_RU: localize.ru || 'Russian',
      sk_SK: localize.sk || 'Slovak',
      sl_SL: localize.sl || 'Slovenian',
      sv_SE: localize.sv || 'Swedish',
      uk_UA: localize.uk || 'Ukrainian',
    };
  }

  var _GARBAGE_COMPANIES = {
    afvalinfo: '99% coverage in NL',
    afvalalert: 'Afval Alert (NL)',
    afvalstoffendienst: 'Afvalstoffendienst: Hertogenbosch, Vlijmen, ... (NL)',
    almere: 'Almere',
    alphenaandenrijn: 'Alphen aan de Rijn (NL)',
    area: 'Area',
    avalex: 'Avalex (NL)',
    avri: 'Rivierenland (Zaltbommel, ...)(NL)',
    barafvalbeheer: 'Bar-afvalbeheer (Barendrecht, Rhoon)(NL)',
    best: 'Best (NL)',
    blink: 'Blink: Asten, Deurne, Gemert-Bakel, Heeze-Leende, Helmond, Laarbeek, Nuenen, Someren (NL)',
    circulusberkel: 'Circulus Berkel (NL)',
    cure: 'Cure: Eindhoven, Geldrop-Mierlo, Valkenswaard (NL)',
    cyclusnv: 'Cyclus NV: Bodegraven-Reeuwijk, Gouda, Kaag en Braassem, Krimpen aan den IJssel, Krimpenerwaard, Montfoort, Nieuwkoop, Waddinxveen en Zuidplas (NL)',
    dar: 'Dar: Berg en Dal, Beuningen, Druten, Heumen, Nijmegen, Wijchen (NL)',
    deafvalapp: 'Afval App (NL)',
    edg: 'EDG (DE)',
    gad: 'Grondstoffen- en Afvalstoffendienst regio Gooi en Vechtstreek (NL)',
    gemeenteberkelland: 'Berkelland: Borculo, Eibergen, Neede en Ruurlo (NL)',
    goes: 'Goes (NL)',
    googlecalendar: 'Google Calender',
    groningen: 'Groningen (NL)',
    hvc: 'HVC Groep (NL)',
    ical: 'iCal',
    katwijk: 'Katwijk (NL)',
    maashorst: 'Maashorst (NL)',
    meerlanden: 'Meerlanden (NL)',
    mijnafvalwijzer: 'Mijn Afval Wijzer (NL)',
    omrin: 'Omrin (NL)',
    purmerend: 'Purmerend',
    rd4: 'Rd4',
    recycleapp: 'RecycleApp (BE)',
    rmn: 'RMN (NL)',
    rova: 'Rova (NL)',
    sudwestfryslan: 'Sudwest Fryslan (NL)',
    suez: 'Suez: Arnhem (NL)',
    twentemilieu: 'Twente Milieu (NL)',
    uden: 'Uden (NL)',
    veldhoven: 'Veldhoven (NL)',
    venlo: 'Venlo (NL)',
    venray: 'Venray (NL)',
    vianen: 'Vianen (NL)',
    waalre: 'Waalre (NL)',
    waardlanden: 'Waardlanden: Gorinchem, Hardinxveld-Giessendam, Molenlanden en Vijfheerenlanden (NL)',
  };

  var selectedWidgets = {};
  var widgetDimensions = {};
  var layoutOrder = [];
  var widgetConfigs = {};
  var gridMode = false;
  var gridConfig = null;
  var gridPositions = {};
  var widgetBlockRefs = {};

  function _defaultCameraConfig(index) {
    return {
      title: _t('camera', 'Camera') + ' ' + (index + 1),
      imageUrl: '',
      videoUrl: '',
    };
  }

  function _defaultCameraConfigs() {
    return [_defaultCameraConfig(0)];
  }

  function _cameraWidgetConfig() {
    if (!widgetConfigs.camera) {
      widgetConfigs.camera = { cameras: _defaultCameraConfigs() };
    } else if (
      !Array.isArray(widgetConfigs.camera.cameras) ||
      !widgetConfigs.camera.cameras.length
    ) {
      widgetConfigs.camera.cameras = _defaultCameraConfigs();
    }
    return widgetConfigs.camera;
  }

  function open() {
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _readConfiguredWidgets();
    _buildAndShowModal();
  }

  function _readConfiguredWidgets() {
    selectedWidgets = {};
    widgetDimensions = {};
    layoutOrder = [];
    gridPositions = {};
    widgetBlockRefs = {};
    gridConfig = gridMode ? _readGridConfig() : null;
    function _n(key, def) {
      return typeof settings[key] !== 'undefined' ? Number(settings[key]) : (def !== undefined ? def : 0);
    }
    function _s(key, def) {
      return typeof settings[key] !== 'undefined' && settings[key] !== null
        ? String(settings[key])
        : (def !== undefined ? def : '');
    }

    widgetConfigs = {
      weather: {
        provider:
          settings['owm_api'] || !settings['wu_api']
            ? 'openweather'
            : 'wunderground',
        owm_api: _s('owm_api'),
        owm_city: _s('owm_city'),
        owm_name: _s('owm_name'),
        owm_country: _s('owm_country'),
        owm_lang: _s('owm_lang'),
        owm_days: _n('owm_days'),
        owm_cnt: _s('owm_cnt', '4'),
        owm_min: _n('owm_min', 1),
        weather_show_rain: _n('weather_show_rain', 1),
        weather_show_description: _n('weather_show_description', 1),
        weather_show_wind: _n('weather_show_wind', 0),
        weather_show_gust: _n('weather_show_gust', 0),
        weather_icons: _s('weather_icons', 'line'),
        wu_api: _s('wu_api'),
        wu_city: _s('wu_city', 'Amsterdam'),
        wu_name: _s('wu_name'),
        wu_country: _s('wu_country', 'NL'),
        use_fahrenheit: _n('use_fahrenheit'),
        use_beaufort: _n('use_beaufort'),
        translate_windspeed: _n('translate_windspeed', 1),
      },
      clock: {
        clockType: 'basicclock',
        boss_stationclock: _s('boss_stationclock', 'RedBoss'),
        hide_seconds: _n('hide_seconds'),
        hide_seconds_stationclock: _n('hide_seconds_stationclock'),
        size: '',
        scale: '',
        showSeconds: 1,
        clockFace: '24',
        body: 'RoundBody',
        dial: 'GermanStrokeDial',
        hourhand: 'PointedHourHand',
        minutehand: 'PointedMinuteHand',
        secondhand: 'HoleShapedSecondHand',
        boss: 'RedBoss',
        minutehandbehavior: 'BouncingMinuteHand',
        secondhandbehavior: 'OverhastySecondHand',
      },
      garbage: {
        garbage_company: _s('garbage_company', 'afvalinfo'),
        garbage_icalurl: _s('garbage_icalurl'),
        google_api_key: _s('google_api_key'),
        garbage_calendar_id: _s('garbage_calendar_id'),
        garbage_zipcode: _s('garbage_zipcode'),
        garbage_street: _s('garbage_street'),
        garbage_housenumber: _s('garbage_housenumber'),
        garbage_housenumberadd: _s('garbage_housenumberadd'),
        garbage_maxitems: _s('garbage_maxitems', '4'),
        garbage_maxdays: _s('garbage_maxdays', '32'),
        garbage_width: _s('garbage_width'),
        garbage_hideicon: _n('garbage_hideicon'),
        garbage_icon_use_colors: _n('garbage_icon_use_colors', 1),
        garbage_use_colors: _n('garbage_use_colors', 1),
        garbage_use_names: _n('garbage_use_names', 1),
        garbage_use_cors_prefix: _n('garbage_use_cors_prefix', 1),
      },
      sonarr: {
        sonarr_url: _s('sonarr_url'),
        sonarr_apikey: _s('sonarr_apikey'),
        sonarr_maxitems: _s('sonarr_maxitems'),
      },
      spotify: {
        spot_clientid: _s('spot_clientid'),
      },
      calendar: {
        icalurl: '',
        calendarformat: _s('calendarformat', 'dd DD.MM HH:mm'),
        calendarlanguage: _s('calendarlanguage', 'en_US'),
        calendar_maxitems: _s('calendar_maxitems', '15'),
      },
      publictransport: {
        provider: 'treinen',
        station: 'UT',
      },
      secpanel: {
        security_button_icons: _n('security_button_icons'),
        security_panel_lock: _n('security_panel_lock'),
      },
      alarmmeldingen: {
        rss: 'https://www.alarmeringen.nl/feeds/all.rss',
        filter: '',
      },
      camera: {
        cameras: _defaultCameraConfigs(),
      },
      trafficinfo: {
        anwb_apikey: _s('anwb_apikey'),
      },
      map: {
        gm_api: _s('gm_api'),
        gm_zoomlevel: _s('gm_zoomlevel'),
        gm_latitude: _s('gm_latitude'),
        gm_longitude: _s('gm_longitude'),
      },
      longfonds: {
        longfonds_zipcode: _s('longfonds_zipcode'),
        longfonds_housenumber: _s('longfonds_housenumber'),
      },
      moon: {
        idx_moonpicture: _s('idx_moonpicture'),
      },
      news: {
        default_news_url: _s('default_news_url', 'https://www.nu.nl/rss/Algemeen'),
        news_scroll_after: _s('news_scroll_after', '7'),
      },
      // iframe widget block properties (block-specific, not global config settings)
      iframe: {
        frameurl: '',
        height: '',
        scrollbars: 1,
        scaletofit: '300',
        aspectratio: '0.9',
        forcerefresh: 0,
        refresh: '300',
      },
      // xmltvguide widget settings (saved in global config, but block overrides remain supported)
      xmltvguide: {
        xmltvurl: _s('xmltv_url'),
        channels: _s('xmltv_channels'),
        maxitems: _s('xmltv_maxitems', '10'),
        layout: _s('xmltv_layout', '0'),
        separator: _s('xmltv_separator', '-'),
        refresh: _s('xmltv_refresh', '3600'),
      },
    };

    if (gridMode) {
      _readGridConfiguredWidgets();
      _cameraWidgetConfig();
      return;
    }
    if (typeof columns === 'undefined') return;

    _readManagedLayoutOrder();

    _orderedColumnKeys().forEach(function (columnKey) {
      var column = columns[columnKey];
      if (!column || !Array.isArray(column.blocks)) return;

      column.blocks.forEach(function (reference) {
        if (typeof reference !== 'string') return;
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : {};
        var item = _catalogItemForDefinition(reference, definition);
        if (!item) return;

        selectedWidgets[item.id] = true;
        // Keep an existing custom reference, while new widgets use the stable
        // catalog reference before the blocks/layout save chain starts.
        widgetBlockRefs[item.id] = reference;
        widgetDimensions[item.id] = {
          width: parseInt(definition.width, 10) || null,
          height: parseInt(definition.height, 10) || null,
        };
        if (
          item.id === 'weather' &&
          definition.widget_provider === 'wunderground'
        ) {
          widgetConfigs.weather.provider = 'wunderground';
        }
        if (item.id === 'weather') {
          if (typeof definition.showRain !== 'undefined') {
            widgetConfigs.weather.weather_show_rain = Number(definition.showRain) ? 1 : 0;
          }
          if (typeof definition.showDescription !== 'undefined') {
            widgetConfigs.weather.weather_show_description = Number(definition.showDescription) ? 1 : 0;
          }
          if (typeof definition.showWind !== 'undefined') {
            widgetConfigs.weather.weather_show_wind = Number(definition.showWind) ? 1 : 0;
          }
          if (typeof definition.showGust !== 'undefined') {
            widgetConfigs.weather.weather_show_gust = Number(definition.showGust) ? 1 : 0;
          }
          if (typeof definition.icons === 'string') {
            widgetConfigs.weather.weather_icons = definition.icons;
          }
        }
        if (
          item.id === 'calendar' &&
          typeof definition.icalurl === 'string'
        ) {
          widgetConfigs.calendar.icalurl = definition.icalurl;
        }
        if (item.id === 'calendar' && typeof definition.maxitems !== 'undefined') {
          widgetConfigs.calendar.calendar_maxitems = String(definition.maxitems);
        }
        if (item.id === 'garbage') {
          if (typeof definition.maxitems !== 'undefined') {
            widgetConfigs.garbage.garbage_maxitems = String(definition.maxitems);
          }
          if (typeof definition.maxdays !== 'undefined') {
            widgetConfigs.garbage.garbage_maxdays = String(definition.maxdays);
          }
        }
        if (
          item.id === 'clock' &&
          /^(basicclock|stationclock|flipclock|haymanclock|miniclock)$/.test(
            definition.type
          )
        ) {
          widgetConfigs.clock.clockType = definition.type;
          if (typeof definition.size !== 'undefined' && definition.size !== null && definition.size !== '') {
            widgetConfigs.clock.size = definition.size;
          }
          if (typeof definition.scale !== 'undefined' && definition.scale !== null && definition.scale !== '') {
            widgetConfigs.clock.scale = definition.scale;
          }
          if (typeof definition.showSeconds !== 'undefined') {
            widgetConfigs.clock.showSeconds = Number(definition.showSeconds) ? 1 : 0;
          }
          if (typeof definition.clockFace !== 'undefined' && definition.clockFace !== null) {
            widgetConfigs.clock.clockFace = String(definition.clockFace);
          }
          var stationMaps = {
            body: ['NoBody', 'SmallWhiteBody', 'RoundBody', 'RoundGreenBody', 'SquareBody', 'ViennaBody'],
            dial: ['NoDial', 'GermanHourStrokeDial', 'GermanStrokeDial', 'AustriaStrokeDial', 'SwissStrokeDial', 'ViennaStrokeDial'],
            hourhand: [null, 'PointedHourHand', 'BarHourHand', 'SwissHourHand', 'ViennaHourHand'],
            minutehand: [null, 'PointedMinuteHand', 'BarMinuteHand', 'SwissMinuteHand', 'ViennaMinuteHand'],
            secondhand: ['NoSecondHand', 'BarSecondHand', 'HoleShapedSecondHand', 'NewHoleShapedSecondHand', 'SwissSecondHand'],
            boss: ['NoBoss', 'BlackBoss', 'RedBoss', 'ViennaBoss'],
            minutehandbehavior: ['CreepingMinuteHand', 'BouncingMinuteHand', 'ElasticBouncingMinuteHand'],
            secondhandbehavior: ['CreepingSecondHand', 'BouncingSecondHand', 'ElasticBouncingSecondHand', 'OverhastySecondHand'],
          };
          Object.keys(stationMaps).forEach(function (prop) {
            if (typeof definition[prop] === 'undefined' || definition[prop] === null || definition[prop] === '') {
              return;
            }
            var val = definition[prop];
            if (typeof val === 'number' || (/^\d+$/).test(String(val))) {
              var named = stationMaps[prop][Number(val)];
              if (named) {
                widgetConfigs.clock[prop] = named;
                return;
              }
            }
            widgetConfigs.clock[prop] = val;
          });
        }
        if (item.id === 'publictransport') {
          if (typeof definition.station === 'string') {
            widgetConfigs.publictransport.station = definition.station;
          }
          if (typeof definition.provider === 'string') {
            widgetConfigs.publictransport.provider = definition.provider;
          }
        }
        if (item.id === 'camera') {
          if (Array.isArray(definition.cameras) && definition.cameras.length) {
            widgetConfigs.camera.cameras = definition.cameras.map(function (
              camera,
              index
            ) {
              return {
                title:
                  camera && typeof camera.title === 'string'
                    ? camera.title
                    : 'Camera ' + (index + 1),
                imageUrl:
                  camera && typeof camera.imageUrl === 'string'
                    ? camera.imageUrl
                    : '',
                videoUrl:
                  camera && typeof camera.videoUrl === 'string'
                    ? camera.videoUrl
                    : '',
              };
            });
          } else if (typeof definition.imageUrl === 'string') {
            widgetConfigs.camera.cameras = [
              {
                title:
                  typeof definition.title === 'string'
                    ? definition.title
                    : 'Camera',
                imageUrl: definition.imageUrl,
                videoUrl:
                  typeof definition.videoUrl === 'string'
                    ? definition.videoUrl
                    : '',
              },
            ];
          }
        }
        if (item.id === 'alarmmeldingen') {
          if (typeof definition.rss === 'string') {
            widgetConfigs.alarmmeldingen.rss = definition.rss;
          }
          if (typeof definition.filter === 'string') {
            widgetConfigs.alarmmeldingen.filter = definition.filter;
          }
        }
        // Hydrate iframe widget settings from an existing block definition (managed layout)
        if (item.id === 'iframe') {
          if (typeof definition.frameurl === 'string') {
            widgetConfigs.iframe.frameurl = definition.frameurl;
          }
          widgetConfigs.iframe.height =
            typeof definition.height !== 'undefined'
              ? String(definition.height)
              : '';
          if (typeof definition.scrollbars !== 'undefined') {
            widgetConfigs.iframe.scrollbars = definition.scrollbars === false ? 0 : 1;
          }
          widgetConfigs.iframe.scaletofit =
            typeof definition.scaletofit !== 'undefined'
              ? String(definition.scaletofit)
              : '';
          widgetConfigs.iframe.aspectratio =
            typeof definition.aspectratio !== 'undefined'
              ? String(definition.aspectratio)
              : '';
          if (typeof definition.forcerefresh !== 'undefined') {
            widgetConfigs.iframe.forcerefresh = definition.forcerefresh ? 1 : 0;
          }
          if (typeof definition.refresh !== 'undefined') {
            widgetConfigs.iframe.refresh = String(definition.refresh);
          }
        }
        // Hydrate xmltvguide widget settings from an existing block definition (managed layout)
        if (item.id === 'xmltvguide') {
          if (typeof definition.xmltvurl === 'string') {
            widgetConfigs.xmltvguide.xmltvurl = definition.xmltvurl;
          }
          if (Array.isArray(definition.channels)) {
            widgetConfigs.xmltvguide.channels = definition.channels.join(', ');
          } else if (typeof definition.channels === 'string') {
            widgetConfigs.xmltvguide.channels = definition.channels;
          }
          if (typeof definition.maxitems !== 'undefined') {
            widgetConfigs.xmltvguide.maxitems = String(definition.maxitems);
          }
          if (typeof definition.layout !== 'undefined') {
            widgetConfigs.xmltvguide.layout = String(definition.layout);
          }
          if (typeof definition.separator === 'string') {
            widgetConfigs.xmltvguide.separator = definition.separator;
          }
          if (typeof definition.refresh !== 'undefined') {
            widgetConfigs.xmltvguide.refresh = String(definition.refresh);
          }
        }
      });
    });

    _cameraWidgetConfig();
  }

  function _activeScreenTarget() {
    if (
      typeof DashticzScreenSwitcher !== 'undefined' &&
      DashticzScreenSwitcher.getActiveScreenNumber
    ) {
      return DashticzScreenSwitcher.getActiveScreenNumber();
    }
    if (typeof standbyActive !== 'undefined' && standbyActive) {
      return 'standby';
    }
    if ($('.screenstandby:visible').length) return 'standby';
    var $active = $('.dt-container .screen.swiper-slide-active[data-screenindex]');
    if (!$active.length) {
      $active = $('.dt-container .screen[data-screenindex]:visible').first();
    }
    var fromDom = parseInt($active.attr('data-screenindex'), 10);
    return fromDom > 0 ? fromDom : 1;
  }

  function _activeScreenPayload() {
    var target = _activeScreenTarget();
    return target === 'standby' ? 'standby' : parseInt(target, 10) || 1;
  }

  function _activeScreenDom() {
    if (_activeScreenTarget() === 'standby') {
      var $standby = $('.screenstandby:visible');
      if ($standby.length) return $standby;
      return $('.screenstandby').first();
    }
    var num = _activeScreenPayload();
    var $byIndex = $(
      '.dt-container .screen[data-screenindex="' + num + '"]'
    );
    if ($byIndex.length) return $byIndex.first();
    var $active = $('.dt-container .screen.swiper-slide-active');
    if ($active.length) return $active;
    return $('.dt-container .screen:visible').first();
  }

  function _orderedColumnKeys() {
    var result = [];
    var $activeScreen = _activeScreenDom();
    $activeScreen.find('[data-colindex]').each(function () {
      var columnKey = String($(this).attr('data-colindex'));
      if (result.indexOf(columnKey) < 0) result.push(columnKey);
    });

    if (_activeScreenTarget() === 'standby') {
      if (typeof columns_standby !== 'undefined' && columns_standby) {
        Object.keys(columns_standby).forEach(function (columnKey) {
          if (result.indexOf(String(columnKey)) < 0) {
            result.push(String(columnKey));
          }
        });
      }
      return result;
    }

    // Do not fall back to other screens' columns — empty screen stays empty.
    return result;
  }

  function _catalogItemByBlockKey(blockKey) {
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].blockKey === blockKey) return catalog[i];
    }
    return null;
  }

  function _catalogItemForDefinition(reference, definition) {
    var byKey = _catalogItemByBlockKey(reference);
    if (byKey) return byKey;
    // Blocks identified by a frameurl property (no type needed) map to iframe
    if (definition && typeof definition.frameurl === 'string') {
      return catalog.find(function (item) { return item.id === 'iframe'; }) || null;
    }
    // Blocks identified by an xmltvurl property map to xmltvguide
    if (definition && typeof definition.xmltvurl === 'string') {
      return catalog.find(function (item) { return item.id === 'xmltvguide'; }) || null;
    }
    if (
      definition &&
      (typeof definition.station === 'string' || typeof definition.tpc === 'string')
    ) {
      return (
        catalog.find(function (item) {
          return item.id === 'publictransport';
        }) || null
      );
    }
    if (definition && typeof definition.rss === 'string') {
      return (
        catalog.find(function (item) {
          return item.id === 'alarmmeldingen';
        }) || null
      );
    }
    if (
      definition &&
      (Array.isArray(definition.cameras) || typeof definition.imageUrl === 'string')
    ) {
      return (
        catalog.find(function (item) {
          return item.id === 'camera';
        }) || null
      );
    }
    var type = String((definition && definition.type) || '').toLowerCase();
    var typeMap = {
      weather: 'weather',
      wunderground: 'weather',
      garbage: 'garbage',
      spotify: 'spotify',
      sonarr: 'sonarr',
      calendar: 'calendar',
      secpanel: 'secpanel',
      publictransport: 'publictransport',
      trafficinfo: 'trafficinfo',
      alarmmeldingen: 'alarmmeldingen',
      camera: 'camera',
      map: 'map',
      longfonds: 'longfonds',
      moon: 'moon',
      news: 'news',
      basicclock: 'clock',
      stationclock: 'clock',
      flipclock: 'clock',
      haymanclock: 'clock',
      miniclock: 'clock',
      // blocks with frameurl are treated as iframe widgets
      frame: 'iframe',
      xmltvguide: 'xmltvguide',
    };
    var id = typeMap[type];
    if (!id) return null;
    return catalog.find(function (item) {
      return item.id === id;
    });
  }

  function _readGridConfig() {
    var $grid = _activeScreenDom().children('.dt-grid-layout').first();
    function number(property, fallback) {
      var value = parseFloat(
        $grid[0] ? getComputedStyle($grid[0]).getPropertyValue(property) : ''
      );
      return isFinite(value) ? value : fallback;
    }
    return {
      gridColumns: number('--dt-grid-columns', 24),
      rowHeight: number('--dt-grid-row-height', 20),
      gap: number('--dt-grid-gap', 0),
      mobileLayout: $grid.hasClass('dt-grid-mobile-stack') ? 'stack' : 'stack',
    };
  }

  function _readGridConfiguredWidgets() {
    _activeScreenDom()
      .children('.dt-grid-layout')
      .children('.dt-grid-item')
      .each(function (index) {
        var reference = String($(this).attr('data-grid-block') || '');
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : {};
        var item = _catalogItemForDefinition(reference, definition);
        var grid = {
          x: _gridValue(this, '--dt-grid-x', 1),
          y: _gridValue(this, '--dt-grid-y', index + 1),
          w: _gridValue(this, '--dt-grid-w', 1),
          h: _gridValue(this, '--dt-grid-h', 1),
        };
        layoutOrder.push({
          ref: reference,
          widgetId: item ? item.id : null,
          width: parseInt(definition.width, 10) || 3,
          height: parseInt(definition.height, 10) || null,
          grid: grid,
        });
        gridPositions[reference] = grid;
        if (!item) return;
        selectedWidgets[item.id] = true;
        widgetBlockRefs[item.id] = reference;
        widgetDimensions[item.id] = {
          width: parseInt(definition.width, 10) || item.width,
          height: parseInt(definition.height, 10) || item.height || null,
        };
        _hydrateGridWidget(item, definition);
      });
  }

  function _gridValue(element, property, fallback) {
    var value = parseInt(element.style.getPropertyValue(property), 10);
    return value > 0 ? value : fallback;
  }

  function _hydrateGridWidget(item, definition) {
    if (item.id === 'weather') {
      widgetConfigs.weather.provider =
        definition.widget_provider ||
        (definition.type === 'wunderground' ? 'wunderground' : 'openweather');
      [
        ['showRain', 'weather_show_rain'],
        ['showDescription', 'weather_show_description'],
        ['showWind', 'weather_show_wind'],
        ['showGust', 'weather_show_gust'],
      ].forEach(function (mapping) {
        if (typeof definition[mapping[0]] !== 'undefined') {
          widgetConfigs.weather[mapping[1]] = Number(definition[mapping[0]])
            ? 1
            : 0;
        }
      });
      if (typeof definition.icons === 'string') {
        widgetConfigs.weather.weather_icons = definition.icons;
      }
    } else if (item.id === 'calendar') {
      if (typeof definition.icalurl === 'string') {
        widgetConfigs.calendar.icalurl = definition.icalurl;
      }
      if (typeof definition.maxitems !== 'undefined') {
        widgetConfigs.calendar.calendar_maxitems = String(definition.maxitems);
      }
    } else if (item.id === 'garbage') {
      if (typeof definition.maxitems !== 'undefined') {
        widgetConfigs.garbage.garbage_maxitems = String(definition.maxitems);
      }
      if (typeof definition.maxdays !== 'undefined') {
        widgetConfigs.garbage.garbage_maxdays = String(definition.maxdays);
      }
    } else if (item.id === 'clock') {
      widgetConfigs.clock.clockType = definition.type || 'basicclock';
      [
        'size',
        'scale',
        'showSeconds',
        'clockFace',
        'body',
        'dial',
        'hourhand',
        'minutehand',
        'secondhand',
        'boss',
        'minutehandbehavior',
        'secondhandbehavior',
      ].forEach(function (property) {
        if (typeof definition[property] !== 'undefined') {
          widgetConfigs.clock[property] = definition[property];
        }
      });
    } else if (item.id === 'publictransport') {
      widgetConfigs.publictransport.station = definition.station || 'UT';
      widgetConfigs.publictransport.provider = definition.provider || 'treinen';
    } else if (item.id === 'camera') {
      if (Array.isArray(definition.cameras) && definition.cameras.length) {
        widgetConfigs.camera.cameras = definition.cameras;
      } else if (definition.imageUrl) {
        widgetConfigs.camera.cameras = [
          {
            title: definition.title || 'Camera',
            imageUrl: definition.imageUrl,
            videoUrl: definition.videoUrl || '',
          },
        ];
      }
    } else if (item.id === 'alarmmeldingen') {
      widgetConfigs.alarmmeldingen.rss =
        definition.rss || widgetConfigs.alarmmeldingen.rss;
      widgetConfigs.alarmmeldingen.filter = definition.filter || '';
    } else if (item.id === 'iframe') {
      // Hydrate iframe widget settings from an existing block definition
      if (typeof definition.frameurl === 'string') {
        widgetConfigs.iframe.frameurl = definition.frameurl;
      }
      widgetConfigs.iframe.height =
        typeof definition.height !== 'undefined' ? String(definition.height) : '';
      if (typeof definition.scrollbars !== 'undefined') {
        widgetConfigs.iframe.scrollbars = definition.scrollbars === false ? 0 : 1;
      }
      widgetConfigs.iframe.scaletofit =
        typeof definition.scaletofit !== 'undefined'
          ? String(definition.scaletofit)
          : '';
      widgetConfigs.iframe.aspectratio =
        typeof definition.aspectratio !== 'undefined'
          ? String(definition.aspectratio)
          : '';
      if (typeof definition.forcerefresh !== 'undefined') {
        widgetConfigs.iframe.forcerefresh = definition.forcerefresh ? 1 : 0;
      }
      if (typeof definition.refresh !== 'undefined') {
        widgetConfigs.iframe.refresh = String(definition.refresh);
      }
    } else if (item.id === 'xmltvguide') {
      // Hydrate xmltvguide widget settings from an existing block definition
      if (typeof definition.xmltvurl === 'string') {
        widgetConfigs.xmltvguide.xmltvurl = definition.xmltvurl;
      }
      if (Array.isArray(definition.channels)) {
        widgetConfigs.xmltvguide.channels = definition.channels.join(', ');
      } else if (typeof definition.channels === 'string') {
        widgetConfigs.xmltvguide.channels = definition.channels;
      }
      if (typeof definition.maxitems !== 'undefined') {
        widgetConfigs.xmltvguide.maxitems = String(definition.maxitems);
      }
      if (typeof definition.layout !== 'undefined') {
        widgetConfigs.xmltvguide.layout = String(definition.layout);
      }
      if (typeof definition.separator === 'string') {
        widgetConfigs.xmltvguide.separator = definition.separator;
      }
      if (typeof definition.refresh !== 'undefined') {
        widgetConfigs.xmltvguide.refresh = String(definition.refresh);
      }
    }
  }

  function _gridOverlap(left, right) {
    return (
      left.x < right.x + right.w &&
      left.x + left.w > right.x &&
      left.y < right.y + right.h &&
      left.y + left.h > right.y
    );
  }

  function _firstFreeGridPosition(occupied, width, height) {
    for (var y = 1; y < 10000; y++) {
      for (var x = 1; x <= gridConfig.gridColumns - width + 1; x++) {
        var candidate = { x: x, y: y, w: width, h: height };
        if (
          !occupied.some(function (position) {
            return _gridOverlap(candidate, position);
          })
        ) {
          return candidate;
        }
      }
    }
    return { x: 1, y: 10000, w: width, h: height };
  }

  function _readManagedLayoutOrder() {
    var seen = {};
    _orderedColumnKeys().forEach(function (columnKey) {
      var isStandby = _activeScreenTarget() === 'standby';
      var lookupKey = String(columnKey);
      if (isStandby && /^standby/.test(lookupKey)) {
        lookupKey = lookupKey.replace(/^standby/, '');
      }
      if (
        !isStandby &&
        !/^(de|we|le)_s\d+_col\d+$|^(de|we|le)_col\d+$|^col_\d+$/.test(
          String(columnKey)
        )
      ) {
        return;
      }
      var column = isStandby
        ? columns_standby && columns_standby[lookupKey]
        : columns[columnKey];
      if (!column || !Array.isArray(column.blocks)) return;

      column.blocks.forEach(function (reference) {
        if (
          typeof reference !== 'string' ||
          !/^[A-Za-z_][A-Za-z0-9_]*$/.test(reference) ||
          seen[reference]
        ) {
          return;
        }
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : {};
        var widget = _catalogItemByBlockKey(reference);
        seen[reference] = true;
        layoutOrder.push({
          ref: reference,
          widgetId: widget ? widget.id : null,
          width: Math.max(
            1,
            Math.min(12, parseInt(definition.width, 10) || 3)
          ),
          height: parseInt(definition.height, 10) || null,
        });
      });
    });
  }

  function _buildAndShowModal() {
    $('#widgeteditorpopup').remove();

    var html =
      '<div class="modal fade" id="widgeteditorpopup" tabindex="-1" aria-labelledby="we-title" aria-hidden="true">' +
      '<div class="modal-dialog modal-xl modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title" id="we-title"><i class="fas fa-puzzle-piece me-2" aria-hidden="true"></i>' +
      _t('title', 'Widgets') +
      '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _t('close', 'Close') +
      '"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p class="text-muted">' +
      _t('choose', 'Choose the functions to show as tiles on screen 1.') +
      '</p>' +
      '<div class="we-widget-grid">';

    catalog.forEach(function (item) {
      html += _widgetCardHtml(item);
    });

    html +=
      '</div><div class="we-message" role="status"></div></div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      _t('close', 'Close') +
      '</button>' +
      '<button type="button" class="btn btn-primary" id="we-save-btn">' +
      _t('save', 'Save') +
      '</button>' +
      '</div></div></div></div>';

    $('body').append(html);
    _attachHandlers();
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('widgeteditorpopup')
    ).show();
  }

  function _widgetHasConfig(id) {
    return (
      id === 'weather' ||
      id === 'calendar' ||
      id === 'clock' ||
      id === 'garbage' ||
      id === 'sonarr' ||
      id === 'spotify' ||
      id === 'secpanel' ||
      id === 'publictransport' ||
      id === 'trafficinfo' ||
      id === 'alarmmeldingen' ||
      id === 'camera' ||
      id === 'map' ||
      id === 'longfonds' ||
      id === 'moon' ||
      id === 'news' ||
      id === 'iframe' ||
      id === 'xmltvguide'
    );
  }

  function _widgetCardHtml(item) {
    var selected = !!selectedWidgets[item.id];
    var itemTitle = _widgetTitle(item);
    var configBtn = _widgetHasConfig(item.id)
      ? '<button type="button" class="we-config-btn" data-widget-id="' +
        item.id +
        '" title="' +
        _t('settings', 'Settings') +
        '" aria-label="' +
        _t('settings_for', 'Settings for') +
        ' ' +
        itemTitle +
        '"><i class="fas fa-cog" aria-hidden="true"></i></button>'
      : '';

    return (
      '<div class="we-widget-card' +
      (selected ? ' we-selected' : '') +
      '" data-widget-id="' +
      item.id +
      '" role="button" tabindex="0" aria-pressed="' +
      (selected ? 'true' : 'false') +
      '">' +
      configBtn +
      '<div class="we-widget-icon"><i class="' +
      item.icon +
      '" aria-hidden="true"></i></div>' +
      '<div class="we-widget-content"><div class="we-widget-title">' +
      itemTitle +
      '</div><div class="we-widget-description">' +
      _widgetDescription(item) +
      '</div></div>' +
      '<div class="we-widget-status">' +
      (selected ? _t('added', 'Added') : _t('click_to_add', 'Click to add')) +
      '</div></div>'
    );
  }

  function _cfgField(key, label, type, value, opts, help) {
    var id = 'we-cfg-' + key.replace(/_/g, '-');
    var html = '<div class="mb-3">';
    html += '<label class="form-label we-field-label" for="' + _esc(id) + '">' + label + '</label>';
    if (type === 'text') {
      html += '<input type="text" class="form-control form-control-sm we-widget-field" id="' +
        _esc(id) + '" data-cfg-key="' + _esc(key) + '" value="' + _esc(String(value !== null && value !== undefined ? value : '')) + '">';
    } else if (type === 'checkbox') {
      html += '<div class="form-check form-switch">' +
        '<input class="form-check-input we-widget-field" type="checkbox" id="' +
        _esc(id) + '" data-cfg-key="' + _esc(key) + '" value="1"' +
        (Number(value) === 1 ? ' checked' : '') + '>' +
        '</div>';
    } else if (type === 'select') {
      html += '<select class="form-select form-select-sm we-widget-field" id="' +
        _esc(id) + '" data-cfg-key="' + _esc(key) + '">';
      for (var optVal in opts) {
        html += '<option value="' + _esc(optVal) + '"' +
          (String(value) === String(optVal) ? ' selected' : '') + '>' +
          _esc(opts[optVal]) + '</option>';
      }
      html += '</select>';
    }
    if (help) {
      html += '<div class="form-text" style="font-size:11px;color:#6c757d">' + _esc(help) + '</div>';
    }
    html += '</div>';
    return html;
  }

  function _cfgHeading(text) {
    return '<h6 class="mt-3 mb-2" style="font-size:13px;font-weight:700;color:#495057">' + text + '</h6>';
  }

  function _cameraRowHtml(camera, index) {
    camera = camera || {};
    return (
      '<div class="we-camera-row border rounded p-2 mb-2" data-camera-index="' +
      index +
      '">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<strong>' +
      _t('camera', 'Camera') +
      ' ' +
      (index + 1) +
      '</strong>' +
      '<button type="button" class="btn btn-sm btn-outline-danger we-camera-remove" aria-label="' +
      _t('camera_remove', 'Remove camera') +
      '">' +
      '<i class="fas fa-minus" aria-hidden="true"></i></button></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('name', 'Name') +
      '</label>' +
      '<input type="text" class="form-control form-control-sm we-camera-title" maxlength="100" value="' +
      _esc(camera.title || _t('camera', 'Camera') + ' ' + (index + 1)) +
      '"></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">Image URL</label>' +
      '<input type="url" class="form-control form-control-sm we-camera-image" value="' +
      _esc(camera.imageUrl || '') +
      '"></div>' +
      '<div><label class="form-label we-field-label">' +
      _t('video_url_optional', 'Video URL (optional, MJPEG)') +
      '</label>' +
      '<input type="url" class="form-control form-control-sm we-camera-video" value="' +
      _esc(camera.videoUrl || '') +
      '"></div></div>'
    );
  }

  function _buildConfigModalHtml(item) {
    var fields = '';
    var lng = (typeof language !== 'undefined' && language.settings) ? language.settings : {};
    var lw = lng.weather || {};
    var ll = lng.localize || {};
    var lg = lng.garbage || {};
    var lm = lng.media || {};

    if (item.id === 'weather') {
      var cfg = widgetConfigs.weather || {};
      var iconOpts = {
        line: 'Dynamic line icons',
        linestatic: 'Static version of the line icons',
        fill: 'Dynamic filled icons',
        static: 'Static icons',
        meteo: 'Alternative set of static icons',
      };
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-weather-provider">Provider</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-weather-provider">' +
        '<option value="openweather"' + (cfg.provider === 'openweather' ? ' selected' : '') + '>OpenWeather</option>' +
        '<option value="wunderground"' + (cfg.provider === 'wunderground' ? ' selected' : '') + '>Weather Underground</option>' +
        '</select></div>';
      fields +=
        '<div class="we-weather-group" data-weather-provider="openweather"' +
        (cfg.provider === 'openweather' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('OpenWeather');
      fields += _cfgField('owm_api', lw.owm_api || 'OpenWeather API key', 'text', cfg.owm_api);
      fields += _cfgField('owm_city', lw.owm_city || 'City', 'text', cfg.owm_city);
      fields += _cfgField('owm_name', lw.owm_name || 'Display name', 'text', cfg.owm_name);
      fields += _cfgField('owm_country', lw.owm_country || 'Country code', 'text', cfg.owm_country);
      fields += _cfgField('owm_lang', lw.owm_lang || 'Language code', 'text', cfg.owm_lang, null, lw.owm_lang_help || '');
      fields += _cfgField('owm_cnt', lw.owm_cnt || 'Number of periods', 'text', cfg.owm_cnt, null, lw.owm_cnt_help || '');
      fields += _cfgField('owm_days', lw.owm_days || 'Daily forecast', 'checkbox', cfg.owm_days, null, lw.owm_days_help || '');
      fields += _cfgField('owm_min', lw.owm_min || 'Show minimum temperature', 'checkbox', cfg.owm_min, null, lw.owm_min_help || '');
      fields += _cfgHeading(lw.display || _t('display', 'Display'));
      fields += _cfgField('weather_show_rain', lw.show_rain || 'Show rain', 'checkbox', cfg.weather_show_rain);
      fields += _cfgField('weather_show_description', lw.show_description || 'Show description', 'checkbox', cfg.weather_show_description);
      fields += _cfgField('weather_show_wind', lw.show_wind || 'Show wind', 'checkbox', cfg.weather_show_wind);
      fields += _cfgField('weather_show_gust', lw.show_gust || 'Show gusts', 'checkbox', cfg.weather_show_gust);
      fields += _cfgField('weather_icons', lw.icons || 'Weather icons', 'select', cfg.weather_icons || 'line', iconOpts);
      fields += '</div>';
      fields +=
        '<div class="we-weather-group" data-weather-provider="wunderground"' +
        (cfg.provider === 'wunderground' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('Weather Underground');
      fields += _cfgField('wu_api', lw.wu_api || 'Weather Underground API key', 'text', cfg.wu_api);
      fields += _cfgField('wu_city', lw.wu_city || 'City (WU)', 'text', cfg.wu_city);
      fields += _cfgField('wu_name', lw.wu_name || 'Display name (WU)', 'text', cfg.wu_name);
      fields += _cfgField('wu_country', lw.wu_country || 'Country code (WU)', 'text', cfg.wu_country);
      fields += '</div>';
      fields += _cfgHeading(lw.shared_display || _t('general_display', 'General display'));
      fields += _cfgField('use_fahrenheit', lw.use_fahrenheit || 'Use Fahrenheit', 'checkbox', cfg.use_fahrenheit);
      fields += _cfgField('use_beaufort', lw.use_beaufort || 'Use Beaufort', 'checkbox', cfg.use_beaufort);
      fields += _cfgField('translate_windspeed', lw.translate_windspeed || 'Translate wind speed', 'checkbox', cfg.translate_windspeed, null, lw.translate_windspeed_help || '');

    } else if (item.id === 'calendar') {
      var ccal = widgetConfigs.calendar || {};
      fields =
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-calendar-url">ICS-URL</label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-calendar-url" ' +
        'placeholder="https://…/calendar.ics" value="' + _esc(ccal.icalurl || '') + '"></div>';
      fields += _cfgField('calendarformat', ll.calendarformat || 'Calendar format', 'text', ccal.calendarformat);
      fields += _cfgField(
        'calendarlanguage',
        ll.calendarlanguage || 'Calendar language',
        'select',
        ccal.calendarlanguage,
        _calendarLanguages()
      );
      fields += _cfgField(
        'calendar_maxitems',
        ll.calendar_maxitems || 'Visible calendar rows',
        'text',
        ccal.calendar_maxitems,
        null,
        ll.calendar_maxitems_help || 'Maximum number of calendar rows to display. Default: 15.'
      );

    } else if (item.id === 'clock') {
      var ccfg = widgetConfigs.clock || {};
      var bodyOpts = {
        NoBody: _t('clock_no_body', 'No body'),
        SmallWhiteBody: _t('clock_small_white_body', 'Small white'),
        RoundBody: _t('clock_round_body', 'Round'),
        RoundGreenBody: _t('clock_round_green_body', 'Round green'),
        SquareBody: _t('clock_square_body', 'Square'),
        ViennaBody: _t('clock_vienna', 'Vienna'),
      };
      var dialOpts = {
        NoDial: _t('clock_no_dial', 'No dial'),
        GermanHourStrokeDial: _t('clock_german_hours', 'German (hours)'),
        GermanStrokeDial: _t('clock_german', 'German'),
        AustriaStrokeDial: _t('clock_austrian', 'Austrian'),
        SwissStrokeDial: _t('clock_swiss', 'Swiss'),
        ViennaStrokeDial: _t('clock_vienna', 'Vienna'),
      };
      var hourOpts = {
        PointedHourHand: _t('clock_pointed', 'Pointed'),
        BarHourHand: _t('clock_bar', 'Bar'),
        SwissHourHand: _t('clock_swiss', 'Swiss'),
        ViennaHourHand: _t('clock_vienna', 'Vienna'),
      };
      var minuteOpts = {
        PointedMinuteHand: _t('clock_pointed', 'Pointed'),
        BarMinuteHand: _t('clock_bar', 'Bar'),
        SwissMinuteHand: _t('clock_swiss', 'Swiss'),
        ViennaMinuteHand: _t('clock_vienna', 'Vienna'),
      };
      var secondOpts = {
        NoSecondHand: _t('none', 'None'),
        BarSecondHand: _t('clock_bar', 'Bar'),
        HoleShapedSecondHand: _t('clock_hole', 'Hole'),
        NewHoleShapedSecondHand: _t('clock_hole_new', 'Hole (new)'),
        SwissSecondHand: _t('clock_swiss', 'Swiss'),
      };
      var bossOpts = {
        NoBoss: _t('none', 'None'),
        BlackBoss: _t('black', 'Black'),
        RedBoss: _t('red', 'Red'),
        ViennaBoss: _t('clock_vienna', 'Vienna'),
      };
      var minuteBehOpts = {
        CreepingMinuteHand: _t('clock_creeping', 'Creeping'),
        BouncingMinuteHand: _t('clock_bouncing', 'Bouncing'),
        ElasticBouncingMinuteHand: _t('clock_elastic', 'Elastic'),
      };
      var secondBehOpts = {
        CreepingSecondHand: _t('clock_creeping', 'Creeping'),
        BouncingSecondHand: _t('clock_bouncing', 'Bouncing'),
        ElasticBouncingSecondHand: _t('clock_elastic', 'Elastic'),
        OverhastySecondHand: _t('clock_overhasty', 'Overhasty'),
      };
      var clockFaceOpts = {
        '24': _t('clock_24_hour', '24-hour'),
        '12': _t('clock_12_hour', '12-hour'),
      };
      var currentClockType = ccfg.clockType || 'basicclock';
      var showSizeScale = currentClockType !== 'miniclock';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-clock-type">' +
        _t('clock_type', 'Clock type') +
        '</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-clock-type">' +
        _clockOption('basicclock', 'Basic clock', currentClockType) +
        _clockOption('stationclock', _t('station_clock', 'Station clock'), currentClockType) +
        _clockOption('flipclock', 'Flipclock', currentClockType) +
        _clockOption('haymanclock', 'Hayman clock', currentClockType) +
        _clockOption('miniclock', 'Miniclock', currentClockType) +
        '</select></div>';

      fields +=
        '<div class="we-clock-size-group"' +
        (showSizeScale ? '' : ' style="display:none"') +
        '>';
      fields += _cfgField(
        'size',
        _t('size_px', 'Size (px)'),
        'text',
        ccfg.size,
        null,
        _t('size_help', 'Empty = column width')
      );
      fields += _cfgField(
        'scale',
        _t('scale', 'Scale'),
        'text',
        ccfg.scale,
        null,
        _t('scale_help', 'For example 0.75 (default 1)')
      );
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="flipclock"' +
        (currentClockType === 'flipclock' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('Flipclock');
      fields += _cfgField(
        'showSeconds',
        _t('show_seconds', 'Show seconds'),
        'checkbox',
        ccfg.showSeconds
      );
      fields += _cfgField(
        'clockFace',
        _t('clock_face', 'Clock face'),
        'select',
        ccfg.clockFace || '24',
        clockFaceOpts
      );
      fields += _cfgField('hide_seconds', ll.hide_seconds || 'Default: seconden verbergen', 'checkbox', ccfg.hide_seconds);
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="stationclock"' +
        (currentClockType === 'stationclock' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading(_t('station_clock', 'Station clock'));
      fields += _cfgField('body', _t('clock_body', 'Body'), 'select', ccfg.body || 'RoundBody', bodyOpts);
      fields += _cfgField('dial', _t('clock_dial', 'Dial'), 'select', ccfg.dial || 'GermanStrokeDial', dialOpts);
      fields += _cfgField('hourhand', _t('clock_hour_hand', 'Hour hand'), 'select', ccfg.hourhand || 'PointedHourHand', hourOpts);
      fields += _cfgField('minutehand', _t('clock_minute_hand', 'Minute hand'), 'select', ccfg.minutehand || 'PointedMinuteHand', minuteOpts);
      fields += _cfgField('secondhand', _t('clock_second_hand', 'Second hand'), 'select', ccfg.secondhand || 'HoleShapedSecondHand', secondOpts);
      fields += _cfgField('boss', _t('clock_boss', 'Boss'), 'select', ccfg.boss || 'RedBoss', bossOpts);
      fields += _cfgField('minutehandbehavior', _t('clock_minute_behavior', 'Minute-hand behavior'), 'select', ccfg.minutehandbehavior || 'BouncingMinuteHand', minuteBehOpts);
      fields += _cfgField('secondhandbehavior', _t('clock_second_behavior', 'Second-hand behavior'), 'select', ccfg.secondhandbehavior || 'OverhastySecondHand', secondBehOpts);
      fields += _cfgField('boss_stationclock', ll.boss_stationclock || 'Default as-kap (config)', 'select', ccfg.boss_stationclock || 'RedBoss', bossOpts);
      fields += _cfgField('hide_seconds_stationclock', ll.hide_seconds_stationclock || 'Default: seconden verbergen', 'checkbox', ccfg.hide_seconds_stationclock);
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="miniclock"' +
        (currentClockType === 'miniclock' ? '' : ' style="display:none"') +
        '>';
      fields +=
        '<p class="form-text" style="font-size:12px;color:#6c757d">' +
        _t(
          'miniclock_note',
          'Miniclock has no extra display options. Set width and height in the layout editor.'
        ) +
        '</p>';
      fields += '</div>';

    } else if (item.id === 'garbage') {
      var gcfg = widgetConfigs.garbage || {};
      fields += _cfgField('garbage_company', lg.garbage_company || 'Company / Service', 'select', gcfg.garbage_company, _GARBAGE_COMPANIES);
      fields += _cfgField('garbage_zipcode', lg.garbage_zipcode || 'Postcode', 'text', gcfg.garbage_zipcode);
      fields += _cfgField('garbage_street', lg.garbage_street || 'Street', 'text', gcfg.garbage_street);
      fields += _cfgField('garbage_housenumber', lg.garbage_housenumber || 'House number', 'text', gcfg.garbage_housenumber);
      fields += _cfgField('garbage_housenumberadd', lg.garbage_housenumberaddition || 'House-number addition', 'text', gcfg.garbage_housenumberadd);
      fields += _cfgField('garbage_maxitems', lg.garbage_maxitems || 'Maximum items', 'text', gcfg.garbage_maxitems);
      fields += _cfgField('garbage_maxdays', lg.garbage_maxdays || 'Maximum days', 'text', gcfg.garbage_maxdays,
        null, lg.garbage_maxdays_help || 'Maximum number of days ahead to search. Default: 32.');
      fields += _cfgField('garbage_width', lg.garbage_width || 'Width', 'text', gcfg.garbage_width);
      fields += _cfgHeading('iCal / Google');
      fields += _cfgField('garbage_icalurl', lg.garbage_icalurl || 'iCal URL', 'text', gcfg.garbage_icalurl);
      fields += _cfgField('google_api_key', lg.google_api_key || 'Google API key', 'text', gcfg.google_api_key);
      fields += _cfgField('garbage_calendar_id', lg.garbage_calendar_id || 'Google Calendar ID', 'text', gcfg.garbage_calendar_id, null, lg.garbage_calendar_id_help || '');
      fields += _cfgHeading(_t('display', 'Display'));
      fields += _cfgField('garbage_hideicon', lg.garbage_hideicon || 'Hide icon', 'checkbox', gcfg.garbage_hideicon);
      fields += _cfgField('garbage_icon_use_colors', lg.garbage_icon_use_colors || 'Use icon colors', 'checkbox', gcfg.garbage_icon_use_colors);
      fields += _cfgField('garbage_use_colors', lg.garbage_use_colors || 'Use colors', 'checkbox', gcfg.garbage_use_colors);
      fields += _cfgField('garbage_use_names', lg.garbage_use_names || 'Use names', 'checkbox', gcfg.garbage_use_names);
      fields += _cfgField('garbage_use_cors_prefix', lg.garbage_use_cors_prefix || 'Use CORS prefix', 'checkbox', gcfg.garbage_use_cors_prefix);

    } else if (item.id === 'sonarr') {
      var scfg = widgetConfigs.sonarr || {};
      fields += _cfgField('sonarr_url', lm.sonarr_url || 'Sonarr URL', 'text', scfg.sonarr_url);
      fields += _cfgField('sonarr_apikey', lm.sonarr_apikey || 'Sonarr API key', 'text', scfg.sonarr_apikey);
      fields += _cfgField('sonarr_maxitems', lm.sonarr_maxitems || 'Maximum items', 'text', scfg.sonarr_maxitems);

    } else if (item.id === 'spotify') {
      var spcfg = widgetConfigs.spotify || {};
      fields += _cfgField('spot_clientid', lm.spot_clientid || 'Spotify Client ID', 'text', spcfg.spot_clientid);

    } else if (item.id === 'secpanel') {
      var sec = widgetConfigs.secpanel || {};
      var ls = lng.screen || {};
      fields += _cfgField('security_button_icons', ls.security_button_icons || 'Iconen i.p.v. tekst', 'checkbox', sec.security_button_icons);
      fields += _cfgField('security_panel_lock', ls.security_panel_lock || 'Security panel fullscreen', 'checkbox', sec.security_panel_lock, null, ls.security_panel_lock_help || '');

    } else if (item.id === 'publictransport') {
      var ptcfg = widgetConfigs.publictransport || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-pt-provider">Provider</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-pt-provider">' +
        _ptOption('treinen', _t('trains_nl', 'Trains (NL)'), ptcfg.provider || 'treinen') +
        _ptOption('ovapi', 'OV API (NL)', ptcfg.provider || 'treinen') +
        _ptOption('drgl', 'DRGL (NL)', ptcfg.provider || 'treinen') +
        _ptOption('irailbe', 'iRail (BE)', ptcfg.provider || 'treinen') +
        _ptOption('delijnbe', 'De Lijn (BE)', ptcfg.provider || 'treinen') +
        '</select></div>';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-pt-station">' +
        _t('station_stop', 'Station / stop') +
        '</label>' +
        '<input type="text" class="form-control form-control-sm we-widget-field" id="we-cfg-pt-station" value="' +
        _esc(ptcfg.station || 'UT') +
        '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">' +
        _t('station_help', 'For example UT for Utrecht Centraal (trains).') +
        '</div></div>';

    } else if (item.id === 'trafficinfo') {
      var tcfg = widgetConfigs.trafficinfo || {};
      var lwgt = lng.widgets || {};
      fields += _cfgField('anwb_apikey', lwgt.anwb_apikey || 'ANWB API key', 'text', tcfg.anwb_apikey, null, lwgt.anwb_apikey_help || '');

    } else if (item.id === 'alarmmeldingen') {
      var acfg = widgetConfigs.alarmmeldingen || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-alarm-rss">RSS-feed</label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-alarm-rss" value="' +
        _esc(acfg.rss || '') +
        '"></div>';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-alarm-filter">' +
        _t('filter_optional', 'Filter (optional)') +
        '</label>' +
        '<input type="text" class="form-control form-control-sm we-widget-field" id="we-cfg-alarm-filter" value="' +
        _esc(acfg.filter || '') +
        '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">' +
        _t(
          'filter_help',
          'Comma-separated search terms, for example Amsterdam, Utrecht.'
        ) +
        '</div></div>';

    } else if (item.id === 'camera') {
      var camcfg = _cameraWidgetConfig();
      fields += '<div id="we-cfg-camera-list">';
      camcfg.cameras.forEach(function (camera, index) {
        fields += _cameraRowHtml(camera, index);
      });
      fields +=
        '</div>' +
        '<button type="button" class="btn btn-sm btn-outline-primary" id="we-camera-add">' +
        '<i class="fas fa-plus me-1" aria-hidden="true"></i>' +
        _t('camera_add', 'Add camera') +
        '</button>';

    } else if (item.id === 'map') {
      var mcfg = widgetConfigs.map || {};
      fields += _cfgField('gm_api', ll.gm_api || 'Google Maps API key', 'text', mcfg.gm_api);
      fields += _cfgField('gm_zoomlevel', ll.gm_zoomlevel || 'Zoomniveau', 'text', mcfg.gm_zoomlevel);
      fields += _cfgField('gm_latitude', ll.gm_latitude || 'Latitude', 'text', mcfg.gm_latitude);
      fields += _cfgField('gm_longitude', ll.gm_longitude || 'Longitude', 'text', mcfg.gm_longitude);

    } else if (item.id === 'longfonds') {
      var lcfg = widgetConfigs.longfonds || {};
      fields += _cfgField('longfonds_zipcode', lw.longfonds_zipcode || 'Postcode', 'text', lcfg.longfonds_zipcode);
      fields += _cfgField('longfonds_housenumber', lw.longfonds_housenumber || 'House number', 'text', lcfg.longfonds_housenumber);

    } else if (item.id === 'moon') {
      var mooncfg = widgetConfigs.moon || {};
      fields += _cfgField('idx_moonpicture', lw.idx_moonpicture || 'IDX moonpicture', 'text', mooncfg.idx_moonpicture, null, lw.idx_moonpicture_help || '');

    } else if (item.id === 'news') {
      var ncfg = widgetConfigs.news || {};
      var lg2 = lng.general || {};
      fields += _cfgField('default_news_url', lg2.default_news_url || 'News URL', 'text', ncfg.default_news_url);
      fields += _cfgField('news_scroll_after', lg2.news_scroll_after || 'Scroll after (seconds)', 'text', ncfg.news_scroll_after);

    } else if (item.id === 'iframe') {
      // Config fields for the iframe widget
      var icfg = widgetConfigs.iframe || {};
      var li = lng.widgeteditor || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-iframe-url">' +
        (li.iframe_url || 'URL') +
        ' <span class="text-danger" aria-hidden="true">*</span></label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-iframe-url" ' +
        'data-cfg-key="frameurl" placeholder="http://192.168.1.x:8080" value="' + _esc(String(icfg.frameurl || '')) + '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">' +
        (li.iframe_url_help || 'Full URL including http(s)://. The remote server must allow embedding (no X-Frame-Options: DENY).') +
        '</div></div>';
      fields += _cfgField('iframe_height', li.iframe_height || 'Height (px)', 'text', icfg.height,
        null, li.iframe_height_help || 'Optional legacy fixed height. Leave empty when using aspect ratio.');
      fields += _cfgField('iframe_scrollbars', li.iframe_scrollbars || 'Show scrollbars', 'checkbox', icfg.scrollbars);
      fields += _cfgField('iframe_scaletofit', li.iframe_scaletofit || 'Scale-to-fit width (px)',
        'text', icfg.scaletofit, null,
        li.iframe_scaletofit_help || 'Design width of the embedded page (e.g. 1024). The page will be scaled so it fits the tile width. Leave empty to disable scaling.');
      fields += _cfgField('iframe_aspectratio', li.iframe_aspectratio || 'Aspect ratio',
        'text', icfg.aspectratio, null,
        li.iframe_aspectratio_help || 'Height divided by width (for example 0.9). When set, no fixed height is written.');
      fields += _cfgField('iframe_forcerefresh', li.iframe_forcerefresh || 'Force cache refresh', 'checkbox', icfg.forcerefresh);
      fields += _cfgField('iframe_refresh', li.iframe_refresh || 'Refresh interval (seconds)', 'text', icfg.refresh,
        null, li.iframe_refresh_help || 'How often to reload the iframe. Default: 300 seconds.');
    } else if (item.id === 'xmltvguide') {
      // Config fields for the XMLTV TV Guide widget
      var xcfg = widgetConfigs.xmltvguide || {};
      var lx = lng.widgeteditor || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-xmltv-url">' +
        (lx.xmltv_url || 'XMLTV URL') +
        ' <span class="text-danger" aria-hidden="true">*</span></label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-xmltv-url" ' +
        'data-cfg-key="xmltvurl" placeholder="http://my-epg-server/guide.xml" value="' + _esc(String(xcfg.xmltvurl || '')) + '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">' +
        (lx.xmltv_url_help || 'URL of an XMLTV-format XML file (e.g. from Jellyfin, Emby, WebGrab+).') +
        '</div></div>';
      fields += _cfgField('xmltv_channels', lx.xmltv_channels || 'Channels (comma-separated)',
        'text', xcfg.channels, null,
        lx.xmltv_channels_help || 'Channel IDs or display-names to show, separated by commas. Leave empty to show all channels.');
      fields += _cfgField('xmltv_maxitems', lx.xmltv_maxitems || 'Max items', 'text', xcfg.maxitems,
        null, lx.xmltv_maxitems_help || 'Maximum number of programme rows to display (default: 10).');
      fields += _cfgField(
        'xmltv_layout',
        lx.xmltv_layout || 'Layout',
        'select',
        xcfg.layout,
        {
          0: lx.xmltv_layout_with_channel || 'Time, channel and title',
          1: lx.xmltv_layout_compact || 'Time and title only',
        },
        lx.xmltv_layout_help || 'Choose whether the channel column is shown.'
      );
      fields += _cfgField(
        'xmltv_separator',
        lx.xmltv_separator || 'Separator',
        'text',
        xcfg.separator,
        null,
        lx.xmltv_separator_help || 'Character shown between the columns.'
      );
      fields += _cfgField(
        'xmltv_refresh',
        lx.xmltv_refresh || 'Refresh interval (seconds)',
        'text',
        xcfg.refresh,
        null,
        lx.xmltv_refresh_help || 'How often to refresh the widget from the cached XMLTV data.'
      );
    }

    return (
      '<div class="modal fade" id="we-config-popup" tabindex="-1" aria-labelledby="we-cfg-title" aria-hidden="true" data-bs-backdrop="static">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title" id="we-cfg-title"><i class="fas fa-cog me-2" aria-hidden="true"></i>' +
      _t('settings', 'Settings') +
      ' — ' +
      _widgetTitle(item) +
      '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _t('close', 'Close') +
      '"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      fields +
      '<div class="we-cfg-message" role="status"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      _t('cancel', 'Cancel') +
      '</button>' +
      '<button type="button" class="btn btn-primary" id="we-cfg-ok-btn">OK</button>' +
      '</div></div></div></div>'
    );
  }

  function _openConfigModal(widgetId) {
    var item = null;
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === widgetId) {
        item = catalog[i];
        break;
      }
    }
    if (!item) return;

    $('#we-config-popup').remove();
    $('body').append(_buildConfigModalHtml(item));

    var $cfgModal = $('#we-config-popup');

    $cfgModal.on('change', '#we-cfg-weather-provider', function () {
      var provider = $(this).val() === 'wunderground' ? 'wunderground' : 'openweather';
      $cfgModal.find('.we-weather-group').each(function () {
        $(this).toggle(String($(this).data('weather-provider')) === provider);
      });
    });

    $cfgModal.on('change', '#we-cfg-clock-type', function () {
      var type = $(this).val() || 'basicclock';
      $cfgModal.find('.we-clock-group').each(function () {
        $(this).toggle(String($(this).data('clock-type')) === type);
      });
      $cfgModal.find('.we-clock-size-group').toggle(type !== 'miniclock');
    });

    $cfgModal.on('click', '#we-camera-add', function () {
      var index = $cfgModal.find('.we-camera-row').length;
      $('#we-cfg-camera-list').append(
        _cameraRowHtml(
          _defaultCameraConfig(index),
          index
        )
      );
      $cfgModal.find('.we-camera-remove').prop(
        'disabled',
        $cfgModal.find('.we-camera-row').length <= 1
      );
    });

    $cfgModal.on('click', '.we-camera-remove', function () {
      if ($cfgModal.find('.we-camera-row').length <= 1) return;
      $(this).closest('.we-camera-row').remove();
      $cfgModal.find('.we-camera-row').each(function (index) {
        $(this).attr('data-camera-index', index);
        $(this)
          .find('strong')
          .text(_t('camera', 'Camera') + ' ' + (index + 1));
      });
      $cfgModal.find('.we-camera-remove').prop(
        'disabled',
        $cfgModal.find('.we-camera-row').length <= 1
      );
    });

    $cfgModal.find('.we-camera-remove').prop(
      'disabled',
      $cfgModal.find('.we-camera-row').length <= 1
    );

    $cfgModal.on('click', '#we-cfg-ok-btn', function () {
      var valid = true;

      // Collect all generic config fields
      var collected = {};
      $cfgModal.find('[data-cfg-key]').each(function () {
        var key = String($(this).data('cfg-key'));
        if ($(this).attr('type') === 'checkbox') {
          collected[key] = $(this).is(':checked') ? 1 : 0;
        } else {
          collected[key] = $(this).val();
        }
      });

      if (widgetId === 'weather') {
        collected.provider = $('#we-cfg-weather-provider').val() || 'openweather';
        widgetConfigs.weather = collected;
      } else if (widgetId === 'calendar') {
        var url = $.trim($('#we-cfg-calendar-url').val() || '');
        if (url && !/^https?:\/\/\S+$/i.test(url)) {
          $('.we-cfg-message')
            .addClass('text-danger')
            .text(_t('invalid_calendar_url', 'Enter a valid HTTP(S) ICS URL.'));
          $('#we-cfg-calendar-url').trigger('focus');
          valid = false;
        } else {
          collected.icalurl = url;
          widgetConfigs.calendar = collected;
        }
      } else if (widgetId === 'clock') {
        collected.clockType = $('#we-cfg-clock-type').val() || 'basicclock';
        widgetConfigs.clock = collected;
      } else if (widgetId === 'garbage') {
        widgetConfigs.garbage = collected;
      } else if (widgetId === 'sonarr') {
        widgetConfigs.sonarr = collected;
      } else if (widgetId === 'spotify') {
        widgetConfigs.spotify = collected;
      } else if (widgetId === 'secpanel') {
        widgetConfigs.secpanel = collected;
      } else if (widgetId === 'publictransport') {
        widgetConfigs.publictransport = {
          provider: $('#we-cfg-pt-provider').val() || 'treinen',
          station: $.trim($('#we-cfg-pt-station').val() || '') || 'UT',
        };
      } else if (widgetId === 'trafficinfo') {
        widgetConfigs.trafficinfo = collected;
      } else if (widgetId === 'alarmmeldingen') {
        var rss = $.trim($('#we-cfg-alarm-rss').val() || '');
        if (!rss || !/^https?:\/\/\S+$/i.test(rss)) {
          $('.we-cfg-message')
            .addClass('text-danger')
            .text(_t('invalid_rss_url', 'Enter a valid HTTP(S) RSS URL.'));
          valid = false;
        } else {
          widgetConfigs.alarmmeldingen = {
            rss: rss,
            filter: $.trim($('#we-cfg-alarm-filter').val() || ''),
          };
        }
      } else if (widgetId === 'camera') {
        var cameras = [];
        $cfgModal.find('.we-camera-row').each(function (index) {
          var imageUrl = $.trim($(this).find('.we-camera-image').val() || '');
          var videoUrl = $.trim($(this).find('.we-camera-video').val() || '');
          if (
            !imageUrl ||
            !/^https?:\/\/\S+$/i.test(imageUrl) ||
            (videoUrl && !/^https?:\/\/\S+$/i.test(videoUrl))
          ) {
            $('.we-cfg-message')
              .addClass('text-danger')
              .text(
                _t(
                  'invalid_camera_url_prefix',
                  'Enter valid HTTP(S) URL(s) for camera'
                ) +
                  ' ' +
                  (index + 1) +
                  '.'
              );
            valid = false;
            return false;
          }
          cameras.push({
            title:
              $.trim($(this).find('.we-camera-title').val() || '') ||
              _t('camera', 'Camera') + ' ' + (index + 1),
            imageUrl: imageUrl,
            videoUrl: videoUrl,
          });
        });
        if (valid) widgetConfigs.camera = { cameras: cameras };
      } else if (widgetId === 'map') {
        widgetConfigs.map = collected;
      } else if (widgetId === 'longfonds') {
        widgetConfigs.longfonds = collected;
      } else if (widgetId === 'moon') {
        widgetConfigs.moon = collected;
      } else if (widgetId === 'news') {
        widgetConfigs.news = collected;
      } else if (widgetId === 'iframe') {
        // Validate and store iframe-specific config
        var iframeUrl = $.trim($('#we-cfg-iframe-url').val() || '');
        if (!iframeUrl) {
          $('.we-cfg-message')
            .addClass('text-danger')
            .text(_t('invalid_iframe_url', 'Enter a valid URL for the iframe (e.g. http://192.168.1.x:8080).'));
          $('#we-cfg-iframe-url').trigger('focus');
          valid = false;
        } else {
          widgetConfigs.iframe = {
            frameurl: iframeUrl,
            height: $.trim($cfgModal.find('[data-cfg-key="iframe_height"]').val() || ''),
            scrollbars: $cfgModal.find('[data-cfg-key="iframe_scrollbars"]').is(':checked') ? 1 : 0,
            scaletofit: $.trim($cfgModal.find('[data-cfg-key="iframe_scaletofit"]').val() || ''),
            aspectratio: $.trim($cfgModal.find('[data-cfg-key="iframe_aspectratio"]').val() || ''),
            forcerefresh: $cfgModal.find('[data-cfg-key="iframe_forcerefresh"]').is(':checked') ? 1 : 0,
            refresh: $.trim($cfgModal.find('[data-cfg-key="iframe_refresh"]').val() || '') || '300',
          };
        }
      } else if (widgetId === 'xmltvguide') {
        // Validate and store xmltvguide-specific config
        var xmltvUrl = $.trim($('#we-cfg-xmltv-url').val() || '');
        if (!xmltvUrl) {
          $('.we-cfg-message')
            .addClass('text-danger')
            .text(_t('invalid_xmltv_url', 'Enter a valid URL for the XMLTV TV Guide (e.g. http://my-epg-server/guide.xml).'));
          $('#we-cfg-xmltv-url').trigger('focus');
          valid = false;
        } else {
          widgetConfigs.xmltvguide = {
            xmltvurl: xmltvUrl,
            channels: $.trim($cfgModal.find('[data-cfg-key="xmltv_channels"]').val() || ''),
            maxitems: $.trim($cfgModal.find('[data-cfg-key="xmltv_maxitems"]').val() || '') || '10',
            layout: $.trim($cfgModal.find('[data-cfg-key="xmltv_layout"]').val() || '') || '0',
            separator: $.trim($cfgModal.find('[data-cfg-key="xmltv_separator"]').val() || '') || '-',
            refresh: $.trim($cfgModal.find('[data-cfg-key="xmltv_refresh"]').val() || '') || '3600',
          };
        }
      }

      if (valid) {
        selectedWidgets[widgetId] = true;
        _refreshCard(widgetId);
        window.bootstrap.Modal.getInstance(document.getElementById('we-config-popup')).hide();
      }
    });

    $cfgModal.one('hidden.bs.modal', function () {
      $cfgModal.remove();
    });

    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('we-config-popup')
    ).show();
  }

  function _clockOption(value, label, currentClockType) {
    return (
      '<option value="' +
      value +
      '"' +
      (currentClockType === value ? ' selected' : '') +
      '>' +
      label +
      '</option>'
    );
  }

  function _ptOption(value, label, currentProvider) {
    return (
      '<option value="' +
      value +
      '"' +
      (currentProvider === value ? ' selected' : '') +
      '>' +
      label +
      '</option>'
    );
  }

  function _attachHandlers() {
    var $modal = $('#widgeteditorpopup');

    $modal.on('click', '.we-config-btn', function (event) {
      event.stopPropagation();
      _openConfigModal(String($(this).data('widget-id')));
    });

    $modal.on('keydown', '.we-config-btn', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        _openConfigModal(String($(this).data('widget-id')));
      }
    });

    $modal.on('click', '.we-widget-card', function (event) {
      if ($(event.target).closest('.we-config-btn').length) return;
      _toggleWidget(String($(this).data('widget-id')));
    });

    $modal.on('keydown', '.we-widget-card', function (event) {
      if ($(event.target).closest('.we-config-btn').length) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        _toggleWidget(String($(this).data('widget-id')));
      }
    });

    $modal.on('click', '#we-save-btn', _save);
    $modal.one('hidden.bs.modal', function () {
      $modal.remove();
    });
  }

  function _toggleWidget(id) {
    selectedWidgets[id] = !selectedWidgets[id];
    _refreshCard(id);
  }

  function _refreshCard(id) {
    var selected = !!selectedWidgets[id];
    var $card = $('.we-widget-card[data-widget-id="' + id + '"]');
    $card
      .toggleClass('we-selected', selected)
      .attr('aria-pressed', selected ? 'true' : 'false')
      .find('.we-widget-status')
      .text(
        selected ? _t('added', 'Added') : _t('click_to_add', 'Click to add')
      );
  }

  function _save() {
    if (
      selectedWidgets.calendar &&
      widgetConfigs.calendar &&
      widgetConfigs.calendar.icalurl &&
      !/^https?:\/\/\S+$/i.test(widgetConfigs.calendar.icalurl)
    ) {
      $('.we-message')
        .addClass('text-danger')
        .text(
          _t(
            'calendar_needs_url',
            'Enter a valid HTTP(S) ICS URL for Calendar.'
          )
        );
      return;
    }
    if (
      selectedWidgets.camera &&
      (!_cameraWidgetConfig().cameras.length ||
        _cameraWidgetConfig().cameras.some(function (camera) {
          return (
            !/^https?:\/\/\S+$/i.test(camera.imageUrl || '') ||
            (camera.videoUrl &&
              !/^https?:\/\/\S+$/i.test(camera.videoUrl))
          );
        }))
    ) {
      $('.we-message')
        .addClass('text-danger')
        .text(
          _t(
            'camera_needs_url',
            'Enter a valid image URL for Cameras in its settings.'
          )
        );
      return;
    }
    // Validate that a URL has been configured for the iframe widget
    if (selectedWidgets.iframe && !widgetConfigs.iframe.frameurl) {
      $('.we-message')
        .addClass('text-danger')
        .text(_t('iframe_needs_url', 'Enter a URL for the iFrame widget in its settings.'));
      return;
    }
    // Validate that a URL has been configured for the xmltvguide widget
    if (selectedWidgets.xmltvguide && !widgetConfigs.xmltvguide.xmltvurl) {
      $('.we-message')
        .addClass('text-danger')
        .text(_t('xmltvguide_needs_url', 'Enter an XMLTV URL for the TV Guide widget in its settings.'));
      return;
    }

    // Collect flattened config settings from all widget configs
    var configSettings = {};
    var configWidgets = {
      weather: [
        'owm_api',
        'owm_city',
        'owm_name',
        'owm_country',
        'owm_lang',
        'owm_days',
        'owm_cnt',
        'owm_min',
        'weather_show_rain',
        'weather_show_description',
        'weather_show_wind',
        'weather_show_gust',
        'weather_icons',
        'wu_api',
        'wu_city',
        'wu_name',
        'wu_country',
        'use_fahrenheit',
        'use_beaufort',
        'translate_windspeed',
      ],
      clock: ['boss_stationclock', 'hide_seconds', 'hide_seconds_stationclock'],
      garbage: [
        'garbage_company',
        'garbage_icalurl',
        'google_api_key',
        'garbage_calendar_id',
        'garbage_zipcode',
        'garbage_street',
        'garbage_housenumber',
        'garbage_housenumberadd',
        'garbage_maxitems',
        'garbage_maxdays',
        'garbage_width',
        'garbage_hideicon',
        'garbage_icon_use_colors',
        'garbage_use_colors',
        'garbage_use_names',
        'garbage_use_cors_prefix',
      ],
      sonarr: ['sonarr_url', 'sonarr_apikey', 'sonarr_maxitems'],
      spotify: ['spot_clientid'],
      calendar: ['calendarformat', 'calendarlanguage', 'calendar_maxitems'],
      secpanel: ['security_button_icons', 'security_panel_lock'],
      trafficinfo: ['anwb_apikey'],
      map: ['gm_api', 'gm_zoomlevel', 'gm_latitude', 'gm_longitude'],
      longfonds: ['longfonds_zipcode', 'longfonds_housenumber'],
      moon: ['idx_moonpicture'],
      news: ['default_news_url', 'news_scroll_after'],
    };
    Object.keys(configWidgets).forEach(function (id) {
      var cfg = widgetConfigs[id];
      if (!cfg) return;
      configWidgets[id].forEach(function (key) {
        if (typeof cfg[key] !== 'undefined') {
          configSettings[key] = cfg[key];
        }
      });
    });
    if (widgetConfigs.xmltvguide) {
      configSettings.xmltv_url = widgetConfigs.xmltvguide.xmltvurl || '';
      configSettings.xmltv_channels = widgetConfigs.xmltvguide.channels || '';
      configSettings.xmltv_maxitems = widgetConfigs.xmltvguide.maxitems || '10';
      configSettings.xmltv_layout = widgetConfigs.xmltvguide.layout || '0';
      configSettings.xmltv_separator = widgetConfigs.xmltvguide.separator || '-';
      configSettings.xmltv_refresh = widgetConfigs.xmltvguide.refresh || '3600';
    }

    var payload = [];
    catalog.forEach(function (item) {
      if (!selectedWidgets[item.id]) return;
      var entry = {
        id: item.id,
        key: widgetBlockRefs[item.id] || item.blockKey,
      };
      var dimensions = widgetDimensions[item.id] || {};
      entry.width = dimensions.width || item.width;
      if (dimensions.height || item.height) {
        entry.height = dimensions.height || item.height;
      }
      if (item.id === 'garbage') {
        entry.displayTitle = _widgetTitle(item);
        entry.maxitems = parseInt(widgetConfigs.garbage.garbage_maxitems, 10) || 4;
        entry.maxdays = parseInt(widgetConfigs.garbage.garbage_maxdays, 10) || 32;
      }
      if (item.id === 'weather') entry.provider = widgetConfigs.weather.provider;
      if (item.id === 'weather' && widgetConfigs.weather) {
        var wcfg = widgetConfigs.weather;
        entry.showRain = Number(wcfg.weather_show_rain) ? 1 : 0;
        entry.showDescription = Number(wcfg.weather_show_description) ? 1 : 0;
        entry.showWind = Number(wcfg.weather_show_wind) ? 1 : 0;
        entry.showGust = Number(wcfg.weather_show_gust) ? 1 : 0;
        entry.icons = wcfg.weather_icons || 'line';
      }
      if (item.id === 'calendar') {
        entry.icalurl = widgetConfigs.calendar.icalurl;
        entry.maxitems = parseInt(widgetConfigs.calendar.calendar_maxitems, 10) || 15;
      }
      if (item.id === 'clock') {
        var clockType = widgetConfigs.clock.clockType || 'basicclock';
        entry.clockType = clockType;
        var ccfg = widgetConfigs.clock || {};
        if (clockType !== 'miniclock') {
          if (ccfg.size !== '' && ccfg.size !== null && typeof ccfg.size !== 'undefined') {
            entry.size = ccfg.size;
          }
          if (ccfg.scale !== '' && ccfg.scale !== null && typeof ccfg.scale !== 'undefined') {
            entry.scale = ccfg.scale;
          }
        }
        if (clockType === 'flipclock') {
          entry.showSeconds = Number(ccfg.showSeconds) ? 1 : 0;
          entry.clockFace = ccfg.clockFace || '24';
        }
        if (clockType === 'stationclock') {
          entry.body = ccfg.body || 'RoundBody';
          entry.dial = ccfg.dial || 'GermanStrokeDial';
          entry.hourhand = ccfg.hourhand || 'PointedHourHand';
          entry.minutehand = ccfg.minutehand || 'PointedMinuteHand';
          entry.secondhand = ccfg.secondhand || 'HoleShapedSecondHand';
          entry.boss = ccfg.boss || 'RedBoss';
          entry.minutehandbehavior = ccfg.minutehandbehavior || 'BouncingMinuteHand';
          entry.secondhandbehavior = ccfg.secondhandbehavior || 'OverhastySecondHand';
        }
      }
      if (item.id === 'publictransport') {
        entry.station = widgetConfigs.publictransport.station;
        entry.provider = widgetConfigs.publictransport.provider;
      }
      if (item.id === 'camera') {
        var cameras = _cameraWidgetConfig().cameras;
        if (cameras.length === 1) {
          entry.title = cameras[0].title;
          entry.imageUrl = cameras[0].imageUrl;
          if (cameras[0].videoUrl) {
            entry.videoUrl = cameras[0].videoUrl;
          }
        } else {
          entry.cameras = cameras;
        }
      }
      if (item.id === 'alarmmeldingen') {
        entry.rss = widgetConfigs.alarmmeldingen.rss;
        if (widgetConfigs.alarmmeldingen.filter) {
          entry.filter = widgetConfigs.alarmmeldingen.filter;
        }
      }
      // Add iframe-specific block properties to the widget payload entry
      if (item.id === 'iframe') {
        var icfg = widgetConfigs.iframe || {};
        entry.frameurl = icfg.frameurl || '';
        entry.scrollbars = Number(icfg.scrollbars) === 1;
        if (icfg.height && icfg.height !== '') {
          entry.iframeHeight = parseInt(icfg.height, 10) || 400;
        }
        if (icfg.scaletofit && icfg.scaletofit !== '') {
          entry.scaletofit = parseInt(icfg.scaletofit, 10) || 0;
        }
        if (icfg.aspectratio && icfg.aspectratio !== '') {
          entry.aspectratio = parseFloat(icfg.aspectratio) || 0;
          delete entry.iframeHeight;
        }
        if (Number(icfg.forcerefresh)) {
          entry.forcerefresh = true;
        }
        if (icfg.refresh && icfg.refresh !== '') {
          entry.refresh = parseInt(icfg.refresh, 10) || 300;
        }
      }
      // Add xmltvguide-specific block properties to the widget payload entry
      if (item.id === 'xmltvguide') {
        var xcfg = widgetConfigs.xmltvguide || {};
        entry.xmltvurl = xcfg.xmltvurl || '';
        if (xcfg.channels && xcfg.channels !== '') {
          entry.channels = xcfg.channels.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
        } else {
          entry.channels = [];
        }
        entry.maxitems = parseInt(xcfg.maxitems, 10) || 10;
        entry.layout = parseInt(xcfg.layout, 10) === 1 ? 1 : 0;
        entry.separator = xcfg.separator || '-';
        entry.refresh = parseInt(xcfg.refresh, 10) || 3600;
      }
      payload.push(entry);
    });

    var $save = $('#we-save-btn')
      .prop('disabled', true)
      .text(_t('saving', 'Saving…'));
    $('.we-message').removeClass('text-danger').text('');
    var screenNumber = _activeScreenPayload();

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postWidgetData(
          'js/savewidgets.php',
          {
            widgets: payload,
            settings: configSettings,
            screen: screenNumber,
            blocksOnly: gridMode,
          },
          token
        ).then(function (widgetResult) {
          var widgetRefs = {};
          var widgetWidths = {};
          payload.forEach(function (entry, index) {
            widgetRefs[entry.id] = widgetResult.blockKeys[index];
            widgetWidths[entry.id] = entry.width;
          });

          var includedWidgets = {};
          if (gridMode) {
            var occupied = layoutOrder.map(function (item) {
              return item.grid;
            });
            var gridItems = [];
            layoutOrder.forEach(function (item) {
              if (item.widgetId) {
                if (!selectedWidgets[item.widgetId]) return;
                includedWidgets[item.widgetId] = true;
                gridItems.push({
                  ref: widgetRefs[item.widgetId] || item.ref,
                  grid: $.extend({}, item.grid),
                });
                return;
              }
              gridItems.push({
                ref: item.ref,
                grid: $.extend({}, item.grid),
              });
            });
            payload.forEach(function (entry) {
              if (includedWidgets[entry.id]) return;
              var width = Math.max(
                1,
                Math.min(
                  gridConfig.gridColumns,
                  Math.round(
                    ((entry.width || 3) * gridConfig.gridColumns) / 12
                  )
                )
              );
              var height = Math.max(
                1,
                Math.ceil(
                  ((entry.height || 120) + gridConfig.gap) /
                    (gridConfig.rowHeight + gridConfig.gap)
                )
              );
              var position = _firstFreeGridPosition(
                occupied,
                width,
                height
              );
              occupied.push(position);
              gridItems.push({
                ref: widgetRefs[entry.id],
                grid: position,
              });
            });
            return _postWidgetData(
              'js/savegridlayout.php',
              {
                items: gridItems,
                screen: screenNumber,
                gridColumns: gridConfig.gridColumns,
                rowHeight: gridConfig.rowHeight,
                gap: gridConfig.gap,
                mobileLayout: gridConfig.mobileLayout,
              },
              token
            );
          }
          var layoutItems = [];
          layoutOrder.forEach(function (item) {
            if (item.widgetId) {
              if (!selectedWidgets[item.widgetId]) return;
              includedWidgets[item.widgetId] = true;
              var widgetEntry = {
                ref: widgetRefs[item.widgetId],
                width: widgetWidths[item.widgetId],
              };
              var widgetDims = widgetDimensions[item.widgetId] || {};
              if (widgetDims.height) widgetEntry.height = widgetDims.height;
              layoutItems.push(widgetEntry);
              return;
            }
            var deviceEntry = { ref: item.ref, width: item.width };
            if (item.height) deviceEntry.height = item.height;
            layoutItems.push(deviceEntry);
          });

          payload.forEach(function (entry) {
            if (includedWidgets[entry.id]) return;
            var newEntry = {
              ref: widgetRefs[entry.id],
              width: entry.width,
            };
            if (entry.height) newEntry.height = entry.height;
            layoutItems.push(newEntry);
          });

          return _postWidgetData(
            'js/savelayout.php',
            { items: layoutItems, screen: screenNumber },
            token
          );
        });
      })
      .done(function () {
        $save
          .removeClass('btn-primary')
          .addClass('btn-success')
          .text(_t('saved', 'Saved'));
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : _t('save_failed', 'The widgets could not be saved.');
        $('.we-message').addClass('text-danger').text(message);
        $save.prop('disabled', false).text(_t('save', 'Save'));
      });
  }

  function _postWidgetData(url, payload, token) {
    return $.ajax({
      url: configEditorUrl(url),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      dataType: 'json',
      headers: { 'X-Dashticz-CSRF': token },
    });
  }

  function _esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    open: open,
  };
})();

//# sourceURL=js/widgeteditor.js
