<table>
{{#each departures }}
    <tr>
        <td>
            {{this.time}}
        </td>
        <td>
            {{#if this.delay}}
            <span class="delay">
                +{{this.delay}}
            </span>    
            {{/if}}
        </td>
        <td><div>
                <span class="destination">{{this.destination}}</span>
                <span class="transporttype">{{this.transportType}}</span>
            </div>
            {{#if ../block.show_via}}
              <div class="via">{{this.via}}</div>
            {{/if}}
            {{#each remarks }}
            <div>{{this}}</div>
            {{/each}}

        </td>
        <td class="platform">
            {{#if this.platform}}
            {{../lang.platform}} {{this.platform}}
            {{/if}}
        </td>
    </tr>
{{/each}}
</table>