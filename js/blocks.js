/* eslint-disable no-debugger */
/*global blocktypes:writable, language, _TEMP_SYMBOL, getExtendedBlockTypes, settings, getFullScreenIcon, FlipClock, loadWeatherFull, loadWeather*/
/*global getSpotify, loadNZBGET, getCoin, loadChromecast, loadGarbage, loadSonarr */
/*global Dashticz, Domoticz, getLog, addCalendar, getNewsPlus */
/*global getRandomInt, moment, number_format */
/*from bundle.js*/
/*global ion*/
/*from main.js*/
/*global toSlide disableStandby infoMessage*/
/*from version.js*/
/*global levelNamesEncoded*/
/*from thermostat.js*/
/*global getThermostatBlock getEvohomeZoneBlock getEvohomeControllerBlock getEvohomeHotWaterBlock*/
/*from switches.js*/
/*global  getIconStatusClass getDefaultSwitchBlock getDimmerBlock getBlindsBlock */
/*from custom.js*/
/*global afterGetDevices*/
/*unknown. probably a bug ...*/
/*global google*/
/*from config.js (or main.js)*/
/*global blocks*/

/* Exports: */
blocktypes = {};
blocktypes.SubType = {};
blocktypes.SubType['Visibility'] = {
    icon: 'fas fa-eye',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Electric'] = {
    icon: 'fas fa-plug',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Lux'] = {
    icon: 'fas fa-sun-o',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Pressure'] = {
    icon: 'wi wi-barometer',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 1
};
blocktypes.SubType['Barometer'] = {
    icon: 'wi wi-barometer',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Sound Level'] = {
    icon: 'fas fa-volume-up',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Distance'] = {
    icon: 'fas fa-eye',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Alert'] = {
    icon: 'fas fa-warning',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.SubType['Percentage'] = {
    icon: 'fas fa-percent',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Text'] = {
    icon: 'fas fa-file',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Counter Incremental'] = {
    icon: 'fa fa-bolt',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 2
};
blocktypes.SubType['Voltage'] = {
    icon: 'fas fa-bolt',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.SubType['Solar Radiation'] = {
    icon: 'fa fa-sun-o',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 0
};
blocktypes.SubType['Thermostat Mode'] = {
    icon: 'fas fa-thermometer-half',
    title: '<Name>',
    value: '<Data>'
};

blocktypes.SensorUnit = {};
blocktypes.SensorUnit['Fertility'] = {
    icon: 'fas fa-flask',
    title: '<Name>',
    value: '<Data>'
};

blocktypes.Type = {};
blocktypes.Type['Rain'] = {
    icon: 'fas fa-tint',
    title: '<Name>',
    value: '<Rain>mm',
    format: true,
    decimals: 1
};
blocktypes.Type['Wind'] = {
    icon: 'wi wi-wind-direction',
    title: language.wind.wind,
    value: ''
};
blocktypes.Type['Temp'] = {
    icon: 'fas fa-thermometer-half',
    title: '<Name>',
    value: '<Temp>' + _TEMP_SYMBOL,
    format: true,
    decimals: 1
};
blocktypes.Type['Air Quality'] = {
    image: 'air.png',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.Type['UV'] = {
    icon: 'fas fa-sun',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.Type['Variable'] = {
    icon: 'fas fa-equals',
    title: '<Name>',
    value: '<Value>'
};

//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Energy",
//"SubType" : "CM180",
blocktypes.Type['Energy'] = {
    icon: 'fas fa-plug',
    title: '<Name>',
    value: '<Data>'
};

//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Current/Energy",
//"SubType" : "CM180i",
blocktypes.Type['Current/Energy'] = {
    icon: 'fas fa-plug',
    title: '<Name>',
    value: '<Data>'
};

blocktypes.HardwareType = {};
blocktypes.HardwareType['Motherboard sensors'] = {
    icon: 'fas fa-desktop',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.HardwareType['PVOutput (Input)'] = {};
blocktypes.HardwareType['PVOutput (Input)']['today'] = {
    icon: 'fas fa-sun',
    title: '<Name>',
    value: '<CounterToday>',
    format: true,
    decimals: 1
};
blocktypes.HardwareType['PVOutput (Input)']['usage'] = {
    icon: 'fas fa-sun',
    title: '<Name>',
    value: '<Usage>',
    format: true,
    decimals: 1
};
blocktypes.HardwareType['PVOutput (Input)']['total'] = {
    icon: 'fas fa-sun',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 0
};

blocktypes.HardwareName = {};
blocktypes.HardwareName['Rain expected'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};

blocktypes.Name = {};
blocktypes.Name['Rain Expected'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Rain expected'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Regen mm/uur'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Regen verwacht'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Regen Verwacht'] = {
    icon: 'fas fa-tint',
    title: '<Data>',
    value: '<Name>'
};

blocktypes.Name['Ping'] = {
    icon: 'fas fa-arrows-v',
    title: '<Name>',
    value: '<Data>'
};
blocktypes.Name['Upload'] = {
    icon: 'fas fa-upload',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 3
};
blocktypes.Name['Download'] = {
    icon: 'fas fa-download',
    title: '<Name>',
    value: '<Data>',
    format: true,
    decimals: 3
};

blocktypes.Name['Maanfase'] = {
    icon: 'fas fa-moon',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Moon phase'] = {
    icon: 'fas fa-moon',
    title: '<Data>',
    value: '<Name>'
};
blocktypes.Name['Mondphase'] = {
    icon: 'fas fa-moon',
    title: '<Data>',
    value: '<Name>'
};

blocktypes = getExtendedBlockTypes(blocktypes);

//var blocks = {};
var alldevices = 'initial value';
//var sliding = false;

var allblocks = {}; //todo: Can we get rid of this?
var oldstates = [];
var onOffstates = [];
var subscribed = {};


//var myBlockNumbering = 0; //To give all blocks a unique number
//class="col-sm-' + cols['width'] + ' col-xs-12 sortable col'
// eslint-disable-next-line no-unused-vars
function getBlock(cols, c, screendiv, standby) {
    //    if (c==='bar') debugger;
    if (typeof (cols) !== 'undefined') {
        var columndiv = screendiv + ' .row .col' + c;
        var colclass = '';
        if (c === 'bar') colclass = 'transbg dark';
        var colwidth = 'col-sm-' + (cols.width ? cols.width + ' ' : '12 ');
        if (standby) {
            //            $('div.screenstandby .row').append('<div class="col-xs-' + columns_standby[c]['width'] + ' colstandby' + c + '"></div>');
            $(screendiv + ' .row').append('<div class="' + colwidth + ' col-xs-12 col' + c + '"></div>');
        } else {
            $(screendiv + ' .row').append('<div data-colindex="' + c + '" class="' + colwidth + ' col-xs-12 sortable col' + c + ' ' + colclass + '"></div>');
        }
        //if (!standby) $('div.screen' + ' .row').append('<div data-colindex="' + c + '" class="col-sm-' + cols['width'] + ' col-xs-12 sortable col' + c + ' ' + colclass + '"></div>');
        for (var b in cols['blocks']) {
            var myblockselector = Dashticz.mountNewContainer(columndiv);
            if (!Dashticz.mount(myblockselector, cols['blocks'][b]))
                switch (typeof (cols['blocks'][b])) {
                    case 'object':
                        handleObjectBlock(cols['blocks'][b], myblockselector, c);
                        continue;

                    case 'string':
                        handleStringBlock(cols['blocks'][b], myblockselector, c);
                        continue;

                    default:
                        $(myblockselector).html('<div data-id="' + cols['blocks'][b] + '" class="mh transbg block_' + cols['blocks'][b] + '"></div>');
                        addDeviceUpdateHandler(myblockselector, cols['blocks'][b])
                        break;
                }
        }
    }
}

function deviceUpdateHandler(selector, idx, device) {
    var blockdef = (blocks && blocks[idx]) || undefined;
    if (blockdef && typeof blockdef['title'] !== 'undefined') {
        device['Name'] = blockdef['title'];
    }


    var width = 4;
    switch (device['SwitchType']) {
        case 'Selector':
            width = 8;
            break;
        case 'Media Player':
        case 'Dimmer':
            width = 12;
    }

    if (blockdef) {
        if ($(window).width() < 768 && typeof (blockdef['width_smartphone']) !== 'undefined') {
            width = blockdef['width_smartphone'];
        } else if (typeof (blockdef['width']) !== 'undefined') {
            width = blockdef['width'];
        }
    }

    $('div.block_' + idx).data('light', idx); //todo: don't use data('light') to store idx
    if (typeof (settings['default_columns']) == 'undefined' || parseFloat(settings['default_columns']) == 3) $('div.block_' + idx).addClass('col-xs-' + width);
    else if (parseFloat(settings['default_columns']) == 1) $('div.block_' + idx).addClass('col-xs-3');
    else if (parseFloat(settings['default_columns']) == 2) $('div.block_' + idx).addClass('col-xs-4');

    for (var i = 1; i <= 5; i++) {
        if ($('div.block_' + idx + '_' + i).length > 0) {
            $('div.block_' + idx + '_' + i).data('light', idx);
            if (typeof (blocks[idx + '_' + i]) !== 'undefined' && typeof (blocks[idx + '_' + i]['width']) !== 'undefined')
                width = blocks[idx + '_' + i]['width'];
            $('div.block_' + idx + '_' + i).addClass('col-xs-' + width);
            $('div.block_' + idx + '_' + i).html('');
        }
    }

    var addHTML = true;
    var html = '';

    //    if ($('div.block_graph_' + idx).length > 0) {
    //        getGraphs(device, false);
    //    }
    triggerStatus(idx, device['LastUpdate'], device);
    triggerChange(idx, device['LastUpdate'], device);

    try {
        html += eval('getBlock_' + idx + '(device,idx,data.result)');
    } catch (err) {
        var response = handleDevice(device, idx);
        html = response[0];
        addHTML = response[1];
    }

    if (addHTML) {
        $('div.block_' + idx).html(html);
        getBlockClick(idx, device);
    }
    if (typeof ($('.block_' + idx).attr('onclick')) !== 'undefined') {
        $('div.block_' + idx).addClass('hover');
    }

    if ($('div.block_' + idx).hasClass('hover')) {
        $('.block_' + idx + '.transbg.hover').on('touchstart', function () {
            $(this).addClass('hovered');
            setTimeout(function () {
                $('.transbg.hover').removeClass('hovered');
            }, 200);
        });
    }
}




function addDeviceUpdateHandler(selector, idx) {
    if (subscribed[idx]) {
        //        console.log('Already subscribed for '+idx)
        //currently the deviceUpdateHandler handles updates for all blocks that use device <idx>
        // so we have to subscribe only once
    } else {
        Domoticz.subscribe(idx, true, function (device) {
            deviceUpdateHandler(selector, idx, device)
        })
        subscribed[idx] = true;
    }
}

function getBlockWidth(key, defaultWidth) {
    return blocks && key && blocks[key] && blocks[key].width ? blocks[key].width : (defaultWidth ? defaultWidth : 12)
}

function handleStringBlock(block, columndiv, c) {
    var defaultwidth = 12;
    switch (block) {
        case 'logo':
        case 'settings':
            defaultwidth = 2;
            break;
        case 'flipclock':
        case 'miniclock':
            defaultwidth = 8;
            break;
    }

    var width = getBlockWidth(block, defaultwidth)

    switch (block) {
        case 'logo':
            $(columndiv).append('<div data-id="logo" class="logo col-xs-' + width + '">' + settings['app_title'] + '</div>');
            return;
        case 'settings':
            var icons = ["settings", "fullscreen"];
            if (typeof (settings['settings_icons']) !== 'undefined') {
                icons = settings['settings_icons'];
            }
            var content = '<div class="col-xs-' + width + ' text-right" data-toggle="modal">';
            for (var i = 0; i < icons.length; i++) {
                switch (icons[i]) {
                    case 'settings':
                        content += '<span class="settings settingsicon" data-id="settings" data-target="#settingspopup" data-toggle="modal"><em class="fas fa-cog"/> </span>';
                        break;

                    case 'fullscreen':
                        $.ajax({
                            url: 'js/fullscreen.js',
                            async: false,
                            dataType: "script"
                        });
                        content += getFullScreenIcon();
                        break;
                }
            }
            content += '</div>';
            $(columndiv).append(content);
            return;
        case 'flipclock':
            $('<link href="vendor/flipclock/flipclock.css" rel="stylesheet">').appendTo("head");
            $(columndiv).append('<div data-id="flipclock" class="transbg block_' + block + ' col-xs-' + width + ' text-center"><div class="flipclock"></div></div>');
            if (typeof (FlipClock) !== 'function') $.ajax({
                url: 'vendor/flipclock/flipclock.min.js',
                async: false,
                datatype: "script"
            });
            FlipClock($('.flipclock'), {
                clockFace: settings['shorttime'].match(/A/i) ? 'TwelveHourClock' : 'TwentyFourHourClock',
                showSeconds: !settings['hide_seconds']
            });
            return;
        case 'miniclock':
            $(columndiv).append('<div data-id="miniclock" class="miniclock col-xs-' + width + ' text-center">' +
                '<span class="weekday"></span> <span class="date"></span> <span>&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class="clock"></span>' +
                '</div>');
            return;
        case 'clock':
            $(columndiv).append('<div data-id="clock" class="transbg block_' + block + ' col-xs-' + width + ' text-center">' +
                '<h1 class="clock"></h1><h4 class="weekday"></h4><h4 class="date"></h4>' +
                '</div>');
            return;
        case 'responsiveclock':
            $(columndiv).append('<div data-id="clock" class="transbg block_' + block + ' col-xs-' + width + ' text-center responsive" style="height:250px;">' +
                '<div class="col no-icon"><h2 class="clock"></h1><h4 class="weekday my-4"></h4><h4 class="date"></h4></div>' +
                '</div>');
            return;
        case 'weather':
            if (typeof (loadWeatherFull) !== 'function') {
                $.ajax({
                    url: 'js/weather.js',
                    async: false,
                    dataType: "script"
                });
            }
            $(columndiv).append('<div data-id="weather" class="block_' + block + ' containsweatherfull"></div>');
            if (settings['wu_api'] !== "" && settings['wu_city'] !== "") loadWeatherFull(settings['wu_city'], settings['wu_country'], $('.weatherfull'));
            return;
        case 'currentweather':
            if (settings['wu_api'] !== "" && settings['wu_city'] !== "") {
                if (typeof (loadWeather) !== 'function') {
                    $.ajax({
                        url: 'js/weather.js',
                        async: false,
                        dataType: "script"
                    });
                }
                $(columndiv).append('<div data-id="currentweather" class="mh transbg block_' + block + ' col-xs-' + width + ' containsweather">' +
                    '<div class="col-xs-4"><div class="weather" id="weather"></div></div>' +
                    '<div class="col-xs-8"><strong class="title weatherdegrees" id="weatherdegrees"></strong><br /><span class="weatherloc" id="weatherloc"></span></div>' +
                    '</div>');
                loadWeather(settings['wu_city'], settings['wu_country']);
            }
            return;
        case 'currentweather_big':
            if (settings['wu_api'] !== "" && settings['wu_city'] !== "") {
                if (typeof (loadWeather) !== 'function') {
                    $.ajax({
                        url: 'js/weather.js',
                        async: false,
                        dataType: "script"
                    });
                }
                $(columndiv).append('<div data-id="currentweather_big" class="mh transbg big block_' + block + ' col-xs-' + width + ' containsweather">' +
                    '<div class="col-xs-1"><div class="weather" id="weather"></div></div>' +
                    '<div class="col-xs-11"><span class="title weatherdegrees" id="weatherdegrees"></span> <span class="weatherloc" id="weatherloc"></span></div>' +
                    '</div>');

                loadWeather(settings['wu_city'], settings['wu_country']);
            }
            return;
        case 'weather_owm':
            if (typeof (loadWeatherFull) !== 'function') {
                $.ajax({
                    url: 'js/weather_owm.js',
                    async: false,
                    dataType: "script"
                });
            }
            $(columndiv).append('<div data-id="weather" class="block_' + block + ' containsweatherfull"></div>');
            if (settings['owm_api'] !== "" && settings['owm_city'] !== "") loadWeatherFull(settings['owm_city'], settings['owm_country'], $('.weatherfull'));
            return;
        case 'currentweather_owm':
            if (settings['owm_api'] !== "" && settings['owm_city'] !== "") {
                if (typeof (loadWeather) !== 'function') {
                    $.ajax({
                        url: 'js/weather_owm.js',
                        async: false,
                        dataType: "script"
                    });
                }

                $(columndiv).append('<div data-id="currentweather" class="mh transbg block_' + block + ' col-xs-' + width + ' containsweather">' +
                    '<div class="col-xs-4"><div class="weather" id="weather"></div></div>' +
                    '<div class="col-xs-8"><strong class="title weatherdegrees" id="weatherdegrees"></strong><br /><span class="weatherloc" id="weatherloc"></span></div>' +
                    '</div>');
                loadWeather(settings['owm_city'], settings['owm_country']);
            }
            return;
        case 'currentweather_big_owm':
            if (settings['owm_api'] !== "" && settings['owm_city'] !== "") {
                if (typeof (loadWeather) !== 'function') {
                    $.ajax({
                        url: 'js/weather_owm.js',
                        async: false,
                        dataType: "script"
                    });
                }
                $(columndiv).append('<div data-id="currentweather_big" class="mh transbg big block_' + block + ' col-xs-' + width + ' containsweather">' +
                    '<div class="col-xs-1"><div class="weather" id="weather"></div></div>' +
                    '<div class="col-xs-11"><span class="title weatherdegrees" id="weatherdegrees"></span> <span class="weatherloc" id="weatherloc"></span></div>' +
                    '</div>');

                loadWeather(settings['owm_city'], settings['owm_country']);
            }
            return;
        case 'spotify':
            if (typeof (getSpotify) !== 'function') $.ajax({
                url: 'js/spotify.js',
                async: false,
                dataType: "script"
            });
            getSpotify(columndiv);
            return;
        case 'nzbget':
            if (typeof (loadNZBGET) !== 'function') $.ajax({
                url: 'js/nzbget.js',
                async: false,
                dataType: "script"
            });
            loadNZBGET(columndiv);
            return;
        case 'trafficmap':
            $(columndiv).append('<div data-id="trafficmap" class="mh transbg block_trafficmap col-xs-12"><div id="trafficm" class="trafficmap"></div></div>');
            return;
        case 'newsplus':
            if (typeof (getNewsPlus) !== 'function') $.ajax({
                url: 'js/newsplus.js',
                async: false,
                dataType: "script"
            });
            $(columndiv).append('<div data-id="news" class="news"></div>');
            getNewsPlus(columndiv, 'newsplus', settings['default_news_url']);
            return;
        case 'log':
            if (typeof (getLog) !== 'function') $.ajax({
                url: 'js/log.js',
                async: false,
                dataType: "script"
            });
            getLog(columndiv);
            return;
            /*            
                    case 'stationclock':
                        appendStationClock(columndiv, block, width);
                        return;
            */
        case 'sunrise':
            var classes = 'block_' + block + ' col-xs-' + width + ' transbg text-center sunriseholder';
            if (c === 'bar') {
                classes = 'block_' + block + ' col-xs-2 text-center sunriseholder';
            }
            $(columndiv).append('<div data-id="sunrise" class="' + classes + '">' +
                '<em class="wi wi-sunrise"></em><span class="sunrise"></span><em class="wi wi-sunset"></em><span class="sunset"></span>' +
                '</div>');
            return;
        case 'horizon':
            appendHorizon(columndiv);
            return;
        case 'icalendar':
            var random = getRandomInt(1, 100000);
            var html = '<div class="col-xs-' + width + ' transbg containsicalendar containsicalendar' + random + '">';
            html += '<div class="col-xs-2 col-icon">';
            html += '<em class="fas fa-calendar"></em>';
            html += '</div>';
            html += '<div class="col-xs-10 items">' + language.misc.loading + '</div>';
            html += '</div>';
            $(columndiv).append(html);
            addCalendar($('.containsicalendar' + random), settings['calendarurl']);
            return;
        case 'chromecast':
            $.ajax({
                url: 'js/chromecast.js',
                async: false,
                dataType: 'script'
            });
            loadChromecast(columndiv);
            return;
        case 'garbage':
            if (typeof (loadGarbage) !== 'function') {
                $.ajax({
                    url: 'js/garbage.js',
                    async: false,
                    dataType: 'script'
                });
                $.ajax({
                    url: 'vendor/ical/ical.min.js',
                    async: false,
                    dataType: 'script'
                });
            }
            $(columndiv).append(loadGarbage());
            getBlockClick('garbage');
            return;
        case 'sonarr':
            if (typeof (loadSonarr) !== 'function') $.ajax({
                url: 'js/sonarr.js',
                async: false,
                dataType: 'script'
            });
            $(columndiv).append(loadSonarr());
            getBlockClick('sonarr');
            return;
        case 'fullscreen':
            $(columndiv).append('<div data-id="fullscreen" class="col-xs-' + width + ' text-right">' + getFullScreenIcon() + '</div>');
            return;
        default:
            /* if (block.substring(0, 6) === 'graph_') {
                $(columndiv).append('<div data-id="' + block + '" class="transbg block_' + block + '"></div>');
                Domoticz.subscribe(block.slice(6), true, function (device) {
                    getGraphs(device, false);
                });
                return;
            } */
            /*Todo: we could subscribe the multigraph here as well*/
            //debugger;
            /*4 situations:
                '123': Normal Domoticz device id as string
                '123_1': subdevice 1
                's123': group or scene 123
                'v123': variable with idx 123
                */
            $(columndiv).append('<div data-id="' + block + '" class="mh transbg block_' + block + '"></div>');
            var idx = parseInt(block);
            if (idx) {
                addDeviceUpdateHandler(columndiv, idx);
                return;
            }
            if (block[0] === 's' || block[0] === 'v') { //scene, group or variable
                idx = parseInt(block.slice(1))
                if (idx) {
                    addDeviceUpdateHandler(columndiv, block);
                    return;
                }

            }
            console.log('unknown string block ' + block);
    }
}

function handleObjectBlock(block, columndiv) {
    var random = getRandomInt(1, 100000);
    var width = 12;
    if (block.latitude) {
        $(columndiv).append(loadMaps(random, block));
        return;
    }
    var key = 'UNKNOWN';
    if (block.key) key = block['key'];
    if (block.width) width = block['width'];

    if (block.empty) {
        $(columndiv).append('<div data-id="' + key + '" class="mh transbg col-xs-' + width + '">');
    } else if (block.currency) {
        if (typeof (getCoin) !== 'function') $.ajax({
            url: 'js/coins.js',
            async: false,
            dataType: 'script'
        });
        var html = '<div class="col-xs-' + width + ' transbg coins-' + block['key'] + '" data-id="coins.' + block['key'] + '"></div>';
        $(columndiv).append(html);
        getCoin(block);

    } else if (block.icalurl ||
        block.calendars
    ) {
        var dataId = 'calendars.' + key;
        var classes = 'transbg containsicalendar containsicalendar' + random;
        appendTvOrCalendarBlock(dataId, classes, width, block, columndiv);
        if (typeof (addCalendar) !== 'function') $.ajax({
            url: 'js/calendar.js',
            async: false,
            dataType: 'script'
        });
        addCalendar($('.containsicalendar' + random), block);
    } else {
        //        Dashticz.mountSpecialBlock(columndiv, block, Dashticz.components["button"]);
        Dashticz.mountDefaultBlock(columndiv, block)
        //        $(columndiv).append(loadButton(index, block));
    }
}
/**/
function appendTvOrCalendarBlock(dataId, classes, width, block, columndiv) {
    var html = '';
    if (block.title) {
        html += '<div class="col-xs-' + width + ' mh titlegroups transbg"><h3>' + block['title'] + '</h3></div>';
    }

    html += '<div data-id="' + dataId + '" class="col-xs-' + width + ' ' + classes + '">';
    if (block.icon) {
        html += '<div class="col-xs-2 col-icon">';
        html += '<em class="' + block['icon'] + '"></em>';
        html += '</div>';
        html += '<div class="col-xs-10 items">' + language.misc.loading + '</div>';
    } else if (block.image) {
        html += '<div class="col-xs-2 col-icon">';
        html += '<img src="img/' + block['image'] + '" class="icon calendar_icon" />';
        html += '</div>';
        html += '<div class="col-xs-10 items">' + language.misc.loading + '</div>';
    } else {
        html += '<div class="col-xs-12 items">' + language.misc.loading + '</div>';
    }

    html += '</div>';
    $(columndiv).append(html);
}

// eslint-disable-next-line no-unused-vars
function getStateBlock(id, icon, title, value, device) {
    if (typeof (blocks[id]) !== 'undefined' && typeof (blocks[id]['unit']) !== 'undefined') {
        var unitArray = blocks[id]['unit'].split(";");
        value = value.replace(unitArray[0], unitArray[1]);
    }

    getBlockClick(id, device);

    var stateBlock = '<div class="col-xs-4 col-icon">';
    stateBlock += '<em class="' + icon + '"></em>';
    stateBlock += '</div>';
    stateBlock += '<div class="col-xs-8 col-data">';

    if (titleAndValueSwitch(id)) {
        if (hideTitle(id)) {
            stateBlock += '<span class="value">' + value + '</span>';
        } else {
            stateBlock += '<strong class="title">' + title + '</strong><br />';
            stateBlock += '<span class="value">' + value + '</span>';
        }
    } else {
        if (hideTitle(id)) {
            stateBlock += '<strong class="title">' + value + '</strong>';
        } else {
            stateBlock += '<strong class="title">' + value + '</strong><br />';
            stateBlock += '<span class="value">' + title + '</span>';
        }
    }
    if (showUpdateInformation(id)) {
        stateBlock += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }

    stateBlock += '</div>';
    return stateBlock;
}

// eslint-disable-next-line no-unused-vars
function getStatusBlock(idx, device, block, c) {
    var value = block.value;
    var title = block.title;
    var elements = [];
    if (blocks[idx] && blocks[idx].title) title = blocks[idx].title;

    // eslint-disable-next-line no-useless-escape
    var tagRegEx = /<[\w\s="/.':;#-\/\?]+>/gi;
    var matches = (title + value).match(tagRegEx)
    if (matches) {
        matches.map(function (val) {
            elements.push(val.replace(/([<,>])+/g, ''));
        });
    }

    for (var d in elements) {
        var deviceValue = device[elements[d]];
        if (block.format) {
            var unit = '';
            if (isNaN(device[elements[d]])) {
                unit = ' ' + device[elements[d]].split(' ')[1];
            }
            deviceValue = number_format(deviceValue, block.decimals) + unit;
        }
        value = value.replace('<' + elements[d] + '>', deviceValue);
        title = title.replace('<' + elements[d] + '>', device[elements[d]]);
    }

    if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['unit']) !== 'undefined') {
        var unitArray = blocks[idx]['unit'].split(";");
        value = value.replace(unitArray[0], unitArray[1]);
    }

    getBlockClick(idx, device);

    var attr = '';
    if (typeof (device['Direction']) !== 'undefined' && typeof (device['DirectionStr']) !== 'undefined') {
        attr += ' style="-webkit-transform: rotate(' + (device['Direction'] + 180) + 'deg);-moz-transform: rotate(' + (device['Direction'] + 180) + 'deg);-ms-transform: rotate(' + (device['Direction'] + 180) + 'deg);-o-transform: rotate(' + (device['Direction'] + 180) + 'deg); transform: rotate(' + (device['Direction'] + 180) + 'deg);"';
        var windspeed = device.Data.split(';')[2] / 10;
        if (settings['use_beaufort'] == 1) {
            value = Beaufort(windspeed) + ', ';
        } else {
            value = windspeed + ' m/s, ';
        }
        value += device['Direction'] + '&deg ';
        if (settings['translate_windspeed'] == true) {
            value += TranslateDirection(device['DirectionStr'])
        } else {
            value += device['DirectionStr'];
        }
    }

    var stateBlock = '';
    if (typeof (block.image) !== 'undefined') stateBlock = iconORimage(idx, '', block.image, 'icon', attr, 4, '');
    else stateBlock = iconORimage(idx, block.icon, '', 'icon', attr, 4, '');

    stateBlock += '<div class="col-xs-8 col-data">';
    if (titleAndValueSwitch(idx)) {
        if (hideTitle(idx)) {
            stateBlock += '<span class="value">' + value + '</span>';
        } else {
            stateBlock += '<strong class="title">' + title + '</strong><br />';
            stateBlock += '<span class="value">' + value + '</span>';
        }
    } else {
        if (hideTitle(idx)) {
            stateBlock += '<strong class="title">' + value + '</strong>';
        } else {
            stateBlock += '<strong class="title">' + value + '</strong><br />';
            stateBlock += '<span class="value">' + title + '</span>';
        }
    }

    if (showUpdateInformation(idx)) {
        stateBlock += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }
    stateBlock += '</div>';
    return stateBlock;
}

function getBlockClick(idx, device) {
    if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['link']) !== 'undefined' && blocks[idx]['link'] !== "") {
        if ($('.block_' + idx).length > 0) {
            $('.block_' + idx).addClass('hover');

            if (typeof (blocks[idx]['target']) == 'undefined' || blocks[idx]['target'] == '_blank') {
                $('.block_' + idx).attr('onclick', 'window.open(\'' + blocks[idx]['link'] + '\');');
            } else if (typeof (blocks[idx]['target']) !== 'undefined' && blocks[idx]['target'] == 'iframe') {
                $('.block_' + idx).attr('onclick', 'addBlockClickFrame(\'' + idx + '\');');
            }
        }
    } else if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['graph']) !== 'undefined' && blocks[idx]['graph'] === false) {
        return;
    } else if (typeof (device) !== 'undefined') {
        if (device['SubType'] == 'Percentage' || device['SubType'] == 'Custom Sensor' || device['TypeImg'] == 'counter' ||
            device['Type'] == 'Temp' || device['Type'] == 'Humidity' || device['Type'] == 'Wind' || device['Type'] == 'Rain' ||
            device['Type'] == 'Temp + Humidity' || device['Type'] == 'Temp + Humidity + Baro' ||
            device['SubType'] == 'kWh' || device['SubType'] === 'Lux' || device['SubType'] === 'Solar Radiation' ||
            device['SubType'] === 'Barometer'
        ) {
            /* In this case we want to the popup graph*/

            var blockSel = '.block_' + idx;
            if ($(blockSel).length == 0) {
                blockSel = 0;
            }
            if (blockSel == 0) {
                blockSel = '.block_' + device['idx'];
                if ($(blockSel).length == 0) {
                    blockSel = 0
                }
            }
            if (blockSel !== 0) {
                $(blockSel).addClass('hover');
                $(blockSel).attr('onclick', 'showPopupGraph(\'' + device['idx'] + '\',\'' + idx + '\');');
            }

        }
    }
}

