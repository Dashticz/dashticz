/* global alldevices showUpdateInformation triggerChange req:writable settings usrEnc pwdEnc getDevices language infoMessage iconORimage getBlockData blocks */
/* global moment Cookies hexToHsb*/
/* from main.js */
// eslint-disable-next-line no-unused-vars
/* global sliding:writable  slide:writable*/
/* from domoticz-api.js*/
/* global Domoticz*/

// eslint-disable-next-line no-unused-vars
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

    var mIcon = (getIconStatusClass(device['Status']) === 'off') ? defaultIconOff : defaultIconOn;
    html += iconORimage(idx, mIcon, buttonimg, getIconStatusClass(device['Status']) + ' icon', attr);
    html += getBlockData(device, idx, textOn, textOff);

    return [html, true];
}

function isProtected(device, idx) {
    var dev = Domoticz.getAllDevices()[idx];
    return (blocks[idx] && blocks[idx].protected) || (dev && dev.Protected);
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
    } else {
        return "off";
    }
}


// eslint-disable-next-line no-unused-vars
function switchDevice(cur, pMode, pAskConfirm) {
    /* Switch device
        params:
            cur : reference to DOM block 
            mode: "toggle", "on","off"
            confirm: boolean. Ask for confirmation first.
    */
    if (pAskConfirm === true && !confirm("Are you sure you want to switch?"))
        return;
    var idx = $(cur).data('light');
    if (isProtected(idx))
        return;
    var doStatus = '';
    var param = 'switchlight';
    switch (pMode) {
        case 'toggle':
            if ($(cur).find('.icon').hasClass('on') || $(cur).find('.fa-toggle-on').length > 0) {
                doStatus = toggleItem(cur, 'on');
            } else {
                doStatus = toggleItem(cur, 'off');
            }
            break;
        case 'on':
            doStatus = toggleItem(cur, 'off');
            break;
        case 'off':
            doStatus = toggleItem(cur, 'on');
            break;
        default:
            console.log("Incorrect mode in SwitchDevice for device " + idx)
            return;
    }
    var device = Domoticz.getAllDevices()[idx];
    device.Status = doStatus;
    device.LastUpdate = '1970-01-01'; //indicates local device update...
    Domoticz.setDevice(idx, device); //this setDevice will trigger local changes
    if (typeof (idx) === 'string' && idx.substr(0, 1) === 's') {
        idx = idx.replace('s', '');
        param = 'switchscene';
    }

/*
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=' + param + '&idx=' + idx + '&switchcmd=' + doStatus + '&level=0&passcode=&jsoncallback=?',
        type: 'GET',
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        },
        error: function () {
            console.error('Error in switch device.')
        }
    });
    */
    Domoticz.request('type=command&param=' + param + '&idx=' + idx + '&switchcmd=' + doStatus + '&level=0')
    .then(function() {
        getDevices(true);
    })

}


function toggleItem(cur, currentState) {
    if (currentState.toLowerCase() === 'off') {
        currentState = 'off';
        this.newState = 'on';
    } else {
        currentState = 'on';
        this.newState = 'off';
    }
    if ($(cur).find('.fa-toggle-' + currentState).length > 0) {
        $(cur).find('.fa-toggle-' + currentState).addClass('fa-toggle-' + this.newState).removeClass('fa-toggle-' + currentState);
    }

    $(cur).find('.icon').removeClass(currentState);
    $(cur).find('.icon').addClass(this.newState);
    $(cur).find('.state').html(language.switches['state_' + this.newState]);

    return this.newState.charAt(0).toUpperCase() + this.newState.slice(1);
}

// eslint-disable-next-line no-unused-vars
function switchThermostat(setpoint, cur) {
    //    sliding = true;
    var idx = $(cur).data('light');
    sliding = idx;
    if (typeof (req) !== 'undefined') req.abort();
    req = $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=setsetpoint&idx=' + idx + '&setpoint=' + setpoint + '&jsoncallback=?',
        type: 'GET',
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            sliding = false;
        }
    });
}

// eslint-disable-next-line no-unused-vars
function switchBlinds(idx, action) {
    var src = $('.block_' + idx).find('.icon').attr('src')
    switch (action.toLowerCase()) {
        case 'off':
            $('.block_' + idx).find('.icon').removeClass('on').addClass('off');
            if (src) src.replace('open', 'closed');
            break;
        case 'on':
            $('.block_' + idx).find('.icon').removeClass('off').addClass('on');
            if (src) src.replace('closed', 'open');
            break;
    }

    if (typeof (req) !== 'undefined') req.abort();
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=switchlight&idx=' + idx + '&switchcmd=' + action + '&level=0&passcode=&jsoncallback=?',
        type: 'GET',
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        }
    });
}

