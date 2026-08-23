/* global showUpdateInformation settings getDevices language infoMessage iconORimage getBlockData blocks */
/* global moment hexToHsb md5*/
/* from main.js */
// eslint-disable-next-line no-unused-vars
/* global sliding:writable  slide:writable*/
/* from domoticz-api.js*/
/* global Domoticz*/
/* from dt_function.js*/
/* global DT_function choose*/
/* from dial.js */
/* global DT_dial */
/* from blocks.js */
/* global getBlockTitle */
/* from colorpicker.js */
/* global Colorpicker */
/* from version.js */

/*exported reqSlideDeviceAsync*/

var spectrumColors = {};

/** Returns a default switch block
 *
 * @param {object} block - The Dashticz block definition
 */
// eslint-disable-next-line no-unused-vars
function getDefaultSwitchBlock(block) {
  var device = block.device;
  var defaultIconOn = block.protoBlock.iconOn;
  var defaultIconOff = block.protoBlock.iconOff;
  var defaultIcon = block.protoBlock.icon;
  var defaultImageOn = block.protoBlock.imageOn;
  var defaultImageOff = block.protoBlock.imageOff;
  var defaultImage = block.protoBlock.image;
  var defaultTextOn = block.protoBlock.textOn;
  var defaultTextOff = block.protoBlock.textOff;
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
    if (device.Type === 'Scene') mMode = 'on';
    if (!block.clickHandler)
      block.$mountPoint
        .find('.mh')
        .addClass('hover')
        .off('click')
        .click(function () {
          switchDevice(block, mMode, !!confirmswitch);
        });
  }
  block.defaultAddClass &&
    block.$mountPoint.find('.mh').addClass(block.defaultAddClass);

  var textOn = defaultTextOn || language.switches.state_on;
  var textOff = defaultTextOff || language.switches.state_off;

  var attr = '';
  if (device['Image'] == 'Alarm') {
    defaultIconOff = 'fas fa-exclamation-triangle';
    defaultIconOn = defaultIconOff;
    if (device['Status'] == 'On') attr = 'style="color:#F05F40;"';
  }

  var iconLookup = {
    on: defaultIconOn,
    off: defaultIconOff,
    mixed: defaultIconOff,
    default: defaultIconOn || defaultIcon,
  };
  var imageLookup = {
    on: defaultImageOn,
    off: defaultImageOff,
    mixed: defaultImageOff,
    default: defaultImageOn || defaultImage,
  };
  var statusClass = getIconStatusClass(device['Status']);
  var mIcon = iconLookup[statusClass] || iconLookup.default || defaultIcon;
  var mImage = imageLookup[statusClass] || imageLookup.default || defaultImage;
  html += iconORimage(block, mIcon, mImage, statusClass + ' icon', attr);
  html += getBlockData(block, textOn, textOff);
  return html;
}

function isProtected(block) {
  return (
    block.protected ||
    (block.protoBlock && block.protoBlock.protected) ||
    (block.device && block.device.Protected)
  );
}

