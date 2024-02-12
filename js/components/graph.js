/* eslint-disable no-prototype-builtins */
/* global Dashticz Domoticz moment settings config Beaufort number_format  language time Chart _TEMP_SYMBOL  onlyUnique isDefined isObject setHeight*/
/* global templateEngine Handlebars*/
moment.locale(settings['language']);

var DT_graph = {
  name: 'graph',
  canHandle: function (block) {
    return (
      (block && block.devices) ||
      (typeof block.key === 'string' && block.key.substring(0, 6) === 'graph_')
    );
  },
  defaultCfg: getBlockDefaults,
  run: function (me) {
    try {
      Initialize(me);

      $.each(me.graphDevices, function (i, graphDevice) {
        //install the callback handles
        Dashticz.subscribeDevice(me, graphDevice.idx, false, function (device) {
          deviceUpdate(me, graphDevice, device);
        });
      });
    } catch (err) {
      console.warn(err);
      me.block.refresh = 0; //prevent refresh of graph in case of error during initialization
    }
    me.initialBlock = me.block;
  },

  refresh: function (me) {
    getGraphData(me);
  },
};

Dashticz.register(DT_graph);

/** Initialization of the Graph object */
function Initialize(me) {
  me.graphDevices = [];
  me.ysyncmax = {};
  me.block.devices = me.block.devices || [parseInt(me.key.split('_')[1])];
  $.each(me.block.devices, function (i, idx) {
    var device = {};
    $.extend(device, Domoticz.getAllDevices(idx)); //Make a copy of the current device data
    if (device.idx) {
//      device.idx = parseInt(device.idx);
      getDeviceDefaults(me, device);
      me.graphDevices.push(device);
    } else {
      var msg = 'For graph ' + me.key + ' device ' + idx + ' does not exist.';
      me.$mountPoint.append(msg);
      throw new Error(msg);
    }
  });
  me.graphIdx = me.mountPoint.slice(1);
  me.lastRefreshTime = 0;
  me.range = me.block.range;
  me.title = me.block.title || me.graphDevices[0].Name;
  me.params = [];
  //next lines are copied from the primary device to configure some defaults
  var pd = me.graphDevices[0];
  me.subtype = pd.subtype;
}

function getBlockDefaults() {
  var block = {
    axisRight: false,
    axisAlternate: true,
    barWidth: 0.9,
    beginAtZero: false,
    borderDash: [],
    borderWidth: 2,
    buttonsBorder: 'white',
    buttonsColor: 'black',
    buttonsFill: 'white',
    buttonsIcon: '#686868',
    buttonsMarginX: 2,
    buttonsMarginY: 0,
    buttonsPadX: 6,
    buttonsPadY: 2,
    buttonsRadius: 0,
    buttonsShadow: false,
    buttonsSize: 14,
    buttonsText: false,
    cartesian: 'linear',
    customHeader: false,
    debugButton: true,
    displayFormats: false,
    drawOrderDay: false,
    drawOrderLast: false,
    drawOrderMonth: false,
    flash: false,
    fontColor: 'white',
    format: true,
    //    graphTypes: false,
    groupBy: false,
    groupByDevice: false,
    height: false,
    iconColour: 'grey',
    interval: 1,
    lineFill: false,
    maxTicksLimit: null,
    method: 1,
    pointBorderColor: ['grey'],
    pointBorderWidth: 0,
    pointRadius: 0,
    pointStyle: false,
    range: 'initial',
    refresh: 300,
    reverseTime: false,
    sortDevices: false,
    spanGaps: true,
    title: false,
    tooltiptotal: false,
    usedefaults: true,
    width: 12,
    zoom: true,
    ysyncmargin: 3
  };
  return block;
}

function getBlockDefaults2(me) {
  //these defaults may be overruled by device specific graph defaults
  //remove these settings from getBlockDefaults
  var datasetColors = [
    'yellow',
    'green',
    'red',
    'blue',
    'orange',
    'purple',
    'chartreuse',
    'aqua',
    'teal',
    'pink',
    'gray',
    'fuchsia',
  ];

  return {
    datasetColors: datasetColors,
    graph: 'line',
    stacked: false,
    legend: true,
    lineTension: 0.1,
    gradients: false,
    showtooltip: true
  }
}

/** Extends device with all default graph parameters
 *
 * */
function getDeviceDefaults(me, device) {
  var currentValue = device['Data'];
  var sensor = 'counter';
  var txtUnit = '?';
  var decimals = 2;
  var method = 1;
  var type;

  switch (device['Type']) {
    case 'Rain':
      sensor = 'rain';
      txtUnit = 'mm';
      decimals = 1;
      break;
    case 'Lux':
      sensor = 'counter';
      txtUnit = 'Lux';
      decimals = 0;
      break;
    case 'UV':
      sensor = 'uv';
      txtUnit = 'Lux';
      decimals = 1;
      break;
    case 'Wind':
      sensor = 'wind';
      var windspeed = device.Data.split(';')[2] / 10;
      if (settings['use_beaufort']) {
        currentValue = Beaufort(windspeed);
        decimals = 0;
        txtUnit = 'Bft';
      } else {
        currentValue = windspeed;
        decimals = 1;
        txtUnit = 'm/s';
      }
      break;
    case 'Temp':
    case 'Temp + Humidity':
    case 'Temp + Humidity + Baro':
    case 'Temp + Baro':
    case 'Heating':
      sensor = 'temp';
      txtUnit = _TEMP_SYMBOL;
      currentValue = device['Temp'];
      decimals = 1;
      break;
    case 'Humidity':
      sensor = 'temp';
      txtUnit = '%';
      decimals = 1;
      break;
    case 'RFXMeter':
      txtUnit = device['CounterToday'].split(' ')[1];
      currentValue = device['CounterToday'].split(' ')[0];
      switch (device['SwitchTypeVal']) {
        case 0: //Energy
          me.ysyncmax = ['Wh', 'kWh'];
          break;
        case 1: //Gas
          break;
        case 2: //Water
          decimals = 0;
          break;
        case 3: //Counter
          break;
        case 4: //Energy generated
          break;
        case 5: //Time
          break;
      }
      break;
    case 'Air Quality':
      sensor = 'counter';
      txtUnit = 'ppm';
      decimals = 1;
      break;
  }

  switch (device['SubType']) {
    case 'Percentage':
      sensor = 'Percentage';
      txtUnit = '%';
      decimals = 1;
      break;
    case 'Custom Sensor':
      sensor = 'Percentage';
      txtUnit = device['SensorUnit'];
      decimals = 2;
      break;
    case 'Gas':
      txtUnit = 'm3';
      currentValue = device['CounterToday'];
      method = 0;
      break;
    case 'Electric':
      txtUnit = 'Watt';
      break;
    case 'Energy':
    case 'kWh':
    case 'YouLess counter':
      txtUnit = device.SwitchTypeVal == 1 ? 'm3' : 'kWh'; //SwitchTypeVal 0: Electra; 1: Gas
      currentValue = device['CounterToday'];
      if (txtUnit === 'kWh') me.ysyncmax = ['Wh', 'kWh'];
      break;
    case 'Managed Counter':
      txtUnit = 'kWh';
      break;
    case 'Visibility':
      txtUnit = 'km';
      break;
    case 'Radiation':
    case 'Solar Radiation':
      txtUnit = 'Watt/m2';
      decimals = 0;
      break;
    case 'Pressure':
      txtUnit = 'Bar';
      break;
    case 'Soil Moisture':
      txtUnit = 'cb';
      break;
    case 'Leaf Wetness':
      txtUnit = 'Range';
      break;
    case 'A/D':
      txtUnit = 'mV';
      break;
    case 'Voltage':
    case 'VoltageGeneral':
      txtUnit = 'V';
      break;
    case 'DistanceGeneral':
    case 'Distance':
      txtUnit = 'cm';
      break;
    case 'Sound Level':
      txtUnit = 'dB';
      break;
    case 'CurrentGeneral':
    case 'CM113, Electrisave':
    case 'Current':
      txtUnit = 'A';
      break;
    case 'Weight':
      txtUnit = 'kg';
      break;
    case 'Waterflow':
      sensor = 'Percentage';
      txtUnit = 'l/min';
      break;
    case 'Counter Incremental':
      txtUnit = device['CounterToday'].split(' ')[1];
      currentValue = device['CounterToday'].split(' ')[0];
      break;
    case 'Barometer':
      sensor = 'temp';
      txtUnit = device['Data'].split(' ')[1];
      break;
    case 'SetPoint':
      sensor = 'temp';
      txtUnit = _TEMP_SYMBOL;
      currentValue = device['SetPoint'];
      decimals = 1;
      break;
  }

  if (device.SwitchType) {
    //device is a switch
    sensor = '';
    currentValue = device['Data'];
    decimals = 0;
    txtUnit = 'level';
    type = 'text';
  }

  var multidata = device.Data.split(',').length - 1 > 0;

  if (typeof me.block.decimals !== 'undefined') decimals = me.block.decimals;

  if (typeof me.decimals === 'undefined') me.decimals = decimals;

  currentValue = multidata
    ? device.Data
    : me.block.format && type !== 'text'
      ? number_format(currentValue, decimals) + ' ' + txtUnit
      : currentValue;

  var obj = {
    currentValue: currentValue,
    idx: parseInt(device.idx),
    name: device.Name,
    sensor: sensor,
    subtype: device.SubType,
    title: device.Name,
    txtUnit: txtUnit,
    txtUnits: [],
    type: device.Type,
    decimals: decimals,
    method: method,
  };
  $.extend(device, obj);
}

/** This function handles a device update
 *
 * */
