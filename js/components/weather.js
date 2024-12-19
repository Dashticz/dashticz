/* global Dashticz DT_function settings choose Debug number_format _TEMP_SYMBOL moment templateEngine _CORS_PATH language infoMessage toBeaufort*/
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
      DT_function.loadCSS('./vendor/weather/css/weather-icons-wind.min.css');
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
        showGust: true,
        monochrome: false,
        showDetails: true,
        showDaily: true,
        showHourly: true,
        showCurrent: true,
        showForecast: true, //only for KNMI
        useBeaufort: settings.use_beaufort || false,
        skipFirst: false,
        icons: settings.static_weathericons ? 'static' : 'line',
        iconExt: 'svg',
        //        provider: 'owm'
        rows: 1
      };
    },
    run: function (me) {
      if (me.block.refresh < 900) me.block.refresh = 900;
      me.$block = me.$mountPoint.find('.dt_block');
      me.runPromise = findProviders(me).then(function () {
        if (me.provider === 'owm3') {
          return getLatLon(me)
            .catch(function (res) {
              //      var errorTxt = 'Error getting latlon data from OWM. Check API key';
              var errorTxt = "Status " + res.status + ': ' + res.responseJSON && res.responseJSON.message;
              console.log(errorTxt);
              infoMessage('Weather', errorTxt);
              me.$mountPoint.find('.dt_state').html('<div style="font-size:30%">' + errorTxt + '</div>');
            });
        }
      });
    },
    refresh: function (me) {
      /*      if (!me.block.apikey) {
              Debug.log(
                Debug.ERROR,
                'apikey not defined for weather block ' + me.block.key
              );
              return;
            }*/
      var w = parseInt(me.$mountPoint.width() * me.block.width / 12 * me.block.scale);
      if (me.block.scale !== 1) me.$block.css('width', w);
      var fontSize = w / 10;
      if (me.block.layout === 0 || me.block.layout === 1) {
        fontSize = fontSize / Math.ceil(me.block.count/me.block.rows);
      }
      me.$block.css('font-size', fontSize + 'px');
      if(me.block.rows>1) {
        /*
        display: grid;
    grid-template-rows: repeat(2, max-content);
    grid-auto-flow: column;
    gap: 0.5rem;
    */
        me.$block.css({
          display: 'grid',
          'grid-template-rows': 'repeat('+me.block.rows+', max-content)',
          'grid-auto-flow': 'column',
          gap: '0.5rem'
        })
      }
      me.runPromise
        .then(function () {
          return refreshProvider(me);
        })
        .catch(function (err) {
          me.$mountPoint.find('.dt_state').html('<div style="font-size:50%">' + err + '</div>');
        });
    }
  }

  function findProviders(me) {
    var key = me.block.apikey
    var providers = [
      {
        id: 'owm3',
        url: 'https://api.openweathermap.org/data/3.0/onecall?appid=' + key
      },
      {
        id: 'owm',
        url: 'https://api.openweathermap.org/data/2.5/onecall?appid=' + key
      },
      {
        id: 'owmfree',
        url: 'https://api.openweathermap.org/data/2.5/forecast?appid=' + key
      },
      {
        id: 'knmi',
        url: 'https://weerlive.nl/api/json-data-10min.php?locatie=amsterdam&key=' + key,
        json: 'liveweer'
      },
    ]
    var findProviderPromise = providers.reduce(function (acc, provider) {
      return acc.then(function (res) {
        if (res) return res;
        console.log('test weather provider ' + provider.id);
        return DT_function.cached(provider.url, $.getJSON).then(function (data) {
          if (data[provider.json]) { //we have a certain json key (currently for knmi)
            console.log('Valid API key for weather provider: ' + provider.id);
            return provider.id
          }
        })
          .catch(function (xhr, textStatus) {
            if (xhr.status && xhr.status === 400) {//we have a valid api (for owm apis)
              console.log('Valid API key for weather provider: ' + provider.id);
              return provider.id
            }
          })
      })
    }, $.Deferred().resolve(me.block.provider));

    return findProviderPromise.then(
      function (res) {
        if (res) me.provider = res
        else {
          console.error('No valid weather provider found');
          me.$mountPoint.find('.dt_state').html('<div style="font-size:50%">' + 'No valid weather API key.' + '</div>');
        }
      }
    )

  }

  function refreshProvider(me) {
    switch (me.provider) {
      case 'knmi':
      case 'KNMI':
        return refreshKNMI(me);
      case 'owm3':
        return refreshOWM3(me);
      default:
        return refreshOWM(me);
    }
  }

  function getLatLon(me) {
    if (me.block.lat && me.block.lon) {
      me.lat = me.block.lat;
      me.lon = me.block.lon;
      return $.Deferred().resolve();
    }
    var url = 'http://api.openweathermap.org/geo/1.0/direct?q=' +
      me.block.city + ', ' + me.block.country +
      '&limit=1&appid=' + me.block.apikey;
    return $.ajax(url).then(function (res) {
      if (res && res[0] && res[0].name) {
        me.lat = res[0].lat;
        me.lon = res[0].lon;
      }
    })
  }

  function refreshKNMI(me) {
    return requestKNMIData(me)
      .then(function () {
        return formatData(me);
      })
      .then(function () {
        return templateEngine.load('weatherknmi_' + me.block.layout);
      })
      .then(function (template) {
        var html = template(me.data);
        $(me.$block).html(html);
        addWeatherIcons(me);
      });
  }

  function refreshOWM(me) {
    return requestData(me)
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
      })
  }

  function refreshOWM3(me) {
    return requestOWM3Data(me)
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
    }).catch(function () {
      var err ='No valid API key?';
      err+=me.provider? ' ('+me.provider+')':' (autodetect provider)'; 
      throw new Error(err);
    }).then(function () {
      return $.getJSON(getOWMurl(me, true), function (result) {
        me.data.forecast = result;
      });
    });
  }

  function requestKNMIData(me) {
    me.data = {};
    return $.getJSON(getKNMIurl(me, false), function (result) {
      me.data.weather = result;
    }).catch(function () {
      var err = me.provider + ' error. No valid API key?';
      throw new Error(err);
    });
  }

  function requestOWM3Data(me) {
    me.data = {};
    return $.getJSON(getOWM3url(me), function (result) {
      me.data.weather = result.current;
      me.data.forecast = result;
    }).catch(function () {
      var err = me.provider + ' error. No valid API key?';
      throw new Error(err);
    })
  }

  function knmiFormatHandler(me) {
    /*
    {
    "liveweer": [
        {
            "plaats": "Amsterdam, nl",
            "temp": "11.2",
            "gtemp": "8.8",
            "samenv": "Licht bewolkt",
            "lv": "77",
            "windr": "Oost",
            "windrgr": "90",
            "windms": "4",
            "winds": "3",
            "windk": "7.8",
            "windkmh": "14.4",
            "luchtd": "1022.0",
            "ldmmhg": "767",
            "dauwp": "7",
            "zicht": "45",
            "verw": "Vanavond en vannacht droog, morgen enige tijd buiige regen",
            "sup": "08:09",
            "sunder": "18:38",
            "image": "wolkennacht",
            "d0weer": "bewolkt",
            "d0tmax": "15",
            "d0tmin": "7",
            "d0windk": "3",
            "d0windknp": "10",
            "d0windms": "5",
            "d0windkmh": "19",
            "d0windr": "O",
            "d0windrgr": "90",
            "d0neerslag": "0",
            "d0zon": "15",
            "d1weer": "regen",
            "d1tmax": "16",
            "d1tmin": "9",
            "d1windk": "3",
            "d1windknp": "8",
            "d1windms": "4",
            "d1windkmh": "15",
            "d1windr": "ZO",
            "d1windrgr": "135",
            "d1neerslag": "70",
            "d1zon": "30",
            "d2weer": "regen",
            "d2tmax": "19",
            "d2tmin": "13",
            "d2windk": "2",
            "d2windknp": "6",
            "d2windms": "3",
            "d2windkmh": "11",
            "d2windr": "Z",
            "d2windrgr": "180",
            "d2neerslag": "70",
            "d2zon": "20",
            "alarm": "0",
            "alarmtxt": ""
        }
    ]
  }
  */
    var start = me.block.skipFirst ? 1 : 0;
    var cntSetting = choose(me.block.countDaily, me.block.count);
    if (cntSetting + start > 7) cntSetting = 7 - start;
    var data = [];
    var daily = me.data.weather.liveweer[0];
    for (var i = start; i < cntSetting + start; i++) {

      var dayStr = 'd' + i;
      var dayData = {

        day: moment().add(i, 'days').format(settings['weekday']),
        min: number_format(daily[dayStr + 'tmin'], me.block.decimals) + _TEMP_SYMBOL,
        max: number_format(daily[dayStr + 'tmax'], me.block.decimals) + _TEMP_SYMBOL,
        //        description: daily.samenv,
        rain: number_format(daily[dayStr + 'neerslag'] || 0, 0) + '%',
        icon: getIcon(daily[dayStr + 'weer']),
        wind: {
          //          direction:
          speed: toWindStr(me, daily[dayStr + 'windk']),
          //          gust: toWindStr(me, daily[i].wind_gust),
          //          deg: daily[i].wind_deg,
          direction: daily[dayStr + 'windr'],
          //          directionShort: translateWindDegreesShort(daily[i].wind_deg),
          //          icon: getWindIcon(daily[i].wind_deg),
        },

      };
      data.push(dayData);
    }
    me.data.dailyForecast = data;
    me.data.dailyCount = cntSetting;
    me.data.dailyScale = Math.round(100 / cntSetting);

    //current data
    me.data.current = {
      icon: getIcon(daily['d0weer']),
      city: me.block.name || me.block.city,
      temp:
        number_format(daily.temp, me.block.decimals) +
        _TEMP_SYMBOL,
      max:
        number_format(daily.d0tmax, me.block.decimals) +
        _TEMP_SYMBOL,
      min:
        number_format(daily.d0tmin, me.block.decimals) +
        _TEMP_SYMBOL,
      //      rain: (me.data.weather.rain && me.data.weather.rain['1h']) || 0,
      pressure: daily.luchtd,
      feels:
        number_format(daily.gtemp, me.block.decimals) +
        _TEMP_SYMBOL,
      humidity: daily.lv,
      wind: {
        speed: toWindStr(me, daily.windms),
        //        gust: toWindStr(me, me.data.weather.wind.gust),
        //        deg: me.data.weather.wind.deg,
        direction: daily.windr
        //        direction: translateWindDegrees(me.data.weather.wind.deg),
      },
      description: daily.samenv,
      forecast: daily.verw
    };

    return me;

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

  function formatDailyFreeData(me) {
    //In principle we now have all data
    //We receive forecast per 3 hour interval
    //daily info will be derived from this
    var start = me.block.skipFirst ? 1 : 0;
    var cntSetting = choose(me.block.countDaily, me.block.count);
    if (cntSetting + start > 7) cntSetting = 7 - start; //max 7 days
    var data = [];
    var daily = me.data.forecast.list;
    var cont = true;
    var i = 0;
    var maxi = daily.length;
    var sampleCount = 0;
    var currentDay, dayTempMin, dayTempMax, dayDescription, dayWindDeg, dayWindGust, dayWindSpeed, dayIcon, dayMoment;
    while (i < maxi && cont) {
      var dtMoment = moment(daily[i].dt * 1000);
      var startDay = dtMoment.clone().startOf('day').format();
      if (currentDay !== startDay) {
        if (currentDay && sampleCount) {
          if (!(start && moment().startOf('day').format() === startDay)) {
            var dayData = {
              day: dayMoment.format(settings['weekday']),
              min: number_format(dayTempMin, me.block.decimals) + _TEMP_SYMBOL,
              max: number_format(dayTempMax, me.block.decimals) + _TEMP_SYMBOL,
              description: dayDescription,
              rain: number_format(dayRain / sampleCount || 0, 1),
              icon: dayIcon,
              wind: {
                //          direction:
                speed: toWindStr(me, dayWindSpeed),
                gust: toWindStr(me, dayWindGust),
                deg: dayWindDeg,
                direction: translateWindDegrees(dayWindDeg),
                directionShort: translateWindDegreesShort(dayWindDeg),
                icon: getWindIcon(dayWindDeg),
              },
            };
            data.push(dayData);
            if (data.length > cntSetting) cont = false;
          }
          else start = 0;
        }
        currentDay = startDay;
        sampleCount = 0;
      }
      var currentHour = dtMoment.hours();
      var tempMin = daily[i].main.temp_min;
      var tempMax = daily[i].main.temp_max;
      var description = daily[i].weather[0].description;
      var rain = daily[i].rain;
      var windSpeed = daily[i].wind.speed;
      var windGust = daily[i].wind.gust;
      var windDeg = daily[i].wind.deg;
      var icon = daily[i].weather[0].icon
      if (!sampleCount) {
        dayTempMin = tempMin;
        dayTempMax = tempMax;
        dayRain = 0;
      }
      if (dayTempMin > tempMin) dayTempMin = tempMin;
      if (dayTempMax < tempMax) dayTempMax = tempMax;
      if (rain)
        if (typeof rain === 'object')
          dayRain += rain["3h"];
      if ((currentHour >= 12 && currentHour < 15) || !sampleCount) {
        dayDescription = description;
        dayWindSpeed = windSpeed;
        dayWindGust = windGust;
        dayWindDeg = windDeg;
        dayIcon = icon;
        dayMoment = dtMoment;
      }
      sampleCount += 1;
      i += 1;
    }
    cntSetting = data.length;
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

  function formatHourlyFreeData(me) {
    var start = me.block.skipFirst ? 1 : 0;
    var cntSetting = choose(me.block.countHourly, me.block.count);
    //    if (cntSetting>14) cntSetting=14;
    if ((cntSetting + start) * me.block.interval > 48)
      cntSetting = Math.floor(48.0 / me.block.interval) - start;
    var data = [];
    var hourly = me.data.forecast.list;
    for (var i = start; i < cntSetting + start; i++) {
      var pos = i * me.block.interval;
      var hour_data = hourly[pos];
      var rain = choose(hour_data.rain && hour_data.rain["3h"], hour_data.rain || 0);
      var dayData = {
        day: moment(hourly[pos].dt * 1000).format(settings['weekday']),
        time: moment(hourly[pos].dt * 1000).format('HH:mm'),
        temp: number_format(hourly[pos].main.temp, me.block.decimals) + _TEMP_SYMBOL,
        description: hourly[pos].weather[0].description,
        rain: number_format(rain, 1),
        icon: hourly[pos].weather[0].icon,
        wind: {
          //          direction:
          speed: toWindStr(me, hourly[i].wind.speed),
          gust: toWindStr(me, hourly[i].wind.gust),
          deg: hourly[i].wind.deg,
          direction: translateWindDegrees(hourly[i].wind.deg),
          directionShort: translateWindDegreesShort(hourly[i].wind.deg),
          icon: getWindIcon(hourly[i].wind.deg),
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
    var owm3 = me.provider === "owm3";
    var owmfree = me.provider === "owmfree";
    var weather = me.data.weather;
    var currentWeather = owm3 ? weather : weather.main;
    var decimals = me.block.decimals;
    var maxTemp = owmfree ? currentWeather.temp_max : me.data.forecast.daily[0].temp.max;
    var minTemp = owmfree ? currentWeather.temp_min : me.data.forecast.daily[0].temp.min;
    me.data.current = {
      icon: weather.weather[0].icon,
      city: me.block.name || weather.name || me.block.city,
      temp:
        number_format(currentWeather.temp, decimals) +
        _TEMP_SYMBOL,
      max:
        number_format(maxTemp, decimals) +
        _TEMP_SYMBOL,
      min:
        number_format(minTemp, decimals) +
        _TEMP_SYMBOL,
      rain: (weather.rain && (weather.rain['1h'] || weather.rain['3h'])) || 0,
      pressure: currentWeather.pressure,
      feels:
        number_format(currentWeather.feels_like, decimals) +
        _TEMP_SYMBOL,
      humidity: currentWeather.humidity,
      wind: {
        speed: toWindStr(me, owm3 ? weather.wind_speed : weather.wind.speed),
        gust: toWindStr(me, owm3 ? weather.wind_gust : weather.wind.gust),
        deg: owm3 ? weather.wind_deg : weather.wind.deg,
        direction: translateWindDegrees(owm3 ? weather.wind_deg : weather.wind.deg),
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
    if (me.provider === 'owmfree') {
      formatDailyFreeData(me);
      formatHourlyData(me);
      formatCurrentData(me);
      return me;
    }
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

    var formatHandlers = me.provider === 'owmfree' ? {
      0: formatDailyFreeData,
      1: formatHourlyFreeData,
      2: formatCurrentData,
      3: formatCurrentData,
    } : {
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
    me.data.showGust = me.block.showGust;
    me.data.showForecast = me.block.showForecast;

    if (me.provider === 'knmi') return knmiFormatHandler(me);
    var formatHandler = formatHandlers[me.block.layout] || defaultFormatHandler;
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

    var endPoint = me.provider === 'owm' ? 'onecall' : 'forecast'

    var subsite = makeForecast
      ? endPoint + '?lat=' +
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

  function getKNMIurl(me) {
    var city = me.block.city;
    var country = me.block.country;
    var api = me.block.apikey;

    var site =
      (settings['use_cors'] ? _CORS_PATH : '') +
      'https://weerlive.nl/api/json-data-10min.php?key=' +
      api +
      '&locatie=' +
      city + ', ' + country
    return site;
  }

  function getOWM3url(me) {
    var lang = me.block.lang;
    var url = 'https://api.openweathermap.org/data/3.0/onecall?lat=' + me.lat +
      '&lon=' + me.lon +
      '&appid=' + me.block.apikey +
      '&lang=' +
      lang +
      '&units=' +
      (settings['use_fahrenheit'] === 1 ? 'imperial' : 'metric');
    return url;
  }


  function mountIcon(el, icon) {
    var wiclass = getIcon(icon);
    el.html('<i class="wi ' + wiclass + '"></i>');
  }



  function mountSVGIcon(me, el, icon) {
    //    var wiclass = getSVGIcon(icon);
    var predefinedIcons = ['line', 'fill', 'meteo', 'linestatic'];
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
      //knmi icons
      zonnig: '01d',
      bliksem: '11d',
      'regen': '10d',
      buien: '09d',
      hagel: '13d',
      mist: '50d',
      sneeuw: '13d',
      'bewolkt': '04d',
      lichtbewolkt: '03d',
      halfbewolkt: '03d',
      halfbewolkt_regen: '10d',
      zwaarbewolkt: '04d',
      nachtmist: '50n',
      helderenacht: '01n',
      nachtbewolkt: '02n'
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


/*
display: grid;
    grid-template-rows: repeat(2, max-content);
    grid-auto-flow: column;
    gap: 0.5rem;
    */

/*or:
parent:

font-size: 4.8px;
    flex-wrap: wrap;
    gap: 0.5rem;
}

child:
  width:25%;
*/