// eslint-disable-next-line no-unused-vars
function addBlockClickFrame(idx) {
    $('#button_' + idx).remove();
    var html = '<div class="modal fade" id="button_' + idx + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
    html += '<div class="modal-dialog">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header">';
    html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body">';
    html += '<iframe src="' + blocks[idx]['link'] + '" width="100%" height="570" frameborder="0" allowtransparency="true"></iframe> ';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    $('body').append(html);
    $('#button_' + idx).modal('show');
}

/**
 * If defaultimage is given, default icon is ignored
 * @param idx
 * @param defaulticon
 * @param defaultimage
 * @param classnames
 * @param attr
 * @param colwidth
 * @param attrcol
 * @returns {string}
 */
function iconORimage(idx, defaulticon, defaultimage, classnames, attr, colwidth, attrcol) {
    var block = blocks[idx];
    var mIcon = defaulticon;
    var mImage = defaultimage;
    var useImage = false;
    var allDevices = Domoticz.getAllDevices();
    if (defaultimage !== '') {
        useImage = true;
    }
    var isOn = false;
    if (typeof (allDevices[idx]) !== 'undefined' && typeof (allDevices[idx]['Status']) !== 'undefined')
        isOn = (getIconStatusClass(allDevices[idx]['Status']) === 'on');
    if (typeof (block) !== 'undefined') {
        if (typeof (block['icon']) !== 'undefined') {
            mIcon = block['icon'];
            useImage = false;
        }
        if (typeof (block['image']) !== 'undefined') {
            mImage = block['image'];
            useImage = true;
        }
    }
    var iconOn = mIcon;
    var iconOff = mIcon;
    var imageOn = mImage;
    var imageOff = mImage;

    if (typeof (block) !== 'undefined') {
        if (typeof (block['iconOn']) !== 'undefined') {
            iconOn = block['iconOn'];
            if (isOn) useImage = false;
        }
        if (typeof (block['iconOff']) !== 'undefined') {
            iconOff = block['iconOff'];
            if (!isOn) useImage = false;
        }
        if (typeof (block['imageOn']) !== 'undefined') {
            imageOn = block['imageOn']
            if (isOn) useImage = true;
        }
        if (typeof (block['imageOff']) !== 'undefined') {
            imageOff = block['imageOff']
            if (!isOn) useImage = true;
        }
    }

    mIcon = isOn ? iconOn : iconOff;
    mImage = isOn ? imageOn : imageOff;

    if (typeof (colwidth) === 'undefined') colwidth = 4;
    if (typeof (attrcol) === 'undefined') attrcol = '';
    if (typeof (attr) === 'undefined') attr = '';
    var icon = '<div class="col-xs-' + colwidth + ' col-icon" ' + attrcol + '>';
    if (useImage) {
        icon += '<img src="img/' + mImage + '" class="' + classnames + '" ' + attr + ' />';
    } else {
        icon += '<em class="' + mIcon + ' ' + classnames + '" ' + attr + '></em>';
    }

    icon += '</div>';
    return icon;
}

