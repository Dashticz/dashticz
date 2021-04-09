<table>
{{#each items as | item |}}
    {{#with item}}
        <tr class="tvrow" data-id="{{db_id}}">
            <td class="tvtime">{{starttime}} - {{endtime}}</td>
            <td class="tvsep">{{../separator}}</td>
            <td class="tvtitle">{{title}}</td>
        </tr>
    {{/with}}
{{/each}}
</table>
