/* global Dashticz DT_function isDefined templateEngine*/
// eslint-disable-next-line no-unused-vars
var DT_camera = {
  name: 'camera',
  canHandle: function (block) {
    return block && block.type === 'camera';
  },

  /**
   * Core camera variables.
   */
  init: function () {
    this.devices = [];
    this.traytimeout = 0;
    this.trayimgtimer = 0;
    this.trayopentimer = 0;
    this.streamtimer = 0;
    this.trayopen = false;
    this.carousel = false;
    this.listenersBound = false;
  },

  /**
   * Default block config for camera functions.
   */
  defaultCfg: {
    title: '',
    forcerefresh: 1,
    traytimeout: 5,
    refresh: 1,
    slidedelay: 3,
    cameras: [],
    width: 6,
  },

  /**
   * Creates all camera thumb blocks and initialises listeners.
   * @param {object}  me  Core component object.
   */
  run: function (me) {
    var newDevices = [];
    /* The camera block contains multiple cameras */
    if (me.block.cameras.length > 0) {
      /* Create new mountpoints for each of the cameras */
      var s = me.$mountPoint.closest('.screen').data('screenindex');
      var c = me.$mountPoint.closest('.col-xs-12').data('colindex');
      var columndiv = 'div.screen' + s + ' .row .col' + c;
      me.$mountPoint.remove();

      $.each(me.block.cameras, function (i) {
        var mountpoint = Dashticz.mountNewContainer(columndiv);
        var cam = $.extend({}, me.block.cameras[i]);
        cam.key = me.key.slice(0, -1) + i;
        cam.mjpeg = isDefined(cam.videoUrl);
        cam.videoUrl = cam.mjpeg ? cam.videoUrl : cam.imageUrl;
        cam.refresh = me.block.refresh * 1000;
        cam.mountpoint = mountpoint;
        cam.block = me.block;
        cam.multi = true;
        cam.index = DT_camera.devices.length;
        cam.owner = me;
        DT_camera.devices.push(cam);
        newDevices.push(cam);
      });

      /* The camera block has only one camera */
    } else {
      me.mjpeg = isDefined(me.block.videoUrl);
      me.block.videoUrl = me.mjpeg ? me.block.videoUrl : me.block.imageUrl;
      var camera = {
        key: me.key,
        imageUrl: me.block.imageUrl,
        videoUrl: me.mjpeg ? me.block.videoUrl : me.block.imageUrl,
        mjpeg: me.mjpeg,
        refresh: me.block.refresh * 1000,
        title: me.block.title,
        mountpoint: me.mountPoint,
        block: me.block,
        multi: false,
        index: DT_camera.devices.length,
        owner: me,
      };
      DT_camera.devices.push(camera);
      newDevices.push(camera);
    }

    /* Create the thumbs for each camera and add to mountpoint */
    $.each(newDevices, function (i, cam) {
      templateEngine.load('camera_image').then(function (template) {
        var data = {
          div: cam.multi,
          index: cam.index,
          mount: cam.mountpoint.slice(1),
          image: DT_function.checkForceRefresh(
            cam.imageUrl,
            cam.block.forcerefresh
          ),
          height: cam.block && cam.block.height ? cam.block.height : 300,
          mjpeg: cam.mjpeg,
          id: cam.key,
        };
        var div = cam.multi ? '' : ' > div';
        $(cam.mountpoint + div).html(template(data));
        $(cam.mountpoint + ' div')
          .removeClass('col-xs-6')
          .addClass('col-xs-' + cam.block.width);
      });

      DT_camera.setTrayTimeout(cam);
      DT_camera.reloadThumb(cam);
    });
    DT_camera.listen();
  },

  destroy: function (me) {
    DT_camera.devices = DT_camera.devices.filter(function (camera) {
      if (camera.owner !== me) return true;
      clearInterval(camera.thumbtimer);
      return false;
    });
    DT_camera.devices.forEach(function (camera, index) {
      camera.index = index;
    });
    clearInterval(DT_camera.streamtimer);
    clearInterval(DT_camera.trayimgtimer);
    clearTimeout(DT_camera.trayopentimer);
    $('#camCarousel').remove();
    DT_camera.carousel = false;
    DT_camera.trayopen = false;
  },

  /**
   * Reloads the thumb image url with new datetime.
   * Note: all thumbs disable when fullscreen is enabled.
   * @param {object}  me  Core component object.
   */
  reloadThumb: function (me) {
    clearInterval(me.thumbtimer);
    me.thumbtimer = setInterval(function () {
      if (!DT_camera.carousel) {
        $('.' + me.mountpoint.slice(1) + '_camImage').attr(
          'src',
          DT_function.checkForceRefresh(me.imageUrl, me.block.forcerefresh)
        );
      }
    }, me.refresh);
    return;
  },

  /**
   * Gets current cam index and passes to stream manager.
   * @param {object}    me      Core component object.
   * @param {boolean}   right   The direction of the carousel.
   */
  slide: function (right) {
    var camindex = $('.carousel-inner .item.active').index();
    DT_camera.streamManager(camindex, right);
  },

  /**
   * Manages active streams when using the carousel left/right.
   * MJPEG streams are replaced by images as they move out of view.
   * Images are replaced by MJPEG (where applicable) as they move into view.
   * @param {object}    me         Core component object.
   * @param {number}    camindex   The index of the current camera.
   * @param {boolean}   right      The direction of the carousel.
   */
  streamManager: function (camindex, right) {
    var direction = right ? 1 : -1;
    var limit = right ? 0 : DT_camera.devices.length - 1;
    var newindex =
      DT_camera.devices[camindex + direction] !== undefined
        ? camindex + direction
        : limit;

    var curr = DT_camera.devices[camindex];
    DT_camera.setStream(newindex);
    $('#cam' + camindex).attr('src', curr.imageUrl);
    return;
  },

  /**
   * Sets the active stream according to its stream type; mjpeg or image.
   * Image streams are refreshed with the setinterval timer.
   * @param {object}    me         Core component object.
   * @param {number}    index      The index of the camera to activate.
   */
  setStream: function (index) {
    var $cam = $('body').find('#cam' + index);
    var camera = DT_camera.devices[index];
    if (!camera) return;
    if (camera.mjpeg) {
      clearInterval(DT_camera.streamtimer);
      $cam.attr('src', camera.videoUrl);
    } else {
      clearInterval(DT_camera.streamtimer);
      DT_camera.streamtimer = setInterval(function () {
        $cam.attr(
          'src',
          DT_function.checkForceRefresh(
            camera.imageUrl,
            camera.block.forcerefresh
          )
        );
      }, camera.refresh);
    }
    return;
  },

  /**
   * Applies the user defined timeout for the tray.
   * E.g. traytimeout: 10, keeps tray open for 10 seconds.
   * Default is 5 seconds.
   */
  setTrayTimeout: function (me) {
    if (me.block.traytimeout > DT_camera.traytimeout) {
      DT_camera.traytimeout = me.block.traytimeout;
    }
    return;
  },

  /**
   * Opens or closes the tray.
   */
  trayToggle: function () {
    var $tray = $('#camCarousel > div.cam-tray');
    if ($tray.hasClass('open')) {
      $tray.removeClass('open').addClass('shut');
      clearTimeout(DT_camera.trayopentimer);
      clearInterval(DT_camera.trayimgtimer);
      DT_camera.trayopen = false;
    } else {
      $tray.removeClass('shut').addClass('open');
      DT_camera.trayopen = true;
      DT_camera.trayTimeout();
    }
    return;
  },

  /**
   * Closes tray after 5 seconds or user specified duration.
   * Block parameter: traytimeout (in seconds)
   */
  trayTimeout: function () {
    clearTimeout(DT_camera.trayopentimer);
    DT_camera.trayopentimer = setTimeout(function () {
      if (DT_camera.trayopen) DT_camera.trayToggle();
    }, DT_camera.traytimeout * 1000);
  },

  /**
   * Refreshes images at user specified interval when tray is open.
   * @param {object}  me  Core component object.
   */
  trayRefresh: function () {
    clearInterval(DT_camera.trayimgtimer);
    var refresh = DT_camera.devices.reduce(function (current, camera) {
      return Math.min(current, camera.refresh);
    }, 60000);
    DT_camera.trayimgtimer = setInterval(function () {
      if ($('.cam-tray').hasClass('open')) {
        $('.cam-tray-item .cam-tray-img').each(function (index) {
          if (isDefined(DT_camera.devices[index])) {
            var refreshUrl = DT_function.checkForceRefresh(
              DT_camera.devices[index].imageUrl,
              DT_camera.devices[index].block.forcerefresh
            );
            $(
              '.cam-tray.open > .cam-tray-item:nth-child(' +
                (index + 1) +
                ') > img'
            ).attr('src', refreshUrl);
          }
        });
      }
    }, refresh);
    return;
  },
  /**
   * Listens for user interaction; thumbs, tray and carousel.
   * @param {object}  me  Core component object.
   */
  listen: function () {
    if (DT_camera.listenersBound) return;
    DT_camera.listenersBound = true;
    /* Listens when thumbs are clicked on Dashticz screen */
    $('body').on(
      'click',
      '.dt-camera-thumb',
      function () {
        DT_camera.carousel = true;
        var key = $(this).data('id');
        var index = DT_camera.devices.findIndex(function (object) {
          return object.key === key;
        });
        var camera = DT_camera.devices[index];
        if (!camera) return;

        /* Camera carousel opened for the first time */
        if ($('#camCarousel').length === 0) {
          templateEngine.load('camera_video').then(function (template) {
            if ($('body #camCarousel').length === 0) {
              $('body').append(
                template({
                  urls: DT_camera.devices,
                  slide: camera.block.slidedelay * 1000,
                })
              );
              var $cam = $('body').find('#cam' + index);
              var $ind = $('body').find('#ind' + index);
              $('#camCarousel').carousel();
              $cam.parent().addClass('active');
              $ind.addClass('active');
              DT_camera.setStream(index);
            }
          });

          /* Show existing Camera carousel */
        } else {
          $('#camCarousel').show();
          $('#camCarousel').carousel('cycle');
          $('#camCarousel').carousel(index);
          DT_camera.setStream(index);
        }
      }
    );

    /* Listens when an image is selected in the tray */
    $('body').on('click', '.cam-container .cam-tray-img', function () {
      clearTimeout(DT_camera.trayopentimer);
      var key = $(this).data('id');
      var index = DT_camera.devices.findIndex(function (object) {
        return object.key === key;
      });
      $('#camCarousel').carousel(index);
      DT_camera.setStream(index);
      DT_camera.trayTimeout();
    });

    /* Listens when the handle of the tray is clicked */
    $('body').on('click', '#camCarousel > .handle', function () {
      if (!DT_camera.trayopen) {
        DT_camera.trayToggle();
        DT_camera.trayRefresh();
      }
    });

    /* Listens when the active camera in the carousel is clicked */
    $('body').on(
      'click',
      '#camCarousel > div.carousel-inner > div.item.active',
      function () {
        if (DT_camera.carousel) {
          $('#camCarousel').hide();
          $('#camCarousel').carousel('pause');
          clearInterval(DT_camera.streamtimer);
          clearInterval(DT_camera.trayimgtimer);
          DT_camera.carousel = false;
        }
      }
    );

    /* Listens when user navigates left in the carousel */
    $('body').on('click', '.cam-container .left', function () {
      DT_camera.slide(false);
    });

    /* Listens when user navigates right in the carousel */
    $('body').on('click', '.cam-container .right', function () {
      DT_camera.slide(true);
    });

    /* Listens when the carousel slides automatically */
    $('body').on('slide.bs.carousel', '#camCarousel', function () {
      DT_camera.slide(true);
    });
  },
};

Dashticz.register(DT_camera);
//# sourceURL=js/components/camera.js