// eslint-disable-next-line no-unused-vars
function getBlockData(device, idx, ontxt, offtxt) {
    this.title = device['Name'];

    this.opendiv = '<div class="col-xs-8 col-data">';
    this.closediv = '</div>';

    if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['hide_data']) !== 'undefined' && blocks[idx]['hide_data'] == true) {
        return this.opendiv + '<strong class="title">' + this.title + '</strong>' + this.closediv;
    }

    this.value = ontxt;
    if (device['Status'] == 'Off' || device['Status'] == 'Closed' || device['Status'] == 'Normal' || device['Status'] == 'Locked' || (device['Status'] == '' && device['InternalState'] == 'Off')) {
        this.value = offtxt;
    }

    if (titleAndValueSwitch(idx)) {
        this.title = this.value;
        this.value = device['Name'];
    }

    this.data = '<strong class="title">' + this.title + '</strong><br />';
    this.data += '<span class="state">' + this.value + '</span>';

    if (showUpdateInformation(idx)) {
        this.data += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }

    return this.opendiv + this.data + this.closediv;
}

function titleAndValueSwitch(idx) {
    return typeof (blocks[idx]) !== 'undefined' &&
        typeof (blocks[idx]['switch']) !== 'undefined' &&
        blocks[idx]['switch'];
}

