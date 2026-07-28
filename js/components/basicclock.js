/* global Dashticz DT_function*/

var DT_basicclock = {
  name: 'basicclock',
  init: function () {
    return DT_function.loadCSS('./js/components/basicclock.css');
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'basicclock';
  },
  defaultCfg: {
    scale: 1,
    width: 12,
    maxFontSize: 42,
    containerClass: 'text-center',
  },
  run: function (me) {
    var $block = $(me.mountPoint + ' .dt_block');
    var width = me.block.size || $block.width();
    var fontSize = (width / 6) * me.block.scale;
    $block.css('font-size', Math.min(fontSize, me.block.maxFontSize));
    $(me.mountPoint + ' .dt_content').html(
      '<div class="clock"></div><div class="weekday"></div><div class="date"></div>'
    );
  },
};

Dashticz.register(DT_basicclock);
//# sourceURL=js/components/basicclock.js
