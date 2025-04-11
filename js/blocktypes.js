
/* global getExtendedBlockTypes createBlocks _TEMP_SYMBOL language*/
// Type/SubType/SwitchType
var blocktypes = {};
var General = {};
var SubType = {}
SubType.Visibility = {
  icon: 'fas fa-eye',
};
SubType.Electric = {
  icon: 'fas fa-plug',
};
SubType.Lux = {
  icon: 'fas fa-sun-o',
};
SubType.Pressure = {
  icon: 'wi wi-barometer',
  format: true,
  decimals: 1,
};
SubType.Barometer = {
  icon: 'wi wi-barometer',
};
SubType['Sound Level'] = {
  icon: 'fas fa-volume-up',
};
SubType.Distance = {
  icon: 'fas fa-eye',
};
SubType.Alert = {
  icon: 'fas fa-warning',
};
SubType.Percentage = {
  icon: 'fas fa-percent',
};
SubType.Text = {
  icon: 'fas fa-file',
  graph: false,
};
SubType['Counter Incremental'] = {
  icon: 'fas fa-bolt',
  format: true,
  decimals: 2,
};
SubType.Voltage = {
  icon: 'fas fa-bolt',
};
SubType['Solar Radiation'] = {
  icon: 'fas fa-sun-o',
  format: true,
  decimals: 0,
};
SubType['Thermostat Mode'] = {
  icon: 'fas fa-thermometer-half',
};

SubType['Soil Moisture'] = {
  icon: 'fas fa-seedling',
  values: [{
  },
  {
    value: '<Desc>',
  }
  ]
}

SubType.Current = {
  icon: 'fas fa-plug',
};

SubType['X10 security motion'] = {
  icon: 'fas fa-running',
  graph: false,
};

SubType['Managed Counter'] = {
  icon: 'fas fa-plug',
};

SubType['Custom Sensor'] = {
  icon: iconFromDevice,
};

SubType.kWh = {
  icon: 'fas fa-fire',
  format: true,
  values: [
    {
      subtitle: language.energy.energy_now,
      value: '<Usage>',
      decimals: settings['units'].decimals.watt,
      unit: settings['units'].names.watt,
    },
    {
      subtitle: language.energy.energy_today,
      value: '<CounterToday>',
      decimals: settings['units'].decimals.kwh,
      unit: settings['units'].names.kwh,
    },
    {
      subtitle: language.energy.energy_total,
      decimals: settings['units'].decimals.kwh,
      unit: settings['units'].names.kwh,
    }
  ]

}

blocktypes.General = {
  SubType: SubType
}

SubType = {}
//
SubType['Energy'] = {
  icon: 'fas fa-plug',
  values: [
    {
      subtitle: language.energy.energy_usage,
      value: '<NettUsage>',
      unit: settings['units'].names.watt,
    },
    {
      subtitle: language.energy.energy_usagetoday,
      value: '<CounterToday>',
      format: true,
      decimals: settings['units'].decimals.kwh,
      unit: settings['units'].names.kwh,
    },
    {
      subtitle: language.energy.energy_totals,
      value: '<Counter>',
      format: true,
      unit: settings['units'].names.kwh,
    },
    {
      subtitle: language.energy.energy_deliveredtoday,
      value: '<CounterDelivToday>',
      format: true,
      decimals: settings['units'].decimals.kwh,
      hideEmpty: 'CounterDelivToday',
      unit: settings['units'].names.kwh,
    },
    {
      subtitle: language.energy.energy_delivered,
      value: '<CounterDeliv>',
      hideEmpty: 'CounterDeliv',
      unit: settings['units'].names.kwh,
    },
    /*
    {
      subtitle: language.energy.energy_totals,
      value: 'P1: <Data0><br />' +
        'P2: <Data1>',
      unit: settings['units'].names.kwh,
      scale: 0.001,
      format: true,
      hideEmpty: 'Data1',
      decimals: 3,
    },*/
    {
      subtitle: language.energy.energy_totals + ' P1',
      value: '<Data0>',
      scale: 0.001,
      format: true,
      decimals: 3,
      unit: settings['units'].names.kwh,
      hideEmpty: 'Data1',
    },
    {
      subtitle: language.energy.energy_totals + ' P2',
      value: '<Data1>',
      scale: 0.001,
      decimals: 3,
      format: true,
      unit: settings['units'].names.kwh,
      hideEmpty: 'Data1',
    }
  ]
}

