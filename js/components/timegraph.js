/* global  Domoticz Dashticz  isDefined Chart*/
/* global moment*/
var DT_timegraph = (function () {
  var datasetColors = [
    'red',
    'yellow',
    'blue',
    'orange',
    'green',
    'purple',
    'chartreuse',
    'aqua',
    'teal',
    'pink',
    'gray',
    'fuchsia',
  ];

  return {
    name: 'timegraph',

    /**
     * Checks whether the block can be handled by this component.
     * @param {object} block  User specified block config.
     * @param {string} key    identifier used for block selection.
     */
    canHandle: function (block) {
      return block && block.type === 'timegraph';
    },

    defaultCfg: {
      duration: 5 * 60,
      xTicks: 10,
      xLabels: true,
      yTicks: 5,
      animation: 0,
      lineTension: 0.1,
      pointRadius: 1,
    },

    /**
     * Called once the component has been intialised and mounted in DOM.
     * @param {object} me  Core component object.
     */
    run: function (me) {
      me.idx = isDefined(me.block.idx) ? me.block.idx : me.key;
      me.devices = [];
      me.lastUpdate = 0;
      me.duration = me.block.duration * 1000;
      if (typeof me.idx === 'number' || parseInt(me.idx))
        me.devices.push(me.idx);
      if (typeof me.idx === 'string' && me.idx[0] === 's') {
        var idx = parseInt(me.idx.slice(1));
        if (idx) me.devices.push(me.idx);
      }
      if (!me.block.values) {
        me.datasets = [
          {
            idx: me.idx,
            value: 'Data',
          },
        ];
      } else {
        me.datasets = me.block.values.map(function (value, valueIdx) {
          var newValue = {
            idx: me.idx,
            color: datasetColors[valueIdx],
            value: typeof value === 'string' ? value : 'Data',
            tick: false, //internal administration
          };
          if (typeof value === 'object') {
            $.extend(newValue, value);
          }
          var allDevices = Domoticz.getAllDevices();
          newValue.label =
            newValue.label ||
            allDevices[newValue.idx].Name + '.' + newValue.value;
          return newValue;
        });
      }
      me.block.values.forEach(function (el) {
        if (typeof el === 'object' && el.idx) {
          //              if (!$.inArray(el.idx, me.devices))
          var idx = parseInt(el.idx);
          if (me.devices.indexOf(idx) === -1) me.devices.push(idx);
        }
      });

      DT_timegraph.createGraph(me);

      me.datasets.forEach(function (dataset, idx) {
        Dashticz.subscribeDevice(me, dataset.idx, true, function (device) {
          addData(me, idx, device);
        });
      });
    },

    /**
     * Creates or updates the dial and applies current values.
     * @param {object} me  Core component object.
     */
    defaultContent: function () {
      return '<canvas></canvas>';
    },

    createGraph: function (me) {
      var mountPoint = $(me.mountPoint);
      var chartctx = mountPoint.find('canvas')[0].getContext('2d');
      var m_moment = moment();

      me.graphProperties = {
        type: 'line',
        data: {},
        options: {
          animation: {
            easing: 'linear',
            duration: me.block.animation,
          },
          tooltips: {
            enabled: false,
          },
          hover: {
            animationDuration: 0,
          },
          scales: {
            xAxes: [
              {
                type: 'time',
                gridLines: {
                  display: me.block.xLabels,
                  color: 'rgba(255,255,255,0.2)',
                },
                ticks: {
                  display: me.block.xLabels,
                  autoSkip: true,
                  maxTicksLimit: me.block.xTicks,
                  min: m_moment - me.duration,
                  max: m_moment,
                  fontColor: 'white',
                },
                /*                time: {
                  min: m_moment - 60 * 1000,
                  max: m_moment
                }*/
              },
            ],
            yAxes: [
              {
                ticks: {
                  fontColor: 'white',
                  maxTicksLimit: me.block.yTicks,
                },
                gridLines: {
                  color: 'rgba(255,255,255,0.2)',
                  display: true,
                },
              },
            ],
          },
          legend: {
            labels: {
              fontColor: 'white',
            },
          },
        },
      };
      me.graphProperties.data.datasets = me.datasets.map(function (dataset) {
        return {
          label: dataset.label,
          data: [],
          fill: false,
          lineTension: me.block.lineTension,
          backgroundColor: dataset.color,
          borderColor: dataset.color,
          pointRadius: me.block.pointRadius,
          pointHoverRadius: me.block.pointRadius,
        };
      });

      setInterval(function () {
        addTick(me);
      }, 1000);

      if (me.block.height) {
        me.graphProperties.options.maintainAspectRatio = false;
        $(me.mountPoint + ' .dt_state').css('height', me.block.height);
      }
      me.chart = new Chart(chartctx, me.graphProperties);
    },
  };

  function getValueUnit(data) {
    var dataScale = data.scale || 1;
    if (!data.value) {
      console.log('Invalid data ', data);
      return;
    }
    if (typeof data.value === 'number') {
      return {
        value: data.value * dataScale,
        unit: data.unit,
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

  function getValue(device, id) {
    var value;
    switch (id) {
      case 'NettUsage':
        value =
          '' +
          (parseInt(device['Usage']) - parseInt(device['UsageDeliv'])) +
          ' Watt';
        break;
      default:
        value = device[id];
        break;
    }
    return value;
  }

  function getValueInfo(device, id) {
    var res = {};
    var inputData = {};
    if (typeof id === 'string') {
      inputData = {
        value: getValue(device, id),
      };
    } else {
      inputData.value = getValue(device, id.value);
      inputData.unit = id.unit;
      inputData.decimals = id.decimals;
      inputData.scale = id.scale;
      res.icon = id.icon;
      res.image = id.image;
    }
    if (typeof inputData.value === 'undefined') {
      console.log(
        'Value not found for field ' +
          id.value +
          ' in device ' +
          device.idx +
          ':' +
          device.Name
      );
      return {
        data: 0,
        unit: '',
      };
    }
    var valueunit = getValueUnit(inputData);
    res.data = valueunit.value;
    res.unit = valueunit.unit;
    return res;
  }

  function addData(me, setIdx, device) {
    //    console.log('Adding ', device);
    var dataset = me.datasets[setIdx];
    var timestamp = moment(device.LastUpdate);
    if (timestamp < dataset.lastUpdate) {
      console.log('wrong order. Skippihg');
      return;
    }
    dataset.lastUpdate = timestamp;
    //    me.block.values.forEach(function (value, setIdx) {
    me.lastUpdate = timestamp;
    //      var devIdx = value.idx || me.idx;
    //      if (device.idx != devIdx) return;
    var val = getValueInfo(device, dataset);
    var length = me.chart.data.datasets[setIdx].data.length;
    if (me.datasets[setIdx].tick && length) {
      me.chart.data.datasets[setIdx].data[length - 1].t = timestamp;
      me.chart.data.datasets[setIdx].data[length - 1].y = val.data;
    } else {
      me.chart.data.datasets[setIdx].data.push({
        y: val.data,
        t: timestamp,
      });
    }
    me.datasets[setIdx].tick = false;
    //    });

    /* only refresh every 1 sec
    //Refresh the graph after 100 ms, but only
    var currentTIme = moment();
    if(me.lastUpdate && (currentTime - me.lastUpdate < 1000))
      return;
    me.lastUpdate = currentTime;
    setTimeout(function() {
      me.chart.update();

    }, 100)*/
  }

  function addTick(me) {
    var timestamp = moment();
    var minTime = timestamp - me.duration;
    me.chart.options.scales.xAxes[0].ticks.max = timestamp;
    me.chart.options.scales.xAxes[0].ticks.min = minTime;
    me.chart.data.datasets.forEach(function (dataset, setIdx) {
      var length = dataset.data.length;
      if (!length) return; //During initialization there might be no data yet
      var data = dataset.data[length - 1];
      if (me.datasets[setIdx].tick) {
        data.t = timestamp + 10000;
        //      me.chart.data.labels[me.chart.data.labels.length-1]=timestamp;
      } else {
        var d = { y: data.y, t: timestamp + 10000 };
        dataset.data.push(d);
        //      me.chart.data.labels.push(timestamp);
      }
      me.datasets[setIdx].tick = true;
      while (dataset.data.length > 2 && dataset.data[1].t < minTime) {
        dataset.data.shift();
        //      console.log('shifting');
      }
    });
    //    console.log(length);
    me.chart.update();
  }
})();
Dashticz.register(DT_timegraph);
//# sourceURL=js/components/timegraph.js
