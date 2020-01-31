/* eslint-disable no-prototype-builtins */
/* global getAllDevicesHandler   myBlockNumbering:writable objectlength config initVersion loadSettings settings*/
/* global sessionValid MobileDetect moment getBlock buttons handleObjectBlock */
/* global loadWeatherFull loadWeather Swiper */

//To refactor later:
/* global switchSecurity*/

/*from blocks.js*/
/*global initMap */
/* global Dashticz Domoticz*/
var language = {};
// eslint-disable-next-line no-unused-vars
var blocks = {};
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
var defaultcolumns = false;
//move var allblocks = {};
var myswiper;
//move var addedThermostat = [];
//move var oldstates = [];
//move var onOffstates = [];
var md;
// eslint-disable-next-line no-unused-vars
var usrEnc = '';
// eslint-disable-next-line no-unused-vars
var pwdEnc = '';
// eslint-disable-next-line no-unused-vars
var _THOUSAND_SEPARATOR = '.';
// eslint-disable-next-line no-unused-vars
var _DECIMAL_POINT = ',';
var _STANDBY_CALL_URL = '';
var _END_STANDBY_CALL_URL = '';
//move var allVariables = {};
var sessionvalid = false;

// eslint-disable-next-line no-unused-vars
function loadFiles(dashtype) {
    var customfolder = 'custom';
    if (typeof (dashtype) !== 'undefined' && parseFloat(dashtype) > 1) {
        customfolder = 'custom_' + dashtype;
    }
    $('<link href="' + 'css/creative.css?_=' + Date.now() + '" rel="stylesheet">').appendTo('head');
    $.ajax({
            url: customfolder + '/CONFIG.js',
            dataType: 'script'
        })
        .fail(function () {
            return $.Deferred()
                .reject(new Error("Load error in config.js"))
        })
        .then(function () {
            if (typeof config == 'undefined') {
                return $.Deferred()
                    .reject(new Error("Error in config.js"))
            }

            if (objectlength(columns) === 0) defaultcolumns = true;

            //Check language before loading settings and fallback to English when not set
            var setLang = 'en_US';
            if (typeof (localStorage.dashticz_language) !== 'undefined') {
                setLang = localStorage.dashticz_language
            } else if (typeof (config) !== 'undefined' && typeof (config.language) !== 'undefined') {
                setLang = config.language;
            }
            return $.ajax({
                url: 'lang/' + setLang + '.json?v=' + cache,
                dataType: 'json',
                success: function (data) {
                    language = data;
                }
            });
        })
        .then(function () {
            return $.ajax({
                url: 'js/version.js',
                dataType: 'script'
            });
        })
        .then(function () {
            return initVersion();
        })
        .then(function () {

            return $.ajax({
                url: 'js/settings.js',
                dataType: 'script'
            });
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

            return $.when(
                $.ajax({
                    url: 'js/switches.js',
                    dataType: 'script'
                }),
                $.ajax({
                    url: 'js/thermostat.js',
                    dataType: 'script'
                }),
                $.ajax({
                    url: 'js/dashticz.js',
                    dataType: 'script'
                })
                .then(function () {
                    return Dashticz.init()
                })
            );
        })
        .then(function () {
            return $.ajax({
                url: customfolder + '/custom.js?v=' + cache,
                dataType: 'script'
            });
        })
        .then(function () {
            if (typeof getExtendedBlockTypes == 'undefined') {
                return $.Deferred()
                    .reject(new Error("Error in custom.js"))
            }
            return $.when(
                //            $.ajax({ url: 'js/switches.js', async: false, dataType: 'script' });
                $.ajax({
                    url: 'js/blocks.js',
                    dataType: 'script'
                }),
                /* $.ajax({
                    url: 'js/graphs.js',
                    dataType: 'script'
                }), */
                $.ajax({
                    url: 'js/login.js',
                    dataType: 'script'
                }),
                $.ajax({
                    url: 'js/moon.js',
                    dataType: 'script'
                })
            );
        })
        .then(function () {

            sessionvalid = sessionValid();

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
        .then(function () {
            if (sessionvalid) {
                setTimeout(function () {
                    $('#loaderHolder').fadeOut();
                }, 500);
                $('body').css('overflow', 'auto');
                onLoad();
            }
        })
        .catch(function (err) {
            console.error(err);
            if (err.message) $('#error').html(err.message);
            $('#hide').show();
            $('#loaderHolder').fadeOut();
        })
}

function onLoad() {
    md = new MobileDetect(window.navigator.userAgent);

    $('body').attr('unselectable', 'on')
        .css({
            '-moz-user-select': 'none',
            '-o-user-select': 'none',
            '-khtml-user-select': 'none',
            '-webkit-user-select': 'none',
            '-ms-user-select': 'none',
            'user-select': 'none'
        }).on('selectstart', function () {
            return false;
        });

    buildScreens();

    setClockDateWeekday();
    setInterval(function () {
        setClockDateWeekday();
    }, settings['hide_seconds'] ? 30000 : 1000);

    enableRefresh();
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
        $('body').on('mousemove', function () {
            swipebackTime = 0;
            disableStandby();
        });
    }

    $('body').on('touchend click', function () {
        setTimeout(function () {
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
                    $('.dt-container').hide();
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
        $('div.dt-container').before(screenhtml);

        for (var c in columns_standby) {
            getBlock(columns_standby[c], 'standby' + c, 'div.screenstandby', true);
        }
    }

}

function buildScreens() {
    var allscreens = {}
    for (var t in screens) {
        if (typeof (screens[t]['maxwidth']) !== 'undefined' && typeof (screens[t]['maxheight']) !== 'undefined') {
            allscreens[screens[t]['maxwidth']] = screens[t];
        } else {
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
    keys.sort(function (a, b) {
        return a - b
    });
    for (var i = 0; i < len; i++) {
        t = keys[i];
        if (
            typeof (screens[t]['maxwidth']) == 'undefined' ||
            (
                parseFloat(screens[t]['maxwidth']) >= $(window).width() &&
                parseFloat(screens[t]['maxheight']) >= $(window).height()
            )
        ) {
            for (var s in screens[t]) {
                if (s !== 'maxwidth' && s !== 'maxheight') {
                    var screenhtml = '<div class="screen screen' + s + ' swiper-slide slide' + s + '"';
                    if (typeof (screens[t][s]['background']) === 'undefined') {
                        screens[t][s]['background'] = settings['background_image'];
                    }
                    if (typeof (screens[t][s]['background']) !== 'undefined') {
                        if (screens[t][s]['background'].indexOf("/") > 0) screenhtml += 'style="background-image:url(\'' + screens[t][s]['background'] + '\');"';
                        else screenhtml += 'style="background-image:url(\'img/' + screens[t][s]['background'] + '\');"';
                    } else if (typeof (screens[t][s][1]) !== 'undefined' && typeof (screens[t][s][1]['background']) !== 'undefined') {
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
                            getBlock(columns['bar'], 'bar', 'div.screen' + s, false);
                        }

                        for (var cs in screens[t][s]['columns']) {
                            if (typeof (screens[t]) !== 'undefined') {
                                var c = screens[t][s]['columns'][cs];
                                getBlock(columns[c], c, 'div.screen' + s, false);
                            }
                        }
                    } else {
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
                                    handleObjectBlock(buttons[b], Dashticz.mountNewContainer('.col3 .auto_buttons'), 12, null);

                                }
                            }
                        } else if (parseFloat(settings['default_columns']) == 1) {
                            $('body .row').append('<div class="col-xs-12 sortable col1" data-colindex="1"><div class="auto_switches"></div><div class="auto_dimmers"></div></div>');
                        } else if (parseFloat(settings['default_columns']) == 2) {
                            $('body .row').append('<div class="col-xs-6 sortable col1" data-colindex="1"><div class="auto_switches"></div><div class="auto_dimmers"></div></div>');
                            $('body .row').append('<div class="col-xs-6 sortable col2" data-colindex="2"><div class="block_weather containsweatherfull"></div><div class="auto_media"></div><div class="auto_states"></div></div>');
                        }
                    }
                }
            }
            break;
        }
    }

    buildSwipingScrolling();
}

function buildSwipingScrolling() {
    var enable_swiper = Number(settings['enable_swiper'])
    var vertical_screen = (window.innerWidth < 768)
    var multi_screen = $('.dt-container .screen').length > 1
    var start_swiper = multi_screen &&
        (
            (enable_swiper === 2) ||
            ((enable_swiper === 1) && (!vertical_screen))
        )
    if (start_swiper) startSwiper();
    var vertical_scroll = Number(settings['vertical_scroll']);
    if (vertical_scroll === 2 || (vertical_scroll === 1 && !start_swiper)) {
        $('.swiper-slide').addClass('vertical-scroll')
    }
}

function startSwiper() {
    $('.dt-container').addClass('swiper-container');
    $('.contents').addClass('swiper-wrapper');
    setTimeout(function () {
        myswiper = new Swiper('.swiper-container', {
            pagination: {
                el: '.swiper-pagination',
                clickable: true
            },
            paginationClickable: true,
            loop: false,
            initialSlide: settings['start_page'] - 1,
            effect: settings['slide_effect'],
            keyboard: {
                enabled: true,
                onlyInViewport: false,
            },
            direction: 'horizontal',
        });
        myswiper.on('transitionStart', function () {
            $('.slide').removeClass('selectedbutton');
        });
        myswiper.on('transitionEnd', function () {
            $('.slide' + (1 + this.activeIndex)).addClass('selectedbutton');
        });
        $('.slide' + settings['start_page']).addClass('selectedbutton');

    }, 100);
}


function setClassByTime() {
    var d = new Date();
    var n = d.getHours();
    var newClass;

    if (n >= 20 || n <= 5) {
        newClass = 'night';
    } else if (n >= 6 && n <= 10) {
        newClass = 'morning';
    } else if (n >= 11 && n <= 15) {
        newClass = 'noon';
    } else if (n >= 16 && n <= 19) {
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

// eslint-disable-next-line no-unused-vars
function infoMessage(sub, msg, timeOut) {
    if (timeOut == null) {
        timeOut = 8000;
    }
    if (timeOut == 0) {
        $('body').append('<div class="update">' + sub + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>');
    } else {
        $('body').append('<div class="update">' + sub + '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;' + msg + '&nbsp;&nbsp;</div>');
        setTimeout(function () {
            $(".update").fadeOut();
        }, timeOut);
    }
}

// eslint-disable-next-line no-unused-vars
function removeLoading() {
    $('#loadingMessage').css('display', 'none');
}



function disableStandby() {
    standbyTime = 0;
    if (standbyActive == true) {
        if (typeof (_END_STANDBY_CALL_URL) !== 'undefined' && _END_STANDBY_CALL_URL !== '') {
            $.get(_END_STANDBY_CALL_URL);
        }
    }

    if (objectlength(columns_standby) > 0) {
        $('div.screen').show();
    }
    $('.screenstandby').remove();
    $('body').removeClass('standby');
    $('.dt-container').show();
    standbyActive = false;

}

//END OF STANDBY FUNCTION


function enableRefresh() {
    Domoticz.subscribe('_devices', true, getAllDevicesHandler)
}
