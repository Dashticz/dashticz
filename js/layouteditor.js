/* global Domoticz settings columns columns_standby blocks myswiper Dashticz DashticzGridLayout DashticzScreenSwitcher DashticzDeviceEditor DashticzWidgetEditor DT_function isCustomConfigMode standbyActive language */
// eslint-disable-next-line no-unused-vars
var DashticzLayoutEditor = (function () {
  'use strict';

  var HEIGHT_STEP = 10;
  var MIN_HEIGHT = 50;
  var MAX_HEIGHT = 2000;
  var MIN_GRID_WIDTH = 2;
  // Lowered from 4 to 2 rows: the editor overlay's controls (drag/config/
  // remove/resize handles) already rely on `overflow: visible` to stay
  // clickable on a very small item (see .dt-grid-layout.dle-grid-canvas >
  // .dt-grid-item in creative.css), and 2 rows was already proven safe for
  // miniclock. A block whose actual content needs more room than 2 rows
  // simply gets its existing internal scrollbar (.dt-grid-item's own
  // `overflow: auto`), the same as picking any other too-small height.
  var MIN_GRID_HEIGHT = 2;
  var MIN_TITLE_GRID_HEIGHT = 2;
  // Every managedSpecials kind _resolveBlock() recognizes above,
  // identified purely by their own block reference - 'device' and
  // 'widget' (handled separately at each call site below) are not part
  // of this set. Shared by _decorateItem()'s isConfigurable check and
  // _openItemConfig()'s dispatch below, so adding another repeatable
  // special (see js/deviceeditor.js's iFrame/Calendar/Public transport/
  // Timegraph/TV Guide additions for the pattern) touches this one array
  // instead of two separately hand-duplicated `item.kind === 'x' || ...`
  // chains.
  var REFERENCE_BASED_SPECIAL_KINDS = [
    'separator',
    'html',
    'iframe',
    'calendar',
    'publictransport',
    'timegraph',
    'xmltvguide',
    'lms',
    'group',
  ];
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
  // Multi-screen editing: one session per screen visited during this
  // editing round (see _captureSession/_restoreSession/_onScreenNavigated).
  var sessions = {};
  var currentSessionKey = null;
  // Counter for synthetic reference keys handed to brand-new, not-yet-saved
  // items (see addPendingItems). Never reset - a monotonic counter across
  // the page's lifetime can't collide with itself.
  var pendingKeyCounter = 0;

  function _translations() {
    return (
      (typeof language !== 'undefined' &&
        language.settings &&
        language.settings.layouteditor) ||
      {}
    );
  }

  function _t(key, fallback) {
    return _translations()[key] || fallback || '';
  }

  function _minimumGridHeight(item) {
    var type =
      item && item.definition
        ? String(item.definition.type || '').toLowerCase()
        : '';
    // Keep the title-specific constant so its limit remains explicit, even
    // though separators now use the same two-row floor as other blocks.
    if (type === 'blocktitle') return MIN_TITLE_GRID_HEIGHT;
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
      /* An empty grid is a valid Wizard starting point. Only fail when a
         rendered grid item cannot be mapped back to a safe block definition. */
      if (gridCollectionError) {
        alert(_t('invalid_grid_blocks'));
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
      _finishActivation();
      return;
    }
    if (typeof isCustomConfigMode === 'function' && !isCustomConfigMode()) {
      /* Wizard mode must also be able to bootstrap a completely empty screen. */
      convertCurrentScreenToGrid(false, 'wizard').done(function () {
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

    var managedColumnRe =
      /^(de|we|le)_s\d+_col\d+$|^(de|we|le)_col\d+$|^col_\d+$/;
    var isStandby = _activeScreenTarget() === 'standby';
    var $managedColumns = $screen.find('[data-colindex]').filter(function () {
      var key = String($(this).attr('data-colindex'));
      if (isStandby) return true;
      return managedColumnRe.test(key);
    });

    if (!$managedColumns.length) {
      alert(_t('no_editable_screen'));
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
    _finishActivation();
  }

  function _disableSwiper() {
    if (typeof myswiper !== 'undefined' && myswiper) {
      swiperTouchMove = myswiper.allowTouchMove;
      myswiper.allowTouchMove = false;
    }
  }

  /* Marks the freshly activated screen as this editing round's first
     session and starts watching for screen navigation, so switching to
     another screen (topbar S/1/2/... buttons, which keep working while
     the toolbar is open) brings that screen into the same editing round
     too, instead of leaving it un-editable underneath the still-open
     toolbar. See _onScreenNavigated. */
  function _finishActivation() {
    _disableSwiper();
    currentSessionKey = String(editingScreen);
    sessions[currentSessionKey] = _captureSession();
    _bindScreenNavigation();
  }

  function _captureSession() {
    return {
      screenNumber: editingScreen,
      gridMode: gridMode,
      items: items,
      itemById: itemById,
      originalColumns: originalColumns,
      originalGridWrappers: originalGridWrappers,
      gridConfig: gridConfig,
      gridEditorRows: gridEditorRows,
      $canvas: $canvas,
      $editingScreen: $editingScreen,
    };
  }

  function _restoreSession(session) {
    editingScreen = session.screenNumber;
    gridMode = session.gridMode;
    items = session.items;
    itemById = session.itemById;
    originalColumns = session.originalColumns;
    originalGridWrappers = session.originalGridWrappers;
    gridConfig = session.gridConfig;
    gridEditorRows = session.gridEditorRows;
    $canvas = session.$canvas;
    $editingScreen = session.$editingScreen;
  }

  function _bindScreenNavigation() {
    if (typeof myswiper !== 'undefined' && myswiper) {
      myswiper.off('slideChange', _onScreenNavigated);
      myswiper.off('transitionEnd', _onScreenNavigated);
      myswiper.on('slideChange', _onScreenNavigated);
      myswiper.on('transitionEnd', _onScreenNavigated);
    }
    $(document)
      .off('click.layouteditorscreen')
      .on('click.layouteditorscreen', '.dt-screen-btn', function () {
        var target = String($(this).data('screen') || '');
        // 'add'/'delete' restructure the screen list itself and already
        // reload the page on success; nothing to hand off to here.
        if (target === 'add' || target === 'delete') return;
        _onScreenNavigated();
      });
  }

  function _unbindScreenNavigation() {
    if (typeof myswiper !== 'undefined' && myswiper) {
      myswiper.off('slideChange', _onScreenNavigated);
      myswiper.off('transitionEnd', _onScreenNavigated);
    }
    $(document).off('click.layouteditorscreen');
  }

  function _onScreenNavigated() {
    if (!active || pointerState) return;
    var $screen = _activeScreenDom();
    if (!$screen.length) return;
    var targetKey = String(_activeScreenPayload());
    if (targetKey === currentSessionKey) return;
    _switchActiveScreen(targetKey, $screen);
  }

  function _switchActiveScreen(targetKey, $screen) {
    var previousKey = currentSessionKey;
    sessions[previousKey] = _captureSession();

    var existing = sessions[targetKey];
    if (existing) {
      _restoreSession(existing);
      currentSessionKey = targetKey;
      _refreshToolbarHelp();
      return;
    }

    if (_initializeScreenSession(targetKey, $screen)) {
      _refreshToolbarHelp();
      return;
    }

    /* Screen isn't editable here (see _initializeScreenSession) - stay on
       the previous screen's session so Save/Cancel keep working; only the
       toolbar hint reflects the screen currently on display. */
    _restoreSession(sessions[previousKey]);
    currentSessionKey = previousKey;
  }

  function _refreshToolbarHelp() {
    if (!$toolbar) return;
    $toolbar
      .find('.dle-toolbar-help')
      .text(gridMode ? _t('help_grid') : _t('help_columns'));
  }

  function _showScreenUnavailable(message) {
    if ($toolbar) $toolbar.find('.dle-toolbar-help').text(message);
  }

  /* Collects and decorates a screen visited for the first time in this
     editing round. Mirrors open()'s own setup, but - unlike open() -
     never falls back to the Wizard grid-conversion flow
     (convertCurrentScreenToGrid): that flow needs its own network round
     trip and a full page reload, which would silently discard any edits
     already pending on other screens in this round. Such a screen is
     simply left out of the multi-screen edit; the user can still switch
     back to any screen that did initialize successfully. */
  function _initializeScreenSession(targetKey, $screen) {
    var payload = targetKey === 'standby' ? 'standby' : parseInt(targetKey, 10);
    editingScreen = payload;
    $editingScreen = $screen;
    gridMode = $screen.hasClass('dt-grid-screen');

    if (gridMode) {
      var $grid = $screen.children('.dt-grid-layout').first();
      _collectGridItems($grid);
      if (gridCollectionError) {
        gridCollectionError = false;
        _showScreenUnavailable(_t('invalid_grid_blocks'));
        return false;
      }
      _prepareGridCanvas($grid);
      _decorateItems();
      currentSessionKey = targetKey;
      sessions[targetKey] = _captureSession();
      _attachHandlers();
      return true;
    }

    if (typeof isCustomConfigMode === 'function' && !isCustomConfigMode()) {
      _showScreenUnavailable(_t('no_editable_screen'));
      return false;
    }

    var managedColumnRe =
      /^(de|we|le)_s\d+_col\d+$|^(de|we|le)_col\d+$|^col_\d+$/;
    var isStandby = targetKey === 'standby';
    var $managedColumns = $screen.find('[data-colindex]').filter(function () {
      var key = String($(this).attr('data-colindex'));
      if (isStandby) return true;
      return managedColumnRe.test(key);
    });

    if (!$managedColumns.length) {
      _showScreenUnavailable(_t('no_editable_screen'));
      return false;
    }

    _collectItems($managedColumns);
    if (!items.length) {
      _showScreenUnavailable(_t('no_editable_items'));
      return false;
    }

    _prepareCanvas($managedColumns);
    _decorateItems();
    currentSessionKey = targetKey;
    sessions[targetKey] = _captureSession();
    _attachHandlers();
    return true;
  }

  /* Grafts brand-new devices/widgets/separators (picked from the topbar's
     "Add items" menu while this editor is open) straight into the current
     screen's session, as pending unsaved tiles - instead of the Add
     popup's own Save persisting them immediately and reloading the page,
     which used to close this editor and drop whatever was still pending
     here (moves, resizes, removed tiles). Called by
     DashticzDeviceEditor/DashticzWidgetEditor's own _save(), only for
     entries their save payload already fully describes (see
     _graftIntoLayoutEditor in js/deviceeditor.js and js/widgeteditor.js).
     Each entry: { kind: 'device', idx, subidx, name, width } |
     { kind: 'widget', widgetId, name, width } |
     { kind: 'separator', name, width }. */
  function addPendingItems(entries) {
    if (!active || !entries || !entries.length) return;
    entries.forEach(_addPendingItem);
    _attachHandlers();
    if (gridMode) _refreshGridOverlaps();
  }

  function _addPendingItem(entry) {
    var mountSelector = Dashticz.mountNewContainer($canvas[0]);
    var wrapper = document.querySelector(mountSelector);
    if (!wrapper) return;

    var reference =
      entry.kind === 'widget'
        ? _widgetKeyAndType(entry.widgetId).key
        : entry.kind === 'separator'
          ? _uniquePendingKey('separator')
          : '';

    var item = {
      id: 'dle-' + items.length,
      wrapper: wrapper,
      visibleBlocks: null,
      idx: entry.kind === 'device' ? entry.idx : null,
      subidx: entry.kind === 'device' ? entry.subidx || 0 : 0,
      kind: entry.kind,
      reference: reference,
      widgetId: entry.kind === 'widget' ? entry.widgetId : null,
      definition:
        entry.kind === 'separator'
          ? { type: 'blocktitle', title: entry.name }
          : {},
      name: entry.name || '',
      height: null,
      // Cancel removes a pending item outright instead of reverting its
      // DOM (there is no prior saved state to revert to) - see
      // _revertScreenDom.
      isPending: true,
    };

    wrapper.classList.add('dle-item-wrapper');
    var width12 = Math.max(1, Math.min(12, parseInt(entry.width, 10) || 3));
    // Grid save (savegridlayout.php) needs a plain 1-12 width when it
    // declares a not-yet-saved item's block for the first time - see
    // _gridCreateForPendingItem. item.width itself gets overwritten below
    // with the grid-column-scale width once positioned.
    item.classicWidth = width12;
    var minimumHeight = _minimumGridHeight(item);

    if (gridMode) {
      var gridColumns = gridConfig.gridColumns;
      var gridWidth =
        entry.kind === 'separator'
          ? gridColumns
          : Math.max(
              MIN_GRID_WIDTH,
              Math.min(gridColumns, Math.round((width12 * gridColumns) / 12))
            );
      var pixelHeight = entry.kind === 'separator' ? 60 : 120;
      var gridHeight = Math.max(
        minimumHeight,
        Math.ceil(
          (pixelHeight + gridConfig.gap) /
            (gridConfig.rowHeight + gridConfig.gap)
        )
      );
      var grid = _firstFreeGridPosition(
        items,
        1,
        gridWidth,
        gridHeight,
        gridColumns
      );
      item.grid = grid;
      item.originalGrid = $.extend({}, grid);
      item.width = grid.w;
      DashticzGridLayout.applyGridPosition(wrapper, grid);
      if (reference) wrapper.setAttribute('data-grid-block', reference);
      _ensureGridCanvasRows(grid.y + grid.h + 8);
    } else {
      item.width = entry.kind === 'separator' ? 12 : width12;
      wrapper.style.setProperty('--dle-column-span', item.width);
    }

    var widthClass = gridMode ? '' : 'col-xs-' + item.width;
    $(wrapper).empty().append(_pendingBlockHtml(entry, widthClass));
    if (reference) wrapper.setAttribute('data-id', reference);

    var visibleBlock = wrapper.querySelector('.dle-pending-block');
    item.visibleBlocks = [visibleBlock];
    item.originalBlocks = [
      {
        block: visibleBlock,
        widthClass: widthClass,
        height: '',
        heightPriority: '',
        fixedHeight: false,
      },
    ];

    items.push(item);
    itemById[item.id] = item;
    _decorateItem(item);
  }

  function _pendingBlockHtml(entry, widthClass) {
    // entry.icon (when set, e.g. from the Widgets catalog) is already a
    // full Font Awesome class string like "fab fa-spotify" - some widgets
    // use the "fab" (brands) style rather than "fas", so it must be used
    // as-is rather than prefixed with "fas" again.
    var icon =
      entry.kind === 'widget'
        ? entry.icon || 'fas fa-puzzle-piece'
        : entry.kind === 'separator'
          ? 'fas fa-divide'
          : 'fas fa-microchip';
    var classes =
      'mh dt_block transbg dle-pending-block' +
      (widthClass ? ' ' + widthClass : '');
    return (
      '<div class="' +
      classes +
      '"><span class="dle-pending-icon"><i class="' +
      _escapeHtml(icon) +
      '" aria-hidden="true"></i></span>' +
      '<span class="dle-pending-name">' +
      _escapeHtml(entry.name || '') +
      '</span>' +
      '<span class="dle-pending-badge">' +
      _escapeHtml(_t('pending_new', 'New – not saved yet')) +
      '</span></div>'
    );
  }

  function _uniquePendingKey(prefix) {
    pendingKeyCounter++;
    return 'dle_pending_' + prefix + '_' + pendingKeyCounter;
  }

  // The canonical blocks[key] name and component `type` per widgetId, as
  // already established by savewidgets.php's own catalog (see the
  // catalog[].blockKey values in js/widgeteditor.js) and by
  // _widgetIdFromDefinition's reverse type map above. log/sunrise/radio
  // are dispatched by Dashticz.mount() matching their block key directly
  // against a registered component name (js/dashticz.js _mount()), not via
  // a `type` field, so their key must be exactly that component name.
  var WIDGET_KEY_TYPE = {
    weather: { key: 'widget_weather', type: 'weather' },
    garbage: { key: 'widget_garbage', type: 'garbage' },
    spotify: { key: 'widget_spotify', type: 'spotify' },
    sonarr: { key: 'widget_sonarr', type: 'sonarr' },
    clock: { key: 'widget_clock', type: 'basicclock' },
    calendar: { key: 'widget_calendar', type: 'calendar' },
    secpanel: { key: 'widget_secpanel', type: 'secpanel' },
    publictransport: { key: 'widget_publictransport', type: 'publictransport' },
    trafficinfo: { key: 'widget_trafficinfo', type: 'trafficinfo' },
    alarmmeldingen: { key: 'widget_alarmmeldingen', type: 'alarmmeldingen' },
    camera: { key: 'widget_cameras', type: 'camera' },
    map: { key: 'widget_map', type: 'map' },
    longfonds: { key: 'widget_longfonds', type: 'longfonds' },
    moon: { key: 'widget_moon', type: 'moon' },
    news: { key: 'widget_news', type: 'news' },
    iframe: { key: 'widget_iframe', type: 'frame' },
    xmltvguide: { key: 'widget_xmltvguide', type: 'xmltvguide' },
    radio: { key: 'streamplayer', type: 'streamplayer' },
    log: { key: 'log', type: 'log' },
    sunrise: { key: 'sunrise', type: 'sunrise' },
    owm: { key: 'widget_owmwidget', type: 'owmwidget' },
    timegraph: { key: 'widget_timegraph', type: 'timegraph' },
  };

  function _widgetKeyAndType(widgetId) {
    return (
      WIDGET_KEY_TYPE[widgetId] || {
        key: 'widget_' + widgetId,
        type: widgetId,
      }
    );
  }

  /* savegridlayout.php rejects a grid item whose ref isn't already a
     declared blocks[key] (see the "Grid block is not declared" error)
     unless the request also includes a `create` descriptor telling it what
     to declare. A pending item (added via addPendingItems) was never
     declared, so its grid save must always carry one. `kind: 'inline'`
     (an arbitrary JSON block literal, the same mechanism
     convertCurrentScreenToGrid's Wizard conversion already relies on -
     see _gridCreateDefinition) is used uniformly rather than the
     narrower `kind: 'device'` shape, which coerces idx with PHP's (int)
     cast and would silently zero out a Domoticz group/scene idx like
     "s1". */
  function _gridCreateForPendingItem(item) {
    var props;
    if (item.kind === 'device') {
      if (item.idx === null || typeof item.idx === 'undefined') return null;
      props = { idx: item.subidx ? item.idx + '_' + item.subidx : item.idx };
    } else if (item.kind === 'widget') {
      props = { type: _widgetKeyAndType(item.widgetId).type };
    } else if (item.kind === 'separator') {
      props = { type: 'blocktitle' };
    } else {
      return null;
    }
    if (item.name) props.title = item.name;
    if (item.classicWidth) props.width = item.classicWidth;
    return {
      kind: 'inline',
      name: item.name || item.kind,
      propsJson: JSON.stringify(props),
    };
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
    var $active = $(
      '.dt-container .screen.swiper-slide-active[data-screenindex]'
    );
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
    var $byIndex = $('.dt-container .screen[data-screenindex="' + num + '"]');
    if ($byIndex.length) return $byIndex.first();
    var $active = $('.dt-container .screen.swiper-slide-active');
    if ($active.length) return $active;
    return $('.dt-container .screen:visible').first();
  }

  function convertCurrentScreenToGrid(skipConfirmation, targetMode) {
    var deferred = $.Deferred();
    var $screen = _activeScreenDom();
    var screenNumber = _activeScreenPayload();
    var allowEmpty = targetMode === 'wizard';
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
      alert(_t('conversion_width'));
      deferred.reject();
      return deferred.promise();
    }
    if (!skipConfirmation && !window.confirm(_t('conversion_confirm'))) {
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

  // A freshly converted screen has no grid config of its own yet, so it
  // should start out following the dashboard-wide Settings > Weergave
  // default (like any other new grid screen) rather than pinning today's
  // value - hence building against that default here, and always sending
  // pinGridColumns/pinRowHeight: false below.
  function _defaultGridColumns() {
    return typeof settings !== 'undefined' && settings.gridColumns > 0
      ? Number(settings.gridColumns)
      : 24;
  }

  function _defaultRowHeight() {
    return typeof settings !== 'undefined' && settings.rowHeight > 0
      ? Number(settings.rowHeight)
      : 20;
  }

  function _emptyGridConversion(screenNumber) {
    return {
      empty: true,
      payload: {
        screen: screenNumber,
        gridColumns: _defaultGridColumns(),
        rowHeight: _defaultRowHeight(),
        pinGridColumns: false,
        pinRowHeight: false,
        gap: 5,
        mobileLayout: 'stack',
        items: [],
      },
    };
  }

  function _buildColumnGridConversion($screen, screenNumber, allowEmpty) {
    var gridColumns = _defaultGridColumns();
    var rowHeight = _defaultRowHeight();
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
          if (!create && (!safeReference || screenNumber === 'standby')) {
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
        pinGridColumns: false,
        pinRowHeight: false,
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
      (typeof reference === 'string' && /^\d+(?:_\d+)?$/.test(reference));
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
        definition.title || safeReference || definition.type || 'Grid block',
      propsJson: JSON.stringify(props),
    };
  }

  function _isGridSerializable(value) {
    if (typeof value === 'string' || typeof value === 'boolean') {
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

    if (key && String(definition.type || '').toLowerCase() === 'blocktitle') {
      return {
        definition: definition,
        kind: 'separator',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      !definition.type &&
      typeof definition.htmlfile === 'string' &&
      definition.htmlfile !== ''
    ) {
      // Matches js/components/html.js's own canHandle() and js/deviceeditor.js's
      // _specialFromReference(): dispatched purely on a truthy htmlfile, with
      // no `type` of its own. Without this, an HTML block falls through to
      // the numeric-idx match below (which its non-numeric key never
      // satisfies), so it never got the config (cog) control here - see #168.
      return {
        definition: definition,
        kind: 'html',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      key !== 'widget_iframe' &&
      !definition.type &&
      typeof definition.frameurl === 'string' &&
      definition.frameurl !== ''
    ) {
      // Repeatable iFrame block, added via the Screen Editor's "Add items" ->
      // iFrame quick-add popup (js/deviceeditor.js's _showIframePopup()),
      // mirroring the html check above and deviceeditor.js's own
      // _specialFromReference(): dispatched purely on a truthy frameurl
      // (js/components/frame.js's canHandle()), no `type` of its own. The
      // fixed 'widget_iframe' key is excluded so the Widgets catalog's
      // existing singleton iframe entry keeps going through the generic
      // widget path below unchanged.
      return {
        definition: definition,
        kind: 'iframe',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      key !== 'widget_calendar' &&
      String(definition.type || '').toLowerCase() !== 'calendar' &&
      typeof definition.icalurl === 'string' &&
      definition.icalurl !== ''
    ) {
      // Repeatable Calendar block, added via the Screen Editor's "Add
      // items" -> Calendar quick-add popup (js/deviceeditor.js's
      // _showCalendarPopup()), mirroring the iframe check above and
      // deviceeditor.js's own _specialFromReference(): dispatched purely
      // on a truthy icalurl string (js/components/calendar.js's
      // canHandle()), no `type` of its own. The fixed 'widget_calendar'
      // key, and any block with an explicit type: 'calendar' (the legacy
      // multi-source `calendars` array shape the Widgets catalog's own
      // singleton entry writes, where icalurl is an object rather than a
      // string), are excluded so those keep going through the generic
      // widget path below unchanged.
      return {
        definition: definition,
        kind: 'calendar',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      key !== 'widget_publictransport' &&
      !definition.type &&
      ((typeof definition.station === 'string' && definition.station !== '') ||
        (typeof definition.tpc === 'string' && definition.tpc !== ''))
    ) {
      // Repeatable Public transport block, added via the Screen Editor's
      // "Add items" -> Public transport quick-add popup
      // (js/deviceeditor.js's _showPublicTransportPopup()), mirroring the
      // calendar check above and deviceeditor.js's own
      // _specialFromReference(): dispatched purely on a truthy station or
      // tpc (js/components/publictransport.js's canHandle()), no `type`
      // of its own. The fixed 'widget_publictransport' key is excluded so
      // that singleton keeps going through the generic widget path below
      // unchanged.
      return {
        definition: definition,
        kind: 'publictransport',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      key !== 'widget_timegraph' &&
      String(definition.type || '').toLowerCase() === 'timegraph'
    ) {
      // Repeatable Timegraph block, added via the Screen Editor's "Add
      // items" -> Timegraph quick-add popup (js/deviceeditor.js's
      // _showTimegraphPopup()), mirroring deviceeditor.js's own
      // _specialFromReference(): dispatched purely on an explicit
      // type:'timegraph' (js/components/timegraph.js's canHandle()), like
      // Group's type:'group' above rather than a field-shape check. The
      // fixed 'widget_timegraph' key is excluded so that singleton keeps
      // going through the generic widget path below unchanged.
      return {
        definition: definition,
        kind: 'timegraph',
        reference: key,
        widgetId: null,
        idx:
          parseInt(definition.idx, 10) > 0
            ? parseInt(definition.idx, 10)
            : null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      key !== 'widget_xmltvguide' &&
      !definition.type &&
      typeof definition.xmltvurl === 'string' &&
      definition.xmltvurl !== ''
    ) {
      // Repeatable TV Guide (XMLTV) block, added via the Screen Editor's
      // "Add items" -> TV Guide quick-add popup (js/deviceeditor.js's
      // _showXmltvguidePopup()), mirroring the calendar check above and
      // deviceeditor.js's own _specialFromReference(): dispatched purely
      // on a truthy xmltvurl (js/components/xmltvguide.js's canHandle()),
      // no `type` of its own. The fixed 'widget_xmltvguide' key is
      // excluded so that singleton keeps going through the generic
      // widget path below unchanged.
      return {
        definition: definition,
        kind: 'xmltvguide',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (key && String(definition.type || '').toLowerCase() === 'lms') {
      // Lyrion Music Server "Now Playing" block (js/components/lms.js),
      // dispatched on type: 'lms' like the separator/blocktitle check above.
      return {
        definition: definition,
        kind: 'lms',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (key && String(definition.type || '').toLowerCase() === 'group') {
      // Dashticz's own client-side group/scene aggregate block
      // (js/components/group.js), dispatched on type: 'group' like html/lms
      // above and mirroring deviceeditor.js's _specialFromReference(). Without
      // this it fell through to the idx-based checks below (none of which
      // match a devices-array group with no numeric idx), landing on
      // _collectGridItems()'s untyped 'grid' fallback kind - which has no
      // config (cog) control, only drag/resize.
      return {
        definition: definition,
        kind: 'group',
        reference: key,
        widgetId: null,
        idx:
          parseInt(definition.idx, 10) > 0
            ? parseInt(definition.idx, 10)
            : null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    if (
      key &&
      typeof definition.idx === 'undefined' &&
      parseInt(definition.slide, 10) > 0
    ) {
      return {
        definition: definition,
        kind: 'device',
        reference: key,
        widgetId: null,
        idx: null,
        subidx: 0,
        name: definition.title || key,
      };
    }

    // Check widget-ness before falling through to idx-based device
    // detection below: widgets like TimeGraph legitimately carry their own
    // idx property (the fallback IDX for value rows that don't set their
    // own), which otherwise looks exactly like a plain device reference and
    // routes the Screen Editor's config icon to that IDX's device settings
    // instead of the widget's own (see savewidgets.php's $catalog for which
    // widgets set 'type' - that's what _widgetIdFromDefinition matches on).
    var earlyWidgetId = _widgetIdFromReference(ref, definition);
    if (earlyWidgetId) {
      return {
        definition: definition,
        kind: 'widget',
        reference: String(ref),
        widgetId: earlyWidgetId,
        idx: null,
        subidx: 0,
        name: definition.title || String(ref),
      };
    }

    var rawIdx = typeof definition.idx !== 'undefined' ? definition.idx : ref;
    var groupMatch = String(rawIdx).match(/^s\d+$/);
    if (groupMatch) {
      var groupName = definition.title || key || String(rawIdx);
      return {
        definition: definition,
        kind: 'device',
        reference: key || String(rawIdx),
        widgetId: null,
        idx: String(rawIdx),
        subidx: 0,
        name: groupName,
      };
    }
    var match = String(rawIdx).match(/^(\d+)(?:_(\d+))?$/);
    if (!match || parseInt(match[1], 10) < 1) {
      return null;
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

  function _widgetIdFromReference(reference, definition) {
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
      // Streamplayer/Radio is dispatched by its component name directly (see
      // Dashticz._mount in dashticz.js), so its block is always keyed
      // 'streamplayer', never a 'widget_'-prefixed key like the others.
      streamplayer: 'radio',
      widget_owmwidget: 'owm',
      widget_timegraph: 'timegraph',
      // DT_log and 'sunrise' (via DT_simpleblock) are also dispatched by their
      // plain block key, exactly like streamplayer above.
      log: 'log',
      sunrise: 'sunrise',
    };
    var byKey = widgetReferences[String(reference)];
    if (byKey) return byKey;
    // Widgets added by hand in CONFIG.js (per the documented syntax, e.g.
    // blocks['weather'] = {type: 'weather'}) are not keyed with the
    // wizard's 'widget_' prefix, so also resolve by the block's own type/
    // shape. Mirrors DashticzWidgetEditor's own definition matching so the
    // Screen Editor's config button appears for those blocks too.
    return _widgetIdFromDefinition(definition);
  }

  function _widgetIdFromDefinition(definition) {
    if (!definition) return null;
    if (typeof definition.frameurl === 'string') return 'iframe';
    if (typeof definition.xmltvurl === 'string') return 'xmltvguide';
    if (
      typeof definition.station === 'string' ||
      typeof definition.tpc === 'string'
    ) {
      return 'publictransport';
    }
    if (typeof definition.rss === 'string') return 'alarmmeldingen';
    if (
      Array.isArray(definition.cameras) ||
      typeof definition.imageUrl === 'string'
    ) {
      return 'camera';
    }
    if (
      Array.isArray(definition.tracks) ||
      definition.type === 'streamplayer'
    ) {
      return 'radio';
    }
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
      frame: 'iframe',
      xmltvguide: 'xmltvguide',
      streamplayer: 'radio',
      log: 'log',
      sunrise: 'sunrise',
      owmwidget: 'owm',
      timegraph: 'timegraph',
    };
    return typeMap[String(definition.type || '').toLowerCase()] || null;
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
        (typeof language !== 'undefined' &&
          language &&
          language.settings &&
          language.settings.widgeteditor &&
          language.settings.widgeteditor.garbage_title) ||
        'Garbage';
      _copyDefinedWidgetProperties(entry, definition, ['maxitems', 'maxdays']);
    }

    if (item.widgetId === 'weather') {
      entry.provider =
        definition.widget_provider ||
        (definition.type === 'wunderground' ? 'wunderground' : 'openweather');
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
      entry.rss = definition.rss || 'https://www.alarmeringen.nl/feeds/all.rss';
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
    $canvas[0].style.setProperty('--dle-grid-editor-min-height', height + 'px');
  }

  function _decorateItems() {
    items.forEach(_decorateItem);
  }

  function _decorateItem(item) {
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
      // A pending (not-yet-saved) item has no persisted config to open -
      // its own gear-icon config flow would either no-op or bypass this
      // editor's Save entirely. It gets full drag/resize/remove, just not
      // configuration, until after the next Layout Editor Save.
      var isConfigurable =
        !item.isPending &&
        (item.kind === 'device' ||
          item.kind === 'widget' ||
          REFERENCE_BASED_SPECIAL_KINDS.indexOf(item.kind) > -1);
      var configureLabel =
        item.kind === 'widget'
          ? _t('configure_widget')
          : _t('configure_device');
      var topLeftControl = isConfigurable
        ? '<button type="button" class="dle-config-button" title="' +
          _escapeHtml(configureLabel) +
          '" aria-label="' +
          _escapeHtml(configureLabel) +
          ' ' +
          _escapeHtml(item.name) +
          '"><i class="fas fa-cog" aria-hidden="true"></i></button>'
        : '<span class="dle-drag-icon" aria-hidden="true"><i class="fas fa-arrows-alt"></i></span>';
      var overlay =
        '<div class="dle-overlay" data-dle-id="' +
        item.id +
        '">' +
        topLeftControl +
        '<span class="dle-size-label"></span>' +
        removeButton +
        resizeHandle +
        '</div>';
      $block.append(overlay);
    });

    _updateSizeLabel(item);
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
        var item = itemById[String($(this).data('dle-id'))];
        if ($(event.target).closest('.dle-config-button').length) {
          if (item) _openItemConfig(item);
          return;
        }
        if ($(event.target).closest('.dle-remove-button').length) {
          if (item && window.confirm(_t('remove_confirm'))) _removeItem(item);
        }
      })
      .on('pointerdown.layouteditor', function (event) {
        if ($(event.target).closest('.dle-config-button').length) {
          // Do not cancel pointerdown on the button; allow its click event to fire.
          event.stopPropagation();
          return;
        }
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
      .off('.layouteditor')
      .on('click.layouteditor', '.dle-cancel', _cancel)
      .on('click.layouteditor', '.dle-save', _save);
  }

  function _openItemConfig(item) {
    if (!item) return;
    if (
      (item.kind === 'device' ||
        REFERENCE_BASED_SPECIAL_KINDS.indexOf(item.kind) > -1) &&
      item.reference
    ) {
      DT_function.loadDTScript('js/deviceeditor.js').then(function () {
        if (
          typeof DashticzDeviceEditor !== 'undefined' &&
          typeof DashticzDeviceEditor.openLayoutConfig === 'function'
        ) {
          DashticzDeviceEditor.openLayoutConfig(item.reference);
        }
      });
      return;
    }
    if (item.kind === 'widget' && item.widgetId) {
      DT_function.loadDTScript('js/widgeteditor.js').then(function () {
        if (
          typeof DashticzWidgetEditor !== 'undefined' &&
          typeof DashticzWidgetEditor.openLayoutConfig === 'function'
        ) {
          DashticzWidgetEditor.openLayoutConfig(item.widgetId);
        }
      });
    }
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
      .text(remaining ? _t('removed_one') : _t('removed_all'));
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
    var cellWidth = Math.max(1, (rect.width - gap * (columns - 1)) / columns);
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
        (clientY - metrics.rect.top - pointerState.offsetY) / metrics.rowStride
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
      start.h + Math.round((clientY - pointerState.startY) / metrics.rowStride);
    // Grid blocks must remain large enough to expose their editor controls.
    width = Math.max(MIN_GRID_WIDTH, Math.min(metrics.columns - x + 1, width));
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
    var $save = $toolbar.find('.dle-save').prop('disabled', true);
    $toolbar.find('.dle-cancel').prop('disabled', true);
    $toolbar.find('.dle-toolbar-help').text(_t('saving_layout'));

    var payloads = _buildSavePayloads();

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        var chain = $.Deferred().resolve().promise();
        payloads.forEach(function (screenPayload) {
          chain = chain.then(function () {
            return _saveScreenPayload(screenPayload, token);
          });
        });
        return chain;
      })
      .done(function () {
        $toolbar.find('.dle-toolbar-help').text(_t('saved_reloading'));
        $save
          .removeClass('btn-primary')
          .addClass('btn-success')
          .text(_t('saved'));
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

  /* Builds one save payload per screen touched in this editing round (see
     _captureSession/_switchActiveScreen). _orderedItems()/_widgetPayload()
     were written against a single "current" screen's module state, so each
     session is restored into that state just long enough to read it back
     out as a plain payload; the screen the user is actually looking at is
     restored once every session has been read. */
  function _buildSavePayloads() {
    var activeKey = currentSessionKey;
    sessions[activeKey] = _captureSession();

    var payloads = Object.keys(sessions).map(function (key) {
      var session = sessions[key];
      _restoreSession(session);

      if (session.gridMode) {
        // Only pin gridColumns/rowHeight explicitly on this screen when the
        // session's current value actually diverges from the dashboard-wide
        // default - a plain save that never touched either just keeps
        // following Settings > Weergave instead of freezing today's value.
        var pinGridColumns =
          session.gridConfig.gridColumns !== _defaultGridColumns();
        var pinRowHeight = session.gridConfig.rowHeight !== _defaultRowHeight();
        return {
          gridMode: true,
          screenNumber: session.screenNumber,
          payload: {
            screen: session.screenNumber,
            gridColumns: session.gridConfig.gridColumns,
            rowHeight: session.gridConfig.rowHeight,
            pinGridColumns: pinGridColumns,
            pinRowHeight: pinRowHeight,
            gap: session.gridConfig.gap,
            mobileLayout: session.gridConfig.mobileLayout,
            items: _orderedItems().map(function (item) {
              var entry = {
                ref: item.reference,
                grid: $.extend({}, item.grid),
              };
              if (item.isPending) {
                var create = _gridCreateForPendingItem(item);
                if (create) entry.create = create;
              }
              return entry;
            }),
          },
        };
      }

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

      return {
        gridMode: false,
        screenNumber: session.screenNumber,
        devices: devices,
        widgets: widgets,
        ordered: ordered,
      };
    });

    _restoreSession(sessions[activeKey]);
    currentSessionKey = activeKey;
    return payloads;
  }

  function _saveScreenPayload(screenPayload, token) {
    if (screenPayload.gridMode) {
      return _postLayoutData(
        'js/savegridlayout.php',
        screenPayload.payload,
        token
      );
    }

    return _postLayoutData(
      'js/saveblocks.php',
      { devices: screenPayload.devices, screen: screenPayload.screenNumber },
      token
    ).then(function (deviceResult) {
      return _postLayoutData(
        'js/savewidgets.php',
        { widgets: screenPayload.widgets, screen: screenPayload.screenNumber },
        token
      ).then(function (widgetResult) {
        var deviceIndex = 0;
        var widgetIndex = 0;
        var layoutItems = screenPayload.ordered.map(function (item) {
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
          { items: layoutItems, screen: screenPayload.screenNumber },
          token
        );
      });
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
    _unbindScreenNavigation();

    sessions[currentSessionKey] = _captureSession();
    Object.keys(sessions).forEach(function (key) {
      _restoreSession(sessions[key]);
      _revertScreenDom();
    });

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
    sessions = {};
    currentSessionKey = null;
    _stopEdgeScroll();
  }

  /* Restores one screen's DOM back to its pre-editing state. Operates on
     the module state, which the caller has just pointed at the session to
     revert (see _restoreSession) - mirrors how _buildSavePayloads() reads
     each session back out through the same single-active-screen helpers. */
  function _revertScreenDom() {
    if (gridMode && $canvas) {
      originalGridWrappers.forEach(function (wrapper) {
        $canvas[0].appendChild(wrapper);
      });
    }

    items.forEach(function (item) {
      // A pending item (added via the topbar's "Add items" menu while this
      // editor stayed open - see addPendingItems) was never saved, so
      // there is nothing to revert it to: drop it outright instead of
      // restoring pre-edit DOM/classes it never had.
      if (item.isPending) {
        if (item.wrapper.parentNode) {
          item.wrapper.parentNode.removeChild(item.wrapper);
        }
        return;
      }
      $(item.visibleBlocks)
        .children('.dle-overlay')
        .off('.layouteditor')
        .remove();
      item.wrapper.classList.remove('dle-item-wrapper');
      item.wrapper.style.removeProperty('--dle-column-span');
      if (gridMode) {
        item.grid = $.extend({}, item.originalGrid);
        DashticzGridLayout.applyGridPosition(item.wrapper, item.grid);
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
      $editingScreen.find('.dle-overlay').off('.layouteditor').remove();
      $editingScreen
        .find('.dle-block, .dle-dragging, .dle-drop-before, .dle-drop-after')
        .removeClass('dle-block dle-dragging dle-drop-before dle-drop-after');
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
    if ($canvas)
      $canvas[0].style.removeProperty('--dle-grid-editor-min-height');
    if ($editingScreen) $editingScreen.removeClass('dle-grid-screen-editing');
  }

  function replaceBlockReference(oldBlock, newBlock) {
    if (!active || !oldBlock || !newBlock || oldBlock === newBlock) return;

    var activeKey = currentSessionKey;
    sessions[activeKey] = _captureSession();

    Object.keys(sessions).forEach(function (key) {
      _restoreSession(sessions[key]);
      _replaceBlockReferenceInCurrentSession(oldBlock, newBlock);
      sessions[key] = _captureSession();
    });

    _restoreSession(sessions[activeKey]);
    currentSessionKey = activeKey;
  }

  function _replaceBlockReferenceInCurrentSession(oldBlock, newBlock) {
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
    isActive: function () {
      return active;
    },
    addPendingItems: addPendingItems,
  };
})();

//# sourceURL=js/layouteditor.js
