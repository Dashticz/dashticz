/* global templateEngine iro Popper Domoticz*/
/*

/* Color info
/json.htm?type=command&param=setcolbrightnessvalue&idx=130&color={"m":3,"t":0,"r":0,"g":0,"b":50,"cw":0,"ww":0}&brightness=100
Example: color={"m":3,"t":0,"r":0,"g":0,"b":50,"cw":0,"ww":0}

   ColorMode {
   	ColorModeNone = 0,   // Illegal
   	ColorModeWhite = 1,  // White. Valid fields: none
   	ColorModeTemp = 2,   // White with color temperature. Valid fields: t
   	ColorModeRGB = 3,    // Color. Valid fields: r, g, b.
   	ColorModeCustom = 4, // Custom (color + white). Valid fields: r, g, b, cw, ww, depending on device capabilities
   	ColorModeLast = ColorModeCustom,
   };
   
   Color {
   	ColorMode m;
   	uint8_t t;     // Range:0..255, Color temperature (warm / cold ratio, 0 is coldest, 255 is warmest)
   	uint8_t r;     // Range:0..255, Red level
   	uint8_t g;     // Range:0..255, Green level
   	uint8_t b;     // Range:0..255, Blue level
   	uint8_t cw;    // Range:0..255, Cold white level
   	uint8_t ww;    // Range:0..255, Warm white level (also used as level for monochrome white)
   }




*/
function Colorpicker(options) {
  this.options = options;
  this.container = options.container ? options.container : 'body';
  this.index = Colorpicker.prototype.count++;
  this.block = options.block;
  this.switchType = options.block.switchType || this.block.device.SubType;
  this.ref = 'colorpicker' + this.index;
  this.changed = false;
  this.requesting = false;
  //    $(this.container).attr('data-toggle','modal');
  //    $(this.container).attr('data-target', '#'+this.ref);

  $(this.container).on('click', this, this.clickHandler.bind(this));
  /*
    $('#'+this.ref).on('show.bs.modal', function (event) {
        //return false;
        ev.stopPropagation
    });*/

  var color = this.block.device.Color
    ? JSON.parse(this.block.device.Color)
    : { r: 255, g: 255, b: 255, m: 3 };
  if (color) {
    var thergb;
    switch (color.m) {
      case 1:
        thergb = '#FFFFFF';
        break;
      case 2:
        thergb = '#FFFFFF';
        if (typeof color.t !== 'undefined') thergb = temp2rgb(color.t, true);
        break;
      default:
        thergb = "'rgb(" + color.r + ',' + color.g + ',' + color.b + ")'";
    }
    $(this.container + ' .sp-preview-inner').css('background-color', thergb);
  }
}

function temp2rgb(temp, asString) {
  /*** temp=255 means very warm, so very red
   *
   */
  var r = 255,
    g = 255,
    b = 255;
  var adj;
  if (temp < 128) {
    adj = (128 - temp) / 2;
    r = r - adj;
    g = g - adj;
  }
  if (temp > 128) {
    adj = (temp - 128) / 2;
    g = g - adj;
    b = b - adj;
  }
  return asString ? 'rgb(' + r + ',' + g + ',' + b + ')' : { r: r, g: g, b: b };
}

Colorpicker.prototype.count = 0;

Colorpicker.prototype.buttonDef = {
  RGB: { mode: 3, img: 'img/RGB48.png', text: 'RGB<br>' },
  WW: { mode: 2, img: 'img/Coltemp48.png', text: 'White<br>' },
  WZ: { mode: 4, img: 'img/Customww48.png', text: 'Mixed<br>' },
  WWZ: { mode: 4, img: 'img/Customww48.png', text: 'Mixed<br>' },
  W: { mode: 1, img: 'img/White48.png', text: 'White<br>' },
  White: { img: 'img/coldwarm.jpg', text: 'White<br>' },
};

var buttonList = {
  RGB: ['RGB'], //Normal RGB
  RGBW: ['RGB', 'W'], //RGB mode or White modes
  RGBWW: ['RGB', 'WW'], //RGB modes, WW/CW slider
  RGBWZ: ['RGB', 'W', 'WZ'], //
  RGBWWZ: ['RGB', 'WW', 'WWZ'], //
  RGBZ: ['RGB', 'WZ'],
  WW: ['WW'],
};

