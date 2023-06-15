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
        refresh: 60,
        clickHandler: false,
        api: settings['gm_api'],
        width: 12,
        //            height: '400px',
        //            aspectratio:0.5,
        containerClass: 'swiper-no-swiping',
        longitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Longitude),
        latitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Latitude),
        zoom: 15,
        markerSize: 15,
        showtraffic: true,
        disableDefaultUI: true

      };
      if (!block.height) result.aspectratio = 0.6;
      return result;
    },
    defaultContent: language.misc.loading,
    run: function (me) {
      var dt_state = me.$mountPoint.find('.dt_state');
      dt_state.html('<div class="state_map"></div><div class="state_route"></div>');
      //          dt_content.css({height: me.block.height});
      var mapdiv = dt_state.find('.state_map')[0];
      me.pointA = new google.maps.LatLng(me.block.latitude, me.block.longitude);
      me.map = new google.maps.Map(mapdiv, {
        zoom: me.block.zoom,
        center: me.pointA,
        disableDefaultUI: me.block.disableDefaultUI
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
      if (me.block.destlongitude && me.block.destlatitude) {
        me.showRoute = true;
        me.directionsService = new google.maps.DirectionsService;
        me.directionsDisplay = new google.maps.DirectionsRenderer({
          map: me.map
        });
        me.pointB = new google.maps.LatLng(me.block.destlatitude || 50.8429, me.block.destlongitude || -0.1313);
      }



    },
    refresh: function (me) {
      console.log('refresh...');
      if (me.block.showtraffic) {
        me.trafficLayer = new google.maps.TrafficLayer();
        me.trafficLayer.setMap(me.map);
      }
      if (me.showRoute) {
        // get route from A to B
        me.directionsService.route({
          origin: me.pointA,
          destination: me.pointB,
          avoidTolls: true,
          avoidHighways: false,
          travelMode: google.maps.TravelMode.DRIVING
        }, function (response, status) {
          if (status == google.maps.DirectionsStatus.OK) {
            me.directionsDisplay.setDirections(response);
            //Additional info:
            //response.routes[0].legs[0]
            /*
            distance : {text: '132 km', value: 131533}
            duration: {text: '1 uur 33 min.', value: 5576}
            */
           var routeInfo = response.routes[0].legs[0];
           me.$mountPoint.find('.state_route').html(routeInfo.distance.text + ', '+routeInfo.duration.text);
          } else {
            window.alert('Directions request failed due to ' + status);
          }
        });

      }



    },
  };

  Dashticz.register(DT_googlemaps);
}(Dashticz));
