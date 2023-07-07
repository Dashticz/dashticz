/* global language, Dashticz, settings*/
//# sourceURL=js/components/map.js


// The Google Maps script needs a callback function after loading the Google maps script
// I don't know a cleaner way ...
window.GoogleMapsCallback = function () {
  console.log('GoogleMapsLoaded');
  Dashticz.googleMapsPromise.resolve();
};

function gm_authFailure() {
  console.log('Google Maps Authentication problem')
  $('.map .dt_state').html('Invalid Google Maps API key.<br>' +
    'See <a href="https://dashticz.readthedocs.io/en/master/blocks/specials/googlemaps.html#getting-a-google-maps-api-key">Dashticz Google Maps documentation</a>')
};

(function (Dashticz) {
  "use strict";
  var DT_googlemaps = {
    name: 'map',
    canHandle: function (block) {
      return block && (block.latitude && block.longitude);
    },
    init: function (block) {
      if (!Dashticz.googleMapsPromise) {
        Dashticz.googleMapsPromise = $.Deferred();
        $.ajax({
          url:
            'https://maps.googleapis.com/maps/api/js?callback=GoogleMapsCallback&key=' + (block.api || settings['gm_api']),
          dataType: 'script',
          cache: true,
        })
      }
      return Dashticz.googleMapsPromise;
    },
    defaultCfg: function (block) {
      var result = {
        refresh: 600,
        clickHandler: false,
        api: settings['gm_api'],
        width: 6,
        //            height: '400px',
        //            aspectratio:0.5,
        containerClass: 'swiper-no-swiping',
        longitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Longitude),
        latitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Latitude),
        zoom: 15,
        markerSize: 15,
        showtraffic: true,
        showUI: false,
        showrefresh: true,
        showrouteinfo: true,
        showmap: true,
        travelmode: 'driving',
        instructions: false

      };
      if(choose(block.showmap, true)) {
        result.width=12;
        if (!block.height) result.aspectratio = 0.6;
      }
      else {
        result.icon='fas fa-solid fa-route'
      }
      if((block.travelmode && block.travelmode.toLowerCase()) ==='transit') {
        result.instructions = true
      }

      return result;
    },
    defaultContent: language.misc.loading,
    run: function (me) {
      if (me.block.refresh < 60) me.block.refresh = 60;
      me.$dt_state = me.$mountPoint.find('.dt_state');
      me.block.travelmode = me.block.travelmode.toLowerCase();
      var travelmodes = ['driving','bicycling','transit','walking'];
      if (!travelmodes.includes(me.block.travelmode)) {
        me.$dt_state.html("Wrong travelmode. Valid options:<br>" + travelmodes.join(', '));
        return
      }
      me.pointA = new google.maps.LatLng(me.block.latitude, me.block.longitude);
      if (me.block.destlongitude && me.block.destlatitude) {
        me.showRoute=true;
        me.pointB = new google.maps.LatLng(me.block.destlatitude || 50.8429, me.block.destlongitude || -0.1313);
        me.directionsService = new google.maps.DirectionsService;
      }

      if(me.block.refreshwindow) {
        var refreshwindows = me.block.refreshwindow.split(';');
        me.refreshWindows = refreshwindows.map( function(el) {
          var startStopMoment = el.split('-');
          var startHourMinute = startStopMoment[0].split(':');
          var stopHourMinute = startStopMoment[1].split(':');
          return {
            startHour: parseInt(startHourMinute[0]),
            startMinute: parseInt(startHourMinute[1]),
            stopHour:  parseInt(stopHourMinute[0]),
            stopMinute:  parseInt(stopHourMinute[1]),
          }
        })
      }
    
      if (me.block.showmap)
        runMap(me)
      else
        runNoMap(me)

      me.initialRefresh = true;
    },
    refresh: refresh,
  };

  function runMap(me) {
    var html = '<div class="state_map"></div>' +
      '<div class="state_info">' +
      '<div class="state_route"></div>'
    if (me.block.showrefresh) (
      html +=
      '<div class="state_refresh">' +
      '<i class="state_refresh_icon fa-solid fa-arrows-rotate"></i>' +
      '<span class="state_refresh_time"></span>' +
      '</div>'
    )
    html += '</div>';

    me.$dt_state.html(html);

    me.$dt_state.find('.state_info').on('click', function () {
      me.initialRefresh=true;
      refresh(me);
    })
    var mapdiv = me.$dt_state.find('.state_map')[0];
    me.map = new google.maps.Map(mapdiv, {
      zoom: me.block.zoom,
      center: me.pointA,
      disableDefaultUI: !me.block.showUI
    })
    var markerOptions = {
      position: me.pointA,
      map: me.map,
      //            title: 'My Location',
    }
    if (me.block.markerIconUrl)
      markerOptions.icon = {
        url: me.block.markerIconUrl,
        scaledSize: new google.maps.Size(me.block.markerSize, me.block.markerSize)
      };
    me.marker = new google.maps.Marker(markerOptions);
    if (me.showRoute) me.directionsDisplay = new google.maps.DirectionsRenderer({
      map: me.map
    });
  }


  function runNoMap(me) {
  var html = '<div class="state_route"></div>'
  if (me.block.showrefresh) (
    html +=
    '<div class="state_refresh lastupdate">' +
    'Last update:' +
    '<span class="state_refresh_time"></span>' +
    '</div>'
  )
  html += '</div>';

  me.$dt_state.html(html);

  me.$dt_state.on('click', function () {
    me.initialRefresh=true;
    refresh(me);
  })
}

