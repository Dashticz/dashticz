<div id="camCarousel" class="cam-container carousel slide" data-bs-ride="carousel" data-bs-interval="{{slide}}">
    <ol class="carousel-indicators">
        {{#each urls}}
        <li id="ind{{@index}}" data-bs-target="#camCarousel" data-bs-slide-to="{{@index}}"></li>
        {{/each}}
    </ol>
    <div class="carousel-inner">
        {{#each urls}}
        <div class="item carousel-item">
            <img id="cam{{@index}}" class="stream" src="{{this.imageUrl}}" data-mjpeg="{{this.mjpeg}}">
            <div class="cam-caption">
                <h3>{{this.title}}</h3>
            </div>
        </div>
        {{/each}}
    </div>
    <!-- Left and right controls -->
    <a class="left carousel-control carousel-control-prev" href="#camCarousel" data-bs-slide="prev">
        <span class="glyphicon-chevron-left fas fa-chevron-left" aria-hidden="true"></span>
        <span class="visually-hidden">Previous</span>
    </a>
    <a class="right carousel-control carousel-control-next" href="#camCarousel" data-bs-slide="next">
        <span class="glyphicon-chevron-right fas fa-chevron-right" aria-hidden="true"></span>
        <span class="visually-hidden">Next</span>
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
