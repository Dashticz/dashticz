/* global Dashticz Domoticz DT_function getDevices */
//# sourceURL=js/components/fullykiosk.js
/* Fully Kiosk widget: the battery of a Fully Kiosk tablet with charge control,
 * based on the domoticz_fullykiosk plugin
 * (https://github.com/MadPatrick/domoticz_fullykiosk). The battery level is
 * read from the tablet's Remote Admin API by vendor/dashticz/fullykiosk/
 * index.php, a same-origin PHP bridge like the HP iLO and PostNL widgets; the
 * charger is a normal Domoticz switch.
 *
 * It is a repeatable block (Widgets -> Fully Kiosk), configured per block, and
 * dispatched on fullymode ('charge'). The tile shows the battery percentage,
 * the percentage at which the charger is switched next, and a switch that
 * turns the charger on and off by hand.
 *
 *   fullyhost, fullyport (2323), fullypassword, fullyhttps
 *                   the Remote Admin connection of the tablet
 *   fullyswitch     idx of the Domoticz switch of the charger
 *   fullyauto       automatic charge control (default on): the widget starts
 *                   charging at a random percentage between fullystartmin and
 *                   fullystartmax (25-30) and stops between fullystopmin and
 *                   fullystopmax (80-90), like the plugin. A new random
 *                   percentage is picked every time the charger is switched.
 *                   Always starts at fullyhardmin (15) or lower, always stops
 *                   at fullyhardmax (95) or higher. When the tablet cannot be
 *                   reached and the charger has been off for 16 hours, the
 *                   charger is switched on as a backup.
 *   fullyshowbattery
 *                   the battery percentage row (default on)
 *   fullyshowcharging
 *                   a row with the charging state of the tablet, whether it
 *                   is plugged in (default off)
 *   fullyshowscreen, fullyshowscreensaver, fullyshowmotion,
 *   fullyshowbrightness, fullyshowloadurl
 *                   extra rows for the other devices of the plugin (default
 *                   off): screen on/off, screensaver on/off, motion sensor
 *                   on/off, brightness (0-100) and a button that loads the
 *                   start URL of the tablet again
 *   fullyfontsize   optional font size in px (8-60); empty = the theme's
 *
 * The charge control runs in the browser, so only while a dashboard with this
 * widget is open; switch off the plugin's own charge control (leave its
 * Charger switch ID empty) when this widget controls the same charger.
 */
