/* global settings columns columns_standby blocks screens language DashticzScreenSwitcher standbyActive */
// eslint-disable-next-line no-unused-vars
var DashticzWidgetEditor = (function () {
  'use strict';

  var catalog = [
    {
      id: 'weather',
      blockKey: 'widget_weather',
      title: 'Weer',
      description: 'Weersverwachting via OpenWeather of Weather Underground.',
      icon: 'fas fa-cloud-sun',
      width: 4,
      height: 120,
    },
    {
      id: 'garbage',
      blockKey: 'widget_garbage',
      title: 'Afval',
      description: 'Aankomende afvalinzamelingen.',
      icon: 'fas fa-trash-alt',
      width: 6,
    },
    {
      id: 'spotify',
      blockKey: 'widget_spotify',
      title: 'Spotify',
      description: 'Spotify Connect-afstandsbediening.',
      icon: 'fab fa-spotify',
      width: 4,
      height: 120,
    },
    {
      id: 'sonarr',
      blockKey: 'widget_sonarr',
      title: 'Sonarr',
      description: 'Aankomende afleveringen uit Sonarr.',
      icon: 'fas fa-tv',
      width: 4,
      height: 120,
    },
    {
      id: 'clock',
      blockKey: 'widget_clock',
      title: 'Klok',
      description: 'Grote klok met datum en weekdag.',
      icon: 'far fa-clock',
      width: 4,
    },
    {
      id: 'calendar',
      blockKey: 'widget_calendar',
      title: 'Kalender (ICS)',
      description: 'Afspraken uit een online ICS-agenda.',
      icon: 'fas fa-calendar-alt',
      width: 4,
      height: 120,
    },
    {
      id: 'secpanel',
      blockKey: 'widget_secpanel',
      title: 'Security panel',
      description: 'Domoticz security panel met pincode.',
      icon: 'fas fa-shield-alt',
      width: 12,
    },
    {
      id: 'publictransport',
      blockKey: 'widget_publictransport',
      title: 'Openbaar vervoer',
      description: 'Vertrektijden van treinen, bus of tram.',
      icon: 'fas fa-train',
      width: 4,
      height: 260,
    },
    {
      id: 'trafficinfo',
      blockKey: 'widget_trafficinfo',
      title: 'Verkeersinfo',
      description: 'ANWB files, werkzaamheden en radars.',
      icon: 'fas fa-car',
      width: 4,
      height: 260,
    },
    {
      id: 'alarmmeldingen',
      blockKey: 'widget_alarmmeldingen',
      title: '112',
      description: 'Nederlandse 112-meldingen (alarmeringen.nl).',
      icon: 'fas fa-bullhorn',
      width: 4,
      height: 160,
    },
    {
      id: 'camera',
      blockKey: 'widget_cameras',
      title: "Camera's",
      description: 'Camera-beeld of MJPEG-stream.',
      icon: 'fas fa-video',
      width: 4,
      height: 320,
    },
    {
      id: 'map',
      blockKey: 'widget_map',
      title: 'Google Maps',
      description: 'Kaart met optioneel verkeer en route.',
      icon: 'fas fa-map-marked-alt',
      width: 4,
      height: 500,
    },
    {
      id: 'longfonds',
      blockKey: 'widget_longfonds',
      title: 'Luchtkwaliteit',
      description: 'Longfonds / RIVM luchtkwaliteit op postcode.',
      icon: 'fas fa-wind',
      width: 4,
      height: 120,
    },
    {
      id: 'moon',
      blockKey: 'widget_moon',
      title: 'Maan',
      description: 'Huidige maanstand.',
      icon: 'fas fa-moon',
      width: 3,
    },
    {
      id: 'news',
      blockKey: 'widget_news',
      title: 'Nieuws',
      description: 'RSS-nieuwsfeed met automatische scroll.',
      icon: 'fas fa-newspaper',
      width: 4,
      height: 240,
    },
  ];

  var _CALENDAR_LANGUAGES = {
    zh_CN: 'Chinese',
    da_DK: 'Danish',
    de_DE: 'Duits',
    en_US: 'Engels',
    es_ES: 'Spaans',
    fi_FI: 'Fins',
    fr_FR: 'Frans',
    hu_HU: 'Hongaars',
    it_IT: 'Italiaans',
    ja_JP: 'Japans',
    lt_LT: 'Litouws',
    nl_NL: 'Nederlands',
    nb_NO: 'Noors',
    pl_PL: 'Pools',
    pt_PT: 'Portugees',
    ro_RO: 'Roemeens',
    ru_RU: 'Russisch',
    sk_SK: 'Slowaaks',
    sl_SL: 'Sloveens',
    sv_SE: 'Zweeds',
    uk_UA: 'Oekraïens',
  };

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
  var weatherProvider = 'openweather';
  var calendarUrl = '';
  var clockType = 'basicclock';
  var publicTransportStation = 'UT';
  var publicTransportProvider = 'treinen';
  var cameraConfigs = [];
  var alarmRss = 'https://www.alarmeringen.nl/feeds/all.rss';
  var alarmFilter = '';
  var widgetConfigs = {};

  function open() {
    _readConfiguredWidgets();
    _buildAndShowModal();
  }

  function _readConfiguredWidgets() {
    selectedWidgets = {};
    widgetDimensions = {};
    layoutOrder = [];
    weatherProvider =
      settings['owm_api'] || !settings['wu_api']
        ? 'openweather'
        : 'wunderground';
    calendarUrl = '';
    clockType = 'basicclock';
    publicTransportStation = 'UT';
    publicTransportProvider = 'treinen';
    cameraConfigs = [{ title: 'Camera 1', imageUrl: '', videoUrl: '' }];
    alarmRss = 'https://www.alarmeringen.nl/feeds/all.rss';
    alarmFilter = '';

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
        garbage_maxitems: _s('garbage_maxitems', '3'),
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
        calendarformat: _s('calendarformat', 'dd DD.MM HH:mm'),
        calendarlanguage: _s('calendarlanguage', 'en_US'),
      },
      secpanel: {
        security_button_icons: _n('security_button_icons'),
        security_panel_lock: _n('security_panel_lock'),
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
    };

    if (typeof columns === 'undefined') return;

    _readManagedLayoutOrder();

    _orderedColumnKeys().forEach(function (columnKey) {
      var column = columns[columnKey];
      if (!column || !Array.isArray(column.blocks)) return;

      column.blocks.forEach(function (reference) {
        if (typeof reference !== 'string') return;
        var item = _catalogItemByBlockKey(reference);
        if (!item) return;

        selectedWidgets[item.id] = true;
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : {};
        widgetDimensions[item.id] = {
          width: parseInt(definition.width, 10) || null,
          height: parseInt(definition.height, 10) || null,
        };
        if (
          item.id === 'weather' &&
          definition.widget_provider === 'wunderground'
        ) {
          weatherProvider = 'wunderground';
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
          calendarUrl = definition.icalurl;
        }
        if (
          item.id === 'clock' &&
          /^(basicclock|stationclock|flipclock|haymanclock|miniclock)$/.test(
            definition.type
          )
        ) {
          clockType = definition.type;
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
            publicTransportStation = definition.station;
          }
          if (typeof definition.provider === 'string') {
            publicTransportProvider = definition.provider;
          }
        }
        if (item.id === 'camera') {
          if (Array.isArray(definition.cameras) && definition.cameras.length) {
            cameraConfigs = definition.cameras.map(function (camera, index) {
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
            cameraConfigs = [
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
            alarmRss = definition.rss;
          }
          if (typeof definition.filter === 'string') {
            alarmFilter = definition.filter;
          }
        }
      });
    });

    if (!cameraConfigs.length) {
      cameraConfigs = [{ title: 'Camera 1', imageUrl: '', videoUrl: '' }];
    }
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
      '<h5 class="modal-title" id="we-title"><i class="fas fa-puzzle-piece me-2" aria-hidden="true"></i>Widgets</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      '<p class="text-muted">Kies de functies die als tegel op scherm 1 moeten staan.</p>' +
      '<div class="we-widget-grid">';

    catalog.forEach(function (item) {
      html += _widgetCardHtml(item);
    });

    html +=
      '</div><div class="we-message" role="status"></div></div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Sluiten</button>' +
      '<button type="button" class="btn btn-primary" id="we-save-btn">Opslaan</button>' +
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
      id === 'news'
    );
  }

  function _widgetCardHtml(item) {
    var selected = !!selectedWidgets[item.id];
    var configBtn = _widgetHasConfig(item.id)
      ? '<button type="button" class="we-config-btn" data-widget-id="' +
        item.id +
        '" title="Instellingen" aria-label="Instellingen voor ' +
        item.title +
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
      item.title +
      '</div><div class="we-widget-description">' +
      item.description +
      '</div></div>' +
      '<div class="we-widget-status">' +
      (selected ? 'Toegevoegd' : 'Klik om toe te voegen') +
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
      '<strong>Camera ' +
      (index + 1) +
      '</strong>' +
      '<button type="button" class="btn btn-sm btn-outline-danger we-camera-remove" aria-label="Camera verwijderen">' +
      '<i class="fas fa-minus" aria-hidden="true"></i></button></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">Naam</label>' +
      '<input type="text" class="form-control form-control-sm we-camera-title" maxlength="100" value="' +
      _esc(camera.title || 'Camera ' + (index + 1)) +
      '"></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">Image URL</label>' +
      '<input type="url" class="form-control form-control-sm we-camera-image" value="' +
      _esc(camera.imageUrl || '') +
      '"></div>' +
      '<div><label class="form-label we-field-label">Video URL (optioneel, MJPEG)</label>' +
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
        '<option value="openweather"' + (weatherProvider === 'openweather' ? ' selected' : '') + '>OpenWeather</option>' +
        '<option value="wunderground"' + (weatherProvider === 'wunderground' ? ' selected' : '') + '>Weather Underground</option>' +
        '</select></div>';
      fields +=
        '<div class="we-weather-group" data-weather-provider="openweather"' +
        (weatherProvider === 'openweather' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('OpenWeather');
      fields += _cfgField('owm_api', lw.owm_api || 'OpenWeather API key', 'text', cfg.owm_api);
      fields += _cfgField('owm_city', lw.owm_city || 'Stad', 'text', cfg.owm_city);
      fields += _cfgField('owm_name', lw.owm_name || 'Weergavenaam', 'text', cfg.owm_name);
      fields += _cfgField('owm_country', lw.owm_country || 'Landcode', 'text', cfg.owm_country);
      fields += _cfgField('owm_lang', lw.owm_lang || 'Taalcode', 'text', cfg.owm_lang, null, lw.owm_lang_help || '');
      fields += _cfgField('owm_cnt', lw.owm_cnt || 'Aantal perioden', 'text', cfg.owm_cnt, null, lw.owm_cnt_help || '');
      fields += _cfgField('owm_days', lw.owm_days || 'Daagse voorspelling', 'checkbox', cfg.owm_days, null, lw.owm_days_help || '');
      fields += _cfgField('owm_min', lw.owm_min || 'Minimumtemperatuur tonen', 'checkbox', cfg.owm_min, null, lw.owm_min_help || '');
      fields += _cfgHeading(lw.display || 'Weergave (OWM)');
      fields += _cfgField('weather_show_rain', lw.show_rain || 'Regen tonen', 'checkbox', cfg.weather_show_rain);
      fields += _cfgField('weather_show_description', lw.show_description || 'Beschrijving tonen', 'checkbox', cfg.weather_show_description);
      fields += _cfgField('weather_show_wind', lw.show_wind || 'Wind tonen', 'checkbox', cfg.weather_show_wind);
      fields += _cfgField('weather_show_gust', lw.show_gust || 'Windstoten tonen', 'checkbox', cfg.weather_show_gust);
      fields += _cfgField('weather_icons', lw.icons || 'Weericonen', 'select', cfg.weather_icons || 'line', iconOpts);
      fields += '</div>';
      fields +=
        '<div class="we-weather-group" data-weather-provider="wunderground"' +
        (weatherProvider === 'wunderground' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('Weather Underground');
      fields += _cfgField('wu_api', lw.wu_api || 'Weather Underground API key', 'text', cfg.wu_api);
      fields += _cfgField('wu_city', lw.wu_city || 'Stad (WU)', 'text', cfg.wu_city);
      fields += _cfgField('wu_name', lw.wu_name || 'Weergavenaam (WU)', 'text', cfg.wu_name);
      fields += _cfgField('wu_country', lw.wu_country || 'Landcode (WU)', 'text', cfg.wu_country);
      fields += '</div>';
      fields += _cfgHeading(lw.shared_display || 'Algemene weergave');
      fields += _cfgField('use_fahrenheit', lw.use_fahrenheit || 'Fahrenheit gebruiken', 'checkbox', cfg.use_fahrenheit);
      fields += _cfgField('use_beaufort', lw.use_beaufort || 'Beaufort gebruiken', 'checkbox', cfg.use_beaufort);
      fields += _cfgField('translate_windspeed', lw.translate_windspeed || 'Windsnelheid vertalen', 'checkbox', cfg.translate_windspeed, null, lw.translate_windspeed_help || '');

    } else if (item.id === 'calendar') {
      var ccal = widgetConfigs.calendar || {};
      fields =
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-calendar-url">ICS-URL</label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-calendar-url" ' +
        'placeholder="https://…/calendar.ics" value="' + _esc(calendarUrl) + '"></div>';
      fields += _cfgField('calendarformat', ll.calendarformat || 'Kalender weergave', 'text', ccal.calendarformat);
      fields += _cfgField('calendarlanguage', ll.calendarlanguage || 'Taal van kalender', 'select', ccal.calendarlanguage, _CALENDAR_LANGUAGES);

    } else if (item.id === 'clock') {
      var ccfg = widgetConfigs.clock || {};
      var bodyOpts = {
        NoBody: 'Geen behuizing',
        SmallWhiteBody: 'Klein wit',
        RoundBody: 'Rond',
        RoundGreenBody: 'Rond groen',
        SquareBody: 'Vierkant',
        ViennaBody: 'Wenen',
      };
      var dialOpts = {
        NoDial: 'Geen wijzerplaat',
        GermanHourStrokeDial: 'Duits (uren)',
        GermanStrokeDial: 'Duits',
        AustriaStrokeDial: 'Oostenrijk',
        SwissStrokeDial: 'Zwitsers',
        ViennaStrokeDial: 'Wenen',
      };
      var hourOpts = {
        PointedHourHand: 'Punt',
        BarHourHand: 'Balk',
        SwissHourHand: 'Zwitsers',
        ViennaHourHand: 'Wenen',
      };
      var minuteOpts = {
        PointedMinuteHand: 'Punt',
        BarMinuteHand: 'Balk',
        SwissMinuteHand: 'Zwitsers',
        ViennaMinuteHand: 'Wenen',
      };
      var secondOpts = {
        NoSecondHand: 'Geen',
        BarSecondHand: 'Balk',
        HoleShapedSecondHand: 'Gat',
        NewHoleShapedSecondHand: 'Gat (nieuw)',
        SwissSecondHand: 'Zwitsers',
      };
      var bossOpts = {
        NoBoss: 'Geen',
        BlackBoss: 'Zwart',
        RedBoss: 'Rood',
        ViennaBoss: 'Wenen',
      };
      var minuteBehOpts = {
        CreepingMinuteHand: 'Kruipend',
        BouncingMinuteHand: 'Stuiterend',
        ElasticBouncingMinuteHand: 'Elastisch',
      };
      var secondBehOpts = {
        CreepingSecondHand: 'Kruipend',
        BouncingSecondHand: 'Stuiterend',
        ElasticBouncingSecondHand: 'Elastisch',
        OverhastySecondHand: 'Haastig',
      };
      var clockFaceOpts = { '24': '24-uurs', '12': '12-uurs' };
      var showSizeScale = clockType !== 'miniclock';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-clock-type">Kloktype</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-clock-type">' +
        _clockOption('basicclock', 'Basic clock') +
        _clockOption('stationclock', 'Stationsklok') +
        _clockOption('flipclock', 'Flipclock') +
        _clockOption('haymanclock', 'Hayman clock') +
        _clockOption('miniclock', 'Miniclock') +
        '</select></div>';

      fields +=
        '<div class="we-clock-size-group"' +
        (showSizeScale ? '' : ' style="display:none"') +
        '>';
      fields += _cfgField('size', 'Grootte (px)', 'text', ccfg.size, null, 'Leeg = kolombreedte');
      fields += _cfgField('scale', 'Schaal', 'text', ccfg.scale, null, 'Bijv. 0.75 (default 1)');
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="flipclock"' +
        (clockType === 'flipclock' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('Flipclock');
      fields += _cfgField('showSeconds', 'Seconden tonen', 'checkbox', ccfg.showSeconds);
      fields += _cfgField('clockFace', 'Wijzerplaat', 'select', ccfg.clockFace || '24', clockFaceOpts);
      fields += _cfgField('hide_seconds', ll.hide_seconds || 'Default: seconden verbergen', 'checkbox', ccfg.hide_seconds);
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="stationclock"' +
        (clockType === 'stationclock' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading('Stationsklok');
      fields += _cfgField('body', 'Behuizing', 'select', ccfg.body || 'RoundBody', bodyOpts);
      fields += _cfgField('dial', 'Wijzerplaat', 'select', ccfg.dial || 'GermanStrokeDial', dialOpts);
      fields += _cfgField('hourhand', 'Uurwijzer', 'select', ccfg.hourhand || 'PointedHourHand', hourOpts);
      fields += _cfgField('minutehand', 'Minutenwijzer', 'select', ccfg.minutehand || 'PointedMinuteHand', minuteOpts);
      fields += _cfgField('secondhand', 'Secondenwijzer', 'select', ccfg.secondhand || 'HoleShapedSecondHand', secondOpts);
      fields += _cfgField('boss', 'As-kap', 'select', ccfg.boss || 'RedBoss', bossOpts);
      fields += _cfgField('minutehandbehavior', 'Minuten-gedrag', 'select', ccfg.minutehandbehavior || 'BouncingMinuteHand', minuteBehOpts);
      fields += _cfgField('secondhandbehavior', 'Seconden-gedrag', 'select', ccfg.secondhandbehavior || 'OverhastySecondHand', secondBehOpts);
      fields += _cfgField('boss_stationclock', ll.boss_stationclock || 'Default as-kap (config)', 'select', ccfg.boss_stationclock || 'RedBoss', bossOpts);
      fields += _cfgField('hide_seconds_stationclock', ll.hide_seconds_stationclock || 'Default: seconden verbergen', 'checkbox', ccfg.hide_seconds_stationclock);
      fields += '</div>';

      fields +=
        '<div class="we-clock-group" data-clock-type="miniclock"' +
        (clockType === 'miniclock' ? '' : ' style="display:none"') +
        '>';
      fields +=
        '<p class="form-text" style="font-size:12px;color:#6c757d">Miniclock heeft geen extra weergave-opties. Stel breedte/hoogte in via de layout editor.</p>';
      fields += '</div>';

    } else if (item.id === 'garbage') {
      var gcfg = widgetConfigs.garbage || {};
      fields += _cfgField('garbage_company', lg.garbage_company || 'Afvalverwerker', 'select', gcfg.garbage_company, _GARBAGE_COMPANIES);
      fields += _cfgField('garbage_zipcode', lg.garbage_zipcode || 'Postcode', 'text', gcfg.garbage_zipcode);
      fields += _cfgField('garbage_street', lg.garbage_street || 'Straatnaam', 'text', gcfg.garbage_street);
      fields += _cfgField('garbage_housenumber', lg.garbage_housenumber || 'Huisnummer', 'text', gcfg.garbage_housenumber);
      fields += _cfgField('garbage_housenumberadd', lg.garbage_housenumberaddition || 'Huisnummertoevoeging', 'text', gcfg.garbage_housenumberadd);
      fields += _cfgField('garbage_maxitems', lg.garbage_maxitems || 'Maximum items', 'text', gcfg.garbage_maxitems);
      fields += _cfgField('garbage_width', lg.garbage_width || 'Breedte', 'text', gcfg.garbage_width);
      fields += _cfgHeading('iCal / Google');
      fields += _cfgField('garbage_icalurl', lg.garbage_icalurl || 'iCal URL', 'text', gcfg.garbage_icalurl);
      fields += _cfgField('google_api_key', lg.google_api_key || 'Google API key', 'text', gcfg.google_api_key);
      fields += _cfgField('garbage_calendar_id', lg.garbage_calendar_id || 'Google Agenda ID', 'text', gcfg.garbage_calendar_id, null, lg.garbage_calendar_id_help || '');
      fields += _cfgHeading('Weergave');
      fields += _cfgField('garbage_hideicon', lg.garbage_hideicon || 'Icoon verbergen', 'checkbox', gcfg.garbage_hideicon);
      fields += _cfgField('garbage_icon_use_colors', lg.garbage_icon_use_colors || 'Kleur voor icoon', 'checkbox', gcfg.garbage_icon_use_colors);
      fields += _cfgField('garbage_use_colors', lg.garbage_use_colors || 'Kleuren gebruiken', 'checkbox', gcfg.garbage_use_colors);
      fields += _cfgField('garbage_use_names', lg.garbage_use_names || 'Namen gebruiken', 'checkbox', gcfg.garbage_use_names);
      fields += _cfgField('garbage_use_cors_prefix', lg.garbage_use_cors_prefix || 'CORS-prefix gebruiken', 'checkbox', gcfg.garbage_use_cors_prefix);

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
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-pt-provider">Provider</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-pt-provider">' +
        _ptOption('treinen', 'Treinen (NL)') +
        _ptOption('ovapi', 'OV API (NL)') +
        _ptOption('drgl', 'DRGL (NL)') +
        _ptOption('irailbe', 'iRail (BE)') +
        _ptOption('delijnbe', 'De Lijn (BE)') +
        '</select></div>';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-pt-station">Station / halte</label>' +
        '<input type="text" class="form-control form-control-sm we-widget-field" id="we-cfg-pt-station" value="' +
        _esc(publicTransportStation) +
        '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">Bijv. UT voor Utrecht Centraal (treinen).</div></div>';

    } else if (item.id === 'trafficinfo') {
      var tcfg = widgetConfigs.trafficinfo || {};
      var lwgt = lng.widgets || {};
      fields += _cfgField('anwb_apikey', lwgt.anwb_apikey || 'ANWB API key', 'text', tcfg.anwb_apikey, null, lwgt.anwb_apikey_help || '');

    } else if (item.id === 'alarmmeldingen') {
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-alarm-rss">RSS-feed</label>' +
        '<input type="url" class="form-control form-control-sm we-widget-field" id="we-cfg-alarm-rss" value="' +
        _esc(alarmRss) +
        '"></div>';
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-alarm-filter">Filter (optioneel)</label>' +
        '<input type="text" class="form-control form-control-sm we-widget-field" id="we-cfg-alarm-filter" value="' +
        _esc(alarmFilter) +
        '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">Kommagescheiden zoektermen, bijv. Amsterdam, Utrecht.</div></div>';

    } else if (item.id === 'camera') {
      fields += '<div id="we-cfg-camera-list">';
      cameraConfigs.forEach(function (camera, index) {
        fields += _cameraRowHtml(camera, index);
      });
      fields +=
        '</div>' +
        '<button type="button" class="btn btn-sm btn-outline-primary" id="we-camera-add">' +
        '<i class="fas fa-plus me-1" aria-hidden="true"></i>Camera toevoegen</button>';

    } else if (item.id === 'map') {
      var mcfg = widgetConfigs.map || {};
      fields += _cfgField('gm_api', ll.gm_api || 'Google Maps API key', 'text', mcfg.gm_api);
      fields += _cfgField('gm_zoomlevel', ll.gm_zoomlevel || 'Zoomniveau', 'text', mcfg.gm_zoomlevel);
      fields += _cfgField('gm_latitude', ll.gm_latitude || 'Breedtegraad', 'text', mcfg.gm_latitude);
      fields += _cfgField('gm_longitude', ll.gm_longitude || 'Lengtegraad', 'text', mcfg.gm_longitude);

    } else if (item.id === 'longfonds') {
      var lcfg = widgetConfigs.longfonds || {};
      fields += _cfgField('longfonds_zipcode', lw.longfonds_zipcode || 'Postcode', 'text', lcfg.longfonds_zipcode);
      fields += _cfgField('longfonds_housenumber', lw.longfonds_housenumber || 'Huisnummer', 'text', lcfg.longfonds_housenumber);

    } else if (item.id === 'moon') {
      var mooncfg = widgetConfigs.moon || {};
      fields += _cfgField('idx_moonpicture', lw.idx_moonpicture || 'IDX moonpicture', 'text', mooncfg.idx_moonpicture, null, lw.idx_moonpicture_help || '');

    } else if (item.id === 'news') {
      var ncfg = widgetConfigs.news || {};
      var lg2 = lng.general || {};
      fields += _cfgField('default_news_url', lg2.default_news_url || 'News URL', 'text', ncfg.default_news_url);
      fields += _cfgField('news_scroll_after', lg2.news_scroll_after || 'Scroll after (seconds)', 'text', ncfg.news_scroll_after);
    }

    return (
      '<div class="modal fade" id="we-config-popup" tabindex="-1" aria-labelledby="we-cfg-title" aria-hidden="true" data-bs-backdrop="static">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title" id="we-cfg-title"><i class="fas fa-cog me-2" aria-hidden="true"></i>Instellingen — ' +
      item.title +
      '</h5>' +
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Sluiten"></button>' +
      '</div>' +
      '<div class="modal-body">' +
      fields +
      '<div class="we-cfg-message" role="status"></div>' +
      '</div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Annuleren</button>' +
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
          { title: 'Camera ' + (index + 1), imageUrl: '', videoUrl: '' },
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
          .text('Camera ' + (index + 1));
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
        weatherProvider = $('#we-cfg-weather-provider').val() || 'openweather';
        widgetConfigs.weather = collected;
      } else if (widgetId === 'calendar') {
        var url = $.trim($('#we-cfg-calendar-url').val() || '');
        if (url && !/^https?:\/\/\S+$/i.test(url)) {
          $('.we-cfg-message').addClass('text-danger').text('Vul een geldige http(s)-ICS-URL in.');
          $('#we-cfg-calendar-url').trigger('focus');
          valid = false;
        } else {
          calendarUrl = url;
          widgetConfigs.calendar = collected;
        }
      } else if (widgetId === 'clock') {
        clockType = $('#we-cfg-clock-type').val() || 'basicclock';
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
        publicTransportProvider = $('#we-cfg-pt-provider').val() || 'treinen';
        publicTransportStation = $.trim($('#we-cfg-pt-station').val() || '') || 'UT';
      } else if (widgetId === 'trafficinfo') {
        widgetConfigs.trafficinfo = collected;
      } else if (widgetId === 'alarmmeldingen') {
        var rss = $.trim($('#we-cfg-alarm-rss').val() || '');
        if (!rss || !/^https?:\/\/\S+$/i.test(rss)) {
          $('.we-cfg-message').addClass('text-danger').text('Vul een geldige http(s)-RSS-URL in.');
          valid = false;
        } else {
          alarmRss = rss;
          alarmFilter = $.trim($('#we-cfg-alarm-filter').val() || '');
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
                'Vul voor camera ' +
                  (index + 1) +
                  ' geldige http(s)-URL(s) in.'
              );
            valid = false;
            return false;
          }
          cameras.push({
            title:
              $.trim($(this).find('.we-camera-title').val() || '') ||
              'Camera ' + (index + 1),
            imageUrl: imageUrl,
            videoUrl: videoUrl,
          });
        });
        if (valid) cameraConfigs = cameras;
      } else if (widgetId === 'map') {
        widgetConfigs.map = collected;
      } else if (widgetId === 'longfonds') {
        widgetConfigs.longfonds = collected;
      } else if (widgetId === 'moon') {
        widgetConfigs.moon = collected;
      } else if (widgetId === 'news') {
        widgetConfigs.news = collected;
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

  function _clockOption(value, label) {
    return (
      '<option value="' +
      value +
      '"' +
      (clockType === value ? ' selected' : '') +
      '>' +
      label +
      '</option>'
    );
  }

  function _ptOption(value, label) {
    return (
      '<option value="' +
      value +
      '"' +
      (publicTransportProvider === value ? ' selected' : '') +
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
      .text(selected ? 'Toegevoegd' : 'Klik om toe te voegen');
  }

  function _save() {
    if (
      selectedWidgets.calendar &&
      calendarUrl &&
      !/^https?:\/\/\S+$/i.test(calendarUrl)
    ) {
      $('.we-message')
        .addClass('text-danger')
        .text('Vul voor Kalender een geldige http(s)-ICS-URL in.');
      return;
    }
    if (
      selectedWidgets.camera &&
      (!cameraConfigs.length ||
        cameraConfigs.some(function (camera) {
          return (
            !/^https?:\/\/\S+$/i.test(camera.imageUrl || '') ||
            (camera.videoUrl &&
              !/^https?:\/\/\S+$/i.test(camera.videoUrl))
          );
        }))
    ) {
      $('.we-message')
        .addClass('text-danger')
        .text("Vul bij Camera's een geldige image-URL in (tandwiel).");
      return;
    }

    // Collect flattened config settings from all widget configs
    var configSettings = {};
    var configWidgets = [
      'weather',
      'clock',
      'garbage',
      'sonarr',
      'spotify',
      'calendar',
      'secpanel',
      'trafficinfo',
      'map',
      'longfonds',
      'moon',
      'news',
    ];
    configWidgets.forEach(function (id) {
      if (widgetConfigs[id]) {
        var cfg = widgetConfigs[id];
        Object.keys(cfg).forEach(function (key) {
          configSettings[key] = cfg[key];
        });
      }
    });

    var payload = [];
    catalog.forEach(function (item) {
      if (!selectedWidgets[item.id]) return;
      var entry = { id: item.id };
      var dimensions = widgetDimensions[item.id] || {};
      entry.width = dimensions.width || item.width;
      if (dimensions.height || item.height) {
        entry.height = dimensions.height || item.height;
      }
      if (item.id === 'weather') entry.provider = weatherProvider;
      if (item.id === 'weather' && widgetConfigs.weather) {
        var wcfg = widgetConfigs.weather;
        entry.showRain = Number(wcfg.weather_show_rain) ? 1 : 0;
        entry.showDescription = Number(wcfg.weather_show_description) ? 1 : 0;
        entry.showWind = Number(wcfg.weather_show_wind) ? 1 : 0;
        entry.showGust = Number(wcfg.weather_show_gust) ? 1 : 0;
        entry.icons = wcfg.weather_icons || 'line';
      }
      if (item.id === 'calendar') entry.icalurl = calendarUrl;
      if (item.id === 'clock') {
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
        entry.station = publicTransportStation;
        entry.provider = publicTransportProvider;
      }
      if (item.id === 'camera') {
        if (cameraConfigs.length === 1) {
          entry.title = cameraConfigs[0].title;
          entry.imageUrl = cameraConfigs[0].imageUrl;
          if (cameraConfigs[0].videoUrl) {
            entry.videoUrl = cameraConfigs[0].videoUrl;
          }
        } else {
          entry.cameras = cameraConfigs;
        }
      }
      if (item.id === 'alarmmeldingen') {
        entry.rss = alarmRss;
        if (alarmFilter) entry.filter = alarmFilter;
      }
      payload.push(entry);
    });

    var $save = $('#we-save-btn').prop('disabled', true).text('Opslaan…');
    $('.we-message').removeClass('text-danger').text('');
    var screenNumber = _activeScreenPayload();

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postWidgetData(
          'js/savewidgets.php',
          { widgets: payload, settings: configSettings, screen: screenNumber },
          token
        ).then(function (widgetResult) {
          var widgetRefs = {};
          var widgetWidths = {};
          payload.forEach(function (entry, index) {
            widgetRefs[entry.id] = widgetResult.blockKeys[index];
            widgetWidths[entry.id] = entry.width;
          });

          var includedWidgets = {};
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
        $save.removeClass('btn-primary').addClass('btn-success').text('Opgeslagen');
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : 'De widgets konden niet worden opgeslagen.';
        $('.we-message').addClass('text-danger').text(message);
        $save.prop('disabled', false).text('Opslaan');
      });
  }

  function _postWidgetData(url, payload, token) {
    return $.ajax({
      url: url,
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
