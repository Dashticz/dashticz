/* global Dashticz */
//# sourceURL=js/components/waqi.js
(function (Dashticz) {
  "use strict";
  var DT_waqi = {
    name: 'waqi',
    canHandle: function (block) {
      return block && false;
    },
    defaultCfg: function (block) {
      var layout = choose(block.layout, 'large');
      var zoomfactors = {
        xsmall: [120, 1.2],
        small: [170, 0.9],
        large: [170, 1.3],
        xlarge: [180, 1.66],
        xxl: [480, 1],
      }
      return {
        width: 12,
        layout: layout, //xsmall, small, large, xlarge, xxl
        city: 5771, //Amsterdam
        refresh: 15*60,
        scaletofit: zoomfactors[layout][0] || 1,
        aspectratio: zoomfactors[layout][1] || 0.5,
      };
    },
    run: function (me) {
        var hasIcon = me.$mountPoint.find('.col-icon').length;
        var html = '';
        var height = me.block.height ? ';height:' + me.block.height + 'px' : '';
        var isXXL = me.block.layout==='xxl';
        me.iframeid = me.mountPoint+'_iframe';
        html +=
          '<iframe style="border:0px' + height + ';" id="' + me.iframeid + '"></iframe>';
    //      '<iframe is="x-frame-bypass"' + scrolling + ' style="border:0px' + height + ';"></iframe>';
        me.$mountPoint.find('.dt_state').html(html);

        var $iframe = me.$mountPoint.find('iframe');
        var $dtstate = me.$mountPoint.find('.dt_state');
        var width = parseInt(me.$mountPoint.find('div').innerWidth())  - (isXXL ? 20:0);
//        var width = parseInt($dtstate.innerWidth()) - (isXXL ? 20:0);
        var scaling = me.block.scaletofit ? width/me.block.scaletofit : 1;
        var iframeWidth = width/scaling; // - (isXXL?20:0);
        var dtstatecss={};
        var iframecss={}
        var scalingStr = 'scale(' + scaling + ')';
        iframecss={'-webkit-transform': scalingStr, transform: scalingStr, width: iframeWidth, maxWidth: iframeWidth, 'transform-origin': 'top left'};
        if(hasIcon) {
          dtstatecss.marginRight='0px';
          dtstatecss.marginLeft='5px';
        }
        if(me.block.aspectratio) {
          dtstatecss.height=iframeWidth * me.block.aspectratio * scaling;
          iframecss.height=iframeWidth * me.block.aspectratio  - (isXXL?40:0);
        }

        if(me.block.layout==='xxl') {
//          iframecss.width='100%';

            me.$mountPoint.find('.dt_block').addClass('xxl');
            $dtstate.css(dtstatecss);
            $iframe.css(iframecss);    
        }
        else {

          $dtstate.css(dtstatecss);
          $iframe.css(iframecss);    
        }
    },
    /*
    defaultContent: function (me) {
        var scrolling =
          me.block.scrollbars === false ||
          navigator.userAgent.match(/(iPod|iPhone|iPad)/)
            ? ' scrolling="no"'
            : '';
        var html = '';
        var height = me.block.height ? ';height:' + me.block.height + 'px' : '';
        me.iframeid = me.mountPoint+'_iframe';
        html +=
          '<iframe ' + scrolling + ' style="border:0px' + height + ';" id="' + me.iframeid + '"></iframe>';
    //      '<iframe is="x-frame-bypass"' + scrolling + ' style="border:0px' + height + ';"></iframe>';
    
        return html;
      },
    */
    refresh: function(me) {
        var iframe = '<script type="text/javascript" src="https://widgets.waqi.info/jswgt/?size=' + 
        me.block.layout + '&city=@' + me.block.city +
        '"></script><noscript>Not seeing a widget? (<a href="https://aqicn.org/">More info</a>)</noscript></iframe>';
        var doc = document.getElementById(me.iframeid).contentWindow.document;
        doc.open();
        doc.write(iframe);
        doc.close();
    }
  }
  Dashticz.register(DT_waqi);
})(Dashticz);

