<!-- as table
<table>
    <tr>
        <td>Aantal files: </td>
        <td>{{numberOfJams}}</td>
    </tr>
    <tr>
        <td>File kilometers: </td>
        <td>{{totalLengthOfJams}} km</td>
    </tr>
    <tr>
        <td>Aantal meldingen: </td>
        <td>{{numberOfIncidents}}</td>
    </tr>
</table>
-->

<div>{{numberOfJams}} files, {{totalLengthOfJams}} km, {{numberOfIncidents}} meldingen</div>
{{#if show_lastupdate}}<div class="lastupdate">{{lastupdate}}</div>{{/if}}