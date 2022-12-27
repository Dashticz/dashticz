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
