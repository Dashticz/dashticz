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
  // scaletofit is the embedded page's own design width in px; the iframe is
  // CSS-scaled (transform: scale) so that width maps onto the tile's actual
  // rendered width. aspectratio (height/width) then derives the height from
  // the scaled width. .dt_state only gets a real (non-content-driven) height
  // through the .fixedheight class, which dashticz.js only adds when
  // aspectratio or a fixed `height` is set — so without either, the iframe
  // has no height at all and collapses to the browser's own ~150px default.
  // In a grid layout the tile itself IS already sized (via --dt-grid-h), so
  // fall back to that measured height instead of leaving the iframe tiny.
  run: function(me) {

    var hasIcon = me.$mountPoint.find('.col-icon').length;
    var $iframe = me.$mountPoint.find('iframe');
    var $dtstate = me.$mountPoint.find('.dt_state');
    var width = hasIcon ? parseInt(me.$mountPoint.find('.dt_content').outerWidth()) : parseInt(me.$mountPoint.find('div').innerWidth());
    // Reserve a symmetric 5px gap on both sides of the content area when
    // there's an icon column, matching the gap the icon itself already
    // gets. This must happen *before* scaling is computed: the iframe's
    // scaled visual width is width/scaling * scaling = width, so shrinking
    // .dt_state's own box afterwards without also shrinking this would
    // leave the (still full-width) scaled iframe overflowing the narrower
    // box, clipped flush against its edge instead of leaving a visible gap.
    if (hasIcon) width -= 10;
    var scaling = me.block.scaletofit ? width/me.block.scaletofit : 1;
    var iframeWidth = width/scaling;
    var dtstatecss={marginRight:'', marginLeft:''};
    var iframecss={
      '-webkit-transform': '',
      transform: '',
      width: '',
      maxWidth: ''
    }
    var scalingStr = 'scale(' + scaling + ')';
    if(scaling!==1) {
      dtstatecss= { };
      iframecss={'-webkit-transform': scalingStr, transform: scalingStr, width: iframeWidth, maxWidth: iframeWidth};
    }
    // .frame .dt_state has a blanket margin: -5px in CSS (expanding it to
    // cover .dt_block's own padding when there's no icon eating into the
    // width). With an icon that negative margin has nothing to compensate
    // for on the right - there's no matching padding removed there - so it
    // just pulls .dt_state past the block's edge with no visible gap. This
    // needs to apply whether or not scaletofit is scaling the iframe, so it
    // can't live inside the block above.
    if (hasIcon) {
      dtstatecss.marginRight='5px';
      dtstatecss.marginLeft='5px';
      // Only scaletofit's fixed-pixel-width + transform:scale needs an
      // explicit .dt_state width to match; without it, .dt_state's own
      // width already follows from its (now non-negative) margins, and the
      // iframe's default width:100% (see .dt_state iframe in creative.css)
      // fits that automatically.
      if (scaling !== 1) dtstatecss.width = width;
    }
    if(me.block.aspectratio) {
      dtstatecss.height=iframeWidth * me.block.aspectratio * scaling;
      iframecss.height=iframeWidth * me.block.aspectratio;
    } else if (!me.block.height) {
      var $gridItem = me.$mountPoint.closest('.dt-grid-item');
      // .dt_block's *content-box* height (CSS pins it to the grid item's
      // full height - see the .dt-grid-item > .frame rule in creative.css),
      // not the grid item's own outer height: .dt_block has its own padding
      // that the grid item doesn't, and .dt_title (the block's title bar)
      // sits above .dt_state inside that content box. Sizing .dt_state to
      // more than "content box minus title" pushes it past .dt_block's own
      // bottom edge, showing as a scrollbar/cropped content on the tile.
      var $block = $gridItem.length ? $gridItem.find('.dt_block').first() : $();
      var blockHeight = $block.length ? $block.height() : 0;
      var $title = me.$mountPoint.find('.dt_title');
      var titleHeight = $title.length && $title.is(':visible') ? $title.outerHeight(true) : 0;
      var availableHeight = blockHeight - titleHeight;
      if (availableHeight > 0) {
        dtstatecss.height = availableHeight;
        iframecss.height = availableHeight;
      }
    }
    $dtstate.css(dtstatecss);
    $iframe.css(iframecss);
  },

  onResize: function (me) {
    DT_frame.run(me);
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
