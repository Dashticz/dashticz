<thead style="border-color:{{icon}};">
    {{#each tlines as |title|}}
    <tr>
        <th colspan="3">
            {{#if ../isdate}}
            <i class="far fa-clock" style="color:{{icon}};"></i>
            {{moment date=title format=../fmt}}
            {{else}}
            <i class="fas fa-info-circle" style="color:{{icon}};"></i>
            {{title}}
            {{/if}}
        </th>
    </tr>
    {{/each}}
</thead>
<tbody>
    {{#each vals as |item|}}
    <tr {{#ifEq item.key "Total"}}class="total" {{/ifEq}}>
        <td>
            {{#if item.add}}
            {{#ifNe item.key "Total"}}
            <i class="fas fa-{{item.fas}} chartjs-tooltip-fa" style="color:{{item.col}};"></i>
            {{/ifNe}}
            {{else}}
            {{#ifNe item.key "Total"}}
            <span class="chartjs-tooltip-key" style="background:{{item.col}};"></span>
            {{/ifNe}}
            {{#ifEq item.key "Total"}}
            <i class="fas fa-{{item.fas}} chartjs-tooltip-fa" style="color:{{item.col}};"></i>
            {{/ifEq}}
            {{/if}}
        </td>
        <td class="popup_{{item.key}}">
            {{item.key}}
        </td>
        <td class="value">
            {{item.val}}
        </td>
    </tr>
    {{/each}}
</tbody>