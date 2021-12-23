/* global Dashticz DT_function*/
// eslint-disable-next-line no-unused-vars
// check: https://github.com/niutech/x-frame-bypass
var DT_frame = {
  name: 'frame',

  canHandle: function (block) {
    return block && block.frameurl;
  },

  defaultCfg: function () {
    var ios = navigator.userAgent.match(/(iPod|iPhone|iPad)/) ? ' ios' : '';

    var cfg = {
      containerClass: 'swiper-no-swiping imgblock' + ios,
      refresh: 300,
    };
    return cfg;
  },
  defaultContent: function (me) {
    var scrolling =
      me.block.scrollbars === false ||
      navigator.userAgent.match(/(iPod|iPhone|iPad)/)
        ? ' scrolling="no"'
        : '';
    var html = '';
    var height = me.block.height ? ';height:' + me.block.height + 'px' : '';
    html +=
      '<iframe ' + scrolling + ' style="border:0px' + height + ';"></iframe>';
//      '<iframe is="x-frame-bypass"' + scrolling + ' style="border:0px' + height + ';"></iframe>';

    return html;
  },
  /*
  init: function(me) {
    return DT_function.loadScript('https://unpkg.com/x-frame-bypass');
  },*/
  run: function(me) {
    
    var hasIcon = me.$mountPoint.find('.col-icon').length;
    var $iframe = me.$mountPoint.find('iframe');
    var $dtstate = me.$mountPoint.find('.dt_state');
    var width = hasIcon ? parseInt(me.$mountPoint.find('.dt_content').outerWidth()) : parseInt(me.$mountPoint.find('div').innerWidth());
    var scaling = me.block.scaletofit ? width/me.block.scaletofit : 1;
    var iframeWidth = width/scaling;
    var dtstatecss={};
    var iframecss={}
    var scalingStr = 'scale(' + scaling + ')';
    if(scaling!==1) {
      dtstatecss= { };
      iframecss={'-webkit-transform': scalingStr, transform: scalingStr, width: iframeWidth, maxWidth: iframeWidth};
      if(hasIcon) {
        dtstatecss.marginRight='0px';
        dtstatecss.marginLeft='5px';
      }
    }
    if(me.block.aspectratio) {
      dtstatecss.height=iframeWidth * me.block.aspectratio * scaling;
      iframecss.height=iframeWidth * me.block.aspectratio;
    }
    $dtstate.css(dtstatecss);
    $iframe.css(iframecss);
  },

  refresh: function (me) {
    if (typeof me.block.frameurl !== 'undefined') {
      me.$mountPoint
        .find('iframe')
        .attr(
          'src',
          DT_function.checkForceRefresh(
            me.block.frameurl,
            me.block.forcerefresh
          )
        );
    }
  },
};

Dashticz.register(DT_frame);

//# sourceURL=js/components/frame.js
