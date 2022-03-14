<div class="items">
  {{#each events as | items |}}
    {{#ifLe @index ../maxitems}}
      {{#each items as | item |}}
        <div style="color:{{item.color}};" class="event {{item.addClass}}">
          <span class="eventdate {{item.addClass}}">
            {{moment item.start input="X" format=../../df}} - 
          </span>
          <span class="eventtime {{item.addClass}}">
            {{#unless item.allDay}}
              {{moment item.start input="X" format=../../tf}}
              {{#unless ../../startonly}}
                -{{#if item.multiday}}{{moment item.end input="X" format=../../df}} {{/if}}{{moment item.end input="X" format=../../tf}} - 
              {{/unless}}
            {{else}}
              {{../../entire}} - 
            {{/unless}}
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