function deviceUpdate(me, graphDevice, device) {
  $.extend(graphDevice, device);
  getDeviceDefaults(me, graphDevice); //In fact we only need a update of currentValue, but this is the most easy way
  if (me.block.groupByDevice) {
    DT_graph.refresh(me);
  } else updateHeaderValues(me, true);
}
/** This function will refresh the complete graph
 *
 *
 */
function getGraphData(me, selGraph) {
  if (me.block.groupByDevice) {
    groupByDevice(me);
  } else {
    if (isDefined(selGraph)) {
      me.selectbutton = selGraph;
    } else {
      me.selectbutton = choose(me.selectbutton, me.block.range); //Fix to show the correct graph after refresh.
    }
    refreshGraph(me);
  }
}

/** Pulls all graph data from Domoticz and refreshes the graph
 *
 */
function refreshGraph(me) {
  prepareGraphData(me);
  //Now we request all Graph data sequentially
  getAllGraphData(me).then(function () {
    formatData(me);
    createGraph(me);
  });
}

function prepareGraphData(me) {
  var isInitial = me.range === 'initial';
  me.txtUnits = []; //todo: check txtUnits
  //  me.ysyncmax = ['Wh','kWh'];
  me.ylabels = [];
  me.lastRefreshTime = time();
  //  txtUnits.push(me.txtUnit);

  if (isInitial) {
    switch (settings['standard_graph']) {
      case 'hours':
        me.selectbutton = 'last';
        break;
      case 'day':
        me.selectbutton = 'day';
        break;
      case 'month':
        me.selectbutton = 'month';
        break;
      case 'today':
        me.selectbutton = 'today';
    }
  }
  me.range = me.selectbutton;

  me.dataFilterCount = 0;
  me.dataFilterUnit = '';
  me.groupBy = me.block.groupBy;
  me.aggregate = me.block.aggregate;

  if (me.selectbutton === 'last') {
    me.range = 'day';
    me.dataFilterCount = 4;
    me.dataFilterUnit = 'hours';
  }
  if (me.selectbutton === 'today') {
    me.range = 'day';
    me.dataFilterUnit = 'today';
    me.dataFilterCount = 1;
  }

  //Some block properties can be "overruled" by custom block settings
  //However, getDefaultGraphProperties now depend on some block settings, without taking custom block settings into account
  //I don't want to overwrite graph.block, because that contains the original block definition
  //Let's create a second parameter, containing the merged block
  //  me.initialBlock is a copy of the original block. See run(me);
  me.block = getBlockDefaults2(me);
  if (me.initialBlock.usedefaults) createDefaultGraph(me); //may fill me.block with additional defaults
  me.block = $.extend(true, me.block, me.initialBlock);
  var block = me.block;

  //here add code for device specific block defaults.
  //  me.mergedBlock = mergedBlock;
  //  createDefaultGraph(me);

  if (block.custom) {
    if (isInitial) {
      me.selectbutton = Object.keys(block.custom)[0];
      me.customRange = true;
    }
    /* else {
      //        graph.range = selGraph ? selGraph : graph.customRangeName;
      me.range = me.range || me.customRangeName; //Needed?
    }*/

    if (block.custom[me.selectbutton]) {
      me.graphConfig = block.custom[me.selectbutton];
      me.customRange = true;
      var range = me.graphConfig.range || 'today';
      switch (range) {
        case 'day':
        case 'month':
        case 'year':
          me.range = range;
          break;
        case 'today':
          me.graphConfig.dataFilterCount = 1;
          me.graphConfig.dataFilterUnit = 'today';
          me.graphConfig.range = 'day';
          break;
        case 'last':
          me.graphConfig.dataFilterCount = 4;
          me.graphConfig.dataFilterUnit = 'hours';
          me.graphConfig.range = 'day';
          break;
        default:
          console.log('invalid range: ' + me.graphConfig.range);
      }
      if (me.graphConfig.groupBy) {
        me.groupBy = me.graphConfig.groupBy;
      }

      if (me.graphConfig.filter) {
        me.dataFilterCount = parseInt(me.graphConfig.filter);
        me.dataFilterUnit = me.graphConfig.filter.split(' ').splice(-1)[0];
      }
      if (me.graphConfig.method) {
        block.method = me.graphConfig.method;
      }
      me.aggregate = me.graphConfig.aggregate || block.aggregate; //todo: we should merge all keys of graphConfig into me at once, or create copy of block (_block) and merge graphProperties and block into _block
    }
    if (!me.customRange) {
      console.log(
        'custom graph, but graph selector ' + me.range + ' not found'
      );
    }
  }
  //Some block properties can be "overruled" by custom block settings
  //However, getDefaultGraphProperties now depend on some block settings, without taking custom block settings into account
  //I don't want to overwrite graph.block, because that contains the original block definition
  //Let's create a second parameter, containing the merged block
  $.extend(true, block, me.graphConfig);

  if (me.graphConfig) { //switched this extend and next extend. Always correct?
    $.extend(true, me, me.graphConfig);
  }

  var graphProperties = getDefaultGraphProperties(me, block);
  $.extend(true, graphProperties, block);

  if (typeof block.legend == 'boolean') {
    graphProperties.options.legend.display = block.legend;
  }

  //  me.mergedBlock=mergedBlock;
  me.graphProperties = graphProperties;

  me.data = [];

}

function createDefaultGraph(me) {
  if (me.initialBlock.custom) return; //No default settings in case of custom graph
  var device = me.graphDevices[0];
  me.graphDevices.forEach(function (device) {
    console.log(device.idx, device.Name, device.Type, device.SubType);
  })
  switch (true) {
    case device.Type === 'P1 Smart Meter' && device.SubType === 'Energy':
      createDefaultGraphP1Energy(me);
      break;
    case device.Type === 'P1 Smart Meter' && device.SubType === 'Gas':
      createDefaultGraphP1Gas(me);
      break;
    case device.Type === 'General' && device.SubType === 'kWh':
      createDefaultGraphGeneralkWh(me);
      break;
    default:
      createDefaultGraphGeneric(me);
  }
}

function getAllGraphData(me) {
  return $.when.apply(
    $,
    me.graphDevices.map(function (device, i) {
      return getDeviceGraphData(me, i);
    })
  );
}

/**Request graph data for the device
 * Stores the data in me.data
 * And return a promise.
 */

function getRegularGraphData(me, i) {
  var device = me.graphDevices[i];
  var cmd = Domoticz.info.api15330 ? 'type=command&param=graph' : 'type=graph';
  var params = cmd +
    '&sensor=' +
    device.sensor +
    '&idx=' +
    device.idx +
    '&range=' +
    me.range +
    '&method=' +
    device.method; //todo: check method
  me.params[i] = params;
  return Domoticz.request(params);
}

function getSwitchGraphData(me, i) {
  var device = me.graphDevices[i];
  //http://:8080/json.htm?idx=19&type=lightlog
  //todo: check type=command&param=graph for new Domoticz version>=15330
  var cmd = Domoticz.info.api15330 ? 'param=getlightlog&type=command' : 'type=lightlog';
  var params = cmd + '&idx=' + device.idx;
  me.params[i] = params;
  return Domoticz.request(params).then(function (data) {
    /*
    Data: "Off"
Date: "2021-04-12 19:57:39"
Level: 0
MaxDimLevel: 15
Status: "Off"
User: "OpenTherm"
idx: "11209721"
*/
    var maxDimLevel = data.result && data.result[0].MaxDimLevel; 
    var result = data.result.map(function (sample) {
      return {
        d: sample.Date,
        l: getIconStatusClass(sample.Status)==='off'? 0 : sample.Level || maxDimLevel || 1,
      };
    });
    return { result: result };
  });
}

function getDeviceGraphData(me, i) {
  var device = me.graphDevices[i];
  var res;
  switch (true) {
    case !!device.SwitchType:
      res = getSwitchGraphData(me, i);
      break;
    default:
      res = getRegularGraphData(me, i);
  }

  return res.then(function (data) {
    data.device = device;
    data.idx = device.idx;
    data.txtUnit = device.txtUnit;
    data.txtUnits = device.txtUnits;
    me.data.push(data);
  });
}

/** This function will update the graph.
 * All graph data must be available.
 */
