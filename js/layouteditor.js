/* global Domoticz settings columns columns_standby blocks myswiper DashticzGridLayout DashticzScreenSwitcher isCustomConfigMode standbyActive language */
// eslint-disable-next-line no-unused-vars
var DashticzLayoutEditor = (function () {
  'use strict';

  var HEIGHT_STEP = 10;
  var MIN_HEIGHT = 50;
  var MAX_HEIGHT = 2000;
  var MIN_GRID_WIDTH = 2;
  var MIN_GRID_HEIGHT = 4;
  var MIN_TITLE_GRID_HEIGHT = 3;
  var MIN_MINICLOCK_GRID_HEIGHT = 2;
  var active = false;
  var items = [];
  var itemById = {};
  var originalColumns = [];
  var $canvas = null;
  var $toolbar = null;
  var pointerState = null;
  var swiperTouchMove = null;
  var gridMode = false;
  var gridConfig = null;
  var originalGridWrappers = [];
  var gridCollectionError = false;
  var editingScreen = null;
  var $editingScreen = null;
  var gridEditorRows = 0;
  var edgeScrollFrame = null;
  var edgeScrollDirection = 0;
  var lastPointerPosition = null;

  function _translations() {
    return (
      (typeof language !== 'undefined' &&
        language.settings &&
        language.settings.layouteditor) ||
      {}
    );
  }

  function _t(key) {
    return _translations()[key] || '';
  }

  function _minimumGridHeight(item) {
    var type =
      item && item.definition
        ? String(item.definition.type || '').toLowerCase()
        : '';
    if (type === 'blocktitle') return MIN_TITLE_GRID_HEIGHT;
    if (type === 'miniclock') return MIN_MINICLOCK_GRID_HEIGHT;
    return MIN_GRID_HEIGHT;
  }

  function open() {
    if (active) return;

    var $screen = _activeScreenDom();
    if (!$screen.length) {
      alert(_t('no_active_screen'));
      return;
    }
    editingScreen = _activeScreenPayload();
    $editingScreen = $screen;
    gridMode = $screen.hasClass('dt-grid-screen');
    if (gridMode) {
      var $grid = $screen.children('.dt-grid-layout').first();
      _collectGridItems($grid);
      if (gridCollectionError || !items.length) {
        alert(
          _t('invalid_grid_blocks')
        );
        gridMode = false;
        editingScreen = null;
        return;
      }
      active = true;
      $('body').addClass('dle-active');
      _prepareGridCanvas($grid);
      _decorateItems();
      _buildToolbar();
      _attachHandlers();
      _disableSwiper();
      return;
    }
    if (
      typeof isCustomConfigMode === 'function' &&
      !isCustomConfigMode()
    ) {
      convertCurrentScreenToGrid(false).done(function () {
        try {
          sessionStorage.setItem(
            'dashticz_open_grid_editor',
            String(_activeScreenPayload())
          );
        } catch (error) {
          // Session storage is optional.
        }
        window.location.reload();
      });
      return;
    }

    var managedColumnRe = /^(de|we|le)_s\d+_col\d+$|^(de|we|le)_col\d+$|^col_\d+$/;
    var isStandby = _activeScreenTarget() === 'standby';
    var $managedColumns = $screen.find('[data-colindex]').filter(function () {
      var key = String($(this).attr('data-colindex'));
      if (isStandby) return true;
      return managedColumnRe.test(key);
    });

    if (!$managedColumns.length) {
      alert(
        _t('no_editable_screen')
      );
      return;
    }

    _collectItems($managedColumns);
    if (!items.length) {
      alert(_t('no_editable_items'));
      return;
    }

    active = true;
    $('body').addClass('dle-active');
    _prepareCanvas($managedColumns);
    _decorateItems();
    _buildToolbar();
    _attachHandlers();
    _disableSwiper();
  }

  function _disableSwiper() {
    if (typeof myswiper !== 'undefined' && myswiper) {
      swiperTouchMove = myswiper.allowTouchMove;
      myswiper.allowTouchMove = false;
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

  function convertCurrentScreenToGrid(skipConfirmation, targetMode) {
    var deferred = $.Deferred();
    var $screen = _activeScreenDom();
    var screenNumber = _activeScreenPayload();
    var allowEmpty = targetMode === 'wizard' && screenNumber !== 'standby';
    var conversion;
    if (!$screen.length) {
      if (!allowEmpty) {
        alert(_t('no_screen_to_convert'));
        deferred.reject();
        return deferred.promise();
      }
      /* A clean CONFIG.js has no rendered content to convert yet. Still create
         screen 1 as an empty grid so its Device and Widget editors can be used. */
      screenNumber = 1;
      conversion = _emptyGridConversion(screenNumber);
    }
    if ($screen.length && $screen.hasClass('dt-grid-screen')) {
      deferred.resolve({ alreadyGrid: true });
      return deferred.promise();
    }
    if (!conversion) {
      conversion = _buildColumnGridConversion(
        $screen,
        screenNumber,
        allowEmpty
      );
    }
    if (conversion.error) {
      alert(conversion.error);
      deferred.reject();
      return deferred.promise();
    }
    if (!conversion.empty && window.innerWidth < 768) {
      alert(
        _t('conversion_width')
      );
      deferred.reject();
      return deferred.promise();
    }
    if (
      !skipConfirmation &&
      !window.confirm(
        _t('conversion_confirm')
      )
    ) {
      deferred.reject();
      return deferred.promise();
    }
    if (targetMode === 'wizard') {
      conversion.payload.configMode = 'wizard';
    }

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return _postLayoutData(
          'js/savegridlayout.php',
          conversion.payload,
          data.token
        );
      })
      .done(function (result) {
        result.gridScreen = screenNumber;
        deferred.resolve(result);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : _t('conversion_failed');
        alert(message);
        deferred.reject(xhr);
      });
    return deferred.promise();
  }

  function _emptyGridConversion(screenNumber) {
    return {
      empty: true,
      payload: {
        screen: screenNumber,
        gridColumns: 24,
        rowHeight: 20,
        gap: 5,
        mobileLayout: 'stack',
        items: [],
      },
    };
  }

  function _buildColumnGridConversion($screen, screenNumber, allowEmpty) {
    var gridColumns = 24;
    var rowHeight = 20;
    var gap = 5;
    var screenRect = $screen[0].getBoundingClientRect();
    var converted = [];
    var usedReferences = {};
    var error = '';

    $screen
      .find('.row > [data-colindex]')
      .filter(function () {
        return String($(this).attr('data-colindex')) !== 'bar';
      })
      .each(function () {
        if (error) return;
        var $column = $(this);
        var columnKey = String($column.attr('data-colindex'));
        var isStandby = screenNumber === 'standby';
        var sourceColumns = isStandby ? columns_standby : columns;
        var lookupKey =
          isStandby && /^standby/.test(columnKey)
            ? columnKey.replace(/^standby/, '')
            : columnKey;
        var refs =
          sourceColumns &&
          sourceColumns[lookupKey] &&
          Array.isArray(sourceColumns[lookupKey].blocks)
            ? sourceColumns[lookupKey].blocks
            : [];
        var wrappers = $column.children('div[id^="block_"]').toArray();
        if (refs.length !== wrappers.length) {
          error =
            'Conversie gestopt: wacht tot alle blocks geladen zijn en probeer opnieuw.';
          return;
        }

        wrappers.forEach(function (wrapper, index) {
          if (error) return;
          var reference = refs[index];
          var safeReference =
            typeof reference === 'string' &&
            /^[A-Za-z_][A-Za-z0-9_]*$/.test(reference)
              ? reference
              : '';
          var resolved = _resolveBlock(reference);
          var definition =
            safeReference &&
            typeof blocks !== 'undefined' &&
            blocks[safeReference]
              ? blocks[safeReference]
              : reference && typeof reference === 'object'
                ? reference
                : resolved
                  ? resolved.definition
                  : safeReference
                    ? { type: safeReference }
                    : null;
          if (!definition) {
            error = _t('conversion_unrecognized');
            return;
          }
          if (safeReference && usedReferences[safeReference]) {
            error = _t('conversion_duplicate').replace(
              '{block}',
              safeReference
            );
            return;
          }
          if (safeReference) usedReferences[safeReference] = true;

          var rect = _wrapperContentRect(wrapper);
          if (!rect) {
            error = _t('conversion_wait_blocks');
            return;
          }
          var width12 = _configuredWidth(definition, rect.element);
          var width = Math.max(
            1,
            Math.min(
              gridColumns,
              Math.round(
                (rect.width / Math.max(1, screenRect.width)) * gridColumns
              )
            )
          );
          var x = Math.round(
            ((rect.left - screenRect.left) / Math.max(1, screenRect.width)) *
              gridColumns
          );
          x = Math.max(1, Math.min(gridColumns - width + 1, x + 1));
          var height = Math.max(
            1,
            Math.ceil((rect.height + gap) / (rowHeight + gap))
          );
          var position = _firstFreeGridPosition(
            converted,
            x,
            width,
            height,
            gridColumns
          );
          var create = _gridCreateDefinition(
            reference,
            safeReference,
            definition,
            resolved,
            width12,
            rect.height
          );
          if (
            !create &&
            (!safeReference || screenNumber === 'standby')
          ) {
            error = _t('conversion_unsafe').replace(
              '{block}',
              safeReference || index + 1
            );
            return;
          }
          var entry = {
            grid: position,
          };
          if (screenNumber === 'standby') entry.clone = true;
          if (create) entry.create = create;
          if (safeReference) entry.ref = safeReference;
          converted.push(entry);
        });
      });

    if (error) return { error: error };
    if (!converted.length) {
      if (allowEmpty) return _emptyGridConversion(screenNumber);
      return { error: _t('no_blocks_to_convert') };
    }
    return {
      payload: {
        screen: screenNumber,
        gridColumns: gridColumns,
        rowHeight: rowHeight,
        gap: gap,
        mobileLayout: 'stack',
        items: converted,
      },
    };
  }

  function _wrapperContentRect(wrapper) {
    var elements = $(wrapper).children('.mh, .dt_block').toArray();
    if (!elements.length) elements = $(wrapper).children().toArray();
    if (!elements.length) return null;
    var rects = elements.map(function (element) {
      return element.getBoundingClientRect();
    });
    var left = Math.min.apply(
      null,
      rects.map(function (rect) {
        return rect.left;
      })
    );
    var right = Math.max.apply(
      null,
      rects.map(function (rect) {
        return rect.right;
      })
    );
    var top = Math.min.apply(
      null,
      rects.map(function (rect) {
        return rect.top;
      })
    );
    var bottom = Math.max.apply(
      null,
      rects.map(function (rect) {
        return rect.bottom;
      })
    );
    return {
      element: elements[0],
      left: left,
      top: top,
      width: right - left,
      height: bottom - top,
    };
  }

  function _gridCreateDefinition(
    reference,
    safeReference,
    definition,
    resolved,
    width,
    measuredHeight
  ) {
    var rawDeviceReference =
      typeof reference === 'number' ||
      (typeof reference === 'string' &&
        /^\d+(?:_\d+)?$/.test(reference));
    if (resolved && resolved.kind === 'device' && rawDeviceReference) {
      return {
        kind: 'device',
        idx: resolved.idx,
        subidx: resolved.subidx || 0,
        name: resolved.name,
        width: width,
        height: Math.round(measuredHeight),
      };
    }
    if (!_isGridSerializable(definition)) return null;
    var props = JSON.parse(JSON.stringify(definition));
    return {
      kind: 'inline',
      name:
        definition.title ||
        safeReference ||
        definition.type ||
        'Grid block',
      propsJson: JSON.stringify(props),
    };
  }

  function _isGridSerializable(value) {
    if (
      typeof value === 'string' ||
      typeof value === 'boolean'
    ) {
      return true;
    }
    if (typeof value === 'number') return isFinite(value);
    if (typeof value === 'undefined' || typeof value === 'function') {
      return false;
    }
    if (Array.isArray(value)) {
      return value.every(_isGridSerializable);
    }
    if (Object.prototype.toString.call(value) !== '[object Object]') {
      return false;
    }
    return Object.keys(value).every(function (key) {
      return _isGridSerializable(value[key]);
    });
  }

  function _firstFreeGridPosition(items, preferredX, width, height, columns) {
    var x = Math.max(1, Math.min(columns - width + 1, preferredX));
    var y = 1;
    while (y < 10000) {
      var candidate = { x: x, y: y, w: width, h: height };
      var overlaps = items.some(function (item) {
        return _gridPositionsOverlap(candidate, item.grid);
      });
      if (!overlaps) return candidate;
      y++;
    }
    return { x: x, y: 10000, w: width, h: height };
  }

  function _collectItems($managedColumns) {
    items = [];
    itemById = {};
    originalColumns = [];
    var isStandby = _activeScreenTarget() === 'standby';

    $managedColumns.each(function () {
      var $column = $(this);
      var columnKey = String($column.attr('data-colindex'));
      var sourceColumns = isStandby ? columns_standby : columns;
      var lookupKey = columnKey;
      if (
        isStandby &&
        (!sourceColumns || !sourceColumns[lookupKey]) &&
        /^standby/.test(columnKey)
      ) {
        lookupKey = columnKey.replace(/^standby/, '');
      }
      var refs =
        typeof sourceColumns !== 'undefined' &&
        sourceColumns &&
        sourceColumns[lookupKey] &&
        Array.isArray(sourceColumns[lookupKey].blocks)
          ? sourceColumns[lookupKey].blocks
          : [];
      var wrappers = $column.children('div[id^="block_"]').toArray();

      originalColumns.push({
        element: this,
        display: this.style.display,
        wrappers: wrappers.slice(),
      });

      wrappers.forEach(function (wrapper, index) {
        if (typeof refs[index] === 'undefined') return;
        var resolved = _resolveBlock(refs[index]);
        if (!resolved) return;

        var $wrapperChildren = $(wrapper).children();
        var visibleBlocks = $wrapperChildren.filter('.mh, .dt_block').toArray();
        if (!visibleBlocks.length) {
          visibleBlocks = $wrapperChildren.toArray();
        }
        if (!visibleBlocks.length) return;

        var item = {
          id: 'dle-' + items.length,
          wrapper: wrapper,
          visibleBlocks: visibleBlocks,
          idx: resolved.idx,
          subidx: resolved.subidx,
          kind: resolved.kind,
          reference: resolved.reference,
          widgetId: resolved.widgetId,
          definition: resolved.definition,
          name: resolved.name,
          width: _configuredWidth(resolved.definition, visibleBlocks[0]),
          height: _configuredHeight(resolved.definition),
          originalBlocks: visibleBlocks.map(function (block) {
            return {
              block: block,
              widthClass: _widthClass(block),
              height: block.style.getPropertyValue('height'),
              heightPriority: block.style.getPropertyPriority('height'),
              fixedHeight: block.classList.contains('fixedheight'),
            };
          }),
        };

        items.push(item);
        itemById[item.id] = item;
      });
    });
  }

  function _collectGridItems($grid) {
    items = [];
    itemById = {};
    originalColumns = [];
    originalGridWrappers = $grid.children('.dt-grid-item').toArray();
    gridCollectionError = false;

    originalGridWrappers.forEach(function (wrapper) {
      var reference = String(wrapper.getAttribute('data-grid-block') || '');
      if (
        !/^[A-Za-z_][A-Za-z0-9_]*$/.test(reference) ||
        typeof blocks === 'undefined' ||
        !blocks[reference]
      ) {
        gridCollectionError = true;
        return;
      }
      var resolved = _resolveBlock(reference) || {
        definition: blocks[reference],
        kind: 'grid',
        reference: reference,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: blocks[reference].title || reference,
      };

      var $wrapperChildren = $(wrapper).children();
      var visibleBlocks = $wrapperChildren.filter('.mh, .dt_block').toArray();
      if (!visibleBlocks.length) {
        visibleBlocks = $wrapperChildren.toArray();
      }
      if (!visibleBlocks.length) {
        gridCollectionError = true;
        return;
      }

      var position = {
        x: _gridInteger(wrapper, '--dt-grid-x', 1),
        y: _gridInteger(wrapper, '--dt-grid-y', items.length + 1),
        w: _gridInteger(wrapper, '--dt-grid-w', 1),
        h: _gridInteger(wrapper, '--dt-grid-h', 1),
      };
      var item = {
        id: 'dle-' + items.length,
        wrapper: wrapper,
        visibleBlocks: visibleBlocks,
        idx: resolved.idx,
        subidx: resolved.subidx,
        kind: resolved.kind,
        reference: reference,
        widgetId: resolved.widgetId,
        definition: resolved.definition,
        name: resolved.name,
        width: position.w,
        height: null,
        grid: position,
        originalGrid: $.extend({}, position),
        originalBlocks: visibleBlocks.map(function (block) {
          return {
            block: block,
            widthClass: _widthClass(block),
            height: block.style.getPropertyValue('height'),
            heightPriority: block.style.getPropertyPriority('height'),
            fixedHeight: block.classList.contains('fixedheight'),
          };
        }),
      };

      items.push(item);
      itemById[item.id] = item;
    });
  }

  function _gridInteger(element, property, fallback) {
    var value = parseInt(element.style.getPropertyValue(property), 10);
    return value > 0 ? value : fallback;
  }

  function _resolveBlock(ref) {
    var definition = null;
    var key = '';

    if (
      typeof ref === 'string' &&
      typeof blocks !== 'undefined' &&
      blocks[ref]
    ) {
      definition = blocks[ref];
      key = ref;
    } else if (typeof ref === 'object' && ref !== null) {
      definition = ref;
    } else {
      definition = { idx: ref };
    }

    var rawIdx = typeof definition.idx !== 'undefined' ? definition.idx : ref;
    var match = String(rawIdx).match(/^(\d+)(?:_(\d+))?$/);
    if (!match || parseInt(match[1], 10) < 1) {
      var widgetId = _widgetIdFromReference(ref);
      if (!widgetId || !definition) return null;
      return {
        definition: definition,
        kind: 'widget',
        reference: String(ref),
        widgetId: widgetId,
        idx: null,
        subidx: 0,
        name: definition.title || String(ref),
      };
    }

    var idx = parseInt(match[1], 10);
    var subidx = match[2] ? parseInt(match[2], 10) : 0;
    var name = definition.title || '';
    if (!name && typeof Domoticz !== 'undefined') {
      var allDevices = Domoticz.getAllDevices();
      var device = allDevices[String(idx)] || allDevices[idx];
      if (device) name = device.Name || '';
    }
    if (!name) name = key || 'Device ' + idx;
    if (subidx && name.indexOf('(' + subidx + ')') < 0) {
      name += ' (' + subidx + ')';
    }

    return {
      definition: definition,
      kind: 'device',
      reference: key,
      widgetId: null,
      idx: idx,
      subidx: subidx,
      name: name,
    };
  }

  function _widgetIdFromReference(reference) {
    var widgetReferences = {
      widget_weather: 'weather',
      widget_garbage: 'garbage',
      widget_spotify: 'spotify',
      widget_sonarr: 'sonarr',
      widget_clock: 'clock',
      widget_calendar: 'calendar',
      widget_secpanel: 'secpanel',
      widget_publictransport: 'publictransport',
      widget_trafficinfo: 'trafficinfo',
      widget_alarmmeldingen: 'alarmmeldingen',
      widget_cameras: 'camera',
      widget_map: 'map',
      widget_longfonds: 'longfonds',
      widget_moon: 'moon',
      widget_news: 'news',
      widget_xmltvguide: 'xmltvguide',
    };
    return widgetReferences[String(reference)] || null;
  }

  function _copyDefinedWidgetProperties(entry, definition, properties) {
    properties.forEach(function (property) {
      if (typeof definition[property] !== 'undefined') {
        entry[property] = definition[property];
      }
    });
  }

  function _widgetPayload(item) {
    var definition = item.definition || {};
    var entry = {
      id: item.widgetId,
      width: item.width,
    };
    if (item.height !== null) entry.height = item.height;
    if (item.widgetId === 'garbage') {
      entry.displayTitle =
        (
          typeof language !== 'undefined' &&
          language &&
          language.settings &&
          language.settings.widgeteditor &&
          language.settings.widgeteditor.garbage_title
        ) ||
        'Garbage';
      _copyDefinedWidgetProperties(entry, definition, ['maxitems', 'maxdays']);
    }

    if (item.widgetId === 'weather') {
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
    } else if (item.widgetId === 'calendar') {
      entry.icalurl = definition.icalurl || '';
      _copyDefinedWidgetProperties(entry, definition, ['maxitems']);
    } else if (item.widgetId === 'clock') {
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
    } else if (item.widgetId === 'publictransport') {
      entry.station = definition.station || 'UT';
      entry.provider = definition.provider || 'treinen';
    } else if (item.widgetId === 'camera') {
      entry.imageUrl = definition.imageUrl || '';
      if (definition.videoUrl) entry.videoUrl = definition.videoUrl;
    } else if (item.widgetId === 'alarmmeldingen') {
      entry.rss =
        definition.rss || 'https://www.alarmeringen.nl/feeds/all.rss';
      if (definition.filter) entry.filter = definition.filter;
    } else if (item.widgetId === 'xmltvguide') {
      entry.xmltvurl = definition.xmltvurl || settings['xmltv_url'] || '';
      if (Array.isArray(definition.channels)) {
        entry.channels = definition.channels;
      } else if (typeof definition.channels === 'string') {
        entry.channels = definition.channels;
      } else if (typeof settings['xmltv_channels'] === 'string') {
        entry.channels = settings['xmltv_channels'];
      }
      if (definition.maxitems) {
        entry.maxitems = definition.maxitems;
      } else if (typeof settings['xmltv_maxitems'] !== 'undefined') {
        entry.maxitems = settings['xmltv_maxitems'];
      }
      if (typeof definition.layout !== 'undefined') {
        entry.layout = definition.layout;
      } else if (typeof settings['xmltv_layout'] !== 'undefined') {
        entry.layout = settings['xmltv_layout'];
      }
      if (typeof definition.separator === 'string') {
        entry.separator = definition.separator;
      } else if (typeof settings['xmltv_separator'] === 'string') {
        entry.separator = settings['xmltv_separator'];
      }
      if (typeof definition.refresh !== 'undefined') {
        entry.refresh = definition.refresh;
      } else if (typeof settings['xmltv_refresh'] !== 'undefined') {
        entry.refresh = settings['xmltv_refresh'];
      }
    }

    return entry;
  }

  function _configuredWidth(definition, block) {
    var width = parseInt(definition.width, 10);
    if (!(width > 0)) {
      var widthClass = _widthClass(block);
      width = widthClass ? parseInt(widthClass.replace('col-xs-', ''), 10) : 2;
    }
    return Math.max(1, Math.min(12, width));
  }

  function _configuredHeight(definition) {
    if (
      typeof definition.height === 'undefined' ||
      definition.height === null ||
      definition.height === ''
    ) {
      return null;
    }
    return _snapHeight(definition.height);
  }

  function _widthClass(block) {
    var match = String(block.className).match(/(?:^|\s)(col-xs-\d+)(?:\s|$)/);
    return match ? match[1] : '';
  }

  function _prepareCanvas($managedColumns) {
    $canvas = $managedColumns.first().addClass('dle-canvas');

    items.forEach(function (item) {
      item.wrapper.classList.add('dle-item-wrapper');
      item.wrapper.style.setProperty('--dle-column-span', item.width);
      $canvas.append(item.wrapper);
    });

    $managedColumns.each(function (index) {
      if (index > 0) this.style.display = 'none';
    });
  }

  function _prepareGridCanvas($grid) {
    $canvas = $grid.addClass('dle-grid-canvas');
    $editingScreen.addClass('dle-grid-screen-editing');
    gridConfig = {
      gridColumns: _gridCssNumber($grid[0], '--dt-grid-columns', 24),
      rowHeight: _gridCssNumber($grid[0], '--dt-grid-row-height', 20),
      gap: _gridCssNumber($grid[0], '--dt-grid-gap', 0, true),
      mobileLayout: $grid.hasClass('dt-grid-mobile-stack') ? 'stack' : 'stack',
    };
    $grid[0].style.setProperty(
      '--dle-grid-column-stride',
      ($grid.innerWidth() + gridConfig.gap) / gridConfig.gridColumns + 'px'
    );
    items.forEach(function (item) {
      item.wrapper.classList.add('dle-item-wrapper');
      var minimumHeight = _minimumGridHeight(item);
      // Normalize legacy one-cell blocks when editing. Cancel still restores
      // originalGrid, while Save persists the safe minimum dimensions.
      if (item.grid.w < MIN_GRID_WIDTH || item.grid.h < minimumHeight) {
        item.grid = {
          x: Math.min(
            item.grid.x,
            Math.max(1, gridConfig.gridColumns - MIN_GRID_WIDTH + 1)
          ),
          y: item.grid.y,
          w: Math.min(
            gridConfig.gridColumns,
            Math.max(MIN_GRID_WIDTH, item.grid.w)
          ),
          h: Math.max(minimumHeight, item.grid.h),
        };
        item.width = item.grid.w;
        DashticzGridLayout.applyGridPosition(item.wrapper, item.grid);
      }
    });
    var occupiedRows = items.reduce(function (highest, item) {
      return Math.max(highest, item.grid.y + item.grid.h - 1);
    }, 1);
    var viewportRows = Math.ceil(
      Math.max(0, window.innerHeight - $grid[0].getBoundingClientRect().top) /
        (gridConfig.rowHeight + gridConfig.gap)
    );
    _ensureGridCanvasRows(Math.max(occupiedRows + 10, viewportRows + 6));
    _refreshGridOverlaps();
  }

  function _gridCssNumber(element, property, fallback, allowZero) {
    var value = parseFloat(
      getComputedStyle(element).getPropertyValue(property)
    );
    if (!isFinite(value) || (allowZero ? value < 0 : value <= 0)) {
      return fallback;
    }
    return value;
  }

  function _ensureGridCanvasRows(rows) {
    var requested = Math.max(1, Math.min(10000, Math.ceil(rows)));
    if (requested <= gridEditorRows) return;
    gridEditorRows = requested;
    var height =
      gridEditorRows * gridConfig.rowHeight +
      Math.max(0, gridEditorRows - 1) * gridConfig.gap;
    $canvas[0].style.setProperty(
      '--dle-grid-editor-min-height',
      height + 'px'
    );
  }

  function _decorateItems() {
    items.forEach(function (item) {
      if (!gridMode && item.height !== null) _applyHeight(item, item.height);

      item.visibleBlocks.forEach(function (block, index) {
        var $block = $(block).addClass('dle-block');
        var removeButton =
          index === 0
            ? '<button type="button" class="dle-remove-button" title="' +
              _escapeHtml(_t('remove_title')) +
              '" aria-label="' +
              _escapeHtml(_t('remove_aria')) +
              ' ' +
              _escapeHtml(item.name) +
              '"><i class="fas fa-minus" aria-hidden="true"></i></button>'
            : '';
        var resizeHandle =
          index === item.visibleBlocks.length - 1
            ? '<span class="dle-resize-handle" title="' +
              _escapeHtml(_t('resize_title')) +
              '" aria-hidden="true"></span>'
            : '';
        var overlay =
          '<div class="dle-overlay" data-dle-id="' +
          item.id +
          '">' +
          '<span class="dle-drag-icon" aria-hidden="true"><i class="fas fa-arrows-alt"></i></span>' +
          '<span class="dle-size-label"></span>' +
          removeButton +
          resizeHandle +
          '</div>';
        $block.append(overlay);
      });

      _updateSizeLabel(item);
    });
  }

  function _buildToolbar() {
    var help = gridMode ? _t('help_grid') : _t('help_columns');
    $toolbar = $(
      '<div class="dle-toolbar" role="toolbar" aria-label="' +
        _escapeHtml(_t('toolbar_aria')) +
        '">' +
        '<span class="dle-toolbar-title"><i class="fas fa-arrows-alt" aria-hidden="true"></i> ' +
        _escapeHtml(_t('title')) +
        '</span>' +
        '<span class="dle-toolbar-help">' +
        help +
        '</span>' +
        '<button type="button" class="btn btn-secondary btn-sm dle-cancel">' +
        _escapeHtml(_t('cancel')) +
        '</button>' +
        '<button type="button" class="btn btn-primary btn-sm dle-save">' +
        _escapeHtml(_t('save')) +
        '</button>' +
        '</div>'
    );
    $('body').append($toolbar);
  }

  function _attachHandlers() {
    $('.dle-overlay')
      .off('.layouteditor')
      .on('click.layouteditor', function (event) {
        event.preventDefault();
        event.stopPropagation();
        if ($(event.target).closest('.dle-remove-button').length) {
          var item = itemById[String($(this).data('dle-id'))];
          if (item) _removeItem(item);
        }
      })
      .on('pointerdown.layouteditor', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var item = itemById[String($(this).data('dle-id'))];
        if (!item) return;
        if ($(event.target).closest('.dle-remove-button').length) return;
        if ($(event.target).closest('.dle-resize-handle').length) {
          _startResize(event, item, $canvas[0]);
        } else {
          _startDrag(event, item, $canvas[0]);
        }
      });

    $(document)
      .off('.layouteditor')
      .on('pointermove.layouteditor', _pointerMove)
      .on('pointerup.layouteditor pointercancel.layouteditor', _pointerEnd)
      .on('keydown.layouteditor', function (event) {
        if (event.key === 'Escape') _cancel();
      });

    $toolbar
      .on('click.layouteditor', '.dle-cancel', _cancel)
      .on('click.layouteditor', '.dle-save', _save);
  }

  function _removeItem(item) {
    if (pointerState && pointerState.item === item) {
      _finishPointerAction();
    }
    if (item.wrapper.parentNode) {
      item.wrapper.parentNode.removeChild(item.wrapper);
    }
    if (gridMode) _refreshGridOverlaps();

    var remaining = _orderedItems().length;
    $toolbar
      .find('.dle-toolbar-help')
      .text(
        remaining
          ? _t('removed_one')
          : _t('removed_all')
      );
  }

  function _startDrag(event, item, captureElement) {
    var itemRect = item.wrapper.getBoundingClientRect();
    pointerState = {
      mode: 'drag',
      pointerId: event.originalEvent.pointerId,
      item: item,
      startX: event.originalEvent.clientX,
      startY: event.originalEvent.clientY,
      offsetX: event.originalEvent.clientX - itemRect.left,
      offsetY: event.originalEvent.clientY - itemRect.top,
      moved: false,
      captureElement: captureElement,
    };

    if (captureElement.setPointerCapture) {
      try {
        captureElement.setPointerCapture(pointerState.pointerId);
      } catch (error) {
        // Pointer capture is optional; document-level handlers remain active.
      }
    }

    item.visibleBlocks.forEach(function (block) {
      block.classList.add('dle-dragging');
    });

    $('body').append(
      '<div class="dle-drag-ghost">' + _escapeHtml(item.name) + '</div>'
    );
    _positionGhost(event.originalEvent.clientX, event.originalEvent.clientY);
  }

  function _startResize(event, item, captureElement) {
    var rect = item.visibleBlocks[0].getBoundingClientRect();
    pointerState = {
      mode: 'resize',
      pointerId: event.originalEvent.pointerId,
      item: item,
      startX: event.originalEvent.clientX,
      startY: event.originalEvent.clientY,
      startWidth: item.width,
      startHeight: item.height !== null ? item.height : rect.height,
      startGrid: gridMode ? $.extend({}, item.grid) : null,
      captureElement: captureElement,
    };

    if (captureElement.setPointerCapture) {
      try {
        captureElement.setPointerCapture(pointerState.pointerId);
      } catch (error) {
        // Pointer capture is optional; document-level handlers remain active.
      }
    }
  }

  function _pointerMove(event) {
    if (
      !pointerState ||
      event.originalEvent.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    event.preventDefault();
    var clientX = event.originalEvent.clientX;
    var clientY = event.originalEvent.clientY;
    lastPointerPosition = { x: clientX, y: clientY };
    if (gridMode) _updateEdgeScroll(clientY);

    if (pointerState.mode === 'resize') {
      if (gridMode) {
        _resizeGridItem(pointerState.item, clientX, clientY);
        _updateSizeLabel(pointerState.item);
        return;
      }
      var unitWidth = Math.max(1, $canvas.innerWidth() / 12);
      var deltaWidth = Math.round((clientX - pointerState.startX) / unitWidth);
      var width = Math.max(
        1,
        Math.min(12, pointerState.startWidth + deltaWidth)
      );
      var height = _snapHeight(
        pointerState.startHeight + clientY - pointerState.startY
      );

      _applyWidth(pointerState.item, width);
      _applyHeight(pointerState.item, height);
      _updateSizeLabel(pointerState.item);
      return;
    }

    _positionGhost(clientX, clientY);
    var distanceX = clientX - pointerState.startX;
    var distanceY = clientY - pointerState.startY;
    if (
      !pointerState.moved &&
      distanceX * distanceX + distanceY * distanceY < 36
    ) {
      return;
    }

    pointerState.moved = true;
    if (gridMode) {
      _moveGridItem(pointerState.item, clientX, clientY);
    } else {
      _moveDraggedItem(pointerState.item, clientX, clientY);
    }
  }

  function _pointerEnd(event) {
    if (
      !pointerState ||
      event.originalEvent.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    _finishPointerAction();
  }

  function _moveDraggedItem(item, clientX, clientY) {
    var candidates = _orderedItems().filter(function (candidate) {
      return candidate !== item;
    });
    var rows = [];

    candidates.forEach(function (candidate) {
      var rect = candidate.visibleBlocks[0].getBoundingClientRect();
      var row = rows.length ? rows[rows.length - 1] : null;
      if (!row || Math.abs(rect.top - row.top) > 15) {
        row = {
          top: rect.top,
          bottom: rect.bottom,
          items: [],
        };
        rows.push(row);
      }
      row.bottom = Math.max(row.bottom, rect.bottom);
      row.items.push({ item: candidate, rect: rect });
    });

    var reference = null;
    for (var rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      var row = rows[rowIndex];
      if (clientY > row.bottom) continue;

      if (clientY < row.top) {
        reference = row.items[0].item.wrapper;
        break;
      }

      for (var itemIndex = 0; itemIndex < row.items.length; itemIndex++) {
        var rowItem = row.items[itemIndex];
        if (clientX < rowItem.rect.left + rowItem.rect.width / 2) {
          reference = rowItem.item.wrapper;
          break;
        }
      }

      if (!reference && rowIndex + 1 < rows.length) {
        reference = rows[rowIndex + 1].items[0].item.wrapper;
      }
      break;
    }

    if (reference) {
      if (item.wrapper.nextSibling !== reference) {
        reference.parentNode.insertBefore(item.wrapper, reference);
      }
    } else if (item.wrapper !== $canvas[0].lastElementChild) {
      $canvas[0].appendChild(item.wrapper);
    }
  }

  function _gridMetrics() {
    var rect = $canvas[0].getBoundingClientRect();
    var columns = Math.max(1, parseInt(gridConfig.gridColumns, 10) || 24);
    var gap = Math.max(0, parseFloat(gridConfig.gap) || 0);
    var cellWidth = Math.max(
      1,
      (rect.width - gap * (columns - 1)) / columns
    );
    var rowHeight = Math.max(1, parseFloat(gridConfig.rowHeight) || 20);
    return {
      rect: rect,
      columns: columns,
      columnStride: cellWidth + gap,
      rowStride: rowHeight + gap,
    };
  }

  function _moveGridItem(item, clientX, clientY) {
    var metrics = _gridMetrics();
    var x =
      Math.round(
        (clientX - metrics.rect.left - pointerState.offsetX) /
          metrics.columnStride
      ) + 1;
    var y =
      Math.round(
        (clientY - metrics.rect.top - pointerState.offsetY) /
          metrics.rowStride
      ) + 1;
    x = Math.max(1, Math.min(metrics.columns - item.grid.w + 1, x));
    y = Math.max(1, y);
    _ensureGridCanvasRows(y + item.grid.h + 8);
    _applyGridPosition(item, {
      x: x,
      y: y,
      w: item.grid.w,
      h: item.grid.h,
    });
    _updateSizeLabel(item);
  }

  function _resizeGridItem(item, clientX, clientY) {
    var metrics = _gridMetrics();
    var start = pointerState.startGrid;
    var x = Math.min(
      start.x,
      Math.max(1, metrics.columns - MIN_GRID_WIDTH + 1)
    );
    var width =
      start.w +
      Math.round((clientX - pointerState.startX) / metrics.columnStride);
    var height =
      start.h +
      Math.round((clientY - pointerState.startY) / metrics.rowStride);
    // Grid blocks must remain large enough to expose their editor controls.
    width = Math.max(
      MIN_GRID_WIDTH,
      Math.min(metrics.columns - x + 1, width)
    );
    height = Math.max(_minimumGridHeight(item), Math.min(1000, height));
    _ensureGridCanvasRows(start.y + height + 8);
    _applyGridPosition(item, {
      x: x,
      y: start.y,
      w: width,
      h: height,
    });
  }

  function _applyGridPosition(item, position) {
    item.grid = position;
    item.width = position.w;
    DashticzGridLayout.applyGridPosition(item.wrapper, position);
    _refreshGridOverlaps();
  }

  function _refreshGridOverlaps() {
    items.forEach(function (item) {
      item.wrapper.classList.remove('dt-grid-overlap');
    });
    var activeItems = _orderedItems();
    for (var i = 0; i < activeItems.length; i++) {
      for (var j = i + 1; j < activeItems.length; j++) {
        if (_gridPositionsOverlap(activeItems[i].grid, activeItems[j].grid)) {
          activeItems[i].wrapper.classList.add('dt-grid-overlap');
          activeItems[j].wrapper.classList.add('dt-grid-overlap');
        }
      }
    }
  }

  function _gridPositionsOverlap(left, right) {
    return (
      left.x < right.x + right.w &&
      left.x + left.w > right.x &&
      left.y < right.y + right.h &&
      left.y + left.h > right.y
    );
  }

  function _updateEdgeScroll(clientY) {
    var threshold = 70;
    if (clientY < threshold) {
      edgeScrollDirection = -1;
    } else if (clientY > window.innerHeight - threshold) {
      edgeScrollDirection = 1;
    } else {
      edgeScrollDirection = 0;
    }
    if (edgeScrollDirection && edgeScrollFrame === null) {
      edgeScrollFrame = requestAnimationFrame(_edgeScrollTick);
    }
  }

  function _edgeScrollTick() {
    edgeScrollFrame = null;
    if (
      !gridMode ||
      !pointerState ||
      !edgeScrollDirection ||
      !$editingScreen ||
      !$editingScreen.length
    ) {
      return;
    }

    var element = $editingScreen[0];
    var previous = element.scrollTop;
    element.scrollTop += edgeScrollDirection * 18;
    if (element.scrollTop !== previous && lastPointerPosition) {
      if (pointerState.mode === 'resize') {
        _resizeGridItem(
          pointerState.item,
          lastPointerPosition.x,
          lastPointerPosition.y
        );
      } else {
        _moveGridItem(
          pointerState.item,
          lastPointerPosition.x,
          lastPointerPosition.y
        );
      }
      edgeScrollFrame = requestAnimationFrame(_edgeScrollTick);
    }
  }

  function _stopEdgeScroll() {
    edgeScrollDirection = 0;
    lastPointerPosition = null;
    if (edgeScrollFrame !== null) {
      cancelAnimationFrame(edgeScrollFrame);
      edgeScrollFrame = null;
    }
  }

  function _finishPointerAction() {
    if (!pointerState) return;
    _stopEdgeScroll();
    if (
      pointerState.captureElement &&
      pointerState.captureElement.releasePointerCapture
    ) {
      try {
        pointerState.captureElement.releasePointerCapture(
          pointerState.pointerId
        );
      } catch (error) {
        // The browser already released capture.
      }
    }

    pointerState.item.visibleBlocks.forEach(function (block) {
      block.classList.remove('dle-dragging');
    });
    $('.dle-drag-ghost').remove();
    pointerState = null;
  }

  function _positionGhost(x, y) {
    $('.dle-drag-ghost').css({
      left: x + 14,
      top: y + 14,
    });
  }

  function _applyWidth(item, width) {
    item.width = Math.max(1, Math.min(12, parseInt(width, 10) || 1));
    item.wrapper.style.setProperty('--dle-column-span', item.width);
    item.visibleBlocks.forEach(function (block) {
      Array.prototype.slice.call(block.classList).forEach(function (className) {
        if (/^col-xs-\d+$/.test(className)) block.classList.remove(className);
      });
      block.classList.add('col-xs-' + item.width);
    });
  }

  function _applyHeight(item, height) {
    item.height = _snapHeight(height);
    item.visibleBlocks.forEach(function (block) {
      block.classList.add('fixedheight');
      block.style.setProperty('height', item.height + 'px', 'important');
    });
  }

  function _snapHeight(height) {
    var parsed = parseFloat(height);
    if (!isFinite(parsed)) parsed = MIN_HEIGHT;
    return Math.max(
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, Math.round(parsed / HEIGHT_STEP) * HEIGHT_STEP)
    );
  }

  function _updateSizeLabel(item) {
    if (gridMode) {
      item.visibleBlocks.forEach(function (block) {
        $(block)
          .children('.dle-overlay')
          .find('.dle-size-label')
          .text(
            'x' +
              item.grid.x +
              ' y' +
              item.grid.y +
              ' · ' +
              item.grid.w +
              '×' +
              item.grid.h
          );
      });
      return;
    }
    var measuredHeight = Math.round(
      item.visibleBlocks[0].getBoundingClientRect().height
    );
    var heightLabel =
      item.height === null
        ? _t('auto_height') + ' (' + measuredHeight + 'px)'
        : item.height + 'px';
    item.visibleBlocks.forEach(function (block) {
      $(block)
        .children('.dle-overlay')
        .find('.dle-size-label')
        .text(item.width + '/12 × ' + heightLabel);
    });
  }

  function _orderedItems() {
    var byWrapper = {};
    items.forEach(function (item) {
      byWrapper[item.wrapper.id] = item;
    });

    return $canvas
      .children('div[id^="block_"]')
      .toArray()
      .map(function (wrapper) {
        return byWrapper[wrapper.id];
      })
      .filter(function (item) {
        return !!item;
      });
  }

  function _activeScreenNumber() {
    return _activeScreenPayload();
  }

  function _save() {
    if (gridMode) {
      _saveGrid();
      return;
    }
    var $save = $toolbar.find('.dle-save').prop('disabled', true);
    $toolbar.find('.dle-cancel').prop('disabled', true);
    $toolbar.find('.dle-toolbar-help').text(_t('saving_layout'));

    var ordered = _orderedItems();
    var devices = [];
    var widgets = [];
    ordered.forEach(function (item) {
      if (item.kind === 'widget') {
        widgets.push(_widgetPayload(item));
        return;
      }

      var deviceEntry = {
        idx: item.idx,
        name: item.name,
        width: item.width,
      };
      if (item.subidx) deviceEntry.subidx = item.subidx;
      if (item.height !== null) deviceEntry.height = item.height;
      devices.push(deviceEntry);
    });

    var screenNumber = _activeScreenPayload();

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postLayoutData(
          'js/saveblocks.php',
          { devices: devices, screen: screenNumber },
          token
        ).then(function (deviceResult) {
          return _postLayoutData(
            'js/savewidgets.php',
            { widgets: widgets, screen: screenNumber },
            token
          ).then(function (widgetResult) {
            var deviceIndex = 0;
            var widgetIndex = 0;
            var layoutItems = ordered.map(function (item) {
              var ref =
                item.kind === 'widget'
                  ? widgetResult.blockKeys[widgetIndex++]
                  : deviceResult.blockKeys[deviceIndex++];
              var entry = { ref: ref, width: item.width };
              if (item.height !== null) entry.height = item.height;
              return entry;
            });
            return _postLayoutData(
              'js/savelayout.php',
              { items: layoutItems, screen: screenNumber },
              token
            );
          });
        });
      })
      .done(function () {
        $toolbar.find('.dle-toolbar-help').text(_t('saved_reloading'));
        $save.removeClass('btn-primary').addClass('btn-success').text(_t('saved'));
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : _t('save_failed');
        $toolbar.find('.dle-toolbar-help').text(message);
        $save.prop('disabled', false);
        $toolbar.find('.dle-cancel').prop('disabled', false);
      });
  }

  function _saveGrid() {
    var $save = $toolbar.find('.dle-save').prop('disabled', true);
    $toolbar.find('.dle-cancel').prop('disabled', true);
    $toolbar.find('.dle-toolbar-help').text(_t('saving_grid'));

    var payload = {
      screen: editingScreen,
      gridColumns: gridConfig.gridColumns,
      rowHeight: gridConfig.rowHeight,
      gap: gridConfig.gap,
      mobileLayout: gridConfig.mobileLayout,
      items: _orderedItems().map(function (item) {
        return {
          ref: item.reference,
          grid: $.extend({}, item.grid),
        };
      }),
    };

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return _postLayoutData('js/savegridlayout.php', payload, data.token);
      })
      .done(function () {
        $toolbar.find('.dle-toolbar-help').text(_t('saved_reloading'));
        $save.removeClass('btn-primary').addClass('btn-success').text(_t('saved'));
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : _t('grid_save_failed');
        $toolbar.find('.dle-toolbar-help').text(message);
        $save.prop('disabled', false);
        $toolbar.find('.dle-cancel').prop('disabled', false);
      });
  }

  function _postLayoutData(url, payload, token) {
    return $.ajax({
      url: configEditorUrl(url),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      dataType: 'json',
      headers: { 'X-Dashticz-CSRF': token },
    });
  }

  function _cancel() {
    if (!active) return;
    _finishPointerAction();

    $(document).off('.layouteditor');
    if (gridMode && $canvas) {
      originalGridWrappers.forEach(function (wrapper) {
        $canvas[0].appendChild(wrapper);
      });
    }

    items.forEach(function (item) {
      $(item.visibleBlocks)
        .children('.dle-overlay')
        .off('.layouteditor')
        .remove();
      item.wrapper.classList.remove('dle-item-wrapper');
      item.wrapper.style.removeProperty('--dle-column-span');
      if (gridMode) {
        item.grid = $.extend({}, item.originalGrid);
        DashticzGridLayout.applyGridPosition(
          item.wrapper,
          item.grid
        );
      }
      item.originalBlocks.forEach(function (original) {
        var block = original.block;
        block.classList.remove(
          'dle-block',
          'dle-dragging',
          'dle-drop-before',
          'dle-drop-after'
        );
        Array.prototype.slice
          .call(block.classList)
          .forEach(function (className) {
            if (/^col-xs-\d+$/.test(className))
              block.classList.remove(className);
          });
        if (original.widthClass) block.classList.add(original.widthClass);

        if (original.height) {
          block.style.setProperty(
            'height',
            original.height,
            original.heightPriority
          );
        } else {
          block.style.removeProperty('height');
        }
        if (!original.fixedHeight) block.classList.remove('fixedheight');
      });
    });

    // A Domoticz refresh can replace a tile while the editor is active. The
    // reference transfer above handles the normal path; this screen-level
    // cleanup is a final safeguard against controls left on a refreshed tile.
    if ($editingScreen && $editingScreen.length) {
      $editingScreen
        .find('.dle-overlay')
        .off('.layouteditor')
        .remove();
      $editingScreen
        .find('.dle-block, .dle-dragging, .dle-drop-before, .dle-drop-after')
        .removeClass(
          'dle-block dle-dragging dle-drop-before dle-drop-after'
        );
    }

    originalColumns.forEach(function (column) {
      column.wrappers.forEach(function (wrapper) {
        column.element.appendChild(wrapper);
      });
      column.element.style.display = column.display;
    });

    if (gridMode) _refreshGridOverlaps();
    if ($canvas) $canvas.removeClass('dle-canvas');
    if ($canvas) $canvas.removeClass('dle-grid-canvas');
    if ($canvas) $canvas[0].style.removeProperty('--dle-grid-column-stride');
    if ($canvas) $canvas[0].style.removeProperty('--dle-grid-editor-min-height');
    if ($editingScreen) $editingScreen.removeClass('dle-grid-screen-editing');
    if ($toolbar) $toolbar.remove();
    $('.dle-drag-ghost').remove();
    $('body').removeClass('dle-active');

    if (
      typeof myswiper !== 'undefined' &&
      myswiper &&
      swiperTouchMove !== null
    ) {
      myswiper.allowTouchMove = swiperTouchMove;
    }

    active = false;
    items = [];
    itemById = {};
    originalColumns = [];
    $canvas = null;
    $toolbar = null;
    pointerState = null;
    swiperTouchMove = null;
    gridMode = false;
    gridConfig = null;
    originalGridWrappers = [];
    gridCollectionError = false;
    editingScreen = null;
    $editingScreen = null;
    gridEditorRows = 0;
    _stopEdgeScroll();
  }

  function replaceBlockReference(oldBlock, newBlock) {
    if (!active || !oldBlock || !newBlock || oldBlock === newBlock) return;

    items.forEach(function (item) {
      var replaced = false;

      item.visibleBlocks = item.visibleBlocks.map(function (block) {
        if (block !== oldBlock) return block;
        replaced = true;
        return newBlock;
      });

      item.originalBlocks.forEach(function (original) {
        if (original.block === oldBlock) original.block = newBlock;
      });

      if (!replaced) return;

      newBlock.classList.add('dle-block');
      if (!gridMode) {
        _applyWidth(item, item.width);
        if (item.height !== null) _applyHeight(item, item.height);
      }
      _updateSizeLabel(item);
    });
  }

  function _escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    open: open,
    convertCurrentScreenToGrid: convertCurrentScreenToGrid,
    replaceBlockReference: replaceBlockReference,
  };
})();

//# sourceURL=js/layouteditor.js
