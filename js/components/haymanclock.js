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
    function getRelativeLabel(amount, unit, fallbackValue) {
      try {
        return getPart(
          moment().add(amount, unit).fromNow(true),
          fallbackValue
        );
      } catch (error) {
        return fallbackValue;
      }
    }
    var cfg = {
      containerClass: 'text-center',
      day: getRelativeLabel(1, 'day', fallback.day),
      hours: getRelativeLabel(2, 'hours', fallback.hours),
      minutes: getRelativeLabel(2, 'minutes', fallback.minutes),
      seconds: getRelativeLabel(2, 'seconds', fallback.seconds),
      scale: 1,
    };
    if (settings['clock_scale'] !== '' && settings['clock_scale'] != null) {
      var scale = Number(settings['clock_scale']);
      if (isFinite(scale) && scale > 0) cfg.scale = scale;
    }
    if (settings['clock_size'] !== '' && settings['clock_size'] != null) {
      var size = Number(settings['clock_size']);
      if (isFinite(size) && size > 0) cfg.size = size;
    }
    return cfg;
  },
  run: function (me) {
    templateEngine.load('clock_hayman').then(function (template) {
      var $block = $(me.mountPoint + ' .dt_block');
      var availW = $block.width() || $(me.mountPoint).width() || 120;
      var availH = $block.height() || $(me.mountPoint).height() || 0;
      var scale = Number(me.block.scale);
      if (!isFinite(scale) || scale <= 0) scale = 1;
      var base = me.block.size || (availH > 0 ? Math.min(availW, availH) : availW);
      var width = base * scale;
      if (availW > 0) width = Math.min(width, availW);
      if (availH > 0) width = Math.min(width, availH);
      me.block.clockwidth = Math.min(100, scale * 100) + '%';
      me.block.fontsize = Math.max(8, (width / 40));
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
