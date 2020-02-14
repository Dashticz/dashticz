/* eslint-disable no-prototype-builtins */
/* global Dashticz moment settings config Beaufort number_format alldevices language time blocks usrEnc pwdEnc Chart _TEMP_SYMBOL*/
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
  var hasBlock =
    isDefined(me.block) && isDefined(me.block.devices) ? true : false;
  var graphIdx = hasBlock ? me.block.devices[0] : me.key.split("_")[1];
  var devices = hasBlock ? me.block.devices : [parseInt(graphIdx)];
  var datasetColors = ["red", "yellow", "blue", "orange", "green", "purple"];

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
    device.Name = obj.multigraph ? (device.block.title? device.block.title:me.key) : device.Name;  //block.title may be undefined
    device.idx = parseInt(device.idx);
    graphDevices.push(device);
  });
  return graphDevices;
}

function getBlockDefaults(devices, hasBlock, b) {
  var datasetColors = ["red", "yellow", "blue", "orange", "green", "purple"];

  var block = {};
  block.devices = devices;
  block.datasetColors =
    hasBlock && isDefined(b.datasetColors) ? b.datasetColors : datasetColors;
  block.barWidth = hasBlock && isDefined(b.barWidth) ? b.barWidth : 0.9;
  block.borderColors =
    hasBlock && isDefined(b.borderColors)
      ? b.borderColors
      : block.datasetColors;
  block.borderDash = hasBlock && isDefined(b.borderDash) ? b.borderDash : [];
  block.borderWidth = hasBlock && isDefined(b.borderWidth) ? b.borderWidth : 2;
  block.buttonsBorder =
    hasBlock && isDefined(b.buttonsBorder) ? b.buttonsBorder : "white";
  block.buttonsColor =
    hasBlock && isDefined(b.buttonsColor) ? b.buttonsColor : "black";
  block.buttonsFill =
    hasBlock && isDefined(b.buttonsFill) ? b.buttonsFill : "white";
  block.buttonsIcon =
    hasBlock && isDefined(b.buttonsIcon) ? b.buttonsIcon : "#686868";
  block.buttonsMarginX =
    hasBlock && isDefined(b.buttonsMarginX) ? b.buttonsMarginX : 2;
  block.buttonsMarginY =
    hasBlock && isDefined(b.buttonsMarginY) ? b.buttonsMarginY : 0;
  block.buttonsPadX = hasBlock && isDefined(b.buttonsPadX) ? b.buttonsPadX : 6;
  block.buttonsPadY = hasBlock && isDefined(b.buttonsPadY) ? b.buttonsPadY : 2;
  block.buttonsRadius =
    hasBlock && isDefined(b.buttonsRadius) ? b.buttonsRadius : 4;
  block.buttonsShadow =
    hasBlock && isDefined(b.buttonsShadow) ? b.buttonsShadow : false;
  block.buttonsSize = hasBlock && isDefined(b.buttonsSize) ? b.buttonsSize : 14;
  block.buttonsText =
    hasBlock && isDefined(b.buttonsText) ? b.buttonsText : false;
  block.cartesian = hasBlock && isDefined(b.cartesian) ? b.cartesian : "linear";
  block.custom = hasBlock && isDefined(b.custom) ? b.custom : false;
  block.displayFormats =
    hasBlock && isDefined(b.displayFormats) ? b.displayFormats : false;
  block.drawOrderDay =
    hasBlock && isDefined(b.drawOrderDay) ? b.drawOrderDay : false;
  block.drawOrderLast =
    hasBlock && isDefined(b.drawOrderLast) ? b.drawOrderLast : false;
  block.drawOrderMonth =
    hasBlock && isDefined(b.drawOrderMonth) ? b.drawOrderMonth : false;
  block.gradients = hasBlock && isDefined(b.gradients) ? b.gradients : false;
  block.graph = hasBlock && isDefined(b.graph) ? b.graph : "line";
  block.graphTypes = hasBlock && isDefined(b.graphTypes) ? b.graphTypes : false;
  block.height = hasBlock && isDefined(b.height) ? b.height : false;
  block.iconColour =
    hasBlock && isDefined(b.iconColour) ? b.iconColour : "grey";
  block.interval = hasBlock && isDefined(b.interval) ? b.interval : 1;
  block.legend = hasBlock && isDefined(b.legend) ? b.legend : false;
  block.lineFill = hasBlock && isDefined(b.lineFill) ? b.lineFill : false;
  block.lineTension =
    hasBlock && isDefined(b.lineTension) ? b.lineTension : 0.1;
  block.maxTicksLimit =
    hasBlock && isDefined(b.maxTicksLimit) ? b.maxTicksLimit : null;
  block.method = hasBlock && isDefined(b.method) ? b.method : 1;
  block.pointBorderColor =
    hasBlock && isDefined(b.pointBorderColor) ? b.pointBorderColor : ["grey"];
  block.pointBorderWidth =
    hasBlock && isDefined(b.pointBorderWidth) ? b.pointBorderWidth : 0;
  block.pointFillColor =
    hasBlock && isDefined(b.pointFillColor)
      ? b.pointFillColor
      : block.datasetColors;
  block.pointRadius = hasBlock && isDefined(b.pointRadius) ? b.pointRadius : 0;
  block.pointStyle = hasBlock && isDefined(b.pointStyle) ? b.pointStyle : false;
  block.reverseTime =
    hasBlock && isDefined(b.reverseTime) ? b.reverseTime : false;
  block.sortDevices =
    hasBlock && isDefined(b.sortDevices) ? b.sortDevices : false;
  block.spanGaps = hasBlock && isDefined(b.spanGaps) ? b.spanGaps : false;
  block.title = hasBlock && isDefined(b.title) ? b.title : false;
  block.width = hasBlock && isDefined(b.width) ? b.width : 12;
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
      txtUnit = "°C";
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
      txtUnit = "°C";
      currentValue = device["SetPoint"];
      decimals = 1;
      break;
  }

  var graphIdx = device.graphIdx;
  var multidata = device.Data.split(",").length - 1 > 0;
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
      popup: popup,
      primary: device.primary,
      primaryIdx: device.primaryIdx,
      range: "initial",
      realrange: "",
      sensor: sensor,
      subtype: device.SubType,
      title: device.Name,
      txtUnit: txtUnit,
      type: device.Type
    };
  }
  dtGraphs[graphIdx].currentValue = currentValue;
  if (popup) getGraphData([dtGraphs[graphIdx]]);
}

