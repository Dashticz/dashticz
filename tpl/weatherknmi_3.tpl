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