function hideTitle(idx) {
    return typeof (blocks[idx]) !== 'undefined' &&
        typeof (blocks[idx]['hide_title']) !== 'undefined' &&
        blocks[idx]['hide_title'];
}

function showUpdateInformation(idx) {
    return (settings['last_update'] &&
            (typeof (blocks[idx]) === 'undefined' ||
                typeof (blocks[idx]['last_update']) === 'undefined' ||
                blocks[idx]['last_update'])) ||
        (!settings['last_update'] &&
            (typeof (blocks[idx]) !== 'undefined' &&
                typeof (blocks[idx]['last_update']) !== 'undefined' &&
                blocks[idx]['last_update'])
        );
}

function TranslateDirection(directionstr) {
    directionstr = 'direction_' + directionstr;
    return language['wind'][directionstr];
}

/**
 * Calculate windspeed in meters per second to Beaufort
 * @param windSpeed in m/s
 * @returns string Wind speed in Bft
 */
function Beaufort(windSpeed) {
    windSpeed = Math.abs(windSpeed);
    if (windSpeed <= 0.2) {
        return '0 Bft';
    }
    if (windSpeed <= 1.5) {
        return '1 Bft';
    }
    if (windSpeed <= 3.3) {
        return '2 Bft';
    }
    if (windSpeed <= 5.4) {
        return '3 Bft';
    }
    if (windSpeed <= 7.9) {
        return '4 Bft';
    }
    if (windSpeed <= 10.7) {
        return '5 Bft';
    }
    if (windSpeed <= 13.8) {
        return '6 Bft';
    }
    if (windSpeed <= 17.1) {
        return '7 Bft';
    }
    if (windSpeed <= 20.7) {
        return '8 Bft';
    }
    if (windSpeed <= 24.4) {
        return '9 Bft';
    }
    if (windSpeed <= 28.4) {
        return '10 Bft';
    }
    if (windSpeed <= 32.6) {
        return '11 Bft';
    }
    return '12 Bft';
}

