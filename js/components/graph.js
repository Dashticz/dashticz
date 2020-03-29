/* eslint-disable no-prototype-builtins */
/* global Dashticz moment settings config Beaufort number_format alldevices language time blocks usrEnc pwdEnc Chart _TEMP_SYMBOL getWeekNumber*/
var allDevices = Domoticz.getAllDevices();
var dtGraphs = [];
var _GRAPHREFRESH = 5;
var p = "p";

var DT_graph = {
  name: "graph",
  canHandle: function(block, key) {
    return (
      (block && block.devices) ||
      (typeof key === "string" && key.substring(0, 6) === "graph_")
    );
  },
  run: function(me) {
    if (
      (typeof me.block !== "undefined" &&
        typeof me.block.devices !== "undefined") ||
      (typeof me.key === "string" && me.key.substring(0, 6) === "graph_")
    ) {
      var graphDevices = getBlockConfig(me);

      $.each(graphDevices, function(i, graphDevice) {
        Domoticz.subscribe(graphDevice.idx, true, function(device) {
          getDeviceDefaults(graphDevice);
          if (graphDevices.length - 1 === i) {
            getGraphData(graphDevices);
          }
        });
      });
    }
  }
};

Dashticz.register(DT_graph);

function getBlockConfig(me) {
  var graphDevices = [];
  var hasBlock = isDefined(me.block) && isDefined(me.block.devices) ? true : false;
  var graphIdx = hasBlock ? me.block.devices[0] : me.key.split("_")[1];
  var devices = hasBlock ? me.block.devices : [parseInt(graphIdx)];

  $.each(devices, function(i, idx) {
    var obj = {};
    obj.blockId = me.mountPoint.slice(1);
    obj.hasBlock = hasBlock;
    obj.mountPoint = me.mountPoint;
    obj.multigraph = devices.length > 1;
    obj.graphIdx = obj.blockId + devices[i]
    obj.primary = i === 0;
    obj.primaryIdx = obj.primary
      ? obj.blockId + devices[i]
      : obj.blockId + devices[0];

    obj.block = getBlockDefaults(devices, hasBlock, me.block);

    var device = $.extend(obj, allDevices[idx]);
    device.Name = hasBlock && device.block.title? device.block.title : device.Name;
    device.idx = parseInt(device.idx);
    graphDevices.push(device);
  });
  return graphDevices;
}