SubType['Gas'] = {
  icon: 'fas fa-fire',
  values: [
    {
      subtitle: language.energy.gas_usagetoday,
      value: '<CounterToday>',
    },
    {
      subtitle: language.energy.energy_totals,
      value: '<Counter>',
      unit: ' m3'
    },
  ]
}

blocktypes['P1 Smart Meter'] = {
  SubType: SubType
}

//Type RFXMeter
SubType = {}

SubType['RFXMeter counter'] = {
  icon: 'fas fa-fire',
  format: true,
  decimals: 2,
  SwitchType: {
    0: { //Energy
      icon: 'fas fa-bolt',
      unit: settings['units'].names.kwh,
      decimals: settings['units'].decimals.kwh,
    },
    1: { //Gas
      icon: 'fas fa-fire',
      unit: settings['units'].names.gas,
      decimals: settings['units'].decimals.gas,
    },
    2: { //Water
      icon: 'fas fa-tint',
      unit: settings['units'].names.water,
      decimals: settings['units'].decimals.water,
    },
    3: { //Counter
      unit: function (device) {
        return device.ValueUnits;
      },
    },
    4: { //Energy Generated
      icon: 'fas fa-sun',
      unit: settings['units'].names.kwh,
      decimals: settings['units'].decimals.kwh,
    },
    5: { //Time
      icon: 'far fa-clock',
      unit: settings['units'].names.time,
      decimals: settings['units'].decimals.time,
    },
  },
  values: [
    {
      subtitle: language.energy.energy_today,
      value: '<CounterToday>',
    },
    {
      subtitle: language.energy.energy_totals,
      value: '<Counter>'
    },
    {
      value: '<Usage>',
      hideEmpty: 'Usage'
    },
  ]
}

blocktypes.RFXMeter = {
  SubType: SubType
}

blocktypes['YouLess Meter'] = {
  icon: 'fas fa-fire',
  format: true,
  values: [
    {
      value: '<CounterToday>',
      decimals: settings['units'].decimals.kwh,
      unit: settings['units'].names.kwh,
    },
    {
      subtitle: language.energy.energy_totals,
      value: '<Counter>',
      decimals: settings['units'].decimals.kwh,
      unit: settings['units'].names.kwh,
    },
    {
      value: '<Usage>',
      decimals: settings['units'].decimals.watt,
      unit: settings['units'].names.watt,
      hideEmpty: 'Usage'
    }
  ]
}

blocktypes.Rain = {
  icon: 'fas fa-tint',
  value: '<Rain>mm',
  format: true,
  decimals: 1,
};
blocktypes.Wind = {
  icon: 'wi wi-wind-direction',
  title: language.wind.wind,
  value: '',
};
blocktypes.Temp = {
  icon: 'fas fa-thermometer-half',
  value: '<Temp>',
  unit: _TEMP_SYMBOL,
  format: true,
  decimals: 1,
};

blocktypes.Usage = blocktypes.General.SubType.Electric;

blocktypes.Scale = {
  icon: 'fas fa-weight',
}

blocktypes['Air Quality'] = {
  image: 'air.png',
};
blocktypes.UV = {
  icon: 'fas fa-sun',
};
blocktypes.Variable = {
  icon: 'fas fa-equals',
  value: '<Value>',
};

blocktypes['Temp + Humidity + Baro'] = {
  icon: 'fas fa-thermometer-half',
  SubType: {
    Zone: {
      handler: getEvohomeZoneBlock
    },
    Evohome: {
      handler: getEvohomeControllerBlock
    },
    'Hot Water': {
      handler: getEvohomeHotWaterBlock
    }
  },
  values: [{
    value: function (device) {
      return choose(device.Temp && '<Temp>', '<Data>')
    },
    format: true,
    decimals: 1,
    unit: _TEMP_SYMBOL
  },
  {
    icon: 'wi wi-humidity',
    value: '<Humidity>',
    unit: '%',
    format: true,
    decimals: 0,
    hideEmpty: 'Humidity',
  },
  {
    icon: 'wi wi-barometer',
    value: '<Barometer>',
    format: true,
    decimals: 0,
    unit: 'hPa',
    hideEmpty: 'Barometer'
  },
  {
    icon: 'wi wi-fog',
    value: '<DewPoint>',
    subtitle: language.settings.weather.dewpoint,
    format: true,
    decimals: 1,
    unit: _TEMP_SYMBOL,
    hideEmpty: 'DewPoint'
  }
  ]
}

