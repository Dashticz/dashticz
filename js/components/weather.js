/* global Dashticz DT_function settings choose Skycons Debug number_format _TEMP_SYMBOL moment templateEngine _CORS_PATH language*/
//# sourceURL=js/components/weather.js
var DT_weather = (function () {
  var skycons = 0;
  var skyconIndex = 0;

  return {
    name: 'weather',
    init: function () {
      return DT_function.loadCSS('./js/components/weather.css');
    },
    defaultCfg: function (block) {
      var layout = choose(block && block.layout, 0);
      return {
        layout: 0,
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
        count: choose(settings['owm_cnt'], layout < 2 ? 5 : 1), //only valid for layout 0 and 1
//        days: choose(settings['owm_days'], true),
        interval: 1,
        static_weathericons: settings['static_weathericons'],
        refresh: 3600, //update once per hour
        icon: 'fas fa-sun',
        scale: 1,
        containerClass: 'weather_' + layout,
        decimals: 1,
        showRain: true,
        showDescription: true,
        showMin: choose(settings['owm_min'], true),
      };
    },
    run: function (me) {
      if (me.block.refresh<60) me.block.refresh=60;
      if (!me.block.static_weathericons && !skycons) {
        //initialize Skycons
        skycons = new Skycons({ color: 'white' });
        skycons.play();
      }
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
      var w = parseInt(me.$mountPoint.width() * me.block.scale);
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
    var cntSetting = me.block.count;
    if (cntSetting > 7) cntSetting = 7;
    var data = [];
    var daily = me.data.forecast.daily;
    for (var i = 0; i < cntSetting; i++) {
      var dayData = {
        day: moment(daily[i].dt * 1000).format(settings['weekday']),
        min: number_format(daily[i].temp.min, me.block.decimals) + _TEMP_SYMBOL,
        max: number_format(daily[i].temp.max, me.block.decimals) + _TEMP_SYMBOL,
        description: daily[i].weather[0].description,
        rain: number_format(daily[i].rain || 0, 1),
        icon: daily[i].weather[0].icon,
      };
      data.push(dayData);
    }
    me.data.dailyForecast = data;
    return me;
  }

  function formatHourlyData(me) {
    var cntSetting = me.block.count;
    //    if (cntSetting>14) cntSetting=14;
    if (cntSetting * me.block.interval > 48)
      cntSetting = Math.floor(48.0 / me.block.interval);
    var data = [];
    var hourly = me.data.forecast.hourly;
    for (var i = 0; i < cntSetting; i++) {
      var pos = i * me.block.interval;
      var dayData = {
        day: moment(hourly[pos].dt * 1000).format(settings['weekday']),
        time: moment(hourly[pos].dt * 1000).format('HH:mm'),
        temp: number_format(hourly[pos].temp, me.block.decimals) + _TEMP_SYMBOL,
        description: hourly[pos].weather[0].description,
        rain: number_format(hourly[pos].rain || 0, 1),
        icon: hourly[pos].weather[0].icon,
      };
      data.push(dayData);
    }
    me.data.hourlyForecast = data;
    return me;
  }

  function formatCurrentData(me) {
    me.data.current = {
      icon: me.data.weather.weather[0].icon,
      city: me.block.name || me.data.weather.name,
      temp: number_format(me.data.weather.main.temp, me.block.decimals) + _TEMP_SYMBOL,
      max: number_format(me.data.forecast.daily[0].temp.max, me.block.decimals) + _TEMP_SYMBOL,
      min: number_format(me.data.forecast.daily[0].temp.min, me.block.decimals) + _TEMP_SYMBOL,
      rain: (me.data.weather.rain && me.data.weather.rain['1h']) || 0,
      pressure: me.data.weather.main.pressure,
      feels: number_format(me.data.weather.main.feels_like, me.block.decimals) + _TEMP_SYMBOL,
      humidity: me.data.weather.main.humidity,
      wind: {
        speed: number_format(me.data.weather.wind.speed, 1),
        gust: number_format(me.data.weather.wind.gust, 1),
        deg: me.data.weather.wind.deg,
        direction: translateWindDegrees(me.data.weather.wind.deg),
      }
    }
    return me
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
        3: Now column
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

  // eslint-disable-next-line no-unused-vars
  function loadWeatherFullOwm(me) {
    $.getJSON(getOWMurl(me), function (currentforecast) {
      var cntSetting = me.block.count;
      var days = me.block.days;
      if (cntSetting > 40) cntSetting = 40;
      if (cntSetting > 5 && days == 1) cntSetting = 5;
      var curfull = me.$block;
      curfull.removeClass('transbg');

      var html = '';
      var icons = [];
      if (typeof currentforecast.list === 'undefined') {
        curfull.html('');
        return;
      }
      var start = 0;

      if (!days) {
        //torov5
        for (var i = start; i < start + cntSetting; i++) {
          var curfor = currentforecast.list[i];
          var date = moment
            .unix(curfor.dt)
            .locale(settings['calendarlanguage']);
          var temp = curfor.main.temp;

          var rain = 0;
          if (typeof curfor.rain !== 'undefined') {
            if (typeof curfor.rain['3h'] !== 'undefined') {
              rain = curfor.rain['3h'];
            }
          }
          html +=
            '<div id=' +
            getWeatherDayId(me, i) +
            '" class="weatherday transbg">' +
            '<div class="day">' +
            date.format('HH') +
            ':' +
            date.format('mm') +
            //            '<br />' +
            //            date.format(settings['weekday']) +
            '</div>';
          var iconid = getIconId(me, i);
          icons.push(curfor.weather[0].icon);
          html += '<div id="' + iconid + '" class="icon"></div>';
          html +=
            '<div class="temp"><span class="av_temp">' +
            Math.round(temp) +
            _TEMP_SYMBOL +
            '</span><br /><span class="sub">' +
            Math.round(rain * 100) / 100 +
            ' mm' +
            '</span></div>' +
            '</div>';
        }
        html += '</div>';
      } else {
        var fcNumber = currentforecast.cnt;
        var minTemp = [199, 199, 199, 199, 199];
        var tempTemp = 199;
        var x = -1;
        for (i = 0; i < fcNumber; i++) {
          curfor = currentforecast.list[i];
          date = moment.unix(curfor.dt).locale(settings['calendarlanguage']);
          temp = curfor.main.temp;
          if (
            date.format('HH') == '00' ||
            date.format('HH') == '01' ||
            date.format('HH') == '02'
          ) {
            if (x > -1) minTemp[x] = tempTemp;
            tempTemp = 199;
          }
          if (temp < tempTemp) tempTemp = temp;
          if (
            date.format('HH') == '12' ||
            date.format('HH') == '13' ||
            date.format('HH') == '14'
          )
            x++;
        }
        if (minTemp[4] == 199) minTemp[4] = tempTemp;

        i = 0;
        while (start < fcNumber && i < me.block.count) {
          curfor = currentforecast.list[start];
          date = moment.unix(curfor.dt).locale(settings['calendarlanguage']);
          if (
            date.format('HH') == '12' ||
            date.format('HH') == '13' ||
            date.format('HH') == '14'
          ) {
            temp = curfor.main.temp;
            var Wdescription = curfor.weather[0].description;
            rain = 0;
            if (typeof curfor.rain !== 'undefined') {
              if (typeof curfor.rain['3h'] !== 'undefined') {
                rain = curfor.rain['3h'];
              }
            }
            html +=
              '<div id=' +
              getWeatherDayId(me, i) +
              '" class="weatherday transbg">' +
              '<div class="day">' +
              date.format(settings['weekday']) +
              '</div>';
            var iconid = getIconId(me, i);
            icons.push(curfor.weather[0].icon);
            html += '<div id="' + iconid + '" class="icon"></div>';
            html +=
              '<div class="day owmdescription">' + Wdescription + '</div>';
            html +=
              '<div class="temp"><span class="av_temp">' +
              Math.round(temp) +
              _TEMP_SYMBOL +
              '</div>';
            if (settings['owm_min'] === 1)
              html +=
                '<div class="temp"><span class="sub">' +
                Math.round(minTemp[i]) +
                _TEMP_SYMBOL +
                '</div></div>';

            i++;
          }
          start++;
        }
      }
      curfull.html(html);
      addIcons(me, icons);
    });
  }

  function addIcons(me, icons) {
    icons.forEach(function (icon, i) {
      var $div = $('#' + getIconId(me, i));
      if (me.block.static_weathericons) {
        mountIcon($div, icon);
      } else getSkycon($div, icon, 'skycon');
    });
  }

  function getIconId(me, i) {
    return me.mountPoint.slice(1) + '-icon' + i;
  }

  function getWeatherDayId(me, i) {
    return me.mountPoint.slice(1) + '-weather' + i;
  }

  function mountIcon(el, icon) {
    var wiclass = getIcon(icon);
    el.html('<i class="wi ' + wiclass + '"></i>');
  }

  function getSkycon(el, code, classname) {
    var icon = 'PARTLY_CLOUDY_DAY';
    var icons = {
      chanceflurries: 'WIND',
      chancerain: 'RAIN',
      chancesleet: 'SLEET',
      chancesnow: 'SNOW',
      chancetstorms: 'WIND',
      clear: 'CLEAR_DAY',
      cloudy: 'CLOUDY',
      flurries: 'WIND',
      fog: 'FOG',
      hazy: 'PARTLY_CLOUDY_DAY',
      mostlycloudy: 'CLOUDY',
      mostlysunny: 'CLEAR_DAY',
      partlycloudy: 'PARTLY_CLOUDY_DAY',
      partlysunny: 'PARTLY_CLOUDY_DAY',
      sleet: 'SLEET',
      rain: 'RAIN',
      snow: 'SNOW',
      sunny: 'CLEAR_DAY',
      tstorms: 'WIND',
      //OWM skycons:
      '01d': 'CLEAR_DAY',
      '01n': 'CLEAR_NIGHT',
      '02d': 'PARTLY_CLOUDY_DAY',
      '02n': 'PARTLY_CLOUDY_NIGHT',
      '03d': 'CLOUDY',
      '03n': 'CLOUDY',
      '04d': 'CLOUDY',
      '04n': 'CLOUDY',
      '09d': 'RAIN',
      '09n': 'RAIN',
      '10d': 'RAIN',
      '10n': 'RAIN',
      '11d': 'WIND',
      '11n': 'WIND',
      '13d': 'SNOW',
      '13n': 'SNOW',
      '50d': 'FOG',
      '50n': 'FOG',
    };
    if (icons.hasOwnProperty(code)) {
      icon = icons[code];
    }

    var skycon =
      '<canvas class="' +
      classname +
      '" data-icon="' +
      icon +
      '" id="icon' +
      skyconIndex +
      '"></canvas>';
    el.html(skycon);
    skycons.set('icon' + skyconIndex, Skycons[icon]);
    skyconIndex += 1;
    //return skycon;
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
    var iconlist = me.$mountPoint.find('.icon');
    iconlist.each(function (idx, el) {
      var $div = $(el);
      var icon = el.dataset.icon;
      if (me.block.static_weathericons) {
        mountIcon($div, icon);
      } else getSkycon($div, icon, 'skycon');
    });
  }


  function translateWindDegrees(deg) {
    /*16 direction. each 16/360=22.5 degrees*/
    var windTable = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW','N'];
    var index = Math.round(deg/22.5);
    var wind=windTable[index];
    return language.wind['direction_'+wind];
  }
})();

Dashticz.register(DT_weather);
