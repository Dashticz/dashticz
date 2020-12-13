{{#each items }}
    <div class="{{this.rowClass}}" {{{this.color}}}>
        <span class="trashtype">{{this.trashType}}</span>
        <span class="trashsep">{{{../trashSep}}}</span>
        <span class="trashdate">{{this.trashDate}}</span>
    </div>
{{/each}}
