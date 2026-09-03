{{#if div}}
<div data-id="camera_{{index}}" class="transbg col-xs-6 camera dt_block ">
    {{/if}}
    <img class="{{mount}}_camImage dt-camera-thumb" src="{{image}}" data-id="{{id}}" data-mjpeg="{{mjpeg}}"
        style="border:0px;width:100%;{{#if height}}height:{{height}}px;{{else}}position:absolute;top:0;left:0;right:0;bottom:0;height:100%;{{/if}}">
    {{#if div}}
</div>
{{/if}}
