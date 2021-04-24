/* global Dashticz DT_function getFullScreenIcon settings loadWeather loadWeatherFull getSpotify*/
//# sourceURL=js/components/simpleblock.js
var DT_simpleblock = (function () {
  var simpleBlocks = {
    logo: {
      defaultWidth: 2,
      render: renderLogo,
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
    currentweather: {
      script: 'js/weather.js',
      render: renderCurrentWeather,
    },
    currentweather_big: {
      script: 'js/weather.js',
      render: renderCurrentWeather_big,
    },
/*
    weather_owm: {
      script: 'js/weather_owm.js',
      render: renderWeather_owm,
    },
    currentweather_owm: {
      script: 'js/weather_owm.js',
      render: renderCurrentWeather_owm,
    },
    currentweather_big_owm: {
      script: 'js/weather_owm.js',
      render: renderCurrentWeather_big_owm,
    },
    */
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
        DT_function.loadScript(script).then(function () {
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
    return (
      '<div data-id="logo" class="logo col-xs-' +
      me.block.width +
      '">' +
      settings['app_title'] +
      '</div>'
    );
  }

  function renderSettings(me) {
    var icons = ['settings', 'fullscreen'];
    if (typeof settings['settings_icons'] !== 'undefined') {
      icons = settings['settings_icons'];
    }
    var content =
      '<div class="col-xs-' +
      me.block.width +
      ' text-right" data-toggle="modal">';
    for (var i = 0; i < icons.length; i++) {
      switch (icons[i]) {
        case 'settings':
          content +=
            '<span class="settings settingsicon" data-id="settings" data-target="#settingspopup" data-toggle="modal"><em class="fas fa-cog"></em> </span>';
          break;

        case 'fullscreen':
          $.ajax({
            url: 'js/fullscreen.js',
            async: false,
            dataType: 'script',
          });
          content += getFullScreenIcon();
          break;
      }
    }
    content += '</div>';
    return content;
  }

  function renderMiniclock(me) {
    return (
      '<div data-id="miniclock" class="miniclock col-xs-' +
      me.block.width +
      ' text-center">' +
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

  function renderWeather(me) {
    if (typeof loadWeatherFull !== 'function') {
      $.ajax({
        url: 'js/weather.js',
        async: false,
        dataType: 'script',
      });
    }
    me.$mountPoint.html(
      '<div data-id="weather" class="block_' +
        me.block.type +
        ' containsweatherfull"></div>'
    );
    if (settings['wu_api'] !== '' && settings['wu_city'] !== '')
      loadWeatherFull(settings['wu_city'], settings['wu_country']);
  }

  function renderCurrentWeather(me) {
    if (settings['wu_api'] !== '' && settings['wu_city'] !== '') {
      if (typeof loadWeather !== 'function') {
        $.ajax({
          url: 'js/weather.js',
          async: false,
          dataType: 'script',
        });
      }
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
  }

  function renderCurrentWeather_big(me) {
    if (settings['wu_api'] !== '' && settings['wu_city'] !== '') {
      if (typeof loadWeather !== 'function') {
        $.ajax({
          url: 'js/weather.js',
          async: false,
          dataType: 'script',
        });
      }
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
  }

  function renderWeather_owm(me) {
    if (typeof loadWeatherFull !== 'function') {
      $.ajax({
        url: 'js/weather_owm.js',
        async: false,
        dataType: 'script',
      });
    }
    me.$mountPoint.html(
      '<div data-id="weather" class="block_' +
        me.block.type +
        ' containsweatherfull"></div>'
    );
    if (settings['owm_api'] !== '' && settings['owm_city'] !== '')
      loadWeatherFull(
        settings['owm_city'],
        settings['owm_country'],
        $('.weatherfull')
      );
  }

  function renderCurrentWeather_owm(me) {
    if (settings['owm_api'] !== '' && settings['owm_city'] !== '') {
      if (typeof loadWeather !== 'function') {
        $.ajax({
          url: 'js/weather_owm.js',
          async: false,
          dataType: 'script',
        });
      }

      me.$mountPoint.html(
        '<div data-id="currentweather" class="mh transbg block_' +
          me.block.type +
          ' col-xs-' +
          me.width +
          ' containsweather">' +
          '<div class="col-xs-4"><div class="weather" id="weather"></div></div>' +
          '<div class="col-xs-8"><strong class="title weatherdegrees" id="weatherdegrees"></strong><br /><span class="weatherloc" id="weatherloc"></span></div>' +
          '</div>'
      );
      loadWeather(settings['owm_city'], settings['owm_country']);
    }
  }

  function renderCurrentWeather_big_owm(me) {
    if (settings['owm_api'] !== '' && settings['owm_city'] !== '') {
      if (typeof loadWeather !== 'function') {
        $.ajax({
          url: 'js/weather_owm.js',
          async: false,
          dataType: 'script',
        });
      }
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

      loadWeather(settings['owm_city'], settings['owm_country']);
    }
  }

  function renderSpotify(me) {
    me.$mountPoint.html('');
    getSpotify(me.mountPoint);
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

  function renderHorizon(me) {
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
    return loadSonarr();
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
    return DT_button.defaultContent(me);
  }
})();

Dashticz.register(DT_simpleblock);
