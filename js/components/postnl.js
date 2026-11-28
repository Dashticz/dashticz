/* global Dashticz DT_function settings language moment */
//# sourceURL=js/components/postnl.js
/* PostNL widget: shows incoming and sent PostNL shipments (Track & Trace),
 * fetched through vendor/dashticz/postnl/index.php - a same-origin PHP
 * bridge that performs PostNL's own (unofficial, reverse-engineered) login
 * and GraphQL shipment lookup server-side, mirroring how the Lyrion Music
 * Server block (js/components/lms.js) never talks to its server directly
 * from the browser. The widget's own e-mail address/password/days-shown/
 * poll-interval are global settings (Settings -> Widgets -> PostNL, see
 * js/widgeteditor.js), not per-tile config - there is nothing to pick per
 * tile, same as Weather or Garbage.
 *
 * Incoming and sent shipments are shown in one list, each line with an
 * icon. Nothing is shown when there are no shipments - no
 * filler/placeholder text, by design. Status text and
 * date/time formatting happen here (not in the PHP backend) purely from the
 * raw {status, who, from, to, deliveryDate} fields it returns, so the
 * display always follows Dashticz's own active language automatically,
 * with no separate language setting of its own.
 *
 * DHL: when a My DHL account is set as well (dhl_username/dhl_password,
 * same Settings -> Widgets -> PostNL popup), its parcels come from a second
 * bridge, vendor/dashticz/dhl/index.php, in the same {incoming, sent} shape
 * and are merged into the same list. With both carriers configured, each
 * line names its carrier after the sender ("Coolblue (DHL)"). Either account
 * alone works too.
 *
 * DPD: the same for a myDPD account (dpd_username/dpd_password), through
 * vendor/dashticz/dpd/index.php ("Coolblue (DPD)"). UPS is not supported:
 * it has no consumer account feed that can be read without a browser login.
 */
