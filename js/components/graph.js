/* eslint-disable no-prototype-builtins */
/* global Dashticz Domoticz moment settings config Beaufort number_format  language time blocks   Chart _TEMP_SYMBOL  onlyUnique isDefined isObject setHeight*/
/* global templateEngine Handlebars*/
var allDevices = Domoticz.getAllDevices();

moment.locale(settings["language"]);

var DT_graph = {
  name: "graph",
  canHandle: function (block, key) {
    return (
      (block && block.devices) ||
      (typeof key === "string" && key.substring(0, 6) === "graph_")
    );
  },
  defaultCfg: getBlockDefaults,
  run: function (me) {
    Initialize(me);

    $.each(me.graphDevices, function (i, graphDevice) { //install the callback handles
      Domoticz.subscribe(graphDevice.idx, false, function (device) {
        deviceUpdate(me, graphDevice, device);
      });
    });
  },

  refresh: function (me) {
    getGraphData(me)
  }

};

Dashticz.register(DT_graph);

/** Initialization of the Graph object */
function Initialize(me) {
  me.graphDevices = [];
  me.block.devices = me.block.devices || [parseInt(me.key.split("_")[1])];
  $.each(me.block.devices, function (i, idx) {
    var device = {};
    $.extend(device, allDevices[idx]); //Make a copy of the current device data
    device.idx = parseInt(device.idx);
    getDeviceDefaults(device);
    me.graphDevices.push(device);
  });
  me.graphIdx = me.mountPoint.slice(1);
  me.lastRefreshTime = 0;
  me.range = me.block.range;
  me.title = me.block.title || me.graphDevices[0].Name;
}

function getBlockDefaults(me) {
  var datasetColors = ['red', 'yellow', 'blue', 'orange', 'green', 'purple', 'chartreuse', 'aqua', 'teal', 'pink', 'gray', 'fuchsia'];
  var block = {
    datasetColors: datasetColors,
    barWidth: 0.9,
    beginAtZero: false,
    borderColors: datasetColors,
    borderDash: [],
    borderWidth: 2,
    buttonsBorder: "white",
    buttonsColor: "black",
    buttonsFill: "white",
    buttonsIcon: "#686868",
    buttonsMarginX: 2,
    buttonsMarginY: 0,
    buttonsPadX: 6,
    buttonsPadY: 2,
    buttonsRadius: 0,
    buttonsShadow: false,
    buttonsSize: 14,
    buttonsText: false,
    cartesian: "linear",
    custom: false,
    customHeader: false,
    debugButton: false,
    displayFormats: false,
    drawOrderDay: false,
    drawOrderLast: false,
    drawOrderMonth: false,
    flash: false,
    gradients: false,
    graph: "line",
    graphTypes: false,
    groupBy: false,
    groupByDevice: false,
    height: false,
    iconColour: "grey",
    interval: 1,
    legend: false,
    lineFill: false,
    lineTension: 0.1,
    maxTicksLimit: null,
    method: 1,
    pointBorderColor: ["grey"],
    pointBorderWidth: 0,
    pointFillColor: datasetColors,
    pointRadius: 0,
    pointStyle: false,
    range: 'initial',
    refresh: 300,
    reverseTime: false,
    sortDevices: false,
    spanGaps: false,
    stacked: false,
    title: false,
    tooltiptotal: false,
    width: 12,
    zoom: false
  }
  return block;
}

/** Extends device with all default graph parameters
 * 
 * */
