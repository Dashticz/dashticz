<div class="dial {{size}} {{#if fixed}}fixed{{/if}}" data-device="{{name}}" data-min="{{min}}" data-max="{{max}}"
    data-type="{{type}}" data-value="{{value}}" data-setpoint="{{setpoint}}" data-status="{{status}}" 
    data-until="{{until}}" data-unit="{{unit}}" data-info="{{lastupdate}}" style="font-size: {{fontsize}}px;--dial-color: {{rgba}};">
    <div class="slice {{#if split}}{{slice}}{{/if}}">
        <div class="bar primary {{class}}" style="--dial-color:{{color}};"></div>
        <div class="fill primary {{class}}" style="--dial-color:{{color}};"></div>
    </div>
    <div class="dial-container">         
        <div id="face{{id}}" class="dial-face">
            <div class="dial-numbers">
                {{#if numbers}}       
                {{#each numbers as |number|}}
                <span class="number seg_{{../range}}_{{../numbers.length}}_{{@index}}">{{number}}</span>
                {{/each}}
                {{/if}}
            </div>
        </div>        
        {{#unless fixed}}
        <div class="draggable">
            <div class="dial-needle" style="--dial-color: {{color}};--needle-length: {{needleL}}px;--needle-width: {{needleW}}px;"></div>
        </div>
        {{/unless}}
        <div id="{{id}}" class="dial-center {{on}}" style="--dial-rgba: {{rgba}};{{#if onoff}}background: transparent; box-shadow: none;{{/if}}">
            {{#if controller}}
            <div class="dial-menu">   
                <ul class="status" style="--dial-color: {{color}};">
                   {{#each options as |opt|}}
                    <li data-val="{{opt.val}}">{{opt.text}}</li>
                    {{/each}}
                </ul>  
            </div>
            {{else if onoff}}
            <div class="dial-switch">   
                <input type="checkbox" {{checked}}>
                <div class="switch-face">
                    <div class="device  {{addclass}}" style="color:{{color}}">{{name}}</div>
                    <i class="fas fa-power-off icon-off" style=""color:{{color}}"></i>
                    {{#if lastupdate}} 
                    <span class="info nosetpoint {{addclass}}">{{lastupdate}}</span>
                    {{/if}}
                </div>
            </div>
            {{else}}
            <div class="dial-display">
                <span class="device {{addclass}}" style="color:{{color}};">{{name}}</span>
                <div class="value-unit">
                    <span class="value" style="--dial-color: {{color}};">{{valueformat}}</span>
                    {{#if showunit}}
                    <span class="unit" style="--dial-color: {{color}};">{{unitvalue}}</span>
                    {{/if}}
                </div>
                {{#if lastupdate}} 
                <span class="info {{#unless hasSetpoint}}nosetpoint{{/unless}} {{addclass}}">{{lastupdate}}</span>
                {{/if}}
                {{#if hasSetpoint}}
                <div class="extra  {{addclass}}">
                    {{#each info}}
                    <div>
                        {{#unless this.image}}
                        <i class="{{this.icon}}">&nbsp;</i>
                        {{else}}
                        <img src="img/{{this.image}}">
                        {{/unless}}                    
                        <span class="data">{{this.data}}</span>
                        <span class="unit">{{this.unit}}</span>
                    </div>
                    {{/each}}             
                </div>
                {{/if}}
            </div>
            {{/if}}
        </div>
    </div>
</div>