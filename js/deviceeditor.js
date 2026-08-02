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
  var widgetWidths   = {};   // widget order key -> block width (1..12)
  var widgetHeights  = {};   // widget order key -> optional block height
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
        remove: 'Remove block',
        close: 'Close',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved!',
      },
      configured
    );
  }

  /* ── public API ─────────────────────────────────────────────── */
  function open() {
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _buildAndShowModal();
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
    widgetWidths   = {};
    widgetHeights  = {};
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
      /^Title_\d+$/.test(reference) &&
      String(definition.type || '').toLowerCase() === 'blocktitle'
    ) {
      kind = 'title';
    } else if (/^dummyblock_\d+$/.test(reference)) {
      kind = 'dummy';
    }
    if (!kind) return null;

    return {
      kind: 'special',
      specialType: kind,
      orderKey: _specialOrderKey(reference),
      reference: reference,
      definition: definition,
      idx: kind === 'dummy' ? parseInt(definition.idx, 10) : null,
      title: String(definition.title || (kind === 'title' ? 'Title' : reference)),
      width: _parseWidth(definition.width || (kind === 'title' ? 12 : 3)),
      height: _parseHeight(definition.height),
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
    };
    if (typeof blocks === 'undefined' || !blocks[reference]) {
      return null;
    }
    var definition = blocks[reference];
    var catalogItem = catalog[String(reference)];
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
        moon: 'moon',
        news: 'news',
        basicclock: 'clock',
        stationclock: 'clock',
        flipclock: 'clock',
        haymanclock: 'clock',
        miniclock: 'clock',
      };
      var id = typeMap[type];
      if (!id) return null;
      // Use the translated title for the widget type; fall back to the CONFIG.js
      // title only if the type is not in the translations map.
      catalogItem = { id: id, title: translatedTitles[id] || definition.title || id };
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

  function _widgetPayload(orderKey) {
    var widget = managedWidgets[orderKey];
    var definition = widget.definition || {};
    var entry = {
      id: widget.id,
      width: _parseWidth(widgetWidths[orderKey]),
    };
    if (widgetHeights[orderKey]) entry.height = widgetHeights[orderKey];
    if (widget.id === 'garbage') entry.displayTitle = widget.title;

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
      entry.imageUrl = definition.imageUrl || '';
      if (definition.videoUrl) entry.videoUrl = definition.videoUrl;
    } else if (widget.id === 'alarmmeldingen') {
      entry.rss =
        definition.rss || 'https://www.alarmeringen.nl/feeds/all.rss';
      if (definition.filter) entry.filter = definition.filter;
    }

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
  function _buildAndShowModal() {
    $('#deviceeditorpopup').remove();

    var managedKeys = managedDevices.slice();
    var allDomoticz = Domoticz.getAllDevices();
    var available   = _getAvailableDevices(managedKeys);

    /* populate deviceNames / deviceWidths for all managed devices */
    managedKeys.forEach(function (ck) {
      var p = _parseCk(ck);
      var d = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      deviceNames[ck]  = d ? (d.Name || ('Device ' + p.idx)) : ('Device ' + p.idx);
      deviceWidths[ck] = _getConfiguredWidthForCk(ck);
      deviceHeights[ck] = _getConfiguredHeightForCk(ck);
    });

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
    html += '<div class="modal-dialog modal-lg modal-dialog-scrollable">';
    html += '<div class="modal-content">';

    /* header */
    html += '<div class="modal-header">';
    html += '<h5 class="modal-title" id="de-title">';
    html += '<i class="fas fa-pencil-alt me-2" aria-hidden="true"></i>' + _esc(t.editor_title);
    html += '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
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

    /* section 2 – add devices */
    html += '<h6 class="de-section-title mt-3">' + _esc(t.add_item) + '</h6>';
    html += '<div id="de-add-rows">';
    html += _addRowHtml(available);
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
    html += '<span class="de-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx">IDX\u00a0' + _esc(dispIdx) + '</span>';
    html += '<span class="de-device-name">' + name + (!isGroup && p.subidx ? '\u00a0(' + p.subidx + ')' : '') + '</span>';
    if (type) html += '<span class="de-device-type">' + type + '</span>';
    html += '<span class="de-device-width-wrap">';
    html += '<label class="de-device-width-label" for="de-width-' + _esc(ck) + '">' + _esc(t.width) + '</label>';
    html += '<input type="number" id="de-width-' + _esc(ck) + '" class="form-control form-control-sm de-device-width" ';
    html += 'data-ck="' + _esc(ck) + '" data-order-key="' + _esc(orderKey) +
      '" min="1" max="12" value="' + _parseWidth(deviceWidths[ck]) + '">';
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
    html += '<span class="de-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx"><i class="fas fa-puzzle-piece me-1" aria-hidden="true"></i>Widget</span>';
    html += '<span class="de-device-name">Widget - ' + _esc(widget.title) + '</span>';
    html += '<span class="de-device-type">' +
      _esc(widget.definition.type || widget.id) + '</span>';
    html += '<span class="de-device-width-wrap">';
    html += '<label class="de-device-width-label" for="de-width-' +
      _esc(widget.id) + '">' + _esc(t.width) + '</label>';
    html += '<input type="number" id="de-width-' + _esc(widget.id) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) + '" min="1" max="12" value="' +
      _parseWidth(widgetWidths[orderKey]) + '">';
    html += '</span>';
    html += '<span class="de-widget-managed" title="Remove this widget from the Widgets menu"><i class="fas fa-lock" aria-hidden="true"></i></span>';
    html += '</div>';
    return html;
  }

  function _specialItemHtml(orderKey) {
    var special = managedSpecials[orderKey];
    if (!special) return '';
    var t = _translations();
    var isTitle = special.specialType === 'title';
    var label = isTitle ? t.title_block : t.dummy_device;
    var detail = isTitle ? special.title : 'IDX\u00a0' + special.idx;
    var html = '<div class="de-device-item de-special-item" data-special-key="' +
      _esc(special.reference) + '" data-order-key="' + _esc(orderKey) +
      '" draggable="true">';
    html += '<span class="de-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx"><i class="fas ' +
      (isTitle ? 'fa-heading' : 'fa-cube') + ' me-1" aria-hidden="true"></i>' +
      _esc(label) + '</span>';
    html += '<span class="de-device-name">' + _esc(detail) + '</span>';
    html += '<span class="de-device-width-wrap">';
    html += '<label class="de-device-width-label" for="de-width-' +
      _esc(special.reference) + '">' + _esc(t.width) + '</label>';
    html += '<input type="number" id="de-width-' + _esc(special.reference) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) + '" min="1" max="12" value="' + special.width + '">';
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
    html += '<select class="form-select de-device-select" aria-label="Select device to add">';
    html += '<option value="">— ' + _esc(t.select_item) + ' —</option>';
    html += '<option value="__dummy__">' + _esc(t.dummy_device) + '</option>';
    html += '<option value="" disabled>------</option>';
    html += '<option value="__title__">' + _esc(t.title_block) + '</option>';
    html += '<option value="" disabled>------</option>';
    deviceList.forEach(function (d) {
      var dispIdx = d.subidx ? (d.idx + '_' + d.subidx) : String(d.idx);
      html += '<option value="' + _esc(d.key) + '" data-type-order="' + _typeOrder(d.type) + '">' + _esc(d.name) + ' (IDX\u00a0' + dispIdx + ')</option>';
    });
    html += '</select>';
    html += '<input type="text" class="form-control form-control-sm de-special-value d-none" aria-label="">';
    html += '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" value="3" title="Column width (1-12)" aria-label="Column width">';
    html += '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="Add device">';
    html += '<i class="fas fa-plus" aria-hidden="true"></i>';
    html += '</button>';
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
      delete gridPositions[_deviceOrderKey(ck)];
      delete gridRefs[_deviceOrderKey(ck)];

      /* remove item from device-list */
      $(this).closest('.de-device-item').remove();
      if ($('#de-device-list .de-device-item').length === 0) {
        $('#de-device-list').html('<div class="de-empty">No devices or widgets configured in Dashticz.</div>');
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
        };
        managedSpecials[specialOrderKey] = special;
        managedOrder.push(specialOrderKey);
        $('#de-device-list .de-empty').remove();
        $('#de-device-list').append(_specialItemHtml(specialOrderKey));
        $select.val('').trigger('change');
        return;
      }

      if (managedDevices.indexOf(ck) < 0) managedDevices.push(ck);
      if (managedOrder.indexOf(_deviceOrderKey(ck)) < 0) {
        managedOrder.push(_deviceOrderKey(ck));
      }
      deviceWidths[ck] = _parseWidth($row.find('.de-width-input').val());

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

      /* Always add a fresh row: Dummy and Title remain available even when
         every Domoticz device has already been added. */
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
    $('#deviceeditorpopup').one('hidden.bs.modal', function () {
      $('#deviceeditorpopup').remove();
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
          title: special.title,
          width: _parseWidth(special.width),
        };
        if (special.specialType === 'dummy') specialEntry.idx = special.idx;
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
          var widgetSave = gridMode
            ? $.Deferred()
                .resolve({
                  blockKeys: orderedWidgetKeys.map(function (orderKey) {
                    return gridRefs[orderKey];
                  }),
                })
                .promise()
            : _postEditorData(
                'js/savewidgets.php',
                {
                  widgets: widgetPayload,
                  screen: _activeScreenPayload(),
                  blocksOnly: false,
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
          : 'Devices could not be saved automatically.';
        $btn.prop('disabled', false).text(t.save);
        alert('Error: ' + msg);
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

  return { open: open };
}());

//# sourceURL=js/deviceeditor.js