function formatData(me) {
  var tmpResults = {}; //temporary object to hold all data, per date.
  var firstDeviceIdx = me.graphDevices[0].idx;

  var multidata = {
    result: [],
    status: 'OK',
    title: 'Graph day',
  };

  //var combinedData={} //probably not needed ...

  if (me.sortDevices) {
    me.data.sort(function (a, b) {
      return b.result.length - a.result.length;
    });
  }

  var arrYkeys = []; //contains a unique set of keys, for instance ['te','hu', 'ba']
  var newKeys = []; //newKeys is derived from arrYkeys, but each element is extended with every device_idx, for instance ['te_43','te_44']

  me.ylabels = [];
  me.txtUnits = []; //todo: check where txtUnits still is used
  me.firstDeviceData = {};
  //iterate through all data sets
  var props = me.graphProperties;
  $.each(me.data, function (z, d) {
    var currentKey = '';
    d.ylabels = [];
    d.keys = [];
    d.range = me.range;

    if (d.result && d.result.length > 0) {
      $.each(d.result, function (x, res) {
        var valid = false;
        var interval = 1;
        if (me.hasBlock)
          interval =
            me.range === 'last' || me.range === 'month' ? 1 : props.interval;

        if (x % interval === 0) {
          var sampleDate = res['d'];
          //          if(res.eu) sampleDate=moment(sampleDate).add(30,'minutes').format("YYYY-MM-DD HH:mm");
          if (sampleDate) {
            var obj = tmpResults[sampleDate] || { d: sampleDate }; //if sampleDate already exists use that one, otherwise create new one
            me.firstDeviceData[sampleDate] = res;
            for (var key in res) {
              var mayAdd =
                key !== 'd' && (keyNoCounter(key) || props.graphTypes || (typeof props.legend === 'object')) &&
                (props.graphTypes
                  ? $.inArray(key, props.graphTypes) >= 0
                  : true);
              if (mayAdd) {
                if (!d.keys.includes(key)) {
                  d.keys.push(key);
                }
                if ($.inArray(key, arrYkeys) === -1) {
                  arrYkeys.push(key);
                }

                //All keys, except for values from the first device, will be extended with '_'+idx to make them unique
                currentKey = firstDeviceIdx == d.idx ? key : key + '_' + d.idx;
                obj[currentKey] = res[key];
                valid = true;
                if ($.inArray(currentKey, newKeys) === -1) {
                  newKeys.push(currentKey);
                }
              }
            }
            if (valid) tmpResults[sampleDate] = obj;
          }
        }
      });
      d.subtype = d.device.SubType;
      d.ylabels = getYlabels(d);
      d.ylabels.forEach(function (lbl) {
        me.ylabels.push(lbl);
      });
      if (d.ysyncmax) me.ysyncmax = d.ysyncmax
    }
  });

  function is_numeric(c) {
    return !isNaN(parseInt(c, 10));
  }

  function keyNoCounter(key) {
    if (key === 'c') return false;
    var len = key.length;
    if (len == 2) {
      if (key[0] === 'c' && is_numeric(key[1])) return false;
    }
    return true;
  }

  /*now transform tmpResults object into array*/

  /*
  Object.keys(tmpResults).forEach(function (key) {
    var obj = tmpResults[key];
    for (var n in newKeys) {
      if (!obj.hasOwnProperty(newKeys[n])) {
        obj[newKeys[n]] = NaN;
      }
    }
    multidata.result.push(obj);
  });
  */

  multidata.result = Object.values(tmpResults);

  multidata.result.sort(function (a, b) {
    return a.d > b.d ? 1 : -1;
  });
  /*  var latestValues={};  
  multidata.result=multidata.result.map(function(value) {
    latestValues=$.extend({}, latestValues, value);
    return latestValues
  })*/

  me.keys = arrYkeys; //keys contains all the selected keys, like ['te','l']
  me.ykeys = newKeys; //ykeys contains all the keys incl device idx, like ['te_12','te_13','l_3']
  //    graph.txtUnits = txtUnits; //todo: check txtUnits
  //me.txtUnit = me.txtUnits[0]; //todo: temp fix. txtUnits contains the units belonging to ykeys, like ['°C', '°C', 'level']
  //me.ylabels = getYlabels(me);
  //graph.currentValues = currentValues; //todo: check currentValues

  me.txtUnit = me.data[0].txtUnit;
  me.data = multidata;
}

function getProperty(prop, idx) {
  if (typeof prop === 'undefined') return undefined;
  if (Array.isArray(prop)) return prop[idx];
  return prop;
}

function getGroupStart(groupBy, timestamp) {
  var dayFormat = 'YYYY-MM-DD';
  var groupStart;
  switch (groupBy) {
    case 'hour':
      groupStart = moment(timestamp, dayFormat)
        .hour(moment(timestamp, 'YYYY-MM-DD HH:mm').hour())
        .format('YYYY-MM-DD HH:mm');
      break;
    case 'day':
      groupStart = moment(timestamp, dayFormat).format(dayFormat);
      break;
    case 'week':
      groupStart = moment(timestamp, dayFormat).weekday(0).format(dayFormat);
      break;
    case 'month':
      groupStart = moment(timestamp, dayFormat)
        .startOf('month')
        .format(dayFormat);
      break;
  }
  return groupStart;
}

/***
 * @param data: array of datapoints or array of values
 *
 * A datapoint is an object containing a x and y value
 */
function groupData(graph, idx, data, labels) {
  var returnData = [];

  if (!data.length) {
    console.log('dataset without data: No grouping');
    return;
  }

  var isObject = typeof data[0] === 'object';
  var groupedData = {};
  var groupedCount = {}; //Count objects; needed in case aggregation function is average.

  $.each(data, function (i, obj) {
    var timestamp = isObject ? obj.x : labels[i];
    var groupStart = getGroupStart(graph.groupBy, timestamp);
    if (!groupedData[groupStart]) {
      //new groupBy element. Initialization.
      groupedData[groupStart] = 0;
      groupedCount[groupStart] = 0;
    }
    groupedCount[groupStart] += 1;
    var value = isObject ? obj.y : obj;
    groupedData[groupStart] += Number(value) || 0;
  });

  var add = true;
  switch (getProperty(graph.aggregate, idx)) {
    case 'sum':
      add = true;
      break;
    case 'avg':
      add = false;
      break;
    default:
      add =
        graph.sensor === ('counter' || graph.sensor === 'rain') ? true : false;
      break;
  }

  $.each(groupedData, function (key, obj) {
    if (!add) {
      //we have to compute the average
      var count = groupedCount[key];
      obj /= count;
    }
    var returnValue = isObject ? { x: key, y: obj } : obj;
    returnData.push(returnValue);
  });
  return returnData;
}

function groupLabels(graph, labels) {
  if (!labels.length) {
    console.log('dataset without labels: No grouping');
    return [];
  }

  return labels.reduce(
    function (acc, el) {
      var l = acc.length;
      var groupStart = getGroupStart(graph.groupBy, el);
      if (acc[l - 1] !== groupStart) acc.push(groupStart);
      return acc;
    },
    [getGroupStart(graph.groupBy, labels[0])]
  );
}

function createGraph(graph) {

  if (graph.dataFilterCount > 0) filterGraphData(graph);

  if (graph.filter === 'todaytomorrow') filterGraphDataTodayTomorrow(graph);

  if (graph.graphConfig && graph.graphConfig.data) createCustomData(graph);

  if (graph.graphProperties.ylabels) graph.ylabels = graph.graphProperties.ylabels;

  createDataSets(graph);

  createYAxes(graph);

  var block = graph.block;
  var graphProperties = graph.graphProperties;

  if (isDefined(block.legend)) {
    if ($.isArray(block.legend)) {
      block.legend.forEach(function (element, idx) {
        graphProperties.data.datasets[idx].label = element;
      });
      graphProperties.options.legend.display = true;
    }
    if (typeof block.legend === 'object') graphProperties.options.legend.display = true;
  }
  switch (typeof block.graph) {
    case 'string':
      graphProperties.type = block.graph;
      break;
    case 'object':
      block.graph.forEach(function (element, idx) {
        if (idx < graphProperties.data.datasets.length)
          graphProperties.data.datasets[idx].type = element;
      });
      graphProperties.type = 'bar';
      break;
    default:
      break;
  }

  block.displayFormats
    ? $.extend(
      graphProperties.options.scales.xAxes[0].time.displayFormats,
      block.displayFormats
    )
    : graphProperties.options.scales.xAxes[0].time.displayFormats;
  graphProperties.options.scales.xAxes[0].ticks.maxTicksLimit =
    block.maxTicksLimit;
  graphProperties.options.scales.xAxes[0].ticks.reverse =
    block.reverseTime;
  graphProperties.options.legend.labels.usePointStyle = block.pointStyle;

  if (block.beginAtZero) {
    if (graphProperties.options.scales.yAxes.length === 1) {
      graphProperties.options.scales.yAxes[0].ticks.beginAtZero =
        block.beginAtZero;
    } else {
      if (typeof block.beginAtZero === 'object') {
        block.beginAtZero.forEach(function (beginAtZero, i) {
          if (i < graphProperties.options.scales.yAxes.length) {
            graphProperties.options.scales.yAxes[i].ticks.beginAtZero =
              beginAtZero;
          }
        });
      }
    }
  }

  //if (block.gradients) 
  applyGradients(graph, block, graphProperties);

  if (graph.dataFilterUnit === 'today') {
    graphProperties.options.scales.xAxes[0].ticks.max = moment().endOf('day');
    graphProperties.options.scales.xAxes[0].ticks.min = moment().startOf('day');
    graphProperties.options.scales.xAxes[0].distribution = 'linear';
  }

  graphRender(graph, graphProperties);
}

