/* global Dashticz StationClock settings*/

function clockDefaultSizeScale() {
  var cfg = {
    containerClass: 'text-center',
    scale: 1,
  };
  if (settings['clock_scale'] !== '' && settings['clock_scale'] != null) {
    var scale = Number(settings['clock_scale']);
    if (isFinite(scale) && scale > 0) {
      cfg.scale = scale;
    }
  }
  if (settings['clock_size'] !== '' && settings['clock_size'] != null) {
    var size = Number(settings['clock_size']);
    if (isFinite(size) && size > 0) {
      cfg.size = size;
    }
  }
  return cfg;
}

function clockFitSize(me, fallback) {
  var $mount = $(me.mountPoint);
  var $block = $mount.find('.dt_block').first();
  var $content = $mount.find('.dt_content').first();
  var availW = Math.max(
    $content.innerWidth() || 0,
    $block.innerWidth() || 0,
    $mount.innerWidth() || 0,
    fallback || 0
  );
  var availH = Math.max(
    $content.innerHeight() || 0,
    $block.innerHeight() || 0,
    $mount.innerHeight() || 0
  );
  var scale = Number(me.block.scale);
  if (!isFinite(scale) || scale <= 0) scale = 1;
  var base = Number(me.block.size);
  if (!isFinite(base) || base <= 0) {
    base = availH > 0 ? Math.min(availW, availH) : availW;
  }
  var width = base * scale;
  if (availW > 0) width = Math.min(width, availW);
  if (availH > 0) width = Math.min(width, availH);
  if (me.block.maxSize) width = Math.min(width, Number(me.block.maxSize) || width);
  width = Math.min(width, window.innerHeight || width);
  return Math.max(32, Math.floor(width));
}

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
  defaultCfg: clockDefaultSizeScale,
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

    var width = clockFitSize(me, 120);
    $(me.mountPoint + ' .dt_content').html(
      '<canvas id="clock' +
        me.mountPoint +
        '" width="' +
        width +
        '" height="' +
        width +
        '" style="max-width:100%;max-height:100%;">' +
        language.misc.browser_not_supported +
        '</canvas>'
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

    Dashticz.setInterval(me, function () {
      clock.draw();
    }, 50);
  },
};

Dashticz.register(DT_stationclock);
//# sourceURL=js/components/stationclock.js
