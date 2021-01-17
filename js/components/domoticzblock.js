/* global Dashticz settings*/
//# sourceURL=js/components/domoticzblock.js
var DT_domoticzblock = (function () {
  return {
    name: 'domoticzblock',
    canHandle: function (block) {
      return block && block.idx;
    },
    defaultCfg: {
      width: 4,
      batteryThreshold: settings.batteryThreshold,
      icon: 'default',
    },
    run: function (me) {
      var block = me.block;
      if (block.icon === 'default') {
        block.icon = undefined;
        block.image= undefined;
      }
      if(block.icon)
        block.image=undefined;
      var $mountPoint = $(me.mountPoint);

      $mountPoint.html(
        '<div data-id="' +
          me.block.idx +
          '" class="mh transbg block_' +
          me.block.key +
          '"></div>'
      );
      block.$mountPoint = $mountPoint;
      block.mountPoint = me.mountPoint;
      block.entry = block.mountPoint.slice(1);
      addDeviceUpdateHandler(block);
    },
  };
})();

Dashticz.register(DT_domoticzblock);