function getDeviceDefaults(device, popup) {
  var currentValue = device["Data"];
  var sensor = "counter";
  var txtUnit = "?";
  var decimals = 2;

  switch (device["Type"]) {
    case "Rain":
      sensor = "rain";
      txtUnit = "mm";
      decimals = 1;
      break;
    case "Lux":
      sensor = "counter";
      txtUnit = "Lux";
      decimals = 0;
      break;
    case "Wind":
      sensor = "wind";
      var windspeed = device.Data.split(";")[2] / 10;
      if (config["use_beaufort"]) {
        currentValue = Beaufort(windspeed);
        decimals = 0;
        txtUnit = "Bft";
      } else {
        currentValue = windspeed;
        decimals = 1;
        txtUnit = "m/s";
      }
      break;
    case "Temp":
    case "Temp + Humidity":
    case "Temp + Humidity + Baro":
    case "Heating":
      sensor = "temp";
      txtUnit = _TEMP_SYMBOL;
      currentValue = device["Temp"];
      decimals = 1;
      break;
    case "Humidity":
      sensor = "temp";
      txtUnit = "%";
      decimals = 1;
      break;
    case "RFXMeter":
      txtUnit = device["CounterToday"].split(" ")[1];
      currentValue = device["CounterToday"].split(" ")[0];
      switch (device["SwitchTypeVal"]) {
        case 0: //Energy
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
    case "Air Quality":
      sensor = "counter";
      txtUnit = "ppm";
      decimals = 1;
      break;
  }

  switch (device["SubType"]) {
    case "Percentage":
      sensor = "Percentage";
      txtUnit = "%";
      decimals = 1;
      break;
    case "Custom Sensor":
      sensor = "Percentage";
      txtUnit = device["SensorUnit"];
      decimals = 2;
      break;
    case "Gas":
      txtUnit = "m3";
      currentValue = device["CounterToday"];
      break;
    case "Electric":
      txtUnit = "Watt";
      break;
    case "Energy":
    case "kWh":
    case "YouLess counter":
      txtUnit = "kWh";
      currentValue = device["CounterToday"];
      break;
    case "Visibility":
      txtUnit = "km";
      break;
    case "Radiation":
    case "Solar Radiation":
      txtUnit = "Watt/m2";
      decimals = 0;
      break;
    case "Pressure":
      txtUnit = "Bar";
      break;
    case "Soil Moisture":
      txtUnit = "cb";
      break;
    case "Leaf Wetness":
      txtUnit = "Range";
      break;
    case "A/D":
      txtUnit = "mV";
      break;
    case "Voltage":
    case "VoltageGeneral":
      txtUnit = "V";
      break;
    case "DistanceGeneral":
    case "Distance":
      txtUnit = "cm";
      break;
    case "Sound Level":
      txtUnit = "dB";
      break;
    case "CurrentGeneral":
    case "CM113, Electrisave":
    case "Current":
      txtUnit = "A";
      break;
    case "Weight":
      txtUnit = "kg";
      break;
    case "Waterflow":
      sensor = "Percentage";
      txtUnit = "l/min";
      break;
    case "Counter Incremental":
      txtUnit = device["CounterToday"].split(" ")[1];
      currentValue = device["CounterToday"].split(" ")[0];
      break;
    case "Barometer":
      sensor = "temp";
      txtUnit = device["Data"].split(" ")[1];
      break;
    case "SetPoint":
      sensor = "temp";
      txtUnit = _TEMP_SYMBOL;
      currentValue = device["SetPoint"];
      decimals = 1;
      break;
  }

  var multidata = device.Data.split(',').length - 1 > 0;
  currentValue = multidata ?
    device.Data :
    number_format(currentValue, decimals).replace(",", ".") + " " + txtUnit;

  var obj = {
    currentValue: currentValue,
    customRange: false,
    data: {},
    dataFilterCount: 0,
    dataFilterUnit: "",
    decimals: decimals,
    graphConfig: null,
    idx: device.idx,
    lastRefreshTime: 0,
    name: device.Name,
    params: [],
    popup: popup,
    range: "initial",
    realrange: "",
    sensor: sensor,
    subtype: device.SubType,
    title: device.Name,
    txtUnit: txtUnit,
    txtUnits: [],
    type: device.Type
  };
  //  if (popup) getGraphData([dtGraphs[graphIdx]]); //todo: not here
  $.extend(device, obj)
}

// eslint-disable-next-line no-unused-vars
function showPopupGraph(blockdef) { //This function can be called from blocks.js to create the popup graph
  var popupBlock, graphIdx;
  if (blockdef.popup) {
    popupBlock = $.extend({}, blocks[blockdef.popup]);
    graphIdx = blockdef.popup + '_popup';
  } else {
    popupBlock = {
      devices: [blockdef.device.idx],
      width: 12
    };
    graphIdx = blockdef.device.idx + '_popup';
  }
  popupBlock.isPopup = true;
  var device = blockdef.device;
  if ($("#opengraph" + graphIdx).length === 0) {
    var html = '<div class="modal fade opengraph opengraph' + graphIdx + '" data-idx="' + device.idx + '" id="opengraph' + graphIdx + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
    html += '<div class="modal-dialog graphwidth">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header graphclose">';
    html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += "</div>";
    html += "</div>";
    html += "</div>";
    $("body").append(html);
    $('#opengraph' + graphIdx).modal('show');

    //Todo: find a more elegant way to set the height of the popup graph
    $('#opengraph' + graphIdx + ' .modal-content').height('90vh');

    //todo: I had to make use of setTimeout, otherwise the size is not computed correctly
    setTimeout(function () {
      var myblockselector = Dashticz.mountNewContainer('.opengraph' + graphIdx + ' .modal-content');

      if (!Dashticz.mount(myblockselector, popupBlock)) {
        console.log('Error mounting popup graph', popupBlock)
      }
    }, 200);
  }

  $('#opengraph' + graphIdx).modal('show');
}

/** This function handles a device update
 * 
 * */
function deviceUpdate(me, graphDevice, device) {
  $.extend(graphDevice, device);
  getDeviceDefaults(graphDevice); //In fact we only need a update of currentValue, but this is the most easy way
  updateHeaderValues(me, true);
}
/** This function will refresh the complete graph
 * 
 * 
 */
function getGraphData(me, selGraph) {
  if (me.block.groupByDevice) {
    groupByDevice(me);
  } else {
    //    var currentValues = []; //todo: fix header

    var header = me.block.customHeader;

    /* todo: rewrite customHeader generation 
    var customValues = [];
    var key;
    if (header) {
      for (key in header) {
        try {
          if (device.idx === parseInt(key)) {
            graph.currentValue = eval(
              header[key].replace("data", "graph.currentValue")
            );
          } else if (isNaN(key)) {
            header[key] = header[key].replace(
              "data." + device.idx,
              'parseFloat("' + graph.currentValue + '")'
            );

            if (devices.length - 1 === i) {
              customValues.push(eval(header[key]));
            }
          }
        } catch (error) {
          console.log("Error in customHeader:", key, header[key]);
          console.log(error);
        }
      }
    }
    */
    if (isDefined(selGraph)) {
      me.range = selGraph;
    }
    refreshGraph(me);
  }
}

/** Pulls all graph data from Domoticz and refreshes the graph
 * 
 */
function refreshGraph(me) {

  var isInitial = me.range === "initial";
  me.txtUnits = []; //todo: check txtUnits
  me.data = [];

  me.lastRefreshTime = time();
  //  txtUnits.push(me.txtUnit);

  if (isInitial) {
    switch (settings["standard_graph"]) {
      case "hours":
        me.range = "last";
        break;
      case "day":
        me.range = "day";
        break;
      case "month":
        me.range = "month";
        break;
    }
  }

  me.realrange = me.range;
  me.dataFilterCount = 0;
  me.dataFilterUnit = "";
  me.groupBy = me.block.groupBy;

  if (me.range === "last") {
    me.realrange = "day";
    me.dataFilterCount = 4;
    me.dataFilterUnit = "hours";
  }
  if (me.block.custom) {
    if (isInitial) {
      me.range = Object.keys(me.block.custom)[0];
      me.customRange = true;
      me.customRangeName = me.range;
    } else {
      //        graph.range = selGraph ? selGraph : graph.customRangeName;
      me.range = me.range || me.customRangeName; //Needed?
    }
    if (me.block.custom[me.range]) {
      me.graphConfig = me.block.custom[me.range];
      me.customRange = true;
      if (me.graphConfig.range) {
        switch (me.graphConfig.range) {
          case "day":
          case "month":
          case "year":
            me.realrange = me.graphConfig.range;
            break;
          case "last":
            me.dataFilterCount = 4;
            me.dataFilterUnit = "hours";
            me.realrange = "day";
            break;
          default:
            console.log("invalid range: " + me.graphConfig.range);
        }
        if (me.graphConfig.groupBy) {
          me.groupBy = me.graphConfig.groupBy;
        }
      }
      if (me.graphConfig.filter) {
        me.dataFilterCount = parseInt(me.graphConfig.filter);
        me.dataFilterUnit = me.graphConfig.filter
          .split(" ")
          .splice(-1)[0];
      }
      if (me.graphConfig.method) {
        me.block.method = me.graphConfig.method;
      }
    }
    if (!me.customRange) {
      console.log(
        "custom graph, but graph selector " + me.range + " not found"
      );
    }
  }

  //Now we request all Graph data sequentially
  $.when.apply($, me.graphDevices.map(function (device) {
      me.txtUnits.push(device.txtUnit); //todo: How does this work for tehuba devices?
      return getDeviceGraphData(me, device)
    }))
    .then(function () {
      redrawGraph(me)
    })
}


/**Request graph data for the device
 * Stores the data in me.data
 * And return a promise.
 */
function getDeviceGraphData(me, device) {
  var params = "type=graph&sensor=" + device.sensor + "&idx=" + device.idx + "&range=" + me.realrange + "&method=1"; //todo: check method

  return Domoticz.request(params)
    .then(function (data) {
      data.idx = device.idx;
      me.data.push(data);
    });
}

/** This function will update the graph.
 * All graph data must be available.
 */
function redrawGraph(me) {
  var multidata = {
    result: [],
    status: "OK",
    title: "Graph day"
  };

  if (me.sortDevices) {
    me.data.sort(function (a, b) {
      return b.result.length - a.result.length;
    });
  }

  var newKeys = [];
  var arrYkeys = [];

  $.each(me.data, function (z, d) {
    var currentKey = "";

    if (d.result && d.result.length > 0) {
      if (me.block.graphTypes) {
        for (var key in d.result[0]) {
          if (
            $.inArray(key, me.block.graphTypes) !== -1 &&
            key !== "d"
          ) {
            arrYkeys.push(key);
          }
        }
      } else {
        for (key in d.result[0]) {
          if (key !== "d") {
            arrYkeys.push(key);
          }
        }
      }

      $.each(d.result, function (x, res) {
        var valid = false;
        var interval = 1;
        if (me.hasBlock)
          interval =
          me.range === "last" || me.range === "month" ?
          1 :
          me.block.interval;

        if (x % interval === 0) {
          if (z == 0) {
            var obj = {};
            for (var key in res) {
              if (key === "d") {
                obj["d"] = res[key];
              }
              if ($.inArray(key, arrYkeys) !== -1) {
                currentKey = key + '_' + d.idx;
                obj[currentKey] = res[key];
                valid = true;
                if ($.inArray(currentKey, newKeys) === -1) {
                  newKeys.push(currentKey);
                }
              }
            }
            if (valid) multidata.result.push(obj);
          } else {
            for (key in res) {
              if (key !== "d" && $.inArray(key, arrYkeys) !== -1) {
                $.each(multidata.result, function (index, obj) {
                  $.each(obj, function (k, v) {
                    if (k === "d" && v === res["d"]) {
                      currentKey = key + '_' + d.idx;
                      multidata.result[index][currentKey] = res[key];
                      if ($.inArray(currentKey, newKeys) === -1) {
                        newKeys.push(currentKey);
                      }
                    }
                  });
                });
              }
            }
          }
        }
      });
    }
  });

  $.each(multidata.result, function (index, obj) {
    $.each(obj, function (k, v) {
      for (var n in newKeys) {
        if (!obj.hasOwnProperty(newKeys[n])) {
          obj[newKeys[n]] = NaN;
        }
      }
    });
  });

  var graph = me; //todo: replace graph with me in all following lines?
  graph.keys = arrYkeys;
  graph.ykeys = newKeys;
  //    graph.txtUnits = txtUnits; //todo: check txtUnits
  graph.txtUnit = graph.txtUnits[0]; //todo: temp fix
  graph.ylabels = getYlabels(graph);
  //graph.currentValues = currentValues; //todo: check currentValues

  // 20/02/20: GroupBy - hour|day|week|month
  if (graph.groupBy) {
    var groupArray = [];
    var groupObj = {};
    var md = multidata.result;
    var dayFormat = "YYYY-MM-DD";
    var groupStart;
    var add = graph.sensor === "counter" || graph.sensor === "rain" ? true : false;
    var x = 1;

    $.each(md, function (i, obj) {
      var end = i === md.length - 1;

      switch (graph.groupBy) {
        case "hour":
          groupStart = moment(obj.d, dayFormat)
            .hour(moment(obj.d, "YYYY-MM-DD HH:mm").hour())
            .format("YYYY-MM-DD HH:mm");
          break;
        case "day":
          groupStart = moment(obj.d, dayFormat).format(dayFormat);
          break;
        case "week":
          groupStart = moment(obj.d, dayFormat)
            .week(moment(obj.d, dayFormat).week())
            .day("Sunday")
            .format(dayFormat);
          break;
        case "month":
          groupStart = moment(obj.d, dayFormat)
            .startOf("month")
            .format(dayFormat);
          break;
      }

      if (groupObj.hasOwnProperty("d") && groupObj["d"] === groupStart) {
        $.each(obj, function (key, val) {
          if (key !== "d") {
            if (end) {
              if (!add) groupObj[key] = Number(groupObj[key] / x);
            } else {
              groupObj[key] += Number(val) || 0;
            }
          }
        });
        x++;
        if (end) groupArray.push(groupObj);
      } else {
        if (!$.isEmptyObject(groupObj)) {
          $.each(obj, function (key, val) {
            if (key !== "d") {
              if (!add) groupObj[key] = Number(groupObj[key] / x);
            }
          });
          groupArray.push(groupObj);
          x = 1;
        }
        groupObj = {};
        groupObj["d"] = groupStart;
        $.each(obj, function (key, val) {
          if (key !== "d") {
            groupObj[key] = Number(val) || 0;
            if (end) {
              if (!add) groupObj[key] = groupObj[key] / x;
            }
          }
        });
        if (end) groupArray.push(groupObj);
      }
    });
    multidata.result = groupArray;
  }
  graph.data = multidata;
  createGraph(graph);
}

function createGraph(graph) {
  var graphIdx = graph.graphIdx;

  if (graph.data.status === "ERR") {
    alert("Could not load graph!");
    return;
  }

  var ranges = ["last", "day", "month"];
  if (graph.customRange) ranges = Object.keys(graph.block.custom);
  var html = createHeader(graph, true);

  var mydiv = !graph.popup ?
    $(graph.mountPoint + " > div") :
    $(graph.mountPoint);

  if (!graph.popup) {
    mydiv.addClass("col-xs-" + graph.block.width);
    mydiv.addClass("block_graph");
    mydiv.addClass(graphIdx);
  }
  mydiv.html(html);
  createButtons(graph, ranges, graph.customRange);
  updateHeaderValues(graph, true);

  if (!(graph.data.result && graph.data.result.length)) {
    console.log("No graph data for device " + graphIdx);
    return;
  }

  var chartctx = mydiv.find('canvas')[0].getContext("2d");
  graph.chartctx = chartctx.canvas.id;
  var graphProperties = getDefaultGraphProperties(graph);
  $.extend(true, graphProperties, graph.block);

  if (graph.graphConfig) {
    $.extend(true, graph, graph.graphConfig);
  }

  if (!graph.popup) {
    $("." + graphIdx).css("height", setHeight(graph));
  }

  if (typeof graph.block.legend == "boolean") {
    graphProperties.options.legend.display = graph.block.legend;
  }
  var mydatasets = [];

  if (graph.dataFilterCount > 0) {
    var startMoment = moment()
      .subtract(graph.dataFilterCount, graph.dataFilterUnit)
      .format("YYYY-MM-DD HH:mm");
    graph.data.result = graph.data.result.filter(function (element) {
      return element.d > startMoment;
    });
  }

  if (graph.graphConfig) { //custom data    
    if (graph.graphConfig.ylabels) {
      graph.ylabels = graph.graphConfig.ylabels;
    } else {
      graph.keys = [];
      $.each(Object.values(graph.graphConfig.data), function (i, val) {
        graph.keys.push(val.split('.')[1].split('_')[0]);
      });
      graph.ylabels = getYlabels(graph);
    }
    graph.ykeys = Object.keys(graph.graphConfig.data);

    graph.ykeys.forEach(function (element, index) {
      mydatasets[element] = {
        data: [],
        label: element,
        backgroundColor: graph.block.datasetColors[index],
        barPercentage: graph.block.barWidth,
        borderColor: graph.block.borderColors[index],
        borderWidth: graph.block.borderWidth,
        borderDash: graph.block.borderDash,
        pointRadius: graph.block.pointRadius,
        pointStyle: graph.block.pointStyle[index],
        pointBackgroundColor: graph.block.pointFillColor[index],
        pointBorderColor: graph.block.pointBorderColor[index],
        pointBorderWidth: graph.block.pointBorderWidth,
        lineTension: graph.block.lineTension,
        spanGaps: graph.block.spanGaps,
        fill: graph.block.lineFill ? graph.block.lineFill[index] : graph.block.lineFill,
        yAxisID: index <= graph.ylabels.length ? graph.ylabels[index] : graph.ylabels[0]
      };

      if (graph.graphConfig.graph) {
        mydatasets[element].type = graph.graphConfig.graph;
      }
    });

    graph.data.result.forEach(function (y) {
      var valid = false;
      graph.ykeys.forEach(function (_value) {
        var customValue = graph.graphConfig.data[_value];
        var d = {};
        for (var key in y) {
          if (key !== "d") d[key] = parseFloat(y[key]);
        }
        try {
          var res = eval(customValue).toFixed(2);
          valid = true;
          var datapoint = {
            x: y.d,
            y: res
          };
          mydatasets[_value].data.push(datapoint);
        } catch (error) {
          console.log("error in eval " + customValue);
          console.log(error);
        }
      });
      if (valid) graphProperties.data.labels.push(y.d);
    });

    if (graph.graphConfig.graph) {
      graphProperties.type = graph.graphConfig.graph;
    }
    $.extend(true, graphProperties, graph.graphConfig);

  } else { // no custom data
    graph.ykeys.forEach(function (element, index) {
      mydatasets[element] = {
        data: [],
        label: element,
        yAxisID: graph.ylabels[index],
        backgroundColor: graph.block.datasetColors[index],
        barPercentage: graph.block.barWidth,
        borderColor: graph.block.borderColors[index],
        borderWidth: graph.block.borderWidth,
        borderDash: graph.block.borderDash,
        pointRadius: graph.block.pointRadius,
        pointStyle: graph.block.pointStyle[index],
        pointBackgroundColor: graph.block.pointFillColor[index],
        pointBorderColor: graph.block.pointBorderColor[index],
        pointBorderWidth: graph.block.pointBorderWidth,
        lineTension: graph.block.lineTension,
        spanGaps: graph.block.spanGaps,
        fill: graph.block.lineFill ? graph.block.lineFill[index] : graph.block.lineFill
      };
    });

    graph.data.result.forEach(function (element) {
      var valid = false;
      graph.ykeys.forEach(function (el) {
        if (isDefined(element[el])) {
          switch (el) {
            case "eu":
            case "eg":
              mydatasets[el].data.push({
                x: element.d,
                y: element[el]
              });
              break;
            default:
              mydatasets[el].data.push(element[el]);
              mydatasets[el].key = el;
              valid = true;
              break;
          }
        }
      });
      if (valid) graphProperties.data.labels.push(element.d);
    });
  }

  // draw the datasets in custom order
  if (!graph.block.custom) {
    var legendOrder = typeof graph.block.legend == "object" ? graph.block.legend : false;
    var drawOrderLast = typeof graph.block.drawOrderLast == "object" ? graph.block.drawOrderLast : false;
    var drawOrderDay = typeof graph.block.drawOrderDay == "object" ? graph.block.drawOrderDay : false;
    var drawOrderMonth = typeof graph.block.drawOrderMonth == "object" ? graph.block.drawOrderMonth : false;
    var order = false;

    if (drawOrderLast || drawOrderDay || drawOrderMonth) {
      switch (graph.range) {
        case "last":
          order = drawOrderLast;
          break;
        case "month":
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
        var key = drawOrderLast === false && drawOrderDay === false && drawOrderMonth === false ? keyIdx : order[keyIdx];
        Object.keys(mydatasets).forEach(function (element) {
          if (mydatasets[element].key == key) {
            arr[key] = mydatasets[key];
          }
        });
      }
      mydatasets = arr;
    }
  }

  Object.keys(mydatasets).forEach(function (element) {
    if (typeof graph.block.legend == "object") {
      if (isDefined(graph.block.legend[element]))
        mydatasets[element].label = graph.block.legend[element];
      graphProperties.options.legend.display = true;
    }
    graphProperties.data.datasets.push(mydatasets[element]);
  });

  //create the y-axes, ylabels contains the labels
  var uniqueylabels = graph.ylabels.filter(onlyUnique);
  var labelLeft = true;
  var axisCount =
    graph.options && graph.options.scales && graph.options.scales.yAxes ?
    graph.options.scales.yAxes.length :
    0;
  graphProperties.options.scales.yAxes = []; // reset to empty
  uniqueylabels.forEach(function (element, i) {
    var yaxis = {
      id: element,
      stacked: graph.block.stacked,
      type: graph.block.cartesian,
      ticks: {
        reverse: false,
        fontColor: "white"
      },
      gridLines: {
        color: "rgba(255,255,255,0.2)"
      },
      scaleLabel: {
        labelString: element,
        display: true,
        fontColor: "white"
      },
      position: labelLeft ? "left" : "right"
    };
    graphProperties.options.scales.yAxes.push(yaxis);
    if (i < axisCount)
      $.extend(
        true,
        graphProperties.options.scales.yAxes[i],
        graph.options.scales.yAxes[i]
      );
    labelLeft = !labelLeft;
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
            return dataset.label + " " + newlabelString;
          }, "(" + yAxis.scaleLabel.labelString + ")");
      });
  }

  if (isDefined(graph.block.legend)) {
    if ($.isArray(graph.block.legend)) {
      graph.block.legend.forEach(function (element, idx) {
        graphProperties.data.datasets[idx].label = element;
      });
      graphProperties.options.legend.display = true;
    }
  }
  switch (typeof graph.block.graph) {
    case "string":
      graphProperties.type = graph.block.graph;
      break;
    case "object":
      graph.block.graph.forEach(function (element, idx) {
        graphProperties.data.datasets[idx].type = element;
      });
      graphProperties.type = "bar";
      break;
    default:
      break;
  }

  graph.block.displayFormats ?
    $.extend(
      graphProperties.options.scales.xAxes[0].time.displayFormats,
      graph.block.displayFormats
    ) :
    graphProperties.options.scales.xAxes[0].time.displayFormats;
  graphProperties.options.scales.xAxes[0].ticks.maxTicksLimit = graph.block.maxTicksLimit;
  graphProperties.options.scales.xAxes[0].ticks.reverse = graph.block.reverseTime;
  graphProperties.options.legend.labels.usePointStyle = graph.block.pointStyle;

  if (graph.block.beginAtZero) {
    if (graphProperties.options.scales.yAxes.length === 1) {
      graphProperties.options.scales.yAxes[0].ticks.beginAtZero = graph.block.beginAtZero;
    } else {
      if (typeof graph.block.beginAtZero === 'object') {
        graph.block.beginAtZero.forEach(function (beginAtZero, i) {
          if (i < graphProperties.options.scales.yAxes.length) {
            graphProperties.options.scales.yAxes[i].ticks.beginAtZero = beginAtZero;
          }
        });
      }
    }
  }

  if (graph.block.gradients) {
    var prop = graph.block;
    var gHeight = isDefined(prop.gradientHeight) ? prop.gradientHeight : 1;
    graphProperties.plugins = [{
      beforeRender: function (x, options) {
        var c = x.chart;
        $.each(prop.ykeys, function (i, key) {
          if (isDefined(prop.gradients[i])) {
            if (!isObject(prop.gradients[i]))
              prop.gradients[i] = [
                prop.datasetColors[i],
                prop.datasetColors[i]
              ];
            var yScale = x.scales[prop.txtUnit];
            var yPos = yScale.getPixelForValue(i);
            var gradientFill = c.ctx.createLinearGradient(
              0,
              0,
              0,
              gHeight * yPos
            );
            gradientFill.addColorStop(
              0,
              prop.gradients[i][0] ? prop.gradients[i][0] : "red"
            );
            gradientFill.addColorStop(
              1,
              prop.gradients[i][1] ? prop.gradients[i][1] : "yellow"
            );
            var model =
              x.data.datasets[i]._meta[
                Object.keys(x.data.datasets[i]._meta)[0]
              ].dataset._model;
            model.backgroundColor = gradientFill;
          }
        });
      }
    }];
  }
  //console.log(graphProperties);
  var chart = new Chart(chartctx, graphProperties);
  //charts[dtGraphs[graphIdx].chartctx] = chart;
}

