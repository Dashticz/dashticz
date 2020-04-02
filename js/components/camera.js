/* global checkForceRefresh settings Dashticz*/
// eslint-disable-next-line no-unused-vars
var camUrls = [];

var DT_camera = {
  name: "camera",

  canHandle: function(block) {    
    return block && block.type === 'camera';
  },
  run: function(me) {

    var height = me.block && me.block.height ? ";height:" + me.block.height + "px" : "";
    var template = '<img class="{{mount}}_camImage" src="{{image}}" data-video="{{video}}" style="border:0px;{{height}};width:100%;">';
    var data = {
      mount: me.mountPoint.slice(1),
      image: me.block.imageUrl,
      video: me.block.videoUrl,
      dt: Date.now(),
      height: height
    };

    var mountPoint = $(me.mountPoint + " > div");
    mountPoint.html(Handlebars.compile(template)(data));

    camUrls.push({ image: me.block.imageUrl, video: me.block.videoUrl });
    var refreshtime = typeof me.block.refresh !== "undefined" ? me.block.refresh : 1000;
    var closeDrawer;

    setInterval(function() {
      DT_camera.reloadFrame(me);
    }, refreshtime);

    $("body").on("click", "." + me.mountPoint.slice(1) + "_camImage",  function() {
        var template = '<div class="cam-container"><img class="stream" src="{{src}}"><div class="cam-tray shut">{{#each urls}}<img class="cam-tray-img" src="{{this.image}}&d={{../dt}}" data-video="{{this.video}}">{{/each}}</div><div class="handle"><i class="fas fa-angle-double-up"></i></div></div>';
        var data = {
          src: me.block.videoUrl,
          urls: camUrls,
          dt: Date.now(),
          mount: me.mountPoint.slice(1)
        };
        $("body").append(Handlebars.compile(template)(data));
      }
    );
  },
  reloadFrame: function(me) {
    var x = me.block.imageUrl.includes('?')? '&timestamp=' : '?timestamp=';
    $("." + me.mountPoint.slice(1) + "_camImage").attr("src", me.block.imageUrl + x + Date.now());
  }
};

Dashticz.register(DT_camera);

$("body").on("click", ".cam-container .handle", function() {
  toggleTray();
  setDrawerTimeout();
});

$("body").on("click", ".cam-container .cam-tray-img", function() {
  var video = $(this).data("video") + "&d=" + Date.now();
  $(".cam-container .stream").attr("src", video);
  clearTimeout(closeDrawer);
  setDrawerTimeout();
});

$("body").on("click", ".cam-container .stream", function() {
  $(this).parent().remove();
});

function toggleTray() {
  $(".cam-container .handle").toggleClass("open");
  $(".cam-container .cam-tray").toggleClass("open shut");
}

function setDrawerTimeout() {
  closeDrawer = setTimeout(function() {
    toggleTray();
  }, 5000);
}
