{{#*inline "dialitems"}}
    <div class="extra  {{animation}} {{#unless showvalue}}novalue{{/unless}}">
        {{#each info}}
        <div class="item {{this.addClass}} {{this.deviceStatus}}">
            &nbsp;
            {{#if this.label}}
                <div class="itemlabel">{{this.label}}</div>
            {{/if}}
            <div class="dataunit">
                {{#unless this.image}}
                <i class="{{this.icon}}"></i>
                {{else}}
                <img src="img/{{this.image}}">
                {{/unless}}                    
                <span class="data">{{this.data}}</span>
                <span class="unit">{{this.unit}}</span>
            </div>
            &nbsp;
        </div>
        {{/each}}             
    </div>
    {{#if lastupdate}} 
        <span class="info {{#unless hasSetpoint}}nosetpoint{{/unless}} {{animation}}">{{lastupdate}}</span>
    {{/if}}
{{/inline}}

{{#*inline "dialdevice"}}
    <span class="device {{animation}}" style="color:{{color}};">{{name}}</span>
{{/inline}}

<div class="dial {{size}} {{#if fixed}}fixed{{/if}} {{addclass}} {{deviceStatus}}" data-device="{{name}}" data-min="{{min}}" data-max="{{max}}"
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
                        {{> dialdevice}}
                        {{#if showvalue}}
                            <i class="{{iconSwitch}} icon-off"></i>
                        {{/if}}
                        {{> dialitems}}
                </div>
            </div>

            {{else}}
            <div class="dial-display">
                {{> dialdevice}}
                {{#if showvalue}}
                    <div class="value-unit">
                        <span class="value" style="--dial-color: {{color}};">{{valueformat}}</span>
                        {{#if showunit}}
                            <span class="unit" style="--dial-color: {{color}};">{{unitvalue}}</span>
                        {{/if}}
                    </div>
                {{/if}}
                {{> dialitems}}
            </div>
            {{/if}}
        </div>
    </div>
</div>