function createHeader(graph) {
  var html = '<div class="graphheader"><div class="graphtitle"><i class="fas fa-chart-bar" style="font-size:20px;margin-left:5px;color:' + graph.block.iconColour + '">&nbsp;</i>' + graph.title + '&nbsp;<span class="graphValues' + graph.graphIdx + '">';
  html += "</span></div>";
  html += "</div>";
  html += '<div class="graph swiper-no-swiping' + (graph.popup ? " popup graphheight" : "") + '" id="' + graph.graphIdx + '">';
  html += "<canvas " + 'id="graphoutput_' + graph.graphIdx + '"></canvas>';
  return html += "</div>";
}

function createButtons(graph, ranges, customRange) {
  var btn = {};
  var buttons = '<div class="btn-group graphbuttons" role="group" aria-label="Graph Buttons"></div>';
  var btnIcons = [
    "fas fa-clock",
    "fas fa-calendar-day",
    "fas fa-calendar-week"
  ];
  var style = 'style="';

  btn.icon = graph.block.buttonsIcon;
  btn.text = graph.block.buttonsText;
  btn.size = "font-size:" + graph.block.buttonsSize + "px!important;";
  btn.color = "color:" + graph.block.buttonsColor + ";";
  btn.fill = "background-color:" + graph.block.buttonsFill + ";";
  btn.border = "border-color:" + graph.block.buttonsBorder + ";";
  btn.radius = "border-radius:" + graph.block.buttonsRadius + "px;";
  btn.padX = "padding-left:" + graph.block.buttonsPadX + "px;padding-right:" + graph.block.buttonsPadX + "px;";
  btn.padY = "padding-top:" + graph.block.buttonsPadY + "px;padding-bottom:" + graph.block.buttonsPadY + "px;";
  btn.marginX = "margin-left:" + graph.block.buttonsMarginX + "px;margin-right:" + graph.block.buttonsMarginX + "px;";
  btn.marginY = "margin-top:" + graph.block.buttonsMarginY + "px;margin-bottom:" + graph.block.buttonsMarginY + "px;";
  btn.shadow = "box-shadow: 0px 8px 15px " + graph.block.buttonsShadow + ";";

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
      btn.shadow
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
      month: btn.text !== false ? btn.text[2] : language.graph.last_month
    };

    ranges.forEach(function (item, i) {
      var btnText = customRange ? item : btnTextList[item];
      var newButton = '<button type="button" ' + style + '" class="btn btn-default';
      if (graph.range === item) newButton += " active";
      newButton += '"><i class="' + btnIcons[i] + '" style="font-size:14px;color:' + btn.icon + '">&nbsp;</i>&nbsp;' + btnText + "</button> ";
      $(newButton)
        .click(function () {
          getGraphData(graph, item)
        })
        .appendTo($buttons)
    });
  }

  if (graph.block.zoom) {
    var newButton = '';
    newButton += '<button type="button" data-canvas="graphoutput_' + graph.graphIdx + '" id="resetZoom' + graph.graphIdx + '" ' + style + '" class="btn btn-default">';
    newButton += '  <i class="fas fa-search-minus" style="font-size:14px;color:' + btn.icon + '"></i>';
    newButton += "</button>";

    $(document).on("click", "#resetZoom" + graph.graphIdx, function () {
      Chart.helpers.each(Chart.instances, function (instance) {
        if (
          instance.chart.canvas.id ===
          $("#resetZoom" + graph.graphIdx).data("canvas")
        ) {
          instance.chart.resetZoom();
        }
      });
    });
    $(newButton).appendTo($buttons);
  }

  if (graph.block.debugButton) {
    newButton = "";
    newButton += '<div class="btn-group">';
    newButton += '  <button type="button" id="graphMenu_' + graph.graphIdx + '" ' + style + '" class="btn btn-default dropdown-toggle" data-toggle="dropdown">';
    newButton += '    <i class="fas fa-bars" style="font-size:14px;color:' + btn.icon + '"></i>';
    newButton += '  </button>';
    newButton += '  <ul class="dropdown-menu pull-right">';
    newButton += '  </ul>';
    newButton += '</div>';
    var newLi = '<li><a href="#" ><i class="fas fa-code" style="font-size:14px;color:' + btn.icon + '">&nbsp;</i>&nbsp;Show Data</a></li>';
    var $newLi = $(newLi)
      .click(function () {
        showData(graph);
        return false;
      });
    var $newButton = $(newButton);
    $newButton.find('.dropdown-menu').append($newLi);

    $newButton.appendTo($buttons);
  }
  $buttons.appendTo(graph.mountPoint + ' .graphheader');
}

