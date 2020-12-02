{{#each items }}
    <div class="{{this.rowClass}}" {{{this.color}}}>
        {{this.trashType}}{{../trashSep}}{{this.trashDate}}
    </div>
{{/each}}