function refresh(me) {  
  if (!me.initialRefresh && !nowInWindow(me)) return;
  me.initialRefresh=false;

  if (me.block.showmap && me.block.showtraffic) {
    me.trafficLayer = new google.maps.TrafficLayer();
    me.trafficLayer.setMap(me.map);
    me.$mountPoint.find('.state_refresh_time').html(moment().format('LT'));
  }
  if (me.showRoute) {
    // get route from A to B
    var travelMode = me.block.travelmode.toUpperCase();
    var asTransit = travelMode==='TRANSIT';
    me.directionsService.route({
      origin: me.pointA,
      destination: me.pointB,
      travelMode: travelMode,
      drivingOptions: {
        departureTime: new Date(),
        //          trafficModel: 'pessimistic'
      },
      avoidTolls: false,
      avoidHighways: false,
      provideRouteAlternatives: true
    }, function (response, status) {
      if (status == google.maps.DirectionsStatus.OK) {
        if (me.block.showmap) me.directionsDisplay.setDirections(response);
        //Additional info:
        //response.routes[0].legs[0]
        /*
        distance : {text: '132 km', value: 131533}
        duration: {text: '1 uur 33 min.', value: 5576}
        */
        var routeInfo = response.routes[0].legs[0];
        if (me.block.showrouteinfo) {
          me.$mountPoint.find('.state_route').html(routeInfo.distance.text + ', ' +
            ((routeInfo.duration_in_traffic && routeInfo.duration_in_traffic.text) || routeInfo.duration.text)
          );
          if(me.block.instructions) {
            var items = $('<table class="items"></div>');
            var startText = routeInfo.departure_time.text;
            var currentDate = routeInfo.departure_time.value;
            var endDate = currentDate;

            routeInfo.steps.forEach(function(step) {
              try {
                var instruction = step.instructions;
                if(step.travel_mode === 'TRANSIT') {
                  currentDate = step.transit.departure_time.value;
                  endDate = step.transit.arrival_time.value;
                  instruction += '<br>Exit: ' + step.transit.arrival_stop.name
                }
                else {
                  endDate = new Date(currentDate.getTime() + step.duration.value*1000);
                }
                items.append('<tr class="item"><td class="time">'+ dateToTimeStr(currentDate)+'-'+dateToTimeStr(endDate)+'</td><td>'+instruction+ '</td></tr>');
                currentDate = endDate;
              }
              catch (ev) {
                console.log('Error while generating instruction', step );
              }
            })
            me.$mountPoint.find('.state_route').append(items);
          }

          me.$mountPoint.find('.state_refresh_time').html(moment().format('LT'));
        }
      } else {
        var msg = 'Directions request failed due to ' + status;
        me.$mountPoint.find('.state_route').html(msg);
        console.log(msg);
      }
    });
  }
}

function dateToTimeStr(val) {
  return moment(val).format('HH:mm');
}
function nowInWindow(me) {
  if (!me.refreshWindows) return true;
  var now=moment();
  var year=now.year();
  var month=now.month();
  var day=now.date();
  var hours = now.hours();
  var minutes = now.minutes();
  var found = me.refreshWindows.find(function(refreshWindow) {
    var startMoment=moment([year, month, day, refreshWindow.startHour, refreshWindow.startMinute]);
    var stopMoment=moment([year, month, day, refreshWindow.stopHour, refreshWindow.stopMinute]);
    return now.isBetween(startMoment, stopMoment,'minute','[]')
  })
  console.log('in window: ', found);
  return found

}
Dashticz.register(DT_googlemaps);
}(Dashticz));
