/* global Dashticz settings deviceUpdateHandler Domoticz*/
//# sourceURL=js/components/domoticzblock.js
var DT_domoticzblock = (function () {
  return {
    name: 'domoticzblock',
    canHandle: function (block) {
      return block && block.idx;
    },
    defaultCfg: function(block){
      return {
        width: 4,
        batteryThreshold: settings.batteryThreshold,
        icon: 'default',
        longpress: block&&block.idx&&(block.idx[0]==='s')
      }
    },
    run: function (me) {
      var block = me.block;
      var longpress = me.block.longpress?' longpress ':'';
      var longpressdata = me.block.longpress? ' data-long-press-delay="1000" ':'';
      me.$mountPoint.html(
        '<div data-id="' +
        block.idx + '"' + longpressdata + 
        ' class="mh transbg block_' +
        block.key + longpress + ' col-xs-'+me.block.width +
        '">Getting device ' + me.block.idx + '</div>'
      );
        me.$mountPoint.find()
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
      if (me.block.longpress) {
        me.$mountPoint.find('.block_' + block.key)[0].addEventListener('long-press', function (e) {
          e.preventDefault();
          console.log('long press');
          if (me.deviceIdx[0]==='s') 
          Domoticz.request('getscenedevices', false, { idx: me.deviceIdx.substring(1)  })
            .then(function (res) {
              console.log(res);
              var devices = res.result.map(function (device) {
                return device.DevRealIdx
              });
              console.log(devices);
              DT_function.clickHandler(me, { popup: devices })
            })
        })
      }
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
