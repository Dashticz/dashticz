<div class="dial-bar-widget {{size}} {{addclass}} {{deviceStatus}}" data-device="{{name}}" data-min="{{min}}" data-max="{{max}}" style="--dial-color: {{rgba}};">
    <div class="dial-bar-container">
        {{#if name}}
        <div class="dial-bar-title dt_title">{{name}}</div>
        {{/if}}
        <div class="dial-bar">
            {{#each barSegments}}
            <div class="dial-bar-segment" data-level="{{this}}"></div>
            {{/each}}
        </div>
        {{#if showvalue}}
        <div class="dial-bar-value">{{valueformat}}{{#if showunit}}{{unitvalue}}{{/if}}</div>
        {{/if}}
    </div>
</div>