function getIconStatusClass(deviceStatus) {
  if (deviceStatus != undefined) {
    switch (deviceStatus.toLowerCase()) {
      case 'off':
      case 'closed':
      case 'close':
      case 'normal':
      case 'unlocked':
      case 'no motion':
        return 'off';
      case 'mixed':
        return 'mixed';
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
  var dial = block.type === 'onoff';
  var group = block.type === 'group';
  if (isProtected(block)) return;

  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;
  var doStatus = '';
  var param = 'switchlight';
  if (!dial && !group) {
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
  } else {
    doStatus = pMode;
  }

  if (DT_function.idxIsScene(idx)) {
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
    block.device.Status = doStatus;
    dial ? DT_dial.make(block) : getDevices(true);
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

function cmdSlideDevice(idx, level) {
  return (
    'type=command&param=switchlight&idx=' +
    idx +
    '&switchcmd=Set%20Level&level=' +
    level
  );
}

function reqSlideDevice(idx, level) {
  return Domoticz.syncRequest(idx, cmdSlideDevice(idx, level));
}

function reqSlideDeviceAsync(idx, level) {
  return Domoticz.request(cmdSlideDevice(idx, level));
}

// eslint-disable-next-line no-unused-vars
function slideDevice(block, status) {
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

  reqSlideDevice(block.idx, status).then(function () {
    getDevices(true);
  });
}

// eslint-disable-next-line no-unused-vars
function ziggoRemote(key) {
  var horizonPath = settings['switch_horizon'];
  var bundledHelper = false;
  if (horizonPath === 'switch_horizon.php') {
    horizonPath = 'tools/switch_horizon.php';
    bundledHelper = true;
  }
  if (!bundledHelper) {
    $.get(horizonPath + '?key=' + encodeURIComponent(key));
    return;
  }

  $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf').then(
    function (data) {
      return $.ajax({
        url: horizonPath,
        method: 'POST',
        data: { key: key },
        headers: {
          'X-Dashticz-CSRF': data.token,
        },
      });
    }
  );
}

// eslint-disable-next-line no-unused-vars
function controlLogitech(idx, action) {
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
  if (typeof block['hide_data'] == 'undefined' || block['hide_data'] == false) {
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
  html += '<div class="rgbcontainer">';
  if (isRGBDeviceAndEnabled(block)) html += '<div class="rgbholder"></div>';
  html +=
    '<div class="slider slider' +
    device['idx'] +
    '" data-light="' +
    device['idx'] +
    '"></div>';
  html += '</div>';
  html += '</div>';

  /* todo: Destroy not really needed
  var $rgbdiv = $div.find('.rgbw'); //This is the 'old' rgbdiv!

  if (isRGBDeviceAndEnabled(block) && $rgbdiv.spectrum) {
    //we have to manually destroy the previous spectrum color picker
    $rgbdiv.spectrum('destroy');
  }
*/
  $div.html(html);

  function dimmerClickHandler(block) {
    switchDevice(block, 'toggle', false);
  }

  $div.off('click');

  if (!isProtected(block)) {
    if (
      typeof block.switchMode === 'string' &&
      block.switchMode.toLowerCase() === 'color'
    ) {
      //        me.$mountPoint.find('.extra').append('<div class="rgbholder"></div>');
      //        addColorpicker(me);
      var popupblock = {
        device: block.device,
        idx: block.idx,
        title: choose(block.title, block.key),
        colorpickerscale: block.colorpickerscale,
      };
      new Colorpicker({
        container: block.mountPoint + ' .mh',
        block: popupblock,
      });
    } else
      $div
        .on('click', function () {
          dimmerClickHandler(block);
        })
        .addClass('hover');
  }

  switch (isRGBDeviceAndEnabled(block)) {
    case 1:
      addSpectrum(block);
      break;
    case 2:
      addColorpicker(block);
      break;
    default:
      break;
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

function addColorpicker(block) {
  var $rgbcontainer = block.$mountPoint.find('.rgbholder');
  var html = '';
  html +=
    '<div class="sp-replacer sp-light"><div class="sp-preview"><div class="sp-preview-inner"></div></div><div class="sp-dd">▼</div></div>';
  $rgbcontainer.html(html).addClass('cpholder');
  new Colorpicker({
    container: block.mountPoint + ' .rgbholder',
    block: block,
  });
}

function addSpectrum(block) {
  function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  }

  function rgbToHex(r, g, b) {
    return '#' + componentToHex(r) + componentToHex(g) + componentToHex(b);
  }

  var idx = block.idx;
  var $rgbcontainer = block.$mountPoint.find('.rgbholder');
  var html = '';
  html +=
    '<input type="text" class="rgbw rgbw' + idx + '" data-light="' + idx + '">';
  $rgbcontainer.html(html).addClass('spectrum');
  var $rgbdiv = block.$mountPoint.find('.rgbw');
  var color = '#FFFFFF';
  if (block.device.Color) {
    var deviceColor = JSON.parse(block.device.Color);
    if (deviceColor.r && (deviceColor.m == 3 || deviceColor.m == 4)) {
      color = rgbToHex(deviceColor.r, deviceColor.g, deviceColor.b);
    }
  }

  $rgbdiv.spectrum({
    color: color,
    appendTo: $rgbcontainer,
  });

  $rgbdiv.on('dragstop.spectrum', function (e, color) {
    var hasPassword = block.password;
    if (!DT_function.promptPassword(hasPassword)) return;

    color = color.toHexString();
    spectrumColors[idx] = color;
    var hue = hexToHsb(color);
    var bIsWhite = hue.s < 20;

    //sliding = idx;
    Domoticz.hold(idx); //hold message queue

    var cmd =
      'type=command&param=setcolbrightnessvalue&idx=' +
      idx +
      '&hue=' +
      hue.h +
      '&brightness=' +
      hue.b +
      '&iswhite=' +
      bIsWhite;
    Domoticz.request(cmd);
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

// eslint-disable-next-line no-unused-vars
function getBlindsBlock(parentBlock, withPercentageParam) {
  var block = {};
  $.extend(block, parentBlock.protoBlock, parentBlock);
  var device = block.device;
  var withPercentage = choose(block.withPercentage, withPercentageParam, false);
  var idx = block.idx;
  var $mountPoint = block.$mountPoint.find('.mh');
  var html = '';

  // "Needle" is a separate visual mode (next to Icon/Dial/Bar in the Device
  // Config popup), opted into via block.needle - it does not change what
  // Icon mode's own withPercentage renders below, which is the original
  // classic thin percentage bar.
  if (block.needle === true) {
    // Domoticz already tells us when a blind's percentage scale runs the
    // other way round: SwitchType contains "Inverted" for those devices
    // (the same check the classic bar below also uses for asOn). Prefer
    // that; a block.inverse config field (Inverse switch in the Device
    // Config popup) overrides it for the rare device that doesn't expose
    // this correctly - once set, it takes over both the OPEN/DICHT command
    // direction and the scale/fill direction together, since a manual
    // override exists specifically because Domoticz's own answer was wrong
    // for this device.
    var autoInverted =
      device['SwitchType'].toLowerCase().indexOf('inverted') >= 0;
    var inverted = choose(block.inverse, autoInverted);
    var asOn = Domoticz.info.newBlindsBehavior;
    if (inverted) {
      asOn = !asOn;
    }
    // Keep the classic bar's fixed one-percent step by default. A block
    // that already supplies a slider_step/sliderstep value can use that
    // value instead.
    var sliderStep = parseFloat(block.slider_step || block.sliderstep || 1);
    if (!isFinite(sliderStep) || sliderStep <= 0) sliderStep = 1;
    renderBlindsSliderBlock(
      block,
      device,
      idx,
      $mountPoint,
      asOn,
      inverted,
      sliderStep
    );
    return true;
  }

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
        '<span class="state">' +
        (block.textOff || language.switches.state_closed) +
        '</span>';
    else
      value =
        '<span class="state">' +
        (block.textOn || language.switches.state_open) +
        '</span>';
  }
  if (!withPercentage) {
    if (
      typeof block['hide_data'] == 'undefined' ||
      block['hide_data'] == false
    ) {
      if (device['Status'] === 'Closed')
        value =
          '<span class="state">' +
          (block.textOff || language.switches.state_closed) +
          '</span>';
      else
        value =
          '<span class="state">' +
          (block.textOn || language.switches.state_open) +
          '</span>';
    } else {
      value = '<span class="state"></span>';
    }
  }
  html += '<strong class="title">' + title + '</strong><br />';
  html += value;
  html += '</div>';

  html += '<div class="' + button_class + '">';

  var asOn = Domoticz.info.newBlindsBehavior;

  if (device['SwitchType'].toLowerCase().indexOf('inverted') >= 0) {
    asOn = !asOn;
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
    switchBlinds(block, asOn ? 'On' : 'Off');
  });
  $mountPoint.find('.min').click(function () {
    switchBlinds(block, asOn ? 'Off' : 'On');
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
  return true;
}

/** Renders a Blinds Percentage/Blinds Inverted Percentage device as one
 * continuous vertical slider: a title header, then the slider beside a
 * column of icon-only OPEN/STOP/DICHT buttons (OPEN top, STOP middle, DICHT
 * bottom - all within the slider's own height, via justify-content:
 * space-between). No icon, unlike the classic icon | data | buttons layout
 * below - this control speaks for itself.
 *
 * @param {object} block - The Dashticz block definition
 * @param {object} device - block.device
 * @param {string} idx - block.idx
 * @param {jQuery} $mountPoint - the block's .mh mount point
 * @param {boolean} asOn - whether the "up" action maps to Domoticz On (SwitchType-dependent)
 * @param {boolean} inverted - whether 0% (not 100%) is the device's fully-open end
 * @param {number} sliderStep - the slider's drag/command step size
 */
function renderBlindsSliderBlock(
  block,
  device,
  idx,
  $mountPoint,
  asOn,
  inverted,
  sliderStep
) {
  var title = getBlockTitle(block);
  var hidestop =
    typeof block['hide_stop'] != 'undefined' && block['hide_stop'] !== false;
  var openLabel = block.textOn || language.switches.state_open;
  var closeLabel = block.textOff || language.switches.state_closed;

  var html = '<div class="blinds-slider-block">';
  html += '<div class="blinds-slider-header">';
  html += '<strong class="title">' + title + '</strong>';
  html += '</div>';

  html += '<div class="blinds-slider-body">';

  html +=
    '<div class="blinds-slider-wrap swiper-no-swiping" data-light="' +
    idx +
    '">' +
    (block.hide_data === true
      ? ''
      : '<div class="slider-scale" aria-hidden="true"></div>') +
    '<div class="slider slider' +
    idx +
    '" data-light="' +
    idx +
    '"></div>';
  html += '</div>';

  html += '<div class="blinds-slider-actions">';

  html +=
    '<div class="blinds-slider-action blinds-slider-action-up"><a href="javascript:void(0)" class="btn-blinds btn-blinds-up" aria-label="' +
    openLabel +
    '"><em class="fas fa-chevron-up"></em></a></div>';

  if (!hidestop) {
    html +=
      '<div class="blinds-slider-action blinds-slider-action-stop"><a href="javascript:void(0)" class="btn-blinds btn-blinds-stop" aria-label="Stop"><em class="fas fa-stop-circle"></em></a></div>';
  }

  html +=
    '<div class="blinds-slider-action blinds-slider-action-down"><a href="javascript:void(0)" class="btn-blinds btn-blinds-down" aria-label="' +
    closeLabel +
    '"><em class="fas fa-chevron-down"></em></a></div>';

  html += '</div>'; // .blinds-slider-actions
  html += '</div>'; // .blinds-slider-body
  html += '</div>'; // .blinds-slider-block

  $mountPoint.html(html);
  $mountPoint.find('.btn-blinds-up').click(function () {
    switchBlinds(block, asOn ? 'On' : 'Off');
  });
  $mountPoint.find('.btn-blinds-down').click(function () {
    switchBlinds(block, asOn ? 'Off' : 'On');
  });
  $mountPoint.find('.btn-blinds-stop').click(function () {
    switchBlinds(block, 'Stop');
  });

  // 0/100, matching Domoticz's real Level range and the Bar dial subtype's
  // own segments (js/components/dial.js's makeBarDim()/getCurrentValueDim())
  // - min: 1 previously made a fully-closed/open device (raw Level 0 or 100)
  // read as -1%/101% instead of 0%/100%.
  addSlider(block, {
    value: device['Level'],
    step: sliderStep,
    min: 0,
    max: 100,
    disabled: isProtected(block),
  });
}

function addSlider(block, sliderValues) {
  var idx = block.idx;
  var $divslider = block.$mountPoint.find('.slider');
  var $wrap = $divslider.closest('.blinds-slider-wrap');
  var min = Number(sliderValues.min);
  var max = Number(sliderValues.max);

  // Needle's scale reads top-to-bottom as 0%-100% - the opposite of a plain
  // vertical slider's own min-at-bottom/max-at-top convention, but the same
  // fixed layout the Bar dial subtype always uses (js/components/dial.js's
  // dialbar.tpl lists its 0%, then increasing, segments top-to-bottom in
  // plain DOM/flex order), regardless of an inverted SwitchType. jQuery UI
  // itself has no such "flip" option, so every value handed to or read from
  // the widget is mirrored around the midpoint of [min, max] instead -
  // that's self-inverse, so the same function converts both directions. A
  // no-op (identity) for the plain (non-Needle) dimmer slider below, which
  // keeps its normal min-at-bottom layout.
  function mirror(value) {
    return $wrap.length ? min + max - value : value;
  }

  function percentFromBottom(value) {
    var percent = ((value - min) / (max - min)) * 100;
    return $wrap.length ? 100 - percent : percent;
  }

  // Marks the scale tick closest to the slider's current value with the
  // .slider-tick-active class (highlighted in css/creative.css) - the only
  // on-slider indicator of the current reading. $scale/barSteps are
  // assigned further down, once - both var declarations, so already in
  // scope here - but this is only ever called after that assignment has
  // run.
  function highlightActiveTick(value) {
    if (!$scale) return;
    var nearestM = Math.round(((value - min) / (max - min)) * barSteps);
    $scale.find('.slider-tick').each(function (i) {
      $(this).toggleClass('slider-tick-active', i === nearestM);
    });
  }

  // .ui-slider-range (the gradient fill) is anchored 8px above the track's
  // own top by the CSS above (matching .slider::before's own extended top,
  // so the fill can reach into the zone reserved for the handle's overhang
  // at the 0% extreme - see that CSS for the full picture) - jQuery UI
  // itself only ever sets this element's height (inline, as a % of the
  // *unextended* track), so without this the fill's top would stay pinned
  // 8px below where it now visually starts, leaving a gap there at every
  // value. +16 (not +8) here: +8 keeps the fill's bottom edge where it
  // would otherwise land relative to the shifted top, and a further +8
  // grows it past that point down to the handle's own *bottom* edge (the
  // handle's center - which is what jQuery UI's own math tracks - sits 8px
  // above its bottom edge, see the handle's own margin-bottom: -8px
  // above), so the fill always reaches all the way to the visible edge of
  // the handle instead of stopping at its middle - including the 100%
  // extreme, where that's the same 8px overhang zone .slider::before
  // reserves at the bottom.
  function extendRangeFill(value) {
    if (!$wrap.length) return;
    var $range = $divslider.find('.ui-slider-range');
    if (!$range.length) return;
    var fillFraction = (value - min) / (max - min);
    $range.css('height', fillFraction * $divslider.height() + 16 + 'px');
  }

  // Build a 0-100%-of-range scale, divided into block.barsteps segments -
  // the same Steps config field (default 10) the Bar dial subtype already
  // exposes (js/components/dial.js), so both share one config-menu setting.
  // Independent of the slider's own command step - each tick jumps straight
  // to its real underlying value. The slider itself remains draggable
  // everywhere; jQuery UI performs the snapping to sliderValues.step.
  if ($wrap.length) {
    var $scale = $wrap.find('.slider-scale').empty();
    var barSteps = Math.max(1, parseInt(choose(block.barsteps, 10), 10) || 10);

    function addTick(value, label) {
      var target = Math.round(value);
      var $tick = $('<button type="button" class="slider-tick"></button>')
        .css('bottom', percentFromBottom(value) + '%')
        .append('<span>' + label + '%</span>')
        .attr('aria-label', label + '%');
      if (!sliderValues.disabled) {
        // Setting the jQuery UI value option itself triggers the slider's
        // own "change" callback below (with a null event) - that already
        // re-highlights the active tick and calls slideDevice(), so don't
        // repeat that here or the command would be sent twice.
        $tick.on('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          $divslider.slider('value', mirror(target));
        });
      }
      $tick.appendTo($scale);
    }

    if ($scale.length) {
      for (var m = 0; m <= barSteps; m++) {
        var stepValue = min + ((max - min) * m) / barSteps;
        addTick(stepValue, Math.round((m / barSteps) * 100));
      }

      highlightActiveTick(sliderValues.value);
    }
  }

  $divslider.slider({
    value: mirror(sliderValues.value),
    step: sliderValues.step,
    min: sliderValues.min,
    max: sliderValues.max,
    disabled: sliderValues.disabled,
    // jQuery UI defaults to a horizontal slider (handle position and drag
    // math both driven by the mouse's X-axis) - without this, the blinds
    // slider only *looks* vertical via CSS while the handle stays visually
    // static and dragging maps Y-axis movement almost randomly to a value.
    orientation: $wrap.length ? 'vertical' : 'horizontal',
    // jQuery UI only creates the .ui-slider-range element (the gradient
    // fill below the handle, styled in css/creative.css) when this is set.
    // Combined with the mirrored value above, 'max' (fill from the handle up
    // to jQuery UI's own internal maximum) is what ends up transparent at
    // 0% and completely filled at 100% here - matching the number shown in
    // the ticks, which is always the device's raw Level, 0-100 (the Bar
    // dial subtype, js/components/dial.js, shows that same raw, unconverted
    // value regardless of an inverted SwitchType - "inverted" only changes
    // which direction OPEN/DICHT move the blind, see asOn above). Left off
    // for the dimmer slider, which never had a range fill before and keeps
    // jQuery UI's own unmirrored min-at-bottom layout.
    range: $wrap.length ? 'max' : false,
    start: function () {
      Domoticz.hold(idx); //hold message queue
    },
    slide: function (event, ui) {
      var value = mirror(ui.value);
      highlightActiveTick(value);
      extendRangeFill(value);
    },
    change: function (event, ui) {
      var hasPassword = block.password;
      if (!DT_function.promptPassword(hasPassword)) return;

      var value = mirror(ui.value);
      highlightActiveTick(value);
      extendRangeFill(value);
      slideDevice(block, value);
    },
    stop: function () {
      //stop is called before change
      Domoticz.release(idx); //release message queue
    },
  });
  extendRangeFill(sliderValues.value); //the initial change/slide above never fires for this first render
  $divslider.on('click', function (ev) {
    ev.stopPropagation();
  });
}

function isRGBDeviceAndEnabled(block) {
  if (Colorpicker.prototype.dimmerTypes.indexOf(block.device.SubType) === -1)
    return 0;
  if (typeof block.colorpicker !== 'undefined')
    return parseInt(block.colorpicker);
  if (typeof settings.colorpicker !== 'undefined')
    return parseInt(settings.colorpicker);
  return settings.no_rgb ? 0 : 1; //Default colorpicker is the old spectrum colorpicker
}

//# sourceURL=js/switches.js
