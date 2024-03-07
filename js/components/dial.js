/* global settings Domoticz Dashticz moment _TEMP_SYMBOL isDefined number_format templateEngine Hammer DT_function Debug choose language Colorpicker*/
/* global isObject*/
/* global addStyleAttribute capitalizeFirstLetter createDelayedFunction*/
/* from blocks.js */
/* global TranslateDirection */
/* from switches.js */
/* global switchEvoHotWater changeEvohomeControllerStatus reqSlideDevice reqSlideDeviceAsync switchEvoZone switchThermostat switchDevice*/
var DT_dial = (function () {
  return {
    name: 'dial',

    /**
     * Checks whether the block can be handled by this component.
     * @param {object} block  User specified block config.
     * @param {string} key    identifier used for block selection.
     */
    canHandle: function (block) {
      return block && block.type === 'dial';
    },

    /**
     * Called at initiation returning a jquery deferred.
     */
    init: function () {
      this.debug = false;
      this.isTouch = false;
      this.active = false;
      this.center = { x: 0, y: 0 };
      this.R2D = 180 / Math.PI;
      this.timeformat = choose(settings['timeformat'], 'HH:mm, DD/MM/YY');
      this.settings = false;
      this.evHandler = function () {
        DT_dial.isTouch = true;
        document.removeEventListener('touchstart', this.evHandler);
      };

      document.addEventListener('touchstart', this.evHandler, {
        passive: false,
      });

      DT_dial.settings = Domoticz.getAllDevices('_settings');

    },
    defaultCfg: {
//      title: false,
      width: 3,
      last_update: true,
      dialimage: false,
      flash: 0,
      showring: false,
//      shownumbers: false,
      offset: 0,
      group: false,
      animation: false,
      iconSwitch: 'fas fa-power-off',
      showvalue: true,
      value: 'Data',
      layout: '',
      textOpen: 'Open',
      textClose: 'Close',
      scale: 1,
      colorpickerscale: parseFloat(settings.colorpickerscale) || 1,
    },

    /**
     * Called once the component has been intialised and mounted in DOM.
     * @param {object} me  Core component object.
     */
    run: function (me) {
      /* keys in the me object:
          fixed: true, in case there should be no needle at all
          active: true, means needle can be adjusted
      */
      me.idx = choose(me.block.idx, me.key);
      me.id = 'dial_' + me.idx;
      me.layout = parseInt(0+me.block.layout);
      var height = isDefined(me.block.height)
        ? parseInt(me.block.height)
        : parseInt($(me.mountPoint + ' div').outerWidth());
      if (height < 0) {
        console.log('dial width unknown.');
        me.height = me.height * me.block.scale || 100;
      } else me.height = height * me.block.scale || me.height;
      me.fontsize = 0.95 * me.height;
      $(me.mountPoint + ' .dt_block').css('height', me.height + 'px');
      me.dialRange = 280;
      me.active = true;
//      color(me);
      me.segments = 11;
      me.showunit = me.block.showunit || false;
      me.shownumbers = me.block.shownumbers || false;
      me.tpl = 'dial';

      var idx;
      me.devices = [];
      var idx = DT_function.getDomoticzIdx(me.idx);
      if (idx)
        me.devices.push(idx);
      if (me.block.values)
        me.block.values.forEach(function (el) {
          if (typeof el === 'object' && el.idx) {
            //              if (!$.inArray(el.idx, me.devices))
            var idx = DT_function.getDomoticzIdx(el.idx);
            if (idx && me.devices.indexOf(idx) === -1) me.devices.push(idx);
          }
        });
      if (me.block.temp) {
        idx = DT_function.getDomoticzIdx(me.block.temp);
        if (idx && me.devices.indexOf(idx) === -1) me.devices.push(idx);
      }
      me.devices.forEach(function (el) {
        Dashticz.subscribeDevice(me, el, false, function (device) {
          if (me.idx === el) {
            me.device = device;
            me.block.device = device;
          }
          me.lastupdate = !me.block.last_update
            ? false
            : moment(me.device.LastUpdate).format(DT_dial.timeformat);
          if (me.update) me.update(me);
          else make(me);
        });
      });
      if (me.devices.length) {
        me.device = Domoticz.getAllDevices(me.devices[0]);
        if (!me.device) {
          console.log('Device not found: ', me.idx);
//          me.$mountPoint.find('.dial').html('Device not found: '+me.idx);
//          return;
        } else {
          me.block.idx = me.idx; /* required for existing functions */
          me.block.device = me.device;
          me.isSetpoint = !!me.device.SetPoint;
        }
      }
      me.delayedFunction = createDelayedFunction(choose(me.block.delay,0)*1000);

      make(me)
        .then(me.tap);
    },

    destroy: function (me) {
      if (me.hammer) {
        me.hammer.destroy();
        me.hammer = 0;
      }
    },
  };

  /**
   * Creates or updates the dial and applies current values.
   * @param {object} me  Core component object.
   */
  function make(me) {
    me.info = [];
    me.showvalue = me.block.showvalue;
    resize(me);
    var d = me.device;
    me.tap = tap;
    me.checkNeedlePos = true;
    me.styleStatus = choose(me.block.styleStatus, true); //by default apply status indication as CSS style
    me.backgroundselector='.dial-display';

    if (!d) {
      me.checkNeedlePos = false;
      if (me.block.idx) 
        me.block.title = (me.block.title || '') + ' Device '+ me.block.idx+ ' not found.'
      onoff(me);
    } else {
      switch (true) {
        case d.SubType === 'Evohome':
        case d.SwitchType === 'Selector':
          control(me);
          break;
        case d.Type === 'Heating':
        case d.Type === 'Thermostat':
        case d.SubType === 'SetPoint':
          heating(me);
          break;
        case d.SwitchType === 'Dimmer':
          dimmer(me);
          break;
        case d.Type === 'Group':
        case d.Type === 'Scene':
        case d.SwitchType === 'On/Off':
        case d.SwitchType === 'Push On Button':
        case d.SwitchType === 'Push Off Button':
          onoff(me);
          break;
        case d.SwitchType && d.SwitchType.substr(0, 6) === 'Blinds':
          makeBlinds(me);
          break;
        case d.Type === 'Temp':
        case d.Type === 'Temp + Humidity':
        case d.Type === 'Temp + Humidity + Baro':
          temperature(me);
          break;
        case d.Type === 'Wind':
          wind(me);
          break;
        case d.Type === 'P1 Smart Meter':
        case d.Type === 'General' && d.SubType === 'kWh':
          p1smartmeter(me);
          break;
        case d.SubType === 'Text':
        case d.SubType === 'Switch':
          text(me);
          break;
        default:
          defaultDial(me);
          break;
      }
    }
    me.title=choose(me.block.title, choose(me.title, true));

    me.splitdial = choose(choose(me.splitdial, me.block.splitdial), me.min < 0);
    me.shownumbers =choose(me.shownumbers, me.block.shownumbers);

    me.unitvalue = choose(me.block.unit, me.device && me.device.vunit, me.unitvalue);
    me.max=choose(me.block.max, me.device && me.device.max, me.max);
    me.min=choose(me.block.min, me.device && me.device.min, me.min);

    addValues(me);

    if (me.shownumbers && me.numbers == undefined) {
      me.numbers = numbers(me);
    }

    //makeConfig(me);

    color(me);

    //    var templateName = me.block.layout ? 'dial_' + me.block.layout : 'dial';
    var templateName = me.tpl;// + me.block.layout;
    return templateEngine.load(templateName).then(function (template) {
      me.info.forEach(function (i) {
        if (i.type === 'text') return;
        if (!isDefined(i.decimals)) return;
        i.data = choose(i.dataFormat, number_format(i.data, i.decimals));
      });
      var dataObject = {
        id: me.id,
        size: me.size,
        name: getName(me),
        min: me.min,
        max: me.max,
        showunit: me.showunit,
        type: me.device && me.device.Type,
        value: me.value,
        valueformat:
          me.type === 'text'
            ? me.value
            : isDefined(me.decimals)
              ? number_format(me.value, me.decimals)
              : me.value,
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
        addclass: me.type,
        animation: me.block.animation ? 'animation' : '',
        iconSwitch: me.block.iconSwitch,
        label: me.label,
        deviceStatus: (me.device && me.device.deviceStatus) || '',
        showvalue: me.showvalue, //to show the big value centered in the middle
        textOpen: choose(me.textUp, me.block.textOpen),
        textClose: choose(me.textDown, me.block.textClose),
        active: me.active? ' active': ''
      };

      /* Mount dial */
      var $mount = $(me.mountPoint + ' .dt_content');
      $mount.html(template(dataObject));
      $mount.addClass('swiper-no-swiping');

      if (me.type === 'evo' || me.type === 'selector') {
        $(me.select + ' li').each(function () {
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
          .queue(function () {
            $(this).removeClass('dial-flash').dequeue();
          });
      }

      /* Always show color outer ring if required */
      if (me.block.showring) {
        $(me.mountPoint + ' .dial .bar').addClass('show-ring');
        $(me.mountPoint + ' .dial .fill').addClass('show-ring');
      }

      if (me.onoff) {
        if (me.switchMode !== 'Toggle')
          $(me.mountPoint + ' input').on('click', function () {
            //          var c = $(this).prop('checked');
            //          $(this).prop('checked', !c);
            var el = $(this);
            var newState = me.switchMode === 'On';
            setTimeout(function () {
              el.prop('checked', newState);
            }, 500);
          });
      }

      if(me.switchMode==='Color') {
//        me.$mountPoint.find('.extra').append('<div class="rgbholder"></div>');
//        addColorpicker(me);
        var block = {
          device: me.device,
          idx: me.idx,
          title: getName(me),
          colorpickerscale: me.block.colorpickerscale,
        }
        new Colorpicker({
          container: me.mountPoint + ' '+me.rgbContainer,
          block: block,
        });
      }

      if (me.block.backgroundimage) {
        if ( Domoticz.getAllDevices(me.block.backgroundimage)) {
          Dashticz.subscribeDevice(me, me.block.backgroundimage, true, function (device) {
            setBackgroundImage(me, device.Data);
          });

        }
        else {
          setBackgroundImage(me, me.block.backgroundImage);
        }
      }

      if(me.update) me.update(me); //for UpDown and Blinds

      /* Add dial calculations */
      if (me.checkNeedlePos) {

        me.body = $(me.mountPoint + ' .dt_content .dial');
        me.scale = me.dialRange / (me.max - me.min);
        me.control = me.body.find('.dial-needle');
        listen(me);
        updateNeedle(me);
      }
      return me
    })
  }

  function setBackgroundImage(me, url) {
    //switch: .switch-face
    //'normal' ? dial: .dial-display
    //updown: blinds
    var $face = me.$mountPoint.find(me.backgroundselector);
    var opacity = me.block.backgroundopacity? '; opacity: ' + me.block.backgroundopacity: '';
    var bg = '<div class="background" style="background-image: url('+ url + ')' + opacity + '"> </div>';
//      $face.css( {'background-image': "url(" + url + ")"})
    $face.prepend(bg);
    if(me.block.backgroundsize && me.block.backgroundsize!=='cover') {
//      $face.css('background-size',me.block.backgroundsize)
      $face.find('.background').css('background-size',me.block.backgroundsize)
    }

  }

  function getName(me) {
    if(me.title===false) return '';
    if(me.title===true && me.device) return (me.device && me.device.Name) || '';
    return me.title ? me.title : me.device && me.device.Name;
  }

  function updateNeedle(me) {
    degrees(me);
    rotate(me);
    return me
  }

  /**
   * Provides interaction with the dial via tap.
   * @param {object} me  Core component object.
   */
  function tap(me) {
    var d = $(me.mountPoint + ' .dial')[0];
    if (me.hammer) {
      me.hammer.destroy();
    }
    me.hammer = new Hammer(d);
    var block = me.block;
    if (block.popup || block.url || block.slide) {
      //Clickhandler has been added already!
      //DT_function.clickHandler(me);
      return;
    }
    me.hammer.on('tap', function (ev) {
      if (me.status === 'TemporaryOverride') {
        me.override = false;
        me.demand = false;
        update(me);
        return;
      }
      if (me.type === 'dim') {
        if(me.switchMode==='Color') {
          return;
        }
        me.demand ? (me.value = 0) : (me.value = me.device.Level);
        me.demand = !me.demand;
        update(me);
        return;
      }
      if (me.type === 'dhw') {
        me.demand = me.state === 'On';
        me.state = me.state === 'On' ? 'Off' : 'On';
        me.demand = !me.demand;
        switchEvoHotWater(me, me.state, me.demand);
        return;
      }
      if (me.type === 'evo' || me.type === 'selector') {
        $(me.select + ' li').removeClass('selected');
        $(ev.target).addClass('selected');
        var status = $(me.select + ' li.selected').data('val');
        me.device.Status = status;
        if (me.type === 'evo') {
          changeEvohomeControllerStatus(me, status);
        } else {
          slideDevice(me, me.idx, status);
        }
        return;
      }
      if (me.type === 'onoff') {
        if (me.switchMode === 'Toggle')
          me.cmd = me.state === 'Off' ? 'On' : 'Off';
        else me.cmd = me.switchMode;
        me.demand = me.cmd === 'On';
        update(me, 'onoff');
        return;
      }
      // (me.type === 'default' or 'temp' or 'p1' or ...)
      if (me.block.graph !== false) DT_function.clickHandler({ block: block });
    });
  }

  /**
   * Listen for all dial needle rotation by the user.
   * @param {object} me  Core component object.
   */
  function listen(me) {
    if (!me.fixed && me.active) {
      ['mousedown', 'touchstart'].forEach(function (e) {
        me.control[0].addEventListener(e, start, { passive: false });
      });
      me.body
        .bind('mousedown touchstart', function () {
          me.devices.forEach(function (idx) {
            Domoticz.hold(idx);
          });
        })
        .bind('mousemove touchmove', function (event) {
          if (DT_dial.active) {
            DT_dial.isTouch && event.targetTouches
              ? angle(me, event.targetTouches[0])
              : angle(me, event);
          }
          return false;
        })
        .bind('mouseup touchend mouseleave', function () {
          if (DT_dial.active) stop(me);
        });
    }
  }

  /**
   * Start of dial needle rotation, set active.
   * @param {object} e  The touch or mouse event.
   */
  function start() {
    var bb = this.getBoundingClientRect();
    DT_dial.center = {
      x: bb.left + bb.width / 2,
      y: bb.top + bb.height / 2,
    };
    return (DT_dial.active = true);
  }

  /**
   * Calculate angle of rotation, factoring touch or mouse input.
   * @param {object} me  Core component object.
   * @param {object} e   The touch or mouse event.
   */
  function angle(me, e) {
    var x =
      DT_dial.isTouch && e.touches && e.touches.length
        ? e.touches[0].clientX - DT_dial.center.x
        : e.clientX - DT_dial.center.x;
    var y =
      DT_dial.isTouch && e.touches && e.touches.length
        ? e.touches[0].clientY - DT_dial.center.x
        : e.clientY - DT_dial.center.y;
    var touchAngle = DT_dial.R2D * Math.atan2(y, x); //0 degrees is right. 90 degrees is bottom
    me.angle = (touchAngle - me.startAngle + 90) % 360;
    if (me.angle + me.startAngle > 180) me.angle = me.angle - 360;
    if (me.angle + me.startAngle < -180) me.angle = me.angle + 360;
    rotate(me);
  }

  /**
   * Apply rotation and styling, updating value.
   * @param {object} me  Core component object.
   */
  function rotate(me) {
    var $d = $(me.body);
    var needleAngle = me.startAngle + me.angle;
    if (me.unlimited) {
      if (needleAngle < -180)
        me.angle = me.angle + 360;
      if (needleAngle > 180)
        me.angle = me.angle - 360
    }
    else {
      if (needleAngle < -140)
        me.angle = -140 - me.startAngle;
      if (needleAngle > 140)
        me.angle = 140 - me.startAngle;
    }
    needleAngle = me.startAngle + me.angle;
    var a = me.angle;


    /* within valid range */

    /*      me.degrees = me.unlimited
            ? a + me.block.offset
            : a >= 140 && a <= 180
            ? a - 140
            : a + 220;*/

    me.degrees = a;

    if (me.unlimited) {
      /* For dials such as Wind which rotate 360 */
      $d.addClass('p360');
    } else {
      var _startAngle = me.startAngle;
      var _degrees = me.degrees;
      if (me.splitdial) {
        /* For dials such as P1 Smart Meter which split left/right at 12 o'clock */
        /* This part creates the colored ring. Length of the ring depends on the value */
        /* startangle of 0 is at the top. degrees must be clockwise */
        /* that means in case degrees is negative then the new startangle = startangle + degrees*/
        /* and degrees must then be -degrees */
        if (a < 0) {
          _startAngle = me.startAngle + a;
          _degrees = -a
        }

        var transformStr = 'transform: translate(-50%, -50%) rotate(' + (_startAngle) + 'deg) !important';
        addStyleAttribute($d.find('.slice'), transformStr);
      }
      /* For tradditional dials that start at 7 o'clock */
      if (_degrees > 182) {
        /* right side*/
        $d.toggleClass('p180', true).removeClass('p0');
        $d.find('.bar').css({ webkitTransform: 'rotate(180deg)' });
        $d.find('.fill').css({
          webkitTransform: 'rotate(' + (_degrees - 4) + 'deg)',
        });
      }
      else {
        /* left side*/
        $d.toggleClass('p0', true).removeClass('p180');
        $d.find('.bar').css({
          webkitTransform: 'rotate(' + _degrees + 'deg)',
        });
      }


    }
    if (me.active) {
      me.value = angle2Value(me, needleAngle);
      var valueformat = number_format(me.value, choose(me.decimals, 1));
      $d.find('.value').text(valueformat);
    }

    if (me.isSetpoint) {
      if (me.value >= me.setpoint) {
        /* at or above setpoint */

        $d.find('.slice').addClass('primary').removeClass('secondary');
      } else {
        /* below setpoint */

        $d.find('.slice').addClass('secondary').removeClass('primary');
      }
    }

    //    $d.find('.info').text($d.data('info'));
    $(me.control).css({
      webkitTransform: 'rotate(' + (me.startAngle + me.degrees) + 'deg)',
    });

  }


  /**
   * Calculate value based on given angle.
   * @param {object} me  Core component object.
   * @param {number} angle  Needle angle (absolute value)
   */
  function angle2Value(me, angle) {
    /*
  From angle back to value is not trivial ...
  */
    var value = me.splitdial ? (angle - me.startAngle) / me.scale : (angle - me.startAngle) / me.scale + me.min;
    var steps = choose(me.block.steps, me.device.step);
    if(steps) {
      var divider=Math.round(value/steps);
      return divider*steps;
    }
    return Math.round(value * 10) / 10; //rounded to 1 decimal ... 
  }

  /**
   * Calculate degrees based on device range.
   * @param {object} me  Core component object.
   */
  function degrees(me) {
    var value;
    if (typeof me.needle !== 'undefined') {
      value = me.needle;
    } else {
      value = me.value;
    }
    value = (isDefined(me.min) && value < me.min) ? me.min : value;
    value = (isDefined(me.max) && value > me.max) ? me.max : value;

    var angle, startAngle;

    if (me.splitdial) {
      startAngle = -me.min * me.scale - 140;
      angle = value * me.scale;
    }
    else if (me.unlimited) {
      startAngle = 0;
      angle = (value - me.min) * me.scale;
    }
    else {
      startAngle = -140;
      angle = (value - me.min) * me.scale;
    }
    me.angle = angle;
    me.startAngle = startAngle;
    return;
    /*    
        var deg = (value - me.min) * me.scale;
        deg += me.splitdial || deg > 40 ? -220 : 140;
        return deg;
        */
  }

  /**
   * Rotation has stopped, update the device.
   * @param {object} me  Core component object.
   */
  function stop(me) {
    me.devices.forEach(function (idx) {
      Domoticz.release(idx);
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
    update(me);
    return (DT_dial.active = false);
  }

  /**
   * Update device with new values post rotation.
   * @param {object} me  Core component object.
   */
  function update(me, src) {
    var setpointType = me.type; //default assumption
    var idx = me.setpointDevice || me.idx;
    var maxdim = me.maxdim;
    if (me.setpointDevice && ('onoff'!==src)) {
      var d = Domoticz.getAllDevices(idx);
      switch (true) {
        case isDefined(d.Level):
          setpointType = 'dim';
          maxdim = isDefined(d.MaxDimLevel) ? parseInt(d.MaxDimLevel) : 100;
          break;
        case isDefined(d.SetPoint):
          setpointType = 'stat';
      }
    }
    if (me.steps) {
      var divider=Math.round(me.value/me.steps);
      me.value = divider*me.steps;
    }
    switch (setpointType) {
      case 'zone':
        switchEvoZone(me, me.setpoint, me.override);
        break;
      case 'stat':
        switchThermostat(me, me.value);
        break;
      case 'dim':
      case 'blinds':
        var level = (maxdim / me.max) * me.value;
        if (level < 1) level = 0;
        if (level > maxdim - 1) level = maxdim;
        slideDevice(me, idx, Math.round(level));
        break;
      case 'onoff':
        if (me.block.idx) switchDevice(me, me.cmd);
        break;
      case 'default':
        if (me.isSetpoint) {
          var block = {};
          $.extend(block, me);
          if (me.setpointDevice) {
            block.idx = me.setpointDevice; //Force that the correct setpoint device is used.
            block.device = Domoticz.getAllDevices(me.setpointDevice);
          }
          switchThermostat(block, me.value);
        }
        break;
    }
  }

  function slideDevice(me, idx, level) {
    /*
          if (me.block.delay) {
          me.delayedFunction(function() {
            reqSlideDevice(idx, level)
          });
          me.device.Level = level;
          if (me.update) me.update(me);
          else make(me);
          return
        }
        */
    if (me.block.delay) {
      Domoticz.hold(idx);
      reqSlideDeviceAsync(idx, level)
      me.device.Level = level;
      if (me.update) me.update(me);
      else make(me);
      me.delayedFunction(function () {
        Domoticz.release(idx);
      }).then(function () {
        getDevices(true);
      });
      return
    }

    reqSlideDevice(idx, level).then(function () {
      getDevices(true);
    }).then(function () {
      if (me.slowDevice)
        me.device.Level = level;
      if (me.update) me.update(me);
      else make(me);
    });
  }

  /**
   * Create RGB and RBGA values for styling if block.color exists.
   * @param {object} me  Core component object.
   */
  function color(me) {
    if (isDefined(me.block.color)) {
      var c = me.$mountPoint
        .css('color', me.block.color)
        .css('color'); /* change all formats to rgb */
      me.color = c;
      me.rgba =
        c.split(',').length === 4
          ? c.replace(
            c.split(',')[3],
            '0.5)'
          ) /* already rgba, make 50% opaque */
          : c
            .replace(')', ', 0.5)')
            .replace('rgb', 'rgba'); /* convert rgb to rgba at 50% opaque*/
    } else {
      me.color = 'rgb(255, 165, 0)';
      me.rgba = 'rgba(255, 165, 0, 0.5)';
    }
    return;
  }

  /**
   * Ensure all dials are responsive based on column width on screen resize.
   * @param {object} me  Core component object.
   */
  function resize(me) {
    /* todo: temporarily disabled.
     * to prevent recreating and resubscribing to domoticz devices
    window.addEventListener(
      'resize',
      function() {
        run(me);
      },
      true
    );*/
  }

  /**
   * Displays the icon or image for the dial info.
   * @param {object} param    String or object from block config.
   * @param {number} index    Index of array if param is object.
   * @param {object} length   Length of array expected.
   * @param {object} fallback Default value to use if no block config.
   */
  function display(param, index, length, fallback) {
    return isDefined(param)
      ? isObject(param) && param.length === length
        ? param[index]
        : param
      : fallback;
  }

  /**
   * Configures the data for Evohome zones/hot water and thermostats.
   * @param {object} me  Core component object.
   */
  function heating(me) {
    me.type = me.device.Type === 'Heating' ? 'zone' : 'stat';
    me.unitvalue = _TEMP_SYMBOL;
    me.min = parseInt(choose(me.block.min, me.device.min, settings['setpoint_min'], 5));
    me.max = parseInt(choose(me.block.max, me.device.max, settings['setpoint_max'], 35));

    me.dialicon = display(me.block.dialicon, 0, 1, 'fas fa-calendar-alt');
    me.dialimage = display(me.block.dialimage, 0, 1, false);
    me.decimals=choose(me.block.decimals, 1);

    if(me.block.subtype==='updown') {
      makeUpDown(me);
    }

    /* EvoHome Zones */
    if (me.type === 'zone') {
      me.value = me.device.Temp;
      me.setpoint = me.isSetpoint ? me.device.SetPoint : 20;
      me.boost = parseInt(choose(settings['evohome_boost_zone'], 60));
      me.until = choose(me.device.Until, false);
      me.status = choose(me.device.Status, 'Auto');
      me.override = me.status === 'TemporaryOverride';
      me.demand = me.status !== 'HeatingOff' && me.value < me.setpoint;
      me.lastupdate =
        me.lastupdate && me.until
          ? moment(me.until).format(DT_dial.timeformat)
          : me.lastupdate;

      /* EvoHome Hot water */
      if (me.device.SubType === 'Hot Water') {
        me.active = false;
        me.type = 'dhw';
        me.state = me.device.State;
        me.min = choose(me.block.min, me.device.min, 20);
        me.max = choose(me.block.max, me.device.max, 60);
        me.setpoint = 40;
        me.demand = me.device.State === 'On';
        me.boost = parseInt(choose(settings['evohome_boost_hw'], 30));
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
        me.value = Domoticz.getAllDevices(me.block.temp).Temp;
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
  }

  /**
   * Configures the data for read only temperature devices.
   * @param {object} me  Core component object.
   */
  function temperature(me) {
    me.type = 'temp';
    me.active = false;
    me.min = choose(me.block.min, me.device.min, 5);
    me.max = choose(me.block.max, me.device.max, 35);
    me.value =
      typeof me.device['Temp'] !== 'undefined'
        ? me.device['Temp']
        : me.device['Data'];
    me.isSetpoint = true;
    me.setpoint = choose(me.block.setpoint, 20);
    me.unitvalue = choose(me.device.vunit, _TEMP_SYMBOL);
    me.decimals=choose(me.block.decimals, 1);

    if (typeof me.device.Humidity !== 'undefined') {
      me.info.push({
        icon: display(me.block.dialicon, 0, 2, 'fas fa-tint'),
        image: display(me.block.dialimage, 0, 2, false),
        data: me.device['Humidity'],
        decimals: 0,
        unit: '%',
      });
    }

    if (typeof me.device.Barometer !== 'undefined') {
      me.info.push({
        icon: display(me.block.dialicon, 1, 2, 'fas fa-cloud'),
        image: display(me.block.dialimage, 1, 2, false),
        data: me.device['Barometer'],
        decimals: 0,
        unit: 'hPa',
      });
    }
    return;
  }

  function defaultDial(me) {
    me.type = 'default';
    me.active = false;
    me.fixed = choose(me.block.fixed, false); //hide needle if fixed===true
    me.min = choose(me.block.min, 0);
    me.max = choose(me.block.max, 100);

    me.value = parseFloat(me.device[me.block.value]);
    me.decimals = me.block.decimals;
    me.setpoint = me.block.setpoint;
    var splitAllData = me.device.Data.split(',');
    var splitData = splitAllData[0].split(' ');
    me.unitvalue =
      me.block.unit || (splitData.length > 1 ? splitData[1] : undefined);
    if (!me.unitvalue && me.device.SubType == 'Percentage') me.unitvalue = '%';
    me.isSetpoint = true;
    me.label = me.block.label;
  }

  function addValues(me) {
    function getValueUnit(data) {
      var dataScale = data.scale || 1;
      if (typeof data.value==='undefined') {
        console.log('Invalid data ', data);
        return {
          value: '',
          unit: choose(data.unit, ''),
        };
      }
      if (typeof data.value === 'number') {
        return {
          value: data.value * dataScale,
          unit: data.unit,
        };
      }
      if (data.type && data.type === 'text') {
        return {
          value: data.value,
          unit: '',
        };
      }
      var res = data.value.split(' ');
      if (res.length) {
        var value = parseFloat(res[0]) * dataScale;
        var unit =
          typeof data.unit !== 'undefined'
            ? data.unit
            : res.length > 1
              ? res[1]
              : '';
        return {
          value: value,
          unit: unit,
        };
      } else {
        console.log('invalid dial data');
        return {
          value: 0,
          unit: data.unit,
        };
      }
    }

    function getValueInfo(device, id, preset) {
      var res = {};
      var inputData = {};

      if (typeof id === 'string') {
        inputData = {
          value: device[id],
          decimals: choose(preset.decimals, getDefaultFormatting(id).decimals),
          unit: choose(preset.unit, getDefaultFormatting(id).unit),
          label: preset.label,
        };
        if (!preset.showunit) inputData.unit = '';
      } else {
        inputData.value = device[id.value || 'Data']; //if value not defined use 'Data'
        inputData.unit = choose(
          id.unit,
          choose(preset.unit, getDefaultFormatting(id.value).unit)
        );
        inputData.decimals = choose(
          id.decimals,
          choose(preset.decimals, getDefaultFormatting(id.value).decimals)
        );
        inputData.scale = id.scale;
        res.icon = id.icon;
        res.image = id.image;
        res.label = choose(id.label, preset.label);
        if (!choose(id.showunit, preset.showunit)) inputData.unit = '';
        res.addClass = id.addClass;
      }
      var inputType = 0;
      if (device.SubType === 'Text' || device.SubType === 'Switch') {
        inputType = 'text';
      }
      inputData.type = id.type || inputType;
      var valueunit = getValueUnit(inputData);
      res.data = valueunit.value;
      res.dataFormat = number_format(res.data, inputData.decimals);
      res.unit = valueunit.unit;
      res.decimals = inputData.decimals;
      res.type = inputData.type;
      return res;
    }

    /* supported formats:
      values : [ 'Temp', 'Humidity']   array of strings
      values: [ { value: 'Temp', unit:'km', icon:'fa fa_bulb',image:'my_image'}]  array of objects.
    */
    if (!isDefined(me.min)) me.min = choose(me.block.min, 0);
    if (!isDefined(me.max)) me.max = choose(me.block.max, 100);
    if (me.block.values) {
      var defaultIdx = me.devices[0];

      if (Array.isArray(me.block.values)) {
        me.info = me.block.values.map(function (el) {
          var idx = defaultIdx;
          if (typeof el == 'object' && el.idx) {
            idx = el.idx;
          }
          var device = Domoticz.getAllDevices(idx);
          if (!device) {
            console.error('Device not existing: ', idx);
            Debug.log(
              Debug.ERROR,
              'Block ' + me.key + ': Non exisiting device ' + idx
            );
            return {
              data: 'unknown ' + idx,
              type: 'text',
            };
          }
          var valueInfo = getValueInfo(device, el, {
            decimals: me.block.decimals,
            unit: me.block.unit,
            showunit: choose(me.block.showunit, true),
            type: me.block.valuetype,
            label: me.block.label,
          });
          if (el.isSetpoint) {
            me.fixed = false;
            me.isSetpoint = true;
            me.active = true; //Dial can be used to set setpoint value
            me.setpointDevice = idx;
            me.setpoint = valueInfo.data;
            me.needle = valueInfo.data;
          }
          if (el.isNeedle) {
            //use needle, readonly (active = false)
            me.fixed = false;
            me.isSetpoint = true;
            me.active = false;
            me.setpointDevice = idx;
            me.setpoint = choose(me.block.setpoint, 0);
            /*
            The next two lines were the original lines
            I don't understand: value should not be overwritten
            However, probably it had a reason ...
             me.value = valueInfo.data;
             me.needle = me.value;
            */ 
            // Replaced with: 
            me.needle = valueInfo.data;

            me.splitdial = choose(choose(el.splitdial, me.block.splitdial), me.block.min < 0);
          }
          valueInfo.deviceStatus = device.deviceStatus || '';
          return valueInfo;
        });
      } else {
        console.error('values should be an array for ', me.block);
      }
    }

    if (me.splitdial) {
      me.class = me.value > 0 ? 'positive' : 'negative';
      me.slice = me.value > 0 ? 'splitdial-plus' : 'splitdial-minus';
    }

    me.lastupdate =
      me.block.last_update && me.device
        ? moment(me.device.LastUpdate).format(DT_dial.timeformat)
        : false;

    me.showunit = choose(me.block.showunit, !!me.unitvalue);
  }

  function wind(me) {

    var windUnit = me.block.windunit;
    if (DT_dial.settings) {
      var wind = ['m/s', 'km/h', 'mph', 'Knts', 'Bfrt'];
      windUnit = wind[DT_dial.settings.WindUnit] || 'm/s';
    }
    var defaultMax = {
      'm/s': 30,
      'km/h': 100,
      'mph': 50,
      'Knts': 50,
      'Bfrt': 10
    }
    
    me.type = 'wind';
    me.active=false;
    me.subdevice = true;
    me.setpoint = choose(me.block.setpoint, 15);
    me.isSetpoint = true;
    me.temp = me.device.Temp;
    me.decimals = choose(me.block.decimals, 0);
    me.shownumbers = choose(me.block.shownumbers, true);
    switch(me.block.subtype) {
      case 'windspeed':
        me.value = me.device.Speed;
        me.unitvalue = windUnit;
        me.max = choose(me.block.max, defaultMax[windUnit] || 100);
        break;
      case 'windgust':
        me.value = me.device.Gust;
        me.unitvalue = windUnit;
        me.max = choose(me.block.max, defaultMax[windUnit] || 100);
        break;
      default:  
        me.unlimited = true;
        me.max = 360;
        me.dialRange = 360;
        me.value = me.device.Direction;
//        me.value = (me.device.Direction + me.block.offset)%360;
        me.needle = (me.device.Direction + me.block.offset)%360;
        me.unitvalue = '°';
        me.segments = 12;
        me.numbers = [210, 240, 270, 300, 330, 0, 30, 60, 90, 120, 150, 180];
        me.startAngle = 0;
    }

    me.info.push(
      {
        icon: display(me.block.dialicon, 0, 3, 'fas fa-location-arrow'),
        image: display(me.block.dialimage, 0, 3, false),
        data: TranslateDirection(me.device.DirectionStr),
        unit: '',
      },
      {
        icon: display(me.block.dialicon, 1, 3, 'fas fa-wind'),
        image: display(me.block.dialimage, 1, 3, false),
        data: me.device.Speed,
        unit: windUnit,
      },
      {
        icon: display(me.block.dialicon, 2, 3, 'fas fa-thermometer-half'),
        image: display(me.block.dialimage, 0, 3, false),
        data: me.device.Temp,
        unit: _TEMP_SYMBOL,
      }
    );

    //new layout of wind sensor
    if (me.block.layout == 1) {
      me.needle = (me.device.Direction + me.block.offset) % 360;
      me.value = me.device.Speed;
      me.unitvalue = windUnit;
      me.info.length = 0;
      me.info.push(
        {
          icon: display(me.block.dialicon, 0, 3, 'fas fa-location-arrow'),
          image: display(me.block.dialimage, 0, 3, false),
          data: me.device.DirectionStr,
          unit: '',
        },
        {
          image: display(me.block.dialimage, 1, 3, false),
          data: me.device.Direction,
          unit: '°',
        },
        {
          icon: display(me.block.dialicon, 2, 3, 'fas fa-thermometer-half'),
          image: display(me.block.dialimage, 0, 3, false),
          data: me.device.Temp,
          unit: _TEMP_SYMBOL,
        }
      );
    }
    return;
  }

  /**
   * Configures the data for Evohome controllers.
   * @param {object} me  Core component object.
   */
  function control(me) {
    me.select = '#' + me.id + ' .status';
    me.controller = true;

    me.fixed = true;
    if (me.device.SubType === 'Evohome') {
      me.type = 'evo';
      me.status = me.device.Status;
      me.options = [
        { val: 'Auto', text: language.evohome.Auto },
        { val: 'AutoWithEco', text: language.evohome.AutoWithEco },
        { val: 'Away', text: language.evohome.Away },
        { val: 'Custom', text: language.evohome.Custom },
        { val: 'DayOff', text: language.evohome.DayOff },
        { val: 'HeatingOff', text: language.evohome.HeatingOff },
      ];
    } else {
      me.type = 'selector';
      me.status = me.device.Level;
      me.options = [];
      var levelNames = atob(me.device.LevelNames).split('|');
      $.each(levelNames, function (index, value) {
        me.options.push({ val: index * 10, text: value });
      });
      if(me.block.sortOrder) {
        me.options.sort(function(a,b) {
          return a.text.localeCompare(b.text)*me.block.sortOrder;
        })
      }
  
    }
    me.title=false; //default no title for controller device
    return;
  }

  /**
   * Configures the data for devices of dimmer switchtype.
   * @param {object} me  Core component object.
   */
  function dimmer(me) {
    me.type = 'dim';
    me.min = choose(me.block.min, 0);
    me.max = choose(me.block.max, 100);
    me.decimals = choose(me.block.decimals, 0);
    me.value = getCurrentValueDim(me);
    me.demand = me.value > 0;
    me.maxdim = isDefined(me.device.MaxDimLevel)
      ? parseInt(me.device.MaxDimLevel)
      : 100;
    me.segments = 11;
    if (isDefined(me.block.setpoint)) {
      me.setpoint = me.block.setpoint;
      me.isSetpoint = true;
    }
    me.unitvalue = choose(me.block.unit, '%');
    me.switchMode = capitalizeFirstLetter(me.block.switchMode);
    me.rgbContainer = '.dial-display';
    if(me.block.subtype==='updown') makeUpDownDim(me);
    return;
  }

  /**
   * Configures the data for devices of on/off switchtype.
   * @param {object} me  Core component object.
   */
  function onoff(me) {
    me.type = 'onoff';
    me.fixed = true;
    me.onoff = true;
    me.backgroundselector='.switch-face';

    var switchMode = capitalizeFirstLetter(me.block.switchMode);
    if (me.device) {
      if (me.device.Type === 'Scene') me.switchMode = 'On';
      if (me.device.subType === 'Push On Button') me.switchMode = 'On';
      if (me.device.subType === 'Push Off Button') me.switchMode = 'Off';
    }
    switch (switchMode) {
      case 'On':
      case 'Off':
        me.switchMode = switchMode;
        break;
      default:
        me.switchMode = me.switchMode || 'Toggle';
    }

    me.state =
      (me.device && me.device.Status) ||
      (me.switchMode === 'Toggle' ? 'Off' : me.switchMode);
    me.demand = me.state === 'On';
    me.checked = me.state === 'On' ? 'checked' : '';
    return;
  }

  function makeBlinds(me) {
    me.type = 'blinds';
    me.tpl = 'dialblinds';
    me.fixed = true;
    me.active = false;
    me.tap = tapBlinds;
    me.update = updateBlinds;
    me.percentage = me.device.SwitchType.includes('Percentage');
    me.inverted = me.device.SwitchType.includes('Inverted');
    if(Domoticz.info.newBlindsBehavior) me.inverted=!me.inverted;
    me.value = valueBlinds(me);
    me.maxdim = isDefined(me.device.MaxDimLevel)
    ? parseInt(me.device.MaxDimLevel)
    : 100;
    me.unitvalue='%';
    me.invertedValue = choose(me.block.inverted,!me.inverted)
    me.slowDevice = true;
    me.styleStatus = me.block.styleStatus;
    me.backgroundselector='.blinds';
    
    if(me.block.subtype==="updown") {
      makeUpDownDim(me);
      me.middleToggle = false;
    }
    return;
  }

  function makeUpDown(me) {
//    me.type = 'updown';
    me.tpl = 'dialblinds';
    me.fixed = true;
    me.active = false;
    me.tap = tapUpDown;
    me.update = updateUpDown;
    me.textUp = choose(me.block.textUp, '+');
    me.textDown = choose(me.block.textDown, '-');
    me.steps = choose(me.block.steps, me.device.step, 0.5);
    me.checkNeedlePos = false;
    me.getCurrentValue = getCurrentValue;
    me.backgroundselector='.blinds';

//    me.percentage = me.device.SwitchType.includes('Percentage');
//    me.inverted = me.device.SwitchType.includes('Inverted');
//    me.value = valueBlinds(me);
    me.$mountPoint.addClass('dialupdown');
    return;
  }

  function makeUpDownDim(me) {
    makeUpDown(me);
    me.steps = choose(me.block.steps, 10);
    me.getCurrentValue = getCurrentValueDim;
    me.middleToggle = choose(me.block.middletoggle,true);
    me.rgbContainer = '.middle';
  }

  function tapUpDown(me) {
    me.$up.on('click', function () {
      if(me.value===0 && me.device.Level) me.value=me.device.Level
      else me.value=me.invertedValue? me.value-me.steps:me.value+me.steps;
      if (isDefined(me.block.max) && me.value > me.block.max) me.value=me.block.max;
      update(me);
    });
    me.$middle.on('click', function () {
      if(me.switchMode==='Color') return;
      if(me.middleToggle) {
        var cmd = me.value? 'off':'on';
        switchDevice(me, cmd)
        //        me.value = me.value? 0 : (me.device.Level || 100);
//        update(me);
      }
      else
      Domoticz.request(
        'type=command&param=switchlight&idx=' +
        me.block.idx +
        '&switchcmd=' +
        'Stop'
      )


    });
    me.$down.on('click', function () {
      me.value=me.invertedValue? me.value+me.steps:me.value-me.steps
      if (isDefined(me.block.min) && me.value < me.block.min) me.value=me.block.min;
      update(me)
    });
  }

  function updateUpDown(me) {
    if(!me.$up) {
      me.$up = me.$mountPoint.find('.up');
      me.$down = me.$mountPoint.find('.down');
      me.$middle = me.$mountPoint.find('.middle');  
    }

    me.value = me.getCurrentValue(me);

    me.$middle.find('.value').html(valueUpDown(me));
    if(me.styleStatus) addDemandClass(me);
  }

  function getCurrentValue(me) {
    var value;
    if (me.isSetpoint) {
      me.setpoint = parseFloat(me.device.SetPoint);
      value = me.setpoint;
    }
    if (isDefined(me.block.temp)) {
      me.temp = Domoticz.getAllDevices(me.block.temp).Temp;
      me.info.push({
        icon: 'fas fa-calendar-alt',
        data: me.setpoint,
        unit: _TEMP_SYMBOL,
      });

    }
    else value = parseFloat(me.device.Data);
    return value

  }

  function getCurrentValueDim(me) {
    return me.device.Data === 'Off'
    ? 0
    : me.device.Level > me.max - 1
      ? me.max
      : me.device.Level < me.min + 1
        ? me.min
        : me.device.Level;
  }

  function valueUpDown(me) {
    if (isDefined(me.block.temp)) {
      var firstNumber, secondNumber;
      if (me.block.setpointfirst) {
        firstNumber = me.setpoint;
        secondNumber = me.temp;
      }
      else {
        firstNumber = me.temp;
        secondNumber = me.setpoint;
      }
      return ''+number_format(firstNumber, me.decimals) + me.unitvalue +'&nbsp; <em class="icon ' + me.dialicon + '"></em>&nbsp;' + number_format(secondNumber,me.decimals) + me.unitvalue;
      /* Standard thermostat device */
    }
    var value = me.invertedValue ? me.maxdim-me.value: me.value;
    var iconEl = me.block.dialicon ? '<em class="icon ' + me.block.dialicon + '"></em>&nbsp;':'';
    return iconEl + number_format(value,me.decimals) + me.unitvalue;
}

  function tapBlinds(me) {
    var $mountPoint = me.$mountPoint;
    me.$up = $mountPoint.find('.up');
    me.$down = $mountPoint.find('.down');
    me.$middle = $mountPoint.find('.middle');
    me.$up.on('click', function () {
      $(this).addClass('selected');
      me.$down.removeClass('selected');
      var cmd = me.inverted ? 'on' : 'off';
      var level = me.inverted ? 100 : 0;
      me.percentage ? slideDevice(me, me.block.idx, level) : switchDevice(me, cmd);
    });
    me.$down.on('click', function () {
      $(this).addClass('selected');
      me.$up.removeClass('selected');
      var cmd = me.inverted ? 'off' : 'on';
      var level = me.inverted ? 0 : 100;
      me.percentage ? slideDevice(me, me.block.idx, level) : switchDevice(me, cmd);
    });
    me.$middle.on('click', function () {
      me.$up.removeClass('selected');
      me.$down.removeClass('selected');
      Domoticz.request(
        'type=command&param=switchlight&idx=' +
        me.block.idx +
        '&switchcmd=' +
        'Stop'
      )
    });
  }

  function updateBlinds(me) {
    if(!me.$up) {
      me.$up = me.$mountPoint.find('.up');
      me.$down = me.$mountPoint.find('.down');
      me.$middle = me.$mountPoint.find('.middle');
    }
    if(me.styleStatus) addDemandClass(me);
    me.$middle.find('.value').html(valueBlinds(me));
  }

  function addDemandClass(me) {
    me.previousDemand = me.demand;
    me.demand=getIconStatusClass(me.device.Status);
    if(me.previousDemand!==me.demand) {
      me.$mountPoint.find('.dial-center').removeClass(me.previousDemand).addClass(me.demand);
    }

  }

  function valueBlinds(me) {
    if (me.device.Status == 'Open' || me.device.Status === 'Closed')
      return me.device.Status;
    switch (me.device.Level) {
      case 0: return 'Open';
      case 100: return 'Closed';
      default: return (me.invertedValue? me.maxdim-me.device.Level:me.device.Level)+me.unitvalue;
    }
  }

  function mapEnergySubtype(subtype) {
    var energySubtypeMapping = {
      'usage': 1
    };
    if (isFinite(subtype)) return 0+subtype;
    if (typeof subtype !== 'string') return 0;
    return energySubtypeMapping[subtype.toLowerCase()]||0;
  }

  function getEnergyFields(subtype) {
    var fields = {
      0: {
        primPos:"CounterToday",
        primNeg: "CounterDelivToday",
        primUnit: "kWh",
        primMax: 10,
        primDecimals: 1,
        secPos: "Usage",
        secNeg: "UsageDeliv",
        secUnit: "W"
      },
      1: {
        primPos: "Usage",
        primNeg: "UsageDeliv",
        primUnit: "W",
        primMax: 500,
        primDecimals: 0,
        secPos: "CounterToday",
        secNeg: "CounterDelivToday",
        secUnit:"kWh"
      }
    }
    return fields[mapEnergySubtype(subtype)];
  }
  /**
   * Configures the data for devices of P1 Smart Meter and General/kWh type.
   * @param {object} me  Core component object.
   */
  function p1smartmeter(me) {
    var defaultMin = 0;
    var defaultMax = 20;
    var defaultDecimals = 0;
    me.shownumbers = choose(me.block.shownumbers, true);
    me.type = 'p1';
    me.active = false;
    if (me.device.SubType == 'Gas') {
      me.value = parseFloat(me.device.CounterToday);
      me.unitvalue = 'm3';
      defaultDecimals = 3;
    } else {
      var fieldObj = getEnergyFields(me.block.subtype);
      defaultMax = fieldObj.primMax;
      me.value = parseFloat(me.device[fieldObj.primPos]);
      if(fieldObj.primNeg in me.device) {
        me.value = me.value-parseFloat(me.device[fieldObj.primNeg]);
        defaultMin = -fieldObj.primMax;
      }
      me.unitvalue = fieldObj.primUnit;
      me.subdevice = true;

      if(fieldObj.secNeg in me.device) {
        me.info.push(
          {
            icon: display(me.block.dialicon, 0, 2, 'fas fa-sun'),
            image: display(me.block.dialimage, 0, 2, false),
            data: parseFloat(me.device[fieldObj.secNeg]),
            unit: fieldObj.secUnit,
          }
        );
      }
      //In case no delivery field, and inverted is true, then the secondary value should also be negative
      var invertedValue = me.block.inverted &&  !(fieldObj.secNeg in me.device) ? -1:1; 
      if(fieldObj.secPos in me.device) {
        me.info.push(
          {
            icon: display(me.block.dialicon, 1, 2, 'fas fa-bolt'),
            image: display(me.block.dialimage, 1, 2, false),
            data: invertedValue * parseFloat(me.device[fieldObj.secPos]),
            unit: fieldObj.secUnit,
          }
        );
        }
        defaultDecimals = fieldObj.primDecimals;
      
    }
    if(me.block.inverted) {
      me.value=-me.value;
      if (defaultMin===0) defaultMin = -defaultMax;
    }
    me.min = choose(me.block.min, defaultMin);
    me.max = choose(me.block.max, defaultMax);
    me.decimals = choose(me.block.decimals, defaultDecimals);
    return;
  }

  function text(me) {
    me.type = 'text';
    me.value = me.device.Data; //number_format(me.device.Data, 1);
    me.isSetpoint = false;
    me.active = false;
    me.fixed = true;
    me.block.graph = false;
    me.lastupdate = !me.block.last_update
      ? false
      : moment(me.device.LastUpdate).format(DT_dial.timeformat);
    return;
  }

  /**
   * Create the numbers for the dial face.
   * @param {object} me  Core component object.
   */
  function numbers(me) {
    var x = me.min;
    var numbers = [];
    me.increment = (me.max - me.min) / (me.segments - 1);
    var decimals = (me.increment < 5 && me.increment % 1 > 0.05) ? 1 : 0;
    for (var i = 0; i < me.segments; i++) {
      numbers.push(number_format(x, decimals));
      x += me.increment;
    }
    return numbers;
  }

  function getDefaultFormatting(field) {
    var defaultFormatting = {
      Humidity: {
        decimals: 0,
        unit: '%',
      },
      Barometer: {
        decimals: 0,
        unit: 'hPa',
      },
      Status: {
        type: 'text',
      },
      Level: {
        decimals: 0,
        unit: '',
      },
    };

    return defaultFormatting[field] || { decimals: 0 };
  }
})();

Dashticz.register(DT_dial);
//# sourceURL=js/components/dial.js