function updateHeaderValues(graph, showValues) {

  var $values = $(".graphValues" + graph.graphIdx);

  templateEngine.load("graph_header").then(function (template) {

    var currentValues = [];
    graph.graphDevices.forEach(function (el) {
      currentValues.push(el.currentValue);
    })

    var data = {
      show: showValues,
      //      mg: graph.multigraph,
      mg: true, //todo: always handle as multigraph. Can be simplified ...
      cv: graph.graphDevices[0].currentValue,
      cvs: currentValues,
      icon: graph.block.iconColour,
    };

    $values.empty().html(template(data));

    if (graph.block.flash && graph.block.flash > 0) {
      $(".graphValues" + graph.graphIdx)
        .toggleClass("blockchange")
        .delay(graph.block.flash)
        .queue(function (next) {
          $(this).toggleClass("blockchange");
          next();
        });
    }
  });
}

function showData(graph) {
  var graphIdx = graph.graphIdx;
  if ($('#modal_' + graphIdx).length === 0) {
    var html = '';
    html += '<div id="modal_' + graphIdx + '" class="modal graph-menu" tabindex="-1" role="dialog">';
    html += ' <div class="modal-dialog" role="document">';
    html += '   <div class="modal-content" style="background-image:url(' + config['background_image'] + ');">';
    html += '     <div class="modal-header">';
    html += '       <div class="flex-row title">';
    html += '         <h5 class="modal-title"><i class="fas fa-chart-line"></i>' + graph.title + '</h5>';
    html += '         <div class="btn-group" role="group" aria-label="Graph Debug">';
    html += '           <a type="button" class="btn debug" href="#" onclick="console.log(dtGraphs[\'' + graphIdx + '\']); return false;"><i class="fas fa-code"></i></a>';
    html += '           <a type="button" class="btn debug" href="data:application/octet-stream;charset=utf-16le;base64,' + btoa(JSON.stringify(graph, null, 2)) + '" download="' + graphIdx + '.json"><i class="fas fa-save"></i></a>';
    html += '           <button type="button" class="btn debug" data-dismiss="modal"><i class="fas fa-window-close"></i></button>';
    html += '         </div>';
    html += '       </div>';
    html += '       <hr/>';
    html += '       <div class="flex-row">';
    html += '         <div class="devices"><i class="fas fa-bolt text-yellow"></i><span class="label">Devices:</span>' + graph.block.devices.join(', ') + '</div>';

    if (!graph.block.groupByDevice) {
      html += '         <div class="input-keys"><i class="fas fa-key text-red"></i><span class="label">Input Keys:</span>' + graph.keys.join(', ') + '</div>';
      html += '         <div class="output-keys"><i class="fas fa-key text-green"></i><span class="label">Output Keys:</span>' + graph.ykeys.join(', ') + '</div>';
      html += '         <div class="ylabels"><i class="fas fa-balance-scale-right text-blue"></i></i><span class="label">Y Labels:</span>' + graph.ylabels.join(', ') + '</div>';
    }

    html += '       </div>';
    html += '     </div>';
    html += '     <div class="modal-body">';
    html += '       <div class="flex-row">';
    html += '         <div class="device-list"></div>';
    html += '         <textarea class="form-control" rows="20">' + JSON.stringify(graph, null, 2) + '</textarea>';
    html += '       </div>';
    html += '     </div>';
    html += ' </div>';
    html += '</div>';



    $(html).appendTo('body');

    $.each(graph.block.devices, function (i, idx) {
      // var g = dtGraphs[graph.primaryIdx]; //todo: I would expect g is just graph
      var url = config['domoticz_ip'] + '/json.htm?type=devices&rid=' + idx;

      $.getJSON(url, function (data) {
        var device = data.result[0];
        var d = '';
        d += '<div class="device">';
        d += '  <div class="col-md-10">';
        d += '    <div class="name"><span class="label">Name:</span>' + device.Name + '</div>';
        d += '    <div class="type"><span class="label">Type:</span>' + device.Type + '</div>';
        d += '    <div class="subtype"><span class="label">SubType:</span>' + device.SubType + '</div>';
        d += '    <div class="hardwareName"><span class="label">Hardware Name:</span>' + device.HardwareName + '</div>';
        d += '    <div class="data"><span class="label">Data:</span>' + device.Data + '</div>';
        d += '    <div class="lastUpdate"><span class="label">Last Update:</span>' + device.LastUpdate + '</div>';
        d += '  </div>';
        d += '  <div class="col-md-2 col-fas">';
        d += '    <a class="idx text-yellow" href="' + url + '" target="_blank"><i class="fas fa-info-circle">&nbsp;</i>' + device.idx + '</a>';
        /* todo: check g.params
        if (!graph.block.groupByDevice) {
          d += '    <a class="idx text-red" href="' + config['domoticz_ip'] + '/json.htm?' + g.params[i] + '" target="_blank"><i class="fas fa-database">&nbsp;</i>Data</a>';
        }*/
        d += '  </div>';
        d += '</div>';
        $(d).appendTo('#modal_' + graphIdx + ' .device-list');
      });
    });
  }
  $('#modal_' + graphIdx).modal('show');
}

