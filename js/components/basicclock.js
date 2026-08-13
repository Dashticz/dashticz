/* global Dashticz DT_function settings*/

var DT_basicclock = {
  name: 'basicclock',
  init: function () {
    return DT_function.loadCSS('./js/components/basicclock.css');
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'basicclock';
  },
  defaultCfg: function () {
    var cfg = {
      scale: 1,
      width: 12,
      maxFontSize: 42,
      containerClass: 'text-center',
      icon: 'far fa-clock',
    };
    if (settings['clock_scale'] !== '' && settings['clock_scale'] != null) {
      var scale = Number(settings['clock_scale']);
      if (isFinite(scale) && scale > 0) cfg.scale = scale;
    }
    if (settings['clock_size'] !== '' && settings['clock_size'] != null) {
      var size = Number(settings['clock_size']);
      if (isFinite(size) && size > 0) cfg.size = size;
    }
    return cfg;
  },
  run: function (me) {
    var $block = $(me.mountPoint + ' .dt_block');
    var $title = $(me.mountPoint + ' .dt_title');
    var $state = $(me.mountPoint + ' .dt_state');
    // .dt_block's height includes the title bar (built by dashticz.js's
    // renderTitle()) and .dt_state's own 5px/5px vertical margin (see
    // creative.css), so sizing the clock to the full block height pushed it
    // past the block's own bottom edge and needed an oversized block just to
    // avoid a scrollbar. Same fix as js/components/frame.js.
    var titleHeight = $title.length && $title.is(':visible') ? $title.outerHeight(true) : 0;
    var stateMarginV = $state.length
      ? (parseFloat($state.css('margin-top')) || 0) + (parseFloat($state.css('margin-bottom')) || 0)
      : 0;
    var availW = $block.width() || $(me.mountPoint).width() || 120;
    var availH = ($block.height() || $(me.mountPoint).height() || 0) - titleHeight - stateMarginV;
    var base = me.block.size || (availH > 0 ? Math.min(availW, availH) : availW);
    var scale = Number(me.block.scale);
    if (!isFinite(scale) || scale <= 0) scale = 1;
    var width = base * scale;
    if (availW > 0) width = Math.min(width, availW);
    if (availH > 0) width = Math.min(width, availH);
    var fontSize = (width / 6);
    $block.css('font-size', Math.min(fontSize, me.block.maxFontSize));
    // Render into .dt_state, not .dt_content: .dt_content also holds .dt_title
    // (built by dashticz.js's renderTitle() from block.title/hide_title), and
    // overwriting .dt_content wipes that title back out right after it's set.
    $(me.mountPoint + ' .dt_state').html(
      '<div class="clock"></div><div class="weekday"></div><div class="date"></div>'
    );
  },
};

Dashticz.register(DT_basicclock);
//# sourceURL=js/components/basicclock.js