blocktypes['Temp + Humidity'] = blocktypes['Temp + Humidity + Baro'];
blocktypes['Temp + Baro'] = blocktypes['Temp + Humidity + Baro'];
blocktypes['Radiator 1'] = blocktypes['Temp + Humidity + Baro'];
blocktypes['Heating'] = blocktypes['Temp + Humidity + Baro'];
//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Energy",
//"SubType" : "CM180",
blocktypes.Energy = {
  icon: 'fas fa-plug',
};

//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Current/Energy",
//"SubType" : "CM180i",
blocktypes['Current/Energy'] = {
  icon: 'fas fa-plug',
};

blocktypes.Current = {
  icon: 'fas fa-plug',
};

blocktypes.Humidity = {
  icon: 'wi wi-humidity',
  format: true,
  decimals: 0,
  value: '<Humidity>',
  unit: '%',
}

blocktypes.Thermostat = {
  handler: getThermostatBlock
}

blocktypes.Setpoint = blocktypes.Thermostat;

blocktypes.Group = {
  iconOn: 'fas fa-lightbulb',
  iconOff: 'far fa-lightbulb',
  handler: getDefaultSwitchBlock
}

blocktypes.Scene = blocktypes.Group;

/*Switches*/

SwitchType = {}

SwitchType['Dimmer'] = {
  handler: getDimmerBlock
}

SwitchType['Door Contact'] = {
  iconOn: 'fas fa-door-open',
  iconOff: 'fas fa-door-closed',
  textOn: language.switches.state_open,
  textOff: language.switches.state_closed,
  handler: getDefaultSwitchBlock,
  protected: true,
}
SwitchType.Contact = SwitchType['Door Contact'];

SwitchType['Door Lock'] = {
  iconOn: 'fas fa-lock',
  iconOff: 'fas fa-unlock',
  textOn: language.switches.state_unlocked,
  textOff: language.switches.state_locked,
  handler: getDefaultSwitchBlock,
}
SwitchType['Door Lock Inverted'] = SwitchType['Door Lock'];

SwitchType.Blinds = {
  handler: getBlindsBlock
}

var allblinds = ['Venetian Blinds EU',
  'Venetian Blinds US',
  'Venetian Blinds EU Inverted',
  'Venetian Blinds US Inverted',
  'Blinds',
  'Blinds Inverted'];

allblinds.forEach(function (id) {
  SwitchType[id] = SwitchType.Blinds
});

allblinds = [
  'Blinds Percentage',
  'Blinds + Stop',
  'Blinds Percentage Inverted',
  'Venetian Blinds EU Percentage',
  'Venetian Blinds EU Inverted Percentage',
  'Venetian Blinds EU Percentage Inverted',
]
allblinds.forEach(function (id) {
  SwitchType[id] = {
    withPercentage: true,
    handler: getBlindsBlock
  }
});

SwitchType.Security = {
  handler: getSecurityBlock,
}

SwitchType['Motion Sensor'] = {
  imageOn: 'motion_on.png',
  imageOff: 'motion_off.png',
  textOn: language.switches.state_movement,
  textOff: language.switches.state_nomovement,
  handler: getDefaultSwitchBlock,
  protected: true,
}

SwitchType['Smoke Detector'] = {
  image: 'heating.png',
  textOn: language.switches.state_smoke,
  textOff: language.switches.state_nosmoke,
  handler: getDefaultSwitchBlock,
  protected: true,
  defaultAddClass: 'smoke',
}

SwitchType['Doorbell'] = {
  icon: 'fas fa-bell',
  handler: getDefaultSwitchBlock,
  textOn: '',
  textOff: '',
  protected: true,
}

SwitchType['Media Player'] = {
  width: 12,
  handler: getMediaPlayer
}

SwitchType['Selector'] = {
  handler: getSelectorSwitch
}

blocktypes.SwitchType = SwitchType;


HardwareType = {
  "Toon Thermostaat" : {
    handler: getToonThermostat
  },
  'Logitech Media Server': {
    defaultAddClass: 'with_controls',
    handler: getLogitechMediaServer
  }
}

