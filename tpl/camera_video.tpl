<div class="cam-container">
    <img class="stream" src="{{src}}">
    <div class="cam-tray shut">
        {{#each urls}}
        <img class="cam-tray-img" src="{{this.image}}{{../dt}}" data-video="{{this.video}}" data-mjpeg="{{this.mjpeg}}" data-refresh="{{refresh}}">
        {{/each}}
    </div>
    <div class="handle">
        <i class="fas fa-angle-double-up"></i>
    </div>
</div>