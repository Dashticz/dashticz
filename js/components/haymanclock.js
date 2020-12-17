/* global Dashticz moment templateEngine DT_function*/

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
    function getPart(str) {
      return str.split(' ')[1] || '';
    }
    var ld = moment.localeData()._relativeTime;
    return {
      containerClass: 'text-center',
      day: getPart(ld.d),
      hours: getPart(ld.hh),
      minutes: getPart(ld.mm),
      seconds: getPart(ld.ss),
    };
  },
  run: function (me) {
    templateEngine.load('clock_hayman').then(function (template) {
      $(me.mountPoint + ' .dt_block').html(template(me.block));

      function updateTime() {
        document.documentElement.style.setProperty(
          '--timer-day',
          "'" + moment().format('dd') + "'"
        );
        document.documentElement.style.setProperty(
          '--timer-hours',
          "'" + moment().format('k') + "'"
        );
        document.documentElement.style.setProperty(
          '--timer-minutes',
          "'" + moment().format('mm') + "'"
        );
        document.documentElement.style.setProperty(
          '--timer-seconds',
          "'" + moment().format('ss') + "'"
        );
      }

      var width = $(me.mountPoint + ' .dt_block').width();
      $(me.mountPoint + ' .dt_block').css('font-size', width / 40);
      window.setInterval(function () {
        updateTime();
      }, 1000);
    });
  },
};

Dashticz.register(DT_haymanclock);
//# sourceURL=js/components/haymanclock.js
