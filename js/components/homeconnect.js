/* global Dashticz Domoticz DT_function */
//# sourceURL=js/components/homeconnect.js
/* Home Connect widget: the appliances (washing machine, dryer, coffee machine,
 * ...) of the Domoticz Home Connect plugin
 * (https://github.com/Rouzax/home-connect-domoticz-plugin), in one tile.
 *
 * The block (dispatched on hcmode: 'appliances') has no device ids to fill in.
 * The devices of the hardware whose name contains "Home Connect" are grouped
 * per appliance by their name: the plugin names every device "<appliance>
 * <value>", for example "Washer Progress" / "Wasautomaat Voortgang" (a leading
 * "$" is ignored). The values the widget uses:
 *
 *   power     Power / Aan/uit
 *   progress  Progress / Voortgang
 *   time      Remaining time / Resterende tijd (minutes, or text like
 *             "1h 20min"); Finish time / Eindtijd is read the same way
 *   state     Status / State: the whole run in one line; "Klaar ..." or
 *             "Finished ..." shows the check mark when there is no progress
 *   alert     Notifications / Meldingen, and every other alert device of
 *             the appliance that is not a status (a message device such as
 *             "Drip tray full" / "Leeg lekbakjes"). The alert devices
 *             Status, Remote control and "Program finished" do not count
 *
 * Options (all optional):
 *
 *   hcfontsize   font size of the tile in pixels (8-60); empty = the theme's
 *   hchardware   exact name of the Domoticz hardware of the plugin (empty: a
 *                hardware whose name looks like 'Home Connect')
 *                (Setup -> Hardware); default 'Home Connect' (spaces, _ and
 *                - are ignored, so it also finds 'HomeConnect_API')
 *   hcdebug      true: a test view with the devices found per appliance
 *   hcip         IP address (or host) of another Domoticz to read the devices
 *                from, for testing; empty = the Domoticz of the dashboard
 *   hcport       port of that Domoticz (default 8080)
 *   hcexclude    appliance names to hide, comma separated
 *   hcdevices    per appliance, the idx of a device that is not found by its
 *                name: {'Washer': {power: 12, progress: 13, time: 14,
 *                alert: 15, name: 'Wasmachine', icon: 'washer'}}
 *                (icon: washer, dryer, coffee, dishwasher, oven, fridge,
 *                plug, or a Font Awesome class)
 *
 * What the tile shows, per appliance: the icon and the name; while a program
 * runs the progress and "ready at HH:MM" (now + the remaining time); at 100% a
 * check mark; a warning when there is an alert (not for "no notification"),
 * each message once, also while the appliance is off. An appliance that is
 * off without messages, or has nothing to show, is left out.
 */
