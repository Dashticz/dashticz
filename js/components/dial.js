/* global settings Domoticz Dashticz moment _TEMP_SYMBOL*/
var DT_dial = {
  name: 'dial',

  /**
   * Checks whether the block can be handled by this component.
   * @param {object} block  User specified block config.
   * @param {string} key    identifier used for block selection.
   */
  canHandle: function (block, key) {
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
    this.timeformat = isDefined(settings['timeformat'])
      ? settings['timeformat']
      : 'HH:mm, DD/MM/YY';

    document.addEventListener(
      'touchstart',
      function () {
        DT_dial.isTouch = true;
      },
      { passive: false }
    );
  },
  defaultCfg: {
    title: false,
    width: 3,
  },

  /**
   * Called once the component has been intialised and mounted in DOM.
   * @param {object} me  Core component object.
   */
  run: function (me) {
    me.idx = isDefined(me.block.idx) ? me.block.idx : me.key;
    me.block.idx = me.idx; /* required for existing functions */
    me.id = 'dial_' + me.idx;
    me.height = isDefined(me.block.height)
      ? parseInt(me.block.height)
      : parseInt($(me.mountPoint + ' div').css('width'));
    me.fontsize = 0.8 * me.height;
    me.dialRange = 280;
    me.active = true;
    DT_dial.color(me);

    Domoticz.subscribe(me.idx, true, function (device) {
      me.device = device;
      me.isSetpoint = isDefined(me.device.SetPoint);
      me.lastupdate = moment(me.device.LastUpdate).format(DT_dial.timeformat);
      DT_dial.make(me);
    });
  },

  /**
   * Creates or updates the dial and applies current values.
   * @param {object} me  Core component object.
   */
  make: function (me) {
    DT_dial.resize(me);

    if (
      me.device.Type === 'Heating' ||
      me.device.Type === 'Thermostat' ||
      me.device.SubType === 'SetPoint'
    ) {
      DT_dial.heating(me);
    }
    if (me.device.SubType === 'Evohome') {
      DT_dial.control(me);
    }
    if (me.device.SwitchType === 'Dimmer') {
      DT_dial.dimmer(me);
    }

    templateEngine.load('dial').then(function (template) {
      var dataObject = {
        id: me.id,
        size: me.size,
        name: me.block.title ? me.block.title : me.device.Name,
        min: me.min,
        max: me.max,
        type: me.device.Type,
        value: me.value,
        hasSetpoint: me.isSetpoint,
        setpoint: me.setpoint,
        until: me.until,
        status: me.status,
        override: me.override,
        on: me.demand ? 'on' : 'off',
        controller: me.type === 'evo',
        unit: _TEMP_SYMBOL,
        lastupdate: me.lastupdate,
        color: me.color,
        rgba: me.rgba,
        fontsize: me.fontsize,
        needleL: me.height / 2,
        needleW: me.height / 17,
      };

      /* Mount dial */
      var $mount = $(me.mountPoint + ' .dt_content');
      $mount.html(template(dataObject));
      $mount.addClass('swiper-no-swiping');
      $(me.mountPoint + ' .dt_block').css('height', me.height + 'px');
      if (me.type === 'evo') $(me.select).val(me.status);

      /* Add dial calculations */
      me.body = $(me.mountPoint + ' .dt_content .dial');
      me.min = me.body.data('min');
      me.max = me.body.data('max');
      me.scale = me.dialRange / (me.max - me.min);
      me.value = me.body.data('value');
      me.angle = DT_dial.degrees(me);
      me.control = me.body.find('.dial-needle');

      DT_dial.tap(me);
      DT_dial.listen(me);
      DT_dial.rotate(me);
    });
  },

  /**
   * Provides interaction with the dial via tap.
   * @param {object} me  Core component object.
   */
  tap: function (me) {
    var d = document.getElementById(me.id);
    var mc = new Hammer(d);

    mc.on('tap', function (ev) {
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
      if (me.type === 'evo') {
        var status = $(me.select).find(':selected').val();
        me.device.Status = status;
        changeEvohomeControllerStatus(me, status);
      }
    });
  },

  /**
   * Listen for all dial needle rotation by the user.
   * @param {object} me  Core component object.
   */
  listen: function (me) {
    if (me.active) {
      ['mousedown', 'touchstart'].forEach(function (e) {
        me.control[0].addEventListener(e, DT_dial.start, { passive: false });
      });
      me.body
        .bind('mousedown touchstart', function (event) {
          Domoticz.hold(me.idx);
        })
        .bind('mousemove touchmove', function (event) {
          if (DT_dial.active) {
            DT_dial.isTouch && event.targetTouches
              ? DT_dial.angle(me, event.targetTouches[0])
              : DT_dial.angle(me, event);
          }
          return false;
        })
        .bind('mouseup touchend mouseleave', function (event) {
          if (DT_dial.active) DT_dial.stop(me);
        });
    }
  },

  /**
   * Start of dial needle rotation, set active.
   * @param {object} e  The touch or mouse event.
   */
  start: function (e) {
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
  angle: function (me, e) {
    var x =
      DT_dial.isTouch && e.touches && e.touches.length
        ? e.touches[0].clientX - DT_dial.center.x
        : e.clientX - DT_dial.center.x;
    var y =
      DT_dial.isTouch && e.touches && e.touches.length
        ? e.touches[0].clientY - DT_dial.center.x
        : e.clientY - DT_dial.center.y;
    me.angle = DT_dial.R2D * Math.atan2(y, x);
    DT_dial.rotate(me);
  },

  /**
   * Apply rotation and styling, updating value.
   * @param {object} me  Core component object.
   */
  rotate: function (me) {
    var $d = $(me.body);
    var a = me.angle;

    if ((a >= -180 && a <= 60) || (a >= 140 && a <= 180)) {
      /* within valid range */

      me.degrees = a >= 140 && a <= 180 ? a - 140 : a + 220;

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

      me.value = Math.round(me.min + me.degrees / me.scale);

      if (me.isSetpoint) {
        if (me.value >= me.setpoint) {
          /* at or above setpoint */

          $d.find('.bar').addClass('primary').removeClass('secondary');
          $d.find('.fill').addClass('primary').removeClass('secondary');
        } else {
          /* below setpoint */

          $d.find('.bar').addClass('secondary').removeClass('primary');
          $d.find('.fill').addClass('secondary').removeClass('primary');
        }
      }

      $d.find('.value').text(me.value).data('value', me.value);
      $d.find('.info').text($d.data('info'));
      $(me.control).css({
        webkitTransform: 'rotate(' + (-140 + me.degrees) + 'deg)',
      });
    }
  },

  /**
   * Calculate degrees based on device range.
   * @param {object} me  Core component object.
   */
  degrees: function (me) {
    var deg = me.value * me.scale;
    deg = deg > 40 ? (deg += -220) : (deg += 140);
    return deg - me.min * me.scale;
  },

  /**
   * Rotation has stopped, update the device.
   * @param {object} me  Core component object.
   */
  stop: function (me) {
    Domoticz.release(me.idx);
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
  update: function (me) {
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
    }
  },

  /**
   * Create RGB and RBGA values for styling if block.color exists.
   * @param {object} me  Core component object.
   */
  color: function (me) {
    if (isDefined(me.block.color)) {
      var c = $(me.mountPoint)
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
  },

  /**
   * Ensure all dials are responsive based on column width on screen resize.
   * @param {object} me  Core component object.
   */
  resize: function (me) {
    window.addEventListener(
      'resize',
      function () {
        DT_dial.run(me);
      },
      true
    );
  },

  /**
   * Configures the data for Evohome zones/hot water and thermostats.
   * @param {object} me  Core component object.
   */
  heating: function (me) {
    me.type = me.device.Type === 'Heating' ? 'zone' : 'stat';
    me.min = isDefined(settings['setpoint_min']) ? settings['setpoint_min'] : 5;
    me.max = isDefined(settings['setpoint_max'])
      ? settings['setpoint_max']
      : 35;

    if (me.type === 'zone') {
      me.value = me.device.Temp;
      me.setpoint = me.isSetpoint ? me.device.SetPoint : 20;
      me.boost = isDefined(settings['evohome_boost_zone'])
        ? settings['evohome_boost_zone']
        : 60;
      me.until = isDefined(me.device.Until) ? me.device.Until : false;
      me.status = isDefined(me.device.Status) ? me.device.Status : 'Auto';
      me.override = me.status === 'TemporaryOverride';
      me.demand = me.status !== 'HeatingOff' && me.value < me.setpoint;
      me.lastupdate = me.until
        ? moment(me.until).format(DT_dial.timeformat)
        : me.lastupdate;

      if (me.device.SubType === 'Hot Water') {
        me.active = false;
        me.type = 'dhw';
        me.state = me.device.State;
        me.min = 20;
        me.max = 60;
        me.setpoint = 40;
        me.demand = me.device.State === 'On';
        me.boost = isDefined(settings['evohome_boost_hw'])
          ? settings['evohome_boost_hw']
          : 30;
      }
    } else {
      me.value = number_format(me.device.Data, 1);
      me.isSetpoint = false; //Domoticz standard Thermostat device only has one value (Setpoint=Data)
      me.lastupdate = me.lastupdate;
    }
    return;
  },

  /**
   * Configures the data for Evohome controllers.
   * @param {object} me  Core component object.
   */
  control: function (me) {
    me.type = 'evo';
    me.select = '#' + me.id + ' .evostatus';
    me.status = me.device.Status;
  },

  /**
   * Configures the data for devices of dimmer switchtype.
   * @param {object} me  Core component object.
   */
  dimmer: function (me) {
    me.type = 'dim';
    me.min = 0;
    me.max = 100;
    me.value =
      me.device.Data === 'Off'
        ? 0
        : me.device.Level > me.max * 0.95
        ? me.max
        : me.device.Level < me.max * 0.05
        ? me.min
        : me.device.Level;
    me.demand = me.value > 0;
    me.maxdim = isDefined(me.device.MaxDimLevel)
      ? parseInt(me.device.MaxDimLevel)
      : 100;
    return;
  },
};
Dashticz.register(DT_dial);
//# sourceURL=js/components/dial.js