// eslint-disable-next-line no-unused-vars
function switchDeviceBtn(cur, url) {
    if (url !== "") {
        sliding = true;
        if (typeof (req) !== 'undefined') req.abort();

        var decUrl = decodeURIComponent(url);
        $.ajax({
            url: decUrl + '&jsoncallback=?',
            type: 'GET',
            async: false,
            contentType: 'application/json',
            dataType: 'jsonp',
            done: function () {
                getDevices(true);
            }
        });
    }
}

// eslint-disable-next-line no-unused-vars
function switchScene(cur) {
    var idx = $(cur).data('light');
    var doStatus = 'On'; // toggleItem(cur, $(cur).find('img.icon').hasClass('on') ? 'on' : 'off');
    triggerChange(idx, doStatus, alldevices[idx]);
    if (typeof (req) !== 'undefined') req.abort();
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=switchscene&idx=' + idx.replace('s', '') + '&switchcmd=' + doStatus + '&level=0&passcode=&jsoncallback=?',
        type: 'GET',
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        }
    });
}

// eslint-disable-next-line no-unused-vars
function slideDevice(idx, status) {
    if (typeof (slide) !== 'undefined') slide.abort();

    $('.block_' + idx).find('.icon').removeClass('off');
    $('.block_' + idx).find('.icon').addClass('on');

    if ($('.block_' + idx).find('.fa-toggle-off').length > 0) {
        $('.block_' + idx).find('.fa-toggle-off').addClass('fa-toggle-on').removeClass('fa-toggle-off');
    }

    $('.block_' + idx).find('.state').html(language.switches.state_on);

    slide = $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=switchlight&idx=' + idx + '&switchcmd=Set%20Level&level=' + status + '&jsoncallback=?',
        type: 'GET',
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        }
    });
}



/*
The following slider functions are used to set the slider while sliding.
On the first change an async request is send to Domoticz.
On succuueding changes first itś checked whether the previous request did finish.
If not, the new value is buffered, and will be send by sliderCallback after the previous request finished..
*/

var sliderAction = {
    "state": "idle",
    "idx": 0,
    "value": 0,
    "request": 0
}

function sliderSetValue(p_idx, p_value, p_Callback) {
    return $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=switchlight&idx=' + p_idx + '&switchcmd=Set%20Level&level=' + p_value + '&jsoncallback=?',
        type: 'GET',
        async: true,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            p_Callback();
        }
    });
}

function sliderCallback() {
    if (sliderAction.state == "set") { //check whether we have to set another value
        sliderAction.request = sliderSetValue(sliderAction.idx, sliderAction.value, sliderCallback);
        sliderAction.state = "idle";
    }
}

// eslint-disable-next-line no-unused-vars
function slideDeviceExt(idx, value, sliderState) {
    if (sliderState == 0) { //start sliding 
        $('.block_' + idx).find('.icon').removeClass('off');
        $('.block_' + idx).find('.icon').addClass('on');

        if ($('.block_' + idx).find('.fa-toggle-off').length > 0) {
            $('.block_' + idx).find('.fa-toggle-off').addClass('fa-toggle-on').removeClass('fa-toggle-off');
        }

        $('.block_' + idx).find('.state').html(language.switches.state_on);

        sliderAction.request = sliderSetValue(idx, value, sliderCallback);
        return;
    }
    if ( /*sliderState == 1 ||*/ sliderState == 2) { //change at the end. Temporarily (?) no update while sliding.
        if (sliderAction.request.readyState == 4) {
            sliderAction.request = sliderSetValue(idx, value, sliderCallback);
        } else {
            sliderAction.state = 'set';
            sliderAction.idx = idx;
            sliderAction.value = value;
        }
        return;
    }
}

// eslint-disable-next-line no-unused-vars
function ziggoRemote(key) {
    $.get(settings['switch_horizon'] + '?key=' + key);
}

