<span style="display:inline-flex;align-items: baseline;">
    <img src="{{flag}}.png" class="flag" style="height: 13px;">{{country}}:&nbsp; 
    {{#if showConfirmed}}<div style="color:white;"><i class="fas fa-hospital fx" style="color:{{color}};">&nbsp;</i>{{confirmed}}&nbsp;</div>{{/if}}
    {{#if showDeaths}}<div style="color:white;"><i class="fas fa-skull-crossbones fx" style="color:{{color}};">&nbsp;</i>{{deaths}}&nbsp;</div>{{/if}}
    {{#if showRatio}}<div style="color:white;"><i class="fas fa-users fx" style="color:{{color}};">&nbsp;</i>{{ratio}}&nbsp;</div>{{/if}}
    {{#if showDoubling}}<div style="color:white;"><i class="fas fa-angle-double-up fx" style="color:{{color}};">&nbsp;</i>{{doubling}}&nbsp;</div>{{/if}}
    {{#if showDailyConfirmed}}<div style="color:white;"><i class="fas fa-user-clock" style="color:{{color}};">&nbsp;</i>{{dailyconfirmed}}&nbsp;</div>{{/if}}
    {{#if showDailyDeaths}}<div style="color:white;"><i class="fas fa-user-times fx" style="color:{{color}};">&nbsp;</i>{{dailydeaths}}&nbsp;</div>{{/if}}
</span>