//create the y-axes, ylabels contains the labels
function createYAxes(graph) {
  var block = graph.block;
  var graphProperties = graph.graphProperties;
  graph.yaxes = [];
  graph.ymax = -10000;
  //the user defined key order, as in 
  graph.ykeylabels = {}
  //  graph.ykeys.forEach(function(key, i) {
  /*
  graph.idxArray.forEach(function(key, i) {
    graph.ykeylabels[key]=graph.ylabels[i]
  });*/
  //  var uniqueylabels = graph.ylabels.filter(onlyUnique);
  var labelLeft = !block.axisRight;
  var axisCount = graphProperties.options && graphProperties.options.scales && graphProperties.options.scales.yAxes
    ? graphProperties.options.scales.yAxes.length
    : 0;
  var yAxesConfig = axisCount ? graphProperties.options.scales.yAxes : [];

  //  var uniquelabels = [];
  graphProperties.options.scales.yAxes = []; // reset to empty
  /*
  var i=0;
  Object.keys(graph.keyMapping).forEach(function (key) {*/
  graph.uniqueylabels.forEach(function (ylabel, i) {
    //    var ylabel =graph.keyMapping[key].label;
    //    if(uniquelabels.includes(ylabel)) return;
    //    uniquelabels.push(ylabel);
    var yaxis = {
      id: ylabel,
      stacked: graphProperties.stacked,
      type: block.cartesian,
      ticks: {
        reverse: false,
        fontColor: graph.block.fontColor,
      },
      gridLines: {
        color: 'rgba(255,255,255,0.2)',
      },
      scaleLabel: {
        labelString: ylabel,
        display: true,
        fontColor: graph.block.fontColor,
      },
      position: labelLeft ? 'left' : 'right',
      afterDataLimits: function (axis) {
        axis.suggestedmin = 0;
        //        console.log(axis);
        /*      
                graph.yaxes.forEach(function(yaxis) {
                  var min, start;
                  if(axis.max>=yaxis.max && axis.max <= yaxis.max*(1+block.ysyncmargin)) {
                    min=Math.min(axis.min, yaxis.min);
        
                    console.log('sync ', yaxis.max, axis.max, yaxis.min, axis.min)
                    yaxis.max = axis.max;
                    yaxis.min = min;
                    axis.min = min;
                    start=Math.min(axis.start, yaxis.start);
                    yaxis.start = start;
                    axis.start = start;
                  }
                  else 
                  if(yaxis.max>=axis.max && yaxis.max <= axis.max*(1+block.ysyncmargin)) {
                    min=Math.min(axis.min, yaxis.min);
                    console.log('sync ', yaxis.max, axis.max, yaxis.min, axis.min)
                    axis.max = yaxis.max;
                    yaxis.min = min;
                    axis.min = min;
                    start=Math.min(axis.start, yaxis.start);
                    yaxis.start = start;
                    axis.start = start;
                  }
        
                });
                
                graph.yaxes.push(axis);
        /*        if(graph.ysyncmax.includes(axis.id))
                  if (graph.ymax<axis.max) {
                    graph.ymax = axis.max;
                    graph.yaxes.forEach(function(yaxis) {
                      yaxis.max = graph.ymax
                    });
                  }
                  else
                    axis.max = graph.ymax*/

      }
    };
    graphProperties.options.scales.yAxes.push(yaxis);
    if (i < axisCount)
      $.extend(
        true,
        graphProperties.options.scales.yAxes[i],
        yAxesConfig[i]
      );
    labelLeft = block.axisAlternate ? !labelLeft : labelLeft;
  });

  //extend the y label with all dataset labels
  if (graphProperties.options.scales.yAxes.length > 1) {
    graphProperties.options.scales.yAxes
      .filter(function (element) {
        //filter the ylabels that have an initial label
        return element.scaleLabel && isDefined(element.scaleLabel.labelString);
      })
      .forEach(function (yAxis) {
        yAxis.scaleLabel.labelString = graphProperties.data.datasets
          .filter(function (dataset) {
            return dataset.yAxisID === yAxis.id;
          })
          .reduce(function (newlabelString, dataset) {
            return dataset.label + ' ' + newlabelString;
          }, '(' + yAxis.scaleLabel.labelString + ')');
      });
  }
}

function applyGradients(graph, block, graphProperties) {
  var prop = graph.block;
  var gHeight = isDefined(prop.gradientHeight) ? prop.gradientHeight : 1;
  graphProperties.plugins = [
    {
      beforeRender: function (x) {
        var c = x.chart;
        $.each(graph.ykeys, function (i) {
          var startGradient, endGradient;
          if (isDefined(prop.gradients[i]) && isObject(prop.gradients[i])) {
            startGradient = prop.gradients[i][0];
            endGradient = prop.gradients[i][1];
          }
          if (isDefined(prop.datasets && prop.datasets[graph.ykeys[i]]) && isObject(prop.datasets[graph.ykeys[i]].gradient)) {
            startGradient = prop.datasets[graph.ykeys[i]].gradient[0];
            endGradient = prop.datasets[graph.ykeys[i]].gradient[1];
          }
          if (startGradient) {
            var yScale = x.scales[graph.ylabels[i]];
            var yPos = yScale.getPixelForValue(i);
            var gradientFill = c.ctx.createLinearGradient(
              0,
              0,
              0,
              gHeight * yPos
            );
            gradientFill.addColorStop(
              0,
              startGradient ? startGradient : 'red'
            );
            gradientFill.addColorStop(
              1,
              endGradient ? endGradient : 'yellow'
            );
            var model =
              x.data.datasets[i]._meta[Object.keys(x.data.datasets[i]._meta)[0]]
                .dataset._model;
            model.backgroundColor = gradientFill;
          }
        });
      },
    },
  ];
}

function filterGraphData(graph) {
  var startMoment =
    graph.dataFilterUnit === 'today'
      ? moment().format('YYYY-MM-DD 00:00')
      : moment()
        .subtract(graph.dataFilterCount, graph.dataFilterUnit)
        .format('YYYY-MM-DD HH:mm');
  graph.data.result = graph.data.result.filter(function (element) {
    return element.d >= startMoment;
  });
}

function filterGraphDataTodayTomorrow(graph) {
  var todayDate = moment().startOf('day');
  var today = todayDate.format('YYYY-MM-DD HH:mm');
  var tomorrow = todayDate.endOf('day').add(1, 'day').format('YYYY-MM-DD HH:mm');
  graph.data.result = graph.data.result.filter(function (element) {
    return (element.d >= today) && (element.d <= tomorrow);
  });
}

function graphRender(graph, graphProperties) {
  var graphIdx = graph.graphIdx;

  var ranges = ['last', 'today', 'month'];
  if (graph.customRange) ranges = Object.keys(graph.block.custom);
  var html = createHeader(graph, true);

  var mydiv = !graph.block.isPopup
    ? $(graph.mountPoint + ' > div')
    : $(graph.mountPoint);

  if (!graph.block.isPopup) {
    mydiv.addClass('col-xs-' + graph.block.width);
    mydiv.addClass('block_graph');
    mydiv.addClass(graphIdx);
    //    mydiv.addClass(graph.key); //Todo: add graph.key? Also already available via data-id
  }
  mydiv.html(html);
  createButtons(graph, ranges, graph.selectbutton);
  updateHeaderValues(graph, true);

  if (!(graph.data.result && graph.data.result.length)) {
    console.log('No graph data for device ' + graphIdx);
    return;
  }

  graph.chartctx = mydiv.find('canvas')[0].getContext('2d');

  /* Probably not needed anymore since June 2023 (different method for setting block height)
  if (!graph.block.isPopup) {
    //in general we should not use graph.block, but mergedBlock. In this case graph.block is ok, because isPopup should not be used in a custom block def.
    var height = setHeight(graph);
    if (parseInt(height) > 0)
      //only change height is we have a valid height value
      $('.' + graphIdx + ' .graphcontent').css('height', height);
    //console.log('test');
  }
*/

  new Chart(graph.chartctx, graphProperties);
  Chart.defaults.global.defaultFontColor = graph.block.fontColor;
}

function createCustomData(graph) {
  //custom data
  graph.keys = [];
  $.each(Object.values(graph.graphConfig.data), function (i, val) {
    graph.keys.push(val.split('.')[1].split('_')[0]);
  });
  graph.ylabels = getYlabels(graph);
  graph.ykeys = Object.keys(graph.graphConfig.data);

  var d = {}; //object to store the latest value of each key
  var previousDataPoint;
  var customResult = [];
  var firstDeviceIdx = graph.graphDevices[0].idx

  //to stay compatible with old format of custom graph data in which also for the first device '_idx' was added to a data field
  graph.ykeys.forEach(function (_value) {
    graph.graphConfig.data[_value] = graph.graphConfig.data[_value].replaceAll('_' + firstDeviceIdx, '');
  });


  graph.data.result.forEach(function (y) {
    var dataPoint = {};
    $.extend(dataPoint, previousDataPoint);
    var valid = false;
    //    $.extend(d, graph.firstDeviceData[y.d]);
    /*working, but needed? Keys of first device data don't have _idx anymore
        var firstDeviceData = graph.firstDeviceData[y.d];
        for (var key in firstDeviceData) {
          if (key !== 'd') d[key] = parseFloat(firstDeviceData[key]);
        }
        */
    for (var key in y) {
      if (key !== 'd') d[key] = parseFloat(y[key]);
    }
    dataPoint.d = y.d;
    graph.ykeys.forEach(function (_value) {
      var customValue = graph.graphConfig.data[_value];
      try {
        var res = eval(customValue).toFixed(2);
        valid = true;
        dataPoint[_value] = res;
      } catch (error) {
        console.log('error in eval ' + customValue);
        console.log(error);
      }
    });
    if (valid) {
      customResult.push(dataPoint);
    }
    previousDataPoint = dataPoint;
  });
  /*
  if (graph.graphConfig.graph) {
    graphProperties.type = graph.graphConfig.graph;
  }
  $.extend(true, graphProperties, graph.graphConfig);
*/
  graph.data.result = customResult;
}

function getDatasetKey(me, key, el) {
  var dataset = me.block.datasets;
  if(dataset && dataset[key]) return dataset[key][el]
}

