/* global Dashticz StationClock settings*/

var DT_stationclock = {
  name: 'stationclock',
  init: function () {
    return $.ajax({
      url: 'vendor/stationclock.js',
      dataType: 'script',
    });
  },
  canHandle: function (block) {
    return block && block.type && block.type === 'stationclock';
  },
  defaultCfg: {
    containerClass: 'text-center',
    scale: 1
  },
  run: function (me) {
    var cfg = {
      //StationClock may not be loaded in defaultcfg(?)
      body: StationClock.RoundBody,
      dial: StationClock.GermanStrokeDial,
      hourhand: StationClock.PointedHourHand,
      minutehand: StationClock.PointedMinuteHand,
      secondhand: settings['hide_seconds_stationclock']
        ? 0
        : StationClock.HoleShapedSecondHand,
      boss: settings['boss_stationclock'] || 'NoBoss',
      minutehandbehavior: StationClock.BouncingMinuteHand,
      secondhandbehavior: StationClock.OverhastySecondHand,
    };

    $.extend(cfg, me.block);
    me.block = cfg;

    function clockSetting(key) {
      return typeof key === 'string' ? StationClock[key] : key;
    }

    var width = Math.min(
      (me.block.size || $(me.mountPoint + ' .dt_content').width()) * me.block.scale,
      window.innerHeight
    );
    $(me.mountPoint + ' .dt_content').html(
      '<canvas id="clock' +
        me.mountPoint +
        '" width="' +
        width +
        '" height="' +
        width +
        '">Your browser is unfortunately not supported.</canvas>'
    );

    var clock = new StationClock('clock' + me.mountPoint);
    clock.body = clockSetting(me.block.body);
    clock.dial = clockSetting(me.block.dial);
    clock.hourHand = clockSetting(me.block.hourhand);
    clock.minuteHand = clockSetting(me.block.minutehand);
    clock.secondHand = clockSetting(me.block.secondhand);
    clock.boss = clockSetting(me.block.boss);

    clock.minuteHandBehavoir = clockSetting(me.block.minutehandbehavior);
    clock.secondHandBehavoir = clockSetting(me.block.secondhandbehavior);

    window.setInterval(function () {
      clock.draw();
    }, 50);
  },
};

Dashticz.register(DT_stationclock);
//# sourceURL=js/components/stationclock.js
