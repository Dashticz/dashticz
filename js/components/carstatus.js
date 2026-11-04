/* global Dashticz Domoticz DT_function */
//# sourceURL=js/components/carstatus.js
/* Car status widget: the status of a (BMW, MINI, ...) car, read from the Domoticz
 * devices that hold its data (dummy devices fed by the car integration). One
 * block shows one car; place the widget once per car.
 *
 * It is a repeatable block (Widgets -> Car status, multiple per screen), configured
 * per block, and dispatched on csmode ('status'). The block title is the name
 * of the car. Every option is the idx of a Domoticz device:
 *
 *   csdoor        door state: 'Open' (or On) = a door is open
 *   cswindows     window state: 'Open' (or On) = a window is open
 *   csmileage     mileage (km)
 *   cscharging    charging: On while the car charges
 *   cschargetime  minutes until the car is charged
 *   csbattery     battery level (%)
 *   csdriving     On while the car is driving
 *   cshome        On while the car is at home
 *   cscritical    below this level (%) the battery blinks red; default 15
 *   cslow         below this level (%) the battery is red; default 30
 *   csmid         below this level (%) the battery is orange; default 50
 *   csdebug       test view: the state of every device below the status
 *   csfontsize    optional font size in px (8-60); empty = the theme's
 *
 * What the tile shows:
 *
 *   driving        "On the road", with the battery level and mileage
 *   at home        the battery level and mileage; while charging "Charging
 *                  until HH:MM" (now + the charge minutes); a warning for an
 *                  open door or window
 *   not at home    "Not home", or "Car is not home" plus the warning when a
 *                  door or window is open
 *
 * The battery level is a progress bar like the one of the Mower widget. The
 * colour follows the level: below cscritical (15%) blinking red, below cslow
 * (30%) red, below csmid (50%) orange, from there the green bar of the mower
 * with a white percentage, and 100% a light green percentage.
 */
