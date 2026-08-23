/* global  Dashticz language _CORS_PATH infoMessage*/
var DT_alarmmeldingen = {
  name: 'alarmmeldingen',
  canHandle: function (block) {
    return block && block.rss;
  },
  defaultCfg: {
    title: '112 Meldingen',
    containerClass: 'alarmrow',
    icon: 'fas fa-bullhorn',
    rss: 'https://www.alarmeringen.nl/feeds/all.rss',
    filter: '',
    show_lastupdate: true,
    width: 4,
    height: 160,
    refresh: 180,
    results: 5,
    timeformat: 'ddd D MMM HH:mm',
  },
  defaultContent: language.misc.loading,
  refresh: function (me) {
    var alarmobject = me.block;
    var newsfeed = _CORS_PATH + alarmobject.rss;
    $.ajax(newsfeed, {
      accepts: {
        xml: 'application/rss+xml',
      },
      dataType: 'xml',
      success: function (data) {
        dataAlarmInfo(me, data);
      },
      error: function (data) {
        infoMessage(
          '<font color="red">' + language.misc.alert_feed_error + '</font>',
          'RSS feed ' + data.statusText + '. Check rss url.',
          10000
        );
      },
    });

    function dataAlarmInfo(me, data) {
      var alarmobject = me.block;
      var $state = $(me.mountPoint + ' .dt_state').empty();
      var filterArray = String(alarmobject.filter || '').split(/,\s*/);

      function safeExternalUrl(value) {
        try {
          var parsed = new URL(value, window.location.href);
          return parsed.protocol === 'http:' || parsed.protocol === 'https:'
            ? parsed.href
            : '';
        } catch (error) {
          return '';
        }
      }

      var aantalMeldingen = 1;
      var maxMeldingen = alarmobject.results;
      $(data)
        .find('item')
        .each(function () {
          // or "item" or whatever suits your feed
          var el = $(this);
          var description = el.find('description').text();
          if (
            filterArray.some(function (element) {
              return description.toLowerCase().includes(element.toLowerCase());
            }) &&
            aantalMeldingen - 1 < maxMeldingen
          ) {
            var pubDate = moment(el.find('pubDate').text());
            var $strong = $('<strong>').append(
              document.createTextNode(
                pubDate.format(alarmobject.timeformat) + '   '
              )
            );
            var safeLink = safeExternalUrl(el.find('link').text());
            if (safeLink) {
              $('<a>')
                .attr({
                  href: safeLink,
                  target: '_blank',
                  rel: 'noopener noreferrer',
                })
                .text(description)
                .appendTo($strong);
            } else {
              $('<span>').text(description).appendTo($strong);
            }
            $('<li>').append($strong).appendTo($state);
            aantalMeldingen++;
          }
        });
      var isEmpty = aantalMeldingen < 2;
      Dashticz.setEmpty(me, isEmpty);
      if (isEmpty) {
        $('<li>')
          .append(
            $('<strong>').text(language.misc.no_alerts || 'No current alerts.')
          )
          .appendTo($state);
      }

      if (
        typeof alarmobject.show_lastupdate !== 'undefined' &&
        alarmobject.show_lastupdate == true
      ) {
        var dt = new Date();
        $('<em>')
          .text(
            language.misc.last_update +
              ': ' +
              addZero(dt.getHours()) +
              ':' +
              addZero(dt.getMinutes()) +
              ':' +
              addZero(dt.getSeconds())
          )
          .appendTo($state);
      }
    }

    function addZero(input) {
      if (input < 10) {
        return '0' + input;
      } else {
        return input;
      }
    }
  },
};

Dashticz.register(DT_alarmmeldingen);
