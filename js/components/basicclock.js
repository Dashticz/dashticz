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
      containerClass: 'text-center'
  },
  run: function (me) {

      var width = me.block.size || $(me.mountPoint + ' .dt_block').width();
      $(me.mountPoint + ' .dt_block').css('font-size', width / 6 * me.block.scale);
      $(me.mountPoint + ' .dt_content').html(
        '<div class="clock"></div><div class="weekday"></div><div class="date"></div>'
      )
  },
};

Dashticz.register(DT_basicclock);
//# sourceURL=js/components/basicclock.js
