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
      addDeviceUpdateHandler(me);
    },
  };

  function addDeviceUpdateHandler(me) {
    var block=me.block;
    var deviceIdx = block.idx;
    if (typeof block.idx === 'string') {
      var idxSplit = block.idx.split('_');
      if (idxSplit.length == 2) {
        var idx = parseInt(idxSplit[0]);
        var subidx = parseInt(idxSplit[1]);
        if (typeof idx === 'number' && typeof subidx === 'number') {
          deviceIdx = idx;
          block.subidx = subidx;
        }
      }
    }
    Dashticz.subscribeDevice(me, deviceIdx, true, function (device) {
      block.device = device;
      deviceUpdateHandler(block);
    });
  /*Not needed anymore: already handled in framework
    if (block.key) {
      Dashticz.subscribeBlock(me, block.key, function (blockUpdate) {
        $.extend(block, blockUpdate);
        deviceUpdateHandler(block);
      });
    } else {
      console.log('key not defined for block ', block.idx);
    }*/
  }
  
})();

Dashticz.register(DT_domoticzblock);