// eslint-disable-next-line no-unused-vars
function controlLogitech(idx, action) {
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=lmsmediacommand&idx=' + idx + '&action=' + action + '&jsoncallback=?',
        type: 'GET',
        async: true,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        }
    });
}
var statusmsg = '';
// eslint-disable-next-line no-unused-vars
function switchSecurity(level, pincode) {

    pincode = $.md5(pincode)
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=setsecstatus&secstatus=' + level + '&seccode=' + pincode + '&jsoncallback=?',
        type: 'GET',
        async: true,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function (data) {
            if (data.status != "OK") {
                statusmsg = data.message;
                if (statusmsg == 'WRONG CODE') statusmsg = language.misc.wrong_code;
                infoMessage('<font color="red">Alert!</font>', statusmsg, 10000);
            }
            getDevices(true);
        }
    });
}

// eslint-disable-next-line no-unused-vars
function getDimmerBlock(device, idx, buttonimg) {
    var html = '';
    var classExtension = isProtected(device, idx) ? ' icon' : ' icon iconslider'; //no pointer in case of protected device
    if (device['Status'] === 'Off')
        html += iconORimage(idx, 'far fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + classExtension, '', 2, 'data-light="' + device['idx'] + '" ');
    else
        html += iconORimage(idx, 'fas fa-lightbulb', buttonimg, getIconStatusClass(device['Status']) + classExtension, '', 2, 'data-light="' + device['idx'] + '" ');
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
    } else {
        html += '<div class="slider slider' + device['idx'] + '" data-light="' + device['idx'] + '"></div>';
    }

    html += '</div>';

    if (isRGBDeviceAndEnabled(device)) { //we have to manually destroy the previous spectrum color picker
        $('.rgbw' + idx).spectrum("destroy");
    }

    $('div.block_' + idx).html(html);
    var dimmerClickHandler = function () {
        if (!sliding) switchDevice('.block_' + idx, 'toggle', false)
    }

    $('div.block_' + idx).off('click');

    if (!isProtected(idx)) {
        $('div.block_' + idx).addClass('hover');
        $('div.block_' + idx).on('click', dimmerClickHandler);
    }

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

            sliding = idx;

            var usrinfo = '';
            if (typeof (usrEnc) !== 'undefined' && usrEnc !== '') usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';

            var url = settings['domoticz_ip'] + '/json.htm?' + usrinfo + 'type=command&param=setcolbrightnessvalue&idx=' + curidx + '&hue=' + hue.h + '&brightness=' + hue.b + '&iswhite=' + bIsWhite;
            $.ajax({
                url: url + '&jsoncallback=?',
                type: 'GET',
                async: false,
                contentType: "application/json",
                dataType: 'jsonp'
            });
        });

        $('.rgbw' + idx).on('hide.spectrum', function () {
            sliding = false;
            getDevices(true);
        });

        $('.rgbw' + idx).on('beforeShow.spectrum', function () {
            sliding = idx;
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
    slider.disabled = isProtected(device, idx);
    addSlider(device['idx'], slider);

    return [html, false];
}

// eslint-disable-next-line no-unused-vars
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
            max: 100,
            disabled: isProtected(device, idx)
        });
    }
    return [this.html, false];
}

/*previously there was a mechanism to send device update commands while sliding.
With the new websock interface the slider block didn't update correctly.
So I've disabled the call to slideDeviceExt function.
Maybe in the future I'll reenable the functionality.
*/
function addSlider(idx, sliderValues) {
    $(".slider" + idx).slider({
        value: sliderValues.value,
        step: sliderValues.step,
        min: sliderValues.min,
        max: sliderValues.max,
        disabled: sliderValues.disabled,
        start: function () {
            sliding = idx;
            //            slideDeviceExt($(this).data('light'), ui.value, 0);
        },
        //        slide: function (event, ui) {
        //            slideDeviceExt($(this).data('light'), ui.value, 1);
        //},
        change: function (event, ui) {
            //            slideDeviceExt($(this).data('light'), ui.value, 2);
            slideDevice(idx, ui.value);
        },
        stop: function () {
            //stop is called before change
            sliding = false;
        }
    });
    $(".slider" + idx).on('click', function (ev) {
        ev.stopPropagation();
    })

}

function isRGBDeviceAndEnabled(device) {
    return (typeof (settings['no_rgb']) === 'undefined' ||
            (typeof (settings['no_rgb']) !== 'undefined' &&
                parseFloat(settings['no_rgb']) === 0)) &&
        (device['SubType'] === 'RGBW' || device['SubType'] === 'RGBWW' || device['SubType'] === 'RGB' || device['SubType'] === 'RGBWWZ');
}