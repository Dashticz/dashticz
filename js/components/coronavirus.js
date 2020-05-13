/* eslint-disable no-prototype-builtins */
/* global Dashticz moment _CORS_PATH  Chart isDefined*/
/* from graph.js : */
/* global getBlockDefaults createHeader getDefaultGraphProperties createButtons*/
/* from bundle.js */
/* global templateEngine */
var api = _CORS_PATH + 'https://cvtapi.nl/v2/';
var flagUrl = _CORS_PATH + 'https://raw.githubusercontent.com/clinkadink/country-flags/master/png100px/';
var nf = Intl.NumberFormat();

var DT_coronavirus = {
  name: "coronavirus",
  defaultCfg: function () {
    var cfg = getBlockDefaults(); //Defaults from DT_graph
    var addCfg = {
      datasetColors: ['#7fcdbb', '#f03b20', '#2b7865', '#782b2b'],
      title: 'Coronavirus',
      mode: 0,
      startDate: '22/01/2020',
    }
    $.extend(cfg, addCfg);
    return cfg
  },
  canHandle: function (block) {
    return (
      block && block.type === 'corona'
    );
  },
  run: function (me) {
    if (isDefined(me.block.report)) { //countryCode: ''
      createReportBlock(me, true);
    } else {
      if (typeof me.block.graph === 'boolean') {
        me.block.graph = 'bar'; //default graph type
      }
      if (typeof me.block.countryCode === 'undefined') {
        me.block.countryCode = 'NL'; //default graph type
      }
      me.graphIdx = me.mountPoint.slice(1);
      me.colors = me.block.datasetColors;
      me.title = me.block.title;
      me.mode = me.block.mode;
      createDashGraph(me);
    }
  }
};

Dashticz.register(DT_coronavirus);

function createDashGraph(me) {

  var dataUrl = api + "locations?country_code=" + me.block.countryCode + "&province&timelines=1";

  $.getJSON(dataUrl, function (json) {

    var stats = {};
    stats.latestConfirmed = json.latest.confirmed;
    stats.latestDeaths = json.latest.deaths;
    stats.country = json.locations[0].country;
    stats.population = json.locations[0].country_population;
    stats.lastUpdated = moment(json.locations[0].last_updated).format("HH:mm, DD/MM/YYYY");
    stats.ratio = '1:' + (stats.population / stats.latestConfirmed).toFixed(0);

    var confirmed = json.locations[0].timelines.confirmed.timeline;
    var deaths = json.locations[0].timelines.deaths.timeline;
    var startDate = me.block.startDate;
    var scaleLabel = 'Total';

    var CT = {
      label: "Confirmed (Total)",
      backgroundColor: isDefined(me.colors[0]) ? me.colors[0] : '#3c9a84',
      data: [],
      yAxisID: 'A',
      order: 2
    }

    var DT = {
      label: "Deaths (Total)",
      backgroundColor: isDefined(me.colors[1]) ? me.colors[1] : '#f03b20',
      data: [],
      yAxisID: 'A',
      order: 3
    }

    var CD = {
      label: "Confirmed (Day)",
      backgroundColor: isDefined(me.colors[2]) ? me.colors[2] : '#2b7865',
      borderColor: isDefined(me.colors[2]) ? me.colors[2] : '#2b7865',
      data: [],
      type: 'line',
      pointRadius: 0,
      fill: false,
      yAxisID: 'B',
      order: 1
    }

    var DD = {
      label: "Deaths (Day)",
      backgroundColor: isDefined(me.colors[3]) ? me.colors[3] : '#782b2b',
      borderColor: isDefined(me.colors[3]) ? me.colors[3] : '#782b2b',
      data: [],
      type: 'line',
      pointRadius: 0,
      fill: false,
      yAxisID: 'B',
      order: 0
    }

    var graphData = {
      labels: [],
      datasets: []
    };

    var cg = 0;
    var dg = 0;

    switch (me.mode) {
      case 0:
        graphData.datasets.push(CT, DT, CD, DD);
        cg = 2;
        dg = 3;
        break;
      case 1:
        graphData.datasets.push(CT, DT);
        break;
      case 2:
        CD.yAxisID = 'A';
        DD.yAxisID = 'A';
        graphData.datasets.push(CD, DD);
        scaleLabel = 'Day';
        cg = 0;
        dg = 1;
        break;
    }

    var confirmedPrevious = 0;
    var confirmedGrowth = 0;

    for (var key in confirmed) {
      if (moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))) {
        graphData.labels.push(moment(key).format("YYYY-MM-DD"));
        if (me.mode < 2) graphData.datasets[0].data.push(confirmed[key]);
        if (me.mode !== 1) {
          confirmedGrowth = confirmed[key] - confirmedPrevious;
          confirmedPrevious = confirmed[key];
          graphData.datasets[cg].data.push(confirmedGrowth);
        }
      }
    }
    var deathsPrevious = 0;
    var deathsGrowth = 0;

    for (key in deaths) {
      if (moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))) {
        if (me.mode < 2) graphData.datasets[1].data.push(deaths[key]);
        if (me.mode !== 1) {
          deathsGrowth = deaths[key] - deathsPrevious;
          deathsPrevious = deaths[key];
          graphData.datasets[dg].data.push(deathsGrowth);
        }
      }
    }

    var html = createHeader(me, true);
    var mountPoint = $(me.mountPoint + " > div");
    mountPoint.addClass("block_coronavirus").addClass("block_graph");

    var graphProperties = getDefaultGraphProperties(me, me.block);
    graphProperties.data = graphData;
    graphProperties.type = me.block.graph
    var scales = graphProperties.options.scales;

    scales.yAxes[0].id = 'A';
    if (me.mode === 0) scales.yAxes.push({
      id: 'B',
      position: 'right'
    });
    scales.xAxes[0].stacked = isDefined(me.block.stacked) ? me.block.stacked : true;
    scales.yAxes[0].stacked = isDefined(me.block.stacked) ? me.block.stacked : true;

    $.each(scales.yAxes, function (i) {
      scales.yAxes[i].scaleLabel = {
        labelString: i === 1 ? 'Day' : scaleLabel,
        display: true,
        fontColor: "white",
      };
      scales.yAxes[i].ticks = {
        beginAtZero: true,
        fontColor: "white",
        callback: function (value) {
          return nf.format(value / 1000) + "K";
        },
      };
    });

    var graphwidth = $(me.mountPoint + " .block_coronavirus").width();
    var setHeight = Math.min(
      Math.round((graphwidth / window.innerWidth) * window.innerHeight - 25),
      window.innerHeight - 50
    );
    setHeight = me.block.height ? me.block.height : setHeight;
    $(me.mountPoint + " .block_coronavirus").css("height", setHeight);

    templateEngine.load("corona_graph_header").then(function (template) {

      var data = {
        flag: flagUrl + me.block.countryCode.toLowerCase(),
        country: stats.country,
        confirmed: nf.format(stats.latestConfirmed),
        deaths: nf.format(stats.latestDeaths),
        ratio: stats.ratio,
        color: me.block.iconColour,
        doubling: getDoublingHours(json),
      };

      mountPoint
        .html(html)
        .promise()
        .done(function () {
          $(".graphValues" + me.graphIdx).html(template(data));
          createButtons(me); //We can only add the buttons after the header is mounted in the DOM
        });

      var chartctx = mountPoint.find("canvas")[0].getContext("2d");
      new Chart(chartctx, graphProperties);
    });
  });
}