Colorpicker.prototype.dimmerTypes = Object.keys(buttonList);

Colorpicker.prototype.clickHandler = function (ev) {
  this.mode = 1;

  var myButtons = {};

  var buttonSelection = buttonList[this.switchType];
  var self = this;

  if (buttonSelection) {
    buttonSelection.forEach(function (def) {
      myButtons[def] = Colorpicker.prototype.buttonDef[def];
    });
  } else myButtons['RGB'] = this.buttonDef['RGB'];

  var device = ev.data.block.device;

  this.state = {};
  this.state.status = device.Status;

  this.id = ev.data.ref;

  templateEngine.load('colorpicker').then(function (template) {
    var data = {};
    data.id = self.id;
    data.title = ev.data.block.title;
    data.isOn = self.state.status !== 'Off';
    data.isOff = !data.isOn;

    var currentColor = {
      r: 0,
      g: 0,
      b: 0,
    };

    var currentTemp = 128;
    var maxDimLevel = parseInt(device.MaxDimLevel) || 100;
    var currentLevel = 100;
    var mode = 3;
    if (typeof device.Level !== 'undefined') {
      currentLevel = parseInt(device.Level);
    }
    var whiteLevel = currentLevel;

    if (device.Color) {
      var devColor = JSON.parse(device.Color);
      if (devColor.r) {
        currentColor = {
          r: devColor.r,
          g: devColor.g,
          b: devColor.b,
        };
      }
      /*device.Color.m:
        1: White modes
        2: CWWW modes. color.t gives color temperature (0-255). 0: max cold 255: max warm. (color.cw+color.ww=255). Slider sets Level
        3: RGB modes
        4: combined mode. device.Level is master level. RGB values determine RGB lights. white level sets sum (color.cw+color.ww) based on t.
        */

      mode = parseInt(devColor.m);
      if (devColor.t) currentTemp = devColor.t;

      whiteLevel = devColor.ww + devColor.cw;
    }
    var modes = [
      undefined,
      'W',
      'WW',
      'RGB',
      self.switchType === 'RGBWZ' ? 'WZ' : 'WWZ',
    ];
    data.mode = modes[mode];
    if (data.mode === 'WZ' && device.Color) whiteLevel = devColor.ww;

    data.headerButtons = myButtons;
    data.switchButtons = {
      On: {
        text: 'On',
      },
      Off: {
        text: 'Off',
      },
    };

    data.iro = {
      iroRGB: {
        text: 'RGB',
      },
      iroRGBZ: {
        text: 'RGB',
      },
      iroTemp: {
        text: 'Temp',
      },
      iroWhite: {
        text: 'White',
      },
      iroMaster: {
        text: 'Level',
      },
    };

    //Activate the On state
    if (data.isOn && data.switchButtons['On'])
      data.switchButtons['On'].active = true;
    if (data.isOff && data.switchButtons['Off'])
      data.switchButtons['Off'].active = true;

    $('body').append(template(data));

    $('#' + self.id + ' .cp-buttons').on('change', function () {
      var thisBtn = $(this);
      var radioValue = thisBtn.find('input:checked').data('item');
      self.setState(radioValue);
    });

    var el = $('#' + self.id);
    //    el.find('.modal-body').html(ev.data.idx);
    el.on('hidden.bs.modal', function () {
      $(this).data('bs.modal', null);
      self.popper.destroy();
      self.popper = null;
      el.remove();
    });

    el.modal({
      show: false,
    });

    self.comp = {};

    self.installIROComp(
      {
        color: currentColor,
        layoutDirection: 'horizontal',
        //layoutDirection: 'vertical',
        layout: [
          {
            component: iro.ui.Wheel,
          },
        ],
      },
      'RGB'
    );

    self.comp['RGB'].color.value = 100;

    self.installIROComp(
      {
        color: currentColor,
        layoutDirection: 'horizontal',
        //layoutDirection: 'vertical',
        layout: [
          {
            component: iro.ui.Wheel,
          },
          {
            component: iro.ui.Slider,
            options: {
              sliderType: 'value', // can also be 'saturation', 'value', 'alpha' or 'kelvin'
            },
          },
        ],
      },
      'RGBZ'
    );

    self.installIROComp(
      {
        /*
        color: {
          r: (currentLevel / maxDimLevel) * 255,
          g: (currentLevel / maxDimLevel) * 255,
          b: (currentLevel / maxDimLevel) * 255,
        },*/
        color: {
          r: whiteLevel,
          g: whiteLevel,
          b: whiteLevel,
        },
        layoutDirection: 'horizontal',
        layout: [
          {
            component: iro.ui.Slider,
          },
        ],
        options: {
          sliderType: 'value', // can also be 'saturation', 'value', 'alpha' or 'kelvin'
        },
      },
      'White'
    );

    self.installIROComp(
      {
        color: temp2rgb(currentTemp),
        layoutDirection: 'horizontal',
        layout: [
          {
            component: iro.ui.Slider,
            options: {
              sliderType: 'kelvin', // can also be 'saturation', 'value', 'alpha' or 'kelvin',
              minTemperature: 4500,
              maxTemperature: 8000,
            },
          },
        ],
      },
      'Temp'
    );

    self.installIROComp(
      {
        color: {
          r: (currentLevel / maxDimLevel) * 255,
          g: (currentLevel / maxDimLevel) * 255,
          b: (currentLevel / maxDimLevel) * 255,
        },
        layoutDirection: 'horizontal',
        layout: [
          {
            component: iro.ui.Slider,
          },
        ],
      },
      'Master'
    );
    self.comp['OnOff'] = $('#' + self.id + ' .cp-buttonsOnOff')[0];

    $('#' + self.id + ' .cp-buttonsOnOff').on('change', function () {
      var thisBtn = $(this);
      var radioValue = thisBtn.find('input:checked').data('item');
      self.onChange(radioValue);
    });

    self.setState(data.mode);
    var base = document.querySelector(self.container);
    var pos = base.getBoundingClientRect();
    var pop = document.querySelector('#' + self.id + ' .modal-container');
    var virtualElement = {
      getBoundingClientRect: function () {
        return pos;
      },
    };

    self.popper = Popper.createPopper(virtualElement, pop, {
      modifiers: [
        {
          name: 'flip',
          options: {
            fallbackPlacements: ['top-start', 'bottom'],
          },
        },
        {
          name: 'preventOverflow',
          options: {
            mainAxis: true, // true by default
            altAxis: true, // true by default
          },
        },
      ],
      placement: 'bottom-start',
    });

    //    }, 0)

    el.modal({
      show: true,
    });
  });

  ev.stopPropagation();
};