var DT_carstatus = (function () {
  var IDX_FIELDS = [
    'door',
    'windows',
    'mileage',
    'charging',
    'chargetime',
    'battery',
    'driving',
    'home',
  ];

  return {
    name: 'carstatus',
    canHandle: function (block) {
      return !!(block && block.csmode === 'status');
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-car',
      // The clock time of "Charging until" moves along every minute.
      refresh: 60,
      containerClass: 'carstatus-block dt-widget-rows',
      template: 1,
    },
    run: function (me) {
      IDX_FIELDS.forEach(function (field) {
        var idx = deviceIdx(me.block, field);
        if (idx) {
          Dashticz.subscribeDevice(me, idx, false, function () {
            render(me);
          });
        }
      });
    },
    refresh: render,
    // Exposed for the tests.
    render: render,
    carstatusHtml: carstatusHtml,
    batteryClass: batteryClass,
    limitsOf: limitsOf,
    timePlus: timePlus,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function tr(key, fallback) {
    return esc(DT_function.t(key, fallback));
  }

  function deviceIdx(block, field) {
    var idx = parseInt(block['cs' + field], 10);
    return idx > 0 ? String(idx) : '';
  }

  function device(block, field) {
    var idx = deviceIdx(block, field);
    return idx ? Domoticz.getAllDevices()[idx] : null;
  }

  // The state text of a device in lower case ('on', 'open', ...), or ''.
  function stateOf(block, field) {
    var dev = device(block, field);
    if (!dev) return '';
    var raw =
      dev.Status !== undefined && dev.Status !== '' ? dev.Status : dev.Data;
    return String(raw === undefined || raw === null ? '' : raw)
      .trim()
      .toLowerCase();
  }

  // The number in the data of a device ('87 %', '12345 km'), 0 when unknown.
  function numberOf(block, field) {
    var dev = device(block, field);
    if (!dev) return 0;
    var number = parseFloat(String(dev.Data).replace(',', '.'));
    return isNaN(number) ? 0 : number;
  }

  function isOn(state) {
    return state === 'on' || state === 'true' || state === '1';
  }

  function isOpen(state) {
    return state === 'open' || isOn(state);
  }

  // HH:MM of now + minutes.
  function timePlus(minutes, now) {
    var date = new Date((now || Date.now()) + minutes * 60000);
    return (
      ('0' + date.getHours()).slice(-2) +
      ':' +
      ('0' + date.getMinutes()).slice(-2)
    );
  }

  // The levels (%) below which the battery turns blinking red (critical), red
  // (low) and orange (mid): cscritical (15), cslow (30) and csmid (50).
  function limitsOf(block) {
    var limit = function (field, fallback) {
      var value = parseFloat(block && block[field]);
      return isNaN(value) ? fallback : Math.max(0, Math.min(100, value));
    };
    return {
      critical: limit('cscritical', 15),
      low: limit('cslow', 30),
      mid: limit('csmid', 50),
    };
  }

  // The colour class of a battery level.
  function batteryClass(pct, limits) {
    var l = limits || limitsOf(null);
    if (pct > 99) return 'carstatus-batt-full';
    if (pct < l.critical) return 'carstatus-batt-critical';
    if (pct < l.low) return 'carstatus-batt-low';
    if (pct < l.mid) return 'carstatus-batt-mid';
    return 'carstatus-batt-ok';
  }

  function batteryLevel(pct) {
    return Math.max(0, Math.min(100, Math.round(pct)));
  }

  // The battery icon that fits a battery level.
  function batteryIcon(pct) {
    if (pct >= 90) return 'fa-battery-full';
    if (pct >= 65) return 'fa-battery-three-quarters';
    if (pct >= 35) return 'fa-battery-half';
    if (pct >= 10) return 'fa-battery-quarter';
    return 'fa-battery-empty';
  }

  // The battery percentage with a battery icon and the mileage with a plug
  // icon.
  function batteryTextHtml(pct, mileage, limits) {
    return (
      '<div class="carstatus-battery-text ' +
      batteryClass(batteryLevel(pct), limits) +
      '"><span class="carstatus-pct"><i class="fas ' +
      batteryIcon(batteryLevel(pct)) +
      ' carstatus-icon" aria-hidden="true"></i>' +
      batteryLevel(pct) +
      '%</span><span class="carstatus-km"><i class="fas fa-plug carstatus-icon" aria-hidden="true"></i>' +
      esc(Math.round(mileage)) +
      ' km</span></div>'
    );
  }

  // The battery: the percentage at the start and the mileage at the end of
  // the progress bar, above it. Empty when the battery is shown next to the
  // icon (see render()).
  function batteryHtml(pct, mileage, charging, inHeader, limits) {
    if (inHeader) return '';
    return fullBatteryHtml(pct, mileage, charging, limits);
  }

  function fullBatteryHtml(pct, mileage, charging, limits) {
    var level = batteryLevel(pct);
    return (
      '<div class="carstatus-battery ' +
      batteryClass(level, limits) +
      (charging ? ' carstatus-charging' : '') +
      '">' +
      batteryTextHtml(pct, mileage, limits) +
      '<div class="carstatus-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' +
      level +
      '"><span class="carstatus-bar-fill" style="width:' +
      level +
      '%"></span></div></div>'
    );
  }

  // One line of the part below the line: "Label: value". warning: yellow.
  function rowHtml(label, value, extraClass) {
    return (
      '<div class="carstatus-row"><span class="carstatus-label">' +
      label +
      ':</span> <b' +
      (extraClass ? ' class="' + extraClass + '"' : '') +
      '>' +
      value +
      '</b></div>'
    );
  }

  function stateWord(block, field) {
    var dev = device(block, field);
    if (!dev) return deviceIdx(block, field) ? '?' : '-';
    return isOpen(stateOf(block, field))
      ? tr('carstatus_open', 'Open')
      : tr('carstatus_closed', 'Closed');
  }

  // The part below the line: the status (Not home / On the road; nothing when
  // the car is at home), then "Charging until", "Doors" and "Windows". Those
  // show only when they apply, or always in the test view.
  function belowHtml(block, now) {
    var all = isOn(String(block.csdebug).toLowerCase());
    var minutes = numberOf(block, 'chargetime');
    var charging = isOn(stateOf(block, 'charging'));
    var doorOpen = isOpen(stateOf(block, 'door'));
    var windowOpen = isOpen(stateOf(block, 'windows'));
    var html = '';
    if (isOn(stateOf(block, 'driving'))) {
      html +=
        '<div class="carstatus-status carstatus-driving">' +
        tr('carstatus_driving', 'On the road') +
        '</div>';
    } else if (!isOn(stateOf(block, 'home'))) {
      html +=
        '<div class="carstatus-status carstatus-away">' +
        tr('carstatus_away', 'Not home') +
        '</div>';
    }
    var untilLabel = tr('carstatus_charging_until', 'Charging until');
    if (charging && minutes > 0) {
      html += rowHtml(
        untilLabel,
        timePlus(minutes, now),
        'carstatus-chargetime'
      );
    } else if (all) {
      html += rowHtml(untilLabel, '-');
    }
    if (doorOpen || all) {
      html += rowHtml(
        tr('carstatus_doors', 'Doors'),
        stateWord(block, 'door'),
        doorOpen ? 'carstatus-warning-text' : ''
      );
    }
    if (windowOpen || all) {
      html += rowHtml(
        tr('carstatus_windows', 'Windows'),
        stateWord(block, 'windows'),
        windowOpen ? 'carstatus-warning-text' : ''
      );
    }
    return html;
  }

  // Charging while driving does not exist; the test view always shows the glow.
  function isCharging(block) {
    return (
      (isOn(stateOf(block, 'charging')) && !isOn(stateOf(block, 'driving'))) ||
      isOn(String(block.csdebug).toLowerCase())
    );
  }

  function hasBattery(block) {
    return !!(deviceIdx(block, 'battery') || deviceIdx(block, 'mileage'));
  }

  // The content of the tile for the current device states: the battery (unless
  // it is shown next to the icon), a line, and the part below it.
  function carstatusHtml(block, now, batteryInHeader) {
    var charging = isCharging(block);
    return (
      (hasBattery(block)
        ? batteryHtml(
            numberOf(block, 'battery'),
            numberOf(block, 'mileage'),
            charging,
            batteryInHeader,
            limitsOf(block)
          )
        : '') +
      '<div class="carstatus-below">' +
      belowHtml(block, now) +
      '</div>'
    );
  }

  // Without a visible title the battery (text and bar) goes next to the icon.
  function render(me) {
    var block = me.block;
    var fontSize = parseInt(block.csfontsize, 10);
    var inHeader = (!block.title || !!block.hide_title) && hasBattery(block);
    var size = fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : '';
    var $header = me.$mountPoint.find('.dt_content');
    $header.find('.carstatus-headtext').remove();
    if (inHeader) {
      // The font size of the block also applies to the battery in the header.
      $header.append(
        '<div class="carstatus-headtext">' +
          fullBatteryHtml(
            numberOf(block, 'battery'),
            numberOf(block, 'mileage'),
            isCharging(block),
            limitsOf(block)
          ) +
          '</div>'
      );
      $header.find('.carstatus-headtext').css('font-size', size);
    }
    me.$mountPoint
      .find('.dt_state')
      .css('font-size', size)
      .html(
        '<div class="carstatus-content">' +
          carstatusHtml(block, undefined, inHeader) +
          '</div>'
      );
    sizeIcon(me);
    alignBelow(me);
  }

  // An image as icon: its smaller side gets the icon size of the theme
  // (--icon-image-size), the larger side follows, so a wide or tall logo is not
  // squeezed into the width of the icon column.
  function sizeIcon(me) {
    var root = me.$mountPoint && me.$mountPoint[0];
    if (!root || !root.querySelector || typeof window === 'undefined') return;
    var img = root.querySelector('.col-icon img.icon');
    if (!img) return;
    var apply = function () {
      var width = img.naturalWidth;
      var height = img.naturalHeight;
      if (!width || !height) return;
      var size =
        parseFloat(
          window.getComputedStyle(root).getPropertyValue('--icon-image-size')
        ) || 30;
      var wide = width >= height;
      var other = Math.round(
        wide ? (size * width) / height : (size * height) / width
      );
      img.style.setProperty('max-width', 'none', 'important');
      img.style.setProperty('max-height', 'none', 'important');
      img.style.setProperty('width', (wide ? other : size) + 'px', 'important');
      img.style.setProperty(
        'height',
        (wide ? size : other) + 'px',
        'important'
      );
      // The icon column grows with the image, so the battery next to it
      // does not run under it.
      var column = img.parentNode;
      column.style.setProperty(
        'width',
        (wide ? other : size) + 'px',
        'important'
      );
      alignBelow(me);
    };
    if (img.complete) apply();
    else img.addEventListener('load', apply);
  }

  // The text below the line starts at the left of the battery: with the
  // battery next to the icon (no title) it is indented by the width of the
  // icon column, measured from the page because the theme sets that width.
  function alignBelow(me) {
    var root = me.$mountPoint && me.$mountPoint[0];
    if (!root || !root.querySelector) return;
    var apply = function () {
      var below = root.querySelector('.carstatus-below');
      if (!below) return;
      below.style.setProperty('--carstatus-indent', '0px');
      // The bar itself: the box around it starts at the icon.
      var head = root.querySelector('.carstatus-headtext .carstatus-bar');
      if (!head) return;
      var delta = Math.round(
        head.getBoundingClientRect().left - below.getBoundingClientRect().left
      );
      if (delta > 0)
        below.style.setProperty('--carstatus-indent', delta + 'px');
    };
    apply();
    // Once more after the layout of the tile has settled.
    if (typeof window !== 'undefined' && window.requestAnimationFrame)
      window.requestAnimationFrame(apply);
  }
})();

Dashticz.register(DT_carstatus);