function triggerStatus(idx, value, device) {
    var random = getRandomInt(1, 100000);
    try {
        eval('getStatus_' + idx + '(idx,value,device)');
    }
    // eslint-disable-next-line no-empty
    catch (err) {}
    if (typeof (onOffstates[idx]) !== 'undefined' && value !== onOffstates[idx]) {
        if (device['Status'] == 'On' || device['Status'] == 'Open') {
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['playsoundOn']) !== 'undefined') {
                playAudio(blocks[idx]['playsoundOn']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['speakOn']) !== 'undefined') {
                speak(blocks[idx]['speakOn']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['messageOn']) !== 'undefined') {
                infoDevicsSwitch(blocks[idx]['messageOn']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['gotoslideOn']) !== 'undefined') {
                toSlide((blocks[idx]['gotoslideOn'] - 1));
                disableStandby();
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['openpopupOn']) !== 'undefined') {
                $('.modal.openpopup,.modal-backdrop').remove();

                $('body').append(createModalDialog('openpopup', 'popup_' + random, blocks[idx]['openpopupOn']));

                $('#popup_' + random).modal('show');

                if (typeof (blocks[idx]['openpopupOn']['auto_close']) !== 'undefined') {
                    setTimeout(function () {
                        $('.modal.openpopup,.modal-backdrop').remove();
                    }, (parseFloat(blocks[idx]['openpopupOn']['auto_close']) * 1000));
                }
            }
        }
        if (device['Status'] == 'Off' || device['Status'] == 'Closed') {
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['playsoundOff']) !== 'undefined') {
                playAudio(blocks[idx]['playsoundOff']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['speakOff']) !== 'undefined') {
                speak(blocks[idx]['speakOff']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['messageOff']) !== 'undefined') {
                infoDevicsSwitch(blocks[idx]['messageOff']);
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['gotoslideOff']) !== 'undefined') {
                toSlide((blocks[idx]['gotoslideOff'] - 1));
                disableStandby();
            }
            if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['openpopupOff']) !== 'undefined') {
                $('.modal.openpopup,.modal-backdrop').remove();

                $('body').append(createModalDialog('openpopup', 'popup_' + random, blocks[idx]['openpopupOff']));

                $('#popup_' + random).modal('show');

                if (typeof (blocks[idx]['openpopupOff']['auto_close']) !== 'undefined') {
                    setTimeout(function () {
                        $('.modal.openpopup,.modal-backdrop').remove();
                    }, (parseFloat(blocks[idx]['openpopupOff']['auto_close']) * 1000));
                }
            }
        }
    }
    onOffstates[idx] = value;
}

// eslint-disable-next-line no-unused-vars
function triggerChange(idx, value, device) {
    if (typeof (oldstates[idx]) !== 'undefined' && value !== oldstates[idx]) {
        //disableStandby();
        try {
            eval('getChange_' + idx + '(idx,value,device)');
        }
        // eslint-disable-next-line no-empty
        catch (err) {}

        if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['flash']) !== 'undefined') {
            var flash_value = blocks[idx]['flash'];
            if (flash_value > 0) {
                $('.block_' + idx).stop().addClass('blockchange', flash_value).removeClass('blockchange', flash_value);
            }
        }

        if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['playsound']) !== 'undefined') {
            playAudio(blocks[idx]['playsound']);
        }
        if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['speak']) !== 'undefined') {
            speak(blocks[idx]['speak']);
        }
        if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['gotoslide']) !== 'undefined') {
            toSlide((blocks[idx]['gotoslide'] - 1));
        }
        if (typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['openpopup']) !== 'undefined') {
            var random = getRandomInt(1, 100000);
            $('.modal.openpopup,.modal-backdrop').remove();

            $('body').append(createModalDialog('openpopup', 'popup_' + random, blocks[idx]['openpopup']));

            $('#popup_' + random).modal('show');

            if (typeof (blocks[idx]['openpopup']['auto_close']) !== 'undefined') {
                setTimeout(function () {
                    $('.modal.openpopup,.modal-backdrop').remove();
                }, (parseFloat(blocks[idx]['openpopup']['auto_close']) * 1000));
            }
        }
    }
    oldstates[idx] = value;
}