function getBlockDefaults(devices, hasBlock, b) {
  var datasetColors = ['red', 'yellow', 'blue', 'orange', 'green', 'purple', 'chartreuse', 'aqua', 'teal', 'pink', 'gray', 'fuchsia'];

  var block = {};
  block.devices = devices;
  block.datasetColors = hasBlock && isDefined(b.datasetColors) ? b.datasetColors : datasetColors;
  block.barWidth = hasBlock && isDefined(b.barWidth) ? b.barWidth : 0.9;
  block.beginAtZero = hasBlock && isDefined(b.beginAtZero) ? b.beginAtZero : false;
  block.borderColors = hasBlock && isDefined(b.borderColors)? b.borderColors : block.datasetColors;
  block.borderDash = hasBlock && isDefined(b.borderDash) ? b.borderDash : [];
  block.borderWidth = hasBlock && isDefined(b.borderWidth) ? b.borderWidth : 2;
  block.buttonsBorder = hasBlock && isDefined(b.buttonsBorder) ? b.buttonsBorder : "white";
  block.buttonsColor = hasBlock && isDefined(b.buttonsColor) ? b.buttonsColor : "black";
  block.buttonsFill = hasBlock && isDefined(b.buttonsFill) ? b.buttonsFill : "white";
  block.buttonsIcon = hasBlock && isDefined(b.buttonsIcon) ? b.buttonsIcon : "#686868";
  block.buttonsMarginX = hasBlock && isDefined(b.buttonsMarginX) ? b.buttonsMarginX : 2;
  block.buttonsMarginY = hasBlock && isDefined(b.buttonsMarginY) ? b.buttonsMarginY : 0;
  block.buttonsPadX = hasBlock && isDefined(b.buttonsPadX) ? b.buttonsPadX : 6;
  block.buttonsPadY = hasBlock && isDefined(b.buttonsPadY) ? b.buttonsPadY : 2;
  block.buttonsRadius = hasBlock && isDefined(b.buttonsRadius) ? b.buttonsRadius : 0;
  block.buttonsShadow = hasBlock && isDefined(b.buttonsShadow) ? b.buttonsShadow : false;
  block.buttonsSize = hasBlock && isDefined(b.buttonsSize) ? b.buttonsSize : 14;
  block.buttonsText = hasBlock && isDefined(b.buttonsText) ? b.buttonsText : false;
  block.cartesian = hasBlock && isDefined(b.cartesian) ? b.cartesian : "linear";
  block.custom = hasBlock && isDefined(b.custom) ? b.custom : false;
  block.debugButton = hasBlock && isDefined(b.debugButton) ? b.debugButton : false;
  block.displayFormats = hasBlock && isDefined(b.displayFormats) ? b.displayFormats : false;
  block.drawOrderDay = hasBlock && isDefined(b.drawOrderDay) ? b.drawOrderDay : false;
  block.drawOrderLast = hasBlock && isDefined(b.drawOrderLast) ? b.drawOrderLast : false;
  block.drawOrderMonth = hasBlock && isDefined(b.drawOrderMonth) ? b.drawOrderMonth : false;
  block.gradients = hasBlock && isDefined(b.gradients) ? b.gradients : false;
  block.graph = hasBlock && isDefined(b.graph) ? b.graph : "line";
  block.graphTypes = hasBlock && isDefined(b.graphTypes) ? b.graphTypes : false;
  block.groupBy = hasBlock && isDefined(b.groupBy) ? b.groupBy : false;
  block.groupByDevice = hasBlock && isDefined(b.groupByDevice) ? b.groupByDevice : false;
  block.height = hasBlock && isDefined(b.height) ? b.height : false;
  block.iconColour = hasBlock && isDefined(b.iconColour) ? b.iconColour : "grey";
  block.interval = hasBlock && isDefined(b.interval) ? b.interval : 1;
  block.legend = hasBlock && isDefined(b.legend) ? b.legend : false;
  block.lineFill = hasBlock && isDefined(b.lineFill) ? b.lineFill : false;
  block.lineTension = hasBlock && isDefined(b.lineTension) ? b.lineTension : 0.1;
  block.maxTicksLimit = hasBlock && isDefined(b.maxTicksLimit) ? b.maxTicksLimit : null;
  block.method = hasBlock && isDefined(b.method) ? b.method : 1;
  block.pointBorderColor = hasBlock && isDefined(b.pointBorderColor) ? b.pointBorderColor : ["grey"];
  block.pointBorderWidth = hasBlock && isDefined(b.pointBorderWidth) ? b.pointBorderWidth : 0;
  block.pointFillColor = hasBlock && isDefined(b.pointFillColor)? b.pointFillColor : block.datasetColors;
  block.pointRadius = hasBlock && isDefined(b.pointRadius) ? b.pointRadius : 0;
  block.pointStyle = hasBlock && isDefined(b.pointStyle) ? b.pointStyle : false;
  block.reverseTime = hasBlock && isDefined(b.reverseTime) ? b.reverseTime : false;
  block.sortDevices = hasBlock && isDefined(b.sortDevices) ? b.sortDevices : false;
  block.spanGaps = hasBlock && isDefined(b.spanGaps) ? b.spanGaps : false;
  block.stacked = hasBlock && isDefined(b.stacked) ? b.stacked : false;
  block.title = hasBlock && isDefined(b.title) ? b.title : false;
  block.toolTipStyle = hasBlock && isDefined(b.toolTipStyle) ? b.toolTipStyle : false;
  block.width = hasBlock && isDefined(b.width) ? b.width : 12;
  block.zoom = hasBlock && isDefined(b.zoom) ? b.zoom : false;
  return block;
}

function getDeviceDefaults(device, popup) {
  moment.locale(settings["calendarlanguage"]);
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

  var graphIdx = device.graphIdx;
  var multidata = device.Data.split(',').length - 1 > 0;
  currentValue = multidata
    ? device.Data
    : number_format(currentValue, decimals).replace(",", ".") + " " + txtUnit;
  popup = isDefined(popup) && popup ? true : false;

  if (!isDefined(dtGraphs[graphIdx])) {
    dtGraphs[graphIdx] = {
      blockId: device.blockId,
      block: device.block,
      currentValue: currentValue,
      currentValues: [],
      customRange: false,
      data: {},
      dataFilterCount: 0,
      dataFilterUnit: "",
      decimals: decimals,
      forced: false,
      graphConfig: null,
      graphIdx: graphIdx,
      hasBlock: device.hasBlock,
      idx: device.idx,
      lastRefreshTime: 0,
      mountPoint: device.mountPoint,
      multigraph: device.multigraph,
      name: device.Name,
      params: [],
      popup: popup,
      primary: device.primary,
      primaryIdx: device.primaryIdx,
      range: "initial",
      realrange: "",
      sensor: sensor,
      subtype: device.SubType,
      title: device.Name,
      txtUnit: txtUnit,
      txtUnits: [],
      type: device.Type
    };
  }
  dtGraphs[graphIdx].currentValue = currentValue;
  if (popup) getGraphData([dtGraphs[graphIdx]]);
}

