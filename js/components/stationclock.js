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
  },
  run: function (me) {
    var width = Math.min(
      me.block.size || $(me.mountPoint + ' .dt_content').width(),
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
    clock.body = StationClock.RoundBody;
    clock.dial = StationClock.GermanStrokeDial;
    clock.hourHand = StationClock.PointedHourHand;
    clock.minuteHand = StationClock.PointedMinuteHand;
    if (settings['hide_seconds_stationclock']) {
      clock.secondHand = false;
    } else {
      clock.secondHand = StationClock.HoleShapedSecondHand;
      if (typeof settings['boss_stationclock'] == 'undefined')
        clock.boss = StationClock.NoBoss;
      else if (settings['boss_stationclock'] == 'RedBoss')
        clock.boss = StationClock.RedBoss;
    }

    clock.minuteHandBehavoir = StationClock.BouncingMinuteHand;
    clock.secondHandBehavoir = StationClock.OverhastySecondHand;

    window.setInterval(function () {
      clock.draw();
    }, 50);
  },
};

Dashticz.register(DT_stationclock);
//# sourceURL=js/components/stationclock.js