function handleDevice(device, idx) {
    var buttonimg = '';
    if (device['Image'] === 'Fan') buttonimg = 'fan.png';
    if (device['Image'] === 'Heating') buttonimg = 'heating.png';
    var html = '';
    var addHTML = true;
    if (device.SubType && device['SubType'] in blocktypes['SubType']) {
        html += getStatusBlock(idx, device, blocktypes['SubType'][device['SubType']]);
        return [html, addHTML];
    }
    if (device.HardwareType && device['HardwareType'] in blocktypes['HardwareType']) {
        if (typeof (blocktypes['HardwareType'][device['HardwareType']]['icon']) !== 'undefined') {
            html += getStatusBlock(idx, device, blocktypes['HardwareType'][device['HardwareType']]);
        } else {
            var c = 1;
            for (var de in blocktypes['HardwareType'][device['HardwareType']]) {
                html = getStatusBlock(idx, device, blocktypes['HardwareType'][device['HardwareType']][de], c);

                triggerStatus(idx + '_' + c, device['LastUpdate'], device);
                triggerChange(idx + '_' + c, device['LastUpdate'], device);

                $('div.block_' + idx + '_' + c).html(html);
                addHTML = false;
                c++;
            }
        }
        return [html, addHTML];
    }
    if (device.HardwareName && device['HardwareName'] in blocktypes['HardwareName']) {
        html += getStatusBlock(idx, device, blocktypes['HardwareName'][device['HardwareName']]);
        return [html, addHTML];
    }
    if (device.SensorUnit && device['SensorUnit'] in blocktypes['SensorUnit']) {
        html += getStatusBlock(idx, device, blocktypes['SensorUnit'][device['SensorUnit']]);
        return [html, addHTML];
    }
    if (device.Type && device['Type'] in blocktypes['Type']) {
        html += getStatusBlock(idx, device, blocktypes['Type'][device['Type']]);
        return [html, addHTML];
    }
    if (device.Name && device['Name'] in blocktypes['Name']) {
        html += getStatusBlock(idx, device, blocktypes['Name'][device['Name']]);
        return [html, addHTML];
    }

    switch (device['Type']) {
        case 'P1 Smart Meter':
            return getSmartMeterBlock(device, idx);
        case 'RFXMeter':
            if (device['SubType'] == 'RFXMeter counter') {
                return getRFXMeterCounterBlock(device, idx);
            }
            break;
        case 'YouLess Meter':
            return getYouLessBlock(device, idx);
        case 'General':
            if (device['SubType'] === 'kWh') {
                return getGeneralKwhBlock(device, idx);
            }
            break;
        case 'Humidity':
            return getHumBlock(device, idx);
        case 'Temp + Humidity + Baro':
        case 'Temp + Humidity':
        case 'Temp + Baro':
        case 'Radiator 1':
        case 'Heating':
            if (device.SubType === 'Zone') //EvoHome Zone device
                return getEvohomeZoneBlock(device, idx);
            if (device.SubType === 'Evohome') //EvoHome Controller device
                return getEvohomeControllerBlock(device, idx);
            if (device.SubType === 'Hot Water') //EvoHome Hot Water device
                return getEvohomeHotWaterBlock(device, idx);
            return getTempHumBarBlock(device, idx);
        case 'Thermostat':
            return getThermostatBlock(device, idx);
        case 'Group':
        case 'Scene':
            /*
                        if (device['Type'] === 'Group') $('.block_' + idx).attr('onclick', 'switchDevice(this)');
                        if (device['Type'] === 'Scene') $('.block_' + idx).attr('onclick', 'switchScene(this)');

                        if (device['Status'] === 'Off') html += iconORimage(idx, 'far fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon');
                        else html += iconORimage(idx, 'fas fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon');
                        html += getBlockData(device, idx, language.switches.state_on, language.switches.state_off);
                        return [html, addHTML];
            */
            return getDefaultSwitchBlock(device, blocks[idx], idx, 'fas fa-lightbulb', 'far fa-lightbulb', buttonimg);
    }

    switch (device['HardwareType']) {
        case 'Toon Thermostat':
            if (device['SubType'] !== 'SetPoint' &&
                device['SubType'] !== 'AC'
            ) {
                return getSmartMeterBlock(device, idx);
            }
            if (device['SubType'] === 'SetPoint') {
                return getThermostatBlock(device, idx);
            }
            break;
        case 'Logitech Media Server':
            html = getLogitechControls(device);
            $('div.block_' + idx).addClass('with_controls');
            return [html, addHTML];
    }

    switch (device['SwitchType']) {
        case 'Dimmer':
            return getDimmerBlock(device, idx, buttonimg);
        case 'Door Contact':
        case 'Contact':
            if (device['Status'] === 'Closed') html += iconORimage(idx, 'fas fa-door-closed', '', 'off icon', '', 2);
            else html += iconORimage(idx, 'fas fa-door-open', '', 'on icon', '', 2);
            html += getBlockData(device, idx, language.switches.state_open, language.switches.state_closed);
            return [html, addHTML];
        case 'Door Lock':
            if (device['Status'] === 'Unlocked') html += iconORimage(idx, 'fas fa-unlock', buttonimg, 'on icon', '', 2);
            else html += iconORimage(idx, 'fas fa-lock', buttonimg, 'off icon', '', 2);
            html += getBlockData(device, idx, language.switches.state_unlocked, language.switches.state_locked);
            return [html, addHTML];
        case 'Venetian Blinds EU':
        case 'Venetian Blinds US':
        case 'Venetian Blinds EU Inverted':
        case 'Venetian Blinds US Inverted':
        case 'Blinds':
        case 'Blinds Inverted':
            return getBlindsBlock(device, idx, false);
        case 'Blinds Percentage':
        case 'Blinds Percentage Inverted':
        case 'Venetian Blinds EU Percentage':
        case 'Venetian Blinds EU Inverted Percentage':
        case 'Venetian Blinds EU Percentage Inverted':
            return getBlindsBlock(device, idx, true);
        case 'Security':
            return getSecurityBlock(device, idx);
        case 'Motion Sensor':
            html += '<div class="col-xs-4 col-icon">';
            html += '<img src="img/motion_' + getIconStatusClass(device['Status']) + '.png" class="' + getIconStatusClass(device['Status']) + ' icon" style="max-height:35px;" />';
            html += '</div>';
            html += getBlockData(device, idx, language.switches.state_movement, language.switches.state_nomovement);
            return [html, addHTML];
        case 'Smoke Detector':
            if (device['Status'] == 'Off' || device['Status'] == 'Normal') html += iconORimage(idx, '', 'heating.png', 'off icon', 'style="max-height:35px;"');
            else html += iconORimage(idx, '', 'heating.png', 'on icon', 'style="max-height:35px;border: 5px solid #F05F40;"');
            html += getBlockData(device, idx, language.switches.state_smoke, language.switches.state_nosmoke);
            return [html, addHTML];
        case 'Doorbell':
            html += iconORimage(idx, 'fas fa-bell', buttonimg, getIconStatusClass(device['Status']) + ' icon');
            html += getBlockData(device, idx, '', '');
            return [html, addHTML];
        case 'Media Player':
            if (device['HardwareType'] == 'Kodi Media Server') html += iconORimage(idx, '', 'kodi.png', 'on icon', '', 2);
            else html += iconORimage(idx, 'fas fa-film', '', 'on icon', '', 2);
            html += '<div class="col-xs-10 col-data">';
            html += '<strong class="title">' + device['Name'] + '</strong><br />';
            if (device['Data'] === '') {
                device['Data'] = language.misc.mediaplayer_nothing_playing;
                if (settings['hide_mediaplayer'] == 1) $('div.block_' + idx).hide();
            } else {
                $('div.block_' + idx).show();
            }
            html += '<span class="h4">' + device['Data'] + '</span>';
            return [html, addHTML];
    }

    if (typeof (device['LevelActions']) !== 'undefined' && device['LevelNames'] !== "") {
        var names;
        if (levelNamesEncoded === true) names = b64_to_utf8(device['LevelNames']).split('|');
        else names = device['LevelNames'].split('|');

        if (device['Status'] === 'Off') html += iconORimage(idx, 'far fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon');
        else html += iconORimage(idx, 'fas fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon');

        if ((typeof (device['SelectorStyle']) !== 'undefined' && device['SelectorStyle'] == 1)) {
            html += '<div class="col-xs-8 col-data">';
            html += '<strong class="title">' + device['Name'] + '</strong><br />';
            html += '<select onchange="slideDevice(' + device['idx'] + ',this.value);">';
            html += '<option value="">' + language.misc.select + '</option>';
            for (var a in names) {
                if (parseFloat(a) > 0 || (a == 0 && (typeof (device['LevelOffHidden']) == 'undefined' || device['LevelOffHidden'] === false))) {

                    var s = '';
                    if ((a * 10) == parseFloat(device['Level'])) s = 'selected';
                    html += '<option value="' + (a * 10) + '" ' + s + '>' + names[a] + '</option>';
                }
            }
            html += '</select>';
            html += '</div>';
        } else {
            html += '<div class="col-xs-8 col-data">';
            html += '<strong class="title">' + device['Name'] + '</strong><br />';
            html += '<div class="btn-group" data-toggle="buttons">';
            for (a in names) {
                if (parseFloat(a) > 0 || (a == 0 && (typeof (device['LevelOffHidden']) == 'undefined' || device['LevelOffHidden'] === false))) {
                    var st = '';
                    if ((a * 10) == parseFloat(device['Level'])) st = 'active';
                    html += '<label class="btn btn-default ' + st + '" onclick="slideDevice(' + device['idx'] + ',$(this).children(\'input\').val());">';
                    html += '<input type="radio" name="options" autocomplete="off" value="' + (a * 10) + '" checked>' + names[a];
                    html += '</label>';
                }
            }
            html += '</select>';
            html += '</div>';
            html += '</div>';
        }

    } else if (device['SubType'] == 'Custom Sensor') {
        this.icon = 'fas fa-question';
        if (device['Image'] === 'Water') this.icon = 'fas fa-tint';
        else if (device['Image'] === 'Heating') this.icon = 'fas fa-utensils';

        html += iconORimage(idx, this.icon, '', 'on icon');
        html += '<div class="col-xs-8 col-data">';
        this.title = device['Name'];
        this.value = device['Data'];
        if (titleAndValueSwitch(idx)) {
            this.title = device['Data'];
            this.value = device['Name'];
        }
        html += '<strong class="title">' + this.title + '</strong><br />';
        html += '<span class="state">' + this.value + '</span>';

        if (showUpdateInformation(idx)) {
            html += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
        }
        html += '</div>';
    } else if (device['HardwareName'] === 'Dummy') {
        return getDefaultSwitchBlock(device, blocks[idx], idx, 'fas fa-toggle-on', 'fas fa-toggle-off', buttonimg);
    } else {
        return getDefaultSwitchBlock(device, blocks[idx], idx, 'fas fa-lightbulb', 'far fa-lightbulb', buttonimg);
    }

    return [html, addHTML];
}


function getLogitechControls(device) {
    this.html = '';
    this.html += iconORimage(device['idx'], 'fas fa-music', '', 'on icon', '', 2);
    this.html += '<div class="col-xs-10 col-data">';
    this.html += '<strong class="title">' + device['Name'] + '</strong><br />';
    this.html += '<span class="h4">' + device['Data'] + '</span>';
    this.html += '<div>';
    this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'Rewind\');"><em class="fas fa-arrow-circle-left fa-small"></em></a> ';
    this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'Stop\');"><em class="fas fa-stop-circle fa-small"></em></a> ';
    if (device['Status'] === 'Playing') {
        this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'Pause\');"><em class="fas fa-pause-circle fa-small"></em></a> ';
    } else {
        this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'Play\');"><em class="fas fa-play-circle fa-small"></em></a> ';
    }
    this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'Forward\');"><em class="fas fa-arrow-circle-right fa-small"></em></a>';
    this.html += '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
    this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'VolumeDown\');"><em class="fas fa-minus-circle fa-small"></em></a>';
    this.html += '&nbsp;';
    this.html += '<a href="javascript:controlLogitech(' + device['idx'] + ',\'VolumeUp\');"><em class="fas fa-plus-circle fa-small"></em></a>';
    this.html += '</div>';
    this.html += '</div>';

    return this.html;
}

function getSmartMeterBlock(device, idx) {
    if (device['SubType'] === 'Energy') {
        if ($('div.block_' + idx).length > 0) {
            allblocks[idx] = true;
        }
        this.usage = device['Usage'];
        if (typeof (device['UsageDeliv']) !== 'undefined' && (parseFloat(device['UsageDeliv']) > 0 || parseFloat(device['UsageDeliv']) < 0)) {
            this.usage = device['UsageDeliv'];
        }

        var data = device['Data'].split(';');
        var blockValues = [{
                icon: 'fas fa-plug',
                idx: idx + '_1',
                title: language.energy.energy_usage,
                value: this.usage,
                unit: ''
            },
            {
                icon: 'fas fa-plug',
                idx: idx + '_2',
                title: language.energy.energy_usagetoday,
                value: number_format(device['CounterToday'], settings['units'].decimals.kwh),
                unit: settings['units'].names.kwh
            },
            {
                icon: 'fas fa-plug',
                idx: idx + '_3',
                title: language.energy.energy_totals,
                value: number_format(device['Counter'], 0),
                unit: settings['units'].names.kwh
            }
        ];

        if (parseFloat(device['CounterDeliv']) > 0) {
            blockValues.push({
                icon: 'fas fa-plug',
                idx: idx + '_4',
                title: language.energy.energy_delivered,
                value: number_format(device['CounterDeliv'], 0),
                unit: settings['units'].names.kwh
            });
            blockValues.push({
                icon: 'fas fa-plug',
                idx: idx + '_5',
                title: language.energy.energy_deliveredtoday,
                value: number_format(device['CounterDelivToday'], settings['units'].decimals.kwh),
                unit: settings['units'].names.kwh
            });
        }

        if (typeof (data[1]) !== 'undefined') {
            data[0] = data[0] / 1000;
            data[1] = data[1] / 1000;
            blockValues.push({
                icon: 'fas fa-plug',
                idx: idx + '_6',
                title: language.energy.energy_totals,
                value: 'P1: ' + number_format(data[0], 3, '.', '') + ' ' + settings['units'].names.kwh + '<br />P2: ' + number_format(data[1], 3, '.', '') + ' ' + settings['units'].names.kwh,
                unit: ''
            });

            blockValues.push({
                icon: 'fas fa-plug',
                idx: idx + '_7',
                title: language.energy.energy_totals + ' P1',
                value: number_format(data[0], 3, '.', ''),
                unit: settings['units'].names.kwh
            });

            blockValues.push({
                icon: 'fas fa-plug',
                idx: idx + '_8',
                title: language.energy.energy_totals + ' P2',
                value: number_format(data[1], 3, '.', ''),
                unit: settings['units'].names.kwh
            });
        }
        createBlocks(blockValues, device);
        return ['', false];
    }
    if (device['SubType'] === 'Gas') {
        if ($('div.block_' + idx).length > 0) {
            allblocks[idx] = true;
        }
        var myblockValues = [{
                icon: 'fas fa-fire',
                idx: idx + '_1',
                title: language.energy.gas_usagetoday,
                value: device['CounterToday'],
                unit: ''
            },
            {
                icon: 'fas fa-fire',
                idx: idx + '_2',
                title: language.energy.energy_totals + ' ' + device['Name'],
                value: device['Counter'],
                unit: 'm3'
            }
        ];
        createBlocks(myblockValues, device);
        return ['', false];
    }
    return ['', false];
}

