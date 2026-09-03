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
    scrolltimeout: 60,
    maxitems: 0,
  },
  defaultContent: '<div class="items"></div>',
  refresh: function (me) {
    var LOG_QUERY = 'type=command&param=getlog&loglevel=' + me.block.level;
    //console.log(LOG_QUERY);
    Domoticz.request(LOG_QUERY).then(function (logdata) {
      var $items = $(me.mountPoint + ' .items');
      if (me.popup) $(me.mountPoint + ' .log').addClass('popup'); //temporary. Move to generic handler
      var ascending = me.block.ascending !== false;
      var sorted = logdata.result.sort(function (a, b) {
        if (a.message < b.message) return ascending ? -1 : 1;
        if (a.message > b.message) return ascending ? 1 : -1;
        return 0;
      });
      var maxitems = parseInt(me.block.maxitems, 10);
      // Keep the most recent `maxitems` lines regardless of sort direction:
      // ascending puts the newest line last, descending puts it first.
      if (maxitems > 0) {
        sorted = ascending
          ? sorted.slice(-maxitems)
          : sorted.slice(0, maxitems);
      }
      var res = sorted.reduce(function (acc, el) {
        var dotPos = el.message.indexOf('.');
        var timeStamp = escapeLogHtml(el.message.substring(0, dotPos + 4));
        var logMessage = escapeLogHtml(el.message.substring(dotPos + 4));
        var level = parseInt(el.level, 10);
        if (isNaN(level)) level = 0;

        return (
          acc +
          '<tr class="level' +
          level +
          '"><td class="timestamp">' +
          timeStamp +
          '</td><td class="sep"></td><td class="message">' +
          logMessage +
          '</td></tr>'
        );
      }, '<table>');
      $items.html(res + '</table>');
      $items
        .off('.dashticzLog')
        .on('scroll.dashticzLog', function () {
          me.scrolling = true;
        })
        .on('scrollend.dashticzLog', function () {
          me.scrollend = Date.now();
        });
      if (
        me.scrollend &&
        Date.now() - me.scrollend > me.block.scrolltimeout * 1000
      ) {
        me.scrollend = 0;
        me.scrolling = false;
      }
      if (!me.scrolling)
        $items.scrollTop(function () {
          return this.scrollHeight;
        });
    });
  },
};

function escapeLogHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

Dashticz.register(DT_log);
