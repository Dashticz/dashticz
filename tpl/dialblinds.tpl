

<div class="dial {{size}} {{#if fixed}}fixed{{/if}} {{addclass}} {{deviceStatus}}" data-device="{{name}}" data-min="{{min}}" data-max="{{max}}"
    data-type="{{type}}" data-value="{{value}}" data-setpoint="{{setpoint}}" data-status="{{status}}" 
    data-until="{{until}}" data-unit="{{unit}}" data-info="{{lastupdate}}" style="font-size: {{fontsize}}px;--dial-color: {{rgba}};">
    <div class="dial-container">         
        <div id="face{{id}}" class="dial-face">
        </div>        
        <div id="{{id}}" class="dial-center {{on}}" style="--dial-rgba: {{rgba}};{{#if onoff}}background: transparent; box-shadow: none;{{/if}}">
                                <div class="blinds">   
                            <div class="dialbtn up">
                                <div class="text">
                                    {{textOpen}}
                                </div>
                            </div>
                            <div class="dialbtn middle">
                                <span class="text" style="color:{{color}};">{{name}}</span>
                                {{#if showvalue}}
                                    <div class="text value">{{value}}</div>
                                {{/if}}
                            </div>
                            <div class="dialbtn down">
                                <div class="text">
                                    {{textClose}}
                                </div>
                            </div>
                        </div>

        </div>

    </div>
</div>
