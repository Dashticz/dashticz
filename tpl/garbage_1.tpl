<table>
	{{#each items as | item |}}
		  <tr class="{{item.rowClass}}" {{{item.color}}}>
              <td class="trashtype">{{item.trashType}}</td>
              <td class="trashsep">{{../trashSep}}</td>
              <td class="trashdate">{{item.trashDate}}</td>
          </tr>
	{{/each}}
</table>