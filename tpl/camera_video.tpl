<div id="camCarousel" class="cam-container carousel slide" data-ride="carousel" data-interval="{{slide}}">
    <ol class="carousel-indicators">
        {{#each urls}}
        <li id="ind{{@index}}" data-target="#camCarousel" data-slide-to="{{@index}}"></li>
        {{/each}}
    </ol>
    <div class="carousel-inner">
        {{#each urls}}
        <div class="item">
            <img id="cam{{@index}}" class="stream" src="{{this.imageUrl}}" data-mjpeg="{{this.mjpeg}}">
            <div class="cam-caption">
                <h3>{{this.title}}</h3>
            </div>
        </div>
        {{/each}}
    </div>
    <!-- Left and right controls -->
    <a class="left carousel-control" href="#camCarousel" data-slide="prev">
        <span class="glyphicon glyphicon-chevron-left"></span>
        <span class="sr-only">Previous</span>
    </a>
    <a class="right carousel-control" href="#camCarousel" data-slide="next">
        <span class="glyphicon glyphicon-chevron-right"></span>
        <span class="sr-only">Next</span>
    </a>
    <div class="cam-tray shut carbon">
        {{#each urls}}
        <div class="cam-tray-item">
            <img class="cam-tray-img" src="{{this.imageUrl}}" data-video="{{this.videoUrl}}" data-mjpeg="{{this.mjpeg}}"
                data-refresh="{{refresh}}" data-id="{{this.key}}">
            <div class="cam-tray-caption">{{this.title}}</div>
        </div>
        {{/each}}
    </div>
    <div class="handle carbon">
        <i class="fas fa-angle-double-up"></i>
    </div>
</div>