var DT_homeconnect = (function () {
  var FIELDS = ['power', 'progress', 'time', 'state'];
  // The value of a device, from the end of its name (English and Dutch).
  var SUFFIXES = {
    power: /^(.*?)\s+(power|aan\/uit)$/i,
    progress: /^(.*?)\s+(progress|voortgang)$/i,
    time: /^(.*?)\s+(remaining time|resterende tijd|finish time|eindtijd)$/i,
    state: /^(.*?)\s+(status|state)$/i,
  };
  // Alert devices that are no message: the status of the appliance, whether
  // it may be remote controlled, and "finished" events (the progress shows it).
  var NOT_A_MESSAGE =
    /\s(status|state|status code|statuscode|remote control|bediening op afstand|program finished|programma klaar|drying finished|drogen klaar|preheat finished|alarm clock elapsed)$/i;
  var ALERT_NAME = /\s(notifications|meldingen|alert|alerts)$/i;
  // The icon from a word in the name of the appliance: the key of GLYPHS.
  var ICONS = [
    [/wasmachine|wasautomaat|washer|washing|waschmaschine/i, 'washer'],
    [/droger|dryer|trockner/i, 'dryer'],
    [/koffie|coffee|kaffee/i, 'coffee'],
    [/vaatwasser|dishwasher|geschirr/i, 'dishwasher'],
    [/oven|backofen|magnetron|microwave/i, 'oven'],
    [/koelkast|fridge|freezer|vriezer|k[uü]hl/i, 'fridge'],
  ];
  var DEFAULT_ICON = 'plug';
  // The icons: the inside of a 24x24 outline drawing (stroke = the colour of the icon, see the css).
  var GLYPHS = {
    washer:
      '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M4 7h16"/>' +
      '<circle cx="7.5" cy="4.8" r=".6"/><path d="M11 4.8h5.5"/>' +
      '<circle cx="12" cy="14.2" r="4.8"/><path d="M8.6 14.6c1.1-1.1 2.2 1.1 3.4 0s2.3 1.1 3.4 0"/>',
    dryer:
      '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M4 7h16"/>' +
      '<circle cx="7.5" cy="4.8" r=".6"/><path d="M11 4.8h5.5"/>' +
      '<circle cx="12" cy="14.2" r="4.8"/><path d="M9.8 12.2c1.1.9 1.1 2.2 0 3.1M12.8 12.2c1.1.9 1.1 2.2 0 3.1"/>',
    coffee:
      '<path d="M5 21.5h14M6.5 3h11a1.5 1.5 0 0 1 1.5 1.5v17"/><path d="M6.5 3A1.5 1.5 0 0 0 5 4.5v17"/>' +
      '<path d="M5 8h14"/><path d="M9 11.5h6v3.2a3 3 0 0 1-6 0z"/><path d="M12 8v1.8"/>',
    dishwasher:
      '<rect x="4" y="2.5" width="16" height="19" rx="2.5"/><path d="M4 7h16"/>' +
      '<circle cx="7.5" cy="4.8" r=".6"/><path d="M11 4.8h5.5"/>' +
      '<path d="M7 12h10M7 16.5h10M9 12v-1.5M15 12v-1.5M9 16.5V15M15 16.5V15"/>',
    oven:
      '<rect x="3.5" y="3" width="17" height="18" rx="2.5"/><path d="M3.5 8h17"/>' +
      '<circle cx="7.5" cy="5.5" r=".6"/><circle cx="11" cy="5.5" r=".6"/><circle cx="14.5" cy="5.5" r=".6"/>' +
      '<rect x="6.5" y="10.5" width="11" height="7" rx="1"/>',
    fridge:
      '<rect x="5.5" y="2.5" width="13" height="19" rx="2.5"/><path d="M5.5 9.5h13"/>' +
      '<path d="M8.5 5.5v1.5M8.5 12.5v3"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0zM12 17v4"/>',
  };
  // A status that needs attention: an error, an action that is required, a
  // program that is aborting or paused ('Actie vereist: lekbak vol (+2)').
  var STATE_WARNING =
    /^(action required|actie vereist|error|fout|aborting|wordt afgebroken|paused|gepauzeerd)\b/i;

  // Alert texts that mean: nothing to report.
  var NO_ALERT = /^(no active alerts?|no notifications?|geen melding(en)?|-)$/i;

  return {
    name: 'homeconnect',
    canHandle: function (block) {
      return !!(block && block.hcmode === 'appliances');
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-home',
      // The ready time moves along with the clock.
      refresh: 60,
      containerClass: 'homeconnect-block dt-widget-rows',
      template: 1,
    },
    run: function (me) {
      if (remoteBase(me.block)) {
        // Another Domoticz: no subscriptions, read it again at every refresh.
        refreshRemote(me);
        return;
      }
      var subscribed = {};
      appliances(me.block).forEach(function (app) {
        FIELDS.concat('alerts').forEach(function (field) {
          [].concat(app[field] || []).forEach(function (dev) {
            if (dev && !subscribed[dev.idx]) {
              subscribed[dev.idx] = true;
              Dashticz.subscribeDevice(me, dev.idx, false, function () {
                render(me);
              });
            }
          });
        });
      });
      render(me);
    },
    refresh: function (me) {
      if (remoteBase(me.block)) refreshRemote(me);
      else render(me);
    },
    // Exposed for the tests.
    render: render,
    appliances: appliances,
    remoteBase: remoteBase,
    homeconnectHtml: homeconnectHtml,
    remainingMinutes: remainingMinutes,
    finishTime: finishTime,
    alertText: alertText,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function tr(key, fallback) {
    return esc(DT_function.t(key, fallback));
  }

  function two(number) {
    return ('0' + number).slice(-2);
  }

  // The data of a device as text, without html tags.
  function dataOf(dev) {
    if (!dev) return '';
    var raw = dev.Data !== undefined && dev.Data !== '' ? dev.Data : dev.Status;
    return String(raw === undefined || raw === null ? '' : raw)
      .replace(/<[^>]*>/g, ' ')
      .trim();
  }

  // The minutes in a remaining time: a number ('45', '45 min') or text like
  // '1h 20min'. null when unknown.
  function remainingMinutes(text) {
    text = String(text === undefined || text === null ? '' : text).trim();
    var hours = text.match(/(\d+)\s*h/i);
    var minutes = text.match(/(\d+)\s*min/i);
    if (hours || minutes)
      return (
        (hours ? parseInt(hours[1], 10) * 60 : 0) +
        (minutes ? parseInt(minutes[1], 10) : 0)
      );
    var plain = text.match(/^(\d+)(?:[.,]\d+)?$/);
    return plain ? parseInt(plain[1], 10) : null;
  }

  // HH:MM of now + the remaining time, or '' when unknown.
  function finishTime(text, now) {
    var minutes = remainingMinutes(text);
    if (minutes === null) return '';
    var date = new Date((now || Date.now()) + minutes * 60000);
    return two(date.getHours()) + ':' + two(date.getMinutes());
  }

  // The text of an alert device, or '' when there is nothing to report.
  function alertText(dev) {
    var text = dataOf(dev);
    return NO_ALERT.test(text.replace(/\.$/, '')) ? '' : text;
  }

  function isOff(dev) {
    var state = String(dev && dev.Status).toLowerCase();
    return state === 'off' || state === 'closed';
  }

  function cleanName(name) {
    return String(name || '')
      .replace(/^\$/, '')
      .replace(/^home\s*connect\s*[-:]*\s*/i, '');
  }

  // The name of an appliance and the value a device shows, from the device
  // name: 'Washer Progress' -> {appliance: 'Washer', field: 'progress'}.
  function classify(name) {
    name = cleanName(name);
    for (var i = 0; i < FIELDS.length; i++) {
      var match = name.match(SUFFIXES[FIELDS[i]]);
      if (match && match[1]) return { appliance: match[1], field: FIELDS[i] };
    }
    return null;
  }

  // Whether a device is a message of an appliance (an alert that is no status).
  function isMessage(dev) {
    var name = cleanName(dev.Name);
    if (NOT_A_MESSAGE.test(name)) return false;
    return ALERT_NAME.test(name) || dev.SubType === 'Alert';
  }

  function iconOf(name) {
    for (var i = 0; i < ICONS.length; i++)
      if (ICONS[i][0].test(name)) return ICONS[i][1];
    return DEFAULT_ICON;
  }

  // A name for comparing: lower case, without spaces, '_' and '-', so that
  // 'Home Connect' also finds 'HomeConnect_API'.
  function plain(name) {
    return String(name || '')
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
  }

  // The devices of the plugin. With hchardware filled in the hardware name must
  // be exactly that name (spelling, capitals and spaces); without it the name
  // of the hardware must look like 'Home Connect'.
  function hardwareFilter(block) {
    var exact = String((block && block.hchardware) || '').trim();
    if (exact)
      return function (dev) {
        return String(dev.HardwareName || '').trim() === exact;
      };
    var part = plain('Home Connect');
    return function (dev) {
      return plain(dev.HardwareName).indexOf(part) >= 0;
    };
  }

  // The appliances of a list of devices, by the names of the devices.
  function fromDevices(devices) {
    var found = {};
    var order = [];
    function entry(name) {
      if (!found[name]) {
        found[name] = { name: name, icon: iconOf(name), alerts: [] };
        order.push(name);
      }
      return found[name];
    }
    devices.forEach(function (dev) {
      var info = classify(dev.Name);
      if (info && !entry(info.appliance)[info.field])
        found[info.appliance][info.field] = dev;
    });
    // A message belongs to the appliance whose name starts its own name.
    devices.forEach(function (dev) {
      if (!isMessage(dev)) return;
      var name = cleanName(dev.Name);
      var owner = order
        .filter(function (app) {
          return name.indexOf(app + ' ') === 0;
        })
        .sort(function (x, y) {
          return y.length - x.length;
        })[0];
      if (owner) found[owner].alerts.push(dev);
    });
    return { found: found, order: order, entry: entry };
  }

  // [{name, icon, power, progress, time, alerts}, ...]: the appliances found by
  // the names of the devices, plus the ones (or fields) set with hcdevices.
  function appliances(block, devices) {
    var all =
      devices ||
      (typeof Domoticz !== 'undefined' && Domoticz.getAllDevices()) ||
      {};
    var list = Object.keys(all)
      .map(function (idx) {
        return all[idx];
      })
      .filter(function (dev) {
        return dev && dev.idx !== undefined;
      });
    var result = fromDevices(list.filter(hardwareFilter(block)));
    var found = result.found;
    var order = result.order;
    var configured = (block && block.hcdevices) || {};
    Object.keys(configured).forEach(function (name) {
      var item = configured[name] || {};
      var app = result.entry(name);
      FIELDS.forEach(function (field) {
        var dev = all[parseInt(item[field], 10)];
        if (dev) app[field] = dev;
      });
      var alert = all[parseInt(item.alert, 10)];
      if (alert) app.alerts = [alert];
      if (item.name) app.name = String(item.name);
      if (item.icon) app.icon = String(item.icon);
    });
    var excluded = String((block && block.hcexclude) || '')
      .toLowerCase()
      .split(',')
      .map(function (part) {
        return part.trim();
      });
    return order
      .map(function (name) {
        return found[name];
      })
      .filter(function (app) {
        return excluded.indexOf(app.name.toLowerCase()) < 0;
      });
  }

  // An icon key of GLYPHS becomes an svg, anything else is a Font Awesome class.
  function iconHtml(icon) {
    if (GLYPHS[icon])
      return (
        '<svg class="homeconnect-icon homeconnect-icon-' +
        icon +
        '" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
        'stroke-linejoin="round" aria-hidden="true">' +
        GLYPHS[icon] +
        '</svg>'
      );
    return '<i class="' + esc(icon) + '" aria-hidden="true"></i>';
  }

  function nameHtml(app) {
    return (
      '<span class="homeconnect-name">' +
      iconHtml(app.icon) +
      ' ' +
      esc(app.name) +
      '</span>'
    );
  }

  // A small progress bar, then the percentage. The bar is drawn in the colour
  // of the appliance icon (.homeconnect-icon-<type>), on one line with the text.
  function barHtml(app, pct) {
    var level = Math.max(0, Math.min(100, Math.round(pct)));
    return (
      '<span class="homeconnect-bar homeconnect-icon-' +
      (GLYPHS[app.icon] ? app.icon : 'plug') +
      '" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      level +
      '"><span class="homeconnect-bar-fill" style="width:' +
      level +
      '%"></span></span><b class="homeconnect-pct">' +
      level +
      '%</b> '
    );
  }

  function row(app, value, extraClass, title) {
    return (
      '<div class="homeconnect-row">' +
      nameHtml(app) +
      '<span class="homeconnect-value' +
      (extraClass ? ' ' + extraClass : '') +
      '"' +
      (title ? ' title="' + title + '"' : '') +
      '>' +
      value +
      '</span></div>'
    );
  }

  // The messages of an appliance, without the ones that mean nothing, each
  // once. The plugin's Notifications / Meldingen device already lists every
  // open message (most serious first), so when it is there the per-message
  // devices ("$" devices, read with use_hidden) are not added again. A status
  // that needs attention leads: 'Actie vereist: lekbak vol (+2)' becomes
  // 'Actie vereist: Lekbak vol, Waterreservoir leeg' instead of naming the
  // first message twice.
  function warningText(app) {
    var summary = app.alerts.filter(function (dev) {
      return ALERT_NAME.test(cleanName(dev.Name));
    });
    var seen = {};
    var messages = [];
    (summary.length ? summary : app.alerts)
      .map(alertText)
      .filter(Boolean)
      .forEach(function (text) {
        text.split(/\s*,\s*/).forEach(function (part) {
          var key = part.toLowerCase();
          if (part && !seen[key]) {
            seen[key] = true;
            messages.push(part);
          }
        });
      });
    var status = isOff(app.power) ? '' : dataOf(app.state);
    if (!STATE_WARNING.test(status)) return messages.join(', ');
    if (!messages.length) return status;
    var colon = status.indexOf(':');
    return colon >= 0
      ? status.slice(0, colon) + ': ' + messages.join(', ')
      : status + ', ' + messages.join(', ');
  }

  // Whether the status of the appliance says that the program has finished
  // ('Klaar, Katoen', 'Finished').
  function isFinished(app) {
    return /^(klaar|finished)\b/i.test(dataOf(app.state));
  }

  // The progress and the time the program is ready, from the text of the
  // status: 'Bezig, Katoen, 40%, klaar om ongeveer 16:03'. Used when the
  // appliance has no Progress or Remaining time device (the plugin creates
  // those only while a program runs).
  function stateInfo(app) {
    var text = dataOf(app.state);
    var pct = text.match(/(\d+)\s*%/);
    var ready = text.match(
      /(?:klaar om|ready at)\s+(?:ongeveer\s+|about\s+)?(\d{1,2}):(\d{2})/i
    );
    return {
      pct: pct ? parseInt(pct[1], 10) : null,
      ready: ready ? two(parseInt(ready[1], 10)) + ':' + ready[2] : '',
    };
  }

  // The rows of one appliance: the progress while a program runs, and its
  // warnings. An appliance that is switched off (a coffee machine in stand-by)
  // still shows its open messages, such as a full drip tray; nothing for one
  // that is off or idle without messages.
  function rowsHtml(app, now) {
    if (app.power ? false : !app.progress && !app.state && !app.alerts.length)
      return '';
    if (app.power && isOff(app.power)) {
      var open = warningText(app);
      return open ? row(app, esc(open), 'homeconnect-warning') : '';
    }
    var html = '';
    var progress = app.progress
      ? parseFloat(dataOf(app.progress).replace(',', '.')) || 0
      : 0;
    var minutes = app.progress ? remainingMinutes(dataOf(app.time)) : null;
    if (progress >= 100 || isFinished(app))
      html += row(
        app,
        '&#10004;',
        'homeconnect-done',
        tr('homeconnect_done', 'Finished')
      );
    else if (app.progress && (progress > 0 || minutes > 0)) {
      // The time in the status text (the plugin knows about a delayed start),
      // else now + the remaining time.
      var ready =
        (app.state ? stateInfo(app).ready : '') ||
        finishTime(dataOf(app.time), now);
      html += row(
        app,
        barHtml(app, progress) +
          (ready
            ? tr('homeconnect_ready_at', 'ready at') + ' ' + ready
            : tr('homeconnect_unknown_time', 'time unknown'))
      );
    } else if (!app.progress && app.state) {
      var info = stateInfo(app);
      if (info.pct !== null || info.ready)
        html += row(
          app,
          (info.pct !== null ? barHtml(app, info.pct) : '') +
            (info.ready
              ? tr('homeconnect_ready_at', 'ready at') + ' ' + info.ready
              : '')
        );
    }
    var warning = warningText(app);
    if (warning) html += row(app, esc(warning), 'homeconnect-warning');
    return html;
  }

  // The test view: the hardware names in Domoticz and, per appliance, the
  // devices that were found (idx, name and data).
  function debugHtml(block, devices) {
    var all =
      devices ||
      (typeof Domoticz !== 'undefined' && Domoticz.getAllDevices()) ||
      {};
    var hardware = {};
    Object.keys(all).forEach(function (idx) {
      var name = all[idx] && all[idx].HardwareName;
      if (name) hardware[name] = true;
    });
    function line(label, dev) {
      return dev
        ? '<div>' +
            esc(
              label + ': ' + dev.Name + ' [' + dev.idx + '] = ' + dataOf(dev)
            ) +
            '</div>'
        : '';
    }
    var html =
      '<div class="homeconnect-debug"><div>Hardware: ' +
      esc(Object.keys(hardware).join(' | ')) +
      '</div>';
    appliances(block, devices).forEach(function (app) {
      html += '<div><b>' + esc(app.name) + '</b></div>';
      FIELDS.forEach(function (field) {
        html += line(field, app[field]);
      });
      app.alerts.forEach(function (dev) {
        html += line('alert', dev);
      });
    });
    return html + '</div>';
  }

  // The content of the tile: one row per appliance that has something to show.
  function homeconnectHtml(block, now, devices) {
    var html = appliances(block, devices)
      .map(function (app) {
        return rowsHtml(app, now);
      })
      .join('');
    return (
      (html ||
        '<div class="homeconnect-empty">' +
          tr('homeconnect_none', 'No active appliances') +
          '</div>') +
      (String(block && block.hcdebug).toLowerCase() === 'true'
        ? debugHtml(block, devices)
        : '')
    );
  }

  // The address of another Domoticz, 'http://ip:port', or '' for the Domoticz
  // of the dashboard. hcip may be an IP address, a host or a complete address.
  function remoteBase(block) {
    var host = String((block && block.hcip) || '')
      .trim()
      .replace(/\/+$/, '');
    if (!host) return '';
    var port = parseInt(block.hcport, 10);
    if (/^https?:\/\//i.test(host)) return host;
    return 'http://' + host + ':' + (port > 0 && port < 65536 ? port : 8080);
  }

  // Read the devices of the other Domoticz and draw the tile.
  function refreshRemote(me) {
    var base = remoteBase(me.block);
    $.getJSON(
      base + '/json.htm?type=command&param=getdevices&filter=all&used=true'
    ).then(
      function (res) {
        var devices = {};
        ((res && res.result) || []).forEach(function (dev) {
          devices[dev.idx] = dev;
        });
        me.remoteDevices = devices;
        me.remoteError = '';
        render(me);
      },
      function () {
        me.remoteError = base;
        render(me);
      }
    );
  }

  function render(me) {
    var fontSize = parseInt(me.block.hcfontsize, 10);
    me.$mountPoint
      .find('.dt_state')
      .css('font-size', fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : '')
      .html(
        '<div class="homeconnect-content">' +
          (me.remoteError
            ? '<div class="homeconnect-warning">' +
              tr('homeconnect_unreachable', 'Unable to reach Domoticz at') +
              ' ' +
              esc(me.remoteError) +
              '</div>'
            : homeconnectHtml(
                me.block,
                undefined,
                me.remoteDevices || (remoteBase(me.block) ? {} : undefined)
              )) +
          '</div>'
      );
  }
})();

Dashticz.register(DT_homeconnect);