function createDataSets(graph) {
  //first determine the correct labels for the y-axes
  //we want to create a mapping of ykeys value to index
  var block = graph.block;
  var legend = block.legend;
  //  var idxArray = [];
  //  var labelMapping = {};
  var datasets = {};
  var tempykeys=Array.from(graph.ykeys);

  graph.oldKeyMap = {};
  graph.ykeys.forEach(function (key, i) {
    graph.oldKeyMap[key] = i;
  })
  var hasLegend = typeof legend === 'object';
  if (hasLegend) {
    Object.keys(legend).forEach(function (key, i) {
      datasets[key] = {
        yLabel: graph.block.ylabels ? graph.block.ylabels[i] : graph.ylabels[graph.oldKeyMap[key]],
        datasetIdOld: graph.oldKeyMap[key],
        legend: legend[key],
        datasetId: i
      }
    });
  } else {
    //    idxArray = graph.ykeys;
    //    Object.keys(graph.ykeys).forEach(function(key,i) {
    graph.ykeys.forEach(function (key, i) {
      datasets[key] = {
        yLabel: graph.ylabels[i],
        datasetIdOld: i,
        datasetId: i,
        legend: key
      }
    })
  }
  //graph.block.datasets contains the default graph config depending on device type
  graph.datasets = $.extend(true, datasets, graph.block.datasets);
  /*
  idxArray.forEach(function (key, idx) {
    labelMapping[key] = idx;
  });
*/
  //now we can safely select only the relevant ykeys
  /*
  graph.ykeys = graph.ykeys.filter(function (el) {
    return Object.keys(labelMapping).includes(el);
  });*/
  graph.dataKeys = Object.keys(graph.datasets);
  graph.uniqueylabels = graph.dataKeys.map(function (key) {
    return graph.datasets[key].yLabel
  }).filter(onlyUnique);
  var mydatasets = {};

  //  graph.labelMapping = labelMapping;
  //  graph.idxArray = idxArray;

  graph.dataKeys.forEach(function (element, idx) {
    var myKey = element.split('_')[0];
    var asStepped = ['l', 'eu', 'eg'];
    var defaultSteppedLine = asStepped.indexOf(myKey) >= 0 ? 'before' : false;

    //    idx = labelMapping[element];

    mydatasets[element] = {
      data: [],
      label: graph.datasets[element].legend,
      //      xAxisID: index,
      /*
      yAxisID: block.ylabels
        ? block.ylabels[idx]
        : graph.ylabels[index], //check: idx iso index*/
      yAxisID: graph.datasets[element].yLabel,
      backgroundColor: block.datasetColors[idx],
      barPercentage: block.barWidth,
      borderColor: (block.borderColors || block.datasetColors)[idx],
      borderWidth: block.borderWidth,
      borderDash: block.borderDash,
      pointRadius: block.pointRadius,
      pointStyle: block.pointStyle[idx], //check: index iso idx
      pointBackgroundColor: (block.pointFillColor ||
        block.datasetColors)[idx],
      pointBorderColor: (block.pointBorderColor ||
        block.datasetColors)[idx],
      pointBorderWidth: block.pointBorderWidth,
      lineTension: block.lineTension,
      spanGaps: block.spanGaps,
      fill: graph.datasets[element].fill ? graph.datasets[graph.datasets[element].fill].datasetId : getProperty(block.lineFill, idx),
      steppedLine: getProperty(
        defaultSteppedLine || block.steppedLine,
        idx
      ),
      barThickness: 'flex',
      barPercentage: 0.95,
      categoryPercentage: 1,
      hidden: graph.datasets[element].hideData
    };
  });

  graph.data.result.forEach(function (element) {
    var valid = false;
    graph.dataKeys.forEach(function (el) {
      if (isDefined(element[el])) {
        valid = true;
        mydatasets[el].data.push({
          x: element.d,
          y: element[el],
        });
      }
    });
    if (valid) graph.graphProperties.data.labels.push(element.d);
  });

  //Now we have the datasets
  //Apply groupBy if needed
  if (graph.groupBy) {
    //group the data
    var idx = 0;
    $.each(mydatasets, function (key, dataset) {
      dataset.data = groupData(
        graph,
        idx,
        dataset.data,
        graph.graphProperties.data.labels
      );
      idx += 1;
    });
    //group the labels
    graph.graphProperties.data.labels = groupLabels(
      graph,
      graph.graphProperties.data.labels
    );
  }

  // draw the datasets in custom order
  if (!graph.block.custom) {
    var legendOrder =
      typeof graph.block.legend == 'object' ? graph.block.legend : false;
    var drawOrderLast =
      typeof graph.block.drawOrderLast == 'object'
        ? graph.block.drawOrderLast
        : false;
    var drawOrderDay =
      typeof graph.block.drawOrderDay == 'object'
        ? graph.block.drawOrderDay
        : false;
    var drawOrderMonth =
      typeof graph.block.drawOrderMonth == 'object'
        ? graph.block.drawOrderMonth
        : false;
    var order = false;

    if (drawOrderLast || drawOrderDay || drawOrderMonth) {
      switch (graph.range) {
        case 'last':
          order = drawOrderLast;
          break;
        case 'month':
          order = drawOrderMonth;
          break;
        default:
          order = drawOrderDay;
      }
    } else if (legendOrder) {
      order = legendOrder;
    }

    if (order) {
      var arr = [];
      for (var keyIdx in order) {
        var key =
          drawOrderLast === false &&
            drawOrderDay === false &&
            drawOrderMonth === false
            ? keyIdx
            : order[keyIdx];
        if (mydatasets[key]) arr[key] = mydatasets[key];//mydatasets[key] doesn't exist when legend contains key that are not in the graph data
      }
      mydatasets = arr;
    }
  }


  Object.keys(mydatasets).forEach(function (element) {
    /*
    if (typeof legend == 'object') {
      if (isDefined(legend[element]) && mydatasets[element])
        mydatasets[element].label = legend[element];
      graph.graphProperties.options.legend.display = true;
    }*/
    graph.graphProperties.data.datasets.push(mydatasets[element]);
  });
}

function createHeader(graph) {
  var html =
    '<div class="graphheader"><div class="graphtitle"><i class="fas fa-chart-bar" style="font-size:20px;margin-left:5px;color:' +
    graph.block.iconColour +
    '">&nbsp;</i>' +
    graph.title +
    '&nbsp;<span class="graphValues' +
    graph.graphIdx +
    '">';
  html += '</span></div>';
  html += '</div>';
  html +=
    '<div class="graphcontent swiper-no-swiping' +
    (graph.block.isPopup ? ' popup graphheight' : '') +
    '" id="' +
    graph.graphIdx +
    '">';
  html += '<canvas ' + 'id="graphoutput_' + graph.graphIdx + '"></canvas>';
  return (html += '</div>');
}

function createButtons(graph, ranges, selectbutton) {
  var btn = {};
  var buttons =
    '<div class="btn-group graphbuttons" role="group" aria-label="Graph Buttons"></div>';
  var btnIcons = [
    'fas fa-clock',
    'fas fa-calendar-day',
    'fas fa-calendar-week',
  ];
  var style = 'style="';

  btn.icon = graph.block.buttonsIcon;
  btn.text = graph.block.buttonsText;
  btn.size = 'font-size:' + graph.block.buttonsSize + 'px!important;';
  btn.color = 'color:' + graph.block.buttonsColor + ';';
  btn.fill = 'background-color:' + graph.block.buttonsFill + ';';
  btn.border = 'border-color:' + graph.block.buttonsBorder + ';';
  btn.radius = 'border-radius:' + graph.block.buttonsRadius + 'px;';
  btn.padX =
    'padding-left:' +
    graph.block.buttonsPadX +
    'px;padding-right:' +
    graph.block.buttonsPadX +
    'px;';
  btn.padY =
    'padding-top:' +
    graph.block.buttonsPadY +
    'px;padding-bottom:' +
    graph.block.buttonsPadY +
    'px;';
  btn.marginX =
    'margin-left:' +
    graph.block.buttonsMarginX +
    'px;margin-right:' +
    graph.block.buttonsMarginX +
    'px;';
  btn.marginY =
    'margin-top:' +
    graph.block.buttonsMarginY +
    'px;margin-bottom:' +
    graph.block.buttonsMarginY +
    'px;';
  btn.shadow = 'box-shadow: 0px 8px 15px ' + graph.block.buttonsShadow + ';';

  $.each(
    [
      btn.size,
      btn.color,
      btn.fill,
      btn.border,
      btn.radius,
      btn.padX,
      btn.padY,
      btn.marginX,
      btn.marginY,
      btn.shadow,
    ],
    function (i, s) {
      if (isDefined(s)) style += s;
    }
  );

  var $buttons = $(buttons);

  if (isDefined(ranges)) {
    var btnTextList = {
      last: btn.text !== false ? btn.text[0] : language.graph.last_hours,
      day: btn.text !== false ? btn.text[1] : language.graph.today,
      today: btn.text !== false ? btn.text[1] : language.graph.today,
      month: btn.text !== false ? btn.text[2] : language.graph.last_month,
    };

    ranges.forEach(function (item, i) {
      var btnText = graph.customRange ? item : btnTextList[item];
      var icon = btnIcons[i] || 'fas fa-calendar-week';
      if (graph.block && graph.block.custom && graph.block.custom[item])
        icon = graph.block.custom[item].buttonIcon || icon;
      var newButton =
        '<button type="button" ' + style + '" class="btn btn-default';
      if (selectbutton === item) newButton += ' active';
      newButton +=
        '"><i class="' +
        icon +
        '" style="font-size:14px;color:' +
        btn.icon +
        '">&nbsp;</i>&nbsp;' +
        btnText +
        '</button> ';
      $(newButton)
        .click(function () {
          getGraphData(graph, item);
        })
        .appendTo($buttons);
    });
  }

  if (graph.block.zoom) {
    var newButton = '';
    newButton +=
      '<button type="button" data-canvas="graphoutput_' +
      graph.graphIdx +
      '" id="resetZoom' +
      graph.graphIdx +
      '" ' +
      style +
      '" class="btn btn-default">';
    newButton +=
      '  <i class="fas fa-search-minus" style="font-size:14px;color:' +
      btn.icon +
      '"></i>';
    newButton += '</button>';

    $(document).on('click', '#resetZoom' + graph.graphIdx, function () {
      Chart.helpers.each(Chart.instances, function (instance) {
        if (
          instance.chart.canvas.id ===
          $('#resetZoom' + graph.graphIdx).data('canvas')
        ) {
          instance.chart.resetZoom();
        }
      });
    });
    $(newButton).appendTo($buttons);
  }

  if (graph.block.debugButton) {
    newButton = '';
    newButton += '<div class="btn-group">';
    newButton +=
      '  <button type="button" id="graphMenu_' +
      graph.graphIdx +
      '" ' +
      style +
      '" class="btn btn-default dropdown-toggle" data-toggle="dropdown">';
    newButton +=
      '    <i class="fas fa-bars" style="font-size:14px;color:' +
      btn.icon +
      '"></i>';
    newButton += '  </button>';
    newButton += '  <ul class="dropdown-menu pull-right">';
    newButton += '  </ul>';
    newButton += '</div>';
    var newLi =
      '<li><a href="#" ><i class="fas fa-code" style="font-size:14px;color:' +
      btn.icon +
      '">&nbsp;</i>&nbsp;Show Data</a></li>';
    var $newLi = $(newLi).click(function () {
      showData(graph);
      return false;
    });
    var $newButton = $(newButton);
    $newButton.find('.dropdown-menu').append($newLi);

    $newButton.appendTo($buttons);
  }
  $buttons.appendTo(graph.mountPoint + ' .graphheader');
}

