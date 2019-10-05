/* global Dashticz StationClock settings*/

var DT_stationclock = {
    name: "stationclock",
    init() {
        return $.ajax({
            url: 'vendor/stationclock.js',
            dataType: 'script'
        });
    },
    default: {
        containerClass: () => 'text-center'
    },
    get: () => '<canvas id="clock" width="150" height="150">Your browser is unfortunately not supported.</canvas>',
    run() {
        var clock = new StationClock("clock");
        clock.body = StationClock.RoundBody;
        clock.dial = StationClock.GermanStrokeDial;
        clock.hourHand = StationClock.PointedHourHand;
        clock.minuteHand = StationClock.PointedMinuteHand;
        if (settings['hide_seconds_stationclock']) {
            clock.secondHand = false;
        } else {
            clock.secondHand = StationClock.HoleShapedSecondHand;
            if (typeof (settings['boss_stationclock']) == 'undefined') clock.boss = StationClock.NoBoss;
            else if (settings['boss_stationclock'] == 'RedBoss') clock.boss = StationClock.RedBoss;
        }

        clock.minuteHandBehavoir = StationClock.BouncingMinuteHand;
        clock.secondHandBehavoir = StationClock.OverhastySecondHand;

        window.setInterval(function () {
            clock.draw()
        }, 50);
    }
}


Dashticz.register(DT_stationclock);