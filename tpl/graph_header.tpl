<span>
    {{#if show}}
        {{#if mg}}
            {{#if cvs}}
                <i class="fas fa-equals" style="color:{{icon}}">&nbsp;</i>
                {{#each cvs}}
                    {{this}}<span style="color:{{icon}}">{{#unless @last}} | </span>{{/unless}}
                {{/each}}
            {{/if}}
        {{else}}
            {{#if cv}}
                &nbsp;<i class="fas fa-equals" style="color:{{icon}}">&nbsp;</i>&nbsp;
                {{cv}}
            {{/if}}
        {{/if}}
    {{/if}}
</span>