function getRFXMeterCounterBlock(device, idx) {
    if ($('div.block_' + idx).length > 0) {
        allblocks[idx] = true;
    }
    var unit = '';
    var decimals = 2;
    var icon = 'fas fa-fire';

    switch (device['SwitchTypeVal']) {
        case 0:
            unit = settings['units'].names.kwh;
            decimals = settings['units'].decimals.kwh;
            icon = 'fas fa-bolt';
            break;

        case 1:
            unit = settings['units'].names.gas;
            decimals = settings['units'].decimals.gas;
            icon = 'fas fa-fire';
            break;

        case 2:
            unit = settings['units'].names.water;
            decimals = settings['units'].decimals.water;
            icon = 'fas fa-tint';
            break;

        case 3:
            unit = device['ValueUnits'];
            break;

        case 4:
            unit = settings['units'].names.kwh;
            decimals = settings['units'].decimals.kwh;
            icon = 'fas fa-sun';
            break;

        case 5:
            unit = settings['units'].names.time;
            decimals = settings['units'].decimals.time;
            icon = 'far fa-clock';
            break;
    }

    var blockValues = [{
            icon: icon,
            idx: idx + '_1',
            title: device['Name'],
            value: number_format(device['CounterToday'].split(' ')[0], decimals),
            unit: unit
        },
        {
            icon: icon,
            idx: idx + '_2',
            title: language.energy.energy_totals + ' ' + device['Name'],
            value: number_format(device['Counter'].split(' ')[0], decimals),
            unit: unit
        }
    ];
    if (typeof (device['Usage']) !== 'undefined') {
        blockValues.push({
            icon: icon,
            idx: idx + '_3',
            title: device['Name'],
            value: number_format(device['Usage'].split(' ')[0], decimals),
            unit: unit
        })
    }
    createBlocks(blockValues, device);
    return ['', false];
}

function getYouLessBlock(device, idx) {
    this.html = '';
    if ($('div.block_' + idx).length > 0) {
        allblocks[idx] = true;
    }
    var blockValues = [{
            icon: 'fas fa-fire',
            idx: idx + '_1',
            title: device['Name'],
            value: number_format(device['CounterToday'].split(' ')[0], settings['units'].decimals.kwh),
            unit: settings['units'].names.kwh
        },
        {
            icon: 'fas fa-fire',
            idx: idx + '_2',
            title: language.energy.energy_totals + ' ' + device['Name'],
            value: number_format(device['Counter'], settings['units'].decimals.kwh),
            unit: settings['units'].names.kwh
        }
    ];
    if (typeof (device['Usage']) !== 'undefined') {
        blockValues.push({
            icon: 'fas fa-fire',
            idx: idx + '_3',
            title: device['Name'],
            value: number_format(device['Usage'], settings['units'].decimals.watt),
            unit: settings['units'].names.watt
        })
    }
    createBlocks(blockValues, device);
    return ['', false];
}

function createBlocks(blockValues, device) {
    blockValues.forEach(function (blockValue, index) {

        if (typeof (blocks[blockValue.idx]) !== 'undefined' && typeof (blocks[blockValue.idx]['icon']) !== 'undefined') blockValue.icon = blocks[blockValue.idx]['icon'];

        triggerStatus(blockValue.idx, device['LastUpdate'], device);
        triggerChange(blockValue.idx, device['LastUpdate'], device);

        if (typeof (blocks[blockValue.idx]) !== 'undefined' && typeof (blocks[blockValue.idx]['title']) !== 'undefined') blockValue.title = blocks[blockValue.idx]['title'];
        this.html = getStateBlock(blockValue.idx, blockValue.icon, blockValue.title, blockValue.value + ' ' + blockValue.unit, device);
        if (!index) {
            if (!$('div.block_' + device['idx']).hasClass('block_' + blockValue.idx)) $('div.block_' + device['idx']).addClass('block_' + blockValue.idx);
        } else {
            if (typeof (allblocks[device['idx']]) !== 'undefined' &&
                $('div.block_' + blockValue.idx).length == 0
            ) {

                //sometimes there is a block_IDX_3 and block_IDX_6, but no block_IDX_4, therefor, loop to remove classes
                //(e.g. with smart P1 meters, when there's no CounterDeliv value)
                var newblock = $('div.block_' + device['idx']).last().clone();
                for (var i = 1; i <= 10; i++) {
                    newblock.removeClass('block_' + device['idx'] + '_' + i);
                }
                newblock.addClass('block_' + blockValue.idx).insertAfter($('div.block_' + device['idx']).last());
            }
        }
        $('div.block_' + blockValue.idx).html(this.html);
    });
}

function getGeneralKwhBlock(device, idx) {
    this.html = '';
    if ($('div.block_' + idx).length > 0) {
        allblocks[idx] = true;
    }
    var blockValues = [{
            icon: 'fas fa-fire',
            idx: idx + '_1',
            title: device['Name'] + ' ' + language.energy.energy_now,
            value: number_format(device['Usage'], settings['units'].decimals.watt),
            unit: settings['units'].names.watt
        },
        {
            icon: 'fas fa-fire',
            idx: idx + '_2',
            title: device['Name'] + ' ' + language.energy.energy_today,
            value: number_format(device['CounterToday'], settings['units'].decimals.kwh),
            unit: settings['units'].names.kwh
        },
        {
            icon: 'fas fa-fire',
            idx: idx + '_3',
            title: device['Name'] + ' ' + language.energy.energy_total,
            value: number_format(device['Data'], 2),
            unit: settings['units'].names.kwh
        }
    ];
    createBlocks(blockValues, device);
    return ['', false];
}

function getHumBlock(device, idx) {
    this.html = '';
    var blockValues = [{
        icon: 'wi wi-humidity',
        idx: idx,
        title: device['Name'],
        value: number_format(device['Humidity'], 0),
        unit: '%'
    }, ];
    createBlocks(blockValues, device);
    return ['', false];
}

function getTempHumBarBlock(device, idx) {
    this.html = '';
    if ($('div.block_' + idx).length > 0) {
        allblocks[idx] = true;
    }
    var single_block = (typeof (blocks[idx]) !== 'undefined' &&
        typeof (blocks[idx]['single_block']) !== 'undefined' &&
        blocks[idx]['single_block']
    );

    var blockValues = [{
        icon: 'fas fa-thermometer-half',
        idx: idx + '_1',
        title: device['Name'],
        value: number_format((typeof (device['Temp']) !== 'undefined') ? device['Temp'] : device['Data'], 1),
        unit: _TEMP_SYMBOL
    }, ];
    if (typeof (device['Humidity']) !== 'undefined') {
        if (single_block) {
            blockValues[0].value += ' ' + blockValues[0].unit + ' / ' + number_format(device['Humidity'], 0) + ' %';
            blockValues[0].unit = '';
        } else {
            blockValues.push({
                icon: 'wi wi-humidity',
                idx: idx + '_2',
                title: device['Name'],
                value: number_format(device['Humidity'], 0),
                unit: '%'
            });
        }
    }
    if (typeof (device['Barometer']) !== 'undefined') {
        if (single_block) {
            blockValues[0].value += ' / ' + device['Barometer'] + ' hPa';
        } else {
            blockValues.push({
                icon: 'wi wi-barometer',
                idx: idx + '_3',
                title: device['Name'],
                value: device['Barometer'],
                unit: 'hPa'
            });
        }
    }

    createBlocks(blockValues, device);
    return ['', false];
}




// eslint-disable-next-line no-unused-vars
function loadMaps(b, map) {

    if (typeof (map.link) !== 'undefined') {
        map['url'] = map.link;
        $('body').append(createModalDialog('', 'trafficmap_frame_' + b, map));
    }

    var key = 'UNKNOWN';
    if (typeof (map.key) !== 'undefined') key = map.key;

    var width = 12;
    if (typeof (map.width) !== 'undefined') width = map.width;
    var html = '';
    if (typeof (map.link) !== 'undefined') html = '<div class="col-xs-' + width + ' mh hover swiper-no-swiping transbg block_trafficmap" data-toggle="modal" data-target="#trafficmap_frame_' + b + '" onclick="setSrc(this);" ';
    else html = '<div class="col-xs-' + width + ' mh swiper-no-swiping transbg block_trafficmap" ';
    if (typeof (map.height) !== 'undefined') html += ' style="height:' + map.height + 'px !important;"';
    html += '>';
    html += '<div id="trafficmap_' + b + '" data-id="maps.' + key + '" class="trafficmap"></div>';
    html += '</div>';
    setTimeout(function () {
        showMap('trafficmap_' + b, map);
    }, 1000)
    return html;
}




