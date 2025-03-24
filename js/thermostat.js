// eslint-disable-next-line no-unused-vars
/* global sliding:writable number_format _TEMP_SYMBOL language*/
/* from bundle.js */
/* global moment templateEngine*/
/* from settings.js */
/* global settings */
/* from blocks.js */
/* global titleAndValueSwitch showUpdateInformation getBlockTitle*/
/* from domoticz-api.js*/
/* global Domoticz */
/* from dt_function.js*/
/* global DT_function */
/* from dial.js*/
/* global DT_dial */
/* from src/functions.js */
/* global isDefined */
// eslint-disable-next-line no-unused-vars
function addThermostatFunctions(block) {
  var $el = block.$mountPoint.find('.block_' + block.key);
  $el.find('.btn-number').on('click', function () {
    var type = $(this).attr('data-type');
    var input = titleAndValueSwitch(block)
      ? $el.find('.title')
      : $el.find('.state');
    var currentVal = input.text().split(block.unit);
    currentVal = parseFloat(currentVal[0].replace(',', '.'));
    var setpointStep = choose(block.device.step, 0.5);
    if (!isNaN(currentVal)) {
      var newValue = type === 'minus' ? currentVal - setpointStep : currentVal + setpointStep;
      if (newValue >= block.min && newValue <= block.max) {
        input.text(number_format(newValue, 1) + block.unit).trigger('change');
        switchThermostat(block, newValue);
      }
      if (newValue <= block.min) {
        $(this).attr('disabled', true);
      }
      if (newValue >= block.max) {
        $(this).attr('disabled', true);
      }
    } else {
      input.text(0);
    }
  });

  $el.find('.input-number').on('focusin', function () {
    $(this).data('oldValue', $(this).text());
  });

  $el.find('.input-number').on('change', function () {
    var minValue = block.min;
    var maxValue = block.max;
    var valueCurrent = parseFloat($(this).text());

    if (valueCurrent >= minValue) {
      $el.find(".btn-number[data-type='minus']").removeAttr('disabled');
    } else {
      $(this).val($(this).data('oldValue'));
    }
    if (valueCurrent <= maxValue) {
      $el.find(".btn-number[data-type='plus']").removeAttr('disabled');
    } else {
      $(this).val($(this).data('oldValue'));
    }
  });
}

// eslint-disable-next-line no-unused-vars
function getThermostatBlock(block) {
  block.min = parseFloat(choose(block.min, block.device.min, settings['setpoint_min'], 5));
  block.max = parseFloat(choose(block.max, block.device.max, settings['setpoint_max'], 40));
  block.unit = choose(block.unit, block.device.vunit, _TEMP_SYMBOL);

  var html = '';
  var device = block.device;
  var idx = block.idx;
  var value = number_format(device.Data, 1) + block.unit;
  var title = getBlockTitle(block);

  if (titleAndValueSwitch(block)) {
    title = [value, (value = title)][0];
  }

  templateEngine.load('thermostat_block').then(function (template) {
    var dataObject = {
      idx: idx,
      value: value,
      title: title,
      buttons: !choose(block.protected, (block.subidx && block.subidx === 1)),
      showinfo: showUpdateInformation(block) ? true : false,
      lastupdate: moment(device.LastUpdate).format(settings['timeformat']),
      mIcon: isDefined(block.icon) ? block.icon : '',
      mImage: isDefined(block.image) ? block.image : 'heating.png',
    };
    html = template(dataObject);
    block.$mountPoint.find('.block_' + block.key).html(html);
    addThermostatFunctions(block);
  });
  return true;
}

function switchThermostat(block, setpoint) {
  var idx = block.device.idx;
  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) return;
  Domoticz.syncRequest(
    idx,
    'type=command&param=setsetpoint&idx=' + idx + '&setpoint=' + setpoint
  );
}

