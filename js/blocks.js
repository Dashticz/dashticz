/* eslint-disable no-debugger */
/*global blocktypes:writable, language, _TEMP_SYMBOL, getExtendedBlockTypes, blocks, settings, getFullScreenIcon, FlipClock, loadWeatherFull, loadWeather*/
/*global getSpotify, loadNZBGET, getCoin, loadChromecast, loadGarbage, loadSonarr, loadMaps */
/*global Dashticz, getLog, appendHorizon, addCalendar*/
/*global alldevices getIconStatusClass*/
/*global getRandomInt, moment, number_format*/

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

//var myBlockNumbering = 0; //To give all blocks a unique number
//class="col-sm-' + cols['width'] + ' col-xs-12 sortable col'
// eslint-disable-next-line no-unused-vars
function getBlock(cols, c, screendiv, standby) {
//    if (c==='bar') debugger;
    if (typeof (cols) !== 'undefined') {
        var columndiv = screendiv + ' .row .col' + c;
        var colclass = '';
        if (c === 'bar') colclass = 'transbg dark';
        var colwidth = 'col-sm-' + (cols.width ? cols.width + ' ': '12 ');
        if (standby) {
//            $('div.screenstandby .row').append('<div class="col-xs-' + columns_standby[c]['width'] + ' colstandby' + c + '"></div>');
            $(screendiv+ ' .row').append('<div class="' + colwidth +  ' col-xs-12 col' + c + '"></div>');
        } else {
            $(screendiv + ' .row').append('<div data-colindex="' + c + '" class="' + colwidth + ' col-xs-12 sortable col' + c + ' ' + colclass + '"></div>');
        }
        //if (!standby) $('div.screen' + ' .row').append('<div data-colindex="' + c + '" class="col-sm-' + cols['width'] + ' col-xs-12 sortable col' + c + ' ' + colclass + '"></div>');
        for (var b in cols['blocks']) {
            var width = 12;
            switch (cols['blocks'][b]) {
                case 'logo':
                case 'settings':
                    width = 2;
                    break;
                case 'flipclock':
                case 'miniclock':
                    width = 8;
                    break;
            }
            var blockdef = null;
            if (typeof (blocks[cols['blocks'][b]]) !== 'undefined')
                blockdef = blocks[cols['blocks'][b]];
            if (blockdef && typeof (blockdef.width) !== 'undefined') width = blockdef.width;
            var myblockselector = Dashticz.mountNewContainer(columndiv);
            if(!Dashticz.mount(myblockselector, cols['blocks'][b]))
                switch (typeof (cols['blocks'][b])) {
                    case 'object':
                        handleObjectBlock(cols['blocks'][b], myblockselector, width, c);
                        continue;

                    case 'string':
                        handleStringBlock(cols['blocks'][b], myblockselector, width, c);
                        continue;

                    default:
                        $(myblockselector).html('<div data-id="' + cols['blocks'][b] + '" class="mh transbg block_' + cols['blocks'][b] + '"></div>');
                        break;
            }
        }
    }
}


function handleStringBlock(block, columndiv, width, c) {
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
            if (typeof(getNewsPlus) !== 'function') $.ajax({url: 'js/newsplus.js', async: false, dataType: "script"});
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
            if (block.substring(0, 6) === 'graph_') {
                $(columndiv).append('<div data-id="' + block + '" class="transbg block_' + block + '"></div>');
                return;
            }
            $(columndiv).append('<div data-id="' + block + '" class="mh transbg block_' + block + '"></div>');
            return;
    }
}

function handleObjectBlock(block, columndiv, width) {
    var random = getRandomInt(1, 100000);
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

    }  else if (block.icalurl ||
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
        Dashticz.mountSpecialBlock(columndiv, block, Dashticz.components["button"]);
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
        var windspeed=device.Data.split(';')[2]/10;
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
    }
    else if (typeof(device) !== 'undefined') {
        if (device['SubType'] == 'Percentage' || device['SubType'] == 'Custom Sensor' || device['TypeImg'] == 'counter'
            || device['Type'] == 'Temp' || device['Type'] == 'Humidity' || device['Type'] == 'Wind' || device['Type'] == 'Rain'
            || device['Type'] == 'Temp + Humidity' || device['Type'] == 'Temp + Humidity + Baro'
            || device['SubType'] == 'kWh' || device['SubType'] === 'Lux' || device['SubType'] === 'Solar Radiation' ||
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
    if (defaultimage !== '') {
        useImage = true;
    }
    var isOn = false;
    if (typeof (alldevices[idx]) !== 'undefined' && typeof (alldevices[idx]['Status']) !== 'undefined')
        isOn = (getIconStatusClass(alldevices[idx]['Status']) === 'on');
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