// eslint-disable-next-line no-unused-vars
function appendHorizon(columndiv) {
    var html = '<div data-id="horizon" class="containshorizon">';
    html += '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E0x07\')">';
    html += '<em class="fas fa-chevron-left fa-small"></em>';
    html += '</div>';
    html += '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E4x00\')">';
    html += '<em class="fas fa-pause fa-small"></em>';
    html += '</div>';
    html += '<div class="col-xs-4 transbg hover text-center" onclick="ziggoRemote(\'E0x06\')">';
    html += '<em class="fas fa-chevron-right fa-small"></em>';
    html += '</div>';
    html += '</div>';
    $(columndiv).append(html);
}


// eslint-disable-next-line no-unused-vars
function getAllDevicesHandler(value) {
    //    debugger;
    //    console.log('alldevices update');
    alldevices = Domoticz.getAllDevices()
    $('.solar').remove();
    if ($('.sunrise').length > 0) {
        $('.sunrise').html(alldevices['_Sunset']);
    }
    if ($('.sunset').length > 0)
        $('.sunset').html(alldevices['_Sunset']);

    $('div.newblocks.plugins').html('');
    $('div.newblocks.domoticz').html('');
    // ##############################################
    // MULTIGRAPH START                             #
    // ##############################################
    //todo: needs to be refactored. Now the multigraphs get updates after every device update
    /* if ($("div[class*='block_multigraph_']").length > 0) {
        //debugger;

        for (var b in blocks) {
            if (b.substring(0, 11) === 'multigraph_') {

                var arrMgIdx = blocks[b]['devices'];
                arrMgIdx.sort(function (a, b) {
                    return a - b;
                });
                var mgId = parseInt(b.replace('multigraph_', ''));
                var arrMgDev = [];

                $.each(arrMgIdx, function (index, mgIdx) {
                                         // var device = data.result.filter(function(obj){
                                            // return parseInt(obj.idx) === mgIdx
                                        // })
                                        // device[0].primaryIdx = mgId;
                                        // arrMgDev.push(device[0]);
                    var device = $.extend({
                        primaryIdx: mgId
                    }, alldevices[mgIdx]);
                    arrMgDev.push(device);

                });
                getMultiGraphs(arrMgDev);
            }
        }
    } */
    // ##############################################
    // MULTIGRAPH END                               #
    // ##############################################

    if (typeof (afterGetDevices) === 'function') afterGetDevices();
}

// eslint-disable-next-line no-unused-vars
function getDevices(override) {
    Domoticz.update();
    /*
    if (typeof (override) == 'undefined') override = false;
    if (!sliding || override) {

        alldevices = Domoticz.getAllDevices()
        if (!sliding || override) {
            Domoticz.update();
        }
    }
    */
}

function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

function infoDevicsSwitch(msg) {
    $('body').append('<div class="update">&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>');
    setTimeout(function () {
        $(".update").fadeOut();
    }, 10000);
}

function speak(textToSpeak) {
    var newUtterance = new SpeechSynthesisUtterance();
    newUtterance.text = textToSpeak;
    newUtterance.lang = settings['speak_lang'];
    window.speechSynthesis.speak(newUtterance);
}

function playAudio(file) {
    //    var key = $.md5(file);
    file = file.split('/');

    var filename = file[(file.length - 1)].split('.');
    filename = filename[0];
    delete file[(file.length - 1)];

    ion.sound({
        sounds: [{
            name: filename
        }],

        path: file.join('/') + "/",
        preload: true,
        multiplay: false
    });

    ion.sound.play(filename);
}

function createModalDialog(dialogClass, dialogId, myFrame) {
    var setWidth = false;
    var setHeight = false;
    var mySetUrl = 'data-popup';
    var mywidth = '',
        myheight = '';
    if (typeof (myFrame.framewidth) !== 'undefined') {
        mywidth = myFrame.framewidth;
        setWidth = true;
        if (typeof (mywidth) === 'number')
            mywidth = mywidth + 'px';
    }
    if (typeof (myFrame.frameheight) !== 'undefined') {
        myheight = myFrame.frameheight;
        setHeight = true;
        if (typeof (myheight) === 'number')
            myheight = myheight + 'px';
    }
    var html = '<div class="modal fade ' + dialogClass + '" id="' + dialogId + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';

    html += '<div class="modal-dialog modal-dialog-custom" style="'
    html += setWidth ? 'width: ' + mywidth + '; ' : '';
    html += '" >';

    html += '<div class="modal-content">';
    html += '<div class="modal-header frameclose">';
    html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body modalframe">';
    if (dialogClass === 'openpopup') {
        mySetUrl = 'src';
    }
    html += '<div id="loadingMessage">' + language.misc.loading + '</div>';
    html += '<iframe class="popupheight" ' + mySetUrl + '="' + myFrame.url + '" width="100%" height="100%" frameborder="0" allowtransparency="true" style="'
    html += setHeight ? 'height: ' + myheight + '; ' : '';
    html += '" onload="removeLoading()" ></iframe> ';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
}

/*Todo: make map a regular block*/
// eslint-disable-next-line no-unused-vars
function initMap() {
    if ($('#trafficm').length > 0) {
        showMap('trafficm');
        setInterval(function () {
            showMap('trafficm');
        }, (60000 * 5));
    }
}

function showMap(mapid, map) {
    if (typeof (settings['gm_api']) == 'undefined' ||
        settings['gm_api'] == "" ||
        settings['gm_api'] == 0) {
        console.log('Please, set Google Maps API KEY!');
        infoMessage('Info:', 'Please, set Google Maps API KEY!', 8000);
        return
    }
    if (typeof (map) !== 'undefined') {
        map = new google.maps.Map(document.getElementById(mapid), {
            zoom: map.zoom,
            center: {
                lat: map.latitude,
                lng: map.longitude
            }
        });
    } else {
        map = new google.maps.Map(document.getElementById(mapid), {
            zoom: parseFloat(settings['gm_zoomlevel']),
            center: {
                lat: parseFloat(settings['gm_latitude']),
                lng: parseFloat(settings['gm_longitude'])
            }
        });
    }

    var transitLayer = new google.maps.TrafficLayer();
    transitLayer.setMap(map);
}

function getSecurityBlock(device, idx) {
    var html = '';
    if (device['Status'] === 'Normal') html += iconORimage(idx, 'fas fa-shield-alt', '', 'off icon', '', 2);
    else html += iconORimage(idx, 'fas fa-shield-alt', '', 'on icon', '', 2);

    var secPanelicons = (settings['security_button_icons'] === true || settings['security_button_icons'] === 1 || settings['security_button_icons'] === '1') ? true : false;
    var da = 'default';
    var ah = 'default';
    var aa = 'default';
    var disarm = language.switches.state_disarm;
    var armhome = language.switches.state_armhome;
    var armaway = language.switches.state_armaway;

    if (secPanelicons === true) {
        disarm = '<i class="fa fa-unlock" title="' + language.switches.state_disarm + '"></i>';
        armhome = '<i class="fa fa-home" title="' + language.switches.state_armhome + '"></i>';
        armaway = '<i class="fa fa-home" title="' + language.switches.state_armaway + '"></i><i class="fa fa-walking"></i>';
    }
    if (device['Status'] === 'Normal') {
        da = 'warning';
        if (secPanelicons === false) disarm = language.switches.state_disarmed;
        else disarm = '<i class="fas fa-unlock" title="' + language.switches.state_disarmed + '"></i>';
    }
    if (device['Status'] === 'Arm Home') {
        ah = 'danger';
        if (secPanelicons === false) armhome = language.switches.state_armedhome;
        else armhome = '<i class="fas fa-home" title="' + language.switches.state_armedhome + '"></i>';
    }
    if (device['Status'] === 'Arm Away') {
        aa = 'danger';
        if (secPanelicons === false) armaway = language.switches.state_armedaway;
        else armaway = '<i class="fas fa-home" title="' + language.switches.state_armaway + '"></i><i class="fas fa-walking"></i>';
    }
    if (device['Type'] === 'Security') {
        html += '<div class="col-xs-8 col-data" style="width: calc(100% - 50px);">';
        html += '<strong class="title">' + device['Name'] + '</strong><br />';
        html += '<div class="btn-group" data-toggle="buttons">';
        html += '<label class="btn btn-' + da + '" onclick="enterCode(0)">';
        html += '<input type="radio" name="options" autocomplete="off" value="Normal" checked>' + disarm;
        html += '</label>';
        html += '<label class="btn btn-' + ah + '" onclick="enterCode(1)">';
        html += '<input type="radio" name="options" autocomplete="off" value="Arm Home" checked>' + armhome;
        html += '</label>';
        html += '<label class="btn btn-' + aa + '" onclick="enterCode(2)">';
        html += '<input type="radio" name="options" autocomplete="off" value="Arm Away" checked>' + armaway;
        html += '</label>';
        html += '</div>';
        html += '</div>';
    }
    return [html, true];
}

//# sourceURL=js/blocks.js