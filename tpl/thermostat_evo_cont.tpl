<div class="col-button1">
	<div class="up">
		<a href="javascript:void(0)" class="btn btn-number plus" data-type="status" data-field="quant[{{idx}}]" onclick="this.blur();">
			<em class="fas fa-cog fa-small fa-thermostat"></em>
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
		<span class="state">Mode: </span>
		<span class="state input-status" data-light="{{idx}}">{{status}}</span>
		<select class="evoSelect select hide">
			<option value="" disabled selected>Select</option>
			<option value="Auto">Auto</option>
			<option value="Away">Away</option>
			<option value="Custom">Custom</option>
			<option value="DayOff">Day Off</option>
			<option value="AutoWithEco">Economy</option>					
			<option value="HeatingOff">Off</option>
		</select>
	<div>
	<span class="lastupdate">{{update}}</span>
</div>