function showPopupGraph(blockdef) {
  var device = blockdef.device;
  if ($("#opengraph" + device["idx"]).length === 0) {
    var html = '<div class="modal fade opengraph opengraph' + device.idx + p + '" data-idx="' + device.idx + '" id="opengraph' + device.idx + p + '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
    html += '<div class="modal-dialog graphwidth">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header graphclose">';
    html += '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body block_graph_' + device.idx + p + '">' + language.misc.loading;
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
    $("body").append(html);
  }

  var definedPopup = typeof blockdef.popup !== 'undefined'? blockdef.popup : false; 

  var obj = {};
  obj.blockId = device.idx + p;
  obj.graphIdx = obj.blockId + device.idx;

  if(definedPopup){
    obj.block = getBlockDefaults([device.idx], true, blocks[definedPopup]);
    obj.hasBlock = true;
  } else {
    obj.block = getBlockDefaults([device.idx], false);
    obj.hasBlock = false;
  }

  obj.mountPoint = ".block_graph_" + obj.blockId;
  obj.multigraph = false;
  obj.primary = true;
  obj.primaryIdx = obj.graphIdx;

  var popDevice = $.extend(obj, blockdef.device);
  $("#opengraph" + device.idx + p).modal();
  getDeviceDefaults(popDevice, true);
}