function showPopupGraph(idx, subidx) {
  var device = alldevices[idx];
  if ($("#opengraph" + device["idx"]).length === 0) {
    var html =
      '<div class="modal fade opengraph opengraph' +
      device.idx +
      p +
      '" data-idx="' +
      device.idx +
      '" id="opengraph' +
      device.idx +
      p +
      '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';
    html += '<div class="modal-dialog graphwidth">';
    html += '<div class="modal-content">';
    html += '<div class="modal-header graphclose">';
    html +=
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += "</div>";
    html +=
      '<div class="modal-body block_graph_' +
      device.idx +
      p +
      '">' +
      language.misc.loading;
    html += "</div>";
    html += "</div>";
    html += "</div>";
    html += "</div>";
    $("body").append(html);
  }

  var obj = {};
  obj.blockId = device.idx + p;
  obj.graphIdx = obj.blockId + device.idx;
  obj.block = getBlockDefaults([device.idx], false);
  obj.hasBlock = false;
  obj.mountPoint = ".block_graph_" + obj.blockId;
  obj.multigraph = false;
  obj.primary = true;
  obj.primaryIdx = obj.graphIdx;

  var popDevice = $.extend(obj, alldevices[idx]);
  $("#opengraph" + device.idx + p).modal();
  getDeviceDefaults(popDevice, true);
}

