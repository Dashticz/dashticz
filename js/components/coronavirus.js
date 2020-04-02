/* eslint-disable no-prototype-builtins */
/* global Dashticz moment settings _CORS_PATH config language time blocks graph Chart _TEMP_SYMBOL getWeekNumber*/
var api = _CORS_PATH + 'https://coronavirus-tracker-api.herokuapp.com/v2/';
var flagUrl = 'https://raw.githubusercontent.com/clinkadink/country-flags/master/png100px/';
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
      me.name = isDefined(me.block.title) ? me.block.title : me.name.toUpperCase();
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

    t = '<span>';
    t += '  <img src="{{flag}}.png" class="flag">{{country}}: <i class="fas fa-hospital fx" style="color:{{color}};">&nbsp;</i>{{confirmed}}&nbsp;'
    t += '  <i class="fas fa-skull-crossbones fx" style="color:{{color}};">&nbsp;</i>{{deaths}}&nbsp;'
    t += '  <i class="fas fa-users fx" style="color:{{color}};">&nbsp;</i>{{ratio}}';
    t += '  <i class="fas fa-angle-double-up fx" style="color:{{color}};">&nbsp;</i>{{doubling}}';
    t += '</span>';

    d = { 
        flag: flagUrl + me.block.countryCode.toLowerCase(),
        country: stats.country,
        confirmed: nf.format(stats.latestConfirmed),
        deaths: nf.format(stats.latestDeaths),
        ratio: stats.ratio,
        color: me.block.iconColour,
        doubling: getDoublingHours(json)
    };
    
    var confirmed = json.locations[0].timelines.confirmed.timeline;
    var deaths = json.locations[0].timelines.deaths.timeline;
    var startDate = isDefined(me.block.startDate)? me.block.startDate : '22/01/2020';

    var graphData = {
      labels: [],
      datasets: [
        {
          label: "Confirmed",
          backgroundColor: me.block.datasetColors[0],
          data: []
        },
        {
          label: "Deaths",
          backgroundColor: me.block.datasetColors[1],
          data: []
        }
      ]
    };

    for (var key in confirmed) {
      if(moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))){
        graphData.labels.push(moment(key).format("YYYY-MM-DD"));
        graphData.datasets[0].data.push(confirmed[key]);
      }
    }

    for (var key in deaths) {   
      if(moment(key).isSameOrAfter(moment(startDate, 'DD/MM/YYYY'))){  
        graphData.datasets[1].data.push(deaths[key]);
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

    mountPoint
      .html(html)
      .promise()
      .done(function() {
        $(".graphValues" + me.graphIdx).html(
          Handlebars.compile(t)(d)
        );
      });   
    
    var chartctx = mountPoint.find("canvas")[0].getContext("2d");
    new Chart(chartctx, graphProperties);
  });
}

function createReportBlock(me, province){

  var p = province? '&province' : '';
  var dataUrl = isDefined(me.block.countryCode)? api + "locations?country_code=" + me.block.countryCode + p + "&timelines=1" : api + "latest";
  var width = isDefined(me.block.width)? me.block.width : 3;

  $.ajax({
    url: dataUrl,
    success: function(json) {

      var template = "";
      template = '<div class="col-lg-2 col-sm-3 vertical-center">';
      template += ' <i class="fas fa-{{icon}} fx"></i>';
      template += "</div>";
      template += '<div class="col-lg-6 col-sm-5 col-data">';
      template += ' <strong class="title">{{title}}</strong><br>';
      template += ' <span class="report">{{report}}</span><br>';
      template += "</div>";
      template += '<div class="col-lg-4 col-sm-4 vertical-center">';
      template += ' <img src="{{flag}}.png" class="flag">';
      template += "</div>";

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

      var data = {
        width: width,
        icon: icon,
        title: (isDefined(me.block.countryCode) ? me.block.countryCode.toUpperCase() : "Global") + ": " + me.block.report,
        report: data,
        flag: flagUrl + (isDefined(me.block.countryCode)? me.block.countryCode.toLowerCase() : "world")
      };

      var mountPoint = $(me.mountPoint + " > div");
      mountPoint.addClass("block_report");
      mountPoint.html(Handlebars.compile(template)(data));
      
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