function getEvohomeZoneBlock(block) {
  var html = '';
  var device = block.device;
  var value = device.Temp + _TEMP_SYMBOL;
  var title = getBlockTitle(block);

  var faStatus =
    device.Status == 'TemporaryOverride'
      ? 'fas fa-stopwatch'
      : 'far fa-calendar-alt';

  var untilOrLastUpdate =
    device.Status == 'Auto' || device.Status == 'TemporaryOverride'
      ? 'Until ' + moment(device.Until).format('HH:mm')
      : moment(device.LastUpdate).format(settings['timeformat']);

  untilOrLastUpdate =
    device.Status == 'PermanentOverride' ? 'Permanent' : untilOrLastUpdate;

  if (titleAndValueSwitch(block)) {
    title = [value, (value = title)][0];
  }

  templateEngine.load('thermostat_evo_zone').then(function (template) {
    var dataObject = {
      idx: device.idx,
      value: value,
      temp: device.Temp,
      tTemp: title,
      tSetP: device.SetPoint + _TEMP_SYMBOL,
      setpoint: device.SetPoint,
      status: device.Status,
      min: settings['setpoint_min'],
      max: settings['setpoint_max'],
      fa: faStatus,
      update: untilOrLastUpdate,
      mIcon: isDefined(block.icon) ? block.icon : '',
      mImage: isDefined(block.image) ? block.image : 'heating.png',
    };
    html = template(dataObject);
    block.$mountPoint.find('.mh').html(html);
    addEvohomeZoneFunctions(block);
  });
  return true;
}

function addEvohomeZoneFunctions(block) {
  var clickTimeout;
  var idx = block.idx;
  var $div = block.$mountPoint.find('.mh');

  $div.find('.btn-number').on('click', function () {
    clearTimeout(clickTimeout);
    Domoticz.hold(idx);

    var type = $(this).attr('data-type');
    var currentVal = $(this).parents('.col-button1').data('setpoint');
    var input = $div.find('.setpoint');
    var valid = false;

    if (!isNaN(currentVal)) {
      var newValue = type === 'minus' ? currentVal - 0.5 : currentVal + 0.5;
      if (newValue >= input.attr('min') && newValue <= input.attr('max')) {
        input.html(
          '<i class="fas fa-stopwatch small_fa">&nbsp;</i>' +
            newValue +
            _TEMP_SYMBOL
        );
        $(this).parents('.col-button1').data('setpoint', newValue);
        valid = true;
      }

      if (newValue <= input.attr('min')) {
        $(this).attr('disabled', true);
      }

      if (newValue >= input.attr('max')) {
        $(this).attr('disabled', true);
      }

      clickTimeout = setTimeout(function () {
        if (valid) {
          switchEvoZone(block, newValue, true);
        }
        Domoticz.release(block.device.idx);
      }, 2000);
    } else {
      input.text(0);
    }
  });

  $div
    .find('.input-number')
    .on('focusin', function () {
      $(this).data('oldValue', $(this).text());
    })
    .on('change', function () {
      var minValue = parseFloat($(this).attr('min'));
      var maxValue = parseFloat($(this).attr('max'));
      var valueCurrent = parseFloat($(this).text());

      if (valueCurrent >= minValue) {
        $div.find(".btn-number[data-type='minus']").removeAttr('disabled');
      } else {
        $(this).val($(this).data('oldValue'));
      }
      if (valueCurrent <= maxValue) {
        $div.find(".btn-number[data-type='plus']").removeAttr('disabled');
      } else {
        $(this).val($(this).data('oldValue'));
      }
    });

  $div.find('.setpoint').on('click', function () {
    if ($(this).attr('data-status') == 'TemporaryOverride') {
      switchEvoZone(block, $(this).attr('data-setpoint'), false);
    }
  });
}

function switchEvoZone(block, setpoint, override) {
  var idx = block.device.idx;
  var dial = block.type === 'zone';
  var hasPassword = block.password;
  var mode = override
    ? '&mode=TemporaryOverride&until=' +
      moment().add(settings['evohome_boost_zone'], 'minutes').toISOString()
    : '&mode=Auto';

  if (!DT_function.promptPassword(hasPassword)) {
    dial ? DT_dial.make(block) : getEvohomeZoneBlock(block);
    return;
  }

  Domoticz.syncRequest(
    idx,
    'type=setused&idx=' + idx + '&setpoint=' + setpoint + mode + '&used=true',
    true
  ).then(function () {
    if (override) block.device.SetPoint = setpoint;
    dial ? DT_dial.make(block) : getEvohomeZoneBlock(block);
  });
}

