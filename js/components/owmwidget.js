/* global Dashticz DT_function  settings Debug  _CORS_PATH*/
//# sourceURL=js/components/owmwidget.js
var DT_owmwidget = (function () {

    var dimensions = {
        1: {x: 690, y:234},
        2: {x: 234, y:234},
        3: {x: 180, y:75},
        4: {x: 210, y:75},
        5: {x: 300, y:228},
        6: {x: 120, y:171},
        7: {x: 120, y:207},
        8: {x: 300, y:60},
        9: {x: 300, y:60},
        11: {x: 690, y:234},
        12: {x: 235, y:240},
        13: {x: 180, y:75},
        14: {x: 210, y:75},
        15: {x: 300, y:228},
        16: {x: 120, y:171},
        17: {x: 120, y:207},
        18: {x: 300, y:60},
        19: {x: 300, y:60},
        21: {x: 690, y:234},
        22: {x: 235, y:240},
        23: {x: 180, y:75},
        24: {x: 210, y:75},

    }
  return {
    name: 'owmwidget',
    init: function () {
            return DT_function.loadScript('//openweathermap.org/themes/openweathermap/assets/vendor/owm/js/d3.min.js');
    },
    defaultCfg: function (block) {
      var layout = block.layout || 11;
      return {
        layout: layout,
        /*
          0: Day forecast
          1: Today forecast
          2: Now row
          3: Now column
          */
        apikey: settings['owm_api'],
        city: settings['owm_city'] || 'Amsterdam',
        country: settings['owm_country'] || 'nl',
        lang: settings['owm_lang'] || 'nl',
        refresh: 3600, //update once per hour
        scale: 1,
        containerClass: 'weather_' + layout,
      };
    },
    run: function (me) {
      me.$block = me.$mountPoint.find('.dt_block');
      if (!me.block.apikey) {
        Debug.log(
          Debug.ERROR,
          'apikey not defined for weather block ' + me.block.key
        );
        return;
      }
      me.cityIdPromise = getCityId(me);
      me.containerid = me.mountPoint.slice(1)+'_owmwidget';
      me.$block.html('<div id="'+me.containerid+'"></div>');
    },
    refresh: function (me) {
      var w = parseInt(me.$mountPoint.width() * me.block.scale);
      if (me.block.scale !== 1) me.$block.css('width', w);
      var fontSize = w / 10;

      me.$block.css('font-size', fontSize + 'px');
      var dimension = dimensions[me.block.layout];
      if(dimension) {
        var bw=me.$block.width();
        var scale = 1.0*me.$block.width()/dimension.x;
        $('#'+me.containerid).css('transform','scale('+scale+')').css('transform-origin','top left');
        me.$block.css('height', dimension.y * scale+30);
      }
      refreshOWM(me);
    },
  };

  function getCityId(me) {
    if (!isNaN(+me.block.city)) {
      return $.Deferred().resolve(+me.block.city);
    }
    return $.getJSON(getOWMurl(me, false)).then(function (result) {
      return result.id;
    });
  }

  function refreshOWM(me) {
    me.cityIdPromise.then(function (res) {
      me.cityId = res;
      getOWMWidget(me);
    });
  }

  function getOWMWidget(me) {
    window.myWidgetParam ? window.myWidgetParam : (window.myWidgetParam = []);
    window.myWidgetParam.push({
      id: me.block.layout,
      cityid: me.cityId,
      appid: me.block.apikey,
      units: 'metric',
      containerid: me.containerid,
      lang: me.block.lang
    });
    DT_function.loadScript('//openweathermap.org/themes/openweathermap/assets/vendor/owm/js/weather-widget-generator.js');
  }

  function getOWMurl(me, makeForecast) {
    var city = me.block.city;
    var country = me.block.country;
    var api = me.block.apikey;
    var lang = me.block.lang;

    var site =
      (settings['use_cors'] ? _CORS_PATH : '') +
      'https://api.openweathermap.org/data/2.5/' +
      (makeForecast ? 'forecast' : 'weather') +
      '?';
    if (isNumeric(city)) site += 'id=' + city;
    else site += 'q=' + city + ',' + country;
    site += '&appid=' + api + '&lang=' + lang;
    if (settings['use_fahrenheit'] === 1) {
      site += '&units=imperial';
    } else {
      site += '&units=metric';
    }
    return site;
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }
})();

Dashticz.register(DT_owmwidget);