var CP_states = {
  RGB: {
    RGB: true,
    RGBZ: false,
    Temp: false,
    White: false,
    Master: true,
    OnOff: true,
  },
  WW: {
    RGB: false,
    RGBZ: false,
    Temp: true,
    White: false,
    Master: true,
    OnOff: true,
  },
  W: {
    RGB: false,
    RGBZ: false,
    Temp: false,
    White: false,
    Master: true,
    OnOff: true,
  },
  WWZ: {
    RGB: false,
    RGBZ: true,
    White: true,
    Temp: true,
    Master: true,
    OnOff: true,
  },
  WZ: {
    RGB: false,
    RGBZ: true,
    White: true,
    Temp: false,
    Master: true,
    OnOff: true,
  },
};

Colorpicker.prototype.setState = function (subType) {
  $('#' + this.id + ' .iroRGB').css(
    'display',
    CP_states[subType].RGB ? 'unset' : 'none'
  );
  $('#' + this.id + ' .iroRGBZ').css(
    'display',
    CP_states[subType].RGBZ ? 'unset' : 'none'
  );
  $('#' + this.id + ' .iroTemp').css(
    'display',
    CP_states[subType].Temp ? 'unset' : 'none'
  );
  $('#' + this.id + ' .iroWhite').css(
    'display',
    CP_states[subType].White ? 'unset' : 'none'
  );
  $('#' + this.id + ' .iroMaster').css(
    'display',
    CP_states[subType].Master ? 'unset' : 'none'
  );
  this.comp['RGB'].el.style.display = CP_states[subType].RGB
    ? 'inherit'
    : 'none';
  this.comp['RGBZ'].el.style.display = CP_states[subType].RGBZ
    ? 'inherit'
    : 'none';
  this.comp['Temp'].el.style.display = CP_states[subType].Temp
    ? 'inherit'
    : 'none';
  this.comp['White'].el.style.display = CP_states[subType].White
    ? 'inherit'
    : 'none';
  this.comp['Master'].el.style.display = CP_states[subType].Master
    ? 'inherit'
    : 'none';

  this.comp['OnOff'].style.display = CP_states[subType].OnOff
    ? 'inherit'
    : 'none';
  var mode = this.buttonDef[subType].mode;
  if (mode) this.mode = mode;
  switch (subType) {
    case 'RGB':
      this.comp['Master'].color.saturation = this.comp['RGB'].color.saturation;
      this.comp['Master'].color.hue = this.comp['RGB'].color.hue;
      break;
    default:
      this.comp['Master'].color.saturation = 0;
      this.comp['Master'].color.hue = 0;
      break;
  }
  if (this.popper) this.popper.update();
};

