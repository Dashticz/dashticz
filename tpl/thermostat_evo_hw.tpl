<div class="col-button1">
    <div class="up">
        <a href="javascript:void(0)" class="btn btn-number plus" data-type="on" data-field="quant[{{idx}}]"
            onclick="this.blur();">
            <em class="fas fa-toggle-{{toggle}} fa-small fa-thermostat"></em>
        </a>
    </div>
</div>
<div class="col-xs-2 col-icon">
    <img src="img/{{mImage}}" class="on icon iconheating">
    <em class="{{mIcon}} on icon iconheating"></em>
</div>
<div class="col-xs-8 col-data right1col">
    <div class="title">{{name}}</div>
    <div>
        <span class="state input-number">{{state}}</span>
        <span class="hwtemp input-number" data-state="{{state}}" data-temp="{{temp}}">&nbsp;<i
                class="{{fa}} small_fa">&nbsp;</i>&nbsp;{{temp}}</span>
    </div>
    <span class="lastupdate">{{update}}</span>
</div>