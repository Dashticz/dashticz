/* global checkForceRefresh settings Dashticz isDefined functions*/
// eslint-disable-next-line no-unused-vars
var camUrls = [];
var templateEngine = TemplateEngine();
var interval = '';

var DT_camera = {
  name: 'camera',

  canHandle: function (block) {
    return block && block.type === 'camera';
  },
  run: function (me) {
    me.mjpeg = isDefined(me.block.videoUrl);
    me.block.videoUrl = isDefined(me.block.videoUrl)
      ? me.block.videoUrl
      : me.block.imageUrl;

    templateEngine.load('camera_image').then(function (template) {
      var data = {
        mount: me.mountPoint.slice(1),
        image: me.block.imageUrl,
        video: me.block.videoUrl,
        dt: Date.now(),
        height: me.block && me.block.height ? me.block.height : 300,
      };
      $(me.mountPoint + ' > div').html(template(data));
    });

    var refreshtime =
      typeof me.block.refresh !== 'undefined' ? me.block.refresh : 1000;

    camUrls.push({
      image: me.block.imageUrl,
      video: me.block.videoUrl,
      mjpeg: me.mjpeg,
      refresh: refreshtime,
    });

    setInterval(function () {
      DT_camera.reloadImage(
        me.block.imageUrl,
        me.mountPoint.slice(1) + '_camImage'
      );
    }, refreshtime);

    $('body').on(
      'click',
      '.' + me.mountPoint.slice(1) + '_camImage',
      function () {
        templateEngine.load('camera_video').then(function (template) {
          var data = {
            src: me.block.videoUrl,
            urls: camUrls,
            dt: (me.block.imageUrl.includes('?') ? '&t=' : '?t=') + Date.now(),
            mount: me.mountPoint.slice(1),
          };

          $('body').append(template(data));

          if (!me.mjpeg) {
            interval = setInterval(function () {
              DT_camera.reloadImage(me.block.imageUrl, 'stream');
            }, refreshtime);
          }
        });
      }
    );
  },
  reloadImage: function (url, c) {
    var x = url.includes('?') ? '&t=' : '?t=';
    $('.' + c).attr('src', url + x + Date.now());
  },
};

Dashticz.register(DT_camera);

$('body').on('click', '.cam-container .handle', function () {
  toggleTray();
  setDrawerTimeout();
});

$('body').on('click', '.cam-container .cam-tray-img', function () {
  var video = $(this).data('video');
  var mjpeg = $(this).data('mjpeg');

  clearInterval(interval);

  if (mjpeg) {
    video += (video.includes('?') ? '&t=' : '?t=') + Date.now();
    $('.cam-container .stream').attr('src', video);
  } else {
    interval = setInterval(function () {
      DT_camera.reloadImage(video, 'stream');
    }, $(this).data('refresh'));
  }

  clearTimeout(closeDrawer);
  setDrawerTimeout();
});

$('body').on('click', '.cam-container .stream', function () {
  $(this).parent().remove();
});

function toggleTray() {
  $('.cam-container .handle').toggleClass('open');
  $('.cam-container .cam-tray').toggleClass('open shut');
}

function setDrawerTimeout() {
  closeDrawer = setTimeout(function () {
    toggleTray();
  }, 5000);
}
//# sourceURL=js/components/camera.js
