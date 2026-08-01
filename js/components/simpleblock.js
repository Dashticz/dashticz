/* global Dashticz DT_function getFullScreenIcon settings loadWeather loadWeatherFull getSpotify DT_button loadSonarr getCoin loadMaps DashticzDeviceEditor DashticzWidgetEditor DashticzLayoutEditor isCustomConfigMode setConfigMode language DashticzScreenSwitcher */
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
    var content =
      '<div class="col-xs-' +
      me.block.width +
      ' text-right topbar-settings-wrap">';
    content +=
      '<span class="settings config-mode-switch" role="group" aria-label="Config mode">' +
      '<button type="button" class="config-mode-btn' +
      (customMode ? ' active' : '') +
      '" data-mode="custom" title="' +
      modeLabelCustom +
      '">' +
      modeLabelCustom +
      '</button>' +
      '<button type="button" class="config-mode-btn' +
      (!customMode ? ' active' : '') +
      '" data-mode="wizard" title="' +
      modeLabelWizard +
      '">' +
      modeLabelWizard +
      '</button></span>';
    for (var i = 0; i < icons.length; i++) {
      switch (icons[i]) {
        case 'settings':
          if (!customMode) {
            content +=
              '<span class="settings deviceeditoricon" data-id="deviceeditor" ' +
              'role="button" aria-label="Open device editor" title="Devices toevoegen">' +
              _topbarIconHtml('fas fa-plus', 'img/icons/Plus.png') + '</span>';
            content +=
              '<span class="settings widgeteditoricon" data-id="widgeteditor" ' +
              'role="button" aria-label="Open widget editor" title="Widgets toevoegen">' +
              _topbarIconHtml('fas fa-puzzle-piece', 'img/icons/Puzzle.png') + '</span>';
            content +=
              '<span class="settings layouteditoricon" data-id="layouteditor" ' +
              'role="button" aria-label="Open visual layout editor" title="Tegels verplaatsen en schalen">' +
              _topbarIconHtml('fas fa-arrows-alt', 'img/icons/Arrows.png') + '</span>';
          }
          content +=
            '<span class="settings settingsicon" data-id="settings" ' +
            'data-bs-target="#settingspopup" data-bs-toggle="modal" ' +
            'role="button" aria-label="Open settings" title="Instellingen">' +
            _topbarIconHtml('fas fa-cog', 'img/icons/Cog.png') + '</span>';
          if (!customMode) {
            _registerDeviceEditorClick();
            _registerWidgetEditorClick();
            _registerLayoutEditorClick();
            _openPendingGridEditor();
          }
          _registerConfigModeClick();
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
    if (Number(settings['topbar_use_png_icons']) === 1) {
      return '<img src="' + imgSrc + '" class="dt-topbar-icon-img" aria-hidden="true" alt="">';
    }
    return '<i class="' + faClass + '" aria-hidden="true"></i>';
  }

  function _registerConfigModeClick() {
    $(document)
      .off('click.configmode')
      .on('click.configmode', '.config-mode-btn', function () {
        var mode = String($(this).data('mode') || 'wizard');
        var currentMode =
          typeof isCustomConfigMode === 'function' && isCustomConfigMode()
            ? 'custom'
            : 'wizard';
        if (mode === currentMode) return;
        if (mode === 'wizard') {
          if (
            !window.confirm(
              'Wizard gebruikt altijd een vrije grid-layout. Het huidige columns-scherm wordt geconverteerd voordat Wizard wordt ingeschakeld. Doorgaan?'
            )
          ) {
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
          return;
        }
        if (typeof setConfigMode === 'function') {
          setConfigMode(mode);
        }
      });
  }

  function _registerDeviceEditorClick() {
    $(document).off('click.deviceeditor').on('click.deviceeditor', '.deviceeditoricon', function () {
      DT_function.loadDTScript('js/deviceeditor.js').then(function () {
        DashticzDeviceEditor.open();
      });
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

  function _registerLayoutEditorClick() {
    $(document)
      .off('click.layouteditoricon')
      .on('click.layouteditoricon', '.layouteditoricon', function () {
        DT_function.loadDTScript('js/layouteditor.js').then(function () {
          DashticzLayoutEditor.open();
        });
      });
  }

  function _registerWidgetEditorClick() {
    $(document)
      .off('click.widgeteditor')
      .on('click.widgeteditor', '.widgeteditoricon', function () {
        DT_function.loadDTScript('js/widgeteditor.js').then(function () {
          DashticzWidgetEditor.open();
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
      '<div data-id="miniclock" class="miniclock mh dt_block col-xs-' +
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
          .html('<div class="dt_state">Weather Underground-instellingen ontbreken.</div>');
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
    var isBar = me.block.c === 'bar';
    var classes = 'block_' + me.block.type;
    var width = isBar ? 2 : me.block.width;
    classes += ' col-xs-' + width;
    if (!isBar) classes += ' transbg';
    classes += ' text-center sunriseholder';
    return (
      '<div data-id="sunrise" class="' +
      classes +
      '">' +
      '<em class="wi wi-sunrise"></em><span class="sunrise"></span><em class="wi wi-sunset"></em><span class="sunset"></span>' +
      '</div>'
    );
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
