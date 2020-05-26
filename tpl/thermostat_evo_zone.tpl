<div class="col-button1" data-setpoint="{{setpoint}}" data-temp="{{temp}}">
    <div class="up">
        <a href="javascript:void(0)" class="btn btn-number plus" data-type="plus" data-field="quant[{{idx}}]"
            onclick="this.blur();">
            <em class="fas fa-plus fa-small fa-thermostat"></em>
        </a>
    </div>
    <div class="down">
        <a href="javascript:void(0)" class="btn btn-number min" data-type="minus" data-field="quant[{{idx}}]"
            onclick="this.blur();">
            <em class="fas fa-minus fa-small fa-thermostat"></em>
        </a>
    </div>
</div>
<div class="col-xs-2 col-icon">
    <img src="img/{{mImage}}" class="on icon iconheating">
    <em class="{{mIcon}} on icon iconheating"></em>
</div>

<div class="col-xs-8 col-data right1col">
    <div class="title">{{tTemp}}</div>
    <div style="white-space: nowrap;">
        <span class="state input-number">{{value}}&nbsp;</span>
        <span class="setpoint text-grey input-number" min="{{min}}" max="{{max}}" data-light="{{idx}}"
            data-status="{{status}}" data-setpoint="{{setpoint}}">
            <i class="{{fa}} small_fa">&nbsp;</i>{{tSetP}}
        </span>
    </div>
    <span class="lastupdate">{{update}}</span>
</div>