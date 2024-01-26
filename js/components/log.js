//# sourceURL=js/components/log.js
/* global Dashticz Domoticz*/

var DT_log = {
  name: 'log',
  defaultCfg: {
    icon: 'fas fa-microchip',
    title: 'Domoticz log',
    refresh: 5,
    containerClass: 'containslog',
    level: 268435455,
    ascending: true,
    scrolltimeout: 60
  },
  defaultContent: '<div class="items"></div>',
  refresh: function (me) {
    var LOG_QUERY = 'type=command&param=getlog&loglevel=' + me.block.level;
    //console.log(LOG_QUERY);
    Domoticz.request(LOG_QUERY).then(function (logdata) {
      var $items = $(me.mountPoint + ' .items');
      if (me.popup) $(me.mountPoint + ' .log').addClass('popup'); //temporary. Move to generic handler
      var res = logdata.result
        .sort(function (a, b) {
          a.message < b.message ? 1 : a.message > b.message ? -1 : 0;
        })
        .reduce(function (acc, el) {
          var dotPos = el.message.indexOf('.');
          var timeStamp = el.message.substring(0, dotPos + 4);
          var logMessage = el.message.substring(dotPos + 4);

          return acc+'<tr class="level' +
            el.level +'"><td class="timestamp">' +
            timeStamp +
            '</td><td class="sep"></td><td class="message">' +
            logMessage +
            '</td></tr>'
        }, '<table>');
      $items.html(res + '</table>');
      $items.on('scroll', function() {
        me.scrolling=true;
      });
      $items.on('scrollend', function() {
                me.scrollend = Date.now();
              });
      if (me.scrollend && ((Date.now() - me.scrollend) > (me.block.scrolltimeout * 1000))) {
        me.scrollend = 0;
        me.scrolling = false;
      }  
      if(!me.scrolling)
        $items.scrollTop(function() { return this.scrollHeight; });
    });
  },
};

Dashticz.register(DT_log);