Colorpicker.prototype.installIROComp = function installIROComp(options, name) {
  options.width = 150;
  this.comp[name] = new window.iro.ColorPicker(
    '#' + this.id + ' .iro' + name + ' .iro',
    options
  );
  var self = this;
  var changeHandler = function () {
    self.onChange(name);
  };
  this.comp[name].on('input:end', changeHandler);
  this.comp[name].on('input:change', changeHandler);
};

Colorpicker.prototype.onChange = function onChange(name) {
  if (name == 'On' || name === 'Off') {
    Domoticz.syncRequest(
      this.block.device.idx,
      'type=command&param=switchlight' +
        '&idx=' +
        this.block.device.idx +
        '&switchcmd=' +
        name
    ).then(function () {
      Domoticz.update();
    });
    return;
  }

  if (name === 'RGB') {
    this.comp['RGBZ'].color.hue = this.comp['RGB'].color.hue;
    this.comp['RGBZ'].color.saturation = this.comp['RGB'].color.saturation;
    this.comp['Master'].color.hue = this.comp['RGB'].color.hue;
    this.comp['Master'].color.saturation = this.comp['RGB'].color.saturation;
  }
  if (name === 'RGBZ') {
    this.comp['RGB'].color.hue = this.comp['RGBZ'].color.hue;
    this.comp['RGB'].color.saturation = this.comp['RGBZ'].color.saturation;
  }

  this.setDevice();
};

Colorpicker.prototype.setDevice = function setDevice() {
  var MAXTEMP = 8000;
  var MINTEMP = 4500;
  var TEMPSTEP = 255 / (MAXTEMP - MINTEMP);
  var t = Math.round((MAXTEMP - this.comp['Temp'].color.kelvin) * TEMPSTEP) - 1;
  this.changed = true;
  if (this.requesting) return;
  var idx = this.block.device.idx;
  this.changed = false;
  this.requesting = true;
  var wheel = this.mode === 3 ? 'RGB' : 'RGBZ';

  var whiteScale =
    this.mode === 4 ? ((this.comp['White'].color.value / 100) * 255) / 100 : 1;

  var color = {
    r: this.comp[wheel].color.rgb.r,
    g: this.comp[wheel].color.rgb.g,
    b: this.comp[wheel].color.rgb.b,
    m: this.mode,
    t: t,
    ww: Math.round(t * whiteScale),
    cw: Math.round(255 - t * whiteScale),
  };

  if (this.switchType === 'RGBWZ') {
    color.cw = color.ww;
    color.t = 0;
  }

  if (this.block.mode === 1) {//Hue mode: ww and cw must me 0 in rgb mode
    if (color.m === 3) { //rgb mode
      color.ww=0;
      color.cw=0;
    }
  }

  var brightness = Math.round(this.comp['Master'].color.value);

  var req =
    'type=command&param=setcolbrightnessvalue&idx=' +
    idx +
    '&color=' +
    JSON.stringify(color) +
    '&brightness=' +
    brightness;
  var self = this;
  Domoticz.syncRequest(idx, req)
    .then(function () {
      Domoticz.update();
    })
    .always(function () {
      setTimeout(function () {
        self.requesting = false;
        if (self.changed) self.setDevice();
      }, 200); //wait 200 msec
    });
};

//# sourceURL=js/colorpicker.js
