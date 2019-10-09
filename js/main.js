/* eslint-disable no-prototype-builtins */
/* global customfolder myBlockNumbering:writable objectlength config initVersion loadSettings settings getRandomInt number_format levelNamesEncoded _TEMP_SYMBOL hexToHsb Cookies*/
/* global sessionValid MobileDetect moment getBlock buttons handleObjectBlock getGraphs iconORimage getBlockData titleAndValueSwitch showUpdateInformation getStateBlock addThermostatFunctions*/
/* global loadWeatherFull loadWeather Swiper ion MoonPhase StationClock*/

//To refactor later:
/* global blocktypes afterGetDevices getStatusBlock google slideDeviceExt switchSecurity*/

// Currently not in use anymore:
/* global startSortable */

/*To be removed from this file: appendHorizon loadMaps*/

var language = {};
var cache = new Date().getTime();

// device detection
// eslint-disable-next-line no-unused-vars
var standby = true;
var standbyActive = false;
var standbyTime = 0;
var swipebackTime = 0;
// eslint-disable-next-line no-unused-vars
var audio = {};
var screens = {};
var columns = {};
var columns_standby = {};
var blocks = {};
var req;
// eslint-disable-next-line no-unused-vars
var slide;
var sliding = false;
var defaultcolumns = false;
var allblocks = {};
var alldevices = {};
var myswiper;
var addedThermostat = [];
var oldstates = [];
var onOffstates = [];
var gettingDevices = false;
var md;
var usrEnc='';
var pwdEnc='';
var _STREAMPLAYER_TRACKS = { "track": 1, "name": "Music FM", "file": "http://stream.musicfm.hu:8000/musicfm.mp3" };
// eslint-disable-next-line no-unused-vars
var _THOUSAND_SEPARATOR = '.';
// eslint-disable-next-line no-unused-vars
var _DECIMAL_POINT = ',';
var _STANDBY_CALL_URL = '';
var _END_STANDBY_CALL_URL = '';
var lastGetDevicesTime = 0;
var allVariables = {};
// eslint-disable-next-line no-unused-vars
var map;


function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
}

// eslint-disable-next-line no-unused-vars
function loadFiles() {

    $.ajax({ url: customfolder + '/CONFIG.js', dataType: 'script' })
    .error(function() {
        console.log('Error in config.js');
        $('#hide').show();
        $('#loaderHolder').fadeOut();
        return;
    })
    .then(function () {
        setTimeout(function() {
            $('#loaderHolder').fadeOut();
        }, 1000);
        $('body').css('overflow', 'auto');
    
        if (objectlength(columns) === 0) defaultcolumns = true;

        //Check language before loading settings and fallback to English when not set
        var setLang = 'en_US';
        if (typeof (localStorage.dashticz_language) !== 'undefined') {
            setLang = localStorage.dashticz_language
        }
        else if (typeof (config) !== 'undefined' && typeof (config.language) !== 'undefined') {
            setLang = config.language;
        }
        return $.ajax({
            url: 'lang/' + setLang + '.json?v=' + cache,  dataType: 'json', success: function (data) {
                language = data;
            }
        });
    })
    .then(function(){
        return $.ajax({ url: 'js/version.js',  dataType: 'script' });
    })
    .then(function() {
        return initVersion();
    })
    .then(function(){

        return $.ajax({ url: 'js/settings.js', dataType: 'script' });
    })
    .then(function () {
        loadSettings();
        usrEnc = '';
        pwdEnc = '';
        if (typeof (settings['user_name']) !== 'undefined') {
            usrEnc = window.btoa(settings['user_name']);
            pwdEnc = window.btoa(settings['pass_word']);
        }
        if (typeof (screens) === 'undefined' || objectlength(screens) === 0) {
            screens = {};
            screens[1] = {};
            screens[1]['background'] = settings['background_image'];
            screens[1]['columns'] = [];
            if (defaultcolumns === false) {
                for (var c in columns) {
                    if (c !== 'bar') screens[1]['columns'].push(c);
                }
            }
        }

        $('<link href="vendor/weather/css/weather-icons.min.css?v=' + cache + '" rel="stylesheet">').appendTo('head');

        if (settings['theme'] !== 'default') {
            $('<link rel="stylesheet" type="text/css" href="themes/' + settings['theme'] + '/' + settings['theme'] + '.css?v=' + cache + '" />').appendTo('head');
        }
        $('<link href="' + customfolder + '/custom.css?v=' + cache + '" rel="stylesheet">').appendTo('head');

        if (typeof (settings['edit_mode']) !== 'undefined' && settings['edit_mode'] == 1) {
            $('<link href="css/sortable.css?v=' + cache + '" rel="stylesheet">').appendTo('head');
            $.ajax({ url: 'js/sortable.js', async: false, dataType: 'script' });

            var html = '<div class="newblocksHolder" style="display:none;">';
            html += '<div class="title">' + language.editmode.add_plugin + '</div>';
            html += '<div class="newblocks plugins sortable"></div>';
            html += '<div class="title">' + language.editmode.add_block + '</div>';
            html += '<div class="newblocks domoticz sortable"></div>';
            html += '</div>';

            $('body').prepend(html);
        }

        return $.when(
            $.ajax({ url: 'js/switches.js', dataType: 'script' }),
            $.ajax({ url: 'js/thermostat.js', dataType: 'script' })
        );
    })
    .then (function(){
        return $.ajax({ url: customfolder + '/custom.js?v=' + cache, dataType: 'script' });
    })
    .then (function(){
        return $.when(
//            $.ajax({ url: 'js/switches.js', async: false, dataType: 'script' });
            $.ajax({ url: 'js/blocks.js',  dataType: 'script' }),
            $.ajax({ url: 'js/graphs.js',  dataType: 'script' }),
            $.ajax({ url: 'js/login.js', dataType: 'script' }),
            $.ajax({ url: 'js/moon.js',  dataType: 'script' })
        );
    })
    .then(function () {

        sessionValid();

        if (typeof (settings['gm_api']) !== 'undefined' && settings['gm_api'] !== '' && settings['gm_api'] !== 0) {
            return $.ajax({
                url: 'https://maps.googleapis.com/maps/api/js?key=' + settings['gm_api'],
                dataType: 'script'
            }).done(function () {
                setTimeout(function () {
                    initMap();
                }, 2000);
            });
        }
    })
    .then(function() {
        onLoad();
    })

}

