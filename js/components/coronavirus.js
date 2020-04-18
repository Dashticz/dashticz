/* eslint-disable no-prototype-builtins */
/* global Dashticz moment settings _CORS_PATH config language time blocks graph Chart _TEMP_SYMBOL getWeekNumber*/
var api = _CORS_PATH + 'https://cvtapi.nl/v2/';
var flagUrl = _CORS_PATH + 'https://raw.githubusercontent.com/clinkadink/country-flags/master/png100px/';
var nf = Intl.NumberFormat();

var DT_coronavirus = {
  name: "coronavirus",
  canHandle: function(block, key) {
    return (
      block && block.type === 'corona'
    );
  },
  run: function(me) {

    if (isDefined(me.block.graph) && isDefined(me.block.countryCode)) {
      me.primaryIdx = me.mountPoint.slice(1);
      me.graphIdx = me.primaryIdx;
      me.multigraph = false;
      me.colors = isDefined(me.block.datasetColors)? me.block.datasetColors : ['#7fcdbb', '#f03b20', 'yellow', 'red'];
      $.extend(me.block, getBlockDefaults(false, true, me.block));
      createDashGraph(me);
    }

    if (isDefined(me.block.report)) {
      createReportBlock(me, true);
    }
  }
};

Dashticz.register(DT_coronavirus);

function createDashGraph(me) {

  var dataUrl = api + "locations?country_code=" + me.block.countryCode + "&province&timelines=1";
  
  $.getJSON(dataUrl, function(json) {

    var d, t;
    var stats = {};
    stats.latestConfirmed = json.latest.confirmed;
    stats.latestDeaths = json.latest.deaths;
    stats.country = json.locations[0].country;
    stats.population = json.locations[0].country_population;
    stats.lastUpdated = moment(json.locations[0].last_updated).format("HH:mm, DD/MM/YYYY");
    stats.ratio = '1:' + (stats.population/stats.latestConfirmed).toFixed(0);    
    
    var confirmed = json.locations[0].timelines.confirmed.timeline;
    var deaths = json.locations[0].timelines.deaths.timeline;
    var startDate = isDefined(me.block.startDate)? me.block.startDate : '22/01/2020';

    var graphData = {
      labels: [],
      datasets: [
        {
          label: "Confirmed (Total)",
          backgroundColor: isDefined(me.colors[0])? me.colors[0] : '#3c9a84',
          data: [],
          order: 2
        },
        {
          label: "Deaths (Total)",
          backgroundColor: isDefined(me.colors[1])? me.colors[1] : '#f03b20',
          data: [],
          order: 3
        },
        {
          label: "Confirmed (Day)",
          backgroundColor: isDefined(me.colors[2])? me.colors[2] : 'yellow',
          borderColor: isDefined(me.colors[2])? me.colors[2] : 'yellow',
          data: [],
          type: 'line',
          fill: false,
          order: 1
        },
        {
          label: "Deaths (Day)",
          backgroundColor: isDefined(me.colors[3])? me.colors[3] : 'red',
          borderColor: isDefined(me.colors[3])? me.colors[3] : 'red',
          data: [],
          type: 'line',
          fill: false,
          order: 0
        }
      ]
    };

    var confirmedPrevious = 0;
    var confirmedGrowth = 0;

    for (var key in confirmed) {
      if(moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))){
        graphData.labels.push(moment(key).format("YYYY-MM-DD"));
        graphData.datasets[0].data.push(confirmed[key]);
        confirmedGrowth = confirmed[key] - confirmedPrevious;
        confirmedPrevious = confirmed[key];
        graphData.datasets[2].data.push(confirmedGrowth);        
      }
    }
    var deathsPrevious = 0;
    var deathsGrowth = 0;

    for (var key in deaths) {   
      if(moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))){  
        graphData.datasets[1].data.push(deaths[key]);
        deathsGrowth = deaths[key] - deathsPrevious;
        deathsPrevious = deaths[key];
        graphData.datasets[3].data.push(deathsGrowth);       
      }
    }

    var buttons = createButtons(me);
    var html = createHeader(me, true, buttons);    
    var mountPoint = $(me.mountPoint + " > div");
    mountPoint.addClass("block_coronavirus").addClass("block_graph");

    var graphProperties = getDefaultGraphProperties(me);
    graphProperties.data = graphData;
    graphProperties.type = isDefined(me.block.graph) ? me.block.graph : "bar";
    graphProperties.options.scales.xAxes[0].stacked = isDefined(me.block.stacked) ? me.block.stacked : true;
    graphProperties.options.scales.yAxes[0].stacked = isDefined(me.block.stacked) ? me.block.stacked : true;
    graphProperties.options.scales.yAxes[0].ticks = { 
      beginAtZero: true,
      fontColor: "white",
      callback: function(value, index, values) {
        return  nf.format((value/1000)) + 'K';
      }
    }

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
        });

      var chartctx = mountPoint.find("canvas")[0].getContext("2d");
      new Chart(chartctx, graphProperties);
    });    
  });
}

function createReportBlock(me, province){

  var p = province? '&province' : '';
  var dataUrl = isDefined(me.block.countryCode)? api + "locations?country_code=" + me.block.countryCode + p + "&timelines=1" : api + "latest";
  var width = isDefined(me.block.width)? me.block.width : 3;

  $.ajax({
    url: dataUrl,
    dataType: "json",
    success: function(json) {    

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

        var data = {
          width: width,
          icon: icon,
          title: (isDefined(me.block.countryCode) ? me.block.countryCode.toUpperCase() : "Global") + ": " + me.block.report,
          report: data,
          flag: flagUrl + (isDefined(me.block.countryCode)? me.block.countryCode.toLowerCase() : "world")
        };
  
        mountPoint.html(template(data));
      });   
    },
    complete: function(data) {},
    error: function(xhr, ajaxOptions, thrownError) {
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
  for (var i=arr.length-1; i>=0; i--) {
    f.call(obj, arr[i]);
  }
}

function getDoublingHours(json){
  var timeline = json.locations[0].timelines.confirmed.timeline;
  var halfLatestConfirmed = json.latest.confirmed / 2;
  var d = 0;
  var doublingHours = 0;
  reverseForIn(timeline, function(key) {
    if (this[key] <= halfLatestConfirmed && doublingHours === 0) {
      var nextDay = Object.values(timeline)[Object.keys(timeline).length-d];
      var increase = nextDay - this[key];
      var hours = (halfLatestConfirmed - this[key]) / increase * 24;
      doublingHours = (d * 24 - hours).toFixed(0);      
    }
    d++;
  });
  return doublingHours;
}


