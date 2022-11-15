{{#each dailyForecast as | day | }}
<div class="weatherday">
    <div class="day">{{day.day}}</div>
    <div class="icon" data-icon="{{day.icon}}"></div>
    <div class="max">{{day.max}}</div> 
    {{#if ../showMin}}
    <div class="min">{{day.min}}</div>
    {{/if}}
    {{#if ../showRain}}
    <div class="rain">Hum: {{day.rain}}</div>
    {{/if}}
    {{#if ../showWind}}
    <div>
        <i class="{{day.wind.icon}}"></i>
    </div>
    <div class="wind">{{day.wind.directionShort}} {{day.wind.speed}}</div>
    {{/if}}
</div>
{{/each}}
