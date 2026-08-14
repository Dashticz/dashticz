/* global Dashticz settings choose language */
//# sourceURL=js/components/waqi.js
(function (Dashticz) {
  "use strict";
  var MAX_MEASURE_ATTEMPTS = 20;
  var MEASURE_RETRY_MS = 150;

  var DT_waqi = {
    name: 'waqi',
    canHandle: function (block) {
      return block && block.type === 'waqi';
    },
    defaultCfg: function (block) {
      return {
        icon: 'fas fa-wind',
        title: 'Air Quality',
        width: 12,
        layout: choose(block.layout, settings['waqi_layout'], 'large'), //xsmall, small, large, xlarge, xxl
        city: choose(block.city, settings['waqi_city'], 5771), //Amsterdam
        refresh: 15 * 60,
      };
    },
    run: function (me) {
      me.iframeid = me.mountPoint + '_iframe';
      me.$mountPoint.find('.dt_state').html(
        '<iframe scrolling="no" style="border:0px;" id="' + me.iframeid + '"></iframe>'
      );
    },
    onResize: function (me) {
      _scaleToFit(me, 0);
    },
    refresh: function (me) {
      var iframeEl = document.getElementById(me.iframeid);
      if (!iframeEl) return;
      var html =
        '<script type="text/javascript" src="https://widgets.waqi.info/jswgt/?size=' +
        me.block.layout + '&city=@' + me.block.city +
        '"></script><noscript>' + language.misc.widget_not_visible + ' (<a href="https://aqicn.org/">' +
        language.misc.more_info + '</a>)</noscript>';
      var doc = iframeEl.contentWindow.document;
      doc.open();
      doc.write(html);
      doc.close();
      _scaleToFit(me, 0);
    },
  };

  // The WAQI badge is injected asynchronously by an externally-loaded
  // <script>, so its real size is only known once that script has run.
  // Measure the iframe's own (same-origin) document instead of guessing a
  // fixed pixel size per layout, then scale the whole badge down (or up) to
  // fit the block's actual rendered width.
  function _scaleToFit(me, attempt) {
    var iframeEl = document.getElementById(me.iframeid);
    if (!iframeEl || !iframeEl.contentDocument) return;
    var body = iframeEl.contentDocument.body;
    var contentWidth = body && body.scrollWidth;
    var contentHeight = body && body.scrollHeight;
    if (!contentWidth || !contentHeight) {
      if (attempt < MAX_MEASURE_ATTEMPTS) {
        setTimeout(function () {
          _scaleToFit(me, attempt + 1);
        }, MEASURE_RETRY_MS);
      }
      return;
    }
    var hasIcon = me.$mountPoint.find('.col-icon').length;
    var containerWidth = parseInt(
      hasIcon
        ? me.$mountPoint.find('.dt_content').outerWidth()
        : me.$mountPoint.find('div').innerWidth()
    );
    var scaling = containerWidth ? containerWidth / contentWidth : 1;
    $(iframeEl).css({
      width: contentWidth,
      height: contentHeight,
      transform: 'scale(' + scaling + ')',
      '-webkit-transform': 'scale(' + scaling + ')',
      'transform-origin': 'top left',
    });
    me.$mountPoint.find('.dt_state').css({ height: contentHeight * scaling });
  }

  Dashticz.register(DT_waqi);
})(Dashticz);
