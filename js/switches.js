/* global showUpdateInformation settings usrEnc pwdEnc getDevices language infoMessage iconORimage getBlockData blocks */
/* global moment Cookies hexToHsb*/
/* from main.js */
// eslint-disable-next-line no-unused-vars
/* global sliding:writable  slide:writable*/
/* from domoticz-api.js*/
/* global Domoticz*/
/* from dt_function.js*/
/* global DT_function*/
/* from dial.js */
/* global DT_dial */
/* from blocks.js */
/* global getBlockTitle */

/** Returns a default switch block
 *
 * @param {object} block - The Dashticz block definition
 * @param {number | string} idx idx as used by Dashticz. Scenes start with 's'. Variables with 'v'
 * @param {string}   defaultIconOn Default On icon
 * @param {string}   defaultIconOff Default Off icon
 * @param {string}   buttonimg Default image.
 */
// eslint-disable-next-line no-unused-vars
function getDefaultSwitchBlock(
  block,
  defaultIconOn,
  defaultIconOff,
  buttonimg
) {
  var device = block.device;
  var html = '';
  if (!isProtected(block)) {
    var confirmswitch = 0;
    if (typeof block !== 'undefined')
      if (typeof block['confirmation'] !== 'undefined') {
        confirmswitch = block['confirmation'];
      }
    var mMode = 'toggle';
    if (device['SwitchType'] == 'Push On Button') mMode = 'on';
    else if (device['SwitchType'] == 'Push Off Button') mMode = 'off';
    block.$mountPoint
      .find('.mh')
      .addClass('hover')
      .off('click')
      .click(function () {
        switchDevice(block, mMode, !!confirmswitch);
      });
  }
  var textOn = language.switches.state_on;
  var textOff = language.switches.state_off;

  if (typeof block['textOn'] !== 'undefined') {
    textOn = block['textOn'];
  }
  if (typeof block['textOff'] !== 'undefined') {
    textOff = block['textOff'];
  }

  var attr = '';
  if (device['Image'] == 'Alarm') {
    defaultIconOff = 'fas fa-exclamation-triangle';
    defaultIconOn = defaultIconOff;
    if (device['Status'] == 'On') attr = 'style="color:#F05F40;"';
  }

  var mIcon =
    getIconStatusClass(device['Status']) === 'off'
      ? defaultIconOff
      : defaultIconOn;
  html += iconORimage(
    block,
    mIcon,
    buttonimg,
    getIconStatusClass(device['Status']) + ' icon',
    attr
  );
  html += getBlockData(block, textOn, textOff);

  return [html, true];
}

function isProtected(block) {
  return block.protected || (block.device && block.device.Protected);
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
    return 'off';
  }
}

// eslint-disable-next-line no-unused-vars
function switchDevice(block, pMode, pAskConfirm) {
  /* Switch device
        params:
            cur : reference to DOM block 
            mode: "toggle", "on","off"
            confirm: boolean. Ask for confirmation first.
    */
  if (pAskConfirm === true && !confirm('Are you sure you want to switch?'))
    return;
  var idx = block.idx;
  var $div = block.$mountPoint;

  if (isProtected(block)) return;

  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;
  var doStatus = '';
  var param = 'switchlight';
  switch (pMode) {
    case 'toggle':
      if (
        $div.find('.icon').hasClass('on') ||
        $div.find('.fa-toggle-on').length > 0
      ) {
        doStatus = toggleItem(block, 'on');
      } else {
        doStatus = toggleItem(block, 'off');
      }
      break;
    case 'on':
      doStatus = toggleItem(block, 'off');
      break;
    case 'off':
      doStatus = toggleItem(block, 'on');
      break;
    default:
      console.log('Incorrect mode in SwitchDevice for device ' + idx);
      return;
  }
  if (typeof idx === 'string' && idx.substr(0, 1) === 's') {
    idx = idx.replace('s', '');
    param = 'switchscene';
  }

  Domoticz.request(
    'type=command&param=' +
      param +
      '&idx=' +
      idx +
      '&switchcmd=' +
      doStatus +
      '&level=0'
  ).then(function () {
    getDevices(true);
  });
}

function toggleItem(block, currentState) {
  var $div = block.$mountPoint;
  var newState = '';
  if (currentState.toLowerCase() === 'off') {
    currentState = 'off';
    newState = 'on';
  } else {
    currentState = 'on';
    newState = 'off';
  }
  if ($div.find('.fa-toggle-' + currentState).length > 0) {
    $div
      .find('.fa-toggle-' + currentState)
      .addClass('fa-toggle-' + newState)
      .removeClass('fa-toggle-' + currentState);
  }

  $div.find('.icon').removeClass(currentState);
  $div.find('.icon').addClass(newState);
  $div.find('.state').html(language.switches['state_' + newState]);

  return newState.charAt(0).toUpperCase() + newState.slice(1);
}

