/* global Dashticz DT_function settings choose Debug number_format _TEMP_SYMBOL moment templateEngine _CORS_PATH language*/
//# sourceURL=js/components/weather.js
var DT_weather = (function () {
  var _DEBUG = false; //set to true to show different weather icons
  var windTable = [
    'N',
    'NNE',
    'NE',
    'ENE',
    'E',
    'ESE',
    'SE',
    'SSE',
    'S',
    'SSW',
    'SW',
    'WSW',
    'W',
    'WNW',
    'NW',
    'NNW',
    'N',
  ];

  return {
    name: 'weather',
    init: function () {
      DT_function.loadCSS('./js/components/weather.css');
      DT_function.loadCSS('./vendor/weather/css/weather-icons-wind.min.css')
    },
    canHandle: function (block) {
      var key = block.key;
      if (
        key === 'weather_owm' ||
        key === 'currentweather_owm' ||
        key === 'currentweather_big_owm'
      )
        return true;
    },
    defaultCfg: function (block) {
      var defaultLayout = 0;
      if (
        block.key === 'currentweather_owm' ||
        block.key === 'currentweather_big_owm'
      )
        defaultLayout = 2;
      var layout = choose(block && block.layout, defaultLayout);
      return {
        layout: defaultLayout,
        /*
        0: Day forecast
        1: Hourly forercast
        2: Now row
        3: Now column
        */
        apikey: settings['owm_api'],
        city: settings['owm_city'] || 'Amsterdam',
        country: settings['owm_country'] || 'nl',
        name: settings['owm_name'],
        lang: settings['owm_lang'] || 'nl',
        count: choose(+settings['owm_cnt'], layout < 2 ? 5 : 1), //only valid for layout 0 and 1
        //        days: choose(settings['owm_days'], true),
        interval: 1,
        refresh: 3600, //update once per hour
        icon: 'fas fa-sun',
        scale: 1,
        containerClass: 'weather_' + layout,
        decimals: 1,
        showRain: true,
        showDescription: true,
        showMin: choose(settings['owm_min'], true),
        showWind: true,
        monochrome: false,
        showDetails: true,
        showDaily: true,
        showHourly: true,
        showCurrent: true,
        useBeaufort: settings.use_beaufort || false,
        skipFirst: false,
        icons: settings.static_weathericons ? 'static' : 'line',
        iconExt: 'svg'
      };
    },
    run: function (me) {
      if (me.block.refresh < 900) me.block.refresh = 900;
      me.$block = me.$mountPoint.find('.dt_block');
    },
    refresh: function (me) {
      if (!me.block.apikey) {
        Debug.log(
          Debug.ERROR,
          'apikey not defined for weather block ' + me.block.key
        );
        return;
      }
      var w = parseInt(me.$mountPoint.width() * me.block.width / 12 * me.block.scale);
      if (me.block.scale !== 1) me.$block.css('width', w);
      var fontSize = w / 10;
      if (me.block.layout === 0 || me.block.layout === 1) {
        fontSize = fontSize / me.block.count;
      }

      me.$block.css('font-size', fontSize + 'px');
      refreshOWM(me);
    },
  };

  function refreshOWM(me) {
    requestData(me)
      .then(function () {
        return formatData(me);
      })
      .then(function () {
        return templateEngine.load('weather_' + me.block.layout);
      })
      .then(function (template) {
        var html = template(me.data);
        $(me.$block).html(html);
        addWeatherIcons(me);
      });
  }

  /** Load the data that is required for the refresh */
  function requestData(me) {
    me.data = {};
    return $.getJSON(getOWMurl(me, false), function (result) {
      me.data.weather = result;
    }).then(function () {
      return $.getJSON(getOWMurl(me, true), function (result) {
        me.data.forecast = result;
      });
    });
  }

  function formatDailyData(me) {
    //In principle we now have all data
    //Now we only have to generate the correct icons
    var start = me.block.skipFirst ? 1 : 0;
    var cntSetting = choose(me.block.countDaily, me.block.count);
    if (cntSetting + start > 7) cntSetting = 7 - start;
    var data = [];
    var daily = me.data.forecast.daily;
    for (var i = start; i < cntSetting + start; i++) {
      var dayData = {
        day: moment(daily[i].dt * 1000).format(settings['weekday']),
        min: number_format(daily[i].temp.min, me.block.decimals) + _TEMP_SYMBOL,
        max: number_format(daily[i].temp.max, me.block.decimals) + _TEMP_SYMBOL,
        description: daily[i].weather[0].description,
        rain: number_format(daily[i].rain || 0, 1),
        icon: daily[i].weather[0].icon,
        wind: {
          //          direction:
          speed: toWindStr(me, daily[i].wind_speed),
          gust: toWindStr(me, daily[i].wind_gust),
          deg: daily[i].wind_deg,
          direction: translateWindDegrees(daily[i].wind_deg),
          directionShort: translateWindDegreesShort(daily[i].wind_deg),
          icon: getWindIcon(daily[i].wind_deg),
        },
      };
      data.push(dayData);
    }
    me.data.dailyForecast = data;
    me.data.dailyCount = cntSetting;
    me.data.dailyScale = Math.round(100 / cntSetting);
    return me;
  }

  function formatHourlyData(me) {
    var start = me.block.skipFirst ? 1 : 0;
    var cntSetting = choose(me.block.countHourly, me.block.count);
    //    if (cntSetting>14) cntSetting=14;
    if ((cntSetting + start) * me.block.interval > 48)
      cntSetting = Math.floor(48.0 / me.block.interval) - start;
    var data = [];
    var hourly = me.data.forecast.hourly;
    for (var i = start; i < cntSetting + start; i++) {
      var pos = i * me.block.interval;
      var hour_data = hourly[pos];
      var rain = choose(hour_data.rain && hour_data.rain["1h"], hour_data.rain || 0);
      var dayData = {
        day: moment(hourly[pos].dt * 1000).format(settings['weekday']),
        time: moment(hourly[pos].dt * 1000).format('HH:mm'),
        temp: number_format(hourly[pos].temp, me.block.decimals) + _TEMP_SYMBOL,
        description: hourly[pos].weather[0].description,
        rain: number_format(rain, 1),
        icon: hourly[pos].weather[0].icon,
        wind: {
          //          direction:
          speed: toWindStr(me, hourly[i].wind_speed),
          gust: toWindStr(me, hourly[i].wind_gust),
          deg: hourly[i].wind_deg,
          direction: translateWindDegrees(hourly[i].wind_deg),
          directionShort: translateWindDegreesShort(hourly[i].wind_deg),
          icon: getWindIcon(hourly[i].wind_deg),
        },
      };
      data.push(dayData);
    }
    me.data.hourlyForecast = data;
    me.data.hourlyCount = cntSetting;
    me.data.hourlyScale = Math.round(100 / cntSetting);
    return me;
  }

  function formatCurrentData(me) {
    me.data.current = {
      icon: me.data.weather.weather[0].icon,
      city: me.block.name || me.data.weather.name,
      temp:
        number_format(me.data.weather.main.temp, me.block.decimals) +
        _TEMP_SYMBOL,
      max:
        number_format(me.data.forecast.daily[0].temp.max, me.block.decimals) +
        _TEMP_SYMBOL,
      min:
        number_format(me.data.forecast.daily[0].temp.min, me.block.decimals) +
        _TEMP_SYMBOL,
      rain: (me.data.weather.rain && me.data.weather.rain['1h']) || 0,
      pressure: me.data.weather.main.pressure,
      feels:
        number_format(me.data.weather.main.feels_like, me.block.decimals) +
        _TEMP_SYMBOL,
      humidity: me.data.weather.main.humidity,
      wind: {
        speed: toWindStr(me, me.data.weather.wind.speed),
        gust: toWindStr(me, me.data.weather.wind.gust),
        deg: me.data.weather.wind.deg,
        direction: translateWindDegrees(me.data.weather.wind.deg),
      },
    };
    return me;
  }

  function toWindStr(me, wind) {
    return me.block.useBeaufort
      ? toBeaufort(wind) + ' Bft'
      : number_format(wind, 1) + ' m/s';
  }

  function defaultFormatHandler(me) {
    /*We just execute them all ...*/
    formatDailyData(me);
    formatHourlyData(me);
    formatCurrentData(me);
    return me;
  }

  function formatData(me) {
    /*
        0: Day forecast
        1: Hourly forercast
        2: Now row
        3: Now details
        4: All combined
        */

    var formatHandlers = {
      0: formatDailyData,
      1: formatHourlyData,
      2: formatCurrentData,
      3: formatCurrentData,
    };
    me.data.key = me.mountPoint.slice(1);
    me.data.showRain = me.block.showRain;
    me.data.showMin = me.block.showMin;
    me.data.showDescription = me.block.showDescription;
    me.data.showDetails = me.block.showDetails;
    me.data.showCurrent = me.block.showCurrent;
    me.data.showDaily = me.block.showDaily;
    me.data.showHourly = me.block.showHourly;
    me.data.showWind = me.block.showWind;

    var formatHandler = formatHandlers[me.block.layour] || defaultFormatHandler;
    return formatHandler(me);
  }

  function isNumeric(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
  }

  function getOWMurl(me, makeForecast) {
    var city = me.block.city;
    var country = me.block.country;
    var api = me.block.apikey;
    var lang = me.block.lang;

    var subsite = makeForecast
      ? 'onecall?lat=' +
      me.data.weather.coord.lat +
      '&lon=' +
      me.data.weather.coord.lon
      : 'weather?' +
      (isNumeric(city) ? 'id=' + city : 'q=' + city + ',' + country);

    var site =
      (settings['use_cors'] ? _CORS_PATH : '') +
      'https://api.openweathermap.org/data/2.5/' +
      subsite +
      '&appid=' +
      api +
      '&lang=' +
      lang +
      '&units=' +
      (settings['use_fahrenheit'] === 1 ? 'imperial' : 'metric');
    return site;
  }

  function mountIcon(el, icon) {
    var wiclass = getIcon(icon);
    el.html('<i class="wi ' + wiclass + '"></i>');
  }



  function mountSVGIcon(me, el, icon) {
    //    var wiclass = getSVGIcon(icon);
    var predefinedIcons = ['line', 'fill', 'meteo','linestatic'];
    var path = predefinedIcons.includes(me.block.icons) ? './img' : './custom';
    var iconFileName = path + '/weathericons/' + me.block.icons + '/' + icon + '.' + me.block.iconExt;
    var imgClass = me.block.icons + (me.block.monochrome ? ' mono' : '');
    el.html('<img class="' + imgClass + '" src="' + iconFileName + '">');
  }


  function getIcon(code) {
    var wiclass = 'wi-cloudy';

    var icons = {
      clear: 'wi-day-sunny',
      rain: 'wi-rain',
      chancerain: 'wi-rain',
      cloudy: 'wi-cloudy',
      partlycloudy: 'wi-cloudy',
      tstorms: 'wi-thunderstorm',
      snow: 'wi-snow',
      //owm icons
      '01d': 'wi-day-sunny',
      '01n': 'wi-night-clear',
      '02d': 'wi-day-cloudy',
      '02n': 'wi-night-cloudy',
      '03d': 'wi-cloud',
      '03n': 'wi-cloud',
      '04d': 'wi-cloudy',
      '04n': 'wi-cloudy',
      '09d': 'wi-showers',
      '09n': 'wi-showers',
      '10d': 'wi-day-rain',
      '10n': 'wi-night-rain',
      '11d': 'wi-day-thunderstorm',
      '11n': 'wi-night-thunderstorm',
      '13d': 'wi-snow',
      '13n': 'wi-snow',
      '50d': 'wi-day-fog',
      '50n': 'wi-night-fog',
    };
    if (icons.hasOwnProperty(code)) {
      wiclass = icons[code];
    }
    return wiclass;
  }

  function addWeatherIcons(me) {
    //first cleanup
    //    return;
    //    cleanupIcons(me);

    var debugIcon = ['01d', '02n', '04d', '11n', '03d', '10n', '13d', '50n'];

    var iconlist = me.$mountPoint.find('.icon');
    iconlist.each(function (idx, el) {
      var $div = $(el);
      var icon = _DEBUG ? debugIcon[idx % debugIcon.length] : el.dataset.icon;
      idx = idx + 1;
      switch (me.block.icons) {
        case 'static': mountIcon($div, icon);
          break;
        case 'df':
          break;
        default: mountSVGIcon(me, $div, icon)

      }
    });
  }


  function getWindCode(deg) {
    /*16 direction. each 16/360=22.5 degrees*/
    var index = Math.round(deg / 22.5);
    return windTable[index];
  }

  function translateWindDegrees(deg) {
    return language.wind['direction_' + getWindCode(deg)];
  }

  function getWindIcon(deg) {
    return 'wi wi-wind wi-from-' + getWindCode(deg).toLowerCase();
  }

  function translateWindDegreesShort(deg) {
    /*16 direction. each 16/360=22.5 degrees*/
    return language.windshort['direction_' + getWindCode(deg)];
  }
})();

Dashticz.register(DT_weather);
