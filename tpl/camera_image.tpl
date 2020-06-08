{{#if div}}
<div data-id="camera_{{index}}" class="transbg col-xs-6 camera dt_block ">
    {{/if}}
    <img class="{{mount}}_camImage" src="{{image}}" data-id="{{id}}" data-mjpeg="{{mjpeg}}"
        style="border:0px;height:{{height}}px;width:100%;">
    {{#if div}}
</div>
{{/if}}