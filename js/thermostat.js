// eslint-disable-next-line no-unused-vars
/* global sliding:writable switchThermostat number_format _TEMP_SYMBOL */
/* from bundle.js */
/* global moment */
/* from main.js */
/* global usrEnc pwdEnc */
/* from settings.js */
/* global settings */
/* from blocks.js */
/* global iconORimage titleAndValueSwitch showUpdateInformation */
/* from domoticz-api.js*/
/* global Domoticz */

// eslint-disable-next-line no-unused-vars
function addThermostatFunctions(thermelement) {
    $(document).on("click", (thermelement + ' .btn-number'), function () {
        sliding = true;
//        var fieldName = $(this).attr('data-field');
        var type = $(this).attr('data-type');
        var input = $(thermelement + " strong");
        var currentVal = input.text().split('°');
        currentVal = parseFloat(currentVal[0].replace(',', '.'));
        if (!isNaN(currentVal)) {
            var newValue = (type === 'minus') ? currentVal - 0.5 : currentVal + 0.5;
            if (newValue >= input.attr('min') &&
                newValue <= input.attr('max')
            ) {
                input.text(number_format(newValue, 1) + _TEMP_SYMBOL).trigger( "change" );
                switchThermostat(newValue, input);
            }
            if (newValue <= input.attr('min')) {
                $(this).attr('disabled', true);
            }
            if (newValue >= input.attr('max')) {
                $(this).attr('disabled', true);
            }
        } else {
            input.text(0);
        }
    });

    $(thermelement + ' .input-number').on('focusin', function () {
        $(this).data('oldValue', $(this).text());
    });

    $(thermelement + ' .input-number').on('change', function () {
        var minValue = parseFloat($(this).attr('min'));
        var maxValue = parseFloat($(this).attr('max'));
        var valueCurrent = parseFloat($(this).text());

//        var name = $(this).attr('name');
        if (valueCurrent >= minValue) {
            $(thermelement + " .btn-number[data-type='minus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
        if (valueCurrent <= maxValue) {
            $(thermelement + " .btn-number[data-type='plus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
}
var addedThermostat = [];

// eslint-disable-next-line no-unused-vars
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
    this.html += '<strong class="title input-number" min="' + settings['setpoint_min'] + '" max="' + settings['setpoint_max'] + '" data-light="' + device['idx'] + '">' + this.title + '</strong>';
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

function getEvohomeZoneBlock(device, idx) {
    var temp = device.Temp;
    var setpoint = device.SetPoint;
    var status = device.Status;
    var title_temp = temp + _TEMP_SYMBOL;
    var title_setp = setpoint + _TEMP_SYMBOL;
    var value = device['Name'];
    if (titleAndValueSwitch(idx)) {
        var tmp = title_temp
        title_temp = value;
        value = tmp;
    }

    var fa_status = (status == 'TemporaryOverride') ? 'fas fa-stopwatch' : 'far fa-calendar-alt';

    var untilOrLastUpdate = (status == 'Auto' || status == 'TemporaryOverride') ? 'Until ' + moment(device['Until']).format('HH:mm') : moment(device['LastUpdate']).format(settings['timeformat']);

    var html = '';
    html += '<div class="col-button1">';
    html += '	<div class="up">';
    html += '		<a href="javascript:void(0)" class="btn btn-number plus" data-type="plus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-plus fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '	<div class="down">';
    html += '		<a href="javascript:void(0)" class="btn btn-number min" data-type="minus" data-field="quant[' + device['idx'] + ']" onclick="this.blur();">';
    html += '			<em class="fas fa-minus fa-small fa-thermostat"></em>';
    html += '		</a>';
    html += '	</div>';
    html += '</div>';

    html += iconORimage(idx, '', 'heating.png', 'on icon iconheating', '', '2');
    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + value + '</div>';
    html += '	<div>';
    html += '		<span class="state input-number">' + title_temp + '&nbsp;</span>';
    html += '		<span class="setpoint text-grey input-number" min="' + settings['setpoint_min'] + '" max="' + settings['setpoint_max'] + '" data-light="' + device['idx'] + '" data-status="' + status + '" data-setpoint="' + setpoint + '">&nbsp;<i class="' + fa_status + ' small_fa">&nbsp;</i>&nbsp;' + title_setp + '</span>';
    html += '	</div>';
    html += '	<span class="lastupdate">' + untilOrLastUpdate + '</span>';
    html += '</div>';

    $('div.block_' + idx).html(html);

    if (typeof (addedThermostat[idx]) === 'undefined') {
        addEvohomeZoneFunctions('.block_' + idx, idx);
        addedThermostat[idx] = true;
    }
    return [html, false];
}

function addEvohomeZoneFunctions(thermelement, idx) {

    $(document).on("click", (thermelement + ' .btn-number'), function () {

        sliding = idx;
        var device=Domoticz.getAllDevices()[idx];
        if (!device) {
            console.error('Evohome device ' + idx + ' not found.');
            return;
        }
        var type = $(this).attr('data-type');
        var currentVal = device.SetPoint
        //var temp = device.Temp;
        var input = $(thermelement + " .setpoint");

        if (!isNaN(currentVal)) {

            var newValue = (type === 'minus') ? currentVal - 0.5 : currentVal + 0.5;

            if (newValue >= input.attr('min') && newValue <= input.attr('max')) {
                input.html('&nbsp;<i class="fas fa-stopwatch small_fa">&nbsp;</i>' + newValue + _TEMP_SYMBOL).trigger("change");
                switchEvoZone(idx, newValue, true)
            }

            if (newValue <= input.attr('min')) {
                $(this).attr('disabled', true);
            }

            if (newValue >= input.attr('max')) {
                $(this).attr('disabled', true);
            }

        } else {
            input.text(0);
        }
    });

    $(document).on("mouseenter", (thermelement + ' .btn-number'), function () {
        sliding = idx;
    });

    $(document).on("mouseleave", (thermelement + ' .btn-number'), function () {
        sliding = false;
    });

    $(thermelement + ' .input-number').on('focusin', function () {
        $(this).data('oldValue', $(this).text());
    });

    $(thermelement + ' .input-number').on('change', function () {
        var minValue = parseFloat($(this).attr('min'));
        var maxValue = parseFloat($(this).attr('max'));
        var valueCurrent = parseFloat($(this).text());

        if (valueCurrent >= minValue) {
            $(thermelement + " .btn-number[data-type='minus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
        if (valueCurrent <= maxValue) {
            $(thermelement + " .btn-number[data-type='plus']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
    $(document).on("click", (thermelement + ' .setpoint'), function () {
        if ($(this).attr('data-status') == 'TemporaryOverride') {
            switchEvoZone(idx, $(this).attr('data-setpoint'), false);
        }
    });
}

function switchEvoZone(idx, setpoint, override) {

    var mode = override ? '&mode=TemporaryOverride&until=' + moment().add(settings['evohome_boost_zone'], 'minutes').toISOString() : '&mode=Auto';

    sliding = idx;
    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=setused&idx=' + idx + '&setpoint=' + setpoint + mode + '&used=true&jsoncallback=?',
        type: 'GET',
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            sliding = false;
            var device = Domoticz.getAllDevices()[idx];
            device.SetPoint = setpoint;
            getEvohomeZoneBlock(device, idx);
        }
    });
}

function getEvohomeControllerBlock(device, idx) {

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

    if (titleAndValueSwitch(idx)) {
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

    html += iconORimage(idx, '', 'evohome.png', 'on icon iconheating', '', '2');

    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + value + '</div>';
    html += '	<div>';
    html += '		<span class="state">Mode: </span>';
    html += '		<span class="state input-status" status="' + settings['evohome_status'] + '" data-light="' + device['idx'] + '">' + status + '</span>';
    html += '		<select class="evoSelect select hide"><option value="" disabled selected>Select</option></select>';
    html += '	<div>';
    html += '	<span class="lastupdate">' + moment(device['LastUpdate']).format(settings['timeformat']) + '</span>';
    html += '</div>';

    $('div.block_' + idx).html(html);
    $.each(evoOptions, function (val, text) {
        $('.block_' + idx + ' .evoSelect').append(
            $('<option></option>').val(val).html(text)
        );
    });
    $('.block_' + idx + ' .evoSelect').blur(function () {
        sliding = false;
        $('.block_' + idx + ' title').toggleClass('hide');
        $('.evoSelect').toggleClass('hide');
    });
    $('.block_' + idx + ' .evoSelect').on('change', function () {
        var newValue = this.value;
        var newTitle = $("#evoSelect option:selected").text(); //bug? newTitle never used
        changeEvohomeControllerStatus(idx, newValue);
        $('.block_' + idx + ' input-status').text(newValue);
        $('.block_' + idx + ' input-status').toggleClass('hide');
        $('.evoSelect').toggleClass('hide');
    })

    if (typeof (addedThermostat[idx]) === 'undefined') {
        addEvohomeControllerFunctions('.block_' + idx, idx);
        addedThermostat[idx] = true;
    }
    return [html, false];
}

function addEvohomeControllerFunctions(thermelement, idx) {
    $(document).on("click", (thermelement + ' .btn-number'), function () {
        sliding = idx;
        $('.evoSelect').toggleClass('hide');
        $(thermelement + ' .input-status').toggleClass('hide');
    });
    $(thermelement + ' .input-status').on('focusin', function () {
        $(this).data('oldValue', $(this).text());
    });

    $(thermelement + ' .input-status').on('change', function () {
        var status = $(this).attr('status');
        var valueCurrent = $(this).text();

        if (valueCurrent != status) {
            $(thermelement + " .btn-number[data-type='status']").removeAttr('disabled')
        } else {
            $(this).val($(this).data('oldValue'));
        }
    });
}

function changeEvohomeControllerStatus(idx, status) {

    sliding = idx;

    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=command&param=switchmodal&idx=' + idx + '&status=' + status + '&action=1&used=true&jsoncallback=?',
        type: 'GET',
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            sliding = false;
            var device = Domoticz.getAllDevices()[idx];
            device.Status = status;
            getEvohomeControllerBlock(device, idx);
        }
    });
}

function getEvohomeHotWaterBlock(device, idx) {
    var temp = device.Temp + _TEMP_SYMBOL;
    var state = device.State;
    var status = device.Status;
    var name = device['Name'];
    if (titleAndValueSwitch(idx)) {
        var tmp = temp
        temp = value; //bug: value is not defined
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

    html += iconORimage(idx, '', 'hot_water_on.png', 'on icon iconheating', '', '2');
    html += '<div class="col-xs-8 col-data right1col">';
    html += '	<div class="title">' + name + '</div>';
    html += '	<div>';
    html += '		<span class="state input-number">' + state + '</span>';
    html += '		<span class="hwtemp input-number" data-state"' + state + '" data-temp="' + temp + '">&nbsp;<i class="' + fa_status + ' small_fa">&nbsp;</i>&nbsp;' + temp + '</span>';
    html += '	</div>';
    html += '	<span class="lastupdate">' + untilOrLastUpdate + '</span>';
    html += '</div>';

    $('div.block_' + idx).html(html);

    if (typeof (addedThermostat[idx]) === 'undefined') {
        $(document).on("click", ('.block_' + idx + ' .btn-number'), function () {
            sliding = idx;
            state = (state == 'Off') ? 'On' : 'Off';
            switchEvoHotWater(idx, state, state == 'On');
        });
        addedThermostat[idx] = true;
    }
    return [html, false];
}

function switchEvoHotWater(idx, state, override) {

    var mode = override ? '&mode=TemporaryOverride&until=' + moment().add(settings['evohome_boost_hw'], 'minutes').toISOString() : '&mode=Auto';
    sliding = idx;

    $.ajax({
        url: settings['domoticz_ip'] + '/json.htm?username=' + usrEnc + '&password=' + pwdEnc + '&type=setused&idx=' + idx + '&setpoint=60&state=' + state + mode + '&used=true&jsoncallback=?',
        type: 'GET',
        contentType: 'application/json',
        dataType: 'jsonp',
        success: function () {
            sliding = false;
            getEvohomeHotWaterBlock(Domoticz.getAllDevices()[idx], idx);
        }
    });
}
