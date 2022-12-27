{{#if showCurrent}}
<div class="weathercurrent">
        <div class="icon" data-icon="{{current.icon}}"></div>
        <div class="temp">{{current.temp}}</div>
        <div class="cityholder">
            <div class="city">{{current.city}}</div>
            {{#if showDescription}}
                <div class="description">{{current.description}}</div> 
            {{/if}}
        </div>
</div>
{{/if}}

{{#if showDetails}}
<div class="weatherdetails">
    {{#if showForecast}}
        <div class="forecast">{{current.forecast}}</div>
    {{/if}}
    <div class="feels">Feels: {{current.feels}}</div>
    <div class="max">Max: {{current.max}}</div>
    <div class="min">Min: {{current.min}}</div>
    <div class="humidity">Hum: {{current.humidity}}%</div>
    <div class="pressure">{{current.pressure}} hPa</div>
    <div> </div>
    <div class="windspeed">{{current.wind.speed}}</div>
    <div class="winddirection">{{current.wind.direction}}</div>
    <div> </div>

</div>
{{/if}}

{{#if showDaily}}
<div class="weatherforecast" style="font-size: {{dailyScale}}%">    
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
</div>
{{/if}}