blocktypes.HardwareType = HardwareType;

if (typeof getExtendedBlockTypes == 'function') {
  blocktypes = getExtendedBlockTypes(blocktypes);
}

// eslint-disable-next-line no-unused-vars
function getBlockTypesBlock(block) {
  var device = block.device;
  if (block.subidx) {
    block.idx = isDomoticzDevice(block.idx);
  }

  var newblock = { graph: true, title: '<Name>', value: '<Data>', idx: block.idx, showsubtitles: true };
  var protoBlock = {};
  var found = false;
  if (device.SwitchType && blocktypes.SwitchType[device.SwitchType]) {
    $.extend(protoBlock, blocktypes.SwitchType[device.SwitchType]);
    found = true;
  }
  if (blocktypes[device.Type]) {
    found = true;
    var protoType = blocktypes[device.Type];
    $.extend(protoBlock, protoType);
    if (protoBlock.SubType && protoBlock.SubType[device.SubType]) {
      var protoSubType = protoBlock.SubType[device.SubType];
      $.extend(protoBlock, protoSubType);

      if (protoBlock.SwitchType && protoBlock.SwitchType[device.SwitchType]) {
        var protoSwitchType = protoBlock.SwitchType[device.SwitchType];
        $.extend(protoBlock, protoSwitchType);
      };
    };
  }
  if (!found && device.HardwareType && blocktypes.HardwareType[device.HardwareType]) {
    protoBlock= blocktypes.HardwareType[device.HardwareType];
    if(protoBlock) found=true;
  }
  if (!found && device.SwitchType) 
  {
    protoBlock = {
      handler: function(block) {
        return getDefaultSwitchBlock(
          block,
          'fas fa-lightbulb',
          'far fa-lightbulb',
        );
      }
    }
    found=true;
  }

  if (!found) {
    //handle as default block. newblock will be used as protoblock
  }

  var parentBlock = { showsubtitles: true, graph: true };
  if(block.values && !block.single_line && !block.joinsubblocks) {
    parentBlock.multi_line = choose(block.multi_line, true);
  }
  $.extend(parentBlock, protoBlock, block);
  if (parentBlock.handler) {
    return parentBlock.handler(parentBlock);
  }

  var blockValues = [];

  if (!parentBlock.values) {
    //we have a single block
    $.extend(newblock, protoBlock, getSubBlock(parentBlock));
    blockValues.push(newblock);
  } else if (parentBlock.subidx) {
    //One specific subblock
    var subblockProto = parentBlock.values[parentBlock.subidx-1];
    var subblock = {};
    $.extend(newblock, subblockProto, getSubBlock(parentBlock));
    blockValues.push(newblock);
  }
   else {
    var c = 1;
    for (var de in parentBlock.values) {
      var subblock = {};
      $.extend(subblock, newblock, getSubBlock(parentBlock));
      $.extend(subblock, parentBlock.values[de]);
      //          subBlock.idx = block.device.idx;
      subblock.subidx = c;
      blockValues.push(subblock);
      c++;
    }
  }
  createBlocks(parentBlock, blockValues);
  return true;
}



function getSubBlock(parent) {
  /*
This function creates a new object (`acc`) that is a copy of the `parent` object, but without the `values` property. It does this by iterating over the keys of the `parent` object, excluding the `values` key, and adding the corresponding values to the new object.
*/
  var exclude = ['values', 'Type', 'SubType', 'SwitchType']

  return Object.keys(parent).filter(function (key) {
    return !exclude.includes(key)
  }).reduce(function (subblock, key) {
    subblock[key] = parent[key];
    return subblock;
  }, {})
}

function iconFromDevice(device) {
  var defaultIcon = 'fas fa-question';
  if (device) {
    if (device['Image'] === 'Water') defaultIcon = 'fas fa-tint';
    else if (device['Image'] === 'Heating') defaultIcon = 'fas fa-utensils';
  }
  return defaultIcon;
}

function getToonThermostat(block) {
  var device = block.device;
  if (device['SubType'] !== 'SetPoint' && device['SubType'] !== 'AC') {
    return getSmartMeterBlock(block);
  }
  if (device['SubType'] === 'SetPoint') {
    return getThermostatBlock(block);
  }
}


//# sourceURL=js/blocktypes.js
