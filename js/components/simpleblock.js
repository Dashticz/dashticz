/* global Dashticz DT_function getFullScreenIcon settings loadWeather loadWeatherFull getSpotify DT_button loadSonarr getCoin loadMaps DashticzDeviceEditor DashticzWidgetEditor DashticzLayoutEditor isCustomConfigMode setConfigMode language DashticzScreenSwitcher moment */
//# sourceURL=js/components/simpleblock.js
var DT_simpleblock = (function () {
  var simpleBlocks = {
    logo: {
      defaultWidth: 2,
      render: renderLogo,
    },
    screenswitcher: {
      defaultWidth: 2,
      render: renderScreenSwitcher,
    },
    settings: {
      defaultWidth: 2,
      render: renderSettings,
    },
    miniclock: {
      defaultWidth: 8,
      render: renderMiniclock,
    },
    clock: {
      render: renderClock,
    },
    responsiveclock: {
      render: renderResponsiveClock,
    },
    weather: {
      script: 'js/weather.js',
      render: renderWeather,
    },
    wunderground: {
      script: 'js/weather.js',
      render: renderWeather,
    },
    currentweather: {
      script: 'js/weather.js',
      render: renderCurrentWeather,
    },
    currentweather_big: {
      script: 'js/weather.js',
      render: renderCurrentWeather_big,
    },
    spotify: {
      script: 'js/spotify.js',
      render: renderSpotify,
    },
    trafficmap: {
      render: renderTrafficMap,
    },
    sunrise: {
      render: renderSunrise,
    },
    horizon: {
      render: renderHorizon,
    },
    sonarr: {
      script: 'js/sonarr.js',
      render: renderSonar,
    },
    fullscreen: {
      script: 'js/fullscreen.js',
      render: renderFullScreen,
    },
    moon: {
      render: renderMoon
    }
  };

  var keyBlocks = {
    empty: { render: renderEmpty },
    currency: {
      script: 'js/coins.js',
      render: renderCurrency,
    },
    latitude: {
      render: renderMaps,
    },
  };

  function findKey(block) {
    var blockType = undefined;
    $.each(keyBlocks, function (key) {
      if (typeof block[key] !== 'undefined') blockType = key;
    });
    return blockType;
  }

  function getBlock(block) {
    return simpleBlocks[block.type] || keyBlocks[findKey(block)];
  }
  return {
    name: 'simpleblock',
    canHandle: function (block) {
      return block && (!!simpleBlocks[block.type] || findKey(block));
    },
    defaultCfg: function (block) {
      var thisBlock = getBlock(block);
      return {
        width: (thisBlock && thisBlock.defaultWidth) || 12,
      };
    },
    run: function (me) {
      var thisBlock = getBlock(me.block);
      var script = thisBlock.script;
      var render = thisBlock.render;
      if (script)
        DT_function.loadDTScript(script).then(function () {
          renderBlock(me, render);
        })
        .catch(function() {
          console.log('Error loading script '+script);
        });
      else renderBlock(me, render);

      if (thisBlock === simpleBlocks.miniclock) {
        _initMiniclockFitSize(me);
      }
    },
    destroy: function (me) {
      if (me.miniclockResizeObserver) {
        me.miniclockResizeObserver.disconnect();
        me.miniclockResizeObserver = null;
      }
    },
  };

  function renderBlock(me, render) {
    var addHTML = render(me);
    if (addHTML) me.$mountPoint.html(addHTML);
  }

  function renderLogo(me) {
    var title = settings['app_title'] || 'Dashticz';
    return (
      '<div data-id="logo" class="logo col-xs-' +
      me.block.width +
      '">' +
      '<img class="logo-image" src="img/dashticz.png" alt="' +
      $('<div>').text(title).html() +
      '">' +
      '<span class="logo-title">' +
      $('<div>').text(title).html() +
      '</span></div>'
    );
  }

  function renderScreenSwitcher(me) {
    var content =
      '<div class="col-xs-' +
      me.block.width +
      ' dt-screen-switcher-host"></div>';
    setTimeout(function () {
      if (typeof DashticzScreenSwitcher !== 'undefined') {
        DashticzScreenSwitcher.init();
      } else {
        DT_function.loadDTScript('js/screenswitcher.js').then(function () {
          if (typeof DashticzScreenSwitcher !== 'undefined') {
            DashticzScreenSwitcher.init();
          }
        });
      }
    }, 0);
    return content;
  }

  function renderSettings(me) {
    var icons = ['settings', 'fullscreen'];
    if (typeof settings['settings_icons'] !== 'undefined') {
      icons = settings['settings_icons'];
    }
    var customMode = typeof isCustomConfigMode === 'function' && isCustomConfigMode();
    var modeLabelCustom =
      (language.settings &&
        language.settings.config_mode &&
        language.settings.config_mode.custom) ||
      'Custom';
    var modeLabelWizard =
      (language.settings &&
        language.settings.config_mode &&
        language.settings.config_mode.wizard) ||
      'Wizard';
    var modeAria =
      (language.settings &&
        language.settings.config_mode &&
        language.settings.config_mode.aria_label) ||
      'Configuration mode';
    var editorLabels =
      (language.settings && language.settings.widgeteditor) || {};
    var currentModeLabel = customMode ? modeLabelCustom : modeLabelWizard;
    var currentModeIcon = customMode ? 'fa-sliders-h' : 'fa-hat-wizard';
    var content =
      '<div class="col-xs-' +
      me.block.width +
      ' text-right topbar-settings-wrap">';
    content +=
      '<span class="config-mode-switch">' +
      '<button type="button" class="config-mode-icon-btn configmodeicon" ' +
      'data-id="configmode" title="' + modeAria + ': ' + currentModeLabel + '" ' +
      'aria-label="' + modeAria + ': ' + currentModeLabel + '">' +
      '<i class="fas ' + currentModeIcon + '" aria-hidden="true"></i>' +
      '</button></span>';
    for (var i = 0; i < icons.length; i++) {
      switch (icons[i]) {
        case 'settings':
          if (!customMode) {
            // The Screen Editor owns add-device/widget actions while it is active.
            // Keep the add button mounted so the body-class observer can reveal it
            // immediately when layout editing starts, without rebuilding the topbar.
            content +=
              '<span class="settings screeneditoraddicon d-none" data-id="screeneditoradd" ' +
              'role="button" aria-label="' +
              (editorLabels.open_add_menu || editorLabels.add_devices || 'Add items') +
              '" title="' +
              (editorLabels.open_add_menu || editorLabels.add_devices || 'Add items') +
              '">' +
              _topbarIconHtml('fas fa-plus', 'img/icons/Plus.png') + '</span>';
            content +=
              '<span class="settings layouteditoricon" data-id="layouteditor" ' +
              'role="button" aria-label="' +
              (editorLabels.open_layout_editor || 'Open Screen Editor') +
              '" title="' +
              (editorLabels.screen_editor || editorLabels.move_tiles || 'Screen Editor') +
              '">' +
              _topbarIconHtml('fas fa-wand-magic-sparkles', null) + '</span>';
          }
          content +=
            '<span class="settings settingsicon" data-id="settings" ' +
            'data-bs-target="#settingspopup" data-bs-toggle="modal" ' +
            'role="button" aria-label="' +
            (editorLabels.open_settings || 'Open settings') +
            '" title="' +
            (editorLabels.settings_title || 'Settings') +
            '">' +
            _topbarIconHtml('fas fa-cog', 'img/icons/Cog.png') + '</span>';
          if (!customMode) {
            _registerLayoutEditorClick();
            _registerScreenEditorAddClick();
            _registerScreenEditorStateObserver();
            _openPendingGridEditor();
          }
          _registerConfigModeClick();
          _openPendingConfigModePicker();
          break;

        case 'fullscreen':
          content += getFullScreenIcon();
          break;
      }
    }
    content += '</div>';
    return content;
  }

  /**
   * Returns icon HTML for a topbar button.
   * When settings['topbar_use_png_icons'] is 1 (or true), uses a custom PNG <img> from img/icons/.
   * When it is 0 (or falsy, the default), uses a Font Awesome <i> element.
   * @param {string} faClass  e.g. 'fas fa-cog'
   * @param {string} imgSrc   e.g. 'img/icons/Cog.png'
   * @returns {string}
   */
  function _topbarIconHtml(faClass, imgSrc) {
    if (Number(settings['topbar_use_png_icons']) === 1 && imgSrc) {
      return '<img src="' + imgSrc + '" class="dt-topbar-icon-img" aria-hidden="true" alt="">';
    }
    return '<i class="' + faClass + '" aria-hidden="true"></i>';
  }

  function _registerConfigModeClick() {
    $(document)
      .off('click.configmodeicon')
      .on('click.configmodeicon', '.configmodeicon', function () {
        _openConfigModePicker();
      });
    $(document)
      .off('click.configmode')
      .on('click.configmode', '.config-mode-btn', function () {
        var mode = String($(this).data('mode') || 'wizard');
        var currentMode =
          typeof isCustomConfigMode === 'function' && isCustomConfigMode()
            ? 'custom'
            : 'wizard';
        if (mode === currentMode) {
          _closeConfigModePicker();
          return;
        }
        _closeConfigModePicker(function () {
          _showConfigModeWarning(mode, function () {
            if (mode !== 'wizard') {
              if (typeof setConfigMode === 'function') {
                setConfigMode(mode);
              }
              return;
            }
            DT_function.loadDTScript('js/layouteditor.js').then(function () {
              DashticzLayoutEditor.convertCurrentScreenToGrid(
                true,
                'wizard'
              ).done(function (result) {
                try {
                  sessionStorage.setItem(
                    'dashticz_open_grid_editor',
                    String((result && result.gridScreen) || '1')
                  );
                } catch (error) {
                  // Session storage is optional.
                }
                if (
                  result &&
                  result.alreadyGrid &&
                  typeof setConfigMode === 'function'
                ) {
                  setConfigMode('wizard');
                } else {
                  window.location.reload();
                }
              });
            });
          });
        });
      });
  }

  /**
   * Popup with a Custom mode / Wizard mode tile, opened from the topbar
   * config-mode icon. The currently active mode is highlighted; picking the
   * other tile hides this popup and hands off to the existing
   * _showConfigModeWarning() confirmation (unchanged behavior/actions).
   */
  function _configModePickerHtml() {
    var labels = language.settings.config_mode;
    var customMode = typeof isCustomConfigMode === 'function' && isCustomConfigMode();
    var tiles = [
      {
        mode: 'custom',
        icon: 'fa-sliders-h',
        label: labels.custom_mode || labels.custom,
        text: labels.custom_mode_desc || labels.confirm_custom,
      },
      {
        mode: 'wizard',
        icon: 'fa-hat-wizard',
        label: labels.wizard_mode || labels.wizard,
        text: labels.wizard_mode_desc || labels.confirm_wizard,
      },
    ];
    var html =
      '<div class="modal fade" id="configmodepopup" tabindex="-1" ' +
      'aria-labelledby="config-mode-picker-title" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title" id="config-mode-picker-title">' +
      $('<div>').text(labels.picker_title || labels.aria_label).html() +
      '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      $('<div>').text(labels.cancel).html() + '"></button></div>' +
      '<div class="modal-body"><div class="settings-tiles config-mode-tiles">';
    tiles.forEach(function (tile) {
      var isActive = (tile.mode === 'custom') === customMode;
      html +=
        '<button type="button" class="settings-tile config-mode-tile config-mode-btn' +
        (isActive ? ' active' : '') + '" data-mode="' + tile.mode + '">' +
        '<i class="fas ' + tile.icon + '" aria-hidden="true"></i>' +
        '<span>' + $('<div>').text(tile.label).html() + '</span>' +
        '<small>' + $('<div>').text(tile.text).html() + '</small>' +
        '</button>';
    });
    html += '</div></div></div></div></div>';
    return html;
  }

  function _openConfigModePicker() {
    $('#configmodepopup').remove();
    $('body').append(_configModePickerHtml());
    var popup = document.getElementById('configmodepopup');
    $(popup).one('hidden.bs.modal', function () {
      $(popup).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(popup).show();
  }

  function _closeConfigModePicker(callback) {
    var popup = document.getElementById('configmodepopup');
    var instance = popup && window.bootstrap.Modal.getInstance(popup);
    if (!instance) {
      if (typeof callback === 'function') callback();
      return;
    }
    $(popup).one('hidden.bs.modal', function () {
      if (typeof callback === 'function') callback();
    });
    instance.hide();
  }

  function _showConfigModeWarning(mode, onContinue) {
    var labels = language.settings.config_mode;
    var message = mode === 'wizard'
      ? labels.confirm_wizard
      : labels.confirm_custom;

    $('#configmodewarningpopup').remove();
    var html =
      '<div class="modal fade" id="configmodewarningpopup" tabindex="-1" ' +
      'aria-labelledby="config-mode-warning-title" aria-describedby="config-mode-warning-message" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title" id="config-mode-warning-title">' +
      '<i class="fas fa-triangle-exclamation text-warning me-2" aria-hidden="true"></i>' +
      $('<div>').text(labels.warning_title).html() +
      '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      $('<div>').text(labels.cancel).html() + '"></button></div>' +
      '<div class="modal-body"><p id="config-mode-warning-message" class="mb-0">' +
      $('<div>').text(message).html() + '</p></div>' +
      '<div class="modal-footer">' +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      $('<div>').text(labels.cancel).html() + '</button>' +
      '<button type="button" class="btn btn-warning" id="config-mode-warning-continue">' +
      $('<div>').text(labels.continue).html() + '</button>' +
      '</div></div></div></div>';
    $('body').append(html);

    var popup = document.getElementById('configmodewarningpopup');
    var confirmed = false;
    $('#config-mode-warning-continue').one('click', function () {
      confirmed = true;
      window.bootstrap.Modal.getInstance(popup).hide();
    });
    $(popup).one('hidden.bs.modal', function () {
      $(popup).remove();
      if (confirmed && typeof onContinue === 'function') {
        onContinue();
      }
    });
    window.bootstrap.Modal.getOrCreateInstance(popup).show();
  }

  function _screenEditorLabels() {
    return (language.settings && language.settings.widgeteditor) || {};
  }

  function _syncScreenEditorAddButton() {
    $('.screeneditoraddicon').toggleClass('d-none', !$('body').hasClass('dle-active'));
  }

  function _registerScreenEditorStateObserver() {
    _syncScreenEditorAddButton();
    if (window.__dtScreenEditorAddObserver) return;
    window.__dtScreenEditorAddObserver = new MutationObserver(function () {
      _syncScreenEditorAddButton();
    });
    window.__dtScreenEditorAddObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  function _screenEditorAddMenuHtml() {
    var t = _screenEditorLabels();
    var tiles = [
      { action: 'device', icon: 'fa-plus', label: t.add_device },
      { action: 'widgets', icon: 'fa-puzzle-piece', label: t.title || 'Widgets' },
      { action: 'custom', icon: 'fa-cube', label: t.custom_devices || 'Custom devices' },
      { action: 'multidevice', icon: 'fa-layer-group', label: t.multi_device || 'Multi Device' },
      { action: 'slidebutton', icon: 'fa-sliders-h', label: t.slide_button || 'Slide button' },
      { action: 'separator', icon: 'fa-divide', label: t.separator || 'Separator' },
    ];
    var html =
      '<div class="modal fade" id="screeneditoraddpopup" tabindex="-1" aria-hidden="true">' +
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">' +
      '<div class="modal-header"><h5 class="modal-title">' +
      $('<div>').text(t.add_menu_title || t.add_devices || 'Add items').html() +
      '</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      $('<div>').text(t.close || 'Close').html() + '"></button></div>' +
      '<div class="modal-body"><div class="dt-screeneditor-add-grid">';
    tiles.forEach(function (tile) {
      html +=
        '<button type="button" class="dt-screeneditor-add-tile" data-add-action="' +
        tile.action + '"><i class="fas ' + tile.icon + '" aria-hidden="true"></i>' +
        '<span>' + $('<div>').text(tile.label).html() + '</span></button>';
    });
    html += '</div></div></div></div></div>';
    return html;
  }

  function _openScreenEditorAddMenu() {
    $('#screeneditoraddpopup').remove();
    $('body').append(_screenEditorAddMenuHtml());
    var popup = document.getElementById('screeneditoraddpopup');
    var $popup = $(popup);
    var selectedAction = '';
    $popup.on('click', '.dt-screeneditor-add-tile', function () {
      if (selectedAction) return;
      selectedAction = String($(this).attr('data-add-action') || '');
      $popup.find('.dt-screeneditor-add-tile').prop('disabled', true);
      window.bootstrap.Modal.getInstance(popup).hide();
    });
    $popup.one('hidden.bs.modal', function () {
      $popup.remove();
      if (selectedAction) {
        if (selectedAction === 'widgets') {
          DT_function.loadDTScript('js/widgeteditor.js').then(function () {
            DashticzWidgetEditor.open();
          });
          return;
        }
        DT_function.loadDTScript('js/deviceeditor.js').then(function () {
          if (selectedAction === 'custom') {
            DashticzDeviceEditor.openCustom();
          } else if (selectedAction === 'multidevice') {
            DashticzDeviceEditor.openMultiDevice();
          } else if (selectedAction === 'slidebutton') {
            DashticzDeviceEditor.openSlideButton();
          } else if (selectedAction === 'separator') {
            DashticzDeviceEditor.addSeparator();
          } else {
            DashticzDeviceEditor.open();
          }
        });
      }
    });
    window.bootstrap.Modal.getOrCreateInstance(popup).show();
  }

  function _registerScreenEditorAddClick() {
    $(document)
      .off('click.screeneditoradd')
      .on('click.screeneditoradd', '.screeneditoraddicon', function () {
        if (!$('body').hasClass('dle-active')) return;
        _openScreenEditorAddMenu();
      });
  }

  function _openPendingGridEditor() {
    var pendingScreen = '';
    try {
      pendingScreen =
        sessionStorage.getItem('dashticz_open_grid_editor') || '';
      if (pendingScreen) {
        sessionStorage.removeItem('dashticz_open_grid_editor');
      }
    } catch (error) {
      return;
    }
    if (!pendingScreen) return;
    setTimeout(function () {
      if (
        pendingScreen === 'standby' &&
        typeof DashticzScreenSwitcher !== 'undefined'
      ) {
        DashticzScreenSwitcher.goToScreen('standby');
      } else if (
        parseInt(pendingScreen, 10) > 0 &&
        typeof DashticzScreenSwitcher !== 'undefined'
      ) {
        DashticzScreenSwitcher.goToScreen(parseInt(pendingScreen, 10));
      }
      DT_function.loadDTScript('js/layouteditor.js').then(function () {
        DashticzLayoutEditor.open();
      });
    }, 300);
  }

  /**
   * Opens the Custom/Wizard mode picker once, right after the first-run
   * setup wizard (js/main.js) saves the basic settings and reloads.
   */
  function _openPendingConfigModePicker() {
    var pending = '';
    try {
      pending = sessionStorage.getItem('dashticz_show_mode_picker') || '';
      if (pending) {
        sessionStorage.removeItem('dashticz_show_mode_picker');
      }
    } catch (error) {
      return;
    }
    if (!pending) return;
    setTimeout(function () {
      _openConfigModePicker();
    }, 0);
  }

  function _registerLayoutEditorClick() {
    $(document)
      .off('click.layouteditoricon')
      .on('click.layouteditoricon', '.layouteditoricon', function () {
        DT_function.loadDTScript('js/layouteditor.js').then(function () {
          DashticzLayoutEditor.open();
        });
      });
  }


  function renderMiniclock(me) {
    var fixedHeight = parseInt(me.block.height, 10);
    var heightClass = fixedHeight > 0 ? ' fixedheight' : '';
    var heightStyle =
      fixedHeight > 0
        ? ' style="height:' + fixedHeight + 'px !important"'
        : '';
    return (
      '<div data-id="miniclock" class="miniclock mh dt_block transbg col-xs-' +
      me.block.width +
      ' text-center' +
      heightClass +
      '"' +
      heightStyle +
      '>' +
      '<span class="weekday"></span> <span class="date"></span> <span>&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class="clock"></span>' +
      '</div>'
    );
  }

  // Miniclock has no Size/Scale controls (it's meant to be sized purely via
  // its block's own width/height, e.g. the compact topbar strip), but its
  // .weekday/.date/.clock spans still render at a single fixed CSS
  // font-size regardless of that block size - resizing the block (in a
  // grid, or the classic column width) never made the text itself bigger
  // or smaller. Fit it the same way the four dedicated clock widgets do.
  function _fitMiniclockSize(me) {
    var $mount = me.$mountPoint;
    var $block = $mount.find('.dt_block').first();
    if (!$block.length) return;
    // In a grid, the outer mount point owns the live row/column dimensions
    // (a hard, CSS-Grid-track-sized box); .dt_block only *looks* fixed
    // (min-height: 100%, not a cap) but a grid item's automatic minimum
    // size still grows to fit its content unless the item itself clips
    // overflow, which .dt-grid-item doesn't. Measuring .dt_block here would
    // read that already-inflated size back, feeding a runaway
    // grow-remeasure-grow loop with every ResizeObserver tick. Same fix as
    // js/components/dial.js's _dialFitSize() and the four clock widgets.
    var inGrid = $mount.hasClass('dt-grid-item');
    var $sizeBox = inGrid ? $mount : $block;
    var availW = $sizeBox.outerWidth() || 0;
    var availH = $sizeBox.outerHeight() || 0;
    if (availW <= 0 || availH <= 0) return;

    // The weekday/date/clock <span>s are inline, so their own box already
    // reports their true rendered size - but only once they hold real text
    // (_initMiniclockFitSize() below fills them before the first call here).
    // Measure a nowrap clone at a reference font-size (appended inside
    // .dt_block itself, not document.body - an absolutely positioned probe
    // appended to body can still enlarge the document's scrollable area,
    // which is exactly the kind of stray resize that fed the clock
    // widgets' own runaway-growth bug).
    var REF = 100;
    // Snapshot the real content *before* the probe is appended - .contents()
    // below is a live DOM query, so run after appending it would also pick
    // up the (still-empty) probe itself as content to clone into itself.
    var $original = $block.contents();
    var $probe = $('<span></span>')
      .css({
        position: 'absolute',
        visibility: 'hidden',
        left: 0,
        top: 0,
        whiteSpace: 'nowrap',
        fontSize: REF + 'px',
      })
      .appendTo($block);
    $original.clone().appendTo($probe);
    var measuredW = $probe.outerWidth() || 0;
    var measuredH = $probe.outerHeight() || 0;
    $probe.remove();
    if (measuredW <= 0 || measuredH <= 0) return;

    var fitScale = Math.min(availW / measuredW, availH / measuredH);
    // Every theme sets .miniclock's font-size (and height) with !important
    // (see e.g. themes/modern-dark/modern-dark.css), which jQuery's .css()
    // cannot override - it silently no-ops, leaving the block stuck at the
    // theme's fixed font-size no matter how the block is resized. Native
    // setProperty() with 'important' priority is the only way to win that.
    $block[0].style.setProperty('font-size', (REF * fitScale) + 'px', 'important');
    $block[0].style.setProperty('height', 'auto', 'important');
  }

  function _initMiniclockFitSize(me) {
    var $mount = me.$mountPoint;
    // The topbar's miniclock (".dt-topbar-item") isn't a resizable grid/column
    // block - it's a fixed strip in the fixed-height ".colbar", themed with a
    // hard-coded "height:40px!important" that the whole bar's layout depends
    // on. It also isn't wrapped by ".dt-grid-item", so the grid/non-grid
    // branch below would fall back to measuring ".dt_block" itself - an
    // elastic flex item whose size *is* the font-size we're about to set,
    // which re-triggers the ResizeObserver into a runaway growth loop (grows
    // past the bar on every tick, unlike the grid case, which has a hard
    // track size to measure instead). Leave the topbar clock exactly as it
    // was before this fit-to-block behavior existed.
    if ($mount.hasClass('dt-topbar-item')) return;
    var $block = $mount.find('.dt_block').first();
    if (!$block.length) return;
    // The spans start empty - main.js's setClockDateWeekday() ticks them
    // every second, but not filling them here means the very first
    // _fitMiniclockSize() call above would measure zero-width text. Fill
    // them with the real values immediately, matching setClockDateWeekday()'s
    // own format, the same fix js/components/basicclock.js uses.
    $block.find('.clock').text(
      moment()
        .locale(settings['language'])
        .format(settings['hide_seconds'] ? settings['shorttime'] : settings['longtime'])
    );
    $block.find('.date').text(
      moment().locale(settings['language']).format(settings['longdate'])
    );
    $block.find('.weekday').text(
      moment().locale(settings['language']).format(settings['weekday'])
    );

    _fitMiniclockSize(me);

    // Keep the text size in sync with live editor drag-resizing (grid
    // row/column span, classic column width) and not just after a
    // save+reload - same ResizeObserver pattern as js/components/dial.js.
    // Observing the *outer* mount point (rather than the inner .dt_block
    // that _fitMiniclockSize() resizes) avoids the observer reacting to
    // its own writes.
    if (typeof ResizeObserver !== 'undefined' && $mount && $mount.length) {
      me.miniclockResizeObserver = new ResizeObserver(function () {
        _fitMiniclockSize(me);
      });
      me.miniclockResizeObserver.observe($mount[0]);
    }
  }

  function renderClock(me) {
    return (
      '<div data-id="clock" class="transbg block_' +
      me.block.type +
      ' col-xs-' +
      me.block.width +
      ' text-center">' +
      '<h1 class="clock"></h1><h4 class="weekday"></h4><h4 class="date"></h4>' +
      '</div>'
    );
  }

  function renderResponsiveClock(me) {
    return (
      '<div data-id="clock" class="transbg block_' +
      me.block.type +
      ' col-xs-' +
      me.block.width +
      ' text-center responsive" style="height:250px;">' +
      '<div class="col no-icon"><h2 class="clock"></h1><h4 class="weekday my-4"></h4><h4 class="date"></h4></div>' +
      '</div>'
    );
  }

  function loadWeatherScript(callback) {
    $.ajax({
      url: 'js/weather.js',
      dataType: 'script',
      success: callback,
      error: function () {
        console.error('Failed to load weather.js');
      },
    });
  }

  function renderWeather(me) {
    function doRender() {
      var fixedHeight = parseInt(me.block.height, 10);
      var heightClass = fixedHeight > 0 ? ' fixedheight' : '';
      var heightStyle =
        fixedHeight > 0
          ? ' style="height:' + fixedHeight + 'px !important"'
          : '';
      me.$mountPoint.html(
        '<div data-id="weather" class="mh transbg dt_block block_' +
          me.block.type +
          ' col-xs-' +
          me.block.width +
          ' containsweatherfull' +
          heightClass +
          '"' +
          heightStyle +
          '></div>'
      );
      if (settings['wu_api'] && settings['wu_city']) {
        loadWeatherFull(settings['wu_city'], settings['wu_country']);
      } else {
        me.$mountPoint
          .find('.containsweatherfull')
          .html('<div class="dt_state">' + language.misc.wu_settings_missing + '</div>');
      }
    }
    if (typeof loadWeatherFull !== 'function') {
      loadWeatherScript(doRender);
    } else {
      doRender();
    }
  }

  function renderCurrentWeather(me) {
    if (settings['wu_api'] !== '' && settings['wu_city'] !== '') {
      function doRender() {
        me.$mountPoint.html(
          '<div data-id="currentweather" class="mh transbg block_' +
            me.block.type +
            ' col-xs-' +
            me.block.width +
            ' containsweather">' +
            '<div class="col-xs-4"><div class="weather" id="weather"></div></div>' +
            '<div class="col-xs-8"><strong class="title weatherdegrees" id="weatherdegrees"></strong><br /><span class="weatherloc" id="weatherloc"></span></div>' +
            '</div>'
        );
        loadWeather(settings['wu_city'], settings['wu_country']);
      }
      if (typeof loadWeather !== 'function') {
        loadWeatherScript(doRender);
      } else {
        doRender();
      }
    }
  }

  function renderCurrentWeather_big(me) {
    if (settings['wu_api'] !== '' && settings['wu_city'] !== '') {
      function doRender() {
        me.$mountPoint.html(
          '<div data-id="currentweather_big" class="mh transbg big block_' +
            me.block.type +
            ' col-xs-' +
            me.block.width +
            ' containsweather">' +
            '<div class="col-xs-1"><div class="weather" id="weather"></div></div>' +
            '<div class="col-xs-11"><span class="title weatherdegrees" id="weatherdegrees"></span> <span class="weatherloc" id="weatherloc"></span></div>' +
            '</div>'
        );

        loadWeather(settings['wu_city'], settings['wu_country']);
      }
      if (typeof loadWeather !== 'function') {
        loadWeatherScript(doRender);
      } else {
        doRender();
      }
    }
  }

  
  function renderSpotify(me) {
    me.$mountPoint.html('');
    getSpotify(me.mountPoint, me.block);
  }

  function renderTrafficMap(me) {
    return (
      '<div data-id="trafficmap" class="mh transbg block_trafficmap col-xs-' +
      me.block.width +
      '"><div id="trafficm" class="trafficmap"></div></div>'
    );
  }

  function renderSunrise(me) {
    var isBar = me.block._dashticzColumn === 'bar';
    var classes = 'block_' + me.block.type;
    var width = isBar ? 2 : me.block.width;
    classes += ' col-xs-' + width;
    if (!isBar) classes += ' transbg';
    classes += ' text-center sunriseholder';
    // This renderer builds its own flat markup instead of going through
    // getContainer()/getColIcon()/renderTitle() (js/dashticz.js) like every
    // other block, so the Widget Editor's Icon/Title checkboxes - which do
    // save block.icon/block.title/block.hide_title correctly - were never
    // actually painted anywhere. Icon and title are combined into one small
    // header row above the sunrise/sunset line - like the top-of-block
    // placement every other device/widget uses - instead of reusing
    // getColIcon()'s floated .col-icon (sized/positioned for a .dt_block's
    // flex layout, which sunriseholder deliberately isn't - see the
    // .dt-grid-item > .sunriseholder rule in creative.css) or .dt_title
    // (150% font-size, meant for a full-size widget header, not this small,
    // single-line, centered tile). The sunrise/sunset line is wrapped in its
    // own .sunrise-data div so grid mode's flex-direction: column on
    // .sunriseholder stacks exactly two rows (header, data) instead of
    // flexing every individual icon/span in both rows side by side.
    var icon = me.block.icon;
    var showTitle = !me.block.hide_title && me.block.title;
    var hasHeader = !!(icon || showTitle);
    // With no header, the sunrise/sunset line stays the block's only
    // content and should keep sitting vertically centered in a tall grid
    // cell (the original behaviour); only a header pins the block's
    // content to the top like every other device/widget - see the
    // .sunriseholder.sunrise-has-header grid rule in creative.css.
    if (hasHeader) classes += ' sunrise-has-header';
    var html = '<div data-id="sunrise" class="' + classes + '">';
    if (hasHeader) {
      html += '<div class="sunrise-header">';
      if (icon) html += '<em class="' + icon + '"></em> ';
      if (showTitle) html += '<strong class="title">' + me.block.title + '</strong>';
      html += '</div>';
    }
    html +=
      '<div class="sunrise-data">' +
      '<em class="wi wi-sunrise"></em><span class="sunrise"></span><em class="wi wi-sunset"></em><span class="sunset"></span>' +
      '</div></div>';
    return html;
  }

  function renderHorizon() {
    var html = '<div data-id="horizon" class="containshorizon">';
    html +=
      '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E0x07\')">';
    html += '<em class="fas fa-chevron-left fa-small"></em>';
    html += '</div>';
    html +=
      '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E4x00\')">';
    html += '<em class="fas fa-pause fa-small"></em>';
    html += '</div>';
    html +=
      '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E0x06\')">';
    html += '<em class="fas fa-chevron-right fa-small"></em>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function renderSonar(me) {
    return loadSonarr(me);
  }

  function renderFullScreen(me) {
    return (
      '<div data-id="fullscreen" class="col-xs-' +
      me.block.width +
      ' text-right">' +
      getFullScreenIcon() +
      '</div>'
    );
  }

  function renderEmpty(me) {
    return (
      '<div data-id="' +
      me.block.key +
      '" class="mh transbg col-xs-' +
      me.block.width +
      '">'
    );
  }

  function renderCurrency(me) {
    var html =
      '<div class="col-xs-' +
      me.block.width +
      ' transbg coins-' +
      me.block.key +
      '" data-id="coins.' +
      me.block.key +
      '"></div>';
    me.$mountPoint.html(html);
    getCoin(me.block);
  }

  function renderMaps(me) {
    return loadMaps(me.block.key, me.block);
  }

  function renderMoon(me) {
    
    me.block.btnimage='moon';
   var html =
      '<div class="col-xs-' +
      me.block.width +
      ' moon' +
      '" data-id="' +
      me.block.key + 
      '">' +
      DT_button.defaultContent(me) +
      '</div>';
    return html;
//    me.$mountPoint.find('.dt_state').html(DT_button.defaultContent(me));
    //return DT_button.defaultContent(me);
  }
})();

Dashticz.register(DT_simpleblock);