function getGraphData(devices, selGraph) {
  var multidata = { result: [], status: "OK", title: "Graph day" };
  var arrResults = [];
  var currentValues = [];

  $.each(devices, function(i, device) {
    var graphIdx = device.blockId + device.idx;
    var graph = dtGraphs[graphIdx];
    var range = isDefined(selGraph) ? selGraph : "day";

    if (!graph.popup) {
      if (graph.block.custom)
        range = graph.block.custom[Object.keys(graph.block.custom)[0]].range;
      if (graph.block.custom && selGraph)
        range = graph.block.custom[selGraph].range;
    }
    range = range.replace("last", "day");

    currentValues.push(
      parseFloat(graph.currentValue.replace(",", ".")).toFixed(graph.decimals) +
        " " +
        graph.txtUnit
    );

    if (isDefined(selGraph)) {
      graph.range = selGraph;
      graph.forced = true;
    }

    if (graph.lastRefreshTime < time() - parseFloat(_GRAPHREFRESH) * 60) {
      graph.forced = true;
    }

    if (dtGraphs[graph.primaryIdx].forced) {
      $.ajax({
        url:
          settings["domoticz_ip"] +
          "/json.htm?username=" +
          usrEnc +
          "&password=" +
          pwdEnc +
          "&type=graph&sensor=" +
          dtGraphs[graphIdx].sensor +
          "&idx=" +
          dtGraphs[graphIdx].idx +
          "&range=" +
          range +
          "&method=1&time=" +
          new Date().getTime() +
          "&jsoncallback=?",
        type: "GET",
        async: true,
        contentType: "application/json",
        dataType: "jsonp",
        success: function(data) {
          data.idx = device.idx;
          arrResults.push(data);

          if (devices.length === arrResults.length) {
            if (graph.sortDevices) {
              arrResults.sort(function(a, b) {
                return b.result.length - a.result.length;
              });
            }

            var newKeys = [];
            var arrYkeys = [];

            $.each(arrResults, function(z, d) {
              var currentKey = "";
              var counter = z + 1;

              if(d.result && d.result.length > 0) {
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

                $.each(d.result, function(x, res) {
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
                          $.each(multidata.result, function(index, obj) {
                            $.each(obj, function(k, v) {
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
              if (arrResults.length === counter) {
                $.each(multidata.result, function(index, obj) {
                  $.each(obj, function(k, v) {
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
                graph.ylabels = getYlabels(graph);
                graph.currentValues = currentValues;
                graph.data = multidata;
                showGraph(graph, selGraph);
              }
            });
          }
        }
      });
    }
  });
}

function showGraph(graph, selGraph) {
  var isInitial = graph.range === "initial";

  if (graph.forced || graph.popup) {
    graph.forced = false;
    graph.lastRefreshTime = time();

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

    if (graph.range === "last") {
      graph.realrange = "day";
      graph.dataFilterCount = 4;
      graph.dataFilterUnit = "hours";
    }

    if (graph.block.custom) {
      if (isInitial) {
        graph.range = Object.keys(graph.block.custom)[0];
        graph.customRange = true;
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
    createGraph(graph);
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
  var buttonIcon = graph.block.buttonsIcon;
  var buttons = createButtons(graph, ranges, graph.customRange);

  var title =
    '<div class="graphheader"><div class="graphtitle"><i class="fas fa-chart-bar" style="font-size:20px;margin-left:5px;color:' +
    buttonIcon +
    '">&nbsp;</i>' +
    graph.name +
    "";
  var span =
    '&nbsp;<span class="graphcurrent' +
    graphIdx +
    '">&nbsp;<i class="fas fa-equals" style="font-size:14px;color:' +
    buttonIcon +
    '">&nbsp;</i>&nbsp;';

  if (!graph.multigraph) {
    if (isDefined(graph.currentValue)) {
      title +=
        span +
        graph.currentValue.replace(
          /, /g,
          '<span style="color:' +
            graph.block.buttonsIcon +
            ';font-weight:900;font-size:16px;"> | </span>'
        ) +
        "</span>";
    }
  } else {
    if (isDefined(graph.currentValues)) {
      title += span;
      $.each(graph.currentValues, function(i, val) {
        if (i < graph.currentValues.length - 1) {
          title +=
            graph.currentValues[i] +
            '<span style="color:' +
            graph.block.buttonsIcon +
            ';font-weight:900;font-size:16px;"> | </span>' +
            "</span>";
        } else {
          title += graph.currentValues[i];
        }
      });
    }
  }
  title += "</div>";

  var html = "";
  html += title + '<div class="graphbuttons" >' + buttons + "</div>";
  html += "</div>";

  html +=
    '<div class="graph swiper-no-swiping' +
    (graph.popup ? " popup graphheight" : "") +
    '" id="' +
    graphIdx +
    '">';
  html += "<canvas " + 'id="graphoutput_' + graphIdx + '"></canvas>';
  html += "</div>";

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
    
    if (graph.graphConfig.ylabels) graph.ylabels = graph.graphConfig.ylabels;
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
  //console.log(graphProperties)
  new Chart(chartctx, graphProperties);
}

function createButtons(graph, ranges, customRange) {
  var btn = {};
  var buttons =
    '<div class="btn-group" role="group" aria-label="Graph Buttons">';
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
  btn.padX =
    "padding-left:" +
    graph.block.buttonsPadX +
    "px;padding-right:" +
    graph.block.buttonsPadX +
    "px;";
  btn.padY =
    "padding-top:" +
    graph.block.buttonsPadY +
    "px;padding-bottom:" +
    graph.block.buttonsPadY +
    "px;";
  btn.marginX =
    "margin-left:" +
    graph.block.buttonsMarginX +
    "px;margin-right:" +
    graph.block.buttonsMarginX +
    "px;";
  btn.marginY =
    "margin-top:" +
    graph.block.buttonsMarginY +
    "px;margin-bottom:" +
    graph.block.buttonsMarginY +
    "px;";
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

  var btnTextList = {
    last: btn.text !== false ? btn.text[0] : language.graph.last_hours,
    day: btn.text !== false ? btn.text[1] : language.graph.today,
    month: btn.text !== false ? btn.text[2] : language.graph.last_month
  };

  if (isDefined(settings["graph_zoom"]) && settings["graph_zoom"] === 1) {
    buttons +=
      '<button type="button" data-canvas="graphoutput_' +
      graph.graphIdx +
      '" id="resetZoom' +
      graph.graphIdx +
      '" ' +
      style +
      '" class="btn btn-default">';
    buttons +=
      '	<i class="fas fa-search-minus" style="font-size:14px;color:' +
      btn.icon +
      '"></i>';
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
  ranges.forEach(function(item, i) {
    var btnText = customRange ? item : btnTextList[item];
    buttons += '<button type="button" ' + style + '" class="btn btn-default';
    if (graph.range === item) buttons += " active";
    buttons +=
      '" onclick="updateGraphs(\'' +
      graph.blockId +
      "', [" +
      graph.block.devices +
      "],'" +
      item +
      "','" +
      graph.popup +
      '\');"><i class="' +
      btnIcons[i] +
      '" style="font-size:14px;color:' +
      btn.icon +
      '">&nbsp;</i>&nbsp;' +
      btnText +
      "</button> ";
  });
  buttons += "</div>";
  return buttons;
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
        intersect: false
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
        yAxes: [],
        xAxes: [
          {
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
            enabled:
              isDefined(settings["graph_zoom"]) && settings["graph_zoom"] === 1,
            drag: {
              animationDuration: 1000
            },
            mode: "xy",
            speed: 0.05
          }
        }
      }
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
  var label = g.txtUnit;
  var l = [];

  $.each(g.keys, function (i, key) {
    switch (key) {
      case "v":
        label === "kWh" && g.realrange === "day" ? l.push("W") : l.push(label);
        break;
      case "uvi":
      case "v_min":
      case "v_max":
      case "v_avg":
      case "r1":
      case "r2":
      case "eu":
      case "u":
        l.push(label);
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
      case "v2":
        l.push("kWh");
        break;
      case "c1":
      case "c2":
      case "c3":
      case "c4":
        if(g.subtype === 'Energy') l.push("kWh");
        if(g.subtype === 'Gas') l.push("m3");
        break;
      case "co2":
        l.push("ppm");
        break;
      default:
        l.push(key);
    }
  });
  return l;
}

//# sourceURL=js/components/graph.js