/* global Domoticz settings columns columns_standby blocks blocktypes screens standby_screen DashticzScreenSwitcher standbyActive language */
// eslint-disable-next-line no-unused-vars
var DashticzDeviceEditor = (function () {
  'use strict';

  /* ── state ──────────────────────────────────────────────────── */
  /* Composite keys: '493' for plain devices, '1298_1' for sub-devices */
  var managedDevices = [];   // composite keys managed by the device editor
  var managedOrder   = [];   // device:<ck> and widget:<id> in screen order
  var managedWidgets = {};   // order key -> widget metadata
  var managedSpecials = {};  // order key -> dummy/title block metadata
  var deviceNames    = {};   // composite key -> device name
  var deviceWidths   = {};   // composite key -> block width (1..12)
  var deviceHeights  = {};   // composite key -> optional block height
  var deviceTitles   = {};   // composite key -> optional title override
  var deviceOptions  = {};   // composite key -> icon/hide_data/last_update/switch
  var deviceTitleVisible = {}; // composite key -> title shown/hidden
  var deviceCustomFields = {}; // composite key -> editable extra CONFIG.js fields
  var devicePreservedFields = {}; // hidden CONFIG.js fields (for example c) that must survive saves
  var widgetWidths   = {};   // widget order key -> block width (1..12)
  var widgetHeights  = {};   // widget order key -> optional block height
  var widgetTitles   = {};   // widget order key -> optional title override
  var widgetOptions  = {};   // widget order key -> icon/hide_data/last_update
  var widgetTitleVisible = {}; // widget order key -> title shown/hidden
  var pendingWidgetSettings = {}; // full Widget Config settings edited from Device Editor
  var editorMode     = 'devices'; // devices, dummy or title
  var gridMode       = false;
  var gridConfig     = null;
  var gridPositions  = {};   // order key -> {x,y,w,h}
  var gridRefs       = {};   // order key -> block reference
  var gridExtras     = [];   // non-device/widget blocks
  var TITLE_GRID_HEIGHT = 3;

  function _translations() {
    var configured =
      typeof language !== 'undefined' &&
      language.settings && language.settings.deviceeditor
        ? language.settings.deviceeditor
        : {};
    return $.extend(
      {
        editor_title: 'Device Editor',
        configured_items: 'Devices and widgets in Dashticz',
        empty_items: 'No devices or widgets configured in Dashticz.',
        add_item: 'Add device or block',
        select_item: 'Select a device or block',
        dummy_device: 'Dummy device',
        title_block: 'Title',
        enter_idx: 'Enter IDX',
        enter_title: 'Enter title',
        invalid_idx: 'Enter a valid positive IDX.',
        invalid_title: 'Enter a title.',
        width: 'Width',
        title: 'Title',
        icon: 'Icon',
        hide_data: 'Hide data',
        last_update: 'Last update',
        switch: 'Switch',
        dial: 'Dial',
        dial_hint: 'Dial type selected. Set the remaining dial options (color, min/max, subtype, values, etc.) manually via Custom fields below.',
        dial_hint_link: 'Dial documentation',
        show_title: 'Title',
        device_config: 'Device Config',
        widget_config: 'Widget Config',
        configure: 'Configure',
        custom_fields: 'Custom fields',
        custom_fields_help: 'Field and Setting are written as typed block parameters in CONFIG.js.',
        custom_devices: 'Custom devices',
        slide_button: 'Slide button',
        slide_button_name: 'Button name',
        slide_button_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        slide_button_key: 'Key',
        slide_button_title: 'Title',
        slide_button_screen: 'Screen',
        slide_button_icon: 'Icon',
        invalid_slide_button_name: 'Enter a valid unique button name.',
        invalid_slide_target: 'Enter a valid positive screen number.',
        custom_device_name: 'Device name',
        custom_device_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        custom_device_options: 'Device options',
        custom_device_values_help: 'For arrays or objects, enter valid JSON.',
        invalid_custom_device_name: 'Enter a valid unique device name.',
        multi_device: 'Multi Device',
        multi_device_name: 'Device name',
        multi_device_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        multi_device_idx: 'Main IDX',
        multi_device_idx_help: 'Used by every value row below that does not set its own IDX.',
        multi_device_title: 'Title',
        multi_device_values: 'Values',
        multi_device_values_help: 'Combine values from the main device and/or other devices in one block.',
        multi_device_row_idx: 'IDX (optional)',
        multi_device_row_value: 'Value, e.g. <Usage>',
        add_value_row: 'Add value',
        remove_value_row: 'Remove value',
        invalid_multi_device_name: 'Enter a valid unique device name.',
        invalid_value_row: 'Enter a value placeholder (e.g. <Usage>) for every row.',
        separator: 'Separator',
        icon_requires_checkbox: 'Enable Icon before using the icon field.',
        field: 'Field',
        setting: 'Setting',
        add_field: 'Add field',
        remove_field: 'Remove field',
        invalid_field: 'Enter a valid Field and Setting.',
        duplicate_field: 'This field is duplicated or reserved.',
        invalid_setting: 'Setting contains invalid JSON.',
        cancel: 'Cancel',
        ok: 'OK',
        remove: 'Remove block',
        close: 'Close',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved!',
        drag_to_reorder: 'Drag to reorder',
        widget: 'Widget',
        widget_prefix: 'Widget -',
        managed_widget: 'Remove this widget from the Widgets menu',
        select_aria: 'Select device to add',
        column_width: 'Column width (1-12)',
        add_device: 'Add device',
        save_failed: 'Devices could not be saved automatically.',
        error_prefix: 'Error:',
      },
      configured
    );
  }

  /* ── public API ─────────────────────────────────────────────── */
  function open() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _buildAndShowModal();
  }

  function openSpecial(kind) {
    editorMode = kind === 'title' ? 'title' : 'dummy';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _buildAndShowModal();
  }

  /** Open Device Config directly for a rendered block while retaining the
   * normal Device Editor as the save parent shown after the config popup closes. */
  function openConfig(reference) {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();

    var prepared = _prepareManagedDeviceState();
    var orderKey = '';
    var special = _specialFromReference(reference);
    if (special && managedSpecials[special.orderKey]) {
      orderKey = special.orderKey;
    } else {
      var definition =
        typeof reference === 'string' &&
        typeof blocks !== 'undefined' &&
        blocks[reference]
          ? blocks[reference]
          : reference;
      var ck = _toCompositeKey(definition);
      if (ck && managedOrder.indexOf(_deviceOrderKey(ck)) > -1) {
        orderKey = _deviceOrderKey(ck);
      }
    }
    if (!orderKey) return false;

    $('#deviceeditorpopup').remove();
    $('body').append(_buildModalHtml(prepared.available, prepared.allDomoticz));
    _attachHandlers(prepared.available, prepared.allDomoticz);
    _showConfigPopup(orderKey, document.getElementById('deviceeditorpopup'));
    return true;
  }

  /** Open the dedicated Custom devices popup used by the Screen Editor add menu. */
  function openCustom() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showCustomDevicePopup();
  }

  /** Open the dedicated Multi Device popup used by the Screen Editor add menu. */
  function openMultiDevice() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showMultiDevicePopup();
  }

  /** Open the dedicated Slide button popup used by the Screen Editor add menu. */
  function openSlideButton() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showSlideButtonPopup();
  }

  /** Add a full-width separator immediately, without opening the Device Editor. */
  function addSeparator() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();

    var t = _translations();
    var reference = _nextSpecialReference('title');
    var orderKey = _specialOrderKey(reference);
    managedSpecials[orderKey] = {
      kind: 'special',
      specialType: 'title',
      orderKey: orderKey,
      reference: reference,
      definition: {},
      idx: null,
      title: t.separator,
      width: 12,
      height: 120,
      showTitle: true,
      options: null,
      customFields: [{ field: 'title', setting: t.separator, value: t.separator, system: true }],
      preservedFields: {},
    };
    managedOrder.push(orderKey);
    _save();
  }

  /* ── initialise managed-device list from ALL current Dashticz devices ── */
  function _init() {
    managedDevices = [];
    managedOrder   = [];
    managedWidgets = {};
    managedSpecials = {};
    deviceNames    = {};
    deviceWidths   = {};
    deviceHeights  = {};
    deviceTitles   = {};
    deviceOptions  = {};
    deviceTitleVisible = {};
    deviceCustomFields = {};
    devicePreservedFields = {};
    widgetWidths   = {};
    widgetHeights  = {};
    widgetTitles   = {};
    widgetOptions  = {};
    widgetTitleVisible = {};
    pendingWidgetSettings = {};
    gridPositions  = {};
    gridRefs       = {};
    gridExtras     = [];
    gridConfig     = gridMode ? _readGridConfig() : null;

    (gridMode ? _getAllManagedGridItems() : _getAllManagedItems()).forEach(function (item) {
      managedOrder.push(item.orderKey);
      if (gridMode) {
        gridPositions[item.orderKey] = item.grid;
        gridRefs[item.orderKey] = item.reference;
      }
      if (item.kind === 'widget') {
        managedWidgets[item.orderKey] = item;
        widgetWidths[item.orderKey] = _parseWidth(item.definition.width);
        widgetHeights[item.orderKey] = _parseHeight(item.definition.height);
        widgetTitles[item.orderKey] = String(item.definition.title || item.title || '');
        widgetOptions[item.orderKey] = {
          icon: typeof item.definition.icon === 'undefined' || item.definition.icon !== '',
          iconValue: typeof item.definition.icon === 'string' && item.definition.icon !== ''
            ? item.definition.icon
            : null,
          hide_data: item.definition.hide_data === true,
          last_update: item.definition.last_update === true,
        };
        widgetTitleVisible[item.orderKey] = item.definition.hide_title !== true;
      } else if (item.kind === 'special') {
        managedSpecials[item.orderKey] = item;
      } else {
        managedDevices.push(item.ck);
      }
    });
  }

  /* ── composite key helpers ──────────────────────────────────── */
  /* Build a composite key from a base idx and optional sub-index  */
  function _ck(idx, subidx) {
    return subidx ? (idx + '_' + subidx) : String(idx);
  }

  /* Parse a composite key back into {idx, subidx} */
  function _parseCk(ck) {
    /* group/scene key e.g. 's1' */
    if (/^s\d+$/.test(String(ck))) {
      return { idx: String(ck), subidx: 0 };
    }
    var parts = String(ck).split('_');
    return {
      idx:    parseInt(parts[0], 10),
      subidx: parts.length === 2 ? parseInt(parts[1], 10) : 0,
    };
  }

  /* Return true when ck is a group/scene composite key (e.g. 's1') */
  function _isGroupCk(ck) {
    return /^s\d+$/.test(String(ck));
  }

  /* Sort rank for available-device list: Groups first, Scenes second, Devices last */
  function _typeOrder(type) {
    if (type === 'Group') return 0;
    if (type === 'Scene') return 1;
    return 2;
  }

  /* Sort available[] by category (Group < Scene < Device) then alphabetically */
  function _sortAvailable(list) {
    list.sort(function (a, b) {
      var diff = _typeOrder(a.type) - _typeOrder(b.type);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }

  /* Convert a block reference (number / string / object) to a composite key */
  function _toCompositeKey(b) {
    if (typeof b === 'number' && b > 0) return String(b);
    if (typeof b === 'string') {
      var n = parseInt(b, 10);
      /* pure numeric string e.g. '493' */
      if (n > 0 && String(n) === b) return b;
      /* group/scene key e.g. 's1' */
      if (/^s\d+$/.test(b)) return b;
      /* compound string e.g. '1298_1' */
      var parts = b.split('_');
      if (parts.length === 2) {
        var base = parseInt(parts[0], 10);
        var sub  = parseInt(parts[1], 10);
        if (base > 0 && sub > 0) return b;
      }
      return null;
    }
    if (typeof b === 'object' && b !== null) {
      /* b.idx may be a compound string like '907_1' written by saveblocks.php */
      if (typeof b.idx === 'string') {
        var ckFromStr = _toCompositeKey(b.idx);
        if (ckFromStr) return ckFromStr;
      }
      var idx = parseInt(b.idx, 10);
      if (idx > 0) {
        var subidx = (typeof b.subidx === 'number' && b.subidx > 0) ? b.subidx : 0;
        return _ck(idx, subidx);
      }
    }
    return null;
  }

  /* ── collect every managed device from all columns ─────────── */
  function _deviceOrderKey(ck) {
    return 'device:' + ck;
  }

  function _widgetOrderKey(id) {
    return 'widget:' + id;
  }

  function _specialOrderKey(reference) {
    return 'special:' + reference;
  }

  /* Build the same immutable reference that saveblocks.php uses. Supplying the
     reference in the initial request keeps a newly added device addressable
     throughout the complete blocks -> layout save chain. */
  function _stableDeviceReference(ck) {
    if (_isGroupCk(ck)) return String(ck);
    var parsed = _parseCk(ck);
    return 'device_' + parsed.idx + (parsed.subidx ? '_' + parsed.subidx : '');
  }

  /* Recognise editor-created dummy and title blocks without treating every
     hand-written block with hide_data as a dummy device. */
  function _specialFromReference(reference) {
    if (
      typeof reference !== 'string' ||
      typeof blocks === 'undefined' ||
      !blocks[reference]
    ) {
      return null;
    }
    var definition = blocks[reference];
    var kind = null;
    if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      String(definition.type || '').toLowerCase() === 'blocktitle'
    ) {
      kind = 'title';
    } else if (/^dummyblock_\d+$/.test(reference)) {
      kind = 'dummy';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      typeof definition.idx === 'undefined' &&
      parseInt(definition.slide, 10) > 0
    ) {
      // Keep slide-only helper buttons editable in Device/Layout Editor.
      kind = 'slidebutton';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      !/^device_\d+(?:_\d+)?$/.test(reference) &&
      (!definition.type || definition.type === 'dial' || definition.type === reference) &&
      parseInt(definition.idx, 10) > 0
    ) {
      // A device with a hand-picked block key is a Custom device. Recognising
      // it before the normal IDX path preserves that key on later editor saves.
      // A Custom device rendered with the Dial checkbox still carries
      // type: 'dial', so it must not be excluded like other typed (widget) blocks.
      // Once rendered, blocks.js's convertBlock() stamps block.type with the
      // block's own storage key as a dispatch hint (see e.g. the 'sunrise'/'log'
      // key-as-type convention), and dashticz.js writes that back into blocks[key].
      // For a Custom/Multi Device that hint is never a real widget type, so
      // definition.type === reference must not be treated as one either -
      // otherwise the Settings button opens the wrong (shared-idx) device once
      // the tile has rendered at least once (#115).
      kind = 'custom';
    }
    if (!kind) return null;

    return {
      kind: 'special',
      specialType: kind,
      orderKey: _specialOrderKey(reference),
      reference: reference,
      definition: definition,
      idx:
        kind === 'title' || kind === 'slidebutton'
          ? null
          : parseInt(definition.idx, 10),
      title: kind === 'custom'
        ? String(definition.title || '')
        : String(definition.title || (kind === 'title' ? 'Title' : reference)),
      width: _parseWidth(definition.width || (kind === 'title' ? 12 : 3)),
      height: _parseHeight(definition.height),
      // hide_data/last_update/switch are unused for a title/separator block,
      // but icon applies to every special kind.
      options: {
        icon: typeof definition.icon === 'undefined' || definition.icon !== '',
        iconValue: typeof definition.icon === 'string' && definition.icon !== ''
          ? definition.icon
          : null,
        hide_data: definition.hide_data === true,
        last_update: definition.last_update === true,
        switch: definition.switch === true,
        dial: definition.type === 'dial',
      },
      buttonKey: String(definition.key || ''),
      slideTarget: parseInt(definition.slide, 10) > 0 ? parseInt(definition.slide, 10) : 1,
      showTitle: definition.hide_title !== true,
      customFields: _deviceCustomFieldRows(definition, definition.title),
      preservedFields: _devicePreservedFieldValues(definition),
    };
  }

  function _widgetFromReference(reference) {
    // Use translations from the active language file (widgetEditorTranslations is defined
    // in settings.js and populated from /lang/<locale>.json settings.widgeteditor section).
    // Fall back to English when the key is missing or the variable is not yet available.
    var t =
      typeof widgetEditorTranslations !== 'undefined' ? widgetEditorTranslations : {};

    // Translated display titles keyed by widget type id.
    // This map is used both for named catalog entries (widget_xxx) and for
    // type-mapped blocks so that language changes always take effect immediately,
    // regardless of any hardcoded title stored in CONFIG.js.
    var translatedTitles = {
      weather:        t.weather_title        || 'Weather',
      garbage:        t.garbage_title        || 'Garbage',
      spotify:        t.spotify_title        || 'Spotify',
      sonarr:         t.sonarr_title         || 'Sonarr',
      clock:          t.clock_title          || 'Clock',
      calendar:       t.calendar_title       || 'Calendar (ICS)',
      secpanel:       t.secpanel_title       || 'Security panel',
      publictransport: t.publictransport_title || 'Public transport',
      trafficinfo:    t.trafficinfo_title    || 'Traffic information',
      alarmmeldingen: t.alarmmeldingen_title || '112',
      camera:         t.camera_title         || 'Cameras',
      map:            t.map_title            || 'Google Maps',
      longfonds:      t.longfonds_title      || 'Air quality',
      moon:           t.moon_title           || 'Moon',
      news:           t.news_title           || 'News',
      iframe:         t.iframe_title         || 'iFrame',
      xmltvguide:     t.xmltvguide_title     || 'TV Guide',
      radio:          t.radio_title          || 'Radio',
      log:            t.log_title            || 'Domoticz log',
      sunrise:        t.sunrise_title        || 'Sunrise / Sunset',
      owm:            t.owm_title            || 'OpenWeatherMap',
      timegraph:      t.timegraph_title      || 'Timegraph',
    };

    var catalog = {
      widget_weather:         { id: 'weather',         title: translatedTitles.weather },
      widget_garbage:         { id: 'garbage',         title: translatedTitles.garbage },
      widget_spotify:         { id: 'spotify',         title: translatedTitles.spotify },
      widget_sonarr:          { id: 'sonarr',          title: translatedTitles.sonarr },
      widget_clock:           { id: 'clock',           title: translatedTitles.clock },
      widget_calendar:        { id: 'calendar',        title: translatedTitles.calendar },
      widget_secpanel:        { id: 'secpanel',        title: translatedTitles.secpanel },
      widget_publictransport: { id: 'publictransport', title: translatedTitles.publictransport },
      widget_trafficinfo:     { id: 'trafficinfo',     title: translatedTitles.trafficinfo },
      widget_alarmmeldingen:  { id: 'alarmmeldingen',  title: translatedTitles.alarmmeldingen },
      widget_cameras:         { id: 'camera',          title: translatedTitles.camera },
      widget_map:             { id: 'map',             title: translatedTitles.map },
      widget_longfonds:       { id: 'longfonds',       title: translatedTitles.longfonds },
      widget_moon:            { id: 'moon',            title: translatedTitles.moon },
      widget_news:            { id: 'news',            title: translatedTitles.news },
      widget_iframe:         { id: 'iframe',         title: translatedTitles.iframe },
      widget_xmltvguide:     { id: 'xmltvguide',     title: translatedTitles.xmltvguide },
      // Streamplayer/Radio is dispatched by its component name directly, so
      // it is always keyed 'streamplayer' rather than a 'widget_' prefix.
      streamplayer:          { id: 'radio',          title: translatedTitles.radio },
      widget_owmwidget:      { id: 'owm',            title: translatedTitles.owm },
      widget_timegraph:      { id: 'timegraph',      title: translatedTitles.timegraph },
      // DT_log and 'sunrise' (via DT_simpleblock) are also dispatched by their
      // plain block key, exactly like streamplayer above.
      log:                   { id: 'log',            title: translatedTitles.log },
      sunrise:               { id: 'sunrise',        title: translatedTitles.sunrise },
    };
    if (typeof blocks === 'undefined' || !blocks[reference]) {
      return null;
    }
    var definition = blocks[reference];
    var catalogItem = catalog[String(reference)];
    if (!catalogItem && Array.isArray(definition.tracks)) {
      catalogItem = { id: 'radio', title: translatedTitles.radio };
    }
    if (!catalogItem) {
      var type = String(definition.type || '').toLowerCase();
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
        frame: 'iframe',
        iframe: 'iframe',
        xmltvguide: 'xmltvguide',
        basicclock: 'clock',
        stationclock: 'clock',
        flipclock: 'clock',
        haymanclock: 'clock',
        miniclock: 'clock',
        log: 'log',
        sunrise: 'sunrise',
        owmwidget: 'owm',
        timegraph: 'timegraph',
      };
      var id = typeMap[type];
      if (!id) return null;
      // Keep widget list labels language-based. User-defined block titles remain
      // editable separately and are applied only on the rendered screen block.
      catalogItem = { id: id, title: translatedTitles[id] || id };
    }
    return {
      kind: 'widget',
      id: catalogItem.id,
      orderKey: _widgetOrderKey(catalogItem.id),
      reference: String(reference),
      // Always prefer the translated catalog title so that language changes in
      // Settings are immediately reflected, regardless of any title hardcoded
      // in CONFIG.js (e.g. title:'Afval' written in a previous language).
      title: catalogItem.title,
      definition: definition,
    };
  }

  function _copyDefinedWidgetProperties(entry, definition, properties) {
    properties.forEach(function (property) {
      if (typeof definition[property] !== 'undefined') {
        entry[property] = definition[property];
      }
    });
  }

  function _widgetCustomFields(definition) {
    var protectedFields = {
      type: true, id: true, key: true, width: true, height: true, grid: true,
      idx: true, subidx: true, icon: true, hide_data: true, last_update: true,
      hide_title: true, text_alignment: true, text_align: true, title: true,
    };
    var custom = {};
    Object.keys(definition || {}).forEach(function (property) {
      var value = definition[property];
      if (protectedFields[property] || /^_dashticz/.test(property)) return;
      if (typeof value === 'undefined' || typeof value === 'function') return;
      custom[property] = value;
    });
    return custom;
  }

  var protectedCustomDeviceProperties = {
    type: true, id: true, key: true, kind: true, width: true, height: true,
    grid: true, idx: true, subidx: true, title: true, icon: true,
    hide_data: true, last_update: true, switch: true, hide_title: true,
    text_alignment: true, text_align: true, custom_fields: true, c: true,
    __proto__: true, prototype: true, constructor: true,
  };

  function _settingToText(value) {
    if (value !== null && typeof value === 'object') {
      try { return JSON.stringify(value); } catch (ignore) { return ''; }
    }
    return String(value);
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
      } catch (ignore) { /* a translated validation message is shown by the popup */ }
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

  function _deviceCustomFieldRows(definition, titleValue) {
    var rows = [{
      field: 'title',
      setting: typeof titleValue === 'undefined' ? String((definition || {}).title || '') : String(titleValue || ''),
      value: typeof titleValue === 'undefined' ? String((definition || {}).title || '') : String(titleValue || ''),
      system: true,
    }];
    if (definition && typeof definition.icon === 'string' && definition.icon !== '') {
      rows.push({ field: 'icon', setting: definition.icon, value: definition.icon });
    }
    Object.keys(definition || {}).forEach(function (property) {
      var lowerProperty = property.toLowerCase();
      if (protectedCustomDeviceProperties[lowerProperty] || /^_dashticz/i.test(property)) return;
      var value = definition[property];
      if (typeof value === 'undefined' || typeof value === 'function') return;
      rows.push({
        field: property,
        setting: _settingToText(value),
        value: value,
      });
    });
    return rows;
  }

  function _devicePreservedFieldValues(definition) {
    var preserved = {};
    if (definition && Object.prototype.hasOwnProperty.call(definition, 'c')) {
      preserved.c = definition.c;
    }
    return preserved;
  }

  function _customFieldsObject(rows) {
    var customFields = {};
    (rows || []).forEach(function (row) {
      if (row && row.field) customFields[row.field] = row.value;
    });
    return customFields;
  }

  function _deviceCustomFieldsObject(rows, preserved) {
    var customFields = $.extend({}, preserved || {});
    (rows || []).forEach(function (row) {
      if (!row || !row.field) return;
      var field = _normaliseCustomFieldName(row.field);
      if (!field || field === 'title' || field === 'icon' || field === 'c') return;
      customFields[field] = _encodeCustomSettingValue(row.value);
    });
    Object.keys(customFields).forEach(function (field) {
      customFields[field] = _encodeCustomSettingValue(customFields[field]);
    });
    return customFields;
  }

  function _widgetPayload(orderKey) {
    var widget = managedWidgets[orderKey];
    var definition = widget.definition || {};
    if (widget.pendingPayload) {
      var pendingEntry = $.extend(true, {}, widget.pendingPayload);
      pendingEntry.id = widget.id;
      pendingEntry.width = _parseWidth(widgetWidths[orderKey]);
      if (widgetHeights[orderKey]) pendingEntry.height = widgetHeights[orderKey];
      if (widget.pendingTitleEdited) {
        var pendingTitle = String(widgetTitles[orderKey] || '').trim();
        if (pendingTitle) pendingEntry.title = pendingTitle;
        else delete pendingEntry.title;
      } else if (widget.id !== 'camera') {
        // Opening full Widget Config from Device Editor must not drop the title
        // that Device Editor already preserved for regular widget blocks.
        var preservedTitle = String(widgetTitles[orderKey] || '').trim();
        if (preservedTitle) pendingEntry.title = preservedTitle;
      }
      return pendingEntry;
    }
    var entry = {
      id: widget.id,
      width: _parseWidth(widgetWidths[orderKey]),
    };
    var title = String(widgetTitles[orderKey] || '').trim();
    if (title) entry.title = title;
    if (widgetHeights[orderKey]) entry.height = widgetHeights[orderKey];
    var displayOptions = widgetOptions[orderKey] || {};
    if (displayOptions.icon === false) {
      entry.icon = '';
    } else if (displayOptions.iconValue) {
      // Preserve a hand-written custom icon while the visible Icon option stays on.
      entry.icon = displayOptions.iconValue;
    }
    entry.hide_data = displayOptions.hide_data === true;
    entry.last_update = displayOptions.last_update === true;
    if (widgetTitleVisible[orderKey] === false) entry.hide_title = true;
    if (widget.id === 'garbage') {
      entry.displayTitle = widget.title;
      _copyDefinedWidgetProperties(entry, definition, ['maxitems', 'maxdays']);
    }

    if (widget.id === 'weather') {
      entry.provider =
        definition.widget_provider ||
        (definition.type === 'wunderground'
          ? 'wunderground'
          : 'openweather');
      _copyDefinedWidgetProperties(entry, definition, [
        'showRain',
        'showDescription',
        'showWind',
        'showGust',
        'icons',
      ]);
    } else if (widget.id === 'calendar') {
      entry.icalurl = definition.icalurl || '';
      _copyDefinedWidgetProperties(entry, definition, ['maxitems']);
    } else if (widget.id === 'clock') {
      entry.clockType = definition.type || 'basicclock';
      _copyDefinedWidgetProperties(entry, definition, [
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
      ]);
    } else if (widget.id === 'publictransport') {
      entry.station = definition.station || 'UT';
      entry.provider = definition.provider || 'treinen';
    } else if (widget.id === 'camera') {
      // Multi-camera blocks use a cameras array instead of the legacy URL fields.
      // Preserve that shape so opening Device Config cannot invalidate the block.
      if (Array.isArray(definition.cameras)) {
        entry.cameras = definition.cameras;
      } else {
        entry.imageUrl = definition.imageUrl || '';
        if (definition.videoUrl) entry.videoUrl = definition.videoUrl;
      }
    } else if (widget.id === 'alarmmeldingen') {
      entry.rss =
        definition.rss || 'https://www.alarmeringen.nl/feeds/all.rss';
      if (definition.filter) entry.filter = definition.filter;
    } else if (widget.id === 'xmltvguide') {
      // savewidgets.php rejects the whole save when a resubmitted xmltvguide
      // block has no xmltvurl, so it must be carried over explicitly here.
      // The URL normally lives in the global xmltv_url setting rather than on
      // the block itself; only a hand-added block-level override takes
      // precedence over that.
      entry.xmltvurl =
        definition.xmltvurl ||
        (typeof settings !== 'undefined' && settings.xmltv_url) ||
        '';
      _copyDefinedWidgetProperties(entry, definition, [
        'channels',
        'maxitems',
        'layout',
        'separator',
        'refresh',
      ]);
    } else if (widget.id === 'iframe') {
      // Same requirement as xmltvguide above: frameurl is mandatory server-side.
      entry.frameurl = definition.frameurl || '';
      _copyDefinedWidgetProperties(entry, definition, [
        'scrollbars',
        'iframeHeight',
        'scaletofit',
        'aspectratio',
        'forcerefresh',
        'refresh',
      ]);
    } else if (widget.id === 'radio') {
      // Same requirement as xmltvguide/iframe above: savewidgets.php rejects
      // the whole save when a resubmitted radio block has no tracks, so the
      // station list must be carried over explicitly (it lives on the block
      // itself, not in custom_fields, which savewidgets.php never reads for
      // it). A block that only sets other properties (e.g. blocks['streamplayer']
      // = {image: 'radio.png'}, per the documented syntax) relies on the
      // legacy _STREAMPLAYER_TRACKS global instead, so fall back to that.
      entry.tracks = Array.isArray(definition.tracks)
        ? definition.tracks
        : (typeof window !== 'undefined' && Array.isArray(window._STREAMPLAYER_TRACKS)
          ? window._STREAMPLAYER_TRACKS
          : []);
    } else if (widget.id === 'log') {
      if (typeof definition.scrolltimeout !== 'undefined') entry.scrolltimeout = definition.scrolltimeout;
      entry.ascending = definition.ascending !== false;
      _copyDefinedWidgetProperties(entry, definition, ['aspectratio', 'maxitems']);
      if (typeof definition.height !== 'undefined') entry.logHeight = definition.height;
    } else if (widget.id === 'owm') {
      _copyDefinedWidgetProperties(entry, definition, ['apikey', 'layout', 'city', 'country']);
    } else if (widget.id === 'timegraph') {
      // idx is a protected/common property (see protectedCustomDeviceProperties
      // below), so it never survives the generic custom_fields fallback and
      // must be copied explicitly or a resize-only Device Editor save would
      // silently drop the block's main Domoticz device.
      _copyDefinedWidgetProperties(entry, definition, [
        'idx', 'duration', 'xTicks', 'yTicks', 'xLabels',
        'animation', 'lineTension', 'pointRadius', 'values',
      ]);
      if (typeof definition.height !== 'undefined') entry.timegraphHeight = definition.height;
    }

    // savewidgets.php rebuilds the managed block section. Re-submit every safe
    // existing property so a Device Editor save cannot erase custom widget
    // parameters created in Widget Config or added by hand.
    entry.custom_fields = _widgetCustomFields(definition);

    return entry;
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
    var $active = $('.dt-container .screen.swiper-slide-active[data-screenindex]');
    if (!$active.length) {
      $active = $('.dt-container .screen[data-screenindex]:visible').first();
    }
    if ($('.screenstandby:visible').length) return 'standby';
    var fromDom = parseInt($active.attr('data-screenindex'), 10);
    return fromDom > 0 ? fromDom : 1;
  }

  /** Numeric screen for PHP endpoints; standby is sent as the string "standby". */
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

  function _getAllManagedGridItems() {
    var ordered = [];
    var seen = {};
    _activeScreenDom()
      .children('.dt-grid-layout')
      .children('.dt-grid-item')
      .each(function (index) {
        var reference = String($(this).attr('data-grid-block') || '');
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : null;
        if (!definition) return;
        var grid = {
          x: _gridValue(this, '--dt-grid-x', 1),
          y: _gridValue(this, '--dt-grid-y', index + 1),
          w: _gridValue(this, '--dt-grid-w', 1),
          h: _gridValue(this, '--dt-grid-h', 1),
        };
        var special = _specialFromReference(reference);
        if (special && !seen[special.orderKey]) {
          seen[special.orderKey] = true;
          special.grid = grid;
          ordered.push(special);
          return;
        }
        var ck = _toCompositeKey(definition);
        if (ck) {
          var deviceKey = _deviceOrderKey(ck);
          if (!seen[deviceKey]) {
            seen[deviceKey] = true;
            ordered.push({
              kind: 'device',
              ck: ck,
              orderKey: deviceKey,
              reference: reference,
              grid: grid,
            });
          }
          return;
        }
        var widget = _widgetFromReference(reference);
        if (widget && !seen[widget.orderKey]) {
          seen[widget.orderKey] = true;
          widget.reference = reference;
          widget.grid = grid;
          ordered.push(widget);
          return;
        }
        gridExtras.push({ ref: reference, grid: grid });
      });
    return ordered;
  }

  function _gridValue(element, property, fallback) {
    var value = parseInt(element.style.getPropertyValue(property), 10);
    return value > 0 ? value : fallback;
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

  function _getAllManagedItems() {
    var seen = {};
    var ordered = [];
    if (typeof columns === 'undefined') return ordered;

    var columnKeys = [];
    var $activeScreen = _activeScreenDom();
    $activeScreen.find('[data-colindex]').each(function () {
      var columnKey = String($(this).attr('data-colindex'));
      if (columnKeys.indexOf(columnKey) < 0) {
        columnKeys.push(columnKey);
      }
    });

    // Standby uses columns_standby, not screens[].
    if (_activeScreenTarget() === 'standby') {
      if (typeof columns_standby !== 'undefined' && columns_standby) {
        Object.keys(columns_standby).forEach(function (colKey) {
          if (columnKeys.indexOf(String(colKey)) < 0) {
            columnKeys.push(String(colKey));
          }
        });
      }
    }

    columnKeys.forEach(function (colKey) {
      var lookupKey = String(colKey);
      if (
        _activeScreenTarget() === 'standby' &&
        /^standby/.test(lookupKey)
      ) {
        lookupKey = lookupKey.replace(/^standby/, '');
      }
      var col =
        _activeScreenTarget() === 'standby' &&
        typeof columns_standby !== 'undefined' &&
        columns_standby[lookupKey]
          ? columns_standby[lookupKey]
          : columns[colKey];
      if (!col && typeof columns !== 'undefined') {
        col = columns[lookupKey];
      }
      if (col && Array.isArray(col.blocks)) {
        col.blocks.forEach(function (b) {
          var special = _specialFromReference(b);
          if (special && !seen[special.orderKey]) {
            seen[special.orderKey] = true;
            ordered.push(special);
            return;
          }
          var ck = _toCompositeKey(b);
          if (
            !ck &&
            typeof b === 'string' &&
            typeof blocks !== 'undefined' &&
            blocks[b]
          ) {
            ck = _toCompositeKey(blocks[b]);
          }
          if (ck) {
            var deviceKey = _deviceOrderKey(ck);
            if (!seen[deviceKey]) {
              seen[deviceKey] = true;
              ordered.push({
                kind: 'device',
                ck: ck,
                orderKey: deviceKey,
                reference: typeof b === 'string'
                  ? b
                  : _stableDeviceReference(ck),
              });
            }
            return;
          }

          var widget = _widgetFromReference(b);
          if (widget && !seen[widget.orderKey]) {
            seen[widget.orderKey] = true;
            ordered.push(widget);
          }
        });
      }
    });
    return ordered;
  }

  /* ── count how many sub-values a device type has (0/1 = single) ── */
  function _getSubValueCount(device) {
    if (typeof blocktypes === 'undefined') return 0;
    var bt = blocktypes[device.Type];
    if (!bt) return 0;
    /* check sub-type first */
    var proto = bt;
    if (bt.SubType && device.SubType && bt.SubType[device.SubType]) {
      proto = bt.SubType[device.SubType];
    }
    if (Array.isArray(proto.values)) return proto.values.length;
    if (Array.isArray(bt.values))    return bt.values.length;
    return 0;
  }

  /* ── build available device list (Domoticz minus Dashticz) ─── */
  function _getAvailableDevices(managedKeys) {
    var all = Domoticz.getAllDevices();

    /* build fast lookup sets */
    var managedSet       = {};   /* all composite keys currently managed */
    var managedFullIdx   = {};   /* base idx that is managed WITHOUT a sub-index */
    managedKeys.forEach(function (ck) {
      managedSet[ck] = true;
      var p = _parseCk(ck);
      if (!p.subidx) managedFullIdx[p.idx] = true;
    });

    var available = [];
    Object.keys(all).forEach(function (key) {
      if (!key || key[0] === '_') return;   /* internal entries */

      /* group/scene key e.g. 's1' */
      if (_isGroupCk(key)) {
        if (managedSet[key]) return;
        var d    = all[key];
        var type = d.Type || 'Group';
        var prefix = type === 'Scene' ? 'Scene_' : 'Group_';
        var plainName = d.Name || key;
        available.push({
          key: key, idx: key, subidx: 0,
          name: prefix + plainName,
          plainName: plainName,
          type: type,
        });
        return;
      }

      var idx = parseInt(key, 10);
      if (!(idx > 0 && String(idx) === String(key))) return;
      if (managedFullIdx[idx]) return;      /* whole base device is already managed */

      var d        = all[key];
      var name     = d.Name || ('Device ' + key);
      var type     = d.Type  || '';
      var subCount = _getSubValueCount(d);

      if (subCount > 1) {
        /* expand into individual sub-device entries */
        for (var s = 1; s <= subCount; s++) {
          var ck = _ck(idx, s);
          if (!managedSet[ck]) {
            available.push({ key: ck, idx: idx, subidx: s,
                             name: name + '\u00a0(' + s + ')', plainName: null, type: type });
          }
        }
      } else {
        var ck = _ck(idx, 0);
        if (!managedSet[ck]) {
          available.push({ key: ck, idx: idx, subidx: 0, name: name, plainName: null, type: type });
        }
      }
    });

    _sortAvailable(available);
    return available;
  }

  /* ── build and display the modal ───────────────────────────── */
  function _prepareManagedDeviceState() {
    var managedKeys = managedDevices.slice();
    var allDomoticz = Domoticz.getAllDevices();
    var available = _getAvailableDevices(managedKeys);

    /* Populate the regular-device state even when a direct Screen Editor action
       saves without opening the full Device Editor modal. */
    managedKeys.forEach(function (ck) {
      var p = _parseCk(ck);
      var d = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      deviceNames[ck] = d ? (d.Name || ('Device ' + p.idx)) : ('Device ' + p.idx);
      deviceWidths[ck] = _getConfiguredWidthForCk(ck);
      deviceHeights[ck] = _getConfiguredHeightForCk(ck);
      var configured = _getConfiguredBlockForCk(ck) || {};
      deviceTitles[ck] = configured._dashticzAutoTitle
        ? ''
        : (typeof configured.title === 'string' ? configured.title : '');
      deviceOptions[ck] = {
        icon: typeof configured.icon === 'undefined' || configured.icon !== '',
        iconValue: typeof configured.icon === 'string' && configured.icon !== ''
          ? configured.icon
          : null,
        hide_data: configured.hide_data === true,
        last_update: configured.last_update === true,
        switch: configured.switch === true,
        dial: configured.type === 'dial',
      };
      deviceTitleVisible[ck] = configured.hide_title !== true;
      deviceCustomFields[ck] = _deviceCustomFieldRows(configured, deviceTitles[ck]);
      devicePreservedFields[ck] = _devicePreservedFieldValues(configured);
    });

    return { available: available, allDomoticz: allDomoticz };
  }

  function _buildAndShowModal() {
    $('#deviceeditorpopup').remove();

    var prepared = _prepareManagedDeviceState();
    var available = prepared.available;
    var allDomoticz = prepared.allDomoticz;

    $('body').append(_buildModalHtml(available, allDomoticz));
    _attachHandlers(available, allDomoticz);

    var el = document.getElementById('deviceeditorpopup');
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el).show();
    }
  }

  /* ── build the full modal HTML string ──────────────────────── */
  function _buildModalHtml(available, allDomoticz) {
    var t = _translations();
    var html = '';
    html += '<div class="modal fade" id="deviceeditorpopup" tabindex="-1"';
    html += ' aria-labelledby="de-title" aria-hidden="true">';
    html += '<div class="modal-dialog modal-xl modal-dialog-scrollable">';
    html += '<div class="modal-content">';

    /* header */
    html += '<div class="modal-header">';
    html += '<h5 class="modal-title" id="de-title">';
    var modalTitle = editorMode === 'dummy'
      ? t.custom_devices
      : editorMode === 'title'
        ? t.separator
        : t.editor_title;
    html += '<i class="fas fa-pencil-alt me-2" aria-hidden="true"></i>' + _esc(modalTitle);
    html += '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' + _esc(t.close) + '"></button>';
    html += '</div>';

    /* body */
    html += '<div class="modal-body">';

    /* section 1 – current devices */
    html += '<h6 class="de-section-title">' + _esc(t.configured_items) + '</h6>';
    html += '<div id="de-device-list" class="de-device-list">';
    if (managedOrder.length === 0) {
      html += '<div class="de-empty">' + _esc(t.empty_items) + '</div>';
    } else {
      managedOrder.forEach(function (orderKey) {
        if (orderKey.indexOf('widget:') === 0) {
          html += _widgetItemHtml(orderKey);
        } else if (orderKey.indexOf('special:') === 0) {
          html += _specialItemHtml(orderKey);
        } else {
          html += _deviceItemHtml(orderKey.slice(7), allDomoticz, false);
        }
      });
    }
    html += '</div>';

    /* section 2 – the selected add workflow. Dummy/title helper blocks were
       removed from the normal device dropdown and now have their own entry point. */
    var addHeading = editorMode === 'dummy'
      ? t.custom_devices
      : editorMode === 'title'
        ? t.separator
        : t.add_device;
    html += '<h6 class="de-section-title mt-3">' + _esc(addHeading) + '</h6>';
    html += '<div id="de-add-rows">';
    html += editorMode === 'devices'
      ? _addRowHtml(available)
      : _specialAddRowHtml(editorMode);
    html += '</div>';

    html += '</div>'; /* modal-body */

    /* footer */
    html += '<div class="modal-footer">';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += '<span class="text-danger me-auto de-nophp">';
      html += '<i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>';
      html += 'PHP not available — saving is disabled.';
      html += '</span>';
    }
    html += '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _esc(t.close) + '</button>';
    html += '<button type="button" class="btn btn-primary" id="de-save-btn"';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += ' disabled';
    }
    html += '>' + _esc(t.save) + '</button>';
    html += '</div>';

    html += '</div></div></div>'; /* content, dialog, modal */
    return html;
  }

  function _configButtonHtml(orderKey, label) {
    var t = _translations();
    return '<button type="button" class="btn btn-outline-secondary btn-sm de-config-btn" ' +
      'data-order-key="' + _esc(orderKey) + '" title="' + _esc(label || t.configure) +
      '" aria-label="' + _esc(label || t.configure) + '">' +
      '<i class="fas fa-cog" aria-hidden="true"></i></button>';
  }

  function _customFieldRowHtml(row) {
    var t = _translations();
    row = row || { field: '', setting: '' };
    var isSystem = row.system === true;
    var field = String(row.field || '');
    var rowClass = 'de-custom-field-row input-group input-group-sm mb-2';
    if (field.toLowerCase() === 'icon') rowClass += ' de-icon-field-row';
    if (isSystem) rowClass += ' de-system-field-row';
    return '<div class="' + rowClass + '">' +
      '<input type="text" class="form-control de-custom-field-name" placeholder="' +
      _esc(t.field) + '" value="' + _esc(field) + '"' +
      (isSystem ? ' readonly aria-readonly="true"' : '') + '>' +
      '<input type="text" class="form-control de-custom-field-setting" placeholder="' +
      _esc(t.setting) + '" value="' + _esc(row.setting || '') + '">' +
      '<button type="button" class="btn btn-outline-success de-custom-field-add" title="' +
      _esc(t.add_field) + '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger de-custom-field-remove" title="' +
      _esc(t.remove_field) + '"' + (isSystem ? ' disabled' : '') +
      '><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>';
  }

  function _customDeviceFieldRowHtml(row) {
    var t = _translations();
    row = row || { field: '', setting: '' };
    return '<div class="cd-custom-field-row input-group input-group-sm mb-2">' +
      '<input type="text" class="form-control cd-custom-field-name" placeholder="' +
      _esc(t.field) + '" value="' + _esc(row.field || '') + '">' +
      '<input type="text" class="form-control cd-custom-field-setting" placeholder="' +
      _esc(t.setting) + '" value="' + _esc(row.setting || '') + '">' +
      '<button type="button" class="btn btn-outline-success cd-custom-field-add" title="' +
      _esc(t.add_field) + '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger cd-custom-field-remove" title="' +
      _esc(t.remove_field) + '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>';
  }

  function _showCustomDevicePopup() {
    var t = _translations();
    $('#customdevicepopup').remove();

    var html = '<div class="modal fade" id="customdevicepopup" tabindex="-1" aria-hidden="true">';
    html += '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html += '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-cube me-2" aria-hidden="true"></i>' +
      _esc(t.custom_devices) + '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' + _esc(t.close) + '"></button></div>';
    html += '<div class="modal-body">';
    html += '<div class="mb-3"><label class="form-label" for="cd-device-name">' + _esc(t.custom_device_name) + '</label>';
    html += '<input type="text" class="form-control" id="cd-device-name" autocomplete="off">';
    html += '<div class="form-text">' + _esc(t.custom_device_name_help) + '</div></div>';
    html += '<div class="mb-3"><label class="form-label" for="cd-device-idx">IDX</label>';
    html += '<input type="number" min="1" step="1" class="form-control" id="cd-device-idx"></div>';
    html += '<div class="cd-custom-fields-section"><h6>' + _esc(t.custom_device_options) + '</h6>';
    html += '<div class="form-text mb-2">' + _esc(t.custom_device_values_help) + '</div>';
    html += '<div class="cd-custom-fields">';
    html += _customDeviceFieldRowHtml({ field: 'title', setting: '' });
    html += _customDeviceFieldRowHtml({ field: 'icon', setting: '' });
    html += _customDeviceFieldRowHtml({ field: 'values', setting: '' });
    html += '</div></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html += '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      _esc(t.cancel) + '</button>';
    html += '<button type="button" class="btn btn-primary" id="cd-save-btn">' + _esc(t.save) + '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);

    var $popup = $('#customdevicepopup');
    function refreshButtons() {
      var $rows = $popup.find('.cd-custom-field-row');
      $rows.find('.cd-custom-field-add').addClass('d-none');
      $rows.last().find('.cd-custom-field-add').removeClass('d-none');
      $rows.find('.cd-custom-field-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.cd-custom-field-add', function () {
      $popup.find('.cd-custom-fields').append(_customDeviceFieldRowHtml());
      refreshButtons();
      $popup.find('.cd-custom-field-row').last().find('.cd-custom-field-name').trigger('focus');
    });
    $popup.on('click', '.cd-custom-field-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.cd-custom-field-row').remove();
      refreshButtons();
    });
    refreshButtons();

    $('#cd-save-btn').on('click', function () {
      var $message = $popup.find('.cd-custom-message').removeClass('text-danger').text('');
      var reference = $.trim(String($('#cd-device-name').val() || ''));
      var rawIdx = $.trim(String($('#cd-device-idx').val() || ''));
      var idx = parseInt(rawIdx, 10);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_custom_device_name);
        $('#cd-device-name').trigger('focus');
        return;
      }
      if ((typeof blocks !== 'undefined' && blocks[reference]) || managedSpecials[_specialOrderKey(reference)]) {
        $message.addClass('text-danger').text(t.invalid_custom_device_name);
        $('#cd-device-name').trigger('focus');
        return;
      }
      if (!(idx > 0 && String(idx) === rawIdx)) {
        $message.addClass('text-danger').text(t.invalid_idx);
        $('#cd-device-idx').trigger('focus');
        return;
      }

      var title = '';
      var iconValue = null;
      var customRows = [];
      var seen = {};
      var valid = true;
      $popup.find('.cd-custom-field-row').each(function () {
        if (!valid) return;
        var rawField = $.trim(String($(this).find('.cd-custom-field-name').val() || ''));
        var rawSetting = $.trim(String($(this).find('.cd-custom-field-setting').val() || ''));
        if (!rawField && !rawSetting) return;
        // Empty predefined option rows are ignored until the user gives them a value.
        if (rawField && !rawSetting && ['title', 'icon', 'values'].indexOf(rawField.toLowerCase()) > -1) return;
        var field = _normaliseCustomFieldName(rawField);
        var lowerField = field.toLowerCase();
        if (!field || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field) || !rawSetting) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_field);
          $(this).find(!field ? '.cd-custom-field-name' : '.cd-custom-field-setting').trigger('focus');
          return;
        }
        if (seen[lowerField]) {
          valid = false;
          $message.addClass('text-danger').text(t.duplicate_field);
          $(this).find('.cd-custom-field-name').trigger('focus');
          return;
        }
        seen[lowerField] = true;
        if (lowerField === 'title') {
          title = rawSetting.slice(0, 100);
          customRows.push({ field: 'title', setting: title, value: title, system: true });
          return;
        }
        if (lowerField === 'icon') {
          iconValue = rawSetting.slice(0, 100);
          customRows.push({ field: 'icon', setting: iconValue, value: iconValue });
          return;
        }
        if (protectedCustomDeviceProperties[lowerField]) {
          valid = false;
          $message.addClass('text-danger').text(t.duplicate_field);
          $(this).find('.cd-custom-field-name').trigger('focus');
          return;
        }
        var parsed = _parseCustomSetting(rawSetting);
        if (!parsed.valid) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_setting);
          $(this).find('.cd-custom-field-setting').trigger('focus');
          return;
        }
        customRows.push({ field: field, setting: rawSetting, value: parsed.value });
      });
      if (!valid) return;

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'custom',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 3,
        height: null,
        showTitle: true,
          options: {
          icon: true,
          // Falls back to this popup's own modal-header icon when the user
          // didn't type an explicit `icon` custom field above - otherwise a
          // Custom Device (not a real recognised Domoticz device type) has
          // no icon at all to derive from and renders with none.
          iconValue: iconValue || 'fas fa-cube',
          hide_data: false,
          last_update: false,
          switch: false,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(document.getElementById('customdevicepopup')).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () { $(this).remove(); });
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('customdevicepopup')).show();
  }

  /* Multi Device: a graphical builder for the Custom Device engine's existing
   * blocks[key] = {idx, values:[{idx?, value}, ...]} shape. Each value row
   * without its own idx falls back to the main idx (see formatBlockValues in
   * blocks.js), so no rendering/parsing logic is duplicated here — this popup
   * only produces the same custom_fields.values JSON the Custom Device popup
   * already accepts by hand, and the saved device is a specialType 'custom'
   * device like any other (editable later via the normal device config). */
  function _multiDeviceRowHtml(row) {
    var t = _translations();
    row = row || { idx: '', value: '' };
    return '<div class="md-value-row input-group input-group-sm mb-2">' +
      '<input type="number" min="1" step="1" class="form-control md-value-idx" ' +
      'style="max-width:110px" placeholder="' + _esc(t.multi_device_row_idx) + '" value="' +
      _esc(row.idx || '') + '">' +
      '<input type="text" class="form-control md-value-value" placeholder="' +
      _esc(t.multi_device_row_value) + '" value="' + _esc(row.value || '') + '">' +
      '<button type="button" class="btn btn-outline-success md-value-add" title="' +
      _esc(t.add_value_row) + '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger md-value-remove" title="' +
      _esc(t.remove_value_row) + '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>';
  }

  function _showMultiDevicePopup() {
    var t = _translations();
    $('#multidevicepopup').remove();

    var html = '<div class="modal fade" id="multidevicepopup" tabindex="-1" aria-hidden="true">';
    html += '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html += '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-layer-group me-2" aria-hidden="true"></i>' +
      _esc(t.multi_device) + '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' + _esc(t.close) + '"></button></div>';
    html += '<div class="modal-body">';
    html += '<div class="mb-3"><label class="form-label" for="md-device-name">' + _esc(t.multi_device_name) + '</label>';
    html += '<input type="text" class="form-control" id="md-device-name" autocomplete="off">';
    html += '<div class="form-text">' + _esc(t.multi_device_name_help) + '</div></div>';
    html += '<div class="mb-3"><label class="form-label" for="md-device-idx">' + _esc(t.multi_device_idx) + '</label>';
    html += '<input type="number" min="1" step="1" class="form-control" id="md-device-idx">';
    html += '<div class="form-text">' + _esc(t.multi_device_idx_help) + '</div></div>';
    html += '<div class="mb-3"><label class="form-label" for="md-device-title">' + _esc(t.multi_device_title) + '</label>';
    html += '<input type="text" class="form-control" id="md-device-title" autocomplete="off"></div>';
    html += '<div class="md-values-section"><h6>' + _esc(t.multi_device_values) + '</h6>';
    html += '<div class="form-text mb-2">' + _esc(t.multi_device_values_help) + '</div>';
    html += '<div class="md-value-rows">';
    html += _multiDeviceRowHtml({ idx: '', value: '' });
    html += '</div></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html += '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      _esc(t.cancel) + '</button>';
    html += '<button type="button" class="btn btn-primary" id="md-save-btn">' + _esc(t.save) + '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);

    var $popup = $('#multidevicepopup');
    function refreshButtons() {
      var $rows = $popup.find('.md-value-row');
      $rows.find('.md-value-add').addClass('d-none');
      $rows.last().find('.md-value-add').removeClass('d-none');
      $rows.find('.md-value-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.md-value-add', function () {
      $popup.find('.md-value-rows').append(_multiDeviceRowHtml());
      refreshButtons();
      $popup.find('.md-value-row').last().find('.md-value-value').trigger('focus');
    });
    $popup.on('click', '.md-value-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.md-value-row').remove();
      refreshButtons();
    });
    refreshButtons();

    $('#md-save-btn').on('click', function () {
      var $message = $popup.find('.cd-custom-message').removeClass('text-danger').text('');
      var reference = $.trim(String($('#md-device-name').val() || ''));
      var rawIdx = $.trim(String($('#md-device-idx').val() || ''));
      var idx = parseInt(rawIdx, 10);
      var title = $.trim(String($('#md-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_multi_device_name);
        $('#md-device-name').trigger('focus');
        return;
      }
      if ((typeof blocks !== 'undefined' && blocks[reference]) || managedSpecials[_specialOrderKey(reference)]) {
        $message.addClass('text-danger').text(t.invalid_multi_device_name);
        $('#md-device-name').trigger('focus');
        return;
      }
      if (!(idx > 0 && String(idx) === rawIdx)) {
        $message.addClass('text-danger').text(t.invalid_idx);
        $('#md-device-idx').trigger('focus');
        return;
      }

      var values = [];
      var valid = true;
      $popup.find('.md-value-row').each(function () {
        if (!valid) return;
        var rawRowIdx = $.trim(String($(this).find('.md-value-idx').val() || ''));
        var rawValue = $.trim(String($(this).find('.md-value-value').val() || ''));
        if (!rawRowIdx && !rawValue) return; // silently skip a fully empty row
        if (!rawValue) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_value_row);
          $(this).find('.md-value-value').trigger('focus');
          return;
        }
        var rowEntry = { value: rawValue };
        if (rawRowIdx) {
          var rowIdx = parseInt(rawRowIdx, 10);
          if (!(rowIdx > 0 && String(rowIdx) === rawRowIdx)) {
            valid = false;
            $message.addClass('text-danger').text(t.invalid_idx);
            $(this).find('.md-value-idx').trigger('focus');
            return;
          }
          rowEntry.idx = rowIdx;
        }
        values.push(rowEntry);
      });
      if (!valid) return;
      if (!values.length) {
        $message.addClass('text-danger').text(t.invalid_value_row);
        return;
      }

      var customRows = [];
      if (title) customRows.push({ field: 'title', setting: title, value: title, system: true });
      // Stored the same way a hand-written blocks[key].values JSON field would be:
      // one 'values' custom field whose value is the array itself.
      customRows.push({ field: 'values', setting: JSON.stringify(values), value: values });

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'custom',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 3,
        height: null,
        showTitle: true,
        options: {
          icon: true,
          // Multi Device has no icon input of its own; default to this
          // popup's own modal-header icon so the block isn't left with no
          // icon at all (it isn't a recognised Domoticz device type).
          iconValue: 'fas fa-layer-group',
          hide_data: false,
          last_update: false,
          switch: false,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(document.getElementById('multidevicepopup')).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () { $(this).remove(); });
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('multidevicepopup')).show();
  }

  function _showSlideButtonPopup() {
    var t = _translations();
    $('#slidebuttonpopup').remove();

    var html = '<div class="modal fade" id="slidebuttonpopup" tabindex="-1" aria-hidden="true">';
    html += '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html += '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-sliders-h me-2" aria-hidden="true"></i>' +
      _esc(t.slide_button) + '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' + _esc(t.close) + '"></button></div>';
    html += '<div class="modal-body">';
    html += '<div class="mb-3"><label class="form-label" for="sb-button-name">' + _esc(t.slide_button_name) + '</label>';
    html += '<input type="text" class="form-control" id="sb-button-name" value="slidehome" autocomplete="off">';
    html += '<div class="form-text">' + _esc(t.slide_button_name_help) + '</div></div>';
    html += '<div class="mb-3"><label class="form-label" for="sb-button-key">' + _esc(t.slide_button_key) + '</label>';
    html += '<input type="text" class="form-control" id="sb-button-key" value="Home" autocomplete="off"></div>';
    html += '<div class="mb-3"><label class="form-label" for="sb-button-title">' + _esc(t.slide_button_title) + '</label>';
    html += '<input type="text" class="form-control" id="sb-button-title" value="Home Screen" autocomplete="off"></div>';
    html += '<div class="mb-3"><label class="form-label" for="sb-button-screen">' + _esc(t.slide_button_screen) + '</label>';
    html += '<input type="number" min="1" step="1" class="form-control" id="sb-button-screen" value="1"></div>';
    html += '<div class="mb-3"><label class="form-label" for="sb-button-icon">' + _esc(t.slide_button_icon) + '</label>';
    html += '<input type="text" class="form-control" id="sb-button-icon" value="fas fa-home" autocomplete="off"></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html += '<div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      _esc(t.cancel) + '</button>';
    html += '<button type="button" class="btn btn-primary" id="sb-save-btn">' + _esc(t.save) + '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);

    $('#sb-save-btn').on('click', function () {
      var $popup = $('#slidebuttonpopup');
      var $message = $popup.find('.cd-custom-message').removeClass('text-danger').text('');
      var reference = $.trim(String($('#sb-button-name').val() || ''));
      var buttonKey = $.trim(String($('#sb-button-key').val() || ''));
      var buttonTitle = $.trim(String($('#sb-button-title').val() || ''));
      var rawSlide = $.trim(String($('#sb-button-screen').val() || ''));
      var slideTarget = parseInt(rawSlide, 10);
      var iconValue = $.trim(String($('#sb-button-icon').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_slide_button_name);
        $('#sb-button-name').trigger('focus');
        return;
      }
      if ((typeof blocks !== 'undefined' && blocks[reference]) || managedSpecials[_specialOrderKey(reference)]) {
        $message.addClass('text-danger').text(t.invalid_slide_button_name);
        $('#sb-button-name').trigger('focus');
        return;
      }
      if (!(slideTarget > 0 && String(slideTarget) === rawSlide)) {
        $message.addClass('text-danger').text(t.invalid_slide_target);
        $('#sb-button-screen').trigger('focus');
        return;
      }
      if (!buttonKey) buttonKey = reference;
      if (!buttonTitle) buttonTitle = buttonKey;

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'slidebutton',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: buttonTitle.slice(0, 100),
        width: 12,
        height: null,
        showTitle: true,
        options: {
          icon: iconValue !== '',
          iconValue: iconValue.slice(0, 100),
          hide_data: false,
          last_update: false,
          switch: false,
        },
        buttonKey: buttonKey.slice(0, 100),
        slideTarget: slideTarget,
        customFields: _deviceCustomFieldRows(
          { title: buttonTitle.slice(0, 100), slide: slideTarget },
          buttonTitle.slice(0, 100)
        ),
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(document.getElementById('slidebuttonpopup')).hide();
      _save();
    });

    $('#slidebuttonpopup').one('hidden.bs.modal', function () { $(this).remove(); });
    window.bootstrap.Modal.getOrCreateInstance(document.getElementById('slidebuttonpopup')).show();
  }

  function _showParentEditor(editor) {
    if (editor && document.body.contains(editor)) {
      $(editor).removeData('de-config-transition');
      window.bootstrap.Modal.getOrCreateInstance(editor).show();
    }
  }

  /* Hide the Device Editor before opening a child configuration modal. Bootstrap
     otherwise keeps the child behind the editor's modal/backdrop stacking context. */
  function _openConfigPopup(orderKey) {
    if (orderKey.indexOf('widget:') === 0) {
      _openWidgetConfigPopup(orderKey);
      return;
    }
    var editor = document.getElementById('deviceeditorpopup');
    var editorModal = editor && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getInstance(editor)
      : null;

    function showChild() {
      _showConfigPopup(orderKey, editor);
    }
    if (editor && editorModal && $(editor).hasClass('show')) {
      $(editor).data('de-config-transition', true);
      $(editor).one('hidden.bs.modal', showChild);
      editorModal.hide();
      return;
    }
    showChild();
  }

  function _openWidgetConfigPopup(orderKey) {
    var editor = document.getElementById('deviceeditorpopup');
    var editorModal = editor && window.bootstrap && window.bootstrap.Modal
      ? window.bootstrap.Modal.getInstance(editor)
      : null;
    var widget = managedWidgets[orderKey];
    if (!widget) return;

    function openFullWidgetConfig() {
      DT_function.loadDTScript('js/widgeteditor.js').then(function () {
        if (!DashticzWidgetEditor || typeof DashticzWidgetEditor.openConfig !== 'function') {
          _showParentEditor(editor);
          return;
        }
        DashticzWidgetEditor.openConfig(widget.id, {
          draft: widget.editorDraft || null,
          onApply: function (result) {
            if (!result || !result.entry) return;
            widget.pendingPayload = result.entry;
            widget.editorDraft = result.draft || null;
            var draftRows =
              widget.editorDraft &&
              widget.editorDraft.blockOptions &&
              widget.editorDraft.blockOptions.customFields
                ? widget.editorDraft.blockOptions.customFields
                : [];
            draftRows.some(function (row) {
              if (_normaliseCustomFieldName(row && row.field) !== 'title') return false;
              widgetTitles[orderKey] = String(row.setting || '');
              widget.pendingTitleEdited = true;
              return true;
            });
            pendingWidgetSettings = $.extend(
              {}, pendingWidgetSettings, result.configSettings || {}
            );
            var entry = result.entry;
            widgetOptions[orderKey] = $.extend({}, widgetOptions[orderKey], {
              icon: typeof entry.icon === 'undefined' || entry.icon !== '',
              iconValue: typeof entry.icon === 'string' && entry.icon !== ''
                ? entry.icon
                : null,
              hide_data: entry.hide_data === true,
              last_update: entry.last_update === true,
            });
            widgetTitleVisible[orderKey] = entry.hide_title !== true;
          },
          onClose: function () {
            _showParentEditor(editor);
          },
        });
      });
    }

    if (editor && editorModal && $(editor).hasClass('show')) {
      $(editor).data('de-config-transition', true);
      $(editor).one('hidden.bs.modal', openFullWidgetConfig);
      editorModal.hide();
      return;
    }
    openFullWidgetConfig();
  }

  /* Build the Device Config popup. Switch visibility is not exposed as a
     checkbox here; title text remains available as a typed field, and its
     visibility is exposed via the Title checkbox below. */
  function _showConfigPopup(orderKey, editor) {
    var t = _translations();
    var isSpecial = orderKey.indexOf('special:') === 0;
    var ck = orderKey.indexOf('device:') === 0 ? orderKey.slice(7) : '';
    var special = isSpecial ? managedSpecials[orderKey] : null;
    var isTitle = special && special.specialType === 'title';
    var isCustom = special && special.specialType === 'custom';
    var options = isSpecial ? (special.options || {}) : (deviceOptions[ck] || {});
    var customRows = isSpecial ? special.customFields : deviceCustomFields[ck];
    if (!customRows || !customRows.length) {
      customRows = [{ field: 'title', setting: '', value: '', system: true }];
    }
    customRows = customRows.map(function (row) { return $.extend({}, row); });
    var currentTitle = isSpecial ? String(special.title || '') : String(deviceTitles[ck] || '');
    var displayName = currentTitle || (isSpecial
      ? String((special && (special.title || special.reference)) || orderKey)
      : String(deviceNames[ck] || ck));
    var titleRow = customRows.find(function (row) {
      return String(row.field || '').toLowerCase() === 'title';
    });
    if (titleRow) {
      titleRow.setting = currentTitle;
      titleRow.value = currentTitle;
      titleRow.system = true;
    } else {
      customRows.unshift({ field: 'title', setting: currentTitle, value: currentTitle, system: true });
    }

    // A Multi Device's 'values' custom field is JSON produced by the Multi
    // Device popup (or hand-written in the same shape). Editing that as raw
    // JSON text made this popup look like a plain device editor instead of
    // the Multi Device it actually is, so give it back the same friendly
    // idx/value row builder the create popup uses, instead of listing it
    // among the generic custom fields.
    var valuesRowIndex = customRows.findIndex(function (row) {
      return String(row.field || '').toLowerCase() === 'values';
    });
    var multiDeviceValues = (isCustom && valuesRowIndex > -1 &&
      Array.isArray(customRows[valuesRowIndex].value) &&
      customRows[valuesRowIndex].value.length)
      ? customRows[valuesRowIndex].value
      : null;
    if (multiDeviceValues) customRows.splice(valuesRowIndex, 1);

    $('#de-config-popup').remove();
    var html = '<div class="modal fade de-config-popup" id="de-config-popup" tabindex="-1" aria-hidden="true">';
    html += '<div class="modal-dialog modal-dialog-centered de-config-dialog"><div class="modal-content">';
    html += '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-cog me-2" aria-hidden="true"></i>' +
      _esc(t.device_config) + ' — ' + _esc(displayName) + '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' + _esc(t.close) + '"></button></div>';
    html += '<div class="modal-body">';
    // A separator/title bar has no data value or last-update timestamp of its
    // own, but it can still show a leading icon like any other block.
    var configOptions = isTitle
      ? ['icon', 'show_title']
      : ['icon', 'hide_data', 'last_update', 'dial', 'show_title'];
    html += '<div class="de-config-options' + (isTitle ? '' : ' de-config-options-five') + '">';
    configOptions.forEach(function (option) {
      html += '<label class="form-check"><input class="form-check-input de-config-option" type="checkbox" data-option="' + option + '"';
      // The Data checkbox is user-facing: checked means data is visible.
      // CONFIG.js keeps the backwards-compatible inverse hide_data property.
      // Title visibility isn't tracked in `options` like the others: it's
      // stored separately (deviceTitleVisible/special.showTitle) since it
      // predates this popup and is also read by the device-list row itself.
      var checked;
      if (option === 'hide_data') {
        checked = options.hide_data !== true;
      } else if (option === 'show_title') {
        checked = isSpecial ? special.showTitle !== false : deviceTitleVisible[ck] !== false;
      } else {
        checked = options[option] === true;
      }
      if (checked) html += ' checked';
      html += '><span class="form-check-label">' + _esc(t[option]) + '</span></label>';
    });
    html += '</div>';
    if (!isTitle) {
      html += '<div class="alert alert-info de-dial-hint d-none" role="note">';
      html += _esc(t.dial_hint) + ' ';
      html += '<a href="https://dashticz.readthedocs.io/en/beta/blocks/specials/dial.html" target="_blank" rel="noopener">' +
        _esc(t.dial_hint_link) + '</a>';
      html += '</div>';
    }
    html += '<div class="de-custom-fields-section"><h6>' + _esc(t.custom_fields) + '</h6>';
    html += '<p class="form-text">' + _esc(t.custom_fields_help) + '</p>';
    html += '<div class="de-custom-fields">';
    customRows.forEach(function (row) { html += _customFieldRowHtml(row); });
    html += '</div>';
    if (multiDeviceValues) {
      html += '<div class="de-multidevice-values mt-3"><label class="form-label">' + _esc(t.multi_device_values) + '</label>';
      html += '<div class="form-text mb-2">' + _esc(t.multi_device_values_help) + '</div>';
      html += '<div class="md-value-rows">';
      multiDeviceValues.forEach(function (row) { html += _multiDeviceRowHtml(row); });
      html += '</div></div>';
    }
    html += '</div>';
    html += '<div class="de-config-message" role="status"></div></div><div class="modal-footer">';
    html += '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' + _esc(t.cancel) + '</button>';
    html += '<button type="button" class="btn btn-primary" id="de-config-ok">' + _esc(t.ok) + '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);

    var $popup = $('#de-config-popup');
    function refreshCustomFieldButtons() {
      var removable = $popup.find('.de-custom-field-row:not(.de-system-field-row)').length;
      $popup.find('.de-custom-field-remove').each(function () {
        var isSystem = $(this).closest('.de-custom-field-row').hasClass('de-system-field-row');
        $(this).prop('disabled', isSystem || removable <= 0);
      });
    }
    function refreshIconFieldVisibility() {
      var enabled = $popup.find('[data-option="icon"]').is(':checked');
      $popup.find('.de-icon-field-row').toggle(enabled);
    }
    function refreshDialHint() {
      var enabled = $popup.find('[data-option="dial"]').is(':checked');
      $popup.find('.de-dial-hint').toggleClass('d-none', !enabled);
    }
    $popup.on('click', '.de-custom-field-add', function () {
      $(this).closest('.de-custom-field-row').after(_customFieldRowHtml());
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });
    $popup.on('click', '.de-custom-field-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.de-custom-field-row').remove();
      refreshCustomFieldButtons();
    });
    $popup.on('change', '[data-option="icon"]', refreshIconFieldVisibility);
    $popup.on('change', '[data-option="dial"]', refreshDialHint);
    function refreshMdValueButtons() {
      var $rows = $popup.find('.md-value-row');
      $rows.find('.md-value-add').addClass('d-none');
      $rows.last().find('.md-value-add').removeClass('d-none');
      $rows.find('.md-value-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.md-value-add', function () {
      $(this).closest('.md-value-row').after(_multiDeviceRowHtml());
      refreshMdValueButtons();
      $popup.find('.md-value-row').last().find('.md-value-value').trigger('focus');
    });
    $popup.on('click', '.md-value-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.md-value-row').remove();
      refreshMdValueButtons();
    });
    refreshCustomFieldButtons();
    refreshIconFieldVisibility();
    refreshDialHint();
    if (multiDeviceValues) refreshMdValueButtons();

    $('#de-config-ok').on('click', function () {
      var updated = {};
      var pendingCustomFields = [];
      // 'values' is rendered as the dedicated row builder below, not as a
      // generic custom field, so a hand-typed 'values' field name in the
      // generic list must still be rejected as a duplicate.
      var customKeys = multiDeviceValues ? { values: true } : {};
      var pendingTitle = isSpecial ? String(special.title || '') : String(deviceTitles[ck] || '');
      var pendingIconValue = null;
      var hasIconField = false;
      var valid = true;
      $('#de-config-popup .de-config-option').each(function () {
        var option = String($(this).attr('data-option'));
        var checked = $(this).prop('checked');
        updated[option] = option === 'hide_data' ? !checked : checked;
      });

      $popup.find('.de-custom-field-row').each(function () {
        if (!valid) return;
        var rawField = $.trim($(this).find('.de-custom-field-name').val() || '');
        var rawSetting = $.trim($(this).find('.de-custom-field-setting').val() || '');
        if (!rawField && !rawSetting) return;
        var field = _normaliseCustomFieldName(rawField);
        var lowerField = field.toLowerCase();
        if (!field || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field)) {
          valid = false;
          $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_field);
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        if (customKeys[lowerField]) {
          valid = false;
          $popup.find('.de-config-message').addClass('text-danger').text(t.duplicate_field);
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        customKeys[lowerField] = true;

        if (lowerField === 'title') {
          pendingTitle = rawSetting;
          return;
        }
        if (lowerField === 'icon') {
          // An existing icon row is hidden/inactive while Icon is off. A newly
          // entered visible icon row gets an explicit validation message instead.
          if (updated.icon !== true) {
            if ($(this).hasClass('de-icon-field-row')) return;
            valid = false;
            $popup.find('.de-config-message').addClass('text-danger').text(t.icon_requires_checkbox);
            $(this).find('.de-custom-field-name').trigger('focus');
            return;
          }
          if (!rawSetting) {
            valid = false;
            $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_field);
            $(this).find('.de-custom-field-setting').trigger('focus');
            return;
          }
          hasIconField = true;
          pendingIconValue = rawSetting;
          return;
        }
        if (!rawSetting || protectedCustomDeviceProperties[lowerField]) {
          valid = false;
          $popup.find('.de-config-message').addClass('text-danger').text(
            protectedCustomDeviceProperties[lowerField] ? t.duplicate_field : t.invalid_field
          );
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        var parsedSetting = _parseCustomSetting(rawSetting);
        if (!parsedSetting.valid) {
          valid = false;
          $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_setting);
          $(this).find('.de-custom-field-setting').trigger('focus');
          return;
        }
        pendingCustomFields.push({
          field: field,
          setting: rawSetting,
          value: parsedSetting.value,
        });
      });
      if (!valid) return;

      var pendingValues = null;
      if (multiDeviceValues) {
        pendingValues = [];
        $popup.find('.md-value-row').each(function () {
          if (!valid) return;
          var rawRowIdx = $.trim(String($(this).find('.md-value-idx').val() || ''));
          var rawValue = $.trim(String($(this).find('.md-value-value').val() || ''));
          if (!rawRowIdx && !rawValue) return; // silently skip a fully empty row
          if (!rawValue) {
            valid = false;
            $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_value_row);
            $(this).find('.md-value-value').trigger('focus');
            return;
          }
          var rowEntry = { value: rawValue };
          if (rawRowIdx) {
            var rowIdx = parseInt(rawRowIdx, 10);
            if (!(rowIdx > 0 && String(rowIdx) === rawRowIdx)) {
              valid = false;
              $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_idx);
              $(this).find('.md-value-idx').trigger('focus');
              return;
            }
            rowEntry.idx = rowIdx;
          }
          pendingValues.push(rowEntry);
        });
        if (!valid) return;
        if (!pendingValues.length) {
          $popup.find('.de-config-message').addClass('text-danger').text(t.invalid_value_row);
          return;
        }
      }

      // Title visibility isn't part of `options` (see the checkbox render
      // above), so pull it out before the rest of `updated` gets merged in.
      var pendingShowTitle = updated.show_title !== false;
      delete updated.show_title;

      var storedRows = [{ field: 'title', setting: pendingTitle, value: pendingTitle, system: true }];
      if (hasIconField) {
        storedRows.push({ field: 'icon', setting: pendingIconValue, value: pendingIconValue });
      }
      storedRows = storedRows.concat(pendingCustomFields);
      if (pendingValues) {
        storedRows.push({ field: 'values', setting: JSON.stringify(pendingValues), value: pendingValues });
      }

      if (isSpecial) {
        special.title = pendingTitle;
        special.customFields = storedRows;
        special.showTitle = pendingShowTitle;
        if (special.specialType === 'slidebutton') {
          storedRows.forEach(function (row) {
            if (_normaliseCustomFieldName(row.field) === 'slide') {
              var parsedSlide = parseInt(row.value, 10);
              if (parsedSlide > 0) special.slideTarget = parsedSlide;
            }
          });
        }
        special.options = $.extend({}, special.options, updated);
        special.options.iconValue = hasIconField ? pendingIconValue : null;
      } else {
        deviceTitles[ck] = pendingTitle;
        deviceCustomFields[ck] = storedRows;
        deviceTitleVisible[ck] = pendingShowTitle;
        deviceOptions[ck] = $.extend({}, deviceOptions[ck], updated);
        deviceOptions[ck].iconValue = hasIconField ? pendingIconValue : null;
      }
      $('#de-device-list .de-device-title[data-order-key="' + orderKey + '"]').val(pendingTitle);
      $('#de-device-list .de-device-title[data-ck="' + ck + '"]').val(pendingTitle);
      window.bootstrap.Modal.getInstance(document.getElementById('de-config-popup')).hide();
    });

    var popup = document.getElementById('de-config-popup');
    popup.addEventListener('hidden.bs.modal', function () {
      $(popup).remove();
      _showParentEditor(editor);
    });
    window.bootstrap.Modal.getOrCreateInstance(popup).show();
  }

  /* ── HTML for a single device-list row ─────────────────────── */
  function _deviceItemHtml(ck, allDomoticz, isNew) {
    var t = _translations();
    var p      = _parseCk(ck);
    var isGroup = _isGroupCk(ck);
    var device = isGroup ? allDomoticz[ck] : (allDomoticz[String(p.idx)] || allDomoticz[p.idx]);
    var rawName = device ? device.Name : (isGroup ? ck : ('Device ' + p.idx));
    var type   = device ? _esc(device.Type)  : (isGroup ? 'Group' : '');
    var prefix = isGroup ? (type === 'Scene' ? 'Scene_' : 'Group_') : '';
    var name   = _esc(prefix + rawName);
    var dispIdx = isGroup ? ck : (p.subidx ? (p.idx + '_' + p.subidx) : String(p.idx));
    var cls    = 'de-device-item' + (isNew ? ' de-device-item-new' : '');
    var orderKey = _deviceOrderKey(ck);
    var html   = '<div class="' + cls + '" data-ck="' + _esc(ck) +
      '" data-order-key="' + _esc(orderKey) + '" draggable="true">';
    html += '<span class="de-drag-handle" title="' + _esc(t.drag_to_reorder) + '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx">IDX\u00a0' + _esc(dispIdx) + '</span>';
    html += '<span class="de-device-identity"><span class="de-device-name">' + name + (!isGroup && p.subidx ? '\u00a0(' + p.subidx + ')' : '') + '</span>';
    if (type) html += '<span class="de-device-type">' + type + '</span>';
    html += '</span>';
    html += _configButtonHtml(orderKey, t.device_config);
    html += '<span class="de-device-field de-width-wrap">';
    html += '<input type="number" id="de-width-' + _esc(ck) + '" class="form-control form-control-sm de-device-width" ';
    html += 'data-ck="' + _esc(ck) + '" data-order-key="' + _esc(orderKey) +
      '" min="1" max="12" size="2" value="' + _parseWidth(deviceWidths[ck]) + '">';
    html += '<label for="de-width-' + _esc(ck) + '">' + _esc(t.width) + '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html += '<input type="text" id="de-title-' + _esc(ck) + '" class="form-control form-control-sm de-device-title" ';
    html += 'data-ck="' + _esc(ck) + '" value="' + _esc(deviceTitles[ck] || '') + '">';
    html += '<label for="de-title-' + _esc(ck) + '">' + _esc(t.title) + '</label>';
    html += '</span>';
    html += '<button type="button" class="btn btn-danger btn-sm de-remove-btn ms-auto" data-ck="' + _esc(ck) + '" title="' + _esc(t.remove) + '">';
    html += '<i class="fas fa-minus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function _widgetItemHtml(orderKey) {
    var widget = managedWidgets[orderKey];
    if (!widget) return '';
    var t = _translations();
    var html = '<div class="de-device-item de-widget-item" data-order-key="' +
      _esc(orderKey) + '" draggable="true">';
    html += '<span class="de-drag-handle" title="' + _esc(t.drag_to_reorder) + '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx"><i class="fas fa-puzzle-piece me-1" aria-hidden="true"></i>' + _esc(t.widget) + '</span>';
    html += '<span class="de-device-identity"><span class="de-device-name">' + _esc(t.widget_prefix) + ' ' + _esc(widget.title) + '</span>';
    html += '<span class="de-device-type">' +
      _esc(widget.definition.type || widget.id) + '</span>';
    html += '</span>';
    html += _configButtonHtml(orderKey, t.widget_config);
    html += '<span class="de-device-field de-width-wrap">';
    html += '<input type="number" id="de-width-' + _esc(widget.id) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) + '" min="1" max="12" size="2" value="' +
      _parseWidth(widgetWidths[orderKey]) + '">';
    html += '<label for="de-width-' +
      _esc(widget.id) + '">' + _esc(t.width) + '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html += '<input type="text" id="de-title-' + _esc(widget.id) +
      '" class="form-control form-control-sm de-device-title" maxlength="100" data-order-key="' +
      _esc(orderKey) + '" value="' + _esc(widgetTitles[orderKey] || '') + '">';
    html += '<label for="de-title-' + _esc(widget.id) + '">' + _esc(t.title) + '</label>';
    html += '</span>';
    html += '<span class="de-widget-managed" title="' + _esc(t.managed_widget) + '"><i class="fas fa-lock" aria-hidden="true"></i></span>';
    html += '</div>';
    return html;
  }

  function _specialItemHtml(orderKey) {
    var special = managedSpecials[orderKey];
    if (!special) return '';
    var t = _translations();
    var isTitle = special.specialType === 'title';
    var isCustom = special.specialType === 'custom';
    var isSlideButton = special.specialType === 'slidebutton';
    // A Multi Device is a Custom device whose 'values' custom field was filled
    // in via the dedicated Multi Device popup (see openMultiDevice() above);
    // label it accordingly instead of the generic "Custom devices" so it's not
    // confused with a plain single-value Custom device in this list.
    var isMultiDevice = isCustom &&
      special.definition &&
      Array.isArray(special.definition.values) &&
      special.definition.values.length > 0;
    var label = isTitle
      ? t.title_block
      : (isMultiDevice ? t.multi_device : (isCustom ? t.custom_devices : (isSlideButton ? t.slide_button : t.dummy_device)));
    var detail = isTitle
      ? special.title
      : isSlideButton
        ? special.reference + ' · ' + t.slide_button_screen + '\u00a0' + String(special.slideTarget || 1)
        : (isCustom ? special.reference + ' · IDX\u00a0' + special.idx : 'IDX\u00a0' + special.idx);
    var html = '<div class="de-device-item de-special-item" data-special-key="' +
      _esc(special.reference) + '" data-order-key="' + _esc(orderKey) +
      '" draggable="true">';
    html += '<span class="de-drag-handle" title="' + _esc(t.drag_to_reorder) + '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx"><i class="fas ' +
      (isTitle ? 'fa-heading' : (isSlideButton ? 'fa-sliders-h' : (isMultiDevice ? 'fa-layer-group' : 'fa-cube'))) + ' me-1" aria-hidden="true"></i>' +
      _esc(label) + '</span>';
    html += '<span class="de-device-identity de-special-identity">';
    html += '<span class="de-device-name">' + _esc(detail) + '</span></span>';
    html += _configButtonHtml(orderKey, t.device_config);
    html += '<span class="de-device-field de-width-wrap">';
    html += '<input type="number" id="de-width-' + _esc(special.reference) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) + '" min="1" max="12" size="2" value="' + special.width + '">';
    html += '<label class="de-device-width-label" for="de-width-' +
      _esc(special.reference) + '">' + _esc(t.width) + '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html += '<input type="text" id="de-title-' + _esc(special.reference) +
      '" class="form-control form-control-sm de-device-title" maxlength="100" data-order-key="' +
      _esc(orderKey) + '" value="' + _esc(special.title || '') + '">';
    html += '<label for="de-title-' + _esc(special.reference) + '">' + _esc(t.title) + '</label>';
    html += '</span>';
    html += '<button type="button" class="btn btn-danger btn-sm de-remove-btn ms-auto" data-special-key="' +
      _esc(special.reference) + '" title="' + _esc(t.remove) + '">';
    html += '<i class="fas fa-minus" aria-hidden="true"></i></button></div>';
    return html;
  }

  /* ── HTML for one add-row (select + button) ─────────────────── */
  function _addRowHtml(deviceList) {
    var t = _translations();
    var html = '<div class="de-add-row">';
    html += '<select class="form-select de-device-select" aria-label="' + _esc(t.select_aria) + '">';
    html += '<option value="">— ' + _esc(t.select_item) + ' —</option>';
    deviceList.forEach(function (d) {
      var dispIdx = d.subidx ? (d.idx + '_' + d.subidx) : String(d.idx);
      html += '<option value="' + _esc(d.key) + '" data-type-order="' + _typeOrder(d.type) + '">' + _esc(d.name) + ' (IDX\u00a0' + dispIdx + ')</option>';
    });
    html += '</select>';
    html += '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" size="2" value="3" title="' + _esc(t.column_width) + '" aria-label="' + _esc(t.width) + '">';
    html += '<input type="text" class="form-control form-control-sm de-special-value d-none" aria-label="">';
    html += '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="' + _esc(t.add_device) + '">';
    html += '<i class="fas fa-plus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function _specialAddRowHtml(kind) {
    var t = _translations();
    var isTitle = kind === 'title';
    var html = '<div class="de-add-row de-special-add-row">';
    html += '<select class="de-device-select d-none" aria-hidden="true" tabindex="-1">';
    html += '<option value="' + (isTitle ? '__title__' : '__dummy__') + '" selected></option></select>';
    html += '<input ' + (isTitle ? 'type="text"' : 'type="number" min="1"') +
      ' class="form-control form-control-sm de-special-value" placeholder="' +
      _esc(isTitle ? t.enter_title : t.enter_idx) + '" aria-label="' +
      _esc(isTitle ? t.enter_title : t.enter_idx) + '">';
    html += '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" size="2" value="' +
      (isTitle ? '12' : '3') + '" title="' + _esc(t.column_width) + '" aria-label="' + _esc(t.width) + '">';
    html += '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="' +
      _esc(isTitle ? t.separator : t.custom_devices) + '"><i class="fas fa-plus" aria-hidden="true"></i></button>';
    html += '</div>';
    return html;
  }

  function _nextSpecialReference(type) {
    var prefix = type === 'title' ? 'Title_' : 'dummyblock_';
    var used = {};
    if (typeof blocks !== 'undefined') {
      Object.keys(blocks).forEach(function (key) {
        used[key] = true;
      });
    }
    Object.keys(managedSpecials).forEach(function (orderKey) {
      used[managedSpecials[orderKey].reference] = true;
    });
    var number = 1;
    while (used[prefix + number]) number++;
    return prefix + number;
  }

  /* ── wire up event handlers ─────────────────────────────────── */
  function _attachHandlers(available, allDomoticz) {
    $('#de-device-list').on('click', '.de-config-btn', function () {
      _openConfigPopup(String($(this).attr('data-order-key') || ''));
    });

    /* - (remove) button */
    $('#de-device-list').on('click', '.de-remove-btn', function () {
      var specialKey = String($(this).attr('data-special-key') || '');
      if (specialKey) {
        var specialOrderKey = _specialOrderKey(specialKey);
        delete managedSpecials[specialOrderKey];
        delete gridPositions[specialOrderKey];
        delete gridRefs[specialOrderKey];
        var specialPos = managedOrder.indexOf(specialOrderKey);
        if (specialPos > -1) managedOrder.splice(specialPos, 1);
        $(this).closest('.de-device-item').remove();
        if ($('#de-device-list .de-device-item').length === 0) {
          $('#de-device-list').html(
            '<div class="de-empty">' + _esc(_translations().empty_items) + '</div>'
          );
        }
        return;
      }
      var ck  = String($(this).attr('data-ck'));
      var pos = managedDevices.indexOf(ck);
      if (pos > -1) managedDevices.splice(pos, 1);
      var orderPos = managedOrder.indexOf(_deviceOrderKey(ck));
      if (orderPos > -1) managedOrder.splice(orderPos, 1);
      delete deviceNames[ck];
      delete deviceWidths[ck];
      delete deviceHeights[ck];
      delete deviceTitles[ck];
      delete deviceOptions[ck];
      delete deviceTitleVisible[ck];
      delete deviceCustomFields[ck];
      delete devicePreservedFields[ck];
      delete gridPositions[_deviceOrderKey(ck)];
      delete gridRefs[_deviceOrderKey(ck)];

      /* remove item from device-list */
      $(this).closest('.de-device-item').remove();
      if ($('#de-device-list .de-device-item').length === 0) {
        $('#de-device-list').html('<div class="de-empty">' + _esc(_translations().empty_items) + '</div>');
      }

      /* restore device in add-row dropdown and in available[] */
      var p      = _parseCk(ck);
      var isGroup = _isGroupCk(ck);
      var device = isGroup ? allDomoticz[ck] : (allDomoticz[String(p.idx)] || allDomoticz[p.idx]);
      var rawName = device ? device.Name : (isGroup ? ck : ('Device ' + p.idx));
      var type   = device ? (device.Type || '') : (isGroup ? 'Group' : '');
      var groupPrefix = isGroup ? (type === 'Scene' ? 'Scene_' : 'Group_') : '';
      var displayName = groupPrefix + rawName + (!isGroup && p.subidx ? '\u00a0(' + p.subidx + ')' : '');
      var dispIdx     = isGroup ? ck : (p.subidx ? (p.idx + '_' + p.subidx) : String(p.idx));

      /* keep available[] in sync so subsequent + rows include this device */
      if (!available.some(function (d) { return d.key === ck; })) {
        available.push({ key: ck, idx: p.idx, subidx: p.subidx,
                         name: displayName, plainName: isGroup ? rawName : null, type: type });
        _sortAvailable(available);
      }
      if (editorMode !== 'devices') return;

      var newTypeOrder = _typeOrder(type);
      var newText = displayName + ' (IDX\u00a0' + dispIdx + ')';
      var optHtml = '<option value="' + _esc(ck) + '" data-type-order="' + newTypeOrder + '">' +
                    _esc(displayName) + ' (IDX\u00a0' + dispIdx + ')</option>';

      var $select = $('#de-add-rows .de-device-select');
      if ($select.length) {
        /* insert in category + alphabetical order */
        var inserted = false;
        $select.find('option').each(function () {
          if (!$(this).val() || /^__/.test(String($(this).val()))) return;
          var optTypeOrder = parseInt($(this).attr('data-type-order') || '2', 10);
          var cmp = newTypeOrder !== optTypeOrder
            ? newTypeOrder - optTypeOrder
            : newText.localeCompare($(this).text());
          if (cmp < 0) {
            $(this).before(optHtml);
            inserted = true;
            return false;
          }
        });
        if (!inserted) $select.append(optHtml);
        /* remove "all devices added" message if present */
        $('#de-add-rows .de-empty').remove();
      } else {
        /* no add-row exists yet — create one with this single device */
        $('#de-add-rows').html(_addRowHtml([{ key: ck, idx: p.idx, subidx: p.subidx,
                                              name: displayName, plainName: isGroup ? rawName : null, type: type }]));
      }
    });

    $('#de-device-list').on('input change', '.de-device-width', function () {
      var orderKey = String($(this).attr('data-order-key') || '');
      if (!orderKey) return;
      var width = _parseWidth($(this).val());
      if (orderKey.indexOf('widget:') === 0) {
        widgetWidths[orderKey] = width;
      } else if (orderKey.indexOf('special:') === 0) {
        managedSpecials[orderKey].width = width;
      } else {
        deviceWidths[orderKey.slice(7)] = width;
      }
      $(this).val(width);
    });

    /* Keep the editable title and display options in state for saving. */
    $('#de-device-list').on('input change', '.de-device-title', function () {
      var orderKey = String($(this).attr('data-order-key') || '');
      var value = String($(this).val() || '').trim();
      if (orderKey.indexOf('widget:') === 0) {
        widgetTitles[orderKey] = value;
        if (managedWidgets[orderKey]) managedWidgets[orderKey].pendingTitleEdited = true;
      } else if (orderKey.indexOf('special:') === 0) {
        if (managedSpecials[orderKey]) managedSpecials[orderKey].title = value;
      } else {
        deviceTitles[String($(this).attr('data-ck') || '')] = value;
      }
    });
    $('#de-add-rows').on('change', '.de-device-select', function () {
      var $row = $(this).closest('.de-add-row');
      var $value = $row.find('.de-special-value');
      var selected = String($(this).val() || '');
      var t = _translations();
      if (selected === '__dummy__') {
        $value.attr({ type: 'number', min: '1', placeholder: t.enter_idx,
          'aria-label': t.enter_idx }).val('').removeClass('d-none');
        $row.find('.de-width-input').val(3);
      } else if (selected === '__title__') {
        $value.removeAttr('min').attr({ type: 'text', placeholder: t.enter_title,
          'aria-label': t.enter_title }).val('').removeClass('d-none');
        $row.find('.de-width-input').val(12);
      } else {
        $value.val('').addClass('d-none');
        $row.find('.de-width-input').val(3);
      }
    });

    /* + button */
    $('#de-add-rows').on('click', '.de-add-btn', function () {
      var $row    = $(this).closest('.de-add-row');
      var $select = $row.find('.de-device-select');
      var ck      = $select.val();
      if (!ck) return;

      if (ck === '__dummy__' || ck === '__title__') {
        var specialType = ck === '__title__' ? 'title' : 'dummy';
        var rawValue = String($row.find('.de-special-value').val() || '').trim();
        var t = _translations();
        var idx = specialType === 'dummy' ? parseInt(rawValue, 10) : null;
        if (specialType === 'dummy' && !(idx > 0 && String(idx) === rawValue)) {
          alert(t.invalid_idx);
          return;
        }
        if (specialType === 'title' && !rawValue) {
          alert(t.invalid_title);
          return;
        }
        var reference = _nextSpecialReference(specialType);
        var specialOrderKey = _specialOrderKey(reference);
        var numberMatch = reference.match(/(\d+)$/);
        var special = {
          kind: 'special',
          specialType: specialType,
          orderKey: specialOrderKey,
          reference: reference,
          definition: {},
          idx: idx,
          title: specialType === 'title'
            ? rawValue.slice(0, 100)
            : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
          width: _parseWidth($row.find('.de-width-input').val()),
          height: specialType === 'title' ? 120 : null,
          showTitle: true,
          options: specialType === 'dummy'
            ? { icon: true, iconValue: null, hide_data: true, last_update: false, switch: false }
            : null,
          customFields: [{
            field: 'title',
            setting: specialType === 'title'
              ? rawValue.slice(0, 100)
              : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
            value: specialType === 'title'
              ? rawValue.slice(0, 100)
              : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
            system: true,
          }],
          preservedFields: {},
        };
        managedSpecials[specialOrderKey] = special;
        managedOrder.push(specialOrderKey);
        $('#de-device-list .de-empty').remove();
        $('#de-device-list').append(_specialItemHtml(specialOrderKey));
        if (editorMode === 'devices') {
          $select.val('').trigger('change');
        } else {
          $row.find('.de-special-value').val('');
        }
        return;
      }

      if (managedDevices.indexOf(ck) < 0) managedDevices.push(ck);
      if (managedOrder.indexOf(_deviceOrderKey(ck)) < 0) {
        managedOrder.push(_deviceOrderKey(ck));
      }
      deviceWidths[ck] = _parseWidth($row.find('.de-width-input').val());
      deviceTitles[ck] = '';
      deviceOptions[ck] = {
        icon: true, iconValue: null, hide_data: false, last_update: false, switch: false,
      };
      deviceTitleVisible[ck] = true;
      deviceCustomFields[ck] = [
        { field: 'title', setting: '', value: '', system: true },
      ];
      devicePreservedFields[ck] = {};

      /* record the device name for this composite key */
      /* for groups, use plainName (without Group_/Scene_ prefix) so the block title is clean */
      var addedName = _isGroupCk(ck) ? ck : ('Device ' + _parseCk(ck).idx);
      for (var di = 0; di < available.length; di++) {
        if (available[di].key === ck) {
          addedName = available[di].plainName || available[di].name;
          break;
        }
      }
      deviceNames[ck] = addedName;

      /* update device-list section */
      $('#de-device-list .de-empty').remove();
      $('#de-device-list').append(_deviceItemHtml(ck, allDomoticz, true));

      /* remove the completed row */
      $row.remove();

      /* remove added device from every remaining select */
      $('#de-add-rows .de-device-select option[value="' + ck + '"]').remove();

      /* Always add a fresh normal-device row for the next selection. */
      var remaining = available.filter(function (d) {
        return managedDevices.indexOf(d.key) < 0;
      });
      $('#de-add-rows .de-empty').remove();
      var $newRow = $(_addRowHtml(remaining));
      /* remove already-managed keys from the new select */
      managedDevices.forEach(function (mck) {
        $newRow.find('option[value="' + mck + '"]').remove();
      });
      $('#de-add-rows').append($newRow);
    });

    /* drag-and-drop reordering */
    var $list = $('#de-device-list');
    var dragSrcEl = null;

    $list.on('dragstart', '.de-device-item', function (e) {
      dragSrcEl = this;
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData(
        'text/plain',
        String($(this).attr('data-order-key'))
      );
      $(this).addClass('de-drag-dragging');
    });

    $list.on('dragend', '.de-device-item', function () {
      $(this).removeClass('de-drag-dragging');
      $list.find('.de-drag-over-top, .de-drag-over-bottom')
        .removeClass('de-drag-over-top de-drag-over-bottom');
    });

    $list.on('dragover', '.de-device-item', function (e) {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
      if (this === dragSrcEl) return;
      var rect  = this.getBoundingClientRect();
      var above = e.originalEvent.clientY < rect.top + rect.height / 2;
      $(this).toggleClass('de-drag-over-top', above)
             .toggleClass('de-drag-over-bottom', !above);
    });

    $list.on('dragleave', '.de-device-item', function (e) {
      /* only clear when leaving the item itself, not a child */
      if (!this.contains(e.originalEvent.relatedTarget)) {
        $(this).removeClass('de-drag-over-top de-drag-over-bottom');
      }
    });

    $list.on('drop', '.de-device-item', function (e) {
      e.preventDefault();
      if (!dragSrcEl || this === dragSrcEl) return;
      var rect  = this.getBoundingClientRect();
      var above = e.originalEvent.clientY < rect.top + rect.height / 2;
      if (above) {
        $(this).before(dragSrcEl);
      } else {
        $(this).after(dragSrcEl);
      }
      $(this).removeClass('de-drag-over-top de-drag-over-bottom');
      /* sync the combined device/widget order from the DOM */
      managedOrder = [];
      $list.find('.de-device-item').each(function () {
        managedOrder.push(String($(this).attr('data-order-key')));
      });
    });

    /* save button */
    $('#deviceeditorpopup').on('click', '#de-save-btn', _save);

    /* cleanup on hide */
    $('#deviceeditorpopup').on('hidden.bs.modal', function () {
      if ($(this).data('de-config-transition')) return;
      $(this).remove();
    });
  }

  function _widthForOrderKey(orderKey) {
    if (orderKey.indexOf('widget:') === 0) {
      return _parseWidth(widgetWidths[orderKey]);
    }
    if (orderKey.indexOf('special:') === 0) {
      return _parseWidth(managedSpecials[orderKey].width);
    }
    return _parseWidth(deviceWidths[orderKey.slice(7)]);
  }

  function _heightForOrderKey(orderKey) {
    if (orderKey.indexOf('widget:') === 0) return widgetHeights[orderKey];
    if (orderKey.indexOf('special:') === 0) {
      return managedSpecials[orderKey].height;
    }
    return deviceHeights[orderKey.slice(7)];
  }

  /* ── save to CONFIG.js via PHP ──────────────────────────────── */
  function _save() {
    var t = _translations();
    var $btn = $('#de-save-btn').prop('disabled', true).text(t.saving);

    var orderedBlockKeys = managedOrder
      .filter(function (orderKey) {
        return orderKey.indexOf('widget:') !== 0;
      });
    var devicePayload = orderedBlockKeys.map(function (orderKey) {
      if (orderKey.indexOf('special:') === 0) {
        var special = managedSpecials[orderKey];
        var specialEntry = {
          kind: special.specialType,
          key: special.reference,
          width: _parseWidth(special.width),
        };
        if (special.specialType !== 'custom' || String(special.title || '').trim()) {
          specialEntry.title = special.title;
        }
        if (special.showTitle === false) specialEntry.hide_title = true;
        var specialCustomFields = _deviceCustomFieldsObject(
          special.customFields,
          special.preservedFields
        );
        if (Object.keys(specialCustomFields).length) {
          specialEntry.custom_fields = specialCustomFields;
        }
        if (special.specialType === 'dummy' || special.specialType === 'custom') {
          specialEntry.idx = special.idx;
          var specialOptions = special.options || {};
          if (specialOptions.icon === false) {
            specialEntry.icon = '';
          } else if (specialOptions.iconValue) {
            specialEntry.icon = specialOptions.iconValue;
          }
          specialEntry.hide_data = specialOptions.hide_data === true;
          specialEntry.last_update = specialOptions.last_update === true;
          specialEntry.switch = specialOptions.switch === true;
          if (specialOptions.dial === true) specialEntry.type = 'dial';
        } else if (special.specialType === 'slidebutton') {
          var slideOptions = special.options || {};
          specialEntry.slide = parseInt(special.slideTarget, 10) || 1;
          specialEntry.button_key = String(
            special.buttonKey ||
              (special.definition && special.definition.key) ||
              special.title ||
              special.reference
          ).slice(0, 100);
          specialEntry.icon = slideOptions.iconValue || '';
        } else if (special.specialType === 'title') {
          var titleOptions = special.options || {};
          if (titleOptions.icon === false) {
            specialEntry.icon = '';
          } else if (titleOptions.iconValue) {
            specialEntry.icon = titleOptions.iconValue;
          }
        }
        if (special.height) specialEntry.height = special.height;
        return specialEntry;
      }
      var ck = orderKey.slice(7);
      var p   = _parseCk(ck);
      var entry = {
        idx:   p.idx,
        name:  deviceNames[ck] || ('Device ' + p.idx),
        width: _parseWidth(deviceWidths[ck]),
        key:   _stableDeviceReference(ck),
      };
      var title = String(deviceTitles[ck] || '').trim();
      var options = deviceOptions[ck] || {};
      if (title) entry.title = title;
      if (options.icon === false) {
        entry.icon = '';
      } else if (options.iconValue) {
        // A custom icon entered in Device Config takes precedence while Icon is enabled.
        entry.icon = options.iconValue;
      }
      entry.hide_data = options.hide_data === true;
      entry.last_update = options.last_update === true;
      entry.switch = options.switch === true;
      if (options.dial === true) entry.type = 'dial';
      if (deviceTitleVisible[ck] === false) entry.hide_title = true;
      var customFields = _deviceCustomFieldsObject(
        deviceCustomFields[ck],
        devicePreservedFields[ck]
      );
      if (Object.keys(customFields).length) entry.custom_fields = customFields;
      if (p.subidx) entry.subidx = p.subidx;
      if (deviceHeights[ck]) entry.height = deviceHeights[ck];
      // Never retain a legacy name-based reference: Domoticz names may change.
      return entry;
    });

    var orderedWidgetKeys = managedOrder.filter(function (orderKey) {
      return orderKey.indexOf('widget:') === 0;
    });
    var widgetPayload = orderedWidgetKeys.map(function (orderKey) {
      var entry = _widgetPayload(orderKey);
      if (gridMode && gridRefs[orderKey]) entry.key = gridRefs[orderKey];
      return entry;
    });

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postEditorData(
          'js/saveblocks.php',
          {
            devices: devicePayload,
            screen: _activeScreenPayload(),
            blocksOnly: gridMode,
          },
          token
        ).then(function (deviceResult) {
          // Widget display options must also be persisted on grid screens.
          // Passing the stable grid key lets savewidgets.php rebuild only the
          // editor-owned widget blocks before savegridlayout.php rewrites order.
          var widgetSave = _postEditorData(
            'js/savewidgets.php',
            {
              widgets: widgetPayload,
              settings: pendingWidgetSettings,
              screen: _activeScreenPayload(),
              blocksOnly: gridMode,
            },
            token
          );
          return widgetSave.then(function (widgetResult) {
            var blockRefs = {};
            var widgetRefs = {};
            orderedBlockKeys.forEach(function (orderKey, index) {
              blockRefs[orderKey] = deviceResult.blockKeys[index];
            });
            orderedWidgetKeys.forEach(function (orderKey, index) {
              widgetRefs[orderKey] = widgetResult.blockKeys[index];
            });
            // Device Editor does not modify custom.css; theme and hand-written
            // CSS remain outside this save flow.
            if (gridMode) {
              var occupied = gridExtras
                .map(function (item) {
                  return item.grid;
                })
                .concat(
                  Object.keys(gridPositions).map(function (orderKey) {
                    return gridPositions[orderKey];
                  })
                );
              var gridItems = managedOrder.map(function (orderKey) {
                var isWidget = orderKey.indexOf('widget:') === 0;
                var ref = isWidget
                  ? widgetRefs[orderKey]
                  : blockRefs[orderKey];
                var position = gridPositions[orderKey];
                if (!position) {
                  var width12 = _widthForOrderKey(orderKey);
                  var pixelHeight = _heightForOrderKey(orderKey);
                  var width = Math.max(
                    1,
                    Math.min(
                      gridConfig.gridColumns,
                      Math.round(
                        (width12 * gridConfig.gridColumns) / 12
                      )
                    )
                  );
                  var isTitleBlock =
                    orderKey.indexOf('special:') === 0 &&
                    managedSpecials[orderKey].specialType === 'title';
                  var height = isTitleBlock
                    ? TITLE_GRID_HEIGHT
                    : Math.max(
                        1,
                        Math.ceil(
                          ((pixelHeight || 120) + gridConfig.gap) /
                            (gridConfig.rowHeight + gridConfig.gap)
                        )
                      );
                  position = _firstFreeGridPosition(
                    occupied,
                    width,
                    height
                  );
                  occupied.push(position);
                }
                return { ref: ref, grid: $.extend({}, position) };
              });
              gridItems = gridItems.concat(gridExtras);
              return _postEditorData(
                'js/savegridlayout.php',
                {
                  items: gridItems,
                  screen: _activeScreenPayload(),
                  gridColumns: gridConfig.gridColumns,
                  rowHeight: gridConfig.rowHeight,
                  gap: gridConfig.gap,
                  mobileLayout: gridConfig.mobileLayout,
                },
                token
              );
            }
            var layoutItems = managedOrder.map(function (orderKey) {
              var isWidget = orderKey.indexOf('widget:') === 0;
              var entry = {
                ref: isWidget ? widgetRefs[orderKey] : blockRefs[orderKey],
                width: _widthForOrderKey(orderKey),
              };
              var height = _heightForOrderKey(orderKey);
              if (height) entry.height = height;
              return entry;
            });
            if (_activeScreenTarget() === 'standby') {
              layoutItems = _preserveStandbyExtraBlocks(layoutItems);
            }
            return _postEditorData(
              'js/savelayout.php',
              { items: layoutItems, screen: _activeScreenPayload() },
              token
            );
          });
        });
      })
      .done(function () {
        $btn.removeClass('btn-primary').addClass('btn-success').text(t.saved);
        setTimeout(function () {
          var el = document.getElementById('deviceeditorpopup');
          if (el && window.bootstrap) {
            window.bootstrap.Modal.getInstance(el).hide();
          }
          // eslint-disable-next-line no-self-assign
          window.location.href = window.location.href;
        }, 900);
      })
      .fail(function (xhr) {
        var msg = xhr.responseJSON && xhr.responseJSON.error
          ? xhr.responseJSON.error
          : t.save_failed;
        $btn.prop('disabled', false).text(t.save);
        alert(t.error_prefix + ' ' + msg);
      });
  }

  function _preserveStandbyExtraBlocks(layoutItems) {
    var known = {};
    layoutItems.forEach(function (item) {
      if (item && item.ref) known[item.ref] = true;
    });
    var preserved = [];
    if (
      typeof columns_standby !== 'undefined' &&
      columns_standby &&
      columns_standby[1] &&
      Array.isArray(columns_standby[1].blocks)
    ) {
      columns_standby[1].blocks.forEach(function (ref) {
        if (typeof ref !== 'string' || known[ref]) return;
        // Keep simple/hand-written standby blocks (clock, weather, …).
        if (_toCompositeKey(ref) || _widgetFromReference(ref)) return;
        preserved.push({ ref: ref, width: 12 });
        known[ref] = true;
      });
    }
    return preserved.concat(layoutItems);
  }

  function _postEditorData(url, payload, token) {
    return $.ajax({
      url: configEditorUrl(url),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      dataType: 'json',
      headers: { 'X-Dashticz-CSRF': token },
    });
  }

  /* ── HTML-escape helper ─────────────────────────────────────── */
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _parseWidth(value) {
    var width = parseInt(value, 10);
    if (!width) width = 3;
    return Math.max(1, Math.min(12, width));
  }

  /* Find the CONFIG.js block definition associated with a composite IDX. */
  function _getConfiguredBlockForCk(ck) {
    if (typeof blocks === 'undefined') return null;
    var keys = Object.keys(blocks);
    for (var i = 0; i < keys.length; i++) {
      if (_toCompositeKey(blocks[keys[i]]) === ck) return blocks[keys[i]];
    }
    return null;
  }

  function _getConfiguredWidthForCk(ck) {
    if (typeof columns !== 'undefined') {
      var colKeys = Object.keys(columns);
      for (var i = 0; i < colKeys.length; i++) {
        var col = columns[colKeys[i]];
        if (!col || !Array.isArray(col.blocks)) continue;
        for (var j = 0; j < col.blocks.length; j++) {
          var ref   = col.blocks[j];
          var block = null;
          var refCk = _toCompositeKey(ref);
          if (typeof ref === 'string' && typeof blocks !== 'undefined' && blocks[ref]) {
            block = blocks[ref];
            if (!refCk) refCk = _toCompositeKey(block);
          } else if (typeof ref === 'object' && ref !== null) {
            block = ref;
          }
          if (refCk === ck && block && typeof block.width !== 'undefined') {
            return _parseWidth(block.width);
          }
        }
      }
    }

    if (typeof blocks !== 'undefined') {
      var blockKeys = Object.keys(blocks);
      for (var bi = 0; bi < blockKeys.length; bi++) {
        var b = blocks[blockKeys[bi]];
        if (_toCompositeKey(b) === ck && b && typeof b.width !== 'undefined') {
          return _parseWidth(b.width);
        }
      }
    }
    return 3;
  }

  function _getConfiguredHeightForCk(ck) {
    if (typeof columns !== 'undefined') {
      var colKeys = Object.keys(columns);
      for (var i = 0; i < colKeys.length; i++) {
        var col = columns[colKeys[i]];
        if (!col || !Array.isArray(col.blocks)) continue;
        for (var j = 0; j < col.blocks.length; j++) {
          var ref = col.blocks[j];
          var block = null;
          var refCk = _toCompositeKey(ref);
          if (typeof ref === 'string' && typeof blocks !== 'undefined' && blocks[ref]) {
            block = blocks[ref];
            if (!refCk) refCk = _toCompositeKey(block);
          } else if (typeof ref === 'object' && ref !== null) {
            block = ref;
          }
          if (refCk === ck && block && typeof block.height !== 'undefined') {
            return _parseHeight(block.height);
          }
        }
      }
    }
    return null;
  }

  function _parseHeight(value) {
    var height = parseInt(value, 10);
    if (!(height > 0)) return null;
    return Math.max(50, Math.min(2000, Math.round(height / 10) * 10));
  }

  return {
    open: open,
    openConfig: openConfig,
    openSpecial: openSpecial,
    openCustom: openCustom,
    openMultiDevice: openMultiDevice,
    openSlideButton: openSlideButton,
    addSeparator: addSeparator,
  };
}());

//# sourceURL=js/deviceeditor.js