// eslint-disable-next-line no-unused-vars
function switchBlinds(block, action) {
  var idx = block.idx;
  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;

  var $icondiv = block.$mountPoint.find('.mh').find('.icon');
  var src = $icondiv.attr('src');
  switch (action.toLowerCase()) {
    case 'off':
      $icondiv.removeClass('on').addClass('off');
      if (src) src.replace('open', 'closed');
      break;
    case 'on':
      $icondiv.removeClass('off').addClass('on');
      if (src) src.replace('closed', 'open');
      break;
  }

  Domoticz.request(
    'type=command&param=switchlight&idx=' +
      idx +
      '&switchcmd=' +
      action +
      '&level=0'
  ).then(function () {
    getDevices(true);
  });
}

// eslint-disable-next-line no-unused-vars
function slideDevice(block, status) {
  var dial = block.type === 'dim' || block.type === 'selector';

  if (!dial) {
    var $div = block.$mountPoint;
    $div.find('.icon').removeClass('off');
    $div.find('.icon').addClass('on');

    if ($div.find('.fa-toggle-off').length > 0) {
      $div
        .find('.fa-toggle-off')
        .addClass('fa-toggle-on')
        .removeClass('fa-toggle-off');
    }
    $div.find('.state').html(language.switches.state_on);
  }

  Domoticz.syncRequest(
    block.idx,
    'type=command&param=switchlight&idx=' +
      block.idx +
      '&switchcmd=Set%20Level&level=' +
      status
  ).then(function () {
    dial ? DT_dial.make(block) : getDevices(true);
  });
}

/*
The following slider functions are used to set the slider while sliding.
On the first change an async request is send to Domoticz.
On succuueding changes first itś checked whether the previous request did finish.
If not, the new value is buffered, and will be send by sliderCallback after the previous request finished..
*/

var sliderAction = {
  state: 'idle',
  idx: 0,
  value: 0,
  request: 0,
};

function sliderSetValue(p_idx, p_value, p_Callback) {
  Domoticz.request(
    'type=command&param=switchlight&idx=' +
      p_idx +
      '&switchcmd=Set%20Level&level=' +
      p_value
  ).then(function () {
    p_Callback();
  });
}

function sliderCallback() {
  if (sliderAction.state == 'set') {
    //check whether we have to set another value
    sliderAction.request = sliderSetValue(
      sliderAction.idx,
      sliderAction.value,
      sliderCallback
    );
    sliderAction.state = 'idle';
  }
}