Handlebars.registerHelper("splitString", function (str, cha, options) {
  return options.fn(str[0].split(cha)[0]);
});

function getDefaultGraphProperties(graph) {
  return {
    type: "line",
    data: {
      labels: [],
      datasets: []
    },
    options: {
      maintainAspectRatio: false,
      tooltips: {
        mode: "index",
        intersect: false,
        enabled: false,
        custom: function (tooltip) {
          var tooltipEl = $('#' + graph.graphIdx + '_chartjs-tooltip');
          var minWidth = graph.range !== 'day' ? 100 : 135;

          if (tooltipEl.length === 0) {
            templateEngine.load("graph_tooltip_table").then(function (template) {
              $('#graphoutput_' + graph.graphIdx).parent().append(template({
                idx: graph.graphIdx,
                minw: minWidth
              }));
            });
          }

          if (tooltip.opacity === 0) {
            tooltipEl.css({
              opacity: 0
            });
            return;
          }

          tooltipEl.removeClass('left right');
          if (tooltip.yAlign) tooltipEl.removeClass('left right center bottom').addClass(tooltip.xAlign).addClass(tooltip.yAlign);

          function getBody(bodyItem) {
            return bodyItem.lines;
          }

          if (tooltip.body) {

            var isdate = moment(tooltip.title, 'YYYY-MM-DD').isValid();
            var dformat = graph.range === 'day' || graph.range === 'last' ? 'HH:mm, DD/MM/YYYY' : 'DD/MM/YYYY';
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
                tooltip.title[0] = language.evohome[s[0]] + " > " + until;
              } else {
                tooltip.title[0] = language.evohome[status];
              }
            }

            bodyLines.forEach(function (body, i) {
              var val = parseFloat(body[0]);
              //todo: next line throws an error. As workaround I've added previous line and the try/catch.
              try {
                val = parseFloat(body[0].split(':')[1].replace('NaN', '0'));
              } catch (err) {
                console.log('error in tooltip')
              }
              var obj = {};
              obj.key = body[0].split(':')[0];
              obj.val = formatThousand(val, graph.decimals);
              obj.add = graph.block.tooltiptotal === true || $.inArray(obj.key, graph.block.tooltiptotal) !== -1;
              obj.col = tooltip.labelColors[i].backgroundColor;
              obj.fas = 'plus';

              if (obj.add) total += val;
              vals.push(obj);

            });

            if (total > 0) {
              vals.push({
                key: "Total",
                val: formatThousand(total, graph.decimals),
                col: "white",
                fas: "equals"
              });
            }

            templateEngine.load("graph_tooltip").then(function (template) {

              var data = {
                icon: graph.block.buttonsIcon,
                colors: tooltip.labelColors,
                tlines: tooltip.title || [],
                range: graph.range,
                vals: vals,
                isdate: isdate,
                fmt: dformat
              }

              tooltipEl.find('table').html(template(data))
            });
          }

          var positionY = this._chart.canvas.offsetTop;
          var positionX = this._chart.canvas.offsetLeft;

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
      },
      layout: {
        padding: {
          top: 20
        }
      },
      legend: {
        labels: {
          fontColor: "white",
          fontSize: 14
        },
        position: "bottom",
        display: false
      },
      scales: {
        yAxes: [{
          stacked: graph.block.stacked,
          ticks: {
            fontColor: "white",
            source: "auto"
          },
          gridLines: {
            color: "rgba(255,255,255,0.2)",
            display: true
          },
        }],
        xAxes: [{
          stacked: graph.block.stacked,
          offset: true,
          ticks: {
            fontColor: "white",
            source: "auto"
          },
          gridLines: {
            color: "rgba(255,255,255,0.2)",
            display: true
          },
          type: "time",
          time: {
            displayFormats: {
              minute: "H:mm",
              hour: graph.realrange === "day" ? "ddd H:mm" : "D MMM",
              day: "D MMM"
            }
          },
          distribution: "series"
        }]
      },
      plugins: {
        zoom: {
          zoom: {
            enabled: graph.block.zoom ? true : false,
            drag: {
              animationDuration: 1000
            },
            mode: typeof graph.block.zoom === 'boolean' ? 'x' : graph.block.zoom,
            speed: 0.05
          }
        }
      },
      animation: {
        duration: 500,
        easing: 'easeOutSine'
      },
    }
  };
}