function createCurrentValues(me) {
  //todo: check customHeader generation
  var currentValues = [];

  var key;
  if (me.block.customHeader) {
    switch (typeof me.block.customHeader) {
      case 'object':
        var header = $.extend({}, me.block.customHeader); //Enforce a copy
        for (key in header) {
          try {
            me.graphDevices.forEach(function (device) {
              if (device.idx === parseInt(key)) {
                //the header element is the current device. Fill in the current value
                currentValues.push(
                  eval(header[key].replace('data', 'device.currentValue'))
                );
              } else if (isNaN(key)) {
                header[key] = header[key].replace(
                  //custom header element. Fill in the current device value if needed
                  'data.' + device.idx,
                  'parseFloat("' + device.currentValue + '")'
                ); //was graph.currentValue
              }
            });
            if (isNaN(key)) {
              currentValues.push(eval(header[key]));
            }
          } catch (error) {
            console.log('Error in customHeader:', key, header[key]);
            console.log(error);
          }
        }
        break;
      case 'string': //customHeader is a string. We just evaluate the complete string
        // eslint-disable-next-line no-unused-vars
        var devices = Domoticz.getAllDevices(); //devices may be used in the eval function
        try {
          currentValues.push(eval(me.block.customHeader));
        } catch (error) {
          console.log('Error in customHeader:', me.block.customHeader);
          console.log(error);
        }
        break;
      case 'function':
        var cv = 'Invalid customHeader';
        try {
          cv = me.block.customHeader(me);
        } catch (err) {
          console.log('Invalid customHeader function for block ', me.key);
        }
        currentValues.push(cv);
        break;
      default:
        console.log(
          'Unsupported type for customHeader: ',
          me.block.customHeader
        );
    }
  } else {
    //return the values of all devices
    me.graphDevices.forEach(function (el) {
      currentValues.push(el.currentValue);
    });
  }
  return currentValues;
}

function updateHeaderValues(graph, showValues) {
  var $values = $('.graphValues' + graph.graphIdx);

  templateEngine.load('graph_header').then(function (template) {
    var data = {
      show: showValues,
      //      mg: graph.multigraph,
      mg: true, //todo: always handle as multigraph. Can be simplified ...
      cv: graph.graphDevices[0].currentValue,
      cvs: createCurrentValues(graph),
      icon: graph.block.iconColour,
    };

    $values.empty().html(template(data));

    if (graph.block.flash && graph.block.flash > 0) {
      $('.graphValues' + graph.graphIdx)
        .toggleClass('blockchange')
        .delay(graph.block.flash)
        .queue(function (next) {
          $(this).toggleClass('blockchange');
          next();
        });
    }
  });
}

function showData(graph) {
  var graphIdx = graph.graphIdx;
  if ($('#modal_' + graphIdx).length === 0) {
    var html = '';
    html +=
      '<div id="modal_' +
      graphIdx +
      '" class="modal graph-menu" tabindex="-1" role="dialog">';
    html += ' <div class="modal-dialog" role="document">';
    html +=
      '   <div class="modal-content" style="background-image:url(' +
      settings['background_image'] +
      '); background-size: cover;">';
    html += '     <div class="modal-header">';
    html += '       <div class="flex-row title">';
    html +=
      '         <h5 class="modal-title"><i class="fas fa-chart-line"></i>' +
      graph.title +
      '</h5>';
    html +=
      '         <div class="btn-group" role="group" aria-label="Graph Debug">';
    html +=
      '           <a type="button" id="logbutton" class="btn debug" href="#" ><i class="fas fa-code"></i></a>';
    html +=
      '           <a type="button" class="btn debug" href="data:application/octet-stream;charset=utf-16le;base64,' +
      btoa(encodeURIComponent(JSON.stringify(graph, null, 2))) +
      '" download="' +
      graphIdx +
      '.json"><i class="fas fa-save"></i></a>';
    html +=
      '           <button type="button" class="btn debug" data-dismiss="modal"><i class="fas fa-window-close"></i></button>';
    html += '         </div>';
    html += '       </div>';
    html += '       <hr/>';
    html += '       <div class="flex-row">';
    html +=
      '         <div class="devices"><i class="fas fa-bolt text-yellow"></i><span class="label">Devices:</span>' +
      graph.block.devices.join(', ') +
      '</div>';

    if (!graph.block.groupByDevice) {
      html +=
        '         <div class="input-keys"><i class="fas fa-key text-red"></i><span class="label">Input Keys:</span>' +
        graph.keys.join(', ') +
        '</div>';
      html +=
        '         <div class="output-keys"><i class="fas fa-key text-green"></i><span class="label">Output Keys:</span>' +
        graph.ykeys.join(', ') +
        '</div>';
      html +=
        '         <div class="ylabels"><i class="fas fa-balance-scale-right text-blue"></i></i><span class="label">Y Labels:</span>' +
        graph.ylabels.join(', ') +
        '</div>';
    }

    html += '       </div>';
    html += '     </div>';
    html += '     <div class="modal-body">';
    html += '       <div class="flex-row">';
    html += '         <div class="device-list"></div>';
    html +=
      '         <textarea class="form-control" rows="20">' +
      JSON.stringify(graph, null, 2) +
      '</textarea>';
    html += '       </div>';
    html += '     </div>';
    html += ' </div>';
    html += '</div>';

    $(html).appendTo('body');

    $('#modal_' + graphIdx)
      .find('#logbutton')
      .click(function () {
        console.log(graph);
        return false;
      });

    $.each(graph.graphDevices, function (i, graphDevice) {
      // var g = dtGraphs[graph.primaryIdx]; //todo: I would expect g is just graph
      var url =
        config['domoticz_ip'] + '/json.htm?' +
        (Domoticz.info.api15330 ? 'type=command&param=getdevices' : 'type=devices') +
        '&rid=' + graphDevice.idx;

      $.getJSON(url, function (data) {
        var device = data.result[0]; //This device should already contain the same info as graphDevice.
        var d = '';
        d += '<div class="device">';
        d += '  <div class="col-md-10">';
        d +=
          '    <div class="name"><span class="label">Name:</span>' +
          device.Name +
          '</div>';
        d +=
          '    <div class="type"><span class="label">Type:</span>' +
          device.Type +
          '</div>';
        d +=
          '    <div class="subtype"><span class="label">SubType:</span>' +
          device.SubType +
          '</div>';
        d +=
          '    <div class="hardwareName"><span class="label">Hardware Name:</span>' +
          device.HardwareName +
          '</div>';
        d +=
          '    <div class="data"><span class="label">Data:</span>' +
          device.Data +
          '</div>';
        d +=
          '    <div class="lastUpdate"><span class="label">Last Update:</span>' +
          device.LastUpdate +
          '</div>';
        d += '  </div>';
        d += '  <div class="col-md-2 col-fas">';
        d +=
          '    <a class="idx text-yellow" href="' +
          url +
          '" target="_blank"><i class="fas fa-info-circle">&nbsp;</i>' +
          device.idx +
          '</a>';
        if (!graph.block.groupByDevice) {
          d +=
            '    <a class="idx text-red" href="' +
            config['domoticz_ip'] +
            '/json.htm?' +
            graph.params[i] +
            '" target="_blank"><i class="fas fa-database">&nbsp;</i>Data</a>';
        }
        d += '  </div>';
        d += '</div>';
        $(d).appendTo('#modal_' + graphIdx + ' .device-list');
      });
    });
  }
  $('#modal_' + graphIdx).modal('show');
}

Handlebars.registerHelper('splitString', function (str, cha, options) {
  return options.fn(str[0].split(cha)[0]);
});