function getGraphData(devices, selGraph) {
  if (devices[0].block.groupByDevice){
    groupByDevice(devices);
  } else {
    var multidata = { result: [], status: "OK", title: "Graph day" };
    var arrResults = [];
    var currentValues = [];
    var txtUnits = [];
  
    $.each(devices, function (i, device) {
      var graphIdx = device.blockId + device.idx;
      var graph = dtGraphs[graphIdx]; 
            
      currentValues.push(graph.currentValue);
  
      if (isDefined(selGraph)) {
        graph.range = selGraph;
        graph.forced = true;
      }
  
      if (graph.lastRefreshTime < time() - parseFloat(_GRAPHREFRESH) * 60) {
        graph.forced = true;
      }
  
      if (graph.forced) {
        var isInitial = graph.range === "initial";
        graph.forced = false;
        graph.lastRefreshTime = time();
        txtUnits.push(graph.txtUnit);
  
        if (isInitial) {        
          switch (settings["standard_graph"]) {
            case "hours":
              graph.range = "last";
              break;
            case "day":
              graph.range = "day";
              break;
            case "month":
              graph.range = "month";
              break;
          }
        }
  
        graph.realrange = graph.range;
        graph.dataFilterCount = 0;
        graph.dataFilterUnit = "";
        graph.groupBy = graph.block.groupBy;
  
        if (graph.range === "last") {
          graph.realrange = "day";
          graph.dataFilterCount = 4;
          graph.dataFilterUnit = "hours";
        }
        if (graph.block.custom) {
          if (isInitial) {
            graph.range = Object.keys(graph.block.custom)[0];
            graph.customRange = true;
            graph.customRangeName = graph.range;
          } else {
            graph.range = selGraph? selGraph : graph.customRangeName;
          }
          if (graph.block.custom[graph.range]) {          
            graph.graphConfig = graph.block.custom[graph.range];
            graph.customRange = true;
            if (graph.graphConfig.range) {
              switch (graph.graphConfig.range) {
                case "day":
                case "month":
                case "year":
                  graph.realrange = graph.graphConfig.range;
                  break;
                case "last":
                  graph.dataFilterCount = 4;
                  graph.dataFilterUnit = "hours";
                  graph.realrange = "day";
                  break;
                default:
                  console.log("invalid range: " + graph.graphConfig.range);
              }
              if (graph.graphConfig.groupBy){
                graph.groupBy = graph.graphConfig.groupBy;
              }
            }          
            if (graph.graphConfig.filter) {
              graph.dataFilterCount = parseInt(graph.graphConfig.filter);
              graph.dataFilterUnit = graph.graphConfig.filter
                .split(" ")
                .splice(-1)[0];
            }
            if (graph.graphConfig.method) {
              graph.block.method = graph.graphConfig.method;
            }
          }
          if (!graph.customRange) {
            console.log(
              "custom graph, but graph selector " + graph.range + " not found"
            );
          }
        }
  
        var params = "&type=graph&sensor=" + dtGraphs[graphIdx].sensor + "&idx=" + dtGraphs[graphIdx].idx + "&range=" + graph.realrange;
        dtGraphs[graph.primaryIdx].params.push(params.slice(1));      
  
        $.ajax({
          url: settings["domoticz_ip"] + "/json.htm?username=" + usrEnc + "&password=" + pwdEnc + params + "&method=1&time=" + new Date().getTime() + "&jsoncallback=?",
          type: "GET",
          async: true,
          contentType: "application/json",
          dataType: "jsonp",
          success: function (data) {
            data.idx = device.idx;
            arrResults.push(data);
  
            if (devices.length === arrResults.length) {
              if (graph.sortDevices) {
                arrResults.sort(function (a, b) {
                  return b.result.length - a.result.length;
                });
              }
  
              var newKeys = [];
              var arrYkeys = [];
  
              $.each(arrResults, function (z, d) {
                var currentKey = "";
                var counter = z + 1;
  
                if (d.result && d.result.length > 0) {
                  if (graph.hasBlock && graph.block.graphTypes) {
                    for (var key in d.result[0]) {
                      if (
                        $.inArray(key, graph.block.graphTypes) !== -1 &&
                        key !== "d"
                      ) {
                        arrYkeys.push(key);
                      }
                    }
                  } else {
                    for (var key in d.result[0]) {
                      if (key !== "d") {
                        arrYkeys.push(key);
                      }
                    }
                  }
  
                  $.each(d.result, function (x, res) {
                    var valid = false;
                    var interval = 1;
                    if (graph.hasBlock)
                      interval =
                        graph.range === "last" || graph.range === "month"
                          ? 1
                          : graph.block.interval;
  
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
                        for (var key in res) {
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
                // All device data collected
                if (arrResults.length === counter) {
                  $.each(multidata.result, function (index, obj) {
                    $.each(obj, function (k, v) {
                      for (var n in newKeys) {
                        if (!obj.hasOwnProperty(newKeys[n])) {
                          obj[newKeys[n]] = NaN;
                        }
                      }
                    });
                  });
  
                  graph = dtGraphs[graph.primaryIdx];
                  graph.keys = arrYkeys;
                  graph.ykeys = newKeys;
                  graph.txtUnits = txtUnits;
                  graph.ylabels = getYlabels(graph);
                  graph.currentValues = currentValues;
                 
                  // 20/02/20: GroupBy - hour|day|week|month
                  if (graph.groupBy) {
                    var groupArray = [];
                    var groupObj = {};
                    var md = multidata.result;
                    var dayFormat = "YYYY-MM-DD";
                    var groupStart;
                    var add = graph.sensor === "counter" || graph.sensor === "rain"? true : false;
                    var x = 1;
  
                    $.each(md, function(i, obj) {
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
                        $.each(obj, function(key, val) {
                          if (key !== "d") {
                            if(end){
                              if(!add) groupObj[key] = Number(groupObj[key] / x);
                            } else {
                              groupObj[key] += Number(val) || 0;
                            }
                          }
                        });
                        x++;
                        if (end) groupArray.push(groupObj);
                      } else {
                        if (!$.isEmptyObject(groupObj)) {
                          $.each(obj, function(key, val) {
                            if (key !== "d") {
                              if(!add) groupObj[key] = Number(groupObj[key] / x);
                            }
                          });
                          groupArray.push(groupObj);
                          x = 1;
                        }
                        groupObj = {};
                        groupObj["d"] = groupStart;
                        $.each(obj, function(key, val) {
                          if (key !== "d") {
                            groupObj[key] = Number(val) || 0;
                            if (end) {
                              if(!add) groupObj[key] = groupObj[key] / x;
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
              });
            }
          }
        });
      }
    });
  }

  
}

function createGraph(graph) {
  var graphIdx = graph.graphIdx;

  if (graph.data.status === "ERR") {
    alert("Could not load graph!");
    return;
  }

  var ranges = ["last", "day", "month"];
  if (graph.customRange) ranges = Object.keys(graph.block.custom);
  var buttons = createButtons(graph, ranges, graph.customRange);
  var html = createHeader(graph, true, buttons);

  var mydiv = !graph.popup
    ? $(graph.mountPoint + " > div")
    : $(graph.mountPoint);

  if (!graph.popup) {
    mydiv.addClass("col-xs-" + graph.block.width);
    mydiv.addClass("block_graph");
    mydiv.addClass("block_" + graphIdx);
  }
  mydiv.html(html);

  if (!(graph.data.result && graph.data.result.length)) {
    console.log("No graph data for device " + graphIdx);
    return;
  }

  var chartctx = mydiv.find('canvas')[0].getContext("2d");
  var graphProperties = getDefaultGraphProperties(graph);
  $.extend(true, graphProperties, graph.block);

  if (graph.graphConfig) {
    $.extend(true, graph, graph.graphConfig);
  }

  if (!graph.popup) {
    var graphwidth = $(".block_" + graphIdx).width();
    var setHeight = Math.min(
      Math.round((graphwidth / window.innerWidth) * window.innerHeight - 25),
      window.innerHeight - 50
    );
    if (graph.block.height) setHeight = graph.block.height;
    if (setHeight) $(".block_" + graphIdx).css("height", setHeight);
  }

  if (typeof graph.block.legend == "boolean") {
    graphProperties.options.legend.display = graph.block.legend;
  }
  var mydatasets = [];

  if (graph.dataFilterCount > 0) {
    var startMoment = moment()
      .subtract(graph.dataFilterCount, graph.dataFilterUnit)
      .format("YYYY-MM-DD HH:mm");
    graph.data.result = graph.data.result.filter(function(element) {
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

    graph.ykeys.forEach(function(element, index) {
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
        fill: graph.block.lineFill? graph.block.lineFill[index] : graph.block.lineFill,
        yAxisID: index <= graph.ylabels.length? graph.ylabels[index] : graph.ylabels[0]
      };

      if (graph.graphConfig.graph) {
        mydatasets[element].type = graph.graphConfig.graph;
      }
    });

    graph.data.result.forEach(function(y) {
      var valid = false;
      graph.ykeys.forEach(function(_value) {
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

    graph.ykeys.forEach(function(element, index) {
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
        fill: graph.block.lineFill? graph.block.lineFill[index] : graph.block.lineFill
      };
    });

    graph.data.result.forEach(function(element) {
      var valid = false;
      graph.ykeys.forEach(function(el) {
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
    var drawOrderLast = typeof graph.block.drawOrderLast == "object"? graph.block.drawOrderLast : false;
    var drawOrderDay = typeof graph.block.drawOrderDay == "object" ? graph.block.drawOrderDay : false;
    var drawOrderMonth = typeof graph.block.drawOrderMonth == "object"? graph.block.drawOrderMonth : false;
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
        var key = drawOrderLast === false && drawOrderDay === false && drawOrderMonth === false? keyIdx : order[keyIdx];      
        Object.keys(mydatasets).forEach(function(element) {
          if (mydatasets[element].key == key) {
            arr[key] = mydatasets[key];
          }
        });
      }
      mydatasets = arr;
    }
  }

  Object.keys(mydatasets).forEach(function(element) {
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
    graph.options && graph.options.scales && graph.options.scales.yAxes
      ? graph.options.scales.yAxes.length
      : 0;
  graphProperties.options.scales.yAxes = []; // reset to empty
  uniqueylabels.forEach(function(element, i) {
    var yaxis = {
      id: element,
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
      .filter(function(element) {
        //filter the ylabels that have an initial label
        return element.scaleLabel && isDefined(element.scaleLabel.labelString);
      })
      .forEach(function(yAxis) {
        yAxis.scaleLabel.labelString = graphProperties.data.datasets
          .filter(function(dataset) {
            return dataset.yAxisID === yAxis.id;
          })
          .reduce(function(newlabelString, dataset) {
            return dataset.label + " " + newlabelString;
          }, "(" + yAxis.scaleLabel.labelString + ")");
      });
  }

  if (isDefined(graph.block.legend)) {
    if ($.isArray(graph.block.legend)) {
      graph.block.legend.forEach(function(element, idx) {
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
      graph.block.graph.forEach(function(element, idx) {
        graphProperties.data.datasets[idx].type = element;
      });
      graphProperties.type = "bar";
      break;
    default:
      break;
  }

  graph.block.displayFormats
    ? $.extend(
        graphProperties.options.scales.xAxes[0].time.displayFormats,
        graph.block.displayFormats
      )
    : graphProperties.options.scales.xAxes[0].time.displayFormats;
  graphProperties.options.scales.xAxes[0].ticks.maxTicksLimit = graph.block.maxTicksLimit;
  graphProperties.options.scales.xAxes[0].ticks.reverse = graph.block.reverseTime;
  graphProperties.options.legend.labels.usePointStyle = graph.block.pointStyle;
  
  if(graph.block.beginAtZero){
    if(graphProperties.options.scales.yAxes.length === 1){
      graphProperties.options.scales.yAxes[0].ticks.beginAtZero = graph.block.beginAtZero;
    } else {
      if(typeof graph.block.beginAtZero === 'object'){        
        graph.block.beginAtZero.forEach(function(beginAtZero, i){
          if(i < graphProperties.options.scales.yAxes.length){
            graphProperties.options.scales.yAxes[i].ticks.beginAtZero = beginAtZero;
          }          
        });
      }
    } 
  }

  if (graph.block.gradients) {
    var prop = graph.block;
    var gHeight = isDefined(prop.gradientHeight) ? prop.gradientHeight : 1;
    graphProperties.plugins = [
      {
        beforeRender: function(x, options) {
          var c = x.chart;
          $.each(prop.ykeys, function(i, key) {
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
      }
    ];
  }
  //console.log(graphProperties);
  new Chart(chartctx, graphProperties);
}

function createHeader(graph, showValues, buttons){
  var title = '<div class="graphheader"><div class="graphtitle"><i class="fas fa-chart-bar" style="font-size:20px;margin-left:5px;color:' + graph.block.iconColour + '">&nbsp;</i>' + graph.name + '&nbsp;<span class="graphcurrent' + graph.graphIdx + '">';
  var span = showValues? '&nbsp;<i class="fas fa-equals" style="font-size:14px;color:' + graph.block.iconColour + '">&nbsp;</i>&nbsp;' : '';
  var btns = isDefined(buttons)? buttons : '';

  if (!graph.multigraph) {
    if (isDefined(graph.currentValue)) {
      title += span + (showValues? graph.currentValue.replace( /, /g, '<span style="color:' + graph.block.iconColour + ';font-weight:900;font-size:16px;"> | </span>') + '</span>' : '');
    }
  } else {
    if (isDefined(graph.currentValues)) {
      title += span;
      if(showValues){
        $.each(graph.currentValues, function(i, val) {
          if (i < graph.currentValues.length - 1) {
            title += graph.currentValues[i] + '<span style="color:' + graph.block.iconColour + ';font-weight:900;font-size:16px;"> | </span></span>';
          } else {
            title += graph.currentValues[i];
          }
        });
      }      
    }
  }
  title += "</div>";
  var html = "";
  html += title + '<div class="graphbuttons" >' + btns + "</div>";
  html += "</div>";
  html += '<div class="graph swiper-no-swiping' + (graph.popup ? " popup graphheight" : "") + '" id="' + graph.graphIdx + '">';
  html += "<canvas " + 'id="graphoutput_' + graph.graphIdx + '"></canvas>';
  return html += "</div>";
}

function createButtons(graph, ranges, customRange) {
  var btn = {};
  var buttons = '<div class="btn-group graphbuttons" role="group" aria-label="Graph Buttons">';
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
    function(i, s) {
      if (isDefined(s)) style += s;
    }
  );

  if(isDefined(ranges)){
    var btnTextList = {
      last: btn.text !== false ? btn.text[0] : language.graph.last_hours,
      day: btn.text !== false ? btn.text[1] : language.graph.today,
      month: btn.text !== false ? btn.text[2] : language.graph.last_month
    };
  
    ranges.forEach(function(item, i) {
      var btnText = customRange ? item : btnTextList[item];
      buttons += '<button type="button" ' + style + '" class="btn btn-default';
      if (graph.range === item) buttons += " active";
      buttons += '" onclick="updateGraphs(\'' + graph.blockId + "', [" + graph.block.devices + "],'" + item + "','" + graph.popup + '\');"><i class="' + btnIcons[i] + '" style="font-size:14px;color:' + btn.icon + '">&nbsp;</i>&nbsp;' + btnText + "</button> ";
    });
  }

  if (graph.block.zoom) {
    buttons += '<button type="button" data-canvas="graphoutput_' + graph.graphIdx + '" id="resetZoom' + graph.graphIdx + '" ' + style + '" class="btn btn-default">';
    buttons += '  <i class="fas fa-search-minus" style="font-size:14px;color:' + btn.icon + '"></i>';
    buttons += "</button>";

    $(document).on("click", "#resetZoom" + graph.graphIdx, function() {
      Chart.helpers.each(Chart.instances, function(instance) {
        if (
          instance.chart.canvas.id ===
          $("#resetZoom" + graph.graphIdx).data("canvas")
        ) {
          instance.chart.resetZoom();
        }
      });
    });
  }

  if(graph.block.debugButton){
    buttons += '<div class="btn-group">';
    buttons += '  <button type="button" id="graphMenu_' + graph.graphIdx + '" ' + style + '" class="btn btn-default dropdown-toggle" data-toggle="dropdown">';
    buttons += '    <i class="fas fa-bars" style="font-size:14px;color:' + btn.icon + '"></i>';
    buttons += '  </button>';
    buttons += '  <ul class="dropdown-menu pull-right">';
    buttons += '    <li><a href="#" onclick="showData(\'' + graph.graphIdx + '\'); return false;"><i class="fas fa-code" style="font-size:14px;color:' + btn.icon + '">&nbsp;</i>&nbsp;Show Data</a></li>';
    buttons += '  </ul>';
    buttons += '</div>';
  }
  buttons += "</div>";
  return buttons;
}

function showData(graphIdx){
  var graph = dtGraphs[graphIdx];
  if($('#modal_' + graphIdx).length === 0){
    var html = '';
    html += '<div id="modal_' + graphIdx + '" class="modal graph-menu" tabindex="-1" role="dialog">';
    html += ' <div class="modal-dialog" role="document">';
    html += '   <div class="modal-content" style="background-image:url(' + config['background_image'] + ');">';
    html += '     <div class="modal-header">';
    html += '       <div class="flex-row title">';
    html += '         <h5 class="modal-title"><i class="fas fa-chart-line"></i>' + graph.name + '</h5>';
    html += '         <div class="btn-group" role="group" aria-label="Graph Debug">';
    html += '           <a type="button" class="btn debug" href="#" onclick="console.log(dtGraphs[\'' + graphIdx + '\']); return false;"><i class="fas fa-code"></i></a>';
    html += '           <a type="button" class="btn debug" href="data:application/octet-stream;charset=utf-16le;base64,' + btoa(JSON.stringify(dtGraphs[graph.graphIdx], null, 2)) + '" download="' + graphIdx + '.json"><i class="fas fa-save"></i></a>';
    html += '           <button type="button" class="btn debug" data-dismiss="modal"><i class="fas fa-window-close"></i></button>';
    html += '         </div>';
    html += '       </div>';
    html += '       <hr/>';
    html += '       <div class="flex-row">';    
    html += '         <div class="devices"><i class="fas fa-bolt text-yellow"></i><span class="label">Devices:</span>' + graph.block.devices.join(', ') + '</div>';
    
    if(!graph.block.groupByDevice){
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
      var g = dtGraphs[graph.primaryIdx];
      var url = config['domoticz_ip'] + '/json.htm?type=devices&rid=' + idx;
      
      $.getJSON(url, function( data ) {
        var device = data.result[0];
        var d ='';
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
        d += '    <a class="idx text-yellow" href="' + url + '" target="_blank"><i class="fas fa-info-circle">&nbsp;</i>' + device.idx +'</a>';
        if(!graph.block.groupByDevice){
          d += '    <a class="idx text-red" href="' + config['domoticz_ip'] + '/json.htm?' + g.params[i] + '" target="_blank"><i class="fas fa-database">&nbsp;</i>Data</a>';
        } 
        d += '  </div>';
        d += '</div>';
        $(d).appendTo('#modal_' + graphIdx + ' .device-list');
      });
    });
  }  
  $('#modal_' + graphIdx).modal('show');
}

function updateGraphs(blockId, ids, range, popup) {
  var devices = [];
  $.each(ids, function(i, idx) {
    var device = dtGraphs[blockId + idx];
    devices.push(device);
  });
  getGraphData(devices, range);
}

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
        enabled: !graph.popup ? !graph.block.toolTipStyle : false,
        custom: function (tooltip) {

          if (graph.block.toolTipStyle || graph.popup) {

            var tooltipEl = $('#' + graph.primaryIdx + '_chartjs-tooltip');
            minWidth = graph.range !== 'day' ? 100 : 135;

            if (tooltipEl.length === 0) {
              var tt = '<div id="' + graph.primaryIdx + '_chartjs-tooltip" class="chartjs-tooltip" style="midWidth:' + minWidth + '"><table></table></div>';
              $('#graphoutput_' + graph.primaryIdx).parent().append(tt);
            }

            if (tooltip.opacity === 0) {
              tooltipEl.css({ opacity: 0 });
              return;
            }

            tooltipEl.removeClass('left right');
            if (tooltip.yAlign) tooltipEl.removeClass('left right center bottom').addClass(tooltip.xAlign).addClass(tooltip.yAlign);

            function getBody(bodyItem) {
              return bodyItem.lines;
            }

            if (tooltip.body) {
              var titleLines = tooltip.title || [];
              var bodyLines = tooltip.body.map(getBody);
              var html = '<thead style="border-color:' + graph.block.buttonsIcon + '">';

              titleLines.forEach(function (title) {
                title = graph.range !== 'day' ? moment(title).format("DD/MM/YYYY") : moment(title).format("HH:mm, DD/MM/YYYY");
                html += '<tr><th colspan="3"><i class="far fa-clock" style="color:' + graph.block.buttonsIcon + '"></i>' + title + '</th></tr>';
              });

              html += '</thead><tbody>';

              bodyLines.forEach(function (body, i) {
                var colors = tooltip.labelColors[i];
                var key = body[0].split(':')[0];
                var style = 'background:' + colors.backgroundColor + '; border-color:' + colors.borderColor + ';';
                var span = '<span class="chartjs-tooltip-key" style="' + style + '"></span>';
                html += '<tr><td>' + span + '</td>';
                html += '<td class="popup_' + key + '">' + key + '</td>';
                html += '<td class="value">' + parseFloat(body[0].split(':')[1].replace('NaN', '0')).toFixed(2) + '</td></tr>';
              });
              html += '</tbody>';
              tooltipEl.find('table').html(html);
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
        yAxes: [
          {
            stacked: graph.block.stacked,
            ticks: {
              fontColor: "white",
              source: "auto"
            },
            gridLines: {
              color: "rgba(255,255,255,0.2)",
              display: true
            },
          }
        ],
        xAxes: [
          {
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
          }
        ]
      },
      plugins: {
        zoom: {
          zoom: {
            enabled: graph.block.zoom? true : false,
            drag: {
              animationDuration: 1000
            },
            mode: graph.block.zoom? graph.block.zoom : 'xy',
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

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

function isDefined(prop) {
  return typeof prop !== "undefined" ? true : false;
}

function isObject(prop) {
  return typeof prop === "object" ? true : false;
}

function getYlabels(g) {  
  var l = [];
  $.each(g.keys, function (i, key) {
    var label = isDefined(g.txtUnits[i])? g.txtUnits[i] : g.txtUnit;
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
        if (g.subtype === 'Energy' || g.subtype === 'kWh'){
          label === "kWh" && g.realrange === "day" ? l.push("Watt") : l.push(label);
        } else if (g.subtype === 'Electric') {
          l.push("Watt");
        } else if (g.subtype === 'Gas'){
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
function groupByDevice(devices) {

  var arrData = [];
  var arrSetPoint = [];
  var arrLabels = [];
  var datasetColors = [];
  var graphIdx = devices[0].blockId + devices[0].idx;
  var graph = dtGraphs[graphIdx];
  var initial = graph.range === "initial" ? true : false;

  if (graph.lastRefreshTime < time() - parseFloat(_GRAPHREFRESH) * 60) {
    graph.forced = true;
  }

  if (graph.forced) {
    graph.forced = false;
    graph.lastRefreshTime = time();
    dtGraphs[graphIdx] = graph;

    $.each(devices, function (i, device) {
      data = allDevices[device.idx];
      dtGraphs[graph.primaryIdx].currentValues.push(graph.currentValue);

      if (
        data.CounterToday ||
        data.Temp ||
        data.SubType === "Percentage" ||
        data.SensorUnit === "%"
      ) {
        if (data.CounterToday) arrData.push(parseFloat(data.CounterToday));
        if (data.Temp) {
          arrData.push(parseFloat(data.Temp));
          if(data.SetPoint) {
            arrSetPoint.push(parseFloat(data.SetPoint));
            if(data.Temp < data.SetPoint) datasetColors.push('blue');
            if(data.Temp === data.SetPoint) datasetColors.push('orange');
            if(data.Temp > data.SetPoint) datasetColors.push('red');
          }
        }
        if (data.SubType === "Percentage" || data.SensorUnit === "%") arrData.push(parseFloat(data.Data));        
        arrLabels.push(data.Name);
      }

      if (devices.length - 1 === i) {
        var buttons = createButtons(graph);
        var html = createHeader(dtGraphs[graph.primaryIdx], false, buttons);
        var mountPoint = $(graph.mountPoint + " > div");

        if (initial) {
          mountPoint.addClass("col-xs-" + graph.block.width);
          mountPoint.addClass("block_graph");
          mountPoint.addClass("block_" + graphIdx);
          mountPoint.html(html);
          var graphwidth = $(".block_" + graphIdx).width();
          var setHeight = Math.min(Math.round((graphwidth / window.innerWidth) * window.innerHeight - 25), window.innerHeight - 50);
          setHeight = graph.block.height ? graph.block.height : setHeight;
          $(".block_" + graphIdx).css("height", setHeight);
        }

        var graphProperties = getDefaultGraphProperties(graph);
        var xAxesType = 'category';
        var graphType = 'bar';
        var scaleLabel = { labelString : graph.txtUnit, display: true, fontColor: "white" };

        if(graph.block.groupByDevice === 'horizontal'){
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
        obj.backgroundColor = data.SetPoint? datasetColors : graph.block.datasetColors;
        obj.label = data.SetPoint? 'Temperature' : graph.txtUnit;
        graphProperties.data.datasets.push(obj); 

        if(data.SetPoint){
          var obj = {};
          obj.data = arrSetPoint;
          obj.label = 'SetPoint';
          obj.type = 'line';
          obj.borderWidth = 0;
          obj.fill = false;
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
    });
  }
}
//# sourceURL=js/components/graph.js