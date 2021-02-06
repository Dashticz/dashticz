<div class="items">
  {{#each events as | items |}}
    {{#ifLe @index ../maxitems}}
      {{#each items as | item |}}
        <div style="color:{{item.color}};">
          {{moment item.start input="X" format=../../df}} - 
          {{item.title}}
        </div>
      {{/each}}
    {{/ifLe}}
  {{else}}
    <div class="agenda-empty">
      {{emptyText}}
    </div>
  {{/each}}
</div>