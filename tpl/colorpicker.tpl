<div class="modal colorpicker" id="{{id}}" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
      <div class="modal-container">
        <div class="modal-content">
        <div class="modal-header">
            <div class="modal-title dt_title">{{title}}</div>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
            <span aria-hidden="true">&times;</span>
            </button>
        </div>
        <div class="modal-body">
          <div class="cp-buttons btn-group-toggle" data-toggle="buttons" role="group">
            {{#each headerButtons}}
              {{#with this}}
                <label class="btn btn-default align-middle {{#ifEq ../mode @key }}active{{/ifEq}}">
                    {{#if text}}{{{text}}}{{/if}}
                    <input type="radio" data-item="{{@key}}" name="options">
                      {{#if img}}<img src="{{img}}"></img>{{/if}}
                    </input>
                </label>
              {{/with}}
            {{/each}}  
          </div>
          <div class="cp-iro">
            {{#each iro}}
              {{#with this}}
                <div class="{{@key}}">
                  <div class="iro" style="white-space:nowrap"></div>
                  <div class="text-center">{{text}}</div>            
                </div>
              {{/with}}
            {{/each}}
            <div class="cp-buttonsOnOff">
              <div class="btn-group-vertical" data-toggle="buttons" role="group">
                {{#each switchButtons}}
                  {{#with this}}
                    <label class="btn btn-light-blue btn-block {{#if active}}active{{/if}}">
                        <input type="radio" data-item="{{@key}}" name="options">
                          {{#if img}}<img src="{{img}}"></img>{{/if}}
                          {{#if text}}{{text}}{{/if}}
                    </label>
                  {{/with}}
                {{/each}}  
              </div>
            </div>
            </div>
        </div>
    </div>