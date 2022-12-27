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
    <div class="windgust">Gust: {{current.wind.gust}}</div>
    <div class="winddirection">{{current.wind.direction}}</div>
</div>
{{/if}}
