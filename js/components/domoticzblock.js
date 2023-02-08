/* global Dashticz settings deviceUpdateHandler Domoticz*/
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
      me.$mountPoint.html(
        '<div data-id="' +
          block.idx +
          '" class="mh transbg block_' +
          block.key +
          '"></div>'
      );
      me.deviceIdx = block.idx;
      if (typeof block.idx === 'string') {
        var idxSplit = block.idx.split('_');
        if (idxSplit.length == 2) {
          var idx = parseInt(idxSplit[0]);
          var subidx = parseInt(idxSplit[1]);
          if (typeof idx === 'number' && typeof subidx === 'number') {
            me.deviceIdx = idx;
            me.subidx = subidx;
          }
        }
      }
      me.entry = me.mountPoint.slice(1);

      fixBlock(me);
      addDeviceUpdateHandler(me);
    },
    refresh: function (me) {
      fixBlock(me);
      deviceUpdateHandler(me.block);
    },
  };

  function fixBlock(me) {
    //This function is needed to make it work with previous block definition
    //refactoring needed in the future
    var block = me.block;
    if (block.icon === 'default') {
      block.icon = undefined;
      block.image = undefined;
    }
    if (block.icon) block.image = undefined;
    block.$mountPoint = me.$mountPoint;
    block.mountPoint = me.mountPoint;
    block.entry = me.entry;
    block.subidx = me.subidx;
    block.device = Domoticz.getAllDevices()[me.deviceIdx];
  }

  function addDeviceUpdateHandler(me) {
    Dashticz.subscribeDevice(me, me.deviceIdx, true, function (device) {
      me.block.device = device;
      deviceUpdateHandler(me.block);
    });
  }
})();

Dashticz.register(DT_domoticzblock);