var DT_postnl = (function () {
  return {
    name: 'postnl',
    init: function () {
      return DT_function.loadCSS('./js/components/postnl.css');
    },
    canHandle: function (block) {
      return !!(block && block.type === 'postnl');
    },
    defaultCfg: {
      width: 6,
      icon: 'fas fa-box',
      refresh: (parseInt(settings['postnl_pollminutes'], 10) || 60) * 60,
      containerClass: 'postnl-block',
    },
    // Mounting calls refresh() itself when block.refresh is set.
    run: function (me) {
      if (!me.block.refresh) refresh(me);
    },
    refresh: refresh,
  };

  function fontSize() {
    var size = parseInt(settings['postnl_fontsize'], 10);
    return size >= 8 && size <= 60 ? size : 14;
  }

  function showDelivered() {
    return parseInt(settings['postnl_showdelivered'], 10) !== 0;
  }

  // Optional per-part colors (Settings -> Widgets -> PostNL); empty = theme default.
  function colorStyle(key) {
    var c = settings['postnl_' + key + '_color'];
    return c && /^#[0-9a-f]{3,8}$/i.test(String(c))
      ? ' style="color:' + c + ' !important"'
      : '';
  }

  function part(cls, text) {
    return (
      '<span class="postnl-' +
      cls +
      '"' +
      colorStyle(cls) +
      '>' +
      text +
      '</span>'
    );
  }

  function statusLabel(status) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    return misc['postnl_status_' + String(status).toLowerCase()] || status;
  }

  function formatLine(entry, showCarrier) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    var who = DT_function.escapeHtml(
      entry.who || misc.postnl_unknown_sender || 'Unknown'
    );
    if (showCarrier && entry.carrier) who += ' (' + entry.carrier + ')';
    var label = statusLabel(entry.status);
    var date = '';
    var time = '';
    if (entry.status === 'Delivered' && entry.deliveryDate) {
      date = moment(entry.deliveryDate).format('DD/MM');
      time = moment(entry.deliveryDate).format('HH:mm');
    } else if (entry.from) {
      date = moment(entry.from).format('DD/MM');
      var timeFrom = moment(entry.from).format('HH:mm');
      var timeTo = entry.to ? moment(entry.to).format('HH:mm') : '';
      time = timeFrom && timeTo ? timeFrom + '-' + timeTo : timeFrom || timeTo;
    }
    var prefix = date ? part('date', '[' + date + ']') + ' ' : '';
    var suffix = time ? ' ' + part('time', time) : '';
    return prefix + part('text', who + ': ' + label) + suffix;
  }

  function useEmoji() {
    return settings['postnl_iconstyle'] === 'emoji';
  }

  // Delivered: open box / package; otherwise a delivery truck (incoming) or a
  // paper plane / outbox (sent). Emoji style keeps its own colors; Font Awesome icons are the
  // text size + 2px.
  function icon(item) {
    var delivered = item.entry.status === 'Delivered';
    if (useEmoji()) {
      if (delivered) return '📦';
      return item.role === 'in' ? '🚚' : '📤';
    }
    var cls = delivered
      ? 'fa-box-open'
      : item.role === 'in'
        ? 'fa-truck'
        : 'fa-paper-plane';
    return (
      '<i class="fas ' +
      cls +
      '" style="font-size:' +
      (fontSize() + 2) +
      'px" aria-hidden="true"></i>'
    );
  }

  function sortKey(entry) {
    var date = entry.status === 'Delivered' ? entry.deliveryDate : entry.from;
    return date ? moment(date).valueOf() : 8.64e15;
  }

  // One combined list, soonest first: each line gets an icon
  // (truck = incoming, paper plane = sent, open box = delivered).
  // results: one {carrier, res} per carrier that answered.
  function listHtml(results, showCarrier) {
    var entries = [];
    results.forEach(function (result) {
      var res = result.res;
      var tag = function (entry) {
        return $.extend({}, entry, { carrier: result.carrier });
      };
      entries = entries.concat(
        ((res && res.incoming) || []).map(function (entry) {
          return { role: 'in', entry: tag(entry) };
        }),
        ((res && res.sent) || []).map(function (entry) {
          return { role: 'out', entry: tag(entry) };
        })
      );
    });
    entries = entries
      .filter(function (item) {
        return showDelivered() || item.entry.status !== 'Delivered';
      })
      .sort(function (a, b) {
        return sortKey(a.entry) - sortKey(b.entry);
      });
    return entries
      .map(function (item) {
        return (
          '<div class="postnl-row' +
          (item.entry.status === 'Delivered' ? ' postnl-row-delivered' : '') +
          '">' +
          '<span class="postnl-icon postnl-icon-' +
          item.role +
          (useEmoji() ? ' postnl-icon-emoji' : '') +
          '" aria-hidden="true">' +
          icon(item) +
          '</span>' +
          '<span class="postnl-row-text">' +
          formatLine(item.entry, showCarrier) +
          '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  // The carriers with an account in the settings, each with its own bridge.
  function carriers() {
    var list = [];
    [
      { name: 'PostNL', prefix: 'postnl', bridge: 'postnl/index.php' },
      { name: 'DHL', prefix: 'dhl', bridge: 'dhl/index.php' },
      { name: 'DPD', prefix: 'dpd', bridge: 'dpd/index.php' },
    ].forEach(function (carrier) {
      var username = settings[carrier.prefix + '_username'] || '';
      var password = settings[carrier.prefix + '_password'] || '';
      if (username && password) {
        list.push(
          $.extend({ username: username, password: password }, carrier)
        );
      }
    });
    return list;
  }

  // Always resolves, to {carrier, res} or {carrier, error}, so one failing
  // carrier never hides the packages of the other.
  function fetchCarrier(carrier) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    var done = $.Deferred();
    DT_function.bridge(carrier.bridge, {
      username: carrier.username,
      password: carrier.password,
      days: parseInt(settings['postnl_days'], 10) || 2,
      pollMinutes: parseInt(settings['postnl_pollminutes'], 10) || 60,
    }).then(
      function (res) {
        done.resolve({ carrier: carrier.name, res: res });
      },
      function (jqXHR) {
        var fallbacks = {
          DHL: misc.postnl_dhl_error || 'Unable to fetch DHL shipments.',
          DPD: misc.postnl_dpd_error || 'Unable to fetch DPD shipments.',
        };
        var fallback =
          fallbacks[carrier.name] ||
          misc.postnl_error ||
          'Unable to fetch PostNL shipments.';
        done.resolve({
          carrier: carrier.name,
          error: DT_function.bridgeError(jqXHR, fallback),
        });
      }
    );
    return done.promise();
  }

  function refresh(me) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    me.$mountPoint.find('.dt_state').css('font-size', fontSize() + 'px');
    var active = carriers();
    if (!active.length) {
      me.$mountPoint
        .find('.dt_state')
        .html(
          '<div class="postnl-rows postnl-error">' +
            (misc.postnl_not_configured ||
              'Configure your PostNL, DHL and/or DPD account in Settings -> Widgets -> PostNL.') +
            '</div>'
        );
      return;
    }

    $.when.apply($, active.map(fetchCarrier)).then(function () {
      var results = Array.prototype.slice.call(arguments);
      var ok = results.filter(function (result) {
        return !result.error;
      });
      var showCarrier = active.length > 1;
      var errors = results
        .filter(function (result) {
          return result.error;
        })
        .map(function (result) {
          if (typeof Debug !== 'undefined' && Debug.widget) {
            Debug.widget(
              'PostNL',
              (showCarrier ? result.carrier + ': ' : '') + result.error,
              'error'
            );
          }
          return (
            '<div class="postnl-rows postnl-error">' +
            DT_function.escapeHtml(
              (showCarrier ? result.carrier + ': ' : '') + result.error
            ) +
            '</div>'
          );
        })
        .join('');
      var html = ok.length
        ? '<div class="postnl-rows">' + listHtml(ok, showCarrier) + '</div>'
        : '';
      me.$mountPoint.find('.dt_state').html(html + errors);
    });
  }
})();

Dashticz.register(DT_postnl);
