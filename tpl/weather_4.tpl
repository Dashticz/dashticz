{{#if showCurrent}}
<div class="weathercurrent">
        <div class="icon" data-icon="{{current.icon}}"></div>
        <div class="temp">{{current.temp}}</div>
        <div class="cityholder">
            <div class="city">{{current.city}}</div>
        </div>
</div>
{{/if}}

{{#if showDetails}}
<div class="weatherdetails">
    <div class="feels">Feels: {{current.feels}}</div>
    <div class="max">Max: {{current.max}}</div>
    <div class="min">Min: {{current.min}}</div>
    <div class="rain">{{current.rain}} mm</div>
    <div class="humidity">Hum: {{current.humidity}}%</div>
    <div class="pressure">{{current.pressure}} hPa</div>
    <div class="windspeed">{{current.wind.speed}}</div>
    {{#if showGust}}
        <div class="windgust">Gust: {{current.wind.gust}}</div>
    {{/if}}
    <div class="winddirection">{{current.wind.direction}}</div>
    {{#unless showGust}}
        <div></div>
    {{/unless}}
</div>
{{/if}}

{{#if showDaily}}
<div class="weatherforecast" style="font-size: {{dailyScale}}%">    
    {{#each dailyForecast as | day | }}
    <div class="weatherday">
        <div class="day">{{day.day}}</div>
        <div class="icon" data-icon="{{day.icon}}"></div>
        {{#if ../showDescription}}
        <div class="description"> {{day.description}}</div>
        {{/if}}
        <div class="max">{{day.max}}</div> 
        {{#if ../showMin}}
        <div class="min">{{day.min}}</div>
        {{/if}}
        {{#if ../showRain}}
        <div class="rain">{{day.rain}}&nbsp;mm</div>
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

{{#if showHourly}}
<div class="weatherforecast" style="font-size: {{hourlyScale}}%">    
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
