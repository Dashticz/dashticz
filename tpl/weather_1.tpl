{{#each hourlyForecast as | day | }}
<div class="weatherday">
    <div class="day">{{day.day}}</div>
    <div class="time">{{day.time}}</div>
    <div class="icon" data-icon="{{day.icon}}"></div>
    {{#if ../showDescription}}
    <div class="description"> {{day.description}}</div>
    {{/if}}
    <div class="temp">{{day.temp}}</div> 
    {{#if ../showRain}}
    <div class="rain">{{day.rain}}&nbsp;mm</div>
    {{/if}}
</div>
{{/each}}