function createReportBlock(me, province) {

  var p = province ? '&province' : '';
  var dataUrl = isDefined(me.block.countryCode) ? api + "locations?country_code=" + me.block.countryCode + p + "&timelines=1" : api + "latest";
  var width = isDefined(me.block.width) ? me.block.width : 3;

  $.ajax({
    url: dataUrl,
    dataType: "json",
    success: function (json) {

      templateEngine.load("corona_report").then(function (template) {

        var report = me.block.report.toLowerCase();
        var data = nf.format(json.latest[report]);
        var icon = report === "confirmed" ? "hospital" : "skull-crossbones";

        if (report === "ratio") {
          var population = 7775000000;
          if (isDefined(me.block.countryCode)) {
            population = json.locations[0].country_population;
          }
          data = "1 : " + nf.format((population / json.latest.confirmed).toFixed(0));
          icon = "users";
        }

        if (report === "doubling" && isDefined(me.block.countryCode)) {
          data = getDoublingHours(json) + " hours";
          icon = "angle-double-up";
        }

        var mountPoint = $(me.mountPoint + " > div");
        mountPoint.addClass("block_report");

        /*Todo: data is redefined below, while assigned a value already above*/
        var dataObject = {
          width: width,
          icon: icon,
          title: (isDefined(me.block.countryCode) ? me.block.countryCode.toUpperCase() : "Global") + ": " + me.block.report,
          report: data,
          flag: flagUrl + (isDefined(me.block.countryCode) ? me.block.countryCode.toLowerCase() : "world")
        };
        mountPoint.html(template(dataObject));
      });
    },
    complete: function () {},
    error: function (xhr) {
      if (xhr.status == 404) {
        createReportBlock(me, false);
      }
    }
  });
}

function reverseForIn(obj, f) {
  var arr = [];
  for (var key in obj) {
    arr.push(key);
  }
  for (var i = arr.length - 1; i >= 0; i--) {
    f.call(obj, arr[i]);
  }
}

function getDoublingHours(json) {
  var timeline = json.locations[0].timelines.confirmed.timeline;
  var halfLatestConfirmed = json.latest.confirmed / 2;
  var d = 0;
  var doublingHours = 0;
  reverseForIn(timeline, function (key) {
    if (this[key] <= halfLatestConfirmed && doublingHours === 0) {
      var nextDay = Object.values(timeline)[Object.keys(timeline).length - d];
      var increase = nextDay - this[key];
      var hours = (halfLatestConfirmed - this[key]) / increase * 24;
      doublingHours = (d * 24 - hours).toFixed(0);
    }
    d++;
  });
  return doublingHours;
}

//# sourceURL=js/components/coronavirus.js