function customTooltip(graph, block, tooltip) {
  var tooltipEl = $('#' + graph.graphIdx + '_chartjs-tooltip');
  var minWidth = graph.range !== 'day' ? 100 : 135;

  if (tooltipEl.length === 0 && !graph.loadingTooltip) {
    graph.loadingTooltip = true;
    templateEngine
      .load('graph_tooltip_table')
      .then(function (template) {
        $('#graphoutput_' + graph.graphIdx)
          .parent()
          .append(
            template({
              idx: graph.graphIdx,
              minw: minWidth,
            })
          );
        graph.loadingTooltip = false;
      });
  }

  if (tooltip.opacity === 0) {
    tooltipEl.css({
      opacity: 0,
    });
    return;
  }

  tooltipEl.removeClass('left right');
  if (tooltip.yAlign)
    tooltipEl
      .removeClass('left right center bottom')
      .addClass(tooltip.xAlign)
      .addClass(tooltip.yAlign);

  function getBody(bodyItem) {
    return bodyItem.lines;
  }

  if (tooltip.body) {
    var isdate = moment(tooltip.title, 'YYYY-MM-DD').isValid();
    var dformat =
      graph.range === 'day' || graph.range === 'last'
        ? 'HH:mm, DD/MM/YYYY'
        : 'DD/MM/YYYY';
    var bodyLines = tooltip.body.map(getBody);
    var vals = [];
    var total = 0;

    //  Tooltip title with SetPoint info when using GroupByDevice
    if (graph.hasSetPoint) {
      var value = graph.currentValues[tooltip.dataPoints[0].index];
      var status = value.split(',')[2].trim();
      var s = status.split(' ');
      if (s.length === 3) {
        var until = moment(s[2]).format('hh:mm a');
        tooltip.title[0] = language.evohome[s[0]] + ' > ' + until;
      } else {
        tooltip.title[0] = language.evohome[status];
      }
    }

    var decimals = graph.decimals;
    if (typeof block.decimals !== 'undefined')
      decimals = block.decimals;
    bodyLines.forEach(function (body, i) {
      var val = parseFloat(body[0]);
      //todo: next line throws an error. As workaround I've added previous line and the try/catch.
      try {
        val = parseFloat(body[0].split(':')[1].replace('NaN', '0'));
      } catch (err) {
        console.log('error in tooltip');
      }
      var obj = {};
      obj.key = body[0].split(':')[0];
      var tooltiplabel = (graph.datasets[graph.dataKeys[i]].yLabel && !graph.datasets[graph.dataKeys[i]].notooltiplabel) || ''
      obj.val = number_format(val, decimals) + tooltiplabel;
      obj.add =
        block.tooltiptotal === true ||
        $.inArray(obj.key, block.tooltiptotal) !== -1;
      obj.col = tooltip.labelColors[i].backgroundColor;
      obj.fas = 'plus';

      if (obj.add) total += val;
      vals.push(obj);
    });

    if (total > 0) {
      vals.push({
        key: 'Total',
        val: number_format(total, block.decimals),
        col: 'white',
        fas: 'equals',
      });
    }

    var positionY = this._chart.canvas.offsetTop;
    var positionX = this._chart.canvas.offsetLeft;

    templateEngine.load('graph_tooltip').then(function (template) {
      var data = {
        icon: graph.block.buttonsIcon,
        colors: tooltip.labelColors,
        tlines: tooltip.title || [],
        range: graph.range,
        vals: vals,
        isdate: isdate,
        fmt: dformat,
      };

      tooltipEl.find('table').html(template(data));
    });
  }

  tooltipEl.css({
    opacity: 1,
    minWidth: minWidth,
    left: positionX + tooltip.caretX + 'px',
    top: positionY + tooltip.caretY + 'px',
    fontFamily: tooltip._bodyFontFamily,
    fontSize: tooltip.bodyFontSize + 'px',
    fontStyle: tooltip._bodyFontStyle,
    xOffset: tooltip.xOffset,
  });
}

function getDefaultGraphProperties(graph, block) {
  var defaultGraph = {
    type: 'line',
    data: {
      labels: [],
      datasets: [],
    },
    options: {
      maintainAspectRatio: false,
      tooltips: {
        mode: 'index',
        intersect: false,
        enabled: false,
        custom: block.showtooltip && function (tooltip) {
          return customTooltip.call(this, graph, block, tooltip)
        }
      },
      layout: {
        padding: {
          top: 20,
        },
      },
      legend: {
        labels: {
          fontColor: block.fontColor,
          fontSize: 14,
          filter: function (item, data) {
            return labelFilter(graph, item, data)
          }
        },
        position: 'bottom',
        display: false,
      },
      scales: {
        yAxes: [
          {
            stacked: block.stacked,
            ticks: {
              fontColor: block.fontColor,
              source: 'auto',
            },
            gridLines: {
              color: 'rgba(255,255,255,0.2)',
              display: true,
            },
          },
        ],
        xAxes: [
          {
            //            id: 0,
            stacked: block.stacked,
            offset: true,
            ticks: {
              fontColor: block.fontColor,
              source: 'auto',
            },
            gridLines: {
              color: 'rgba(255,255,255,0.2)',
              display: true,
            },
            type: 'time',
            time: {
              displayFormats: {
                minute: 'H:mm',
                hour:
                  graph.range === 'today' || graph.dataFilterUnit === 'today' || (graph.dataFilterUnit === 'hours' && graph.dataFilterCount <= 24)
                    ? 'H:mm'
                    : graph.range === 'day'
                      ? 'ddd H:mm'
                      : 'D MMM',
                day: 'D MMM',
              },
            },
            distribution: 'series',
          },
        ],
      },
      plugins: {
        zoom: {
          zoom: {
            enabled: block.zoom ? true : false,
            drag: {
              animationDuration: 1000,
            },
            mode: typeof block.zoom === 'boolean' ? 'x' : block.zoom,
            speed: 0.05,
            //it seems it's not possible to automatically adjust axis scaling after zoom
            /*        onZoomComplete: function(res) {
                          res.chart.update();
                          console.log('updated');
                        }*/
          },
        },
      },
      animation: {
        duration: 500,
        easing: 'easeOutSine',
      },
    },
  };
  return defaultGraph;
}

function labelFilter(graph, item, data) {
  //  return item;
  var key = graph.dataKeys[item.datasetIndex];
  var datasets = graph.block.datasets;
  item.hidden = !!(datasets && datasets[key] && datasets[key].hidefromlegend);
  if (item.hidden) return false;//item.text='';
  return item;
}

function createDefaultGraphP1Energy(me) {
  me.block.graph = ['line', 'bar', 'bar'];
  me.block.custom = {};

  me.block.custom[language.graph.last_hours] = {
    range: 'day',
    filter: '4 hours',
    data: {
      nett: 'd.v+d.v2-d.r1-d.r2',
      usage: 'd.v+d.v2',
      generation: '-d.r1-d.r2'
    },
    datasets: {
      nett: { yLabel: 'Watt'},
      usage: { yLabel: 'Watt', graph: 'bar'},
      generation: { yLabel: 'Watt', graph: 'bar'},
    }
  };
  
  me.block.custom[language.graph.today] = {
    range: 'today',
    data: {
      nett: 'd.v+d.v2-d.r1-d.r2',
      usage: 'd.v+d.v2',
      generation: '-d.r1-d.r2'
    },
    datasets: {
      nett: { yLabel: 'Watt'},
      usage: { yLabel: 'Watt', graph: 'bar'},
      generation: { yLabel: 'Watt', graph: 'bar'},
    }
  };

  me.block.custom[language.graph.last_month] = {
    range: 'year',
    filter: '1 month',
    data: {
      nett: 'd.v+d.v2-d.r1-d.r2',
      usage: 'd.v+d.v2',
      generation: '-d.r1-d.r2'
    },
    datasets: {
      nett: { yLabel: 'kWh'},
      usage: { yLabel: 'kWh', graph: 'bar'},
      generation: { yLabel: 'kWh', graph: 'bar'},
    }
  }

  me.block.options = {
    scales: {
      xAxes: [{
        stacked: true
      }],
    }
  }
}

function createDefaultGraphP1Gas(me, idx) {
  addToObject(me.block.datasets, 'v',{legend:'Gas', graph:'bar'},idx);

/*  me.block.graph = ['bar'];
  me.block.legend = {
    v: 'Gas'
  }
  me.block.graphTypes = ['v'];*/
  //if (!isDefined(me.block.legend)) me.block.legend=true;
  //if (!me.block.datasetColors) me.block.datasetColors=['blue','red','yellow'];

}

function addToObject(data, key, value, idx) {
  data[getKey(key, idx)] = value;
}

function getKey(key, idx) {
  return idx ? key + '_' + idx : key;
}

function addToSet(data, key, idx) {
  var fullKey = getKey(key, idx);
  if (!data.includes(fullKey)) {
    data.push(fullKey);
  }
}
function addTempConfig(me, i, showMinMaxTemp) {
  var notFirstDevice = i !== 0;
  var idx = notFirstDevice && me.graphDevices[i].idx;

  if (me.range === 'day') {
    me.block.lineTension = 0.2;
//    addToSet(me.block.graphTypes, 'te', 0);
//    addToObject(me.block.legend, 'te', getKey('Temperature', idx), idx);
    //      me.block.ylabels = [_TEMP_SYMBOL,'%'];
    addToObject(me.block.datasets, 'te', {
      legend: getKey('Temperature', idx),
    }, idx);
  }
  else {
    me.block.lineTension = 0.4;
    addToObject(me.block.datasets, 'ta', {
      legend: getKey('Temperature', idx),
      yLabel: _TEMP_SYMBOL
    }, idx);
    if (showMinMaxTemp) {
      addToObject(me.block.datasets, 'te', {
        legend: getKey('Max', idx),
        hidefromlegend: true,
      }, idx);
        addToObject(me.block.datasets, 'tm', {
          legend: getKey('Min', idx),
          fill: getKey('te', idx),
          gradient: ['red', 'blue'],
          color: 'blue',
          hidefromlegend: true,
        }, idx);
//        me.block.ylabels.push(_TEMP_SYMBOL, _TEMP_SYMBOL);
    }
    else {
      addToObject(me.block.datasets, 'te', { hideData: true, hidefromlegend: true }, idx);
      addToObject(me.block.datasets, 'tm', { hideData: true, hidefromlegend: true }, idx);
    }

    //    me.block.datasetColors = ['yellow','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)', 'green'];
  }

}

