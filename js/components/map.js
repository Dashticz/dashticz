/* global language, Dashticz, settings*/
//# sourceURL=js/components/map.js

window.GoogleMapsCallback = function() {
  console.log('GoogleMapsLoaded');
  Dashticz.googleMapsPromise.resolve();
};

(function (Dashticz) {
    "use strict";
    var DT_googlemaps = {
        name: 'map',
        canHandle: function (block) {
          return block && (block.latitude && block.longitude);
        },
        init: function(block) {          
            Dashticz.googleMapsPromise = $.Deferred();
            $.ajax({
                url:
                  'https://maps.googleapis.com/maps/api/js?callback=GoogleMapsCallback&key=' + (block.api || settings['gm_api']),
                dataType: 'script',
                cache: true,
              });
            return Dashticz.googleMapsPromise;
        },
        defaultCfg: function (block) {
          var result = {
            refresh: 300,
            clickHandler: false,
            api: settings['gm_api'],
            width: 12,
            height: '400px',
            aspectratio:0.5,
            containerClass: 'swiper-no-swiping',
            longitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Longitude),
            latitude: parseFloat(Domoticz.getAllDevices()['_settings'].Location.Latitude),
            zoom: 15,
        
          };
          return result;
        },
        defaultContent: language.misc.loading,
        run: function (me) {
          var dt_content = me.$mountPoint.find('.dt_content');
          dt_content.css({height: me.block.height});

          me.map = new google.maps.Map(dt_content[0], {
            zoom: me.block.zoom,
            center: {
              lat: me.block.latitude,
              lng: me.block.longitude,
            },
          })
          var markerIcon = {
            url: me.block.markerIconUrl,
            scaledSize: new google.maps.Size(me.block.markerSize, me.block.markerSize)
          };
          me.marker = new google.maps.Marker({
            position: {lat: me.block.latitude, lng: me.block.longitude},
            map: me.map,
            title: 'My Location',
            icon: markerIcon
          });
      
        },
        refresh: function (me) {
        },
      };
    
      Dashticz.register(DT_googlemaps);
}(Dashticz));