// eslint-disable-next-line no-unused-vars
function slideDeviceExt(block, value, sliderState) {
  //todo. Function not used?
  var $div = block.$mountPoint;
  if (sliderState == 0) {
    //start sliding
    $div.find('.icon').removeClass('off');
    $div.find('.icon').addClass('on');

    if ($div.find('.fa-toggle-off').length > 0) {
      $div
        .find('.fa-toggle-off')
        .addClass('fa-toggle-on')
        .removeClass('fa-toggle-off');
    }

    $div.find('.state').html(language.switches.state_on);

    sliderAction.request = sliderSetValue(block.idx, value, sliderCallback);
    return;
  }
  if (/*sliderState == 1 ||*/ sliderState == 2) {
    //change at the end. Temporarily (?) no update while sliding.
    if (sliderAction.request.readyState == 4) {
      sliderAction.request = sliderSetValue(block.idx, value, sliderCallback);
    } else {
      sliderAction.state = 'set';
      sliderAction.idx = block.idx;
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
  /*
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=lmsmediacommand&idx=' + idx + '&action=' + action + '&jsoncallback=?',
        type: 'GET',
        async: true,
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            getDevices(true);
        }
    });*/
  Domoticz.request(
    'type=command&param=lmsmediacommand&idx=' + idx + '&action=' + action
  ).then(function () {
    getDevices(true);
  });
}
var statusmsg = '';
// eslint-disable-next-line no-unused-vars
function switchSecurity(level, pincode) {
  pincode = md5(pincode);
  Domoticz.request(
    'type=command&param=setsecstatus&secstatus=' + level + '&seccode=' + pincode
  ).then(function (data) {
    if (data.status != 'OK') {
      statusmsg = data.message;
      if (statusmsg == 'WRONG CODE') statusmsg = language.misc.wrong_code;
      infoMessage('<font color="red">Alert!</font>', statusmsg, 10000);
    }
    getDevices(true);
  });
}

// eslint-disable-next-line no-unused-vars
function getDimmerBlock(block, buttonimg) {
  var device = block.device;
  var idx = block.idx;
  var $div = block.$mountPoint.find('.mh');
  var html = '';
  var title = getBlockTitle(block);
  var classExtension = isProtected(block) ? ' icon' : ' icon iconslider'; //no pointer in case of protected device
  if (device['Status'] === 'Off')
    html += iconORimage(
      block,
      'far fa-lightbulb',
      buttonimg,
      getIconStatusClass(device['Status']) + classExtension,
      '',
      2,
      'data-light="' + device['idx'] + '" '
    );
  else
    html += iconORimage(
      block,
      'fas fa-lightbulb',
      buttonimg,
      getIconStatusClass(device['Status']) + classExtension,
      '',
      2,
      'data-light="' + device['idx'] + '" '
    );
  html += '<div class="col-xs-10 swiper-no-swiping col-data">';
  html += '<strong class="title">' + title;
  if (
    typeof block['hide_data'] == 'undefined' ||
    blocks['hide_data'] == false
  ) {
    html += ' ' + device['Level'] + '%';
  }
  html += '</strong>';
  if (showUpdateInformation(block)) {
    html +=
      ' &nbsp; <span class="lastupdate">' +
      moment(device['LastUpdate']).format(settings['timeformat']) +
      '</span>';
  }
  html += '<br />';
  if (isRGBDeviceAndEnabled(device)) {
    html +=
      '<input type="text" class="rgbw rgbw' +
      idx +
      '" data-light="' +
      device['idx'] +
      '" />';
    html +=
      '<div class="slider slider' +
      device['idx'] +
      '" style="margin-left:55px;" data-light="' +
      device['idx'] +
      '"></div>';
  } else {
    html +=
      '<div class="slider slider' +
      device['idx'] +
      '" data-light="' +
      device['idx'] +
      '"></div>';
  }

  html += '</div>';

  var $rgbdiv = $div.find('.rgbw'); //This is the 'old' rgbdiv!

  if (isRGBDeviceAndEnabled(device)) {
    //we have to manually destroy the previous spectrum color picker
    $rgbdiv.spectrum('destroy');
  }

  $div.html(html);

  $rgbdiv = $div.find('.rgbw'); //Now we have the new one.

  function dimmerClickHandler(block) {
    switchDevice(block, 'toggle', false);
  }

  $div.off('click');

  if (!isProtected(block)) {
    $div.addClass('hover');
    $div
      .on('click', function () {
        dimmerClickHandler(block);
      })
      .addClass('hover');
  }

  if (isRGBDeviceAndEnabled(device)) {
    $rgbdiv.spectrum({
      color: Cookies.get('rgbw_' + idx),
    });

    $rgbdiv.on('dragstop.spectrum', function (e, color) {
      var hasPassword = block.password;
      if (!DT_function.promptPassword(hasPassword)) return;

      color = color.toHexString();
      Cookies.set('rgbw_' + idx, color);
      var hue = hexToHsb(color);
      var bIsWhite = hue.s < 20;

      //sliding = idx;
      Domoticz.hold(idx); //hold message queue

      var usrinfo = '';
      if (typeof usrEnc !== 'undefined' && usrEnc !== '')
        usrinfo = 'username=' + usrEnc + '&password=' + pwdEnc + '&';

      var url =
        settings['domoticz_ip'] +
        '/json.htm?' +
        usrinfo +
        'type=command&param=setcolbrightnessvalue&idx=' +
        idx +
        '&hue=' +
        hue.h +
        '&brightness=' +
        hue.b +
        '&iswhite=' +
        bIsWhite;
      //This is a synchronous request. So it cannot directly be replaced with Domoticz.request
      // Probably we would need a rate limiter on Domoticz.request
      $.ajax({
        url: url + '&jsoncallback=?',
        type: 'GET',
        async: false,
        contentType: 'application/json',
        dataType: 'jsonp',
      });
    });

    $rgbdiv.on('hide.spectrum', function () {
      //sliding = false;
      Domoticz.release(idx); //release message queue

      getDevices(true);
    });

    $rgbdiv.on('beforeShow.spectrum', function () {
      Domoticz.hold(idx); //hold message queue
      //sliding = idx;
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
  slider.disabled = isProtected(block);
  addSlider(block, slider);

  return [html, false];
}

// eslint-disable-next-line no-unused-vars
function getBlindsBlock(block, withPercentage) {
  var device = block.device;
  var idx = block.idx;
  var $mountPoint = block.$mountPoint.find('.mh');
  if (typeof withPercentage === 'undefined') withPercentage = false;
  var html = '';

  var hidestop = false;
  var data_class = 'col-data blinds';
  var button_class;
  if (
    typeof block['hide_stop'] == 'undefined' ||
    block['hide_stop'] === false
  ) {
    data_class += ' right2col';
    button_class = 'col-button2';
  } else {
    hidestop = true;
    data_class += ' right1col';
    button_class = 'col-button1';
  }

  if (device['Status'] === 'Closed')
    html += iconORimage(block, '', 'blinds_closed.png', 'off icon', '', 2);
  else html += iconORimage(block, '', 'blinds_open.png', 'on icon', '', 2);
  html += '<div class="' + data_class + '">';
  var title = getBlockTitle(block);
  var value = '';
  if (withPercentage) {
    if (
      typeof block['hide_data'] == 'undefined' ||
      block['hide_data'] == false
    ) {
      title += ' ' + device['Level'] + '%';
    }
    value =
      '<div class="slider slider' +
      idx +
      '  swiper-no-swiping" data-light="' +
      idx +
      '"></div>';
  } else {
    if (device['Status'] === 'Closed')
      value =
        '<span class="state">' + language.switches.state_closed + '</span>';
    else
      value = '<span class="state">' + language.switches.state_open + '</span>';
  }
  if (!withPercentage) {
    if (
      typeof block['hide_data'] == 'undefined' ||
      blocks['hide_data'] == false
    ) {
      if (device['Status'] === 'Closed')
        value =
          '<span class="state">' + language.switches.state_closed + '</span>';
      else
        value =
          '<span class="state">' + language.switches.state_open + '</span>';
    } else {
      value = '<span class="state"></span>';
    }
  }
  html += '<strong class="title">' + title + '</strong><br />';
  html += value;
  html += '</div>';

  html += '<div class="' + button_class + '">';

  var upAction = 'Off';
  var downAction = 'On';
  if (device['SwitchType'].toLowerCase().indexOf('inverted') >= 0) {
    upAction = 'On';
    downAction = 'Off';
  }
  html +=
    '<div class="up"><a href="javascript:void(0)" class="btn btn-number plus">';
  html += '<em class="fas fa-chevron-up fa-small"></em>';
  html += '</a></div>';

  html +=
    '<div class="down"><a href="javascript:void(0)" class="btn btn-number min">';
  html += '<em class="fas fa-chevron-down fa-small"></em>';
  html += '</a></div>';

  if (!hidestop) {
    html +=
      '<div class="stop"><a href="javascript:void(0)" class="btn btn-number stop">';
    html += 'STOP';
    html += '</a></div>';
  }

  html += '</div>';

  $mountPoint.html(html);
  $mountPoint.find('.plus').click(function () {
    switchBlinds(block, upAction);
  });
  $mountPoint.find('.min').click(function () {
    switchBlinds(block, downAction);
  });
  $mountPoint.find('.btn.stop').click(function () {
    switchBlinds(block, 'Stop');
  });

  if (withPercentage) {
    addSlider(block, {
      value: device['Level'],
      step: 1,
      min: 1,
      max: 100,
      disabled: isProtected(block),
    });
  }
  return [html, false];
}

/*previously there was a mechanism to send device update commands while sliding.
With the new websock interface the slider block didn't update correctly.
So I've disabled the call to slideDeviceExt function.
Maybe in the future I'll reenable the functionality.
*/
function addSlider(block, sliderValues) {
  var idx = block.idx;
  var $divslider = block.$mountPoint.find('.slider');

  $divslider.slider({
    value: sliderValues.value,
    step: sliderValues.step,
    min: sliderValues.min,
    max: sliderValues.max,
    disabled: sliderValues.disabled,
    start: function () {
      Domoticz.hold(idx); //hold message queue
      //sliding = idx;
      //            slideDeviceExt($(this).data('light'), ui.value, 0);
    },
    //        slide: function (event, ui) {
    //            slideDeviceExt($(this).data('light'), ui.value, 1);
    //},
    change: function (event, ui) {
      //            slideDeviceExt($(this).data('light'), ui.value, 2);
      var hasPassword = block.password;
      if (!DT_function.promptPassword(hasPassword)) return;

      slideDevice(block, ui.value);
    },
    stop: function () {
      //stop is called before change
      //sliding = false;
      Domoticz.release(idx); //release message queue
    },
  });
  $divslider.on('click', function (ev) {
    ev.stopPropagation();
  });
}

function isRGBDeviceAndEnabled(device) {
  return (
    (typeof settings['no_rgb'] === 'undefined' ||
      (typeof settings['no_rgb'] !== 'undefined' &&
        parseFloat(settings['no_rgb']) === 0)) &&
    (device['SubType'] === 'RGBWZ' ||
      device['SubType'] === 'RGBW' ||
      device['SubType'] === 'RGBWW' ||
      device['SubType'] === 'RGB' ||
      device['SubType'] === 'RGBWWZ')
  );
}

//# sourceURL=js/switches.js
