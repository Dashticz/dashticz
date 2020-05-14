<div id="" class="dial {{size}} {{#if controller}}fixed{{/if}}" data-device="{{name}}" data-min="{{min}}" data-max="{{max}}"
    data-type="{{type}}" data-value="{{value}}" data-setpoint="{{setpoint}}" data-status="{{status}}" 
    data-until="{{until}}" data-unit="{{unit}}" data-info="{{lastupdate}}">
    <div class="slice">
        <div class="bar primary" style="--dial-color:{{color}};"></div>
        <div class="fill primary" style="--dial-color:{{color}};"></div>
    </div>
    <div class="dial-container">
        <div class="dial-face"></div>
        {{#unless controller}}
        <div class="draggable">
            <div class="dial-needle" style="--dial-color: {{color}};"></div>
        </div>
        {{/unless}}
        <div id="{{id}}" class="dial-center {{on}}" style="--dial-rgba: {{rgba}};">
            {{#if controller}}
            <div class="dial-menu">   
                <select class="evostatus" style="--dial-color: {{color}};" multiple>
                    <option value="Auto">Auto</option>
                    <option value="AutoWithEco">Economy</option>
                    <option value="Away">Away</option>
                    <option value="Custom">Custom</option>
                    <option value="DayOff">Day Off</option>
                    <option value="HeatingOff">Off</option>
                    </select>   
            </div>
            {{else}}
            <div class="dial-display">
                <span class="device" style="color:{{color}};">{{name}}</span>
                <span class="value" style="--dial-color: {{color}};">{{value}}</span>
                <span class="info {{#unless hasSetpoint}}nosetpoint{{/unless}}">{{lastupdate}}</span>
                {{#if hasSetpoint}}
                <span class="setpoint vertical-center">
                    {{#if override}}                    
                    <i class="fas fa-stopwatch small_fa">&nbsp;</i>
                    {{else}}
                    <i class="fas fa-calendar-alt">&nbsp;</i>
                    {{/if}}
                    <span>{{setpoint}}{{unit}}</span>
                </span>
                {{/if}}
            </div>
            {{/if}}
        </div>
    </div>
</div>