var DT_fullykiosk = (function () {
  var BACKUP_DELAY_SECONDS = 16 * 60 * 60;
  var DEFAULTS = {
    startmin: 25,
    startmax: 30,
    stopmin: 80,
    stopmax: 90,
    hardmin: 15,
    hardmax: 95,
  };

  // The extra rows (the other devices of the plugin): command, icon, label.
  var EXTRA_ROWS = [
    { key: 'screen', icon: 'fa-display', label: 'Screen', field: 'screenOn' },
    {
      key: 'screensaver',
      icon: 'fa-moon',
      label: 'Screensaver',
      field: 'screensaver',
    },
    { key: 'charging', icon: 'fa-plug', label: 'Plugged in', readonly: true },
    {
      key: 'motion',
      icon: 'fa-person-walking',
      label: 'Motion sensor',
      field: 'motion',
    },
    { key: 'brightness', icon: 'fa-sun', label: 'Brightness' },
    { key: 'loadurl', icon: 'fa-rotate-right', label: 'Load start URL' },
  ];

  return {
    name: 'fullykiosk',
    canHandle: function (block) {
      return !!(block && block.fullymode === 'charge');
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-tablet-screen-button',
      refresh: 60,
      containerClass: 'fullykiosk-block dt-widget-rows',
      // Icon and title in their own header row, so the rows below use the
      // full width of the block (same as the HP iLO widget).
      template: 1,
    },
    run: function (me) {
      me.targets = loadTargets(me);
      var idx = switchIdx(me.block);
      if (idx) {
        Dashticz.subscribeDevice(me, idx, false, function () {
          render(me);
        });
      }
    },
    refresh: refresh,
    // Exposed for the tests.
    render: render,
    limits: limits,
    randomBetween: randomBetween,
    decide: decide,
    nextSwitchPercentage: nextSwitchPercentage,
  };

  // The data column of a row: icon, label and value.
  function dataHtml(icon, label, value, extraClass) {
    return (
      '<span class="fullykiosk-data' +
      (extraClass ? ' ' + extraClass : '') +
      '">' +
      (icon
        ? '<i class="fas ' + icon + ' fullykiosk-icon" aria-hidden="true"></i>'
        : '') +
      '<span class="fullykiosk-label">' +
      label +
      '</span>' +
      (value ? '<span class="fullykiosk-value">' + value + '</span>' : '') +
      '</span>'
    );
  }

  // One row of two columns: the button(s) and the data.
  function rowHtml(classes, control, icon, label, value) {
    return (
      '<div class="fullykiosk-row ' +
      classes +
      '"><span class="fullykiosk-control">' +
      (control || '') +
      '</span>' +
      dataHtml(icon, label, value) +
      '</div>'
    );
  }

  // A button of column 1. on: true/false makes it a power button that shows
  // its state, undefined a plain button.
  function buttonHtml(action, icon, label, on, disabled, extra) {
    return (
      '<button type="button" class="transbg hover dt-btn fullykiosk-btn' +
      (on === true ? ' on' : '') +
      '" data-action="' +
      action +
      '"' +
      (extra || '') +
      (on === undefined ? '' : ' role="switch" aria-checked="' + on + '"') +
      (disabled ? ' disabled' : '') +
      ' title="' +
      label +
      '" aria-label="' +
      label +
      '"><em class="fas fa-small ' +
      icon +
      '" aria-hidden="true"></em></button>'
    );
  }

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function isOn(value, def) {
    if (value === undefined || value === null || value === '') return def;
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  function switchIdx(block) {
    var idx = parseInt(block.fullyswitch, 10);
    return idx > 0 ? String(idx) : '';
  }

  // The percentages of the block, each kept in order (min <= max).
  function limits(block) {
    var result = {};
    Object.keys(DEFAULTS).forEach(function (key) {
      result[key] = DT_function.clampNumber(
        block['fully' + key],
        DEFAULTS[key],
        key === 'hardmin' ? 0 : 1,
        100,
        true
      );
    });
    if (result.startmin > result.startmax) {
      var swap = result.startmin;
      result.startmin = result.startmax;
      result.startmax = swap;
    }
    if (result.stopmin > result.stopmax) {
      var swapStop = result.stopmin;
      result.stopmin = result.stopmax;
      result.stopmax = swapStop;
    }
    return result;
  }

  // A whole number between min and max, both included (random.randint).
  function randomBetween(min, max, random) {
    return min + Math.floor((random || Math.random)() * (max - min + 1));
  }

  function newTargets(lim, random, only) {
    var targets = {};
    if (only !== 'start')
      targets.stop = randomBetween(lim.stopmin, lim.stopmax, random);
    if (only !== 'stop')
      targets.start = randomBetween(lim.startmin, lim.startmax, random);
    return targets;
  }

  /* The charge control of the plugin (handle_charge_control).
   * battery: 0-100, charger: 'On' | 'Off', targets: {start, stop}.
   * Returns {command: 'On' | 'Off' | null, reason, targets, charger}: the
   * switch command to send, and the (possibly new) random percentages. */
  function decide(battery, charger, targets, lim, random) {
    var result = {
      command: null,
      reason: '',
      targets: { start: targets.start, stop: targets.stop },
      charger: charger,
    };
    function start(reason) {
      result.command = 'On';
      result.reason = reason;
      result.charger = 'On';
      // Starting picks both percentages again, like the plugin.
      result.targets = newTargets(lim, random);
    }
    function stop(reason) {
      result.command = 'Off';
      result.reason = reason;
      result.charger = 'Off';
      result.targets = {
        start: randomBetween(lim.startmin, lim.startmax, random),
        stop: result.targets.stop,
      };
    }
    if (battery <= lim.hardmin && result.charger === 'Off') {
      start('hard minimum ' + lim.hardmin + '% reached');
    }
    if (battery >= lim.hardmax && result.charger === 'On') {
      stop('hard maximum ' + lim.hardmax + '% reached');
      return result;
    }
    if (battery <= result.targets.start && result.charger === 'Off') {
      start('start threshold ' + result.targets.start + '% reached');
    }
    if (result.charger === 'On') {
      if (battery >= 100) stop('fully charged (100%)');
      else if (battery >= result.targets.stop)
        stop('stop target ' + result.targets.stop + '% reached');
    }
    return result;
  }

  // The percentage the charger is switched at next: the stop percentage while
  // charging, the start percentage while not.
  function nextSwitchPercentage(charger, targets) {
    return charger === 'On' ? targets.stop : targets.start;
  }

  function storageKey(me) {
    return 'dt_fullykiosk_' + me.key;
  }

  function loadTargets(me) {
    var lim = limits(me.block);
    var targets = null;
    try {
      targets = JSON.parse(localStorage.getItem(storageKey(me)) || 'null');
    } catch (e) {
      targets = null;
    }
    var valid = !!(
      targets &&
      targets.start >= lim.startmin &&
      targets.start <= lim.startmax &&
      targets.stop >= lim.stopmin &&
      targets.stop <= lim.stopmax
    );
    return valid ? targets : newTargets(lim);
  }

  function saveTargets(me) {
    try {
      localStorage.setItem(storageKey(me), JSON.stringify(me.targets));
    } catch (e) {
      // Without storage the percentages are picked again after a reload.
    }
  }

  function device(me) {
    var idx = switchIdx(me.block);
    return idx ? Domoticz.getAllDevices()[idx] : null;
  }

  // 'On' | 'Off', or '' while the switch is unknown.
  function chargerState(me) {
    var dev = device(me);
    if (!dev) return '';
    var state = String(dev.Status || dev.Data || '').toLowerCase();
    return state === 'on' ? 'On' : state === 'off' ? 'Off' : '';
  }

  // Seconds since the switch was last changed (Domoticz LastUpdate), or null.
  function switchAgeSeconds(dev) {
    var match = /^(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)(?::(\d\d))?$/.exec(
      String((dev && dev.LastUpdate) || '')
    );
    if (!match) return null;
    var changed = new Date(
      +match[1],
      +match[2] - 1,
      +match[3],
      +match[4],
      +match[5],
      +(match[6] || 0)
    );
    return Math.max(0, (Date.now() - changed.getTime()) / 1000);
  }

  function batteryIcon(level) {
    if (level === null) return 'fa-battery-empty';
    if (level >= 88) return 'fa-battery-full';
    if (level >= 63) return 'fa-battery-three-quarters';
    if (level >= 38) return 'fa-battery-half';
    if (level >= 13) return 'fa-battery-quarter';
    return 'fa-battery-empty';
  }

  function render(me) {
    var block = me.block;
    var fontSize = parseInt(block.fullyfontsize, 10);
    me.$mountPoint
      .find('.dt_state')
      .css('font-size', fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : '');
    var charger = chargerState(me);
    var level = typeof me.battery === 'number' ? me.battery : null;
    var auto = isOn(block.fullyauto, true);
    var info = me.info || null;
    // The tile icon follows the charger switch, like the icon of a normal
    // switch: dimmed (off) while the charger is off.
    me.$mountPoint
      .find('.col-icon .icon')
      .toggleClass('on', charger === 'On')
      .toggleClass('off', charger === 'Off');
    var chargeLabel = esc(DT_function.t('fullykiosk_charging', 'Charging'));
    var html = '<div class="fullykiosk-rows">';
    var batteryHtml = isOn(block.fullyshowbattery, true)
      ? dataHtml(
          batteryIcon(level),
          esc(DT_function.t('fullykiosk_battery', 'Battery')),
          level === null ? '-' : esc(level + ' %'),
          'fullykiosk-battery'
        )
      : '';
    if (switchIdx(block)) {
      // The charger switch is one button in column 1, as high as the charge
      // data next to it: the battery and the percentage at which the charger
      // is switched next.
      var nextHtml = '';
      if (auto && charger) {
        nextHtml = dataHtml(
          'fa-arrows-up-down',
          esc(
            charger === 'On'
              ? DT_function.t('fullykiosk_next_stop', 'Stops charging at')
              : DT_function.t('fullykiosk_next_start', 'Starts charging at')
          ),
          esc(nextSwitchPercentage(charger, me.targets) + ' %')
        );
      }
      html +=
        '<div class="fullykiosk-row fullykiosk-switch fullykiosk-group">' +
        '<span class="fullykiosk-control">' +
        buttonHtml(
          'charger',
          'fa-power-off',
          chargeLabel,
          charger === 'On',
          !charger
        ) +
        '</span><span class="fullykiosk-groupdata">' +
        batteryHtml +
        nextHtml +
        '</span></div>';
    } else if (batteryHtml) {
      html +=
        '<div class="fullykiosk-row fullykiosk-battery"><span class="fullykiosk-control"></span>' +
        batteryHtml +
        '</div>';
    }
    EXTRA_ROWS.forEach(function (row) {
      if (!isOn(block['fullyshow' + row.key], false)) return;
      html += extraRowHtml(row, info);
    });
    if (me.error) {
      html += '<div class="fullykiosk-error">' + esc(me.error) + '</div>';
    }
    html += '</div>';
    me.$mountPoint.find('.dt_state').html(html);
    me.$mountPoint
      .find('.fullykiosk-brightness-input')
      .on('click', function (event) {
        event.stopPropagation();
      })
      .on('input', function () {
        $(this)
          .next('.fullykiosk-brightness-value')
          .text($(this).val() + ' %');
      })
      .on('change', function () {
        sendCommand(me, 'brightness', parseInt($(this).val(), 10) || 0);
      });
    me.$mountPoint.find('.fullykiosk-btn').on('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var $button = $(this);
      var action = $button.attr('data-action');
      if (action === 'charger') {
        if (charger) sendSwitch(me, charger === 'On' ? 'Off' : 'On');
      } else if (action === 'toggle') {
        sendCommand(
          me,
          $button.attr('data-command'),
          $button.attr('aria-checked') === 'true' ? 'off' : 'on'
        );
      } else if (action === 'loadurl') {
        sendCommand(me, 'loadurl', '');
      }
    });
  }

  function extraRowHtml(row, info) {
    var label = esc(
      DT_function.t(
        'fullykiosk_' + (row.key === 'charging' ? 'charging_row' : row.key),
        row.label
      )
    );
    var offline = !info;
    if (row.key === 'brightness') {
      // A dimmer slider (0-100) in the data column, sent when released.
      var level = info ? info.brightness : 0;
      return rowHtml(
        'fullykiosk-extra',
        '',
        row.icon,
        label,
        '<input type="range" class="fullykiosk-brightness-input" min="0" max="100" step="1" value="' +
          level +
          '"' +
          (info ? '' : ' disabled') +
          ' aria-label="' +
          label +
          '"><span class="fullykiosk-brightness-value">' +
          esc(level + ' %') +
          '</span>'
      );
    }
    if (row.key === 'loadurl') {
      return rowHtml(
        'fullykiosk-extra',
        buttonHtml('loadurl', row.icon, label, undefined, offline),
        '',
        label,
        ''
      );
    }
    if (row.readonly) {
      var plugged = !!(info && info.plugged);
      return rowHtml(
        'fullykiosk-extra fullykiosk-plugged',
        '',
        row.icon,
        label,
        info
          ? esc(
              DT_function.t(
                plugged ? 'fullykiosk_on' : 'fullykiosk_off',
                plugged ? 'On' : 'Off'
              )
            )
          : '-'
      );
    }
    return rowHtml(
      'fullykiosk-extra',
      buttonHtml(
        'toggle',
        'fa-power-off',
        label,
        !!(info && info[row.field]),
        offline,
        ' data-command="' + row.key + '"'
      ),
      row.icon,
      label,
      ''
    );
  }

  function connection(block, extra) {
    return $.extend(
      {
        host: block.fullyhost,
        port: DT_function.clampNumber(block.fullyport, 2323, 1, 65535, true),
        password: block.fullypassword || '',
        https: isOn(block.fullyhttps, false),
      },
      extra
    );
  }

  // A command for the tablet (screen, screensaver, motion, brightness,
  // loadurl), then a refresh to show the new state.
  function sendCommand(me, command, value) {
    DT_function.bridge(
      'fullykiosk/index.php',
      connection(me.block, {
        action: 'command',
        command: command,
        value: value,
      })
    ).then(
      function () {
        refresh(me);
      },
      function (jqXHR) {
        me.error = DT_function.bridgeError(
          jqXHR,
          DT_function.t('fullykiosk_error', 'Unable to reach the tablet.')
        );
        render(me);
      }
    );
  }

  function sendSwitch(me, command) {
    var idx = switchIdx(me.block);
    return Domoticz.request(
      'type=command&param=switchlight&idx=' +
        idx +
        '&switchcmd=' +
        command +
        '&level=0'
    ).then(function () {
      var dev = device(me);
      if (dev) dev.Status = command;
      render(me);
      if (typeof getDevices === 'function') getDevices(true);
    });
  }

  function control(me) {
    var charger = chargerState(me);
    if (!charger || me.battery === null || !isOn(me.block.fullyauto, true))
      return;
    var result = decide(me.battery, charger, me.targets, limits(me.block));
    me.targets = result.targets;
    saveTargets(me);
    if (result.command) {
      console.log(
        'Fully Kiosk: charger ' + result.command + ' at ' + me.battery + '%',
        result.reason
      );
      sendSwitch(me, result.command);
    }
  }

  // The tablet cannot be reached: switch the charger on after 16 hours off.
  function backup(me) {
    var dev = device(me);
    if (!isOn(me.block.fullyauto, true) || chargerState(me) !== 'Off') return;
    var age = switchAgeSeconds(dev);
    if (age !== null && age >= BACKUP_DELAY_SECONDS) sendSwitch(me, 'On');
  }

  function refresh(me) {
    var block = me.block;
    if (!me.targets) me.targets = loadTargets(me);
    if (!block.fullyhost) {
      me.error = DT_function.t(
        'fullykiosk_not_configured',
        'Enter the host of the tablet in the widget settings.'
      );
      render(me);
      return;
    }
    DT_function.bridge('fullykiosk/index.php', connection(block)).then(
      function (res) {
        me.error = '';
        me.info = res || null;
        me.battery =
          res && typeof res.battery === 'number' ? res.battery : null;
        render(me);
        control(me);
      },
      function (jqXHR) {
        me.error = DT_function.bridgeError(
          jqXHR,
          DT_function.t('fullykiosk_error', 'Unable to reach the tablet.')
        );
        me.battery = null;
        me.info = null;
        render(me);
        backup(me);
      }
    );
  }
})();

Dashticz.register(DT_fullykiosk);
