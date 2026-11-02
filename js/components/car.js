/* global Dashticz DT_function Domoticz language */
//# sourceURL=js/components/car.js
/* Car info widget: one tile for one car. The block (dispatched on carmode,
 * added with the Widgets menu's Car info card) has the Domoticz devices to
 * show, as the idx of each device:
 *   carfl, carfr, carrl, carrr   the tyre pressure sensors (front/rear, left/right)
 *   carsoc                       the battery level (state of charge)
 *   carrange                     the remaining range
 *   carcharging                  the charging state
 *   carlock                      the door lock
 *   cardoors                     the doors (open/closed)
 *   carwindows                   the windows (open/closed)
 *   carimage                     an own picture of the car, as chosen in the
 *                                image picker (img/custom/...)
 * Every device is optional; only the configured ones are drawn. Everything is
 * drawn on the picture of the car, seen from above with the front to the left:
 * the tyre pressures at the wheels, the battery and range on the bonnet, the
 * doors and windows on the roof and the lock at the rear. Without an own
 * picture a simple drawing of a car is used. For another car, add another tile.
 */
var DT_car = (function () {
  var TYRES = ['fl', 'fr', 'rl', 'rr'];
  var KEYS = TYRES.concat([
    'soc',
    'range',
    'charging',
    'lock',
    'doors',
    'windows',
  ]);
  // Pressure (bar) below which a tyre is orange, respectively red.
  var WARN_BAR = 2.2;
  var LOW_BAR = 2.0;
  // The aspect ratio (width / height) of the pictures that have been loaded.
  var ratios = {};
  // The part of each picture that is not empty (white or transparent):
  // {x, y, w, h} as fractions of the picture, found when it has loaded.
  var crops = {};

  return {
    name: 'car',
    canHandle: function (block) {
      return !!(block && block.carmode === 'info');
    },
    defaultCfg: {
      width: 6,
      icon: 'fas fa-car',
      containerClass: 'car-block',
      template: 1,
    },
    run: function (me) {
      allIdx(car(me)).forEach(function (idx) {
        Dashticz.subscribeDevice(me, idx, false, function () {
          render(me);
        });
      });
      render(me);
    },
    refresh: render,
    // Exposed for the tests.
    render: render,
    parsePressure: parsePressure,
    tyreLevel: tyreLevel,
    parsePercentage: parsePercentage,
    isClosed: isClosed,
    imageUrl: imageUrl,
  };

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function label(key, fallback) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    return misc['car_' + key] || fallback;
  }

  // The devices of this block: {fl: '12', soc: '15', ...}.
  function car(me) {
    var result = {};
    KEYS.forEach(function (key) {
      result[key] = me.block['car' + key];
    });
    return result;
  }

  function validIdx(value) {
    return /^\d+$/.test(String(value === undefined ? '' : value))
      ? String(value)
      : '';
  }

  function allIdx(car) {
    return KEYS.map(function (key) {
      return validIdx(car[key]);
    }).filter(Boolean);
  }

  function device(car, key) {
    var idx = validIdx(car[key]);
    if (!idx || typeof Domoticz === 'undefined') return null;
    return Domoticz.getAllDevices(idx) || null;
  }

  function text(dev) {
    return dev ? String(dev.Data || dev.Status || '') : '';
  }

  // The picture chosen in the image picker ('custom/car.png' -> img/custom/..).
  function imageUrl(value) {
    var path = String(value === undefined ? '' : value);
    if (!/^[A-Za-z0-9 _.\/-]{1,100}$/.test(path) || path.indexOf('..') >= 0)
      return '';
    return 'img/' + encodeURI(path);
  }

  // "2.4 bar" -> 2.4; null when there is no number.
  function parsePressure(dev) {
    var match = /(-?\d+(?:[.,]\d+)?)/.exec(String((dev && dev.Data) || ''));
    return match ? parseFloat(match[1].replace(',', '.')) : null;
  }

  function parsePercentage(dev) {
    var value = parsePressure(dev);
    return value === null ? null : Math.max(0, Math.min(100, value));
  }

  function tyreLevel(bar) {
    if (bar === null) return 'na';
    return bar < LOW_BAR ? 'low' : bar < WARN_BAR ? 'warn' : 'ok';
  }

  // Closed / locked: true, open / unlocked: false, no text: null.
  function isClosed(value) {
    var s = String(value || '');
    if (!s) return null;
    if (/unlock|ontgrendel|open|off|uit/i.test(s) && !/closed/i.test(s))
      return false;
    return /clos|lock|gesloten|dicht|vergrendel|secure|\bon\b|aan/i.test(s);
  }

  function tyreHtml(car, pos) {
    if (!validIdx(car[pos])) return '';
    var bar = parsePressure(device(car, pos));
    var value = bar === null ? '-' : bar.toFixed(1);
    return (
      '<span class="car-tyre car-tyre-' +
      pos +
      ' car-tyre-' +
      tyreLevel(bar) +
      '"><span class="car-tyre-value">' +
      esc(value) +
      '</span><span class="car-tyre-unit">bar</span></span>'
    );
  }

  // A simple car seen from above, front to the left, 3:2.
  function carSvg() {
    return (
      '<svg class="car-svg" viewBox="5 20 290 160" aria-hidden="true">' +
      '<g transform="translate(300 0) scale(-1 1)">' +
      '<rect class="car-wheel" x="196" y="22" width="62" height="26" rx="8"/>' +
      '<rect class="car-wheel" x="196" y="152" width="62" height="26" rx="8"/>' +
      '<rect class="car-wheel" x="52" y="22" width="62" height="26" rx="8"/>' +
      '<rect class="car-wheel" x="52" y="152" width="62" height="26" rx="8"/>' +
      '<path class="car-body" d="M290 100 C290 148 266 164 224 166 L124 168 L90 168 L48 166 C20 164 10 140 10 100 C10 60 20 36 48 34 L90 32 L124 32 L224 34 C266 36 290 52 290 100 Z"/>' +
      '<path class="car-glass" d="M232 56 L232 144 L204 138 L204 62 Z"/>' +
      '<path class="car-glass" d="M66 62 L66 138 L40 134 L40 66 Z"/>' +
      '<rect class="car-roof" x="84" y="62" width="106" height="76" rx="10"/>' +
      '</g></svg>'
    );
  }

  function chipHtml(car, key, icons) {
    if (!validIdx(car[key])) return '';
    var value = text(device(car, key));
    var closed = isClosed(value);
    var state = closed === null ? 'na' : closed ? 'ok' : 'warn';
    return (
      '<span class="car-chip car-' +
      key +
      ' car-chip-' +
      state +
      '" title="' +
      esc(label(key, key)) +
      '"><i class="fas ' +
      icons[state === 'warn' ? 1 : 0] +
      '" aria-hidden="true"></i>' +
      (key === 'lock' ? '' : '<span>' + esc(value || '-') + '</span>') +
      '</span>'
    );
  }

  // Battery level (with bar) and range, on the bonnet.
  function engineHtml(car) {
    var parts = '';
    if (validIdx(car.soc)) {
      var dev = device(car, 'soc');
      var percentage = parsePercentage(dev);
      parts +=
        '<span class="car-soc" title="' +
        esc(label('soc', 'Battery')) +
        '">' +
        esc(text(dev) || '-') +
        '</span>' +
        (percentage === null
          ? ''
          : '<span class="car-bar"><span class="car-bar-fill" style="width:' +
            percentage +
            '%"></span></span>');
    }
    if (validIdx(car.range)) {
      parts +=
        '<span class="car-range" title="' +
        esc(label('range', 'Range')) +
        '">' +
        esc(text(device(car, 'range')) || '-') +
        '</span>';
    }
    return parts ? '<div class="car-engine">' + parts + '</div>' : '';
  }

  // The plug at the right rear of the car: green while charging.
  function chargingHtml(car) {
    if (!validIdx(car.charging)) return '';
    var value = text(device(car, 'charging'));
    var on =
      /charging|laden|^on$|^aan$/i.test(value) && !/not|off|stop/i.test(value);
    return (
      '<span class="car-chip car-charging car-chip-' +
      (on ? 'ok' : 'na') +
      '" title="' +
      esc(label('charging', 'Charging') + ': ' + (value || '-')) +
      '"><i class="fas fa-plug" aria-hidden="true"></i></span>'
    );
  }

  function figureHtml(car, src) {
    var ratio = ratios[src] || (src ? 1.6 : 290 / 160);
    return (
      '<div class="car-figure" style="--car-ar:' +
      ratio +
      '">' +
      (src
        ? '<img class="car-img" alt="" src="' +
          esc(src) +
          '"' +
          cropStyle(crops[src]) +
          '>'
        : carSvg()) +
      TYRES.map(function (pos) {
        return tyreHtml(car, pos);
      }).join('') +
      engineHtml(car) +
      chargingHtml(car) +
      '<div class="car-cabin">' +
      chipHtml(car, 'doors', ['fa-door-closed', 'fa-door-open']) +
      chipHtml(car, 'windows', ['fa-window-maximize', 'fa-window-restore']) +
      '</div>' +
      chipHtml(car, 'lock', ['fa-lock', 'fa-lock-open']) +
      '</div>'
    );
  }

  // The picture is drawn larger than the figure, so that only the car is seen.
  function cropStyle(crop) {
    if (!crop) return '';
    return (
      ' style="width:' +
      100 / crop.w +
      '%;height:' +
      100 / crop.h +
      '%;left:' +
      (-crop.x * 100) / crop.w +
      '%;top:' +
      (-crop.y * 100) / crop.h +
      '%"'
    );
  }

  // The bounding box of everything that is neither transparent nor white.
  function findCrop(img) {
    try {
      var scale = Math.min(1, 300 / img.naturalWidth);
      var w = Math.max(1, Math.round(img.naturalWidth * scale));
      var h = Math.max(1, Math.round(img.naturalHeight * scale));
      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      var data = ctx.getImageData(0, 0, w, h).data;
      var x0 = w;
      var y0 = h;
      var x1 = -1;
      var y1 = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = (y * w + x) * 4;
          var empty =
            data[i + 3] < 24 ||
            (data[i] > 238 && data[i + 1] > 238 && data[i + 2] > 238);
          if (!empty) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      if (x1 < x0 || y1 < y0) return null;
      var pad = 0.01;
      var fx0 = Math.max(0, x0 / w - pad);
      var fy0 = Math.max(0, y0 / h - pad);
      var fx1 = Math.min(1, (x1 + 1) / w + pad);
      var fy1 = Math.min(1, (y1 + 1) / h + pad);
      return { x: fx0, y: fy0, w: fx1 - fx0, h: fy1 - fy0 };
    } catch (e) {
      return null; // no canvas, or a picture of another origin: no cropping
    }
  }

  function render(me) {
    var devices = car(me);
    var $state = me.$mountPoint.find('.dt_state');
    var src = imageUrl(me.block.carimage);
    if (!allIdx(devices).length && !src) {
      $state.html(
        '<div class="car-empty">' +
          esc(
            label(
              'not_configured',
              'Choose the devices of the car in the tile settings.'
            )
          ) +
          '</div>'
      );
      return;
    }
    $state.html(
      '<div class="car-widget">' + figureHtml(devices, src) + '</div>'
    );
    if (src && !ratios[src]) {
      // The figure takes the aspect ratio of the picture, so that the values
      // stay at the same place of the car whatever the size of the tile.
      $state.find('.car-img').on('load', function () {
        if (!this.naturalWidth || !this.naturalHeight) return;
        var crop = findCrop(this);
        var ratio = this.naturalWidth / this.naturalHeight;
        if (crop) ratio = (ratio * crop.w) / crop.h;
        ratios[src] = ratio;
        crops[src] = crop;
        $state.find('.car-figure').css('--car-ar', String(ratio));
        $state.find('.car-img').attr('style', cropStyle(crop).slice(8, -1));
      });
    }
  }
})();

Dashticz.register(DT_car);
