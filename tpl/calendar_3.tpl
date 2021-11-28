<div class="items">
  {{#each events as | items |}}
    {{#ifLe @index ../maxitems}}
      {{#each items as | item |}}
        <div class="event {{item.addClass}}" style="color:{{item.color}};">
          <span class="eventdate {{item.addClass}}">
            {{moment item.start input="X" format=../../df}} - 
          </span>
          <span class="description {{item.addClass}}">
            {{item.title}}
          </span>
        </div>
      {{/each}}
    {{/ifLe}}
  {{else}}
    <div class="agenda-empty">
      {{emptyText}}
    </div>
  {{/each}}
</div>