function onLoad() {
    md = new MobileDetect(window.navigator.userAgent);

    if (settings['edit_mode'] == 1) {
        $('body').append('<div class="editmode">' + language.editmode.edit + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<a href="javascript:void(0);" onclick="saveBlocks();" style="color:#fff;"><em class="fas fa-save" /></a>&nbsp;&nbsp;</div>');
    }

    $('body').attr('unselectable', 'on')
        .css({
            '-moz-user-select': 'none',
            '-o-user-select': 'none',
            '-khtml-user-select': 'none',
            '-webkit-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none'
        }).bind('selectstart', function () {
            return false;
        });

    buildScreens();
    setTimeout(function () {
        $('#loaderHolder').fadeOut();
        $('body').css('overflow', 'auto');
    }, 2000);

    setClockDateWeekday();
    setInterval(function () {
        setClockDateWeekday();
    }, settings['hide_seconds'] ? 30000 : 1000);

    enableRefresh();
    getVariables();
    getDevices();
    setClassByTime();

    setInterval(function () {
        setClassByTime();
    }, (60000));

    setTimeout(function () {
        // eslint-disable-next-line no-self-assign
        window.location.href = window.location.href;
    }, (settings['dashticz_refresh'] * 60 * 1000));

    if (typeof (settings['auto_swipe_back_to']) !== 'undefined' && typeof (settings['auto_swipe_back_after']) !== 'undefined') {
        if (parseFloat(settings['auto_swipe_back_after']) > 0) {
            setInterval(function () {
                swipebackTime += 1000;
                if (swipebackTime >= (settings['auto_swipe_back_after'] * 1000)) {
                    toSlide((settings['auto_swipe_back_to'] - 1));
                    swipebackTime = 0;
                }
            }, 1000);

        }
    }

    if (typeof (settings['disable_googleanalytics']) == 'undefined' || parseFloat(settings['disable_googleanalytics']) == 0) {

        var googleAnalytics = "<script>";
        googleAnalytics += "(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){";
        googleAnalytics += "(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),";
        googleAnalytics += "m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)";
        googleAnalytics += "})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');";

        googleAnalytics += "ga('create', 'UA-102837285-1', 'auto');";
        googleAnalytics += "ga('send', 'pageview');";

        googleAnalytics += "</script>";
        $('body').prepend(googleAnalytics);
    }

    if ((settings['auto_swipe_back_after'] == 0 || typeof (settings['auto_swipe_back_after']) == 'undefined') && parseFloat(settings['auto_slide_pages']) > 0) {
        var nextSlide = 1;
        setInterval(function () {
            toSlide(nextSlide);
            nextSlide++;
            if (nextSlide > myswiper.slides.length - 1) {
                nextSlide = 0;
            }
        }, (parseFloat(settings['auto_slide_pages']) * 1000));
    }

    if (md.mobile() == null) {
        $('body').bind('mousemove', function () {
            standbyTime = 0;
            swipebackTime = 0;
            disableStandby();
        });
    }

    $('body').bind('touchend click', function () {
        setTimeout(function () {
            standbyTime = 0;
            swipebackTime = 0;
            disableStandby();
        }, 100);
    });

    if (parseFloat(settings['standby_after']) > 0) {
        if (typeof (settings['standby_call_url']) !== 'undefined') {
            _STANDBY_CALL_URL = settings['standby_call_url'];
        }
        if (typeof (settings['standby_call_url_on_end']) !== 'undefined') {
            _END_STANDBY_CALL_URL = settings['standby_call_url_on_end'];
        }
        setInterval(function () {
            standbyTime += 5000;
            if (standbyActive != true) {
                if (standbyTime >= ((settings['standby_after'] * 1000) * 60)) {
                    $('body').addClass('standby');
                    $('.swiper-container').hide();
                    if (objectlength(columns_standby) > 0) buildStandby();
                    if (typeof (_STANDBY_CALL_URL) !== 'undefined' && _STANDBY_CALL_URL !== '') {
                        $.get(_STANDBY_CALL_URL);
                        standbyActive = true;
                    }
                }
            }
        }, 5000);
    }
}

function setClockDateWeekday() {
    $('.clock').html(moment().locale(settings['language']).format(settings['hide_seconds'] ? settings['shorttime'] : settings['longtime']));
    $('.date').html(moment().locale(settings['language']).format(settings['longdate']));
    $('.weekday').html(moment().locale(settings['language']).format(settings['weekday']));
}

function toSlide(num) {
    if (typeof (myswiper) !== 'undefined') myswiper.slideTo(num, 1000, true);
}


function buildStandby() {

    if ($('.screenstandby').length == 0) {
        var screenhtml = '<div class="screen screenstandby swiper-slide slidestandby" style="height:' + $(window).height() + 'px"><div class="row"></div></div>';
        $('div.screen').hide();
        $('#settingspopup').modal('hide');
        $('div.swiper-container').before(screenhtml);

        for (var c in columns_standby) {
            $('div.screenstandby .row').append('<div class="col-xs-' + columns_standby[c]['width'] + ' colstandby' + c + '"></div>');
            getBlock(columns_standby[c], c, 'div.screenstandby .row .colstandby' + c, true);
        }
    }

}

//we have to define s globally. Is used in getBlock in blocks.js. Needs to be fixed ...
var s;
function buildScreens() {
    var allscreens = {}
    for (var t in screens) {
        if (typeof (screens[t]['maxwidth']) !== 'undefined' && typeof (screens[t]['maxheight']) !== 'undefined') {
            allscreens[screens[t]['maxwidth']] = screens[t];
        }
        else {
            var maxwidth = 5000;
            if (typeof (allscreens[maxwidth]) == 'undefined') {
                allscreens[maxwidth] = {}
                allscreens[maxwidth]['maxwidth'] = maxwidth;
                allscreens[maxwidth]['maxheight'] = maxwidth;
            }
            allscreens[maxwidth][t] = screens[t];
        }
    }
    screens = allscreens;
    var keys = Object.keys(screens);
    var len = keys.length;
    keys.sort(function (a, b) { return a - b });
    for (var i = 0; i < len; i++) {
        t = keys[i];
        if (
            typeof (screens[t]['maxwidth']) == 'undefined' ||
            (
                parseFloat(screens[t]['maxwidth']) >= $(window).width() &&
                parseFloat(screens[t]['maxheight']) >= $(window).height()
            )
        ) {
            for (s in screens[t]) {
                if (s !== 'maxwidth' && s !== 'maxheight') {
                    var screenhtml = '<div class="screen screen' + s + ' swiper-slide slide' + s + '"';
                    if (typeof (screens[t][s]['background']) === 'undefined') {
                        screens[t][s]['background'] = settings['background_image'];
                    }
                    if (typeof (screens[t][s]['background']) !== 'undefined') {
                        if (screens[t][s]['background'].indexOf("/") > 0) screenhtml += 'style="background-image:url(\'' + screens[t][s]['background'] + '\');"';
                        else screenhtml += 'style="background-image:url(\'img/' + screens[t][s]['background'] + '\');"';
                    }
                    else if (typeof (screens[t][s][1]) !== 'undefined' && typeof (screens[t][s][1]['background']) !== 'undefined') {
                        if (screens[t][s][1]['background'].indexOf("/") > 0) screenhtml += 'style="background-image:url(\'' + screens[t][s][1]['background'] + '\');"';
                        else screenhtml += 'style="background-image:url(\'img/' + screens[t][s][1]['background'] + '\');"';
                    }

                    screenhtml += '><div class="row"></div></div>';
                    $('div.contents').append(screenhtml);

                    if (defaultcolumns === false) {
                        if (!parseFloat(settings['hide_topbar']) == 1) {
                            if (typeof (columns['bar']) == 'undefined') {
                                columns['bar'] = {}
                                columns['bar']['blocks'] = ['logo', 'miniclock', 'settings']
                            }
                            getBlock(columns['bar'], 'bar', 'div.screen' + s + ' .row .colbar', false);
                        }

                        for (var cs in screens[t][s]['columns']) {
                            if (typeof (screens[t]) !== 'undefined') {
                                var c = screens[t][s]['columns'][cs];
                                getBlock(columns[c], c, 'div.screen' + s + ' .row .col' + c, false);
                            }
                        }
                    }
                    else {

                        if (parseFloat(settings['hide_topbar']) == 0) $('body .row').append('<div class="col-sm-undefined col-xs-12 sortable colbar transbg dark"><div data-id="logo" class="logo col-xs-2">' + settings['app_title'] + '<div></div></div><div data-id="miniclock" class="miniclock col-xs-8 text-center"><span class="weekday"></span> <span class="date"></span> <span>&nbsp;&nbsp;&nbsp;&nbsp;</span> <span class="clock"></span></div><div data-id="settings" class="settings settingsicon text-right" data-toggle="modal" data-target="#settingspopup"><em class="fas fa-cog" /></div></div></div>');
                        if (typeof (settings['default_columns']) == 'undefined' || parseFloat(settings['default_columns']) == 3) {
                            $('body .row').append('<div class="col-xs-5 sortable col1" data-colindex="1"><div class="auto_switches"></div><div class="auto_dimmers"></div></div>');
                            $('body .row').append('<div class="col-xs-5 sortable col2" data-colindex="2"><div class="block_weather containsweatherfull"></div><div class="auto_media"></div><div class="auto_states"></div></div>');
                            $('body .row').append('<div class="col-xs-2 sortable col3" data-colindex="3"><div class="auto_clock"></div><div class="auto_sunrise"></div><div class="auto_buttons"></div></div>');

                            if (typeof (settings['wu_api']) !== 'undefined' && settings['wu_api'] !== "" && settings['wu_api'] !== 0 && typeof (settings['wu_city']) !== 'undefined' && settings['wu_city'] !== "") {
                                $('.col2').prepend('<div class="mh transbg big block_currentweather_big col-xs-12 containsweather"><div class="col-xs-1"><div class="weather" id="weather"></div></div><div class="col-xs-11"><span class="title weatherdegrees" id="weatherdegrees"></span> <span class="weatherloc" id="weatherloc"></span></div></div>');
                                if (typeof (loadWeatherFull) !== 'function') $.ajax({
                                    url: 'js/weather.js',
                                    async: false,
                                    dataType: 'script'
                                });

                                loadWeatherFull(settings['wu_city'], settings['wu_country'], $('#weatherfull'));
                                loadWeather(settings['wu_city'], settings['wu_country']);

                                setInterval(function () {
                                    loadWeatherFull(settings['wu_city'], settings['wu_country'], $('#weatherfull'));
                                    loadWeather(settings['wu_city'], settings['wu_country']);
                                }, (60000 * 30));
                            }

                            if (typeof (settings['owm_api']) !== 'undefined' && settings['owm_api'] !== "" && settings['owm_api'] !== 0 && typeof (settings['owm_city']) !== 'undefined' && settings['owm_city'] !== "") {
                                $('.col2').prepend('<div class="mh transbg big block_currentweather_big col-xs-12 containsweather"><div class="col-xs-1"><div class="weather" id="weather"></div></div><div class="col-xs-11"><span class="title weatherdegrees" id="weatherdegrees"></span> <span class="weatherloc" id="weatherloc"></span></div></div>');
                                if (typeof (loadWeatherFull) !== 'function') $.ajax({
                                    url: 'js/weather_owm.js',
                                    async: false,
                                    dataType: 'script'
                                });

                                loadWeatherFull(settings['owm_city'], settings['owm_country'], $('#weatherfull'));
                                loadWeather(settings['owm_city'], settings['owm_country']);

                                setInterval(function () {
                                    loadWeatherFull(settings['owm_city'], settings['owm_country'], $('#weatherfull'));
                                    loadWeather(settings['owm_city'], settings['owm_country']);
                                }, (60000 * 30));
                            }

                            $('.col3 .auto_clock').html('<div class="transbg block_clock col-xs-12 text-center"><h1 id="clock" class="clock"></h1><h4 id="weekday" class="weekday"></h4><h4 id="date" class="date"></h4></div>');
                            $('.col3 .auto_sunrise').html('<div class="block_sunrise col-xs-12 transbg text-center sunriseholder"><em class="wi wi-sunrise"></em><span id="sunrise" class="sunrise"></span><em class="wi wi-sunset"></em><span id="sunset" class="sunset"></span></div>');
                            if (typeof (buttons) !== 'undefined') {
                                for (var b in buttons) {
                                    $('.col3 .auto_buttons').append('<div id="block_' + myBlockNumbering + '"</div>');
                                    var myblockselector = '#block_' + myBlockNumbering++;
                                    handleObjectBlock(buttons[b], b, myblockselector, 12, null);
                                }
                            }
                        }
                        else if (parseFloat(settings['default_columns']) == 1) {
                            $('body .row').append('<div class="col-xs-12 sortable col1" data-colindex="1"><div class="auto_switches"></div><div class="auto_dimmers"></div></div>');
                        }
                        else if (parseFloat(settings['default_columns']) == 2) {
                            $('body .row').append('<div class="col-xs-6 sortable col1" data-colindex="1"><div class="auto_switches"></div><div class="auto_dimmers"></div></div>');
                            $('body .row').append('<div class="col-xs-6 sortable col2" data-colindex="2"><div class="block_weather containsweatherfull"></div><div class="auto_media"></div><div class="auto_states"></div></div>');
                        }
                    }
                }
            }
            break;
        }
    }

    if (typeof (settings['edit_mode']) !== 'undefined' && settings['edit_mode'] == 1) {
        $('.swiper-container').addClass('edit');
        setTimeout(function () {
            startSortable();
        }, 2000);
    }

    startSwiper();
}

function startSwiper() {
    if (md.mobile() == null || md.tablet() !== null) {
        if ($('.swiper-container .screen').length > 1) {
            $.ajax({ url: 'vendor/swiper/js/swiper.min.js',  dataType: 'script' }).done(function () {
                $('<link href="vendor/swiper/css/swiper.min.css" rel="stylesheet">').appendTo("head");
                setTimeout(function () {
                    myswiper = new Swiper('.swiper-container', {
                        pagination: '.swiper-pagination',
                        paginationClickable: true,
                        loop: false,
                        initialSlide: settings['start_page']-1,
                        effect: settings['slide_effect'],
                        keyboardControl: true,
                        onSlideChangeStart: function () {
                            $('.slide').removeClass('selectedbutton');
                        },
                        onSlideChangeEnd: function (swiper) {
                            //after Event use it for your purpose
                            $('.slide' + (1 + swiper.activeIndex)).addClass('selectedbutton');
                        },
                        onInit: function () {
                            $('.slide1').addClass('selectedbutton');
                        }


                    });

                }, 100);
            });
        }
    }
}

function initMap() {
    if ($('#trafficm').length > 0) {
        showMap('trafficm');
        setInterval(function () {
            showMap('trafficm');
        }, (60000 * 5));
    }
}

function showMap(mapid, map) {
    if (typeof (settings['gm_api']) == 'undefined'
        || settings['gm_api'] == ""
        || settings['gm_api'] == 0) {
        console.log('Please, set Google Maps API KEY!');
        infoMessage('Info:', 'Please, set Google Maps API KEY!', 8000);
        return
    }
    if (typeof (map) !== 'undefined') {
         map = new google.maps.Map(document.getElementById(mapid), {
            zoom: map.zoom,
            center: { lat: map.latitude, lng: map.longitude }
        });
    } else {
         map = new google.maps.Map(document.getElementById(mapid), {
            zoom: parseFloat(settings['gm_zoomlevel']),
            center: { lat: parseFloat(settings['gm_latitude']), lng: parseFloat(settings['gm_longitude']) }
        });
    }

    var transitLayer = new google.maps.TrafficLayer();
    transitLayer.setMap(map);
}

function setClassByTime() {
    var d = new Date();
    var n = d.getHours();
    var newClass;

    if (n >= 20 || n <= 5) {
        newClass = 'night';
    }
    else if (n >= 6 && n <= 10) {
        newClass = 'morning';
    }
    else if (n >= 11 && n <= 15) {
        newClass = 'noon';
    }
    else if (n >= 16 && n <= 19) {
        newClass = 'afternoon';
    }

    for (var t in screens) {
        for (var s in screens[t]) {
            if (typeof (screens[t][s]['background_' + newClass]) !== 'undefined') {
                if (screens[t][s]['background_' + newClass].indexOf("/") > 0) $('.screen.screen' + s).css('background-image', 'url(\'' + screens[t][s]['background_' + newClass] + '\')');
                else $('.screen.screen' + s).css('background-image', 'url(\'img/' + screens[t][s]['background_' + newClass] + '\')');
            }
        }
    }

    $('body').removeClass('morning noon afternoon night').addClass(newClass);
}

// eslint-disable-next-line no-unused-vars
function enterCode(armLevel) {
    var code;
    code = prompt(language.misc.enter_pincode);
    if (code != null) switchSecurity(armLevel, code);
}

function infoMessage(sub, msg, timeOut) {
    if (timeOut == null) {
        timeOut = 8000;
    }
    if (timeOut == 0) {
        $('body').append('<div class="update">' + sub + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>');
    }
    else {
        $('body').append('<div class="update">' + sub + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>');
        setTimeout(function () {
            $(".update").fadeOut();
        }, timeOut);
    }
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

    if (!gettingDevices) {
        ion.sound({
            sounds: [
                { name: filename }
            ],

            path: file.join('/') + "/",
            preload: true,
            multiplay: false
        });

        ion.sound.play(filename);
    }
}
// eslint-disable-next-line no-unused-vars
function removeLoading() {
    $('#loadingMessage').css('display', 'none');
}

function createModalDialog(dialogClass, dialogId, myFrame) {
    var setWidth = false;
    var setHeight = false;
    var mySetUrl = 'data-popup';
    var mywidth, myheight;
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

function triggerStatus(idx, value, device) {
    var random = getRandomInt(1, 100000);
    try {
        eval('getStatus_' + idx + '(idx,value,device)');
    }
    // eslint-disable-next-line no-empty
    catch (err) {
    }
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
                standbyTime = 0;
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
                standbyTime = 0;
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

function triggerChange(idx, value) {
    if (typeof (oldstates[idx]) !== 'undefined' && value !== oldstates[idx]) {
        //disableStandby();
        try {
            eval('getChange_' + idx + '(idx,value,device)');
        }
        // eslint-disable-next-line no-empty
        catch (err) {
        }

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

function disableStandby() {

    if (standbyActive == true) {
        standbyTime = 0;
        if (typeof (_END_STANDBY_CALL_URL) !== 'undefined' && _END_STANDBY_CALL_URL !== '') {
            $.get(_END_STANDBY_CALL_URL);
        }
    }

    if (objectlength(columns_standby) > 0) {
        $('div.screen').show();
    }
    $('.screenstandby').remove();
    $('body').removeClass('standby');
    $('.swiper-container').show();
    standbyActive = false;

}

//END OF STANDBY FUNCTION

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
    var html='';
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

function buttonLoadFrame(button) //Displays the frame of a button after pressing is
{

    var random = getRandomInt(1, 100000);
    $('body').append(createModalDialog('openpopup', 'button_' + random, button));
    if (button.log == true) {
        if (typeof (getLog) !== 'function') $.ajax({ url: 'js/log.js', async: false, dataType: 'script' });
        $('#button_' + random + ' .modal-body').html('');
        // eslint-disable-next-line no-undef
        getLog($('#button_' + random + ' .modal-body'), button.level, true);
    }
    $('#button_' + random).on('hidden.bs.modal', function () {
        $(this).data('bs.modal', null);
        $(this).remove();
    });

    $('#button_' + random).modal('show');

    if (!button.log && typeof (button.refreshiframe) !== 'undefined' && button.refreshiframe > 0) {
        setTimeout(function () {
            refreshButtonFrame(button, random);
        }, button.refreshiframe);
    }
}

function refreshButtonFrame(button, buttonid) {
    var mydiv = $('#button_' + buttonid).find('iframe');
    if (mydiv.length > 0) {
        mydiv.attr('src', checkForceRefresh(button, button.url));
        setTimeout(function () {
            refreshButtonFrame(button, buttonid);
        }, button.refreshiframe);
    }
}

// eslint-disable-next-line no-unused-vars
function buttonOnClick(m_event)
//button clickhandler. Assumption: button is clickable
{
    var button = m_event.data;
    if (typeof (button.newwindow) !== 'undefined') {
        window.open(button.url);
    }
    else if (typeof (button.slide) !== 'undefined') {
        toSlide(button.slide - 1);
    }
    else {
        buttonLoadFrame(button);
    }
}

function buttonIsClickable(button) {
    var clickable = typeof (button.url) !== 'undefined' || button.log == true || typeof (button.slide) !== 'undefined';
    return clickable;
}

// eslint-disable-next-line no-unused-vars
function loadButton(b, button) {
    var width = 12;
    if (typeof (button.width) !== 'undefined') width = button.width;

    var key = b;
    if (typeof (button.key) !== 'undefined') key = button.key;

    var slideToext = '';

    if (typeof (button.slide) !== 'undefined') {
        slideToext = ' slide slide' + button.slide;
    }

    var html = '<div class="col-xs-' + width + (buttonIsClickable(button) ? ' hover ' : ' ') + ' transbg buttons-' + key + slideToext + '" data-id="buttons.' + key + '">';

    if (button.isimage) {
        var img = '';
        if (typeof (button.image) !== 'undefined') {
            img = button.image;
        }
        if (img == 'moon') {
            img = getMoonInfo(button);
        }
        if (typeof (button.forceheight) !== 'undefined') {
            html += '<img id="buttonimg_' + b + '"src="' + img + '" style="max-width:100%;" width=100% height="' + button.forceheight + '" />';
        } else {
            html += '<img id="buttonimg_' + b + '"src="' + img + '" style="max-width:100%;" />';
        }

        var refreshtime = 60000;
        if (typeof (button.refresh) !== 'undefined') refreshtime = button.refresh;
        if (typeof (button.refreshimage) !== 'undefined') refreshtime = button.refreshimage;
        setInterval(function () {
            reloadImage(b, button, true);
        }, refreshtime);

    }
    else {
        if (typeof (button.title) !== 'undefined') {
            html += '<div class="col-xs-4 col-icon">';
        }
        else {
            html += '<div class="col-xs-12 col-icon">';
        }

        if (typeof (button.image) !== 'undefined') html += '<img class="buttonimg" src="' + button.image + '" />';
        else html += '<em class="' + button.icon + ' fa-small"></em>';
        html += '</div>';
        if (typeof (button.title) !== 'undefined') {
            html += '<div class="col-xs-8 col-data">';
            html += '<strong class="title">' + button.title + '</strong><br>';
            html += '<span class="state"></span>';
            html += '</div>';
        }
    }
    html += '</div>';
    return html;
}

// eslint-disable-next-line no-unused-vars
function loadFrame(f, frame) {

    var key = 'UNKNOWN';
    if (typeof (frame.key) !== 'undefined') key = frame.key;

    var width = 12;
    if (typeof (frame.width) !== 'undefined') width = frame.width;
    var scrolling = frame.scrollbars === false ? ' scrolling="no"' : '';
    var html = '<div data-id="frames.' + key + '" class="col-xs-' + width + ' hover transbg swiper-no-swiping imgblock imgblock' + f + '" style="height:' + frame.height + 'px;padding:0px !important;">';
    html += '<div class="col-xs-12 no-icon" style="padding:0px !important;">';
    html += '<iframe src="' + frame.frameurl + '"' + scrolling + ' style="width:100%;border:0px;height:' + (frame.height - 14) + 'px;"></iframe>';
    html += '</div>';
    html += '</div>';

    var refreshtime = 60000;
    if (typeof (frame.refreshiframe) !== 'undefined') refreshtime = frame.refreshiframe;
    setInterval(function () {
        reloadFrame(f, frame);
    }, refreshtime);

    return html;
}

function checkForceRefresh(m_instance, url) {
    //forcerefresh is set to 1 or true:
    //   adds current time to an url as second parameter (for webcams)
    //   adds the timestamp as first parameter if there are no parameters yet
    //forcerefresh:2
    //   calls nocache.php and prevent caching by setting headers in php.
    //forcerefresh:3
    //   adds timestamp parameter to the end of the url


    if (typeof (m_instance.forcerefresh) !== 'undefined') {
        var str = "" + (new Date()).getTime();
        var mytimestamp = 't=' + str.substr(str.length - 8, 5);
        switch (m_instance.forcerefresh) {
            case true:
            case 1:
                //try to add the timestamp as second parameter
                //it there are no parameters the timestamp will be added.
                //behavior changed to support cheap webcams
                if (url.indexOf("?") == -1) //no parameters. We will add the timestamp
                    url += '?' + mytimestamp;
                else { //we have at least one parameters
                    var pos = url.indexOf("&");
                    if (pos > 0) {
                        //we have more than one parameter
                        //insert the timestamp as second
                        url = url.substr(0, pos + 1) + '&' + mytimestamp + url.substr(pos);
                    }
                    else {
                        //there is only one parameter so we add it to the end
                        url += '&' + mytimestamp;
                    }

                }
                break;
            case 2:
                url = settings['dashticz_php_path'] + 'nocache.php?' + url;
                break;
            case 3: //add timestamp to the end
                var sep = '&';
                if (url.indexOf("?") == -1) { //there is no parameter yet
                    sep = '?';
                }
                url += sep + mytimestamp;
                break;
        }
    }
    return url;
}

function reloadFrame(i, frame) {
    if (typeof (frame.frameurl) !== 'undefined') {
        $('.imgblock' + i).find('iframe').attr('src', checkForceRefresh(frame, frame.frameurl));
    }
}

function reloadImage(i, image) {
    var src;
    if (typeof (image.image) !== 'undefined') {
        if (image.image === 'moon')
            src = getMoonInfo(image)
        else
            src = checkForceRefresh(image, image.image);
        $('#buttonimg_' + i).attr('src', src);
    }
}

/*not used anymore
function reloadIframe(button, i) {
//reloads the Iframe of a button if it exists
    if (typeof(button.url) !== 'undefined') {
        if (typeof($('.imgblockopens' + i + ' iframe').attr('src') !== 'undefined')) {
            $('.imgblockopens' + i + ' iframe').attr('src', checkForceRefresh(image, image.url));
        }
    }
}
*/

function getMoonInfo() {
    var mymoon = new MoonPhase(new Date());
    var myphase = parseInt(mymoon.phase() * 100 + 50) % 100;
    var src = 'img/moon/moon.' + ("0" + myphase).slice(-2) + '.png';
    return src;
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
function appendStationClock(columndiv, col, width) {
    $(columndiv).append(
        '<div data-id="clock" class="transbg block_' + col + ' col-xs-' + width + ' text-center">' +
        '<canvas id="clock" width="150" height="150">Your browser is unfortunately not supported.</canvas>' +
        '</div>'
    );
    if (typeof (StationClock) !== 'function') $.ajax({ url: 'vendor/stationclock.js', async: false, dataType: 'script' });

    var clock = new StationClock("clock");
    clock.body = StationClock.RoundBody;
    clock.dial = StationClock.GermanStrokeDial;
    clock.hourHand = StationClock.PointedHourHand;
    clock.minuteHand = StationClock.PointedMinuteHand;
    if (settings['hide_seconds_stationclock']) {
        clock.secondHand = false;
    } else {
        clock.secondHand = StationClock.HoleShapedSecondHand;
        if (typeof (settings['boss_stationclock']) == 'undefined') clock.boss = StationClock.NoBoss;
        else if (settings['boss_stationclock'] == 'RedBoss') clock.boss = StationClock.RedBoss;
    }

    clock.minuteHandBehavoir = StationClock.BouncingMinuteHand;
    clock.secondHandBehavoir = StationClock.OverhastySecondHand;

    window.setInterval(function () {
        clock.draw()
    }, 50);
}

// eslint-disable-next-line no-unused-vars
function appendStreamPlayer(columndiv) {
    var random = getRandomInt(1, 100000);
    var html = '<div data-id="streamplayer" class="transbg containsstreamplayer' + random + '">'
        + '<div class="col-xs-12 transbg smalltitle"><h3></h3></div>'
        + '<audio class="audio1" preload="none"></audio>'
        + '<div class="col-xs-4 transbg hover text-center btnPrev">'
        + '<em class="fas fa-chevron-left fa-small"></em>'
        + '</div>'
        + '<div class="col-xs-4 transbg hover text-center playStream">'
        + '<em class="fas fa-play fa-small stateicon"></em>'
        + '</div>'
        + '<div class="col-xs-4 transbg hover text-center btnNext">'
        + '<em class="fas fa-chevron-right fa-small"></em>'
        + '</div>'
        + '</div>';
    $(columndiv).append(html);

    var streamelement = '.containsstreamplayer' + random;
    var connecting = null;

    var supportsAudio = !!document.createElement('audio').canPlayType;
    if (supportsAudio) {
        var index = 0,
            playing = false,
            tracks = _STREAMPLAYER_TRACKS,
            trackCount = tracks.length,
            npTitle = $(streamelement + ' h3'),
            audio = $(streamelement + ' .audio1').bind('play', function () {
                $(streamelement + ' .stateicon').removeClass('fas fa-play');
                $(streamelement + ' .stateicon').addClass('fas fa-pause');
                $(streamelement).addClass('playing')
                playing = true;
                connecting = setTimeout(function () {
                    infoMessage("StreamPlayer", "connecting ... ", 0);
                }, 1000);
            }).bind('pause', function () {
                $(streamelement + ' .stateicon').removeClass('fas fa-pause');
                $(streamelement + ' .stateicon').addClass('fas fa-play');
                $(streamelement).removeClass('playing')

                playing = false;
            }).get(0),
            // eslint-disable-next-line no-unused-vars
            btnPrev = $(streamelement + ' .btnPrev').click(function () {
                if ((index - 1) > -1) {
                    index--;
                    loadTrack(index);
                } else {
                    index = 0
                    loadTrack(trackCount - 1);
                }
                if (playing) {
                    doPlay();
                }
            }),
            // eslint-disable-next-line no-unused-vars
            btnNext = $(streamelement + ' .btnNext').click(function () {
                if ((index + 1) < trackCount) index++;
                else index = 0;

                loadTrack(index);
                if (playing) {
                    doPlay();
                }
            }),
            // eslint-disable-next-line no-unused-vars
            btnPlay = $(streamelement + ' .playStream').click(function () {
                if (audio.paused) {
                    doPlay();
                } else {
                    audio.pause();
                }
            }),
            loadTrack = function (id) {
                npTitle.text(tracks[id].name);
                index = id;
                audio.src = tracks[id].file;
            },
            doPlay = function () {
                audio.play()
                    .then(function () {
                        clearTimeout(connecting);
                        $(".update").remove();
                    })
                    .catch(function (err) {
                        console.log(err);
                        console.log(err.message);
                        infoMessage("Streamplayer", err.message);

                    })
            };
        loadTrack(index);
    }
}

function getDevices(override) {
    if (typeof (override) == 'undefined') override = false;
    if (!sliding || override) {
        if (typeof (req) !== 'undefined') req.abort();
        gettingDevices = true;

        var tmpnow = new Date();
        lastGetDevicesTime = tmpnow.getTime();

        var usrinfo = '';
        if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';
        req = $.get({
            url: settings['domoticz_ip'] + '/json.htm?' + usrinfo + 'type=devices&plan=' + settings['room_plan'] + '&filter=all&used=true&order=Name',
            type: 'GET', async: true, contentType: "application/json",
            error: function (jqXHR, textStatus) {
                if (typeof (textStatus) !== 'undefined' && textStatus === 'abort') {
                    console.log('Domoticz request cancelled')
                } else {
                    console.error("Domoticz error code: " + jqXHR.status + ' ' + textStatus + "!\nPlease, double check the path to Domoticz in Settings!");
                    infoMessage('<font color="red">Domoticz error code: ' + jqXHR.status + '!', 'double check the path to Domoticz in Settings!</font>');
                }
            },
            success: function (data) {
                gettingDevices = false;
                if (!sliding || override) {
                    $('.solar').remove();
                    if ($('.sunrise').length > 0) $('.sunrise').html(data.Sunrise);
                    if ($('.sunset').length > 0) $('.sunset').html(data.Sunset);

                    $('div.newblocks.plugins').html('');
                    $('div.newblocks.domoticz').html('');
                    if (settings['edit_mode']) {
                        $('div.newblocks.plugins').append('<div data-id="clock"><span class="title">' + language.editmode.clock + '</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="currentweather_big"><span class="title">' + language.editmode.currentweather_big + '</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="garbage"><span class="title">' + language.settings.garbage.title + '</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="streamplayer"><span class="title">Radio</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="nzbget"><span class="title">NZBget</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="sunrise"><span class="title">' + language.editmode.sunrise + '</set</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="weather"><span class="title">' + language.settings.weather.title + '</span></div>');
                        $('div.newblocks.plugins').append('<div data-id="news"><span class="title">' + language.editmode.news + '</span></div>');
                    }
                    //Add all variables to device table
                    for (var v in allVariables) {
                        data.result.push(allVariables[v]);
                    }
                    for (var r in data.result) {
                        var device = data.result[r];
                        var idx = device['idx'];

                        if (device['Type'] === 'Group' || device['Type'] === 'Scene') idx = 's' + device['idx'];

                        if (typeof (blocks) !== 'undefined' && typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['title']) !== 'undefined') {
                            device['Name'] = blocks[idx]['title'];
                        }

                        if (settings['edit_mode']) $('div.newblocks.domoticz').append('<div data-id="' + idx + '"><span class="title">' + device['Name'] + '</span></div>');
                        alldevices[idx] = device;

                        if (
                            (
                                settings['auto_positioning'] == 1 &&
                                (
                                    (settings['use_favorites'] == 1 && device['Favorite'] == 1) ||
                                    settings['use_favorites'] == 0
                                )
                            ) ||
                            (
                                settings['auto_positioning'] == 0 &&
                                (

                                    $('.block_' + idx).length > 0 ||
                                    $('.block_' + idx + '_1').length > 0 ||
                                    $('.block_' + idx + '_2').length > 0 ||
                                    $('.block_' + idx + '_3').length > 0 ||
                                    $('.block_graph_' + idx).length > 0
                                )
                            )
                        ) {
                            if (settings['edit_mode']) $('div.newblocks > div[data-id="' + idx + '"]').remove();

                            var width = 4;
                            switch (device['SwitchType']) {
                                case 'Selector':
                                    width = 8;
                                    break;
                                case 'Media Player':
                                case 'Dimmer':
                                    width = 12;
                            }

                            if (typeof (blocks) !== 'undefined' && typeof (blocks[idx]) !== 'undefined') {
                                if ($(window).width() < 768 && typeof (blocks[idx]['width_smartphone']) !== 'undefined') {
                                    width = blocks[idx]['width_smartphone'];
                                }
                                else if (typeof (blocks[idx]['width']) !== 'undefined') {
                                    width = blocks[idx]['width'];
                                }
                            }

                            if ($('.block_' + idx).length <= 0) {
                                $(getAutoAppendSelector(device)).append('<div class="mh transbg block_' + idx + '"></div>');
                            }

                            $('div.block_' + idx).data('light', idx);
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

                            if ($('div.block_graph_' + idx).length > 0) {
                                getGraphs(device, false);
                            }

                            triggerStatus(idx, device['LastUpdate'], device);
                            triggerChange(idx, device['LastUpdate'], device);

                            try {
                                html += eval('getBlock_' + idx + '(device,idx,data.result)');
                            }
                            catch (err) {
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
                    }
                    if (typeof (afterGetDevices) === 'function') afterGetDevices();
                }

            }
        });
    }
}


function getVariables() {
    var usrinfo = '';
    if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';
    $.get({
        url: settings['domoticz_ip'] + '/json.htm?' + usrinfo + 'type=command&param=getuservariables',
        type: 'GET', async: true, contentType: "application/json",
        error: function () {
            console.error("Domoticz error!\nPlease, double check the path to Domoticz in Settings!");
            infoMessage('<font color="red">Domoticz error!', 'double check the path to Domoticz in Settings!</font>', 0);
        },
        success: function (data) {
            allVariables = data.result;
            for (var v in allVariables) {
                allVariables[v].idx = 'v' + allVariables[v].idx;
                allVariables[v].Type = 'Variable';
            }
        }
    });
}

function getDevicesTmr() {
    if (settings['edit_mode']) return;
    var tmpnow = new Date();
    if (tmpnow.getTime() >= lastGetDevicesTime + settings['domoticz_refresh'] * 1000 - 50) {
        getDevices();
        getVariables();
    }
}

function enableRefresh() {
    //only call once
    setInterval(function () {
        getDevicesTmr();
    }, (settings['domoticz_refresh'] * 1000));
}

function getAutoAppendSelector(device) {
    switch (device['Type']) {
        case 'Thermostat':
        case 'Temp + Humidity':
        case 'Temp + Humidity + Baro':
        case 'Temp + Baro':
        case 'Usage':
        case 'Temp':
        case 'Humidity':
        case 'Heating':
        case 'General':
        case 'Wind':
        case 'Rain':
        case 'RFXMeter':
        case 'Security':
        case 'P1 Smart Meter':
        case 'P1 Smart Meter USB':
        case 'Group':
        case 'Scene':
            return '.col2 .auto_states';
    }
    switch (device['SwitchType']) {
        case 'Motion Sensor':
        case 'Smoke Detector':
        case 'Contact':
            return '.col2 .auto_states';
        case 'Dimmer':
            return '.col1 .auto_dimmers';
        case 'Media Player':
            return '.col2 .auto_media';
    }
    return '.col1 .auto_switches';
}

function handleDevice(device, idx) {
    var buttonimg = '';
    if (device['Image'] === 'Fan') buttonimg = 'fan.png';
    if (device['Image'] === 'Heating') buttonimg = 'heating.png';
    var html = '';
    var addHTML = true;
    if (device.hasOwnProperty('SubType') && device['SubType'] in blocktypes['SubType']) {
        html += getStatusBlock(idx, device, blocktypes['SubType'][device['SubType']]);
        return [html, addHTML];
    }
    if (device.hasOwnProperty('HardwareType') && device['HardwareType'] in blocktypes['HardwareType']) {
        if (typeof (blocktypes['HardwareType'][device['HardwareType']]['icon']) !== 'undefined') {
            html += getStatusBlock(idx, device, blocktypes['HardwareType'][device['HardwareType']]);
        }
        else {
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
    if (device.hasOwnProperty('HardwareName') && device['HardwareName'] in blocktypes['HardwareName']) {
        html += getStatusBlock(idx, device, blocktypes['HardwareName'][device['HardwareName']]);
        return [html, addHTML];
    }
    if (device.hasOwnProperty('SensorUnit') && device['SensorUnit'] in blocktypes['SensorUnit']) {
        html += getStatusBlock(idx, device, blocktypes['SensorUnit'][device['SensorUnit']]);
        return [html, addHTML];
    }
    if (device.hasOwnProperty('Type') && device['Type'] in blocktypes['Type']) {
        html += getStatusBlock(idx, device, blocktypes['Type'][device['Type']]);
        return [html, addHTML];
    }
    if (device.hasOwnProperty('Name') && device['Name'] in blocktypes['Name']) {
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
        case 'Heating':
        case 'Radiator 1':
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
            return getDefaultSwitchBlock(device, blocks[idx], idx,'fas fa-lightbulb', 'far fa-lightbulb', buttonimg);
    }

    switch (device['HardwareType']) {
        case 'Toon Thermostat':
            if (device['SubType'] !== 'SetPoint'
                && device['SubType'] !== 'AC'
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
        }
        else {
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

    }
    else if (device['SubType'] == 'Custom Sensor') {
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
    }
    else if (device['HardwareName'] == 'Dummy') { 
        return getDefaultSwitchBlock(device, blocks[idx], idx,'fas fa-toggle-on', 'fas fa-toggle-off', buttonimg);
    }
    else {
        return getDefaultSwitchBlock(device, blocks[idx], idx,'fas fa-lightbulb', 'far fa-lightbulb', buttonimg);
    }

    return [html, addHTML];
}

function getDefaultSwitchBlock(device, block, idx, defaultIconOn, defaultIconOff, buttonimg) {
    /*
    Return a default switch block
    parameters:
        device: The domoticz device info
        block: The Dashticz block definition
        idx: idx as used by Dashticz
        defaultIconOn: Default On icon
        defaultIconOff: Default Off icon
        buttonimg: Default image. 
    */
    var html = '';
    if (!isProtected(device, idx)) {
        var confirmswitch = 0;
        if (typeof (block) !== 'undefined')
            if (typeof (block['confirmation']) !== 'undefined') {
                confirmswitch = block['confirmation'];
            }
        var confirm = 'false';
        var mMode = 'toggle';
        if (confirmswitch == 1) confirm = 'true';
        if (device['SwitchType'] == 'Push On Button')
            mMode = 'on';
        else if (device['SwitchType'] == 'Push Off Button')
            mMode = 'off';
        $('.block_' + idx).attr('onclick', 'switchDevice(this,"' + mMode + '", ' + confirm + ')');
    }
    var textOn = language.switches.state_on;
    var textOff = language.switches.state_off;

    if (typeof (block) !== 'undefined') {
        if (typeof (block['textOn']) !== 'undefined') {
            textOn = block['textOn']
        }
        if (typeof (block['textOff']) !== 'undefined') {
            textOff = block['textOff']
        }
    }

    var attr = '';
    if (device['Image'] == 'Alarm') {
        defaultIconOff = 'fas fa-exclamation-triangle';
        defaultIconOn = defaultIconOff;
        if (device['Status'] == 'On') 
            attr = 'style="color:#F05F40;"';
     }
    
    var mIcon = (getIconStatusClass(device['Status']) === 'off') ? defaultIconOff: defaultIconOn;
    html += iconORimage(idx, mIcon, buttonimg, getIconStatusClass(device['Status']) + ' icon', attr);
    html += getBlockData(device, idx, textOn, textOff);

    return [html, true];
}
function isProtected(device, idx) {
    return ((typeof (blocks[idx]) !== 'undefined' && typeof (blocks[idx]['protected']) !== 'undefined' && blocks[idx]['protected'] === true)
        || device['Protected'] === true);
}

function getIconStatusClass(deviceStatus) {
    if (deviceStatus != undefined) {
        switch (deviceStatus.toLowerCase()) {
            case 'off':
            case 'closed':
            case 'normal':
            case 'unlocked':
                return 'off';
        }
        return 'on';
    }
    else {
        return "off";
    }
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
        var blockValues = [
            {
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
        var myblockValues = [
            {
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

    var blockValues = [
        {
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
    var blockValues = [
        {
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
            if (typeof (allblocks[device['idx']]) !== 'undefined'
                && $('div.block_' + blockValue.idx).length == 0
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
    var blockValues = [
        {
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
    var blockValues = [
        {
            icon: 'wi wi-humidity',
            idx: idx,
            title: device['Name'],
            value: number_format(device['Humidity'], 0),
            unit: '%'
        },
    ];
    createBlocks(blockValues, device);
    return ['', false];
}

function getTempHumBarBlock(device, idx) {
    this.html = '';
    if ($('div.block_' + idx).length > 0) {
        allblocks[idx] = true;
    }
    var single_block = (typeof (blocks[idx]) !== 'undefined'
        && typeof (blocks[idx]['single_block']) !== 'undefined'
        && blocks[idx]['single_block']
    );

    var blockValues = [
        {
            icon: 'fas fa-thermometer-half',
            idx: idx + '_1',
            title: device['Name'],
            value: number_format((typeof (device['Temp']) !== 'undefined') ? device['Temp'] : device['Data'], 1),
            unit: _TEMP_SYMBOL
        },
    ];
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

function getThermostatBlock(device, idx) {
    this.html = '';
    this.html += iconORimage(idx + '_1', '', 'heating.png', 'on icon', 'style="max-height:35px;"');
    this.html += '<div class="col-xs-8 col-data">';

    this.title = device['Data'] + _TEMP_SYMBOL;
    this.value = device['Name'];
    if (titleAndValueSwitch(idx + '_1')) {
        this.title = device['Name'];
        this.value = device['Data'] + _TEMP_SYMBOL;
    }
    this.html += '<strong class="title">' + this.title + '</strong><br />';
    this.html += '<span class="state">' + this.value + '</span>';
    if (showUpdateInformation(idx)) {
        this.html += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }
    this.html += '</div>';

    $('div.block_' + idx + '_1').html(this.html);

    this.html = '';
    this.html += '<div class="col-button1">';
    this.html += '<div class="up"><a href="javascript:void(0)" class="btn btn-number plus" data-type="plus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    this.html += '<em class="fas fa-plus fa-small fa-thermostat"></em>';
    this.html += '</a></div>';
    this.html += '<div class="down"><a href="javascript:void(0)" class="btn btn-number min" data-type="minus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    this.html += '<em class="fas fa-minus fa-small fa-thermostat"></em>';
    this.html += '</a></div>';
    this.html += '</div>';

    this.html += iconORimage(idx + '_2', '', 'heating.png', 'on icon iconheating', '', '2');
    this.html += '<div class="col-xs-8 col-data right1col">';

    this.title = number_format(device['Data'], 1) + _TEMP_SYMBOL;
    this.value = device['Name'];
    if (titleAndValueSwitch(idx) || titleAndValueSwitch(idx + '_2')) {
        this.title = device['Name'];
        this.value = number_format(device['Data'], 1) + _TEMP_SYMBOL;
    }
    this.html += '<strong class="title input-number title-input" min="' + settings['setpoint_min'] + '" max="' + settings['setpoint_max'] + '" data-light="' + device['idx'] + '">' + this.title + '</strong>';
    this.html += '<div class="state stateheating">' + this.value + '</div>';
    this.html += '</div>';

    $('div.block_' + idx + '_2').html(this.html);
    $('div.block_' + idx).html(this.html);

    if (typeof (addedThermostat[idx]) === 'undefined') {
        addThermostatFunctions('.block_' + idx);
        addedThermostat[idx] = true;
    }
    if (typeof (addedThermostat[idx + '_2']) === 'undefined') {
        addThermostatFunctions('.block_' + idx + '_2');
        addedThermostat[idx + '_2'] = true;
    }
    return [this.html, false];
}

function getDimmerBlock(device, idx, buttonimg) {
    var html = '';
    if (device['Status'] === 'Off')
        html += iconORimage(idx, 'far fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon iconslider', '', 2, 'data-light="' + device['idx'] + '" onclick="switchDevice(this,\'toggle\', false );"');
    else
        html += iconORimage(idx, 'fas fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + ' icon iconslider', '', 2, 'data-light="' + device['idx'] + '" onclick="switchDevice(this,\'toggle\', false);"');
    html += '<div class="col-xs-10 swiper-no-swiping col-data">';
    html += '<strong class="title">' + device['Name'];
    if (typeof (blocks[idx]) == 'undefined' || typeof (blocks[idx]['hide_data']) == 'undefined' || blocks[idx]['hide_data'] == false) {
        html += ' ' + device['Level'] + '%';
    }
    html += '</strong>';
    if (showUpdateInformation(idx)) {
        html += ' &nbsp; <span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }
    html += '<br />';
    if (isRGBDeviceAndEnabled(device)) {
        html += '<input type="text" class="rgbw rgbw' + idx + '" data-light="' + device['idx'] + '" />';
        html += '<div class="slider slider' + device['idx'] + '" style="margin-left:55px;" data-light="' + device['idx'] + '"></div>';
    }
    else {
        html += '<div class="slider slider' + device['idx'] + '" data-light="' + device['idx'] + '"></div>';
    }

    html += '</div>';

    if (isRGBDeviceAndEnabled(device)) {  //we have to manually destroy the previous spectrum color picker
        $('.rgbw' + idx).spectrum("destroy");
    }

    $('div.block_' + idx).html(html);

    if (isRGBDeviceAndEnabled(device)) {
        $('.rgbw' + idx).spectrum({
            color: Cookies.get('rgbw_' + idx)
        });

        $('.rgbw' + idx).on("dragstop.spectrum", function (e, color) {
            var curidx = $(this).data('light');
            color = color.toHexString();
            Cookies.set('rgbw_' + curidx, color);
            var hue = hexToHsb(color);
            var bIsWhite = (hue.s < 20);

            sliding = true;

            var usrinfo = '';
            if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';

            var url = settings['domoticz_ip'] + '/json.htm?' + usrinfo + 'type=command&param=setcolbrightnessvalue&idx=' + curidx + '&hue=' + hue.h + '&brightness=' + hue.b + '&iswhite=' + bIsWhite;
            $.ajax({
                url: url + '&jsoncallback=?',
                type: 'GET', async: false, contentType: "application/json", dataType: 'jsonp'
            });
        });

        $('.rgbw' + idx).on('hide.spectrum', function () {
            sliding = false;
            getDevices(true);
        });

        $('.rgbw' + idx).on('beforeShow.spectrum', function () {
            sliding = true;
        });
    }

    var slider = {};
    switch (parseFloat(device['MaxDimLevel'])) {
        case 100:
            slider = {
                value: device['Level'],
                step: 1,
                min: 1,
                max: 100,
            };
            break;
        case 32:
            slider = {
                value: Math.ceil((device['Level'] / 100) * 32),
                step: 1,
                min: 2,
                max: 32,
            };
            break;
        default:
            slider = {
                value: Math.ceil((device['Level'] / 100) * 16),
                step: 1,
                min: 2,
                max: 15,
            };
            break;
    }
    addSlider(device['idx'], slider);

    return [this.html, false];
}

function getBlindsBlock(device, idx, withPercentage) {
    if (typeof (withPercentage) === 'undefined') withPercentage = false;
    this.html = '';

    var hidestop = false;
    var data_class = 'col-data blinds';
    var button_class;
    if (typeof (blocks[idx]) == 'undefined' || typeof (blocks[idx]['hide_stop']) == 'undefined' || blocks[idx]['hide_stop'] === false) {
        data_class += ' right2col';
        button_class = 'col-button2';

        //        this.html += '<div class="col-button">';
    } else {
        hidestop = true;
        data_class += ' right1col';
        button_class = 'col-button1';
        //      this.html += '<div class="col-button hidestop">';
    }


    if (device['Status'] === 'Closed') this.html += iconORimage(idx, '', 'blinds_closed.png', 'off icon', '', 2);
    else this.html += iconORimage(idx, '', 'blinds_open.png', 'on icon', '', 2);
    this.html += '<div class="' + data_class + '">';
    this.title = device['Name'];
    if (withPercentage) {
        if (typeof (blocks[idx]) == 'undefined' || typeof (blocks[idx]['hide_data']) == 'undefined' || blocks[idx]['hide_data'] == false) {
            this.title += ' ' + device['Level'] + '%';
        }
        this.value = '<div class="slider slider' + device['idx'] + '  swiper-no-swiping" data-light="' + device['idx'] + '"></div>';
    } else {
        if (device['Status'] === 'Closed') this.value = '<span class="state">' + language.switches.state_closed + '</span>';
        else this.value = '<span class="state">' + language.switches.state_open + '</span>';
    }
    if (!withPercentage) {
        if (typeof (blocks[idx]) == 'undefined' || typeof (blocks[idx]['hide_data']) == 'undefined' || blocks[idx]['hide_data'] == false) {
            if (device['Status'] === 'Closed') this.value = '<span class="state">' + language.switches.state_closed + '</span>';
            else this.value = '<span class="state">' + language.switches.state_open + '</span>';
        } else {
            this.value = '<span class="state"></span>'
        }
    }
    this.html += '<strong class="title">' + this.title + '</strong><br />';
    this.html += this.value;
    this.html += '</div>';

    this.html += '<div class="' + button_class + '">';

    this.upAction = 'Off';
    this.downAction = 'On';
    if (device['SwitchType'].toLowerCase().indexOf('inverted') >= 0) {
        this.upAction = 'On';
        this.downAction = 'Off';
    }
    this.html += '<div class="up"><a href="javascript:void(0)" class="btn btn-number plus" onclick="switchBlinds(' + device['idx'] + ',\'' + this.upAction + '\');">';
    this.html += '<em class="fas fa-chevron-up fa-small"></em>';
    this.html += '</a></div>';

    this.html += '<div class="down"><a href="javascript:void(0)" class="btn btn-number min" onclick="switchBlinds(' + device['idx'] + ',\'' + this.downAction + '\');">';
    this.html += '<em class="fas fa-chevron-down fa-small"></em>';
    this.html += '</a></div>';

    if (!hidestop) {
        this.html += '<div class="stop"><a href="javascript:void(0)" class="btn btn-number stop" onclick="switchBlinds(' + device['idx'] + ',\'Stop\');">';
        this.html += 'STOP';
        this.html += '</a></div>';
    }

    this.html += '</div>';

    $('div.block_' + idx).html(this.html);

    if (withPercentage) {
        addSlider(idx, {
            value: device['Level'],
            step: 1,
            min: 1,
            max: 100
        });
    }
    return [this.html, false];
}

function addSlider(idx, sliderValues) {
    $(".slider" + idx).slider({
        value: sliderValues.value,
        step: sliderValues.step,
        min: sliderValues.min,
        max: sliderValues.max,
        start: function (event, ui) {
            sliding = true;
            slideDeviceExt($(this).data('light'), ui.value, 0);
        },
        slide: function (event, ui) {
            slideDeviceExt($(this).data('light'), ui.value, 1);
        },
        change: function (event, ui) {
            slideDeviceExt($(this).data('light'), ui.value, 2);
        },
        stop: function () {
            sliding = false;
        }
    });
}

function isRGBDeviceAndEnabled(device) {
    return (typeof (settings['no_rgb']) === 'undefined'
        || (typeof (settings['no_rgb']) !== 'undefined'
            && parseFloat(settings['no_rgb']) === 0))
        && (device['SubType'] === 'RGBW' || device['SubType'] === 'RGBWW' || device['SubType'] === 'RGB');
}

function getSecurityBlock(device, idx) {
    var html = '';
    if (device['Status'] === 'Normal') html += iconORimage(idx, 'fas fa-shield-alt', '', 'off icon', '', 2);
    else html += iconORimage(idx, 'fas fa-shield-alt', '', 'on icon', '', 2);

    var secPanelicons =  (settings['security_button_icons'] === true || settings['security_button_icons'] === 1 || settings['security_button_icons'] === '1') ? true : false;
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
