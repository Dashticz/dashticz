// eslint-disable-next-line no-unused-vars
/* global sliding:writable switchThermostat number_format _TEMP_SYMBOL */

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

function getThermostatBlock(device, idx) {
    console.log(device);
    debugger;
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
