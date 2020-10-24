/* global settings Domoticz Dashticz moment _TEMP_SYMBOL isDefined number_format templateEngine Hammer*/
/* global showPopupGraph switchEvoHotWater changeEvohomeControllerStatus slideDevice switchEvoZone switchThermostat switchDevice isObject*/
var DT_dial = {
  name: 'dial',

  /**
   * Checks whether the block can be handled by this component.
   * @param {object} block  User specified block config.
   * @param {string} key    identifier used for block selection.
   */
  canHandle: function(block) {
    return block && block.type === 'dial';
  },

  /**
   * Called at initiation returning a jquery deferred.
   */
  init: function() {
    this.debug = false;
    this.isTouch = false;
    this.active = false;
    this.center = { x: 0, y: 0 };
    this.R2D = 180 / Math.PI;
    this.timeformat = isDefined(settings['timeformat']) ?
      settings['timeformat'] :
      'HH:mm, DD/MM/YY';
    this.settings = false;

    document.addEventListener(
      'touchstart',
      function() {
        DT_dial.isTouch = true;
      }, { passive: false }
    );
  },
  defaultCfg: {
    title: false,
    width: 3,
    last_update: true,
    dialimage: false,
    flash: 0,
    showring: false,
    shownumbers: false,
    offset: 0,
    group: false,
    animate: true
  },

  /**
   * Called once the component has been intialised and mounted in DOM.
   * @param {object} me  Core component object.
   */
  run: function(me) {
    me.idx = isDefined(me.block.idx) ? me.block.idx : me.key;
    me.block.idx = me.idx; /* required for existing functions */
    me.id = 'dial_' + me.idx;
    me.height = isDefined(me.block.height) ?
      parseInt(me.block.height) :
      parseInt($(me.mountPoint + ' div').css('width'));
    me.fontsize = 0.8 * me.height;
    me.dialRange = 280;
    me.active = true;
    DT_dial.color(me);
    me.segments = 11;
    me.showunit = me.block.showunit || false;

    /* Get Domoticz setting then make */
    Domoticz.request('type=settings')
      .then(function(res) {
        if (res) {
          DT_dial.settings = res;
        }
      })
      .then(function() {
        me.devices = []
        if (typeof me.idx === 'number' || parseInt(me.idx))
          me.devices.push(me.idx)
        if (typeof me.idx === 'string' && me.idx[0]==='s') {
          var idx = parseInt(me.idx.slice(1))
          if (idx)
            me.devices.push(me.idx)
        }
        if (me.block.values)
          me.block.values.forEach(function(el) {
            if (typeof el === 'object' && el.idx)
            {//              if (!$.inArray(el.idx, me.devices)) 
              var idx = parseInt(el.idx);
              if (me.devices.indexOf(idx)===-1)
                  me.devices.push(idx);
            }
          })
        if(me.block.temp) {
          var idx = parseInt(me.block.temp);
          if (idx && me.devices.indexOf(idx)===-1)
            me.devices.push(idx);
        }
        me.devices.forEach(function(el) {
          Domoticz.subscribe(el, false, function(device) {
            if (me.idx===el) {
              me.device = device;
              me.block.device=device;
            }
            me.lastupdate = !me.block.last_update ?
              false :
              moment(me.device.LastUpdate).format(DT_dial.timeformat);
            DT_dial.make(me);
          });

        })
        me.device=Domoticz.getAllDevices()[me.devices[0]];
        me.block.device=me.device;
        if(!me.device) {
          console.log('Device not found: ', me.idx);
          return
        }
        me.isSetpoint = isDefined(me.device.SetPoint);
        DT_dial.make(me);

      });
  },

  /**
   * Creates or updates the dial and applies current values.
   * @param {object} me  Core component object.
   */
  make: function(me) {
    me.info = [];
    DT_dial.resize(me);
    var d = me.device;

    switch (true) {
      case typeof me.block.values!== 'undefined':
        DT_dial.defaultDial(me);
        break;
      case d.SubType === 'Evohome':
      case d.SwitchType === 'Selector':
        DT_dial.control(me);
        break;
      case d.Type === 'Heating':
      case d.Type === 'Thermostat':
      case d.SubType === 'SetPoint':
        DT_dial.heating(me);
        break;
      case d.SwitchType === 'Dimmer':
        DT_dial.dimmer(me);
        break;
      case d.Type === 'Group':
      case d.Type === 'Scene':
      case d.SwitchType === 'On/Off':
        DT_dial.onoff(me);
        break;
      case d.Type === 'Temp':
      case d.Type === 'Temp + Humidity':
      case d.Type === 'Temp + Humidity + Baro':
        DT_dial.temperature(me);
        break;
      case d.Type === 'Wind':
        DT_dial.wind(me);
        break;
      case d.Type === 'P1 Smart Meter':
        DT_dial.p1smartmeter(me);
        break;
      default:
        DT_dial.defaultDial(me);
        break;
    }

    if (me.block.shownumbers && me.numbers == undefined) {
      me.numbers = DT_dial.numbers(me);
    }

    templateEngine.load('dial').then(function(template) {
      var dataObject = {
        id: me.id,
        size: me.size,
        name: me.block.title ? me.block.title : me.device.Name,
        min: me.min,
        max: me.max,
        showunit: me.showunit,
        type: me.device.Type,
        value: me.value,
        valueformat: number_format(me.value, 1),
        hasSetpoint: me.isSetpoint || me.subdevice,
        setpoint: me.setpoint,
        until: me.until,
        status: me.status,
        override: me.override,
        on: me.demand ? 'on' : 'off',
        controller: me.controller,
        fixed: me.fixed,
        onoff: me.onoff,
        options: me.options,
        unitvalue: me.unitvalue,
        info: me.info,
        lastupdate: me.lastupdate,
        color: me.color,
        rgba: me.rgba,
        fontsize: me.fontsize,
        needleL: me.height / 2,
        needleW: me.height / 17,
        icon: me.dialicon,
        image: me.block.dialimage,
        numbers: me.numbers,
        range: me.dialRange,
        class: me.class,
        split: me.splitdial,
        slice: me.slice,
        checked: me.checked,
        addclass:me.block.animate ? 'animate' :''
      };

      /* Mount dial */
      var $mount = $(me.mountPoint + ' .dt_content');
      $mount.html(template(dataObject));
      $mount.addClass('swiper-no-swiping');
      $(me.mountPoint + ' .dt_block').css('height', me.height + 'px');
      if (me.type === 'evo' || me.type === 'selector') {
        $(me.select + ' li').each(function() {
          if ($(this).data('val') === me.status) {
            $(this).addClass('selected');
          }
        });
      }

      /* Add flash on update if required */
      if (me.block.flash > 0) {
        $(me.mountPoint + ' .dial')
          .addClass('dial-flash')
          .delay(me.block.flash)
          .queue(function() {
            $(this).removeClass('dial-flash').dequeue();
          });
      }

      /* Always show color outer ring if required */
      if (me.block.showring) {
        $(me.mountPoint + ' .dial .bar').addClass('show-ring');
        $(me.mountPoint + ' .dial .fill').addClass('show-ring');
      }

      DT_dial.tap(me);

      /* Add dial calculations */
      if (!me.onoff && !me.controller) {
        me.body = $(me.mountPoint + ' .dt_content .dial');
        me.min = me.body.data('min');
        me.max = me.body.data('max');
        me.scale = me.dialRange / (me.max - me.min);
        me.value = me.body.data('value');
        me.angle = DT_dial.degrees(me);
        me.control = me.body.find('.dial-needle');
        DT_dial.listen(me);
        DT_dial.rotate(me);
      }
    });
  },

  /**
   * Provides interaction with the dial via tap.
   * @param {object} me  Core component object.
   */
  tap: function(me) {
    var d = document.getElementById(me.id);
    var mc = new Hammer(d);
    mc.on('tap', function(ev) {
      if (me.status === 'TemporaryOverride') {
        me.override = false;
        me.demand = false;
        DT_dial.update(me);
      }
      if (me.type === 'dim') {
        me.demand ? (me.value = 0) : (me.value = me.device.Level);
        me.demand = !me.demand;
        DT_dial.update(me);
      }
      if (me.type === 'dhw') {
        me.demand = me.state === 'On';
        me.state = me.state === 'On' ? 'Off' : 'On';
        me.demand = !me.demand;
        switchEvoHotWater(me, me.state, me.demand);
      }
      if (me.type === 'evo' || me.type === 'selector') {
        $(me.select + ' li').removeClass('selected');
        $(ev.target).addClass('selected');
        var status = $(me.select + ' li.selected').data('val');
        me.device.Status = status;
        if (me.type === 'evo') {
          changeEvohomeControllerStatus(me, status);
        } else {
          slideDevice(me, status);
        }
      }
      if (me.type === 'onoff') {
        if (me.device.Type === 'Scene') me.cmd = 'On'
          else me.cmd = me.state === 'Off' ? 'On' : 'Off';
        me.demand = me.cmd === 'On';
        DT_dial.update(me);
      }
      if(me.type === 'default' || me.type === 'temp') {
        showPopupGraph(me.block);
      }
    });
  },

  /**
   * Listen for all dial needle rotation by the user.
   * @param {object} me  Core component object.
   */
  listen: function(me) {
    if (me.active) {
      ['mousedown', 'touchstart'].forEach(function(e) {
        me.control[0].addEventListener(e, DT_dial.start, { passive: false });
      });
      me.body
        .bind('mousedown touchstart', function() {
          me.devices.forEach(function(idx ) {
            Domoticz.hold(idx)
          });
        })
        .bind('mousemove touchmove', function(event) {
          if (DT_dial.active) {
            DT_dial.isTouch && event.targetTouches ?
              DT_dial.angle(me, event.targetTouches[0]) :
              DT_dial.angle(me, event);
          }
          return false;
        })
        .bind('mouseup touchend mouseleave', function() {
          if (DT_dial.active) DT_dial.stop(me);
        });
    }
  },

  /**
   * Start of dial needle rotation, set active.
   * @param {object} e  The touch or mouse event.
   */
  start: function() {
    var bb = this.getBoundingClientRect();
    DT_dial.center = {
      x: bb.left + bb.width / 2,
      y: bb.top + bb.height / 2,
    };
    return (DT_dial.active = true);
  },

  /**
   * Calculate angle of rotation, factoring touch or mouse input.
   * @param {object} me  Core component object.
   * @param {object} e   The touch or mouse event.
   */
  angle: function(me, e) {
    var x =
      DT_dial.isTouch && e.touches && e.touches.length ?
      e.touches[0].clientX - DT_dial.center.x :
      e.clientX - DT_dial.center.x;
    var y =
      DT_dial.isTouch && e.touches && e.touches.length ?
      e.touches[0].clientY - DT_dial.center.x :
      e.clientY - DT_dial.center.y;
    me.angle = DT_dial.R2D * Math.atan2(y, x);
    DT_dial.rotate(me);
  },

  /**
   * Apply rotation and styling, updating value.
   * @param {object} me  Core component object.
   */
  rotate: function(me) {
    var $d = $(me.body);
    var a = me.angle;

    if ((a >= -180 && a <= 60) || (a >= 140 && a <= 180) || me.unlimited) {
      /* within valid range */

      me.degrees = me.unlimited ?
        a + me.block.offset :
        a >= 140 && a <= 180 ?
        a - 140 :
        a + 220;

      var val = me.value;

      if (me.unlimited) {
        /* For dials such as Wind which rotate 360 */
        val = me.temp;
        $d.addClass('p360');
      } else if (me.splitdial) {
        /* For dials such as P1 Smart Meter which split left/right at 12 o'clock */
        $d.toggleClass('p0', true).removeClass('p180');
        $d.find('.bar').css({
          webkitTransform: 'rotate(' + (me.degrees + 220) + 'deg)',
        });
      } else {
        /* For tradditional dials that start at 7 o'clock */
        if (a >= -40 && a <= 60) {
          /* right side, e.g. blue */
          $d.toggleClass('p180', true).removeClass('p0');
          $d.find('.bar').css({ webkitTransform: 'rotate(180deg)' });
          $d.find('.fill').css({
            webkitTransform: 'rotate(' + me.degrees + 'deg)',
          });
        } else if ((a >= 140 && a <= 180) || (a >= -180 && a <= -40)) {
          /* left side, e.g. orange */
          $d.toggleClass('p0', true).removeClass('p180');
          $d.find('.bar').css({
            webkitTransform: 'rotate(' + me.degrees + 'deg)',
          });
        }

        if (me.active)
          me.value = Math.round((me.min + me.degrees / me.scale) * 10) / 10;
      }

      if (me.isSetpoint) {
        if (val >= me.setpoint) {
          /* at or above setpoint */

          $d.find('.bar').addClass('primary').removeClass('secondary');
          $d.find('.fill').addClass('primary').removeClass('secondary');
        } else {
          /* below setpoint */

          $d.find('.bar').addClass('secondary').removeClass('primary');
          $d.find('.fill').addClass('secondary').removeClass('primary');
        }
      }

      var valueformat =
        me.value % 1 === 0 ? me.value : number_format(me.value, 1);

      $d.find('.value').text(valueformat).data('value', me.value);
      $d.find('.info').text($d.data('info'));
      $(me.control).css({
        webkitTransform: 'rotate(' + (-140 + me.degrees) + 'deg)',
      });
    } else {
      console.log(me.block.key+' device: '+me.device.Name+ ': angle outside permitted range = ' + a);
    }
  },

  /**
   * Calculate degrees based on device range.
   * @param {object} me  Core component object.
   */
  degrees: function(me) {
    var value = me.value;
    value = isDefined(me.min) && (value < me.min) ? me.min : value;
    value = isDefined(me.max) && (value > me.max) ? me.max : value;

    var deg = (value - me.min) * me.scale;
    deg += me.splitdial || deg > 40 ? -220 : 140;
    return deg;
  },

  /**
   * Rotation has stopped, update the device.
   * @param {object} me  Core component object.
   */
  stop: function(me) {
    me.devices.forEach(function(idx) {
      Domoticz.release(idx)
    });
    switch (me.type) {
      case 'zone':
        me.setpoint = me.value;
        me.override = true;
        break;
      case 'dim':
        me.device.Data = me.value;
        me.device.Level = me.value;
        break;
    }
    DT_dial.update(me);
    return (DT_dial.active = false);
  },

  /**
   * Update device with new values post rotation.
   * @param {object} me  Core component object.
   */
  update: function(me) {
    switch (me.type) {
      case 'zone':
        switchEvoZone(me, me.setpoint, me.override);
        break;
      case 'stat':
        switchThermostat(me, me.value);
        break;
      case 'dim':
        slideDevice(me, Math.ceil((me.maxdim / me.max) * me.value));
        break;
      case 'onoff':
        switchDevice(me, me.cmd);
        break;
      case 'default':
        if (me.isSetpoint) {
          var block = {};
          $.extend(block, me)
          if (me.setpointDevice) {
            block.idx=me.setpointDevice;  //Force that the correct setpoint device is used.
            block.device = Domoticz.getAllDevices()[me.setpointDevice]
          }
          switchThermostat(block, me.value);
        }
        break;
    }
  },

  /**
   * Create RGB and RBGA values for styling if block.color exists.
   * @param {object} me  Core component object.
   */
  color: function(me) {
    if (isDefined(me.block.color)) {
      var c = $(me.mountPoint)
        .css('color', me.block.color)
        .css('color'); /* change all formats to rgb */
      me.color = c;
      me.rgba =
        c.split(',').length === 4 ?
        c.replace(
          c.split(',')[3],
          '0.5)'
        ) /* already rgba, make 50% opaque */ :
        c
        .replace(')', ', 0.5)')
        .replace('rgb', 'rgba'); /* convert rgb to rgba at 50% opaque*/
    } else {
      me.color = 'rgb(255, 165, 0)';
      me.rgba = 'rgba(255, 165, 0, 0.5)';
    }
    return;
  },

  /**
   * Ensure all dials are responsive based on column width on screen resize.
   * @param {object} me  Core component object.
   */
  resize: function(me) {
    /* todo: temporarily disabled.
     * to prevent recreating and resubscribing to domoticz devices
    window.addEventListener(
      'resize',
      function() {
        DT_dial.run(me);
      },
      true
    );*/
  },

  /**
   * Displays the icon or image for the dial info.
   * @param {object} param    String or object from block config.
   * @param {number} index    Index of array if param is object.
   * @param {object} length   Length of array expected.
   * @param {object} fallback Default value to use if no block config.
   */
  display: function(param, index, length, fallback) {
    return isDefined(param) ?
      isObject(param) && param.length === length ?
      param[index] :
      param :
      fallback;
  },

  /**
   * Configures the data for Evohome zones/hot water and thermostats.
   * @param {object} me  Core component object.
   */
  heating: function(me) {
    me.type = me.device.Type === 'Heating' ? 'zone' : 'stat';
    me.unitvalue = _TEMP_SYMBOL;
    me.min = isDefined(me.block.min) ?
      me.block.min :
      isDefined(settings['setpoint_min']) ?
      settings['setpoint_min'] :
      5;
    me.max = isDefined(me.block.max) ?
      me.block.max :
      isDefined(settings['setpoint_max']) ?
      settings['setpoint_max'] :
      35;

    me.dialicon = DT_dial.display(
      me.block.dialicon,
      0,
      1,
      'fas fa-calendar-alt'
    );
    me.dialimage = DT_dial.display(me.block.dialimage, 0, 1, false);

    /* EvoHome Zones */
    if (me.type === 'zone') {
      me.value = me.device.Temp;
      me.setpoint = me.isSetpoint ? me.device.SetPoint : 20;
      me.boost = isDefined(settings['evohome_boost_zone']) ?
        settings['evohome_boost_zone'] :
        60;
      me.until = isDefined(me.device.Until) ? me.device.Until : false;
      me.status = isDefined(me.device.Status) ? me.device.Status : 'Auto';
      me.override = me.status === 'TemporaryOverride';
      me.demand = me.status !== 'HeatingOff' && me.value < me.setpoint;
      me.lastupdate =
        me.lastupdate && me.until ?
        moment(me.until).format(DT_dial.timeformat) :
        me.lastupdate;

      /* EvoHome Hot water */
      if (me.device.SubType === 'Hot Water') {
        me.active = false;
        me.type = 'dhw';
        me.state = me.device.State;
        me.min = isDefined(me.block.min) ? me.block.min : 20;
        me.max = isDefined(me.block.max) ? me.block.max : 60;
        me.setpoint = 40;
        me.demand = me.device.State === 'On';
        me.boost = isDefined(settings['evohome_boost_hw']) ?
          settings['evohome_boost_hw'] :
          30;
      }
      me.info.push({
        icon: me.override ? 'fas fa-stopwatch small_fa' : me.dialicon,
        image: me.override ? undefined : me.block.dialimage,
        data: me.setpoint,
        unit: _TEMP_SYMBOL,
      });
    } else {
      /* Combining Toon Thermostat with Toon Temp device */
      if (isDefined(me.block.temp)) {
        me.value = Domoticz.getAllDevices()[me.block.temp].Temp;
        me.isSetpoint = true;
        me.setpoint = me.device.SetPoint;
        me.info.push({
          icon: 'fas fa-calendar-alt',
          data: me.setpoint,
          unit: _TEMP_SYMBOL,
        });
        /* Standard thermostat device */
      } else {
        me.value = parseFloat(me.device.Data); //number_format(me.device.Data, 1);
        me.isSetpoint = false;
      }
    }
    return;
  },

  /**
   * Configures the data for read only temperature devices.
   * @param {object} me  Core component object.
   */
  temperature: function(me) {
    me.type = 'temp';
    me.active = false;
    me.min = isDefined(me.block.min) ? me.block.min : 5;
    me.max = isDefined(me.block.max) ? me.block.max : 35;
    me.value = typeof me.device['Temp'] !== 'undefined' ? me.device['Temp'] : me.device['Data'];
    me.isSetpoint = true;
    me.setpoint = isDefined(me.block.setpoint) ? me.block.setpoint : 20;
    me.unitvalue = _TEMP_SYMBOL;

    if (typeof me.device.Humidity !== 'undefined') {
      me.info.push({
        icon: DT_dial.display(me.block.dialicon, 0, 2, 'fas fa-tint'),
        image: DT_dial.display(me.block.dialimage, 0, 2, false),
        data: number_format(me.device['Humidity'], 0),
        unit: '%',
      });
    }

    if (typeof me.device.Barometer !== 'undefined') {
      me.info.push({
        icon: DT_dial.display(me.block.dialicon, 1, 2, 'fas fa-cloud'),
        image: DT_dial.display(me.block.dialimage, 1, 2, false),
        data: number_format(me.device['Barometer'], 0),
        unit: 'hPa',
      });
    }
    return;
  },

  defaultDial: function(me) {
  
    function getValueUnit(data) {
      var dataScale = data.scale || 1;
      if(!data.value) {
        console.log('Invalid data ', data);
        return;
      }
      if(typeof data.value==='number') {
        return {
          value:data.value,
          unit: data.unit
        }
      }
      res = data.value.split(' ');
      if(res.length) {
        var value=parseFloat(res[0]) * dataScale;
        var unit =  typeof data.unit !=='undefined' ? data.unit: (res.length > 1 ? res[1] : '');
        return {
          value: value,
          unit: unit
        } 
      }
      else {
        console.log("invalid dial data");
        return {
          value: 0,
          unit: data.unit
        }
      }
    }

    function getValueInfo(device, id) {
      var res = {};
      var inputData = {};
      if (typeof id === 'string') {
        inputData = {
          value: device[id],
        };
      } else {
        inputData.value = device[id.value];
        inputData.unit = id.unit;
        inputData.decimals = id.decimals;
        inputData.scale = id.scale;
        res.icon = id.icon;
        res.image = id.image;
      }
      if (typeof inputData.value === 'undefined') {
        console.log('Value not found for field ' + id.value+' in device ' + device.idx+':'+device.Name)
        return {
          data: 0,
          unit: ''
        }
      }
      var valueunit = getValueUnit(inputData);
      res.data = valueunit.value;
      res.unit = valueunit.unit;
      return res;
    }

    me.type = 'default';
    me.active = false;
    me.min = isDefined(me.block.min) ? me.block.min : 0;
    me.max = isDefined(me.block.max) ? me.block.max : 100;

    me.value = parseFloat(me.device.Data);
    var splitAllData = me.device.Data.split(',');
    var splitData = splitAllData[0].split(' ');
    me.unitvalue = me.block.unitvalue || (splitData.length>1 ? splitData[1]:undefined);
    if (!me.unitvalue && me.device.SubType == 'Percentage') me.unitvalue = '%';
    me.isSetpoint = true;
    /* supported formats:
      values : [ 'temp', 'humidity']   array of strings
      values: [ { value: 'temp', unit:'km', icon:'fa fa_bulb',image:'my_image'}]  array of objects.
    */
  if(me.block.values) {
    var defaultIdx = me.devices[0];

    if(Array.isArray(me.block.values)) {
        me.info = me.block.values.map(function(el) {
          var idx = defaultIdx;
          if(typeof el=='object' && el.idx) {
            idx = el.idx;
          }
          var device = Domoticz.getAllDevices()[idx];
          var valueInfo = getValueInfo(device, el);
          if (el.isSetpoint) {
            me.isSetpoint = true;
            me.active= true;//Dial can be used to set setpoint value
            me.setpointDevice = idx;
            me.setpoint = valueInfo.value;
          }
          return valueInfo;            
        })
        var res = me.info.shift();
        if (typeof res.unit !== 'undefined') me.unitvalue = res.unit;
        me.value = res.data;
      }
      else {
        console.error('values should be an array for ', me.block)
      }
    }
    me.showunit = isDefined(me.block.showunit) ? me.block.showunit : !!me.unitvalue;
  },

  wind: function(me) {
    me.type = 'wind';
    me.active = false;
    me.unlimited = true;
    me.min = 0;
    me.max = 360;
    me.dialRange = 360;
    me.value = me.device.Direction;
    me.unitvalue = '°';
    me.segments = 12;
    me.numbers = [210, 240, 270, 300, 330, 0, 30, 60, 90, 120, 150, 180];
    me.subdevice = true;
    me.setpoint = isDefined(me.block.setpoint) ? me.block.setpoint : 15;
    me.isSetpoint = true;
    me.temp = me.device.Temp;

    var windUnit = 'm/s';
    if (DT_dial.settings) {
      var wind = ['m/s', 'km/h', 'mph', 'Knts', 'Bfrt'];
      windUnit = wind[DT_dial.settings.WindUnit];
    }

    me.info.push({
      icon: DT_dial.display(me.block.dialicon, 0, 3, 'fas fa-location-arrow'),
      image: DT_dial.display(me.block.dialimage, 0, 3, false),
      data: me.device.DirectionStr,
      unit: '',
    }, {
      icon: DT_dial.display(me.block.dialicon, 1, 3, 'fas fa-wind'),
      image: DT_dial.display(me.block.dialimage, 1, 3, false),
      data: me.device.Speed,
      unit: windUnit,
    }, {
      icon: DT_dial.display(
        me.block.dialicon,
        2,
        3,
        'fas fa-thermometer-half'
      ),
      image: DT_dial.display(me.block.dialimage, 0, 3, false),
      data: me.device.Temp,
      unit: _TEMP_SYMBOL,
    });
    return;
  },

  /**
   * Configures the data for Evohome controllers.
   * @param {object} me  Core component object.
   */
  control: function(me) {
    me.select = '#' + me.id + ' .status';
    me.controller = true;
    me.fixed = true;
    if (me.device.SubType === 'Evohome') {
      me.type = 'evo';
      me.status = me.device.Status;
      me.options = [
        { val: 'Auto', text: 'Auto' },
        { val: 'AutoWithEco', text: 'Economy' },
        { val: 'Away', text: 'Away' },
        { val: 'Custom', text: 'Custom' },
        { val: 'DayOff', text: 'Day Off' },
        { val: 'HeatingOff', text: 'Off' },
      ];
    } else {
      me.type = 'selector';
      me.status = me.device.Level;
      me.options = [];
      var levelNames = atob(me.device.LevelNames).split('|');
      $.each(levelNames, function(index, value) {
        me.options.push({ val: index * 10, text: value });
      });
    }
    return;
  },

  /**
   * Configures the data for devices of dimmer switchtype.
   * @param {object} me  Core component object.
   */
  dimmer: function(me) {
    me.type = 'dim';
    me.min = isDefined(me.block.min) ? me.block.min : 0;
    me.max = isDefined(me.block.max) ? me.block.max : 100;
    me.value =
      me.device.Data === 'Off' ?
      0 :
      me.device.Level > me.max * 0.95 ?
      me.max :
      me.device.Level < me.max * 0.05 ?
      me.min :
      me.device.Level;
    me.demand = me.value > 0;
    me.maxdim = isDefined(me.device.MaxDimLevel) ?
      parseInt(me.device.MaxDimLevel) :
      100;
    me.segments = 11;
    return;
  },

  /**
   * Configures the data for devices of on/off switchtype.
   * @param {object} me  Core component object.
   */
  onoff: function(me) {
    me.type = 'onoff';
    me.fixed = true;
    me.onoff = true;
    me.state = me.device.Status;
    me.demand = me.state === 'On';
    me.checked = me.state === 'On' ? 'checked' : '';
    return;
  },

  /**
   * Configures the data for devices of P1 Smart Meter type.
   * @param {object} me  Core component object.
   */
  p1smartmeter: function(me) {
    me.type = 'p1';
    me.active = false;
    me.min = isDefined(me.block.min) ? me.block.min : -10;
    me.max = isDefined(me.block.max) ? me.block.max : 10;
    me.value =
      Math.round(
        (parseFloat(me.device.CounterDelivToday) -
          parseFloat(me.device.CounterToday)) *
        100
      ) / 100;
    me.class = me.value > 0 ? 'positive' : 'negative';
    me.slice = me.value > 0 ? 'splitdial-plus' : 'splitdial-minus';
    me.unitvalue = 'kWh';
    me.subdevice = true;
    me.splitdial = true;

    me.info.push({
      icon: DT_dial.display(me.block.dialicon, 0, 2, 'fas fa-sun'),
      image: DT_dial.display(me.block.dialimage, 0, 2, false),
      data: me.device.CounterDelivToday,
      unit: '',
    }, {
      icon: DT_dial.display(me.block.dialicon, 1, 2, 'fas fa-bolt'),
      image: DT_dial.display(me.block.dialimage, 1, 2, false),
      data: me.device.CounterToday,
      unit: '',
    });
    return;
  },

  /**
   * Create the numbers for the dial face.
   * @param {object} me  Core component object.
   */
  numbers: function(me) {
    var x = me.min;
    var numbers = [];
    me.increment = (me.max - me.min) / (me.segments - 1);
    for (var i = 0; i < me.segments; i++) {
      numbers.push(Math.ceil(x));
      x += me.increment;
    }
    return numbers;
  },
};
Dashticz.register(DT_dial);
//# sourceURL=js/components/dial.js