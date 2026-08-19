/* global settings columns columns_standby blocks screens standby_screen language DashticzScreenSwitcher standbyActive DashticzLayoutEditor DT_function DashticzDeviceEditor */
// eslint-disable-next-line no-unused-vars
var DashticzWidgetEditor = (function () {
  'use strict';

  var customImageListPromise = null;
  // Snapshot of selectedWidgets (which widget ids are on-screen) taken when
  // this popup opened, only while the Layout Editor was already open
  // underneath it. Used by _save() to graft newly checked widgets into
  // that still-open editor instead of persisting immediately (see
  // _graftIntoLayoutEditor). Null whenever the Layout Editor isn't active.
  var layoutEditorBaseline = null;

  var catalog = [
    {
      id: 'weather',
      blockKey: 'widget_weather',
      title: 'Weather',
      description: 'Weather forecast via OpenWeather or Weather Underground.',
      icon: 'fas fa-cloud-sun',
      width: 3,
      height: 120,
    },
    {
      id: 'garbage',
      blockKey: 'widget_garbage',
      title: 'Garbage',
      description: 'Upcoming waste collections.',
      icon: 'fas fa-trash-alt',
      width: 3,
      height: 120,
    },
    {
      id: 'spotify',
      blockKey: 'widget_spotify',
      title: 'Spotify',
      description: 'Spotify Connect remote control.',
      icon: 'fab fa-spotify',
      width: 3,
      height: 120,
    },
    {
      id: 'sonarr',
      blockKey: 'widget_sonarr',
      title: 'Sonarr',
      description: 'Upcoming episodes from Sonarr.',
      icon: 'fas fa-tv',
      width: 3,
      height: 120,
    },
    {
      id: 'clock',
      blockKey: 'widget_clock',
      title: 'Clock',
      description: 'Large clock with date and weekday.',
      icon: 'far fa-clock',
      width: 3,
    },
    {
      id: 'calendar',
      blockKey: 'widget_calendar',
      title: 'Calendar (ICS)',
      description: 'Events from an online ICS calendar.',
      icon: 'fas fa-calendar-alt',
      width: 3,
      height: 120,
    },
    {
      id: 'secpanel',
      blockKey: 'widget_secpanel',
      title: 'Security panel',
      description: 'Domoticz security panel with PIN code.',
      icon: 'fas fa-shield-alt',
      width: 6,
    },
    {
      id: 'publictransport',
      blockKey: 'widget_publictransport',
      title: 'Public transport',
      description: 'Departure times for trains, buses or trams.',
      icon: 'fas fa-train',
      width: 3,
      height: 160,
    },
    {
      id: 'trafficinfo',
      blockKey: 'widget_trafficinfo',
      title: 'Traffic information',
      description: 'ANWB traffic jams, roadworks and speed cameras.',
      icon: 'fas fa-car',
      width: 3,
      height: 160,
    },
    {
      id: 'alarmmeldingen',
      blockKey: 'widget_alarmmeldingen',
      title: '112',
      description: 'Dutch emergency alerts from alarmeringen.nl.',
      icon: 'fas fa-bullhorn',
      width: 3,
      height: 160,
    },
    {
      id: 'camera',
      blockKey: 'widget_cameras',
      title: 'Cameras',
      description: 'Camera image or MJPEG stream.',
      icon: 'fas fa-video',
      width: 3,
      height: 200,
    },
    {
      id: 'map',
      blockKey: 'widget_map',
      title: 'Google Maps',
      description: 'Map with optional traffic and directions.',
      icon: 'fas fa-map-marked-alt',
      width: 3,
      height: 400,
    },
    {
      id: 'longfonds',
      blockKey: 'widget_longfonds',
      title: 'Air quality',
      description: 'World Air Quality Index (WAQI) for a city.',
      icon: 'fas fa-wind',
      width: 3,
      // The WAQI embed scales to the block's actual rendered width, then sets
      // its own height to width * aspectratio (default layout 'large': 1.3),
      // so a short default clips it. Size for that instead of a fixed badge.
      height: 400,
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
      width: 3,
      height: 200,
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
      width: 3,
      height: 300,
    },
    // Radio widget: a graphical front end for the existing Streamplayer
    // component (js/components/streamplayer.js). That component is matched
    // directly by its registered name (see Dashticz._mount in dashticz.js),
    // so the block MUST be keyed 'streamplayer' — not a 'widget_' key like
    // the other catalog entries — to stay compatible with hand-written
    // _STREAMPLAYER_TRACKS-based configs that already use that key.
    {
      id: 'radio',
      blockKey: 'streamplayer',
      title: 'Radio',
      description: 'Internet radio stream player (Streamplayer).',
      icon: 'fas fa-broadcast-tower',
      width: 3,
      height: 120,
    },
    // Domoticz log widget: DT_log (js/components/log.js) is matched directly by
    // its registered component name ('log'), exactly like Streamplayer/Radio
    // above, so the block MUST be keyed 'log' to stay compatible with the
    // documented columns[n] = {blocks: ['log']} shorthand (blocks.js's
    // convertBlock() merges blocks['log'] into that bare string reference).
    {
      id: 'log',
      blockKey: 'log',
      title: 'Domoticz log',
      description: 'Scrolling view of the Domoticz event log.',
      icon: 'fas fa-align-left',
      width: 12,
      // Grid mode only: an 8x8 grid cell (in grid columns/rows, not px) reads
      // better than the full-width default this widget's column-mode width
      // (12) would otherwise scale to. Column-mode width stays 12 (full
      // width), matching every other widget's column-mode default.
      gridDefaultSize: { width: 8, height: 8 },
    },
    // Sunrise/sunset widget: DT_simpleblock dispatches 'sunrise' by block type,
    // and blocks.js's convertBlock() derives that type from the bare 'sunrise'
    // key automatically (see docs: columns[1]['blocks'] = ['sunrise']), so this
    // block is also keyed by its plain name rather than a 'widget_' prefix.
    {
      id: 'sunrise',
      blockKey: 'sunrise',
      title: 'Sunrise / Sunset',
      description: "Today's sunrise and sunset time.",
      icon: 'fas fa-sun',
      width: 2,
    },
    // OWM widget: one of 24 OpenWeatherMap layouts (DT_owmwidget, js/components/owmwidget.js).
    {
      id: 'owm',
      blockKey: 'widget_owmwidget',
      title: 'OpenWeatherMap',
      description: 'OpenWeatherMap widget with 24 selectable layouts.',
      icon: 'fas fa-cloud-sun-rain',
      width: 6,
      height: 240,
    },
    // Timegraph widget: moving time chart of one or more Domoticz device values
    // (DT_timegraph, js/components/timegraph.js).
    {
      id: 'timegraph',
      blockKey: 'widget_timegraph',
      title: 'Timegraph',
      description: 'Moving time chart of one or more Domoticz device values.',
      icon: 'fas fa-chart-line',
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

  /* Back button for the widget picker modal, left of Close/Save - reopens
     the Screen Editor's Add items tile menu instead of just closing.
     Matches js/deviceeditor.js's own _backButtonHtml()/_wireBackButton(). */
  function _backButtonHtml() {
    var backLabel = (typeof language !== 'undefined' && language.settings && language.settings.back) || 'Back';
    return '<button type="button" class="btn btn-secondary we-back-btn">' +
      '<i class="fas fa-arrow-left me-1" aria-hidden="true"></i>' + backLabel + '</button>';
  }

  /* Tracks the click in a closure variable rather than $popup.data(), since
     a $(this).remove() cleanup handler racing ahead of this one would clear
     data stored on the element (jQuery's documented behavior for .remove())
     depending on handler registration order. */
  function _wireBackButton(popupId) {
    var popup = document.getElementById(popupId);
    var $popup = $(popup);
    var backRequested = false;
    $popup.on('click', '.we-back-btn', function () {
      backRequested = true;
      window.bootstrap.Modal.getInstance(popup).hide();
    });
    $popup.one('hidden.bs.modal', function () {
      if (
        backRequested &&
        typeof DT_simpleblock !== 'undefined' &&
        typeof DT_simpleblock.openAddMenu === 'function'
      ) {
        DT_simpleblock.openAddMenu();
      }
    });
  }

  function _widgetTitle(item) {
    return _t(item.id + '_title', item.title);
  }

  function _widgetConfigDisplayName(item) {
    var options = widgetBlockOptions[item.id] || {};
    var rows = options.customFields || [];
    for (var i = 0; i < rows.length; i++) {
      if (_normaliseCustomFieldName(rows[i].field) !== 'title') continue;
      var configuredTitle = $.trim(String(rows[i].setting || ''));
      if (configuredTitle) return configuredTitle;
    }
    return _widgetTitle(item);
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
  var widgetBlockOptions = {};
  var gridMode = false;
  var gridConfig = null;
  var gridPositions = {};
  var widgetBlockRefs = {};

  var commonManagedWidgetProperties = {
    type: true, width: true, height: true, grid: true, idx: true, subidx: true,
    icon: true, hide_data: true, last_update: true, hide_title: true,
    text_alignment: true, text_align: true,
  };
  var managedWidgetPropertiesById = {
    weather: {
      widget_provider: true, showRain: true, showDescription: true,
      showWind: true, showGust: true, icons: true,
    },
    calendar: { icalurl: true, calendars: true, maxitems: true },
    garbage: { maxitems: true, maxdays: true },
    clock: {
      scale: true, showSeconds: true, clockFace: true, body: true,
      dial: true, hourhand: true, minutehand: true, secondhand: true, boss: true,
      minutehandbehavior: true, secondhandbehavior: true,
    },
    publictransport: { station: true, provider: true },
    camera: { imageUrl: true, videoUrl: true, cameras: true },
    alarmmeldingen: { rss: true, filter: true },
    iframe: {
      frameurl: true, scrollbars: true, scaletofit: true, aspectratio: true,
      forcerefresh: true, refresh: true,
    },
    xmltvguide: {
      xmltvurl: true, channels: true, maxitems: true, layout: true,
      separator: true, refresh: true,
    },
    // tracks is edited through the dedicated station-list UI; without this it
    // would also show up as a raw JSON row in the generic Custom fields list.
    radio: { tracks: true },
    log: { scrolltimeout: true, ascending: true, aspectratio: true, maxitems: true },
    owm: { apikey: true, layout: true, city: true, country: true },
    // idx is already a common managed property (main Domoticz device); values
    // is edited through the dedicated repeater UI below.
    timegraph: {
      duration: true, xTicks: true, yTicks: true, xLabels: true,
      animation: true, lineTension: true, pointRadius: true, values: true,
    },
  };

  function _isManagedWidgetProperty(item, property) {
    if (commonManagedWidgetProperties[property]) return true;
    var widgetProperties = managedWidgetPropertiesById[item.id] || {};
    return widgetProperties[property] === true;
  }
  var protectedCustomWidgetProperties = {
    type: true, id: true, key: true, width: true, height: true, grid: true,
    idx: true, subidx: true, icon: true, hide_data: true, last_update: true,
    hide_title: true, text_alignment: true, text_align: true, custom_fields: true,
    c: true,
    __proto__: true, prototype: true, constructor: true,
  };

  function _isProtectedCustomWidgetProperty(property) {
    var key = String(property || '').toLowerCase();
    return (
      key === '__proto__' ||
      key === 'prototype' ||
      key === 'constructor' ||
      Object.prototype.hasOwnProperty.call(protectedCustomWidgetProperties, key)
    );
  }

  function _usesExplicitEditorDefaultIcon(item) {
    return item && (item.id === 'iframe' || item.id === 'sunrise');
  }

  function _defaultWidgetBlockOptions(item) {
    var explicitDefaultIcon = _usesExplicitEditorDefaultIcon(item)
      ? item.icon
      : null;
    return {
      icon: true,
      // iframe and Sunrise historically rendered without an icon when an old
      // CONFIG.js omitted `icon`. New Editor-created widgets keep their newer
      // appearance by persisting the catalog icon explicitly instead.
      iconValue: explicitDefaultIcon,
      hide_data: false,
      last_update: false,
      show_title: true,
      customFields: [{ field: 'title', setting: '', system: true }],
      preservedFields: {},
    };
  }

  function _fontIconClass($icon) {
    if (!$icon || !$icon.length) return '';
    return String($icon.attr('class') || '')
      .split(/\s+/)
      .filter(function (className) {
        return /^(?:fa[brsld]?|fa-|wi(?:-|$))/.test(className);
      })
      .join(' ');
  }

  function _effectiveWidgetConfigIcon(item, options) {
    if (options.iconValue) return options.iconValue;
    var reference = widgetBlockRefs[item.id] || item.blockKey;
    var referenceText = String(reference || '');
    var $mount = $('[data-grid-block]').filter(function () {
      return String($(this).attr('data-grid-block')) === referenceText;
    }).first();
    if (!$mount.length) {
      $mount = $('[data-id]').filter(function () {
        return String($(this).attr('data-id')) === referenceText;
      }).first();
    }
    return _fontIconClass($mount.find('.col-icon em, .sunrise-header em').first()) ||
      item.icon || 'fas fa-question';
  }

  function _loadCustomImages() {
    if (customImageListPromise) return customImageListPromise;
    customImageListPromise = $.getJSON('js/listcustomicons.php').then(function (data) {
      return data && Array.isArray(data.images) ? data.images : [];
    });
    customImageListPromise.fail(function () {
      customImageListPromise = null;
    });
    return customImageListPromise;
  }

  function _renderCustomImageGrid($picker, images, selectedPath) {
    var $grid = $picker.find('.dt-custom-image-grid').empty();
    $picker.find('.dt-custom-image-status').toggle(!images.length).text(
      images.length ? '' : _t('no_custom_images', 'No custom images found.')
    );
    images.forEach(function (imagePath) {
      var filename = String(imagePath).replace(/^custom\//, '');
      var $button = $('<button type="button" class="dt-custom-image-option"></button>')
        .attr('data-image-path', imagePath)
        .attr('title', filename)
        .toggleClass('is-selected', String(selectedPath || '') === imagePath);
      $('<img class="dt-custom-image-thumb" loading="lazy" alt="">')
        .attr('src', 'img/' + imagePath)
        .appendTo($button);
      $('<span class="dt-custom-image-name"></span>').text(filename).appendTo($button);
      $grid.append($button);
    });
  }

  function _settingToText(value) {
    if (value !== null && typeof value === 'object') {
      try { return JSON.stringify(value); } catch (ignore) { return ''; }
    }
    return String(value);
  }

  function _hydrateWidgetBlockOptions(item, definition) {
    var options = _defaultWidgetBlockOptions();
    var legacyImplicitIcon =
      _usesExplicitEditorDefaultIcon(item) &&
      typeof definition.icon === 'undefined';
    options.icon = (typeof definition.image === 'string' && definition.image !== '') ||
      (!legacyImplicitIcon && definition.icon !== '');
    options.iconValue = typeof definition.icon === 'string' && definition.icon !== ''
      ? definition.icon
      : null;
    options.hide_data = definition.hide_data === true;
    options.last_update = definition.last_update === true;
    options.show_title = definition.hide_title !== true;
    options.customFields = [{
      field: 'title',
      setting: typeof definition.title === 'string' ? definition.title : _widgetTitle(item),
      system: true,
    }];
    if (typeof definition.image === 'string' && definition.image !== '') {
      options.customFields.push({ field: 'image', setting: definition.image });
    } else if (options.iconValue) {
      options.customFields.push({ field: 'icon', setting: options.iconValue });
    }
    if (Object.prototype.hasOwnProperty.call(definition, 'c')) {
      options.preservedFields.c = definition.c;
    }
    if (item.id === 'calendar' && !definition.icalurl && Array.isArray(definition.calendars)) {
      var legacyAdjustments = {};
      definition.calendars.forEach(function (legacy) {
        var calendar = legacy && legacy.calendar ? legacy.calendar : {};
        ['adjustTZ', 'adjustAllDayTZ'].forEach(function (property) {
          if (
            typeof definition[property] === 'undefined' &&
            typeof legacyAdjustments[property] === 'undefined' &&
            typeof calendar[property] !== 'undefined'
          ) {
            legacyAdjustments[property] = calendar[property];
          }
        });
      });
      Object.keys(legacyAdjustments).forEach(function (property) {
        options.customFields.push({
          field: property,
          setting: _settingToText(legacyAdjustments[property]),
        });
      });
    }
    Object.keys(definition || {}).forEach(function (property) {
      // Editor-managed properties belong to the regular widget payload, never
      // to custom_fields. This also filters stale/legacy copies of checkbox
      // properties such as icon, hide_data, last_update and hide_title.
      if (
        _isManagedWidgetProperty(item, property) ||
        property === 'title' ||
        property === 'image' ||
        _isProtectedCustomWidgetProperty(property) ||
        /^_dashticz/.test(property)
      ) return;
      options.customFields.push({
        field: property,
        setting: _settingToText(definition[property]),
      });
    });
    widgetBlockOptions[item.id] = options;
  }

  function _ensureWidgetSystemFields(item, options) {
    options.customFields = (options.customFields || []).map(function (row) {
      return $.extend({}, row);
    });
    var titleRow = null;
    var iconRow = null;
    options.customFields.forEach(function (row) {
      var field = _normaliseCustomFieldName(row.field);
      if (field === 'title') titleRow = row;
      if (field === 'icon' || field === 'image') iconRow = row;
    });
    if (!titleRow) {
      titleRow = { field: 'title', setting: _widgetTitle(item), system: true };
      options.customFields.unshift(titleRow);
    }
    titleRow.system = true;
    if (!iconRow) {
      var effectiveIcon = _effectiveWidgetConfigIcon(item, options);
      options.customFields.splice(1, 0, {
        field: 'icon',
        setting: effectiveIcon,
        generated: !options.iconValue,
      });
    }
  }

  function _normaliseCustomFieldName(value) {
    value = $.trim(String(value || '')).replace(/[\s-]+/g, '_');
    if (value) value = value.charAt(0).toLowerCase() + value.slice(1);
    return value;
  }

  function _parseCustomSetting(value) {
    var text = $.trim(String(value || ''));
    if (text === 'true') return { valid: true, value: true };
    if (text === 'false') return { valid: true, value: false };
    if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
      return { valid: true, value: Number(text) };
    }
    if (/^[\[{]/.test(text)) {
      try {
        var parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          return { valid: true, value: parsed };
        }
      } catch (ignore) { /* validation message is shown below */ }
      return { valid: false };
    }
    return { valid: true, value: text };
  }

  function _encodeCustomSettingValue(value) {
    if (Array.isArray(value)) {
      return value.map(_encodeCustomSettingValue);
    }
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      var keys = Object.keys(value);
      if (!keys.length) return { __dashticz_empty_object__: true };
      var encoded = {};
      keys.forEach(function (key) {
        encoded[key] = _encodeCustomSettingValue(value[key]);
      });
      return encoded;
    }
    return value;
  }

  function _defaultTimegraphValueRow() {
    return { idx: '', value: '', label: '' };
  }

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

  function _defaultRadioTracks() {
    // Mirrors DT_streamplayer's own built-in default (js/components/streamplayer.js),
    // so a brand new Radio widget previews the same stations it will actually play
    // when no _STREAMPLAYER_TRACKS global is defined.
    if (
      typeof window !== 'undefined' &&
      Array.isArray(window._STREAMPLAYER_TRACKS) &&
      window._STREAMPLAYER_TRACKS.length
    ) {
      return window._STREAMPLAYER_TRACKS.map(function (track) {
        return { name: track.name || '', file: track.file || '' };
      });
    }
    return [
      { name: 'Q-music', file: 'http://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3' },
      { name: 'Slam! NonStop', file: 'http://stream.radiocorp.nl/web10_mp3' },
      { name: '100%NL', file: 'http://stream.100p.nl/100pctnl.mp3' },
      { name: 'NPO Radio 1', file: 'http://icecast.omroep.nl/radio1-bb-mp3' },
    ];
  }

  function _radioWidgetConfig() {
    if (!widgetConfigs.radio) {
      widgetConfigs.radio = { tracks: _defaultRadioTracks() };
    } else if (
      !Array.isArray(widgetConfigs.radio.tracks) ||
      !widgetConfigs.radio.tracks.length
    ) {
      widgetConfigs.radio.tracks = _defaultRadioTracks();
    }
    return widgetConfigs.radio;
  }

  function _defaultCalendarSource(index) {
    return {
      name: _t('calendar_default_name', 'Calendar') + ' ' + (index + 1),
      ics: '',
      color: 'blue',
    };
  }

  function _normaliseCalendarSources(icalurl, legacyCalendars) {
    var sources = [];
    if (typeof icalurl === 'string') {
      if ($.trim(icalurl)) {
        var single = _defaultCalendarSource(0);
        single.name = _t('calendar_default_name', 'Calendar');
        single.ics = icalurl;
        single.color = 'white';
        sources.push(single);
      }
    } else if (icalurl && typeof icalurl === 'object' && !Array.isArray(icalurl)) {
      Object.keys(icalurl).forEach(function (name) {
        var source = icalurl[name];
        if (typeof source === 'string') source = { ics: source };
        if (!source || typeof source !== 'object') return;
        sources.push({
          name: name,
          ics: typeof source.ics === 'string' ? source.ics : '',
          color: typeof source.color === 'string' && source.color
            ? source.color
            : 'white',
        });
      });
    } else if (Array.isArray(legacyCalendars)) {
      legacyCalendars.forEach(function (legacy, index) {
        var definition = legacy && legacy.calendar ? legacy.calendar : {};
        if (!definition.icalurl) return;
        var source = _defaultCalendarSource(index);
        source.ics = definition.icalurl;
        source.color = legacy.color || 'white';
        sources.push(source);
      });
    }
    return sources.length ? sources : [_defaultCalendarSource(0)];
  }

  function _calendarWidgetConfig() {
    if (!widgetConfigs.calendar) widgetConfigs.calendar = {};
    if (!Array.isArray(widgetConfigs.calendar.sources)) {
      widgetConfigs.calendar.sources = _normaliseCalendarSources(
        widgetConfigs.calendar.icalurl
      );
      delete widgetConfigs.calendar.icalurl;
    }
    if (!widgetConfigs.calendar.sources.length) {
      widgetConfigs.calendar.sources.push(_defaultCalendarSource(0));
    }
    return widgetConfigs.calendar;
  }

  function _calendarSourcesObject(sources) {
    var result = Object.create(null);
    (sources || []).forEach(function (source) {
      result[source.name] = {
        ics: source.ics,
        color: source.color || 'white',
      };
    });
    return result;
  }

  function open() {
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _readConfiguredWidgets();
    _buildAndShowModal();
  }

  function openConfig(widgetId, options) {
    options = options || {};
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _readConfiguredWidgets();
    if (options.draft) {
      if (options.draft.widgetConfig) {
        widgetConfigs[widgetId] = $.extend(true, {}, options.draft.widgetConfig);
      }
      if (options.draft.blockOptions) {
        widgetBlockOptions[widgetId] = $.extend(true, {}, options.draft.blockOptions);
      }
      selectedWidgets[widgetId] = true;
    }
    _openConfigModal(widgetId, options);
  }

  /** Open a widget config directly from Layout Editor and persist only widget
   * blocks/settings. Layout data is intentionally untouched until Layout Editor
   * itself is saved. */
  function openLayoutConfig(widgetId) {
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _readConfiguredWidgets();
    _openConfigModal(widgetId, {
      onApply: function () {
        return _saveConfigOnly();
      },
    });
  }

  function _readConfiguredWidgets() {
    selectedWidgets = {};
    widgetDimensions = {};
    layoutOrder = [];
    widgetBlockOptions = {};
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
        sources: [_defaultCalendarSource(0)],
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
        waqi_city: _s('waqi_city'),
        waqi_layout: _s('waqi_layout', 'large'),
      },
      moon: {
        idx_moonpicture: _s('idx_moonpicture'),
      },
      news: {
        default_news_url: _s('default_news_url', 'https://www.nu.nl/rss/Algemeen'),
        news_scroll_after: _s('news_scroll_after', '7'),
      },
      // iframe widget block properties (block-specific, not global config settings)
      // scaletofit/aspectratio default to empty: an iframe with neither set simply
      // fills the tile's actual width/height (see DT_frame.run in frame.js), so a
      // newly added iframe widget "just works" without users needing to guess the
      // embedded page's design width. Existing saved blocks that already have
      // these properties keep their explicit values (see the hydration below).
      iframe: {
        frameurl: '',
        height: '',
        scrollbars: 1,
        scaletofit: '',
        aspectratio: '',
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
      // radio widget: stations are block-specific (blocks['streamplayer'].tracks),
      // not global settings; a legacy _STREAMPLAYER_TRACKS global is only used
      // as the initial preview when no block-level tracks exist yet.
      radio: {
        tracks: _defaultRadioTracks(),
      },
      // Domoticz log widget block properties. height/aspectratio stay empty by
      // default so Dashticz keeps its own automatic sizing (see dashticz.js
      // renderBlock: aspectratio wins over a fixed height when both are set).
      log: {
        height: '',
        aspectratio: '',
        scrolltimeout: '60',
        ascending: 1,
        maxitems: '',
      },
      // OWM widget block properties. apikey/city/country stay empty by default
      // so DT_owmwidget falls back to the global config['owm_api']/owm_city/
      // owm_country settings instead of a block-level override.
      owm: {
        apikey: '',
        layout: '11',
        city: '',
        country: '',
      },
      // Timegraph widget block properties.
      timegraph: {
        idx: '',
        height: '',
        duration: '300',
        xTicks: '10',
        yTicks: '5',
        xLabels: 1,
        animation: '0',
        lineTension: '0.1',
        pointRadius: '1',
        values: [_defaultTimegraphValueRow()],
      },
    };

    if (gridMode) {
      _readGridConfiguredWidgets();
      _cameraWidgetConfig();
      _radioWidgetConfig();
      _captureLayoutEditorBaseline();
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
        _hydrateWidgetBlockOptions(item, definition);
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
        if (item.id === 'calendar') {
          widgetConfigs.calendar.sources = _normaliseCalendarSources(
            definition.icalurl,
            definition.calendars
          );
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
        // Hydrate radio (Streamplayer) stations from an existing block definition.
        // Backward compatible: a block without its own `tracks` (relying on the
        // legacy _STREAMPLAYER_TRACKS global) still shows that global as a preview.
        if (item.id === 'radio' && Array.isArray(definition.tracks)) {
          widgetConfigs.radio.tracks = definition.tracks.map(function (track) {
            return {
              name: (track && track.name) || '',
              file: (track && track.file) || '',
            };
          });
        }
        // Hydrate Domoticz log settings from an existing block definition
        if (item.id === 'log') {
          _hydrateLogWidgetConfig(definition);
        }
        // Hydrate OWM widget settings from an existing block definition
        if (item.id === 'owm') {
          _hydrateOwmWidgetConfig(definition);
        }
        // Hydrate Timegraph widget settings from an existing block definition
        if (item.id === 'timegraph') {
          _hydrateTimegraphWidgetConfig(definition);
        }
      });
    });

    _cameraWidgetConfig();
    _radioWidgetConfig();
    _captureLayoutEditorBaseline();
  }

  /* Snapshot of which widget ids are already on-screen, taken only while
     the Layout Editor was already open underneath this popup. Used by
     _save() to graft newly checked widgets into that still-open editor
     instead of persisting immediately (see _graftIntoLayoutEditor). */
  function _captureLayoutEditorBaseline() {
    layoutEditorBaseline =
      typeof DashticzLayoutEditor !== 'undefined' &&
      DashticzLayoutEditor.isActive &&
      DashticzLayoutEditor.isActive()
        ? Object.keys(selectedWidgets).filter(function (id) {
            return selectedWidgets[id];
          })
        : null;
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
      waqi: 'longfonds',
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
      log: 'log',
      sunrise: 'sunrise',
      owmwidget: 'owm',
      timegraph: 'timegraph',
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
          // Never read a saved height back in here: _buildWidgetPayloadEntry
          // resends this on every save (including a save that only touches a
          // different widget's config), so a height read back from a widget
          // with no way to edit it here (e.g. camera) - or read once and then
          // left stale after the user clears its own height field (iframe/
          // log/timegraph, see their entry.*Height handling further down) -
          // got silently reinstated forever with no way to remove it (#100
          // follow-up). Grid mode only keeps a height a widget's own field
          // explicitly (re)sets on this save.
          height: null,
        };
        _hydrateGridWidget(item, definition);
        _hydrateWidgetBlockOptions(item, definition);
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
      widgetConfigs.calendar.sources = _normaliseCalendarSources(
        definition.icalurl,
        definition.calendars
      );
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
    } else if (item.id === 'radio' && Array.isArray(definition.tracks)) {
      // Backward compatible: a block without its own `tracks` (relying on the
      // legacy _STREAMPLAYER_TRACKS global) keeps showing that global as a preview.
      widgetConfigs.radio.tracks = definition.tracks.map(function (track) {
        return {
          name: (track && track.name) || '',
          file: (track && track.file) || '',
        };
      });
    } else if (item.id === 'log') {
      _hydrateLogWidgetConfig(definition);
    } else if (item.id === 'owm') {
      _hydrateOwmWidgetConfig(definition);
    } else if (item.id === 'timegraph') {
      _hydrateTimegraphWidgetConfig(definition);
    }
  }

  // Hydrate Domoticz log settings (blocks['log']) from an existing block definition.
  function _hydrateLogWidgetConfig(definition) {
    widgetConfigs.log.height =
      typeof definition.height !== 'undefined' ? String(definition.height) : '';
    widgetConfigs.log.aspectratio =
      typeof definition.aspectratio !== 'undefined' ? String(definition.aspectratio) : '';
    widgetConfigs.log.scrolltimeout =
      typeof definition.scrolltimeout !== 'undefined' ? String(definition.scrolltimeout) : '60';
    widgetConfigs.log.ascending = definition.ascending === false ? 0 : 1;
    widgetConfigs.log.maxitems =
      typeof definition.maxitems !== 'undefined' ? String(definition.maxitems) : '';
  }

  // Hydrate OWM widget settings (blocks['widget_owmwidget']) from an existing block definition.
  // apikey/city/country stay empty unless the block explicitly overrides the
  // global config['owm_api']/owm_city/owm_country settings.
  function _hydrateOwmWidgetConfig(definition) {
    widgetConfigs.owm.apikey =
      typeof definition.apikey === 'string' ? definition.apikey : '';
    widgetConfigs.owm.layout =
      typeof definition.layout !== 'undefined' ? String(definition.layout) : '11';
    widgetConfigs.owm.city =
      typeof definition.city === 'string' ? definition.city : '';
    widgetConfigs.owm.country =
      typeof definition.country === 'string' ? definition.country : '';
  }

  // Hydrate Timegraph widget settings (blocks['widget_timegraph']) from an existing block definition.
  function _hydrateTimegraphWidgetConfig(definition) {
    widgetConfigs.timegraph.idx =
      typeof definition.idx !== 'undefined' ? String(definition.idx) : '';
    widgetConfigs.timegraph.height =
      typeof definition.height !== 'undefined' ? String(definition.height) : '';
    ['duration', 'xTicks', 'yTicks', 'animation', 'lineTension', 'pointRadius'].forEach(
      function (property) {
        if (typeof definition[property] !== 'undefined') {
          widgetConfigs.timegraph[property] = String(definition[property]);
        }
      }
    );
    widgetConfigs.timegraph.xLabels = definition.xLabels === false ? 0 : 1;
    if (Array.isArray(definition.values) && definition.values.length) {
      widgetConfigs.timegraph.values = definition.values.map(function (value) {
        if (typeof value === 'string') {
          return { idx: '', value: value, label: '' };
        }
        value = value || {};
        return {
          idx: typeof value.idx !== 'undefined' ? String(value.idx) : '',
          value: typeof value.value === 'string' ? value.value : '',
          label: typeof value.label === 'string' ? value.label : '',
        };
      });
    } else {
      widgetConfigs.timegraph.values = [_defaultTimegraphValueRow()];
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
    html += _lmsWidgetCardHtml();

    html +=
      '</div><div class="we-message" role="status"></div></div>' +
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _t('close', 'Close') +
      '</button>' +
      '<button type="button" class="btn btn-primary btn-save" id="we-save-btn">' +
      '<i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _t('save', 'Save') +
      '</button>' +
      '</div></div></div></div>';

    $('body').append(html);
    _attachHandlers();
    _wireBackButton('widgeteditorpopup');
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
      id === 'xmltvguide' ||
      id === 'radio' ||
      id === 'log' ||
      id === 'sunrise' ||
      id === 'owm' ||
      id === 'timegraph'
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

  /* Lyrion Music Server lives in this catalog grid (next to Spotify/Sonarr,
     the closest existing "now playing" widgets) rather than in `catalog`
     itself: every catalog entry is a singleton (selectedWidgets[id] is a
     single on/off flag, one fixed blockKey), but LMS supports multiple
     independent blocks (js/deviceeditor.js's managedSpecials, same as
     Group/HTML Block). So this card is not selectable/toggleable - clicking
     it always opens the existing multi-instance "Lyrion Music Server"
     quick-add popup (DashticzDeviceEditor.openLms()) instead of flipping a
     selectedWidgets flag, and it never shows an "Added" state. */
  function _lmsWidgetCardHtml() {
    return (
      '<div class="we-widget-card we-widget-card-lms" data-special-widget="lms" ' +
      'role="button" tabindex="0" aria-label="' + _t('lms_block', 'Lyrion Music Server') + '">' +
      '<div class="we-widget-icon"><i class="fas fa-music" aria-hidden="true"></i></div>' +
      '<div class="we-widget-content"><div class="we-widget-title">' +
      _t('lms_block', 'Lyrion Music Server') +
      '</div><div class="we-widget-description">' +
      _t('lms_description', 'Now playing info for a Lyrion Music Server (Logitech Media Server) player.') +
      '</div></div>' +
      '<div class="we-widget-status">' + _t('click_to_add', 'Click to add') + '</div></div>'
    );
  }

  function _openLmsFromWidgets() {
    _closeModalWithoutSaving();
    DT_function.loadDTScript('js/deviceeditor.js').then(function () {
      DashticzDeviceEditor.openLms();
    });
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
    } else if (type === 'number') {
      // number inputs use opts for min/max/step, so the GUI cannot produce
      // out-of-range values for fields like duration, ticks or lineTension.
      opts = opts || {};
      html += '<input type="number" class="form-control form-control-sm we-widget-field" id="' +
        _esc(id) + '" data-cfg-key="' + _esc(key) + '"' +
        (typeof opts.min !== 'undefined' ? ' min="' + _esc(opts.min) + '"' : '') +
        (typeof opts.max !== 'undefined' ? ' max="' + _esc(opts.max) + '"' : '') +
        (typeof opts.step !== 'undefined' ? ' step="' + _esc(opts.step) + '"' : '') +
        ' value="' + _esc(String(value !== null && value !== undefined ? value : '')) + '">';
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
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('image_url', 'Image URL') +
      '</label>' +
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

  // Radio station row: a + button on every row (per spec) adds another row,
  // mirroring the Custom Device field-row pattern used elsewhere in the editor.
  function _radioStationRowHtml(station, index) {
    station = station || {};
    return (
      '<div class="we-radio-row border rounded p-2 mb-2" data-radio-index="' +
      index +
      '">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<strong>' +
      _t('radio_station', 'Station') +
      ' ' +
      (index + 1) +
      '</strong>' +
      '<button type="button" class="btn btn-sm btn-outline-danger we-radio-remove" title="' +
      _t('radio_remove', 'Remove station') +
      '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('name', 'Name') +
      '</label>' +
      '<input type="text" class="form-control form-control-sm we-radio-name" maxlength="100" value="' +
      _esc(station.name || '') +
      '"></div>' +
      '<div><label class="form-label we-field-label">' +
      _t('radio_url', 'Stream URL') +
      '</label>' +
      '<input type="url" class="form-control form-control-sm we-radio-url" value="' +
      _esc(station.file || '') +
      '"></div></div>'
    );
  }

  function _calendarPickerColor(color) {
    var named = {
      black: '#000000', blue: '#0000ff', green: '#008000', lightblue: '#add8e6',
      lightgreen: '#90ee90', orange: '#ffa500', purple: '#800080', red: '#ff0000',
      white: '#ffffff', yellow: '#ffff00',
    };
    var value = String(color || '').toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(value)) return value;
    if (/^#[0-9a-f]{3}$/.test(value)) {
      return '#' + value.charAt(1) + value.charAt(1) + value.charAt(2) +
        value.charAt(2) + value.charAt(3) + value.charAt(3);
    }
    return named[value] || '#0000ff';
  }

  function _calendarRowHtml(source, index) {
    source = source || _defaultCalendarSource(index);
    var color = source.color || 'blue';
    return (
      '<div class="we-calendar-row border rounded p-2 mb-2" data-calendar-index="' +
      index + '">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<strong>' + _t('calendar_source', 'Calendar') + ' ' + (index + 1) + '</strong>' +
      '<button type="button" class="btn btn-sm btn-outline-danger we-calendar-remove" aria-label="' +
      _esc(_t('calendar_remove', 'Remove calendar')) + '">' +
      '<i class="fas fa-minus" aria-hidden="true"></i></button></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('calendar_name', 'Name') + '</label>' +
      '<input type="text" class="form-control form-control-sm we-calendar-name" maxlength="100" value="' +
      _esc(source.name || '') + '"></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('ics_url', 'ICS URL') + '</label>' +
      '<input type="url" class="form-control form-control-sm we-calendar-url" maxlength="2048" ' +
      'placeholder="https://…/calendar.ics" value="' + _esc(source.ics || '') + '"></div>' +
      '<div><label class="form-label we-field-label">' +
      _t('calendar_color', 'Color') + '</label>' +
      '<input type="color" class="form-control form-control-color we-calendar-color" value="' +
      _calendarPickerColor(color) + '" data-calendar-color-value="' + _esc(color) + '"></div></div>'
    );
  }

  // Timegraph value row: combines idx/value/label into a single block, either
  // from the main device (idx left empty, falls back to the block's own idx)
  // or from another device entirely (its own idx set). No artificial row
  // limit, mirroring the Multi Device/Radio repeater pattern.
  function _timegraphValueRowHtml(row, index) {
    row = row || {};
    return (
      '<div class="we-timegraph-value-row border rounded p-2 mb-2" data-timegraph-index="' +
      index +
      '">' +
      '<div class="d-flex align-items-center justify-content-between mb-2">' +
      '<strong>' +
      _t('timegraph_value', 'Value') +
      ' ' +
      (index + 1) +
      '</strong><span>' +
      '<button type="button" class="btn btn-sm btn-outline-success we-timegraph-value-add" title="' +
      _t('timegraph_add_value', 'Add value') +
      '"><i class="fas fa-plus" aria-hidden="true"></i></button> ' +
      '<button type="button" class="btn btn-sm btn-outline-danger we-timegraph-value-remove" title="' +
      _t('timegraph_remove_value', 'Remove value') +
      '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</span></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('timegraph_value_value', 'Value, e.g. Usage or NettUsage') +
      '</label>' +
      '<input type="text" class="form-control form-control-sm we-timegraph-value-value" value="' +
      _esc(row.value || '') +
      '"></div>' +
      '<div class="mb-2"><label class="form-label we-field-label">' +
      _t('timegraph_value_idx', 'IDX (optional, main device by default)') +
      '</label>' +
      '<input type="number" min="1" step="1" class="form-control form-control-sm we-timegraph-value-idx" value="' +
      _esc(row.idx || '') +
      '"></div>' +
      '<div><label class="form-label we-field-label">' +
      _t('timegraph_value_label', 'Label (optional)') +
      '</label>' +
      '<input type="text" class="form-control form-control-sm we-timegraph-value-label" value="' +
      _esc(row.label || '') +
      '"></div></div>'
    );
  }

  function _customFieldRowHtml(row) {
    row = row || { field: '', setting: '' };
    var isSystem = row.system === true;
    var field = String(row.field || '');
    var lowerField = field.toLowerCase();
    var isIconSource = lowerField === 'icon' || lowerField === 'image';
    var rowClass = 'we-custom-field-row input-group input-group-sm mb-2';
    if (isIconSource) rowClass += ' we-icon-field-row';
    if (isSystem) rowClass += ' we-system-field-row';
    return (
      '<div class="' + rowClass + '"' +
      (row.generated === true
        ? ' data-generated-icon="true" data-initial-setting="' + _esc(row.setting || '') + '"'
        : '') + '>' +
      (isIconSource
        ? '<select class="form-select we-custom-field-name we-icon-source" aria-label="' +
          _esc(_t('field', 'Field')) + '"><option value="icon"' +
          (lowerField === 'icon' ? ' selected' : '') + '>Icon</option><option value="image"' +
          (lowerField === 'image' ? ' selected' : '') + '>Image</option></select>'
        : '<input type="text" class="form-control we-custom-field-name" placeholder="' +
          _esc(_t('field', 'Field')) + '" value="' + _esc(field) + '"' +
          (isSystem ? ' readonly aria-readonly="true"' : '') + '>') +
      '<input type="text" class="form-control we-custom-field-setting" placeholder="' +
      _esc(lowerField === 'image' ? 'custom/icon.png' : _t('setting', 'Setting')) +
      '" value="' + _esc(row.setting || '') + '">' +
      (isIconSource
        ? '<div class="dropdown-menu dt-custom-image-picker" role="dialog" aria-label="' +
          _esc(_t('custom_images', 'Custom images')) +
          '"><div class="dt-custom-image-status"></div>' +
          '<div class="dt-custom-image-grid"></div></div>'
        : '') +
      '<button type="button" class="btn btn-outline-success we-custom-field-add" title="' +
      _esc(_t('add_field', 'Add field')) + '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger we-custom-field-remove" title="' +
      _esc(_t('remove_field', 'Remove field')) + '"' + (isSystem ? ' disabled' : '') +
      '><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>'
    );
  }

  // extraButtonHtml: optional control (e.g. Radio's Add station button) shown
  // to the right of the Display options checkboxes.
  // insertHtml: optional block (e.g. Radio's station list) shown above the
  // Custom fields section, below the checkboxes.
  function _widgetBlockOptionsHtml(item, extraButtonHtml, insertHtml) {
    var options = widgetBlockOptions[item.id] || _defaultWidgetBlockOptions(item);
    _ensureWidgetSystemFields(item, options);
    widgetBlockOptions[item.id] = options;
    var rows = options.customFields && options.customFields.length
      ? options.customFields
      : [{ field: '', setting: '' }];
    var html = _cfgHeading(_t('display_options', 'Display options'));
    html += '<div class="d-flex align-items-center justify-content-between flex-wrap mb-2">';
    html += '<div class="d-flex flex-wrap we-block-options-row">';
    [
      ['icon', _t('icon', 'Icon'), options.icon],
      ['show_title', _t('show_title', 'Title'), options.show_title],
    ].forEach(function (option) {
      html += '<label class="form-check form-switch form-check-inline mb-2">' +
        '<input class="form-check-input we-block-option" type="checkbox" data-block-option="' +
        option[0] + '"' + (option[2] ? ' checked' : '') + '>' +
        '<span class="form-check-label">' + _esc(option[1]) + '</span></label>';
    });
    html += '</div>';
    if (extraButtonHtml) html += extraButtonHtml;
    html += '</div>';
    if (insertHtml) html += insertHtml;
    html += _cfgHeading(_t('custom_fields', 'Custom fields'));
    html += '<p class="form-text">' + _esc(_t(
      'custom_fields_help',
      'Field and Setting are written as typed block parameters in CONFIG.js.'
    )) + '</p><div class="we-custom-fields">';
    rows.forEach(function (row) { html += _customFieldRowHtml(row); });
    html += '</div>';
    return html;
  }

  function _buildConfigModalHtml(item) {
    var fields = '';
    var lng = (typeof language !== 'undefined' && language.settings) ? language.settings : {};
    var lw = lng.weather || {};
    var ll = lng.localize || {};
    var lg = lng.garbage || {};
    var lm = lng.media || {};
    // Radio's Add station control docks next to the Display options
    // checkboxes rather than living on every station row.
    var blockOptionsExtraButton = '';
    var blockOptionsInsertHtml = '';

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
        '<label class="form-label we-field-label" for="we-cfg-weather-provider">' +
        _t('provider', 'Provider') +
        '</label>' +
        '<select class="form-select form-select-sm we-widget-field" id="we-cfg-weather-provider">' +
        '<option value="openweather"' + (cfg.provider === 'openweather' ? ' selected' : '') + '>' + _t('openweather', 'OpenWeather') + '</option>' +
        '<option value="wunderground"' + (cfg.provider === 'wunderground' ? ' selected' : '') + '>' + _t('weather_underground', 'Weather Underground') + '</option>' +
        '</select></div>';
      fields +=
        '<div class="we-weather-group" data-weather-provider="openweather"' +
        (cfg.provider === 'openweather' ? '' : ' style="display:none"') +
        '>';
      fields += _cfgHeading(_t('openweather', 'OpenWeather'));
      fields += _cfgField('owm_api', lw.owm_api || 'OpenWeather API key', 'text', cfg.owm_api);
      fields += _cfgField('owm_city', lw.owm_city || 'City', 'text', cfg.owm_city);
      fields += _cfgField('owm_name', lw.owm_name || 'Display name', 'text', cfg.owm_name);
      fields += _cfgField('owm_country', lw.owm_country || 'Country code', 'text', cfg.owm_country);
      fields += _cfgField('owm_lang', lw.owm_lang || 'Language code', 'text', cfg.owm_lang, null, lw.owm_lang_help || '');
      fields += _cfgField('owm_cnt', lw.owm_cnt || 'Number of periods', 'text', cfg.owm_cnt, null, lw.owm_cnt_help || '');
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
      fields += _cfgHeading(_t('weather_underground', 'Weather Underground'));
      fields += _cfgField('wu_api', lw.wu_api || 'Weather Underground API key', 'text', cfg.wu_api);
      fields += _cfgField('wu_city', lw.wu_city || 'City (WU)', 'text', cfg.wu_city);
      fields += _cfgField('wu_name', lw.wu_name || 'Display name (WU)', 'text', cfg.wu_name);
      fields += _cfgField('wu_country', lw.wu_country || 'Country code (WU)', 'text', cfg.wu_country);
      fields += '</div>';
      fields += _cfgHeading(lw.shared_display || _t('general_display', 'General display'));
      fields += _cfgField('use_fahrenheit', lw.use_fahrenheit || 'Use Fahrenheit', 'checkbox', cfg.use_fahrenheit);
      fields += _cfgField('use_beaufort', lw.use_beaufort || 'Use Beaufort', 'checkbox', cfg.use_beaufort);

    } else if (item.id === 'calendar') {
      var ccal = _calendarWidgetConfig();
      fields = '<div id="we-cfg-calendar-list">';
      ccal.sources.forEach(function (source, index) {
        fields += _calendarRowHtml(source, index);
      });
      fields += '</div>';
      fields +=
        '<button type="button" class="btn btn-sm btn-outline-success mb-3" id="we-calendar-add">' +
        '<i class="fas fa-plus me-1" aria-hidden="true"></i>' +
        _t('calendar_add', 'Add calendar') + '</button>';
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
        _clockOption('basicclock', _t('basic_clock', 'Basic clock'), currentClockType) +
        _clockOption('stationclock', _t('station_clock', 'Station clock'), currentClockType) +
        _clockOption('flipclock', _t('flipclock', 'Flipclock'), currentClockType) +
        _clockOption('haymanclock', _t('hayman_clock', 'Hayman clock'), currentClockType) +
        _clockOption('miniclock', _t('miniclock', 'Miniclock'), currentClockType) +
        '</select>' +
        '<img class="we-clock-preview" id="we-cfg-clock-preview" src="' +
        _clockPreviewSrc(currentClockType) + '" alt="">' +
        '</div>';

      fields +=
        '<div class="we-clock-size-group"' +
        (showSizeScale ? '' : ' style="display:none"') +
        '>';
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
      fields += _cfgHeading(_t('flipclock', 'Flipclock'));
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
      fields += _cfgHeading(_t('ical_google', 'iCal / Google'));
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

    } else if (item.id === 'publictransport') {
      var ptcfg = widgetConfigs.publictransport || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-pt-provider">' +
        _t('provider', 'Provider') +
        '</label>' +
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
        '<label class="form-label we-field-label" for="we-cfg-alarm-rss">' +
        _t('rss_feed', 'RSS feed') +
        '</label>' +
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

    } else if (item.id === 'longfonds') {
      var lcfg = widgetConfigs.longfonds || {};
      fields += _cfgField('waqi_city', lw.waqi_city || 'WAQI city code', 'text', lcfg.waqi_city,
        null, lw.waqi_city_help || 'Find your city code on aqicn.org.');
      fields += _cfgField('waqi_layout', lw.waqi_layout || 'Layout', 'select', lcfg.waqi_layout || 'large', {
        xsmall: 'Extra small',
        small: 'Small',
        large: 'Large',
        xlarge: 'Extra large',
        xxl: 'XXL',
      });

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
    } else if (item.id === 'radio') {
      // Config fields for the Radio (Streamplayer) widget: a graphical builder
      // for the same tracks:[{name,file}] array _STREAMPLAYER_TRACKS already uses.
      // The Add station control is shown once, next to the Display options
      // checkboxes (see _widgetBlockOptionsHtml), and every row only keeps
      // its own Remove button.
      var rcfg = _radioWidgetConfig();
      var radioListHtml = '<div id="we-cfg-radio-list">';
      rcfg.tracks.forEach(function (station, index) {
        radioListHtml += _radioStationRowHtml(station, index);
      });
      radioListHtml += '</div>';
      blockOptionsInsertHtml = radioListHtml;
      blockOptionsExtraButton =
        '<button type="button" class="btn btn-sm btn-outline-success" id="we-radio-add-btn" title="' +
        _t('radio_add', 'Add station') +
        '"><i class="fas fa-plus" aria-hidden="true"></i></button>';
    } else if (item.id === 'log') {
      // Config fields for the Domoticz log widget. Field keys match
      // widgetConfigs.log's own property names 1:1, so the OK handler can
      // collect them generically the same way the simpler widgets do.
      var logcfg = widgetConfigs.log || {};
      var llog = lng.widgeteditor || {};
      fields += _cfgField('scrolltimeout', llog.log_scrolltimeout || 'Auto-scroll resumes after (seconds)',
        'number', logcfg.scrolltimeout, { min: 0, max: 3600, step: 1 },
        llog.log_scrolltimeout_help || 'Delay after manual scrolling until auto-scroll is activated again. Default: 60.');
      fields += _cfgField('ascending', llog.log_ascending || 'Newest log lines at the bottom',
        'checkbox', logcfg.ascending);
      fields += _cfgField('maxitems', llog.log_maxitems || 'Maximum lines', 'text', logcfg.maxitems,
        null, llog.log_maxitems_help || 'Limit the number of log lines shown, so no scrollbar is needed. Leave empty for no limit.');
      fields += _cfgField('height', llog.log_height || 'Height (px)', 'text', logcfg.height,
        null, llog.log_height_help || 'Optional fixed height. Leave empty to use the automatic height.');
      fields += _cfgField('aspectratio', llog.log_aspectratio || 'Aspect ratio', 'text', logcfg.aspectratio,
        null, llog.log_aspectratio_help || 'Height divided by width. Only used when Height above is left empty.');
    } else if (item.id === 'owm') {
      // Config fields for the OWM (OpenWeatherMap) widget: apikey/city/country
      // stay optional so an empty field keeps using the global config['owm_*']
      // fallback that DT_owmwidget's own defaultCfg already provides.
      var owmcfg = widgetConfigs.owm || {};
      var lowm = lng.widgeteditor || {};
      var owmLayoutOpts = {};
      for (var layoutNr = 1; layoutNr <= 24; layoutNr++) {
        owmLayoutOpts[layoutNr] = (lowm.owm_layout_option || 'Layout') + ' ' + layoutNr;
      }
      fields += _cfgField('apikey', lowm.owm_apikey || 'API key', 'text', owmcfg.apikey,
        null, lowm.owm_apikey_help || "Leave empty to use the global config['owm_api'] setting (configured on the Weather widget).");
      fields += _cfgField('layout', lowm.owm_layout || 'Layout', 'select', owmcfg.layout || '11', owmLayoutOpts);
      fields += _cfgField('city', lowm.owm_city_field || 'City', 'text', owmcfg.city,
        null, lowm.owm_city_field_help || "City name or OpenWeatherMap city id. Leave empty to use the global config['owm_city'] setting.");
      fields += _cfgField('country', lowm.owm_country_field || 'Country', 'text', owmcfg.country,
        null, lowm.owm_country_field_help || "Country code, e.g. 'nl'. Leave empty to use the global config['owm_country'] setting.");
    } else if (item.id === 'timegraph') {
      // Config fields for the Timegraph widget: chart window/axis settings plus
      // a dynamic list of values, each optionally from its own device.
      var tgcfg = widgetConfigs.timegraph || {};
      var ltg = lng.widgeteditor || {};
      fields +=
        '<div class="mb-3">' +
        '<label class="form-label we-field-label" for="we-cfg-idx">' +
        (ltg.timegraph_idx || 'Main IDX') +
        '</label>' +
        '<input type="number" min="1" step="1" class="form-control form-control-sm we-widget-field" id="we-cfg-idx" ' +
        'data-cfg-key="idx" value="' + _esc(String(tgcfg.idx || '')) + '">' +
        '<div class="form-text" style="font-size:11px;color:#6c757d">' +
        (ltg.timegraph_idx_help || 'Used by every value below that does not set its own IDX.') +
        '</div></div>';
      fields += _cfgField('duration', ltg.timegraph_duration || 'Duration (seconds)',
        'number', tgcfg.duration, { min: 1, max: 86400, step: 1 },
        ltg.timegraph_duration_help || 'Duration of the moving chart window in seconds. Default: 300.');
      fields += _cfgField('height', ltg.timegraph_height || 'Height (px)', 'text', tgcfg.height,
        null, ltg.timegraph_height_help || 'Optional fixed height, e.g. 300px. Leave empty to use the automatic height.');
      fields += _cfgHeading(ltg.timegraph_axes || 'Axes');
      fields += _cfgField('xTicks', ltg.timegraph_xticks || 'X-axis labels (count)',
        'number', tgcfg.xTicks, { min: 1, max: 100, step: 1 },
        ltg.timegraph_xticks_help || 'Number of labels on the time axis. Default: 10.');
      fields += _cfgField('yTicks', ltg.timegraph_yticks || 'Y-axis labels (count)',
        'number', tgcfg.yTicks, { min: 1, max: 100, step: 1 },
        ltg.timegraph_yticks_help || 'Number of labels on the vertical axis. Default: 5.');
      fields += _cfgField('xLabels', ltg.timegraph_xlabels || 'Show time-axis labels',
        'checkbox', tgcfg.xLabels);
      fields += _cfgHeading(ltg.timegraph_appearance || 'Appearance');
      fields += _cfgField('animation', ltg.timegraph_animation || 'Animation (ms)',
        'number', tgcfg.animation, { min: 0, max: 10000, step: 1 },
        ltg.timegraph_animation_help || 'Duration of the animation effect in milliseconds. Default: 0.');
      fields += _cfgField('lineTension', ltg.timegraph_linetension || 'Line tension',
        'number', tgcfg.lineTension, { min: 0, max: 1, step: 0.1 },
        ltg.timegraph_linetension_help || 'Smooths the graph line. 0 = no smoothing, default 0.1.');
      fields += _cfgField('pointRadius', ltg.timegraph_pointradius || 'Point radius',
        'number', tgcfg.pointRadius, { min: 0, max: 20, step: 1 },
        ltg.timegraph_pointradius_help || 'Size of the dot for each data sample. Default: 1.');
      fields += _cfgHeading(ltg.timegraph_values || 'Values');
      fields += '<p class="form-text">' + _esc(ltg.timegraph_values_help ||
        'Add one value per device field to show. Set IDX per value to combine data from several devices in one graph.') + '</p>';
      fields += '<div id="we-cfg-timegraph-list">';
      (tgcfg.values && tgcfg.values.length ? tgcfg.values : [_defaultTimegraphValueRow()]).forEach(
        function (row, index) {
          fields += _timegraphValueRowHtml(row, index);
        }
      );
      fields += '</div>';
    }

    fields = _widgetBlockOptionsHtml(item, blockOptionsExtraButton, blockOptionsInsertHtml) + fields;

    return (
      '<div class="modal fade" id="we-config-popup" tabindex="-1" aria-labelledby="we-cfg-title" aria-hidden="true" data-bs-backdrop="static">' +
      '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable">' +
      '<div class="modal-content">' +
      '<div class="modal-header">' +
      '<h5 class="modal-title" id="we-cfg-title"><i class="fas fa-cog me-2" aria-hidden="true"></i>' +
      _t('widget_config', 'Widget Config') +
      ' — ' +
      _esc(_widgetConfigDisplayName(item)) +
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
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _t('cancel', 'Cancel') +
      '</button>' +
      '<button type="button" class="btn btn-primary btn-save" id="we-cfg-ok-btn">' +
      '<i class="fas fa-check me-1" aria-hidden="true"></i>' +
      _t('ok', 'OK') +
      '</button>' +
      '</div></div></div></div>'
    );
  }

  function _openConfigModal(widgetId, callbacks) {
    var item = null;
    for (var i = 0; i < catalog.length; i++) {
      if (catalog[i].id === widgetId) {
        item = catalog[i];
        break;
      }
    }
    if (!item) return;
    callbacks = callbacks || {};

    $('#we-config-popup').remove();
    $('body').append(_buildConfigModalHtml(item));

    var $cfgModal = $('#we-config-popup');

    function refreshCustomFieldButtons() {
      var removable = $cfgModal.find('.we-custom-field-row:not(.we-system-field-row)').length;
      $cfgModal.find('.we-custom-field-remove').each(function () {
        var isSystem = $(this).closest('.we-custom-field-row').hasClass('we-system-field-row');
        $(this).prop('disabled', isSystem || removable <= 0);
      });
    }

    function refreshIconFieldVisibility() {
      var enabled = $cfgModal.find('[data-block-option="icon"]').is(':checked');
      $cfgModal.find('.we-icon-field-row').toggle(enabled);
    }

    function ensureIconFieldRow() {
      if ($cfgModal.find('.we-icon-field-row').length) return;
      var effectiveIcon = _effectiveWidgetConfigIcon(item, { iconValue: null });
      var rowHtml = _customFieldRowHtml({
        field: 'icon',
        setting: effectiveIcon,
        generated: true,
      });
      var $titleRow = $cfgModal.find('.we-custom-field-row').first();
      if ($titleRow.length) $titleRow.after(rowHtml);
      else $cfgModal.find('.we-custom-fields').prepend(rowHtml);
    }

    function closeCustomImagePickers() {
      $cfgModal.find('.dt-custom-image-picker').removeClass('show');
      $cfgModal.find('.we-icon-field-row').removeClass('dt-custom-image-picker-open');
    }

    function openCustomImagePicker($row) {
      if ($row.find('.we-icon-source').val() !== 'image') {
        closeCustomImagePickers();
        return;
      }
      var $picker = $row.find('.dt-custom-image-picker');
      var selectedPath = String($row.find('.we-custom-field-setting').val() || '');
      closeCustomImagePickers();
      $row.addClass('dt-custom-image-picker-open');
      $picker.addClass('show');
      $picker.find('.dt-custom-image-status').show().text(
        _t('loading_images', 'Loading images…')
      );
      $picker.find('.dt-custom-image-grid').empty();
      _loadCustomImages()
        .done(function (images) {
          _renderCustomImageGrid($picker, images, selectedPath);
        })
        .fail(function () {
          $picker.find('.dt-custom-image-grid').empty();
          $picker.find('.dt-custom-image-status').show().text(
            _t('custom_images_error', 'Unable to load custom images.')
          );
        });
    }

    $cfgModal.on('click', '.we-custom-field-add', function () {
      $(this).closest('.we-custom-field-row').after(_customFieldRowHtml());
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });

    $cfgModal.on('click', '.we-custom-field-remove', function () {
      if ($(this).prop('disabled')) return;
      var $row = $(this).closest('.we-custom-field-row');
      var removesIcon = $row.hasClass('we-icon-field-row');
      $row.remove();
      if (removesIcon) {
        $cfgModal.find('[data-block-option="icon"]').prop('checked', false);
      }
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });
    $cfgModal.on('change', '[data-block-option="icon"]', function () {
      if ($(this).is(':checked')) ensureIconFieldRow();
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });
    $cfgModal.on('change', '.we-icon-source', function () {
      var $row = $(this).closest('.we-icon-field-row');
      var useImage = $(this).val() === 'image';
      var effectiveIcon = _effectiveWidgetConfigIcon(item, { iconValue: null });
      var $setting = $row.find('.we-custom-field-setting');
      $setting
        .val(useImage ? '' : effectiveIcon)
        .attr('placeholder', useImage ? 'custom/icon.png' : _t('setting', 'Setting'));
      $row
        .attr('data-generated-icon', useImage ? 'false' : 'true')
        .attr('data-initial-setting', useImage ? '' : effectiveIcon);
      closeCustomImagePickers();
    });
    $cfgModal.on('click focus', '.we-icon-field-row .we-custom-field-setting', function () {
      openCustomImagePicker($(this).closest('.we-icon-field-row'));
    });
    $cfgModal.on('click', '.dt-custom-image-option', function () {
      var $row = $(this).closest('.we-icon-field-row');
      $row.find('.we-custom-field-setting').val(String($(this).attr('data-image-path') || ''));
      closeCustomImagePickers();
    });
    $cfgModal.on('click', function (event) {
      if ($(event.target).closest('.dt-custom-image-picker, .we-custom-field-setting').length) return;
      closeCustomImagePickers();
    });
    refreshCustomFieldButtons();
    refreshIconFieldVisibility();

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
      $cfgModal.find('#we-cfg-clock-preview').attr('src', _clockPreviewSrc(type));
    });

    $cfgModal.on('click', '#we-calendar-add', function () {
      var index = $cfgModal.find('.we-calendar-row').length;
      $('#we-cfg-calendar-list').append(
        _calendarRowHtml(_defaultCalendarSource(index), index)
      );
      $cfgModal.find('.we-calendar-remove').prop(
        'disabled',
        $cfgModal.find('.we-calendar-row').length <= 1
      );
    });

    $cfgModal.on('input change', '.we-calendar-color', function () {
      $(this).attr('data-calendar-color-value', $(this).val());
    });

    $cfgModal.on('click', '.we-calendar-remove', function () {
      if ($cfgModal.find('.we-calendar-row').length <= 1) return;
      $(this).closest('.we-calendar-row').remove();
      $cfgModal.find('.we-calendar-row').each(function (index) {
        $(this).attr('data-calendar-index', index);
        $(this)
          .find('strong')
          .text(_t('calendar_source', 'Calendar') + ' ' + (index + 1));
      });
      $cfgModal.find('.we-calendar-remove').prop(
        'disabled',
        $cfgModal.find('.we-calendar-row').length <= 1
      );
    });

    $cfgModal.find('.we-calendar-remove').prop(
      'disabled',
      $cfgModal.find('.we-calendar-row').length <= 1
    );

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

    function _renumberRadioRows() {
      $cfgModal.find('.we-radio-row').each(function (index) {
        $(this).attr('data-radio-index', index);
        $(this)
          .find('strong')
          .text(_t('radio_station', 'Station') + ' ' + (index + 1));
      });
      $cfgModal.find('.we-radio-remove').prop(
        'disabled',
        $cfgModal.find('.we-radio-row').length <= 1
      );
    }

    $cfgModal.on('click', '#we-radio-add-btn', function () {
      var index = $cfgModal.find('.we-radio-row').length;
      $('#we-cfg-radio-list').append(_radioStationRowHtml({}, index));
      _renumberRadioRows();
      $cfgModal.find('.we-radio-row').last().find('.we-radio-name').trigger('focus');
    });

    $cfgModal.on('click', '.we-radio-remove', function () {
      if ($cfgModal.find('.we-radio-row').length <= 1) return;
      $(this).closest('.we-radio-row').remove();
      _renumberRadioRows();
    });

    _renumberRadioRows();

    function _renumberTimegraphValueRows() {
      $cfgModal.find('.we-timegraph-value-row').each(function (index) {
        $(this).attr('data-timegraph-index', index);
        $(this)
          .find('strong')
          .text(_t('timegraph_value', 'Value') + ' ' + (index + 1));
      });
      $cfgModal.find('.we-timegraph-value-remove').prop(
        'disabled',
        $cfgModal.find('.we-timegraph-value-row').length <= 1
      );
    }

    $cfgModal.on('click', '.we-timegraph-value-add', function () {
      var index = $cfgModal.find('.we-timegraph-value-row').length;
      $(this).closest('.we-timegraph-value-row').after(_timegraphValueRowHtml({}, index));
      _renumberTimegraphValueRows();
      $cfgModal.find('.we-timegraph-value-row').eq(index).find('.we-timegraph-value-value').trigger('focus');
    });

    $cfgModal.on('click', '.we-timegraph-value-remove', function () {
      if ($cfgModal.find('.we-timegraph-value-row').length <= 1) return;
      $(this).closest('.we-timegraph-value-row').remove();
      _renumberTimegraphValueRows();
    });

    _renumberTimegraphValueRows();

    $cfgModal.on('click', '#we-cfg-ok-btn', function () {
      var valid = true;
      var existingBlockOptions = widgetBlockOptions[widgetId] || _defaultWidgetBlockOptions(item);
      var pendingTitle = '';
      var pendingIconValue = null;
      var hasIconField = false;
      var pendingBlockOptions = {
        icon: $cfgModal.find('[data-block-option="icon"]').is(':checked'),
        iconValue: null,
        // Catalog widgets do not expose Data/Updated controls. Preserve values
        // loaded from an existing CONFIG.js so a different widget edit cannot
        // silently remove settings still supported elsewhere in Dashticz.
        hide_data: existingBlockOptions.hide_data === true,
        last_update: existingBlockOptions.last_update === true,
        show_title: $cfgModal.find('[data-block-option="show_title"]').is(':checked'),
        customFields: [],
        preservedFields: $.extend({}, existingBlockOptions.preservedFields || {}),
      };
      var customKeys = {};
      $cfgModal.find('.we-custom-field-row').each(function () {
        if (!valid) return;
        var rawField = $.trim($(this).find('.we-custom-field-name').val() || '');
        var rawSetting = $.trim($(this).find('.we-custom-field-setting').val() || '');
        if (!rawField && !rawSetting) return;
        var field = _normaliseCustomFieldName(rawField);
        if (!field || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field)) {
          valid = false;
          $('.we-cfg-message').addClass('text-danger').text(
            _t('invalid_field', 'Enter a valid Field and Setting.')
          );
          $(this).find('.we-custom-field-name').trigger('focus');
          return;
        }
        var lowerField = field.toLowerCase();
        if (customKeys[lowerField]) {
          valid = false;
          $('.we-cfg-message').addClass('text-danger').text(
            _t('duplicate_field', 'This field is duplicated or reserved.')
          );
          $(this).find('.we-custom-field-name').trigger('focus');
          return;
        }
        customKeys[lowerField] = true;
        if (lowerField === 'title') {
          pendingTitle = rawSetting;
          return;
        }
        if (lowerField === 'icon' || lowerField === 'image') {
          if (!pendingBlockOptions.icon) {
            if ($(this).hasClass('we-icon-field-row')) return;
            valid = false;
            $('.we-cfg-message').addClass('text-danger').text(
              _t('icon_requires_checkbox', 'Enable Icon before using the icon field.')
            );
            $(this).find('.we-custom-field-name').trigger('focus');
            return;
          }
          if (!rawSetting) {
            valid = false;
            $('.we-cfg-message').addClass('text-danger').text(
              _t('invalid_field', 'Enter a valid Field and Setting.')
            );
            $(this).find('.we-custom-field-setting').trigger('focus');
            return;
          }
          if (lowerField === 'image') {
            pendingBlockOptions.customFields.push({
              field: 'image',
              setting: rawSetting,
              value: rawSetting,
            });
            return;
          }
          var generatedIcon = $(this).attr('data-generated-icon') === 'true';
          var initialIcon = String($(this).attr('data-initial-setting') || '');
          if (
            generatedIcon &&
            rawSetting === initialIcon &&
            !existingBlockOptions.iconValue &&
            !_usesExplicitEditorDefaultIcon(item)
          ) return;
          hasIconField = true;
          pendingIconValue = rawSetting;
          return;
        }
        if (!rawSetting || _isProtectedCustomWidgetProperty(lowerField)) {
          valid = false;
          $('.we-cfg-message').addClass('text-danger').text(
            _isProtectedCustomWidgetProperty(lowerField)
              ? _t('duplicate_field', 'This field is duplicated or reserved.')
              : _t('invalid_field', 'Enter a valid Field and Setting.')
          );
          $(this).find(!rawSetting ? '.we-custom-field-setting' : '.we-custom-field-name').trigger('focus');
          return;
        }
        var parsedSetting = _parseCustomSetting(rawSetting);
        if (!parsedSetting.valid) {
          valid = false;
          $('.we-cfg-message').addClass('text-danger').text(
            _t('invalid_setting', 'Setting contains invalid JSON.')
          );
          $(this).find('.we-custom-field-setting').trigger('focus');
          return;
        }
        pendingBlockOptions.customFields.push({
          field: field,
          setting: rawSetting,
          value: parsedSetting.value,
        });
      });
      pendingBlockOptions.iconValue = hasIconField ? pendingIconValue : null;
      pendingBlockOptions.customFields.unshift({
        field: 'title',
        setting: pendingTitle,
        value: pendingTitle,
        system: true,
      });
      if (hasIconField) {
        pendingBlockOptions.customFields.splice(1, 0, {
          field: 'icon',
          setting: pendingIconValue,
          value: pendingIconValue,
        });
      }

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
        var calendarSources = [];
        var calendarNames = Object.create(null);
        $cfgModal.find('.we-calendar-row').each(function () {
          if (!valid) return;
          var $row = $(this);
          var name = $.trim($row.find('.we-calendar-name').val() || '');
          var url = $.trim($row.find('.we-calendar-url').val() || '');
          var color = String(
            $row.find('.we-calendar-color').attr('data-calendar-color-value') ||
            $row.find('.we-calendar-color').val() ||
            'white'
          );
          if (!name || /^(?:__proto__|prototype|constructor)$/i.test(name)) {
            $('.we-cfg-message').addClass('text-danger').text(
              _t('calendar_name_required', 'Enter a name for every calendar.')
            );
            $row.find('.we-calendar-name').trigger('focus');
            valid = false;
            return;
          }
          if (Object.prototype.hasOwnProperty.call(calendarNames, name)) {
            $('.we-cfg-message').addClass('text-danger').text(
              _t('calendar_duplicate_name', 'Calendar names must be unique.')
            );
            $row.find('.we-calendar-name').trigger('focus');
            valid = false;
            return;
          }
          if (!/^https?:\/\/\S+$/i.test(url)) {
            $('.we-cfg-message').addClass('text-danger').text(
              _t('invalid_calendar_url', 'Enter a valid HTTP(S) ICS URL.')
            );
            $row.find('.we-calendar-url').trigger('focus');
            valid = false;
            return;
          }
          calendarNames[name] = true;
          calendarSources.push({ name: name, ics: url, color: color });
        });
        if (valid && !calendarSources.length) {
          $('.we-cfg-message').addClass('text-danger').text(
            _t('calendar_needs_source', 'Add at least one calendar.')
          );
          valid = false;
        }
        if (valid) {
          collected.sources = calendarSources;
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
      } else if (widgetId === 'radio') {
        var tracks = [];
        $cfgModal.find('.we-radio-row').each(function (index) {
          var stationName = $.trim($(this).find('.we-radio-name').val() || '');
          var stationFile = $.trim($(this).find('.we-radio-url').val() || '');
          if (!stationName && !stationFile) return; // skip a fully empty row
          if (!stationFile || !/^https?:\/\/\S+$/i.test(stationFile)) {
            $('.we-cfg-message')
              .addClass('text-danger')
              .text(
                _t('invalid_radio_url_prefix', 'Enter a valid HTTP(S) stream URL for station') +
                  ' ' +
                  (index + 1) +
                  '.'
              );
            valid = false;
            return false;
          }
          tracks.push({
            track: tracks.length + 1,
            name: stationName || _t('radio_station', 'Station') + ' ' + (index + 1),
            file: stationFile,
          });
        });
        if (valid && !tracks.length) {
          $('.we-cfg-message')
            .addClass('text-danger')
            .text(_t('invalid_radio_no_stations', 'Add at least one radio station.'));
          valid = false;
        }
        if (valid) widgetConfigs.radio = { tracks: tracks };
      } else if (widgetId === 'log') {
        widgetConfigs.log = collected;
      } else if (widgetId === 'owm') {
        collected.layout = collected.layout || '11';
        widgetConfigs.owm = collected;
      } else if (widgetId === 'timegraph') {
        var timegraphValues = [];
        $cfgModal.find('.we-timegraph-value-row').each(function (index) {
          if (!valid) return;
          var rowValue = $.trim($(this).find('.we-timegraph-value-value').val() || '');
          var rowIdx = $.trim($(this).find('.we-timegraph-value-idx').val() || '');
          var rowLabel = $.trim($(this).find('.we-timegraph-value-label').val() || '');
          if (!rowValue && !rowIdx && !rowLabel) return; // skip a fully empty row
          if (!rowValue) {
            $('.we-cfg-message')
              .addClass('text-danger')
              .text(
                _t('timegraph_value_required', 'Enter a value (e.g. Temp or NettUsage) for value') +
                  ' ' +
                  (index + 1) +
                  '.'
              );
            valid = false;
            return;
          }
          timegraphValues.push({ idx: rowIdx, value: rowValue, label: rowLabel });
        });
        if (valid) {
          collected.values = timegraphValues;
          widgetConfigs.timegraph = collected;
        }
      }

      if (valid) {
        widgetBlockOptions[widgetId] = pendingBlockOptions;
        selectedWidgets[widgetId] = true;
        _refreshCard(widgetId);
        var applyResult = null;
        if (typeof callbacks.onApply === 'function') {
          applyResult = callbacks.onApply({
            entry: _buildWidgetPayloadEntry(item),
            configSettings: _collectConfigSettings(),
            draft: _widgetEditorDraft(widgetId),
          });
        }
        if (applyResult && typeof applyResult.then === 'function') {
          var $ok = $cfgModal.find('#we-cfg-ok-btn').prop('disabled', true);
          $('.we-cfg-message').removeClass('text-danger').text(_t('saving', 'Saving…'));
          $.when(applyResult)
            .done(function () {
              window.bootstrap.Modal.getInstance(document.getElementById('we-config-popup')).hide();
            })
            .fail(function (xhr) {
              var message =
                xhr && xhr.responseJSON && xhr.responseJSON.error
                  ? xhr.responseJSON.error
                  : _t('save_failed', 'The widgets could not be saved.');
              $('.we-cfg-message').addClass('text-danger').text(message);
              $ok.prop('disabled', false);
            });
          return;
        }
        window.bootstrap.Modal.getInstance(document.getElementById('we-config-popup')).hide();
      }
    });

    $cfgModal.one('hidden.bs.modal', function () {
      $cfgModal.remove();
      if (typeof callbacks.onClose === 'function') callbacks.onClose();
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

  function _clockPreviewSrc(clockType) {
    var known = ['basicclock', 'stationclock', 'flipclock', 'haymanclock', 'miniclock'];
    var type = known.indexOf(clockType) > -1 ? clockType : 'basicclock';
    return 'img/clock-' + type + '.jpg';
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
      if ($(this).data('special-widget') === 'lms') {
        _openLmsFromWidgets();
        return;
      }
      _toggleWidget(String($(this).data('widget-id')));
    });

    $modal.on('keydown', '.we-widget-card', function (event) {
      if ($(event.target).closest('.we-config-btn').length) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      if ($(this).data('special-widget') === 'lms') {
        _openLmsFromWidgets();
        return;
      }
      _toggleWidget(String($(this).data('widget-id')));
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

  function _collectConfigSettings() {
    var configSettings = {};
    var configWidgets = {
      weather: [
        'owm_api', 'owm_city', 'owm_name', 'owm_country', 'owm_lang', 'owm_days',
        'owm_cnt', 'owm_min', 'weather_show_rain', 'weather_show_description',
        'weather_show_wind', 'weather_show_gust', 'weather_icons', 'wu_api',
        'wu_city', 'wu_name', 'wu_country', 'use_fahrenheit', 'use_beaufort',
        'translate_windspeed',
      ],
      garbage: [
        'garbage_company', 'garbage_icalurl', 'google_api_key', 'garbage_calendar_id',
        'garbage_zipcode', 'garbage_street', 'garbage_housenumber',
        'garbage_housenumberadd', 'garbage_maxitems', 'garbage_maxdays',
        'garbage_width', 'garbage_hideicon', 'garbage_icon_use_colors',
        'garbage_use_colors', 'garbage_use_names', 'garbage_use_cors_prefix',
      ],
      sonarr: ['sonarr_url', 'sonarr_apikey', 'sonarr_maxitems'],
      spotify: ['spot_clientid'],
      calendar: ['calendarformat', 'calendarlanguage', 'calendar_maxitems'],
      secpanel: ['security_button_icons'],
      trafficinfo: ['anwb_apikey'],
      map: ['gm_api', 'gm_zoomlevel', 'gm_latitude', 'gm_longitude'],
      longfonds: ['waqi_city', 'waqi_layout'],
      moon: ['idx_moonpicture'],
      news: ['default_news_url', 'news_scroll_after'],
    };
    Object.keys(configWidgets).forEach(function (id) {
      var cfg = widgetConfigs[id];
      if (!cfg) return;
      configWidgets[id].forEach(function (key) {
        if (typeof cfg[key] !== 'undefined') configSettings[key] = cfg[key];
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
    return configSettings;
  }

  function _buildWidgetPayloadEntry(item) {
    var entry = {
      id: item.id,
      key: widgetBlockRefs[item.id] || item.blockKey,
    };
    var dimensions = widgetDimensions[item.id] || {};
    entry.width = dimensions.width || item.width;
    // Grid mode sizes a widget via its grid cell (x/y/w/h); writing a pixel
    // height into the block config fights that and breaks content that needs
    // to size itself (iframes, camera images, mobile stacking). Only keep a
    // height that was already explicitly set. Column mode still needs the
    // catalog default to pack columns.
    if (gridMode) {
      if (dimensions.height) entry.height = dimensions.height;
    } else if (dimensions.height || item.height) {
      entry.height = dimensions.height || item.height;
    }

    var blockOptions = widgetBlockOptions[item.id] || _defaultWidgetBlockOptions(item);
    if (blockOptions.icon === false) {
      entry.icon = '';
    } else if (blockOptions.iconValue) {
      entry.icon = blockOptions.iconValue;
    }
    entry.hide_data = blockOptions.hide_data === true;
    entry.last_update = blockOptions.last_update === true;
    if (blockOptions.show_title === false) entry.hide_title = true;
    entry.custom_fields = {};
    Object.keys(blockOptions.preservedFields || {}).forEach(function (field) {
      entry.custom_fields[field] = _encodeCustomSettingValue(
        blockOptions.preservedFields[field]
      );
    });
    var blockTitle = '';
    (blockOptions.customFields || []).forEach(function (row) {
      var field = _normaliseCustomFieldName(row.field);
      if (!field) return;
      if (field === 'title') {
        blockTitle = String(row.setting || '');
        return;
      }
      if (field === 'icon' || field === 'c' || _isProtectedCustomWidgetProperty(field)) return;
      var parsed = typeof row.value !== 'undefined'
        ? { valid: true, value: row.value }
        : _parseCustomSetting(row.setting);
      if (parsed.valid) {
        entry.custom_fields[field] = _encodeCustomSettingValue(parsed.value);
      }
    });

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
      entry.icalurl = _calendarSourcesObject(_calendarWidgetConfig().sources);
      entry.maxitems = parseInt(widgetConfigs.calendar.calendar_maxitems, 10) || 15;
    }
    if (item.id === 'clock') {
      var clockType = widgetConfigs.clock.clockType || 'basicclock';
      entry.clockType = clockType;
      var ccfg = widgetConfigs.clock || {};
      if (clockType !== 'miniclock') {
        if (ccfg.scale !== '' && ccfg.scale !== null && typeof ccfg.scale !== 'undefined') entry.scale = ccfg.scale;
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
        if (cameras[0].videoUrl) entry.videoUrl = cameras[0].videoUrl;
      } else {
        entry.cameras = cameras;
      }
    }
    if (item.id === 'alarmmeldingen') {
      entry.rss = widgetConfigs.alarmmeldingen.rss;
      if (widgetConfigs.alarmmeldingen.filter) entry.filter = widgetConfigs.alarmmeldingen.filter;
    }
    if (item.id === 'iframe') {
      var icfg = widgetConfigs.iframe || {};
      entry.frameurl = icfg.frameurl || '';
      entry.scrollbars = Number(icfg.scrollbars) === 1;
      if (icfg.height && icfg.height !== '') entry.iframeHeight = parseInt(icfg.height, 10) || 400;
      if (icfg.scaletofit && icfg.scaletofit !== '') entry.scaletofit = parseInt(icfg.scaletofit, 10) || 0;
      if (icfg.aspectratio && icfg.aspectratio !== '') {
        entry.aspectratio = parseFloat(icfg.aspectratio) || 0;
        delete entry.iframeHeight;
      }
      if (Number(icfg.forcerefresh)) entry.forcerefresh = true;
      if (icfg.refresh && icfg.refresh !== '') entry.refresh = parseInt(icfg.refresh, 10) || 300;
    }
    if (item.id === 'xmltvguide') {
      var xcfg = widgetConfigs.xmltvguide || {};
      entry.xmltvurl = xcfg.xmltvurl || '';
      entry.channels = xcfg.channels && xcfg.channels !== ''
        ? xcfg.channels.split(',').map(function (value) { return value.trim(); }).filter(Boolean)
        : [];
      entry.maxitems = parseInt(xcfg.maxitems, 10) || 10;
      entry.layout = parseInt(xcfg.layout, 10) === 1 ? 1 : 0;
      entry.separator = xcfg.separator || '-';
      entry.refresh = parseInt(xcfg.refresh, 10) || 3600;
    }
    if (item.id === 'radio') {
      // Same shape as a hand-written _STREAMPLAYER_TRACKS entry, written onto
      // the block itself as blocks['streamplayer'].tracks. getBlockConfig
      // (dashticz.js) merges the block over DT_streamplayer's defaultCfg, so
      // this take precedence over any legacy _STREAMPLAYER_TRACKS global.
      entry.tracks = (widgetConfigs.radio || {}).tracks || [];
    }
    if (item.id === 'log') {
      var lgcfg = widgetConfigs.log || {};
      if (typeof lgcfg.scrolltimeout !== 'undefined' && lgcfg.scrolltimeout !== '') {
        entry.scrolltimeout = parseInt(lgcfg.scrolltimeout, 10);
      }
      entry.ascending = Number(lgcfg.ascending) !== 0;
      // maxitems stays unset unless explicitly configured, so an untouched
      // Domoticz log widget keeps showing every line (and its scrollbar).
      if (lgcfg.maxitems && lgcfg.maxitems !== '') {
        entry.maxitems = parseInt(lgcfg.maxitems, 10) || 0;
      }
      // logHeight/aspectratio stay unset unless explicitly configured, so an
      // untouched Domoticz log widget keeps Dashticz's automatic sizing.
      if (lgcfg.height && lgcfg.height !== '') entry.logHeight = parseInt(lgcfg.height, 10) || 0;
      if (lgcfg.aspectratio && lgcfg.aspectratio !== '') {
        entry.aspectratio = parseFloat(lgcfg.aspectratio) || 0;
        delete entry.logHeight;
      }
    }
    if (item.id === 'owm') {
      var owcfg = widgetConfigs.owm || {};
      // apikey/city/country are only added to the block when the user filled
      // them in, so an untouched widget keeps using DT_owmwidget's own
      // config['owm_api']/owm_city/owm_country fallback (js/components/owmwidget.js).
      if (owcfg.apikey && owcfg.apikey !== '') entry.apikey = owcfg.apikey;
      entry.layout = parseInt(owcfg.layout, 10) || 11;
      if (owcfg.city && owcfg.city !== '') entry.city = owcfg.city;
      if (owcfg.country && owcfg.country !== '') entry.country = owcfg.country;
    }
    if (item.id === 'timegraph') {
      var tgcfg2 = widgetConfigs.timegraph || {};
      if (tgcfg2.idx && tgcfg2.idx !== '') entry.idx = parseInt(tgcfg2.idx, 10);
      if (tgcfg2.duration && tgcfg2.duration !== '') entry.duration = parseInt(tgcfg2.duration, 10);
      if (tgcfg2.height && tgcfg2.height !== '') entry.timegraphHeight = String(tgcfg2.height);
      if (tgcfg2.xTicks && tgcfg2.xTicks !== '') entry.xTicks = parseInt(tgcfg2.xTicks, 10);
      if (tgcfg2.yTicks && tgcfg2.yTicks !== '') entry.yTicks = parseInt(tgcfg2.yTicks, 10);
      entry.xLabels = Number(tgcfg2.xLabels) !== 0;
      if (tgcfg2.animation && tgcfg2.animation !== '') entry.animation = parseInt(tgcfg2.animation, 10);
      if (tgcfg2.lineTension !== '' && typeof tgcfg2.lineTension !== 'undefined') {
        entry.lineTension = parseFloat(tgcfg2.lineTension);
      }
      if (tgcfg2.pointRadius !== '' && typeof tgcfg2.pointRadius !== 'undefined') {
        entry.pointRadius = parseInt(tgcfg2.pointRadius, 10);
      }
      // A values row without its own idx uses the block's main idx (see
      // DT_timegraph.run in js/components/timegraph.js). Rows are written as
      // plain strings when none of them use a custom idx/label, matching the
      // simplest documented syntax (values: ['NettUsage']); otherwise the
      // full {idx, value, label} object form is used so per-value overrides work.
      var tgValues = (tgcfg2.values || []).filter(function (row) {
        return row && row.value;
      });
      var needsObjectForm = tgValues.some(function (row) {
        return row.idx || row.label;
      });
      entry.values = tgValues.map(function (row) {
        if (!needsObjectForm) return row.value;
        var valueEntry = { value: row.value };
        if (row.idx) valueEntry.idx = parseInt(row.idx, 10);
        if (row.label) valueEntry.label = row.label;
        return valueEntry;
      });
    }
    if ($.trim(blockTitle)) entry.title = $.trim(blockTitle);
    return entry;
  }

  function _widgetEditorDraft(widgetId) {
    return {
      widgetConfig: $.extend(true, {}, widgetConfigs[widgetId] || {}),
      blockOptions: $.extend(true, {}, widgetBlockOptions[widgetId] || _defaultWidgetBlockOptions()),
    };
  }

  function _saveConfigOnly() {
    var payload = [];
    catalog.forEach(function (item) {
      if (!selectedWidgets[item.id]) return;
      payload.push(_buildWidgetPayloadEntry(item));
    });
    return $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return _postWidgetData(
          'js/savewidgets.php',
          {
            widgets: payload,
            settings: _collectConfigSettings(),
            screen: _activeScreenPayload(),
            blocksOnly: true,
            gridMode: gridMode,
          },
          data.token
        );
      });
  }

  /* When this popup opened while the Layout Editor was already active, a
     Save that only checks NEW widgets (nothing existing deselected) is
     handed off to that editor's own in-memory session instead of
     persisting immediately - see DashticzLayoutEditor.addPendingItems().
     Returns true when handled: the popup is closed and the caller's
     normal save must not also run. Each newly added widget starts with
     catalog defaults rather than whatever was just typed into its config
     form here; the Layout Editor's own Save persists those defaults, and
     the widget's own gear-icon config (already working without closing
     the editor) is how its settings get filled in afterwards. */
  function _graftIntoLayoutEditor() {
    if (
      typeof DashticzLayoutEditor === 'undefined' ||
      !DashticzLayoutEditor.isActive ||
      !DashticzLayoutEditor.isActive() ||
      !DashticzLayoutEditor.addPendingItems
    ) {
      return false;
    }

    var stillSelected = layoutEditorBaseline.every(function (id) {
      return selectedWidgets[id];
    });
    if (!stillSelected) return false;

    var newWidgetIds = Object.keys(selectedWidgets).filter(function (id) {
      return selectedWidgets[id] && layoutEditorBaseline.indexOf(id) === -1;
    });
    if (!newWidgetIds.length) return false;

    var entries = newWidgetIds.map(function (id) {
      var catalogItem =
        catalog.filter(function (item) {
          return item.id === id;
        })[0] || {};
      return {
        kind: 'widget',
        widgetId: id,
        name: catalogItem.title || id,
        width: catalogItem.width || 3,
        icon: catalogItem.icon,
      };
    });

    DashticzLayoutEditor.addPendingItems(entries);
    _closeModalWithoutSaving();
    return true;
  }

  function _closeModalWithoutSaving() {
    var el = document.getElementById('widgeteditorpopup');
    var instance =
      el && window.bootstrap && window.bootstrap.Modal.getInstance(el);
    if (instance) instance.hide();
  }

  function _save() {
    if (layoutEditorBaseline && _graftIntoLayoutEditor()) return;
    if (
      selectedWidgets.calendar &&
      widgetConfigs.calendar &&
      _calendarWidgetConfig().sources.some(function (source) {
        return !source.name || !/^https?:\/\/\S+$/i.test(source.ics || '');
      })
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

    var configSettings = _collectConfigSettings();

    var payload = [];
    catalog.forEach(function (item) {
      if (!selectedWidgets[item.id]) return;
      payload.push(_buildWidgetPayloadEntry(item));
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
            gridMode: gridMode,
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
              var catalogItem = catalog.filter(function (c) {
                return c.id === entry.id;
              })[0] || {};
              // A few widgets look wrong at the generic proportional/px-based
              // grid default (e.g. Domoticz log at a full-width, short strip)
              // and specify their own grid cell size directly, in grid units.
              var gridDefault = catalogItem.gridDefaultSize;
              var width = gridDefault
                ? Math.max(1, Math.min(gridConfig.gridColumns, gridDefault.width))
                : Math.max(
                    1,
                    Math.min(
                      gridConfig.gridColumns,
                      Math.round(
                        ((entry.width || 3) * gridConfig.gridColumns) / 12
                      )
                    )
                  );
              // entry.height is only present for a widget with an explicit
              // custom height; fall back to the catalog default just to size
              // the initial grid cell, without writing it into the block.
              var height = gridDefault
                ? Math.max(1, gridDefault.height)
                : Math.max(
                    1,
                    Math.ceil(
                      ((entry.height || catalogItem.height || 120) +
                        gridConfig.gap) /
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
    openConfig: openConfig,
    openLayoutConfig: openLayoutConfig,
  };
})();

//# sourceURL=js/widgeteditor.js
