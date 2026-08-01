<table>
{{#each items as | item |}}
    {{#with item}}
        <tr class="xmltv-row" data-url="">
            <td class="xmltv-time">{{starttime}}{{#if endtime}} - {{endtime}}{{/if}}</td>
            <td class="xmltv-sep">{{../separator}}</td>
            <td class="xmltv-channel">{{channel}}</td>
            <td class="xmltv-sep">{{../separator}}</td>
            <td class="xmltv-title">{{title}}{{#if subtitle}} <span class="xmltv-subtitle">— {{subtitle}}</span>{{/if}}</td>
        </tr>
    {{/with}}
{{/each}}
</table>
