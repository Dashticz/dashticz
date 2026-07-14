/* global Dashticz moment templateEngine DT_function settings*/

var DT_haymanclock = {
  name: 'haymanclock',
  init: function () {
    DT_function.loadCSS('https://fonts.googleapis.com/css2?family=Montserrat');
    return DT_function.loadCSS('js/components/haymanclock.css');
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'haymanclock';
  },
  defaultCfg: function () {
    function getPart(value, fallback) {
      if (typeof value !== 'string') return fallback;
      var parts = value.trim().split(/\s+/);
      return parts[parts.length - 1] || fallback;
    }
    var locale = String(settings.language || 'en').toLowerCase();
    var fallback = locale.indexOf('nl') === 0
      ? { day: 'dag', hours: 'uur', minutes: 'minuten', seconds: 'seconden' }
      : { day: 'day', hours: 'hours', minutes: 'minutes', seconds: 'seconds' };
    var localeData = moment.localeData && moment.localeData();
    var relativeTime = (localeData && localeData._relativeTime) || {};
    return {
      containerClass: 'text-center',
      day: getPart(relativeTime.d, fallback.day),
      hours: getPart(relativeTime.hh, fallback.hours),
      minutes: getPart(relativeTime.mm, fallback.minutes),
      seconds: getPart(relativeTime.ss, fallback.seconds),
      scale: 1,
    };
  },
  run: function (me) {
    templateEngine.load('clock_hayman').then(function (template) {
      var width = me.block.size || $(me.mountPoint + ' .dt_block').width();
      me.block.clockwidth = me.block.scale * 100 + '%';
      me.block.fontsize = (width / 40) * me.block.scale;
      $(me.mountPoint + ' .dt_block').html(template(me.block));
      function updateTime() {
        var now = new Date();
        var hours = now.getHours() || 24;
        var locale = String(settings.language || 'en').replace('_', '-');
        var clockElement = me.$mountPoint[0];
        var day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][
          now.getDay()
        ];
        try {
          day = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
            now
          );
        } catch (error) {
          console.warn('Unable to format Hayman clock locale ' + locale, error);
        }
        clockElement.style.setProperty(
          '--timer-day',
          "'" + day + "'"
        );
        clockElement.style.setProperty(
          '--timer-hours',
          "'" + hours + "'"
        );
        clockElement.style.setProperty(
          '--timer-minutes',
          "'" + ('0' + now.getMinutes()).slice(-2) + "'"
        );
        clockElement.style.setProperty(
          '--timer-seconds',
          "'" + ('0' + now.getSeconds()).slice(-2) + "'"
        );
      }

      updateTime();
      Dashticz.setInterval(me, function () {
        updateTime();
      }, 1000);
    });
  },
};

Dashticz.register(DT_haymanclock);
//# sourceURL=js/components/haymanclock.js
