/* global getExtendedBlockTypes createBlocks _TEMP_SYMBOL language*/
var blocktypes = {};
blocktypes.SubType = {};
blocktypes.SubType['Visibility'] = {
  icon: 'fas fa-eye',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Electric'] = {
  icon: 'fas fa-plug',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Lux'] = {
  icon: 'fas fa-sun-o',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Pressure'] = {
  icon: 'wi wi-barometer',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 1,
};
blocktypes.SubType['Barometer'] = {
  icon: 'wi wi-barometer',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Sound Level'] = {
  icon: 'fas fa-volume-up',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Distance'] = {
  icon: 'fas fa-eye',
  title: '<Name>',
  value: '<Data>',
  graph: true,
};
blocktypes.SubType['Alert'] = {
  icon: 'fas fa-warning',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.SubType['Percentage'] = {
  icon: 'fas fa-percent',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Text'] = {
  icon: 'fas fa-file',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Counter Incremental'] = {
  icon: 'fa fa-bolt',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 2,
};
blocktypes.SubType['Voltage'] = {
  icon: 'fas fa-bolt',
  title: '<Name>',
  value: '<Data>',
  graph: true,
};
blocktypes.SubType['Solar Radiation'] = {
  icon: 'fa fa-sun-o',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 0,
};
blocktypes.SubType['Thermostat Mode'] = {
  icon: 'fas fa-thermometer-half',
  title: '<Name>',
  value: '<Data>',
};

blocktypes.SubType['Soil Moisture'] = {};
blocktypes.SubType['Soil Moisture']['cb'] = {
  icon: 'fas fa-seedling',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.SubType['Soil Moisture']['advice'] = {
  icon: 'fas fa-seedling',
  title: '<Name>',
  value: '<Desc>',
};
/*
blocktypes.SubType['Soil Moisture'] = {
    icon: 'fas fa-seedling',
    title: '<Name>',
    value: '<Data>',
};*/

blocktypes.SensorUnit = {};
blocktypes.SensorUnit['Fertility'] = {
  icon: 'fas fa-flask',
  title: '<Name>',
  value: '<Data>',
};

blocktypes.Type = {};
blocktypes.Type['Rain'] = {
  icon: 'fas fa-tint',
  title: '<Name>',
  value: '<Rain>mm',
  format: true,
  decimals: 1,
};
blocktypes.Type['Wind'] = {
  icon: 'wi wi-wind-direction',
  title: language.wind.wind,
  value: '',
};
blocktypes.Type['Temp'] = {
  icon: 'fas fa-thermometer-half',
  title: '<Name>',
  value: '<Temp>' + _TEMP_SYMBOL,
  format: true,
  decimals: 1,
};
blocktypes.Type['Air Quality'] = {
  image: 'air.png',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.Type['UV'] = {
  icon: 'fas fa-sun',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.Type['Variable'] = {
  icon: 'fas fa-equals',
  title: '<Name>',
  value: '<Value>',
};

//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Energy",
//"SubType" : "CM180",
blocktypes.Type['Energy'] = {
  icon: 'fas fa-plug',
  title: '<Name>',
  value: '<Data>',
};

//Recognition of
//"HardwareType" : "RFXCOM - RFXtrx433 USB 433.92MHz Transceiver",
//"Type" : "Current/Energy",
//"SubType" : "CM180i",
blocktypes.Type['Current/Energy'] = {
  icon: 'fas fa-plug',
  title: '<Name>',
  value: '<Data>',
};

blocktypes.Type['Current'] = {
  icon: 'fas fa-plug',
  title: '<Name>',
  value: '<Data>',
};

blocktypes.HardwareType = {};
blocktypes.HardwareType['Motherboard sensors'] = {
  icon: 'fas fa-desktop',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.HardwareType['PVOutput (Input)'] = {};
blocktypes.HardwareType['PVOutput (Input)']['today'] = {
  icon: 'fas fa-sun',
  title: '<Name>',
  value: '<CounterToday>',
  format: true,
  decimals: 1,
};
blocktypes.HardwareType['PVOutput (Input)']['usage'] = {
  icon: 'fas fa-sun',
  title: '<Name>',
  value: '<Usage>',
  format: true,
  decimals: 1,
};
blocktypes.HardwareType['PVOutput (Input)']['total'] = {
  icon: 'fas fa-sun',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 0,
};

blocktypes.HardwareName = {};
blocktypes.HardwareName['Rain expected'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};

blocktypes.Name = {};
blocktypes.Name['Rain Expected'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Rain expected'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Regen mm/uur'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Regen verwacht'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Regen Verwacht'] = {
  icon: 'fas fa-tint',
  title: '<Data>',
  value: '<Name>',
};

blocktypes.Name['Ping'] = {
  icon: 'fas fa-arrows-v',
  title: '<Name>',
  value: '<Data>',
};
blocktypes.Name['Upload'] = {
  icon: 'fas fa-upload',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 3,
};
blocktypes.Name['Download'] = {
  icon: 'fas fa-download',
  title: '<Name>',
  value: '<Data>',
  format: true,
  decimals: 3,
};

blocktypes.Name['Maanfase'] = {
  icon: 'fas fa-moon',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Moon phase'] = {
  icon: 'fas fa-moon',
  title: '<Data>',
  value: '<Name>',
};
blocktypes.Name['Mondphase'] = {
  icon: 'fas fa-moon',
  title: '<Data>',
  value: '<Name>',
};

if (typeof getExtendedBlockTypes == 'function') {
  blocktypes = getExtendedBlockTypes(blocktypes);
}

// eslint-disable-next-line no-unused-vars
function getBlockTypesBlock(block) {
  var fields = [
    'SubType',
    'HardwareType',
    'HardwareName',
    'SensorUnit',
    'Type',
    'Name',
  ];
  var device = block.device;

  for (var key in fields) {
    var field = fields[key];
    if (device[field] && device[field] in blocktypes[field]) {
      var blockValues = [];
      var protoblock = blocktypes[field][device[field]];

      if (
        typeof protoblock['icon'] !== 'undefined' ||
        typeof protoblock['image'] !== 'undefined'
      ) {
        //we have a single block
        var newblock = {};
        newblock.idx = block.idx;
        $.extend(newblock, protoblock);
        blockValues.push(newblock);
      } else {
        var c = 1;
        for (var de in protoblock) {
          var subblock = {};
          var protosubblock = protoblock[de];
          $.extend(subblock, protosubblock);
          subblock.idx = block.device.idx + '_' + c;
          subblock.subidx = c;
          blockValues.push(subblock);
          c++;
        }
      }
      createBlocks(block, blockValues);
      return ['', false];
    }
  }
}

//# sourceURL=js/blocktypes.js
