// eslint-disable-next-line no-unused-vars
/* global sliding:writable number_format _TEMP_SYMBOL */
/* from bundle.js */
/* global moment */
/* from settings.js */
/* global settings */
/* from blocks.js */
/* global iconORimage titleAndValueSwitch showUpdateInformation */
/* from domoticz-api.js*/
/* global Domoticz */
/* from dashticz.js*/
/* global Dashticz */

// eslint-disable-next-line no-unused-vars
function addThermostatFunctions(block) {
    var $el= block.$mountPoint.find('.block_'+block.idx);
    $el.find('.btn-number').on("click", function () {
        //sliding = true;  //not needed here I guess, since update is blocked in switchThermostat function  (called below)
        //        var fieldName = $(this).attr('data-field');
        var type = $(this).attr('data-type');
        var input = $el.find("strong");
        var currentVal = input.text().split('°');
        currentVal = parseFloat(currentVal[0].replace(',', '.'));
        if (!isNaN(currentVal)) {
            var newValue = (type === 'minus') ? currentVal - 0.5 : currentVal + 0.5;
            if (newValue >= block.min &&
                newValue <= block.max
            ) {
                input.text(number_format(newValue, 1) + _TEMP_SYMBOL).trigger("change");
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

        //        var name = $(this).attr('name');
        if (valueCurrent >= minValue) {
            $el.find(".btn-number[data-type='minus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
        if (valueCurrent <= maxValue) {
            $el.find(".btn-number[data-type='plus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
}
//var addedThermostat = [];

// eslint-disable-next-line no-unused-vars
function getThermostatBlock(block) {
    block.min=parseFloat(block.min || settings['setpoint_min'] || 5);
    block.max=parseFloat(block.max || settings['setpoint_max'] || 40);
    var device=block.device;
    var idx=block.idx;
    var html = '';
    html += iconORimage(block, '', 'heating.png', 'on icon', 'style="max-height:35px;"');
    html += '<div class="col-xs-8 col-data">';

    var title = number_format(device['Data'], 1) + _TEMP_SYMBOL;
    var value = device['Name'];
    if (titleAndValueSwitch(block)) {
        title = device['Name'];
        value = number_format(device['Data'], 1) + _TEMP_SYMBOL;
    }
    html += '<strong class="title">' + title + '</strong><br />';
    html += '<span class="state">' + value + '</span>';
    if (showUpdateInformation(block)) {
        html += '<br /><span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    }
    html += '</div>';

    block.$mountPoint.find('.block_' + idx ).html(html);

    if(!(block.subidx && block.subidx==1)) {//subidx 1 indicates no buttons
        html='';
        html += '<div class="col-button1">';
        html += '  <div class="up">';
        html += '    <a href="javascript:void(0)" class="btn btn-number plus" data-type="plus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
        html += '      <em class="fas fa-plus fa-small fa-thermostat"></em>';
        html += '    </a>';
        html += '  </div>';
        html += '  <div class="down">';
        html += '    <a href="javascript:void(0)" class="btn btn-number min" data-type="minus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
        html += '      <em class="fas fa-minus fa-small fa-thermostat"></em>';
        html += '    </a>';
        html += '  </div>';
        html += '</div>';
        block.$mountPoint.find('.block_' + idx ).append(html);
        block.$mountPoint.find('.col-data').addClass('right1col');
    }
/*pieces of the old code 
    html += iconORimage(idx + '_2', '', 'heating.png', 'on icon iconheating', '', '2');
    html += '<strong class="title input-number" min="' + settings['setpoint_min'] + '" max="' + settings['setpoint_max'] + '" data-light="' + device['idx'] + '">' + title + '</strong>';
    html += '<div class="state stateheating">' + value + '</div>';
    html += '</div>';

    block.$mountPoint.find('.block_' + idx + '_2').html(html);
    block.$mountPoint.find('.block_' + idx).html(html);*/

//    addThermostatFunctions(block, idx);
//        addedThermostat[idx] = true;
//    }
//    if (typeof (addedThermostat[idx + '_2']) === 'undefined') {
        addThermostatFunctions(block);
//        addedThermostat[idx + '_2'] = true;
//    }
    return ['', false];
}

function switchThermostat(block, setpoint) { //todo
    var idx = block.idx;
    var hasPassword = block.password;
    if (!Dashticz.promptPassword(hasPassword)) return;

    Domoticz.syncRequest(idx, 'type=command&param=setsetpoint&idx=' + idx + '&setpoint=' + setpoint)
}


function getEvohomeZoneBlock(block) {
    var device=block.device;
    var idx = block.idx;
    var temp = device.Temp;
    var setpoint = device.SetPoint;
    var status = device.Status;
    var title_temp = temp + _TEMP_SYMBOL;
    var title_setp = setpoint + _TEMP_SYMBOL;
    var value = device['Name'];
    if (titleAndValueSwitch(block)) {
        var tmp = title_temp
        title_temp = value;
        value = tmp;
    }

    var fa_status = (status == 'TemporaryOverride') ? 'fas fa-stopwatch' : 'far fa-calendar-alt';

    var untilOrLastUpdate = (status == 'Auto' || status == 'TemporaryOverride') ? 'Until ' + moment(device['Until']).format('HH:mm') : moment(device['LastUpdate']).format(settings['timeformat']);
    untilOrLastUpdate = status == 'PermanentOverride' ? 'Permanent' : untilOrLastUpdate;

    var html = '';
    html += '<div class="col-button1" data-setpoint="' + setpoint + '"  data-temp="' + temp + '" >';
    html += '	<div class="up">';
    html += '		<a href="javascript:void(0)" class="btn btn-number plus" data-type="plus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-plus fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '	<div class="down">';
    html += '		<a href="javascript:void(0)" class="btn btn-number min"data-type="minus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-minus fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '</div>';

    html += iconORimage(block, '', 'heating.png', 'on icon iconheating', '', '2');
    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + value + '</div>';
    html += '	<div>';
    html += '		<span class="state input-number">' + title_temp + '&nbsp;</span>';
    html += '		<span class="setpoint text-grey input-number" min="' + settings['setpoint_min'] + '" max="' + settings['setpoint_max'] + '" data-light="' + device['idx'] + '" data-status="' + status + '" data-setpoint="' + setpoint + '">&nbsp;<i class="' + fa_status + ' small_fa">&nbsp;</i>&nbsp;' + title_setp + '</span>';
    html += '	</div>';
    html += '	<span class="lastupdate">' + untilOrLastUpdate + '</span>';
    html += '</div>';

    block.$mountPoint.find('.mh').html(html);

 //   if (typeof (addedThermostat[idx]) === 'undefined') {
        addEvohomeZoneFunctions(block);
//        addedThermostat[idx] = true;
//    }
    return [html, false];
}

function addEvohomeZoneFunctions(block) { //todo

    var clickTimeout;
    var idx=block.idx;
    var $div=block.$mountPoint.find('.mh');

    $div.find('.btn-number').on("click", function () {

        clearTimeout(clickTimeout);
        Domoticz.hold(idx); //hold message queue
        //sliding = true;
        var type = $(this).attr('data-type');
        var currentVal = $(this).parents('.col-button1').data('setpoint');
        var input = $div.find(".setpoint");
        var valid = false;
        if (!isNaN(currentVal)) {

            var newValue = (type === 'minus') ? currentVal - 0.5 : currentVal + 0.5;

            if (newValue >= input.attr('min') && newValue <= input.attr('max')) {
                input.html('&nbsp;<i class="fas fa-stopwatch small_fa">&nbsp;</i>' + newValue + _TEMP_SYMBOL);
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
                    //console.log(newValue + _TEMP_SYMBOL);
                    switchEvoZone(block, newValue, true);
                    // sliding = false;
                }
                Domoticz.release(idx); //release message queue
            }, 2000);
        } else {
            input.text(0);
        }
    });

    $div.find('.btn-number').on("mouseenter", function () {
        //Domoticz.hold(idx); //hold message queue
        //sliding = true;
    });

    $div.find('.input-number').on('focusin', function () {
        $(this).data('oldValue', $(this).text());
    })
    .on('change', function () {
        var minValue = parseFloat($(this).attr('min'));
        var maxValue = parseFloat($(this).attr('max'));
        var valueCurrent = parseFloat($(this).text());

        if (valueCurrent >= minValue) {
            $div.find(".btn-number[data-type='minus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
        if (valueCurrent <= maxValue) {
            $div.find(".btn-number[data-type='plus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
    $div.find('.setpoint').on("click", function () {
        if ($(this).attr('data-status') == 'TemporaryOverride') {
            switchEvoZone(block, $(this).attr('data-setpoint'), false);
        }
    });
}

function switchEvoZone(block, setpoint, override) { //todo

    var mode = override ? '&mode=TemporaryOverride&until=' + moment().add(settings['evohome_boost_zone'], 'minutes').toISOString() : '&mode=Auto';
    var idx=block.idx;
    /*
        //sliding = idx;
        Domoticz.hold(idx); //hold message queue
        $.ajax({
            url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=setused&idx=' + idx + '&setpoint=' + setpoint + mode + '&used=true&jsoncallback=?',
            type: 'GET',
            contentType: 'application/json',
            dataType: 'jsonp',
            success: function () {
                //sliding = false;
                Domoticz.release(idx); //release message queue
                var device = Domoticz.getAllDevices()[idx];
                device.SetPoint = setpoint;
                getEvohomeZoneBlock(device, idx);
            }
        });
        */
    var hasPassword = block.password;
    if (!Dashticz.promptPassword(hasPassword)) {
        getEvohomeZoneBlock(block);
        return;
    }

    Domoticz.syncRequest(idx, 'type=setused&idx=' + idx + '&setpoint=' + setpoint + mode + '&used=true', true)
        .then(function () {
            block.device.SetPoint = setpoint;
            getEvohomeZoneBlock(block);
        })
}

function getEvohomeControllerBlock(block) {
    var device=block.device;
    var idx=block.idx;
    var $div=block.$mountPoint.find('.block_'+idx);

    var evoOptions = {
        "Auto": "Auto",
        "AutoWithEco": "Econony",
        "Away": "Away",
        "Custom": "Custom",
        "DayOff": "Day Off",
        "HeatingOff": "Off"
    };
    var status = device.Status;
    var value = device['Name'];
    var title = '';

    $.each(evoOptions, function (val, text) {
        if (val == device.Status) title = text;
    });

    if (titleAndValueSwitch(block)) {
        var tmp = title
        title = value;
        value = tmp;
    }
    var html = '';
    html += '<div class="col-button1">';
    html += '	<div class="up">';
    html += '		<a href="javascript:void(0)" class="btn btn-number plus" data-type="status" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-cog fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '</div>';

    html += iconORimage(block, '', 'evohome.png', 'on icon iconheating', '', '2');

    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + value + '</div>';
    html += '	<div>';
    html += '		<span class="state">Mode: </span>';
    html += '		<span class="state input-status" status="' + settings['evohome_status'] + '" data-light="' + device['idx'] + '">' + status + '</span>';
    html += '		<select class="evoSelect select hide"><option value="" disabled selected>Select</option></select>';
    html += '	<div>';
    html += '	<span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    html += '</div>';

    $div.html(html);
    $.each(evoOptions, function (val, text) {
        $div.find('.evoSelect').append(
            $('<option></option>').val(val).html(text)
        );
    });
    $div.find('.evoSelect').blur(function () {
        //sliding = false;
        Domoticz.release(idx); //release message queue
        $div.find('.title').toggleClass('hide');
        $div.find('.evoSelect').toggleClass('hide');
    });
    $div.find('.evoSelect').on('change', function () {
        var newValue = $(this).val();
        changeEvohomeControllerStatus(block, newValue);
        $div.find('.input-status')
        .text(newValue) //todo: check: do we need a . before input-status?
        .toggleClass('hide');
        $div.find('.evoSelect').toggleClass('hide');
    })

    addEvohomeControllerFunctions(block);
    return [html, false];
}

function addEvohomeControllerFunctions(block) { //todo
    var idx=block.idx;
    var $div=block.$mountPoint.find('.mh');
    $div.find('.btn-number').on("click", function () {
        //Domoticz.hold(idx); //hold message queue // todo: temp disabled
        //sliding = idx;
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
            $div.find(".btn-number[data-type='status']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
}

function changeEvohomeControllerStatus(block, status) {
    var idx=block.idx;
    var hasPassword = block.password;
    if (!Dashticz.promptPassword(hasPassword)) {
        getEvohomeControllerBlock(block);
        return;
    }

    Domoticz.syncRequest(idx, 'type=command&param=switchmodal&idx=' + idx + '&status=' + status + '&action=1&used=true', true)
        .then(function () {
//            var device = Domoticz.getAllDevices()[idx];
            block.device.Status=status;
//            device.Status = status;
            getEvohomeControllerBlock(block);
        })
}

function getEvohomeHotWaterBlock(block) {
    var device=block.device;
    var idx=block.idx;
    var temp = device.Temp + _TEMP_SYMBOL;
    var state = device.State;
    var status = device.Status;
    var name = device['Name'];
    if (titleAndValueSwitch(block)) {
        var tmp = temp
        temp = name; 
        name = tmp;
    }

    var fa_status = (status == 'TemporaryOverride') ? 'fas fa-stopwatch' : 'far fa-calendar-alt';

    var untilOrLastUpdate = (status == 'Auto' || status == 'TemporaryOverride') ? 'Until ' + moment(device['Until']).format('HH:mm') : moment(device['LastUpdate']).format(settings['timeformat']);

    var html = '';
    html += '<div class="col-button1">';
    html += '	<div class="up">';
    html += '		<a href="javascript:void(0)" class="btn btn-number plus" data-type="on" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-toggle-' + state.toLowerCase() + ' fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '</div>';

    html += iconORimage(block, '', 'hot_water_on.png', 'on icon iconheating', '', '2');
    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + name + '</div>';
    html += '	<div>';
    html += '		<span class="state input-number">' + state + '</span>';
    html += '		<span class="hwtemp input-number" data-state"' + state + '" data-temp="' + temp + '">&nbsp;<i class="' + fa_status + ' small_fa">&nbsp;</i>&nbsp;' + temp + '</span>';
    html += '	</div>';
    html += '	<span class="lastupdate">' + untilOrLastUpdate + '</span>';
    html += '</div>';

    var $div=block.$mountPoint.find('.mh');
    $div.html(html);

//    if (typeof (addedThermostat[idx]) === 'undefined') {
        $div.find('.btn-number').on("click", function () {
            //sliding = idx;
            Domoticz.hold(idx); //hold message queue
            state = (state == 'Off') ? 'On' : 'Off';
            switchEvoHotWater(block, state, state == 'On');
        });
//        addedThermostat[idx] = true;
//    }
    return [html, false];
}

function switchEvoHotWater(block, state, override) {

    var idx=block.idx;
    var mode = override ? '&mode=TemporaryOverride&until=' + moment().add(settings['evohome_boost_hw'], 'minutes').toISOString() : '&mode=Auto';
    /*    Domoticz.hold(idx); //hold message queue
        //sliding = idx;

        $.ajax({
            url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=setused&idx=' + idx + '&setpoint=60&state=' + state + mode + '&used=true&jsoncallback=?',
            type: 'GET',
            contentType: 'application/json',
            dataType: 'jsonp',
            success: function () {
                Domoticz.release(idx); //release message queue
                //sliding = false;
                getEvohomeHotWaterBlock(Domoticz.getAllDevices()[idx], idx);
            }
        });*/
    var hasPassword = block.password;
    if (!Dashticz.promptPassword(hasPassword)) {
        getEvohomeHotWaterBlock(block);
        return;
    }

    
    Domoticz.syncRequest(idx, 'type=setused&idx=' + idx + '&setpoint=60&state=' + state + mode + '&used=true', true)
        .then(function () {
            getEvohomeHotWaterBlock(block);
        })
}

//# sourceURL=js/thermostat.js