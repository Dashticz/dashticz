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
    var availW = $block.width() || $(me.mountPoint).width() || 120;
    var availH = $block.height() || $(me.mountPoint).height() || 0;
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