function getEvohomeControllerBlock(block) {
  var html = '';
  var device = block.device;
  var $div = block.$mountPoint.find('.block_' + block.key);
  var title = getBlockTitle(block);

  templateEngine.load('thermostat_evo_cont').then(function (template) {
    var dataObject = {
      idx: device.idx,
      mIcon: isDefined(block.icon) ? block.icon : '',
      mImage: isDefined(block.image) ? block.image : 'evohome.png',
      name: title,
      status: language.evohome[device.Status],
      update: moment(device.LastUpdate).format(settings['timeformat']),
      showUpdate: showUpdateInformation(block),
    };
    html = template(dataObject);
    $div.html(html);

    $div.find('.evoSelect').blur(function () {
      Domoticz.release(block.device.idx);
      $div.find('.title').toggleClass('hide');
      $div.find('.evoSelect').toggleClass('hide');
    });

    $div.find('.evoSelect').on('change', function () {
      var newValue = $(this).val();
      changeEvohomeControllerStatus(block, newValue);
      $div
        .find('.input-status')
        .text(language.evohome[newValue])
        .toggleClass('hide');
      $div.find('.evoSelect').toggleClass('hide');
    });

    addEvohomeControllerFunctions(block);
  });
  return true;
}

function addEvohomeControllerFunctions(block) {
  var $div = block.$mountPoint.find('.mh');
  $div.find('.btn-number').on('click', function () {
    $div.find('.evoSelect').toggleClass('hide');
    $div.find('.input-status').toggleClass('hide');
  });

  $div.find('.input-status').on('focusin', function () {
    $(this).data('oldValue', $(this).text());
  });

  $div.find('.input-status').on('change', function () {
    var status = $(this).attr('status');
    var valueCurrent = $(this).text();
    if (valueCurrent != status) {
      $div.find(".btn-number[data-type='status']").removeAttr('disabled');
    } else {
      $(this).val($(this).data('oldValue'));
    }
  });
}

function changeEvohomeControllerStatus(block, status) {
  var idx = block.device.idx;
  var dial = block.type === 'evo';
  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) {
    dial ? DT_dial.make(block) : getEvohomeControllerBlock(block);
    return;
  }
  Domoticz.syncRequest(
    idx,
    'type=command&param=switchmodal&idx=' +
      idx +
      '&status=' +
      status +
      '&action=1&used=true',
    true
  ).then(function () {
    block.device.Status = status;
    dial ? DT_dial.make(block) : getEvohomeControllerBlock(block);
  });
}

function getEvohomeHotWaterBlock(block) {
  var html = '';
  var device = block.device;
  var $div = block.$mountPoint.find('.mh');

  var untilOrLastUpdate =
    device.Status == 'Auto' || device.Status == 'TemporaryOverride'
      ? 'Until ' + moment(device.Until).format('HH:mm')
      : moment(device.LastUpdate).format(settings['timeformat']);

  var faStatus =
    device.Status == 'TemporaryOverride'
      ? 'fas fa-stopwatch'
      : 'far fa-calendar-alt';

  var name = getBlockTitle(block);
  var temp = device.Temp + _TEMP_SYMBOL;
  if (titleAndValueSwitch(block)) {
    temp = [name, (name = temp)][0];
  }

  templateEngine.load('thermostat_evo_hw').then(function (template) {
    var dataObject = {
      idx: device.idx,
      toggle: device.State.toLowerCase(),
      name: name,
      state: device.State,
      temp: temp,
      fa: faStatus,
      update: untilOrLastUpdate,
      mIcon: isDefined(block.icon) ? block.icon : '',
      mImage: isDefined(block.image) ? block.image : 'hot_water_on.png',
    };
    html = template(dataObject);
    $div.html(html);

    $div.find('.btn-number').on('click', function () {
      Domoticz.hold(block.device.idx);
      var state = device.State === 'Off' ? 'On' : 'Off';
      switchEvoHotWater(block, state, state === 'On');
    });
  });
  return true;
}

function switchEvoHotWater(block, state, override) {
  var idx = block.device.idx;
  var dial = block.type === 'dhw';
  var mode = override
    ? '&mode=TemporaryOverride&until=' +
      moment().add(settings['evohome_boost_hw'], 'minutes').toISOString()
    : '&mode=Auto';

  var hasPassword = block.password;
  if (!DT_function.promptPassword(hasPassword)) {
    dial ? DT_dial.make(block) : getEvohomeHotWaterBlock(block);
    return;
  }
  Domoticz.syncRequest(
    idx,
    'type=setused&idx=' +
      idx +
      '&setpoint=60&state=' +
      state +
      mode +
      '&used=true',
    true
  ).then(function () {
    dial ? DT_dial.make(block) : getEvohomeHotWaterBlock(block);
  });
}
//# sourceURL=js/thermostat.js