function getYlabels(g) {
  var l = [];
  $.each(g.keys, function (i, key) {
    var label = isDefined(g.txtUnits[i]) ? g.txtUnits[i] : g.txtUnit;
    switch (key) {
      case "v":
      case "v2":
      case "eu":
      case "r1":
      case "r2":
      case "c":
      case "c1":
      case "c2":
      case "c3":
      case "c4":
      case "v_min":
      case "v_max":
      case "v_avg":
      case "u":
        if (g.subtype === 'Energy' || g.subtype === 'kWh') {
          label === "kWh" && g.realrange === "day" ? l.push("Watt") : l.push(label);
        } else if (g.subtype === 'Electric') {
          l.push("Watt");
        } else if (g.subtype === 'Gas') {
          l.push("m³");
        } else {
          l.push(label);
        }
        break;
      case "lux":
        l.push("Lux");
        break;
      case "lux_avg":
        l.push("Lux (avg)");
        break;
      case "lux_min":
        l.push("Lux (min)");
        break;
      case "lux_max":
        l.push("Lux (max)");
        break;
      case "di":
        l.push("°");
        break;
      case "gu":
      case "sp":
        l.push("m/s");
        break;
      case "ba":
        l.push("hPa");
        break;
      case "hu":
        l.push("%");
        break;
      case "te":
      case "ta":
      case "tm":
      case "se":
      case "sm":
      case "sx":
        l.push(_TEMP_SYMBOL);
        break;
      case "co2":
        l.push("ppm");
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
  var initial = graph.range === "initial" ? true : false;

  graph.forced = false;
  graph.lastRefreshTime = time();
  //  dtGraphs[graphIdx] = graph;
  me.currentValues = [];

  var devices = me.graphDevices;
  $.each(devices, function (i, device) {
    var data = allDevices[device.idx];
    device.currentValue = device.Data;
    me.currentValues.push(device.Data);

    if (
      data.CounterToday ||
      data.Temp ||
      data.SubType === "Percentage" ||
      data.SensorUnit === "%"
    ) {
      if (data.CounterToday) arrData.push(parseFloat(data.CounterToday));
      if (data.Temp) {
        arrData.push(parseFloat(data.Temp));
        if (data.SetPoint) {
          me.hasSetPoint = true;
          arrSetPoint.push(parseFloat(data.SetPoint));
          if (data.Temp < data.SetPoint) datasetColors.push(graph.block.datasetColors[0]);
          if (data.Temp === data.SetPoint) datasetColors.push(graph.block.datasetColors[1]);
          if (data.Temp > data.SetPoint) datasetColors.push(graph.block.datasetColors[2]);
        }
      }
      if (data.SubType === "Percentage" || data.SensorUnit === "%") arrData.push(parseFloat(data.Data));
      arrLabels.push(data.Name);
    }

  });
  var html = createHeader(graph, false);

  var mountPoint = $(graph.mountPoint + " > div");

  mountPoint.html(html);
  createButtons(graph);
  updateHeaderValues(graph, true);


  mountPoint.addClass("col-xs-" + graph.block.width);
  mountPoint.addClass("block_graph");
  mountPoint.addClass(graphIdx);
  $("." + graphIdx).css("height", setHeight(graph));

  var graphProperties = getDefaultGraphProperties(graph);
  var xAxesType = 'category';
  var graphType = 'bar';
  var scaleLabel = {
    labelString: graph.txtUnit,
    display: true,
    fontColor: "white"
  };

  if (graph.block.groupByDevice === 'horizontal') {
    xAxesType = 'linear';
    graphType = 'horizontalBar';
    graphProperties.options.scales.xAxes[0].offset = false;
    graphProperties.options.scales.xAxes[0].scaleLabel = scaleLabel;
    graphProperties.options.scales.xAxes[0].ticks.beginAtZero = graph.block.beginAtZero;
  } else {
    graphProperties.options.scales.yAxes[0].scaleLabel = scaleLabel;
    graphProperties.options.scales.yAxes[0].ticks.beginAtZero = graph.block.beginAtZero;
  }

  var obj = {};
  obj.data = arrData;
  obj.backgroundColor = me.hasSetPoint ? datasetColors : graph.block.datasetColors;
  obj.label = me.hasSetPoint ? 'Temperature' : graph.txtUnit;
  obj.order = 1;
  graphProperties.data.datasets.push(obj);

  if (me.hasSetPoint) {
    var spColor = isDefined(graph.block.datasetColors[3]) ? graph.block.datasetColors[3] : 'yellow';
    var obj = {};
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

  graphProperties.options.scales.yAxes[0].ticks.fontColor = "white";
  graphProperties.options.scales.xAxes[0].type = xAxesType;
  graphProperties.type = graphType;
  graphProperties.data.labels = arrLabels;
  graphProperties.options.legend = false;

  var chartctx = mountPoint.find("canvas")[0].getContext("2d");
  new Chart(chartctx, graphProperties);
}
//# sourceURL=js/components/graph.js