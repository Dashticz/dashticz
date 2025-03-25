/* global Dashticz settings deviceUpdateHandler Domoticz DT_function*/
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
        longpress: block&&DT_function.idxIsScene(block.idx),
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
        else { //Use device name
          var idx = DT_function.getDomoticzIdx(block.idx);
          if(idx) {
            block.idx = idx;
            me.deviceIdx = idx;
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
          if (DT_function.idxIsScene(me.deviceIdx)) 
          Domoticz.request('getscenedevices', false, { idx: me.deviceIdx.substring(1)  })
            .then(function (res) {
              console.log(res);
              var devices = res.result.map(function (device) {
                return device.DevRealIdx
              });
              DT_function.clickHandler(me, { popup: devices })
            })
        })
      }
      me.backgroundselector='.block_' + block.key;
      if (me.block.backgroundimage) {
        if ( Domoticz.getAllDevices(me.block.backgroundimage)) {
          Dashticz.subscribeDevice(me, me.block.backgroundimage, true, function (device) {
            me.backgroundImage = device.Data;
            setBackgroundImage(me, device.Data);
          });

        }
        else {
          me.backgroundImage = me.block.backgroundimage;
          setBackgroundImage(me, me.backgroundImage);
        }
      }

    },
    refresh: function (me) {
      fixBlock(me);
      deviceUpdateHandler(me.block);
    },
  };

  function setBackgroundImage(me, url) {
    //switch: .switch-face
    //'normal' ? dial: .dial-display
    //updown: blinds
    if(!url) return;
    var $face = me.$mountPoint.find(me.backgroundselector);
    $face.addClass('hasbackground');
    var opacity = me.block.backgroundopacity? '; opacity: ' + me.block.backgroundopacity: '';
    var bg = '<div class="background" style="background-image: url('+ url + ')' + opacity + '"> </div>';
//      $face.css( {'background-image': "url(" + url + ")"})
    $face.prepend(bg);
    if(me.block.backgroundsize && me.block.backgroundsize!=='cover') {
//      $face.css('background-size',me.block.backgroundsize)
      $face.find('.background').css('background-size',me.block.backgroundsize)
    }

  }

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
      setBackgroundImage(me, me.backgroundImage);
    });
    if(me.block.values) {
      var deviceList = [me.deviceIdx];
      me.block.values.forEach(function(value) {
        if (value.idx && !deviceList.includes(value.idx)) {
          deviceList.push(value.idx);
          Dashticz.subscribeDevice(me, value.idx, false, function(device) {
            deviceUpdateHandler(me.block);
          })
        }
      })
    }
  }
})();

Dashticz.register(DT_domoticzblock);