function createDefaultGraphGeneric(me) {
  var device = me.graphDevices[0];
//  me.block.legend = {};
//  me.block.graphTypes = [];
  me.block.datasets = {};
//  me.block.ylabels = [];
  //"Temp + Humidity + Baro"
  var tempDeviceCount=0;
  me.graphDevices.forEach(function (device, i) {
    if (device.Type.includes("Temp")) {
      tempDeviceCount+=1; //only show it for the device Temp device;
    }
  });
  var showMinMaxTemp = choose(me.block.showMinMaxTemp, tempDeviceCount===1);//by default only show it for one device Temp device;

  me.graphDevices.forEach(function (device, i) {
    if (device.Type.includes("Temp")) {
      addTempConfig(me, i, me.block.showMinMaxTemp || showMinMaxTemp);
    }
    if (device.SwitchType) {
      addToObject(me.block.datasets, 'l', { notooltiplabel: true, legend:device.Name }, i&&device.idx);
//      me.block.showtooltip = false;
    }


    /*
    if (me.range === 'day') {
      me.block.lineTension = 0.2;
      me.block.graphTypes = [ 'te','hu'];
      me.block.legend = {
        te: 'Temperature',
        hu: 'Humidity',
      }
//      me.block.ylabels = [_TEMP_SYMBOL,'%'];
//      me.block.datasetColors = ['yellow', 'green'];
    }
    else {
      me.block.lineTension = 0.4;
      me.block.legend = {
        ta: 'Temperature',
        te: 'Max',
        tm: 'Min',
        hu: 'Humidity',
      }
      me.block.ylabels = [_TEMP_SYMBOL,_TEMP_SYMBOL,_TEMP_SYMBOL, '%']

      me.block.datasets = {
        'tm': { fill: "te",
                hidefromlegend: true
              },
        'te': {hidefromlegend: true},
      }

      me.block.gradients=[
        ['green','green'],
        ['red','red'],
        ['red','blue'],
        ['purple','purple']
      ]

      me.block.datasetColors = ['yellow','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)', 'green'];

      me.block.hidefromlegend=['te','tm'];
    }
    */

  });
}

function createDefaultGraphGeneralkWh(me) {
  /*
  me.block.ylabels = ['Watt', 'Watt'];
  me.block.legend = {
    v: 'Power',
    eu: 'Energy per hour (Wh)'
  };
  if (me.range !== 'day') {
    me.block.ylabels = ['kWh'];
    me.block.legend = {
      v: 'Energy'
    };
    me.block.graph = 'bar';
  }
  */
  var custom = {}
  custom[language.graph.last_hours] = {
    range: 'day',
    filter: '4 hours',
    ylabels: ['Watt', 'Watt'],
    legend: {
      v: 'Power',
      eu: 'Energy per hour (Wh)'
    },
    graph: ['line', 'bar'],

  }

  custom[language.graph.today] = {
    range: 'today',
    ylabels: ['Watt', 'Watt'],
    legend: {
      v: 'Power',
      eu: 'Energy per hour (Wh)'
    },
    graph: ['line', 'line'],
  }


  custom[language.graph.last_month] =
  {
    range: 'year',
    filter: '1 month',
    ylabels: ['kWh'],
    legend: {
      v: 'Energy'
    },
    graph: 'bar'
  }

  me.block.custom = custom;

}

function getDefaultCustom(me) {
  var custom = {}
  custom[language.graph.last_hours] = {
    range: 'day',
    filter: '4 hours',
  }

  custom[language.graph.today] = {
    range: 'today',
  }

  custom[language.graph.last_month] = {
    range: 'year',
    filter: '1 month',
  }
  return custom;
}


function getYlabels(g) {
  var l = [];

  $.each(g.keys, function (i, key) {
    var label = isDefined(g.txtUnits[i]) ? g.txtUnits[i] : g.txtUnit;
    switch (key) {
      case 'v':
      case 'v2':
      case 'r1':
      case 'r2':
      case 'c':
      case 'c1':
      case 'c2':
      case 'c3':
      case 'c4':
      case 'v_min':
      case 'v_max':
      case 'v_avg':
      case 'u':
        if (g.subtype === 'Energy' || g.subtype === 'kWh') {
          label === 'kWh' && g.range === 'day'
            ? l.push('Watt')
            : l.push(label);
        } else if (g.subtype === 'Electric') {
          l.push('Watt');
        } else if (g.subtype === 'Gas') {
          l.push('m³');
        } else {
          l.push(label);
        }
        break;
      case 'eu':
      case 'eg':
        l.push('Wh');
        break;

      case 'lux':
        l.push('Lux');
        break;
      case 'lux_avg':
        l.push('Lux (avg)');
        break;
      case 'lux_min':
        l.push('Lux (min)');
        break;
      case 'lux_max':
        l.push('Lux (max)');
        break;
      case 'di':
        l.push('°');
        break;
      case 'gu':
      case 'sp':
        l.push('m/s');
        break;
      case 'ba':
        l.push('hPa');
        break;
      case 'hu':
        l.push('%');
        break;
      case 'te':
      case 'ta':
      case 'tm':
      case 'se':
      case 'sm':
      case 'sx':
        l.push(_TEMP_SYMBOL);
        break;
      case 'co2':
        l.push('ppm');
        break;
      default:
        l.push(label);
    }
  });
  return l;
}

function groupByDevice(me) {
  var arrData = [];
  var arrSetPoint = [];
  var arrLabels = [];
  var datasetColors = [];
  //  var graphIdx = devices[0].blockId + devices[0].idx;
  var graphIdx = me.graphIdx;
  var graph = me;

  graph.forced = false;
  graph.lastRefreshTime = time();
  me.currentValues = [];

  var devices = me.graphDevices;
  $.each(devices, function (i, device) {
    var data = Domoticz.getAllDevices()[device.idx];
    device.currentValue = device.Data;
    me.currentValues.push(device.Data);
    graph.txtUnit = device.txtUnit;

    if (
      data.CounterToday ||
      data.Temp ||
      data.SubType === 'Percentage' ||
      data.SensorUnit === '%'
    ) {
      if (data.CounterToday) arrData.push(parseFloat(data.CounterToday));
      if (data.Temp) {
        arrData.push(parseFloat(data.Temp));
        if (data.SetPoint) {
          me.hasSetPoint = true;
          arrSetPoint.push(parseFloat(data.SetPoint));
          if (data.Temp < data.SetPoint)
            datasetColors.push(graph.block.datasetColors[0]);
          if (data.Temp === data.SetPoint)
            datasetColors.push(graph.block.datasetColors[1]);
          if (data.Temp > data.SetPoint)
            datasetColors.push(graph.block.datasetColors[2]);
        }
      }
      if (data.SubType === 'Percentage' || data.SensorUnit === '%')
        arrData.push(parseFloat(data.Data));
      if (!me.block.labels) arrLabels.push(data.Name);
      else arrLabels.push(me.block.labels[i]);
    }
  });
  var html = createHeader(graph, false);

  var mountPoint = $(graph.mountPoint + ' > div');

  mountPoint.html(html);
  createButtons(graph);
  //updateHeaderValues(graph, false); //For groupByDevices graph no header values

  mountPoint.addClass('col-xs-' + graph.block.width);
  mountPoint.addClass('block_graph');
  mountPoint.addClass(graphIdx);
  //  $('.' + graphIdx + ' .graphcontent').css('height', setHeight(graph));

  var graphProperties = getDefaultGraphProperties(graph, graph.block);
  var xAxesType = 'category';
  var graphType = 'bar';
  var scaleLabel = {
    labelString: graph.txtUnit, //It uses the txtUnit of the latest device. Might be incorrect ...
    display: true,
    fontColor: graph.block.fontColor,
  };

  if (graph.block.groupByDevice === 'horizontal') {
    xAxesType = 'linear';
    graphType = 'horizontalBar';
    graphProperties.options.scales.xAxes[0].offset = false;
    graphProperties.options.scales.xAxes[0].scaleLabel = scaleLabel;
    graphProperties.options.scales.xAxes[0].ticks.beginAtZero =
      graph.block.beginAtZero;
  } else {
    graphProperties.options.scales.yAxes[0].scaleLabel = scaleLabel;
    graphProperties.options.scales.yAxes[0].ticks.beginAtZero =
      graph.block.beginAtZero;
  }

  var obj = {};
  obj.data = arrData;
  obj.backgroundColor = me.hasSetPoint
    ? datasetColors
    : graph.block.datasetColors;
  obj.label = me.hasSetPoint ? 'Temperature' : graph.txtUnit;
  obj.order = 1;
  graphProperties.data.datasets.push(obj);

  if (me.hasSetPoint) {
    var spColor = isDefined(graph.block.datasetColors[3])
      ? graph.block.datasetColors[3]
      : 'yellow';
    obj = {};
    obj.data = arrSetPoint;
    obj.label = 'SetPoint';
    obj.borderColor = spColor;
    obj.backgroundColor = spColor;
    obj.type = 'line';
    obj.borderWidth = 2;
    obj.pointRadius = 0;
    obj.fill = false;
    obj.order = 0;
    graphProperties.data.datasets.push(obj);
  }

  graphProperties.options.scales.yAxes[0].ticks.fontColor =
    graph.block.fontColor;
  graphProperties.options.scales.xAxes[0].type = xAxesType;
  graphProperties.type = graphType;
  graphProperties.data.labels = arrLabels;
  graphProperties.options.legend = false;

  var chartctx = mountPoint.find('canvas')[0].getContext('2d');
  new Chart(chartctx, graphProperties);
}
//# sourceURL=js/components/graph.js

/* Notes:
groupByDevices: No header value. (?) Also not after device update.
That means at a deviceUpdate the complete graph will be updated.

*/
