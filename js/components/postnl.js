/* global Dashticz settings language moment */
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
 */
var DT_postnl = (function () {
  return {
    name: 'postnl',
    canHandle: function (block) {
      return !!(block && block.type === 'postnl');
    },
    defaultCfg: {
      width: 6,
      icon: 'fas fa-box',
      refresh: (parseInt(settings['postnl_pollminutes'], 10) || 60) * 60,
      containerClass: 'postnl-block',
    },
    run: function (me) {
      refresh(me);
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

  function formatLine(entry) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    var who = entry.who || misc.postnl_unknown_sender || 'Unknown';
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
  function listHtml(res) {
    var entries = []
      .concat(
        ((res && res.incoming) || []).map(function (entry) {
          return { role: 'in', entry: entry };
        }),
        ((res && res.sent) || []).map(function (entry) {
          return { role: 'out', entry: entry };
        })
      )
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
          formatLine(item.entry) +
          '</span>' +
          '</div>'
        );
      })
      .join('');
  }

  function refresh(me) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    me.$mountPoint.find('.dt_state').css('font-size', fontSize() + 'px');
    var username = settings['postnl_username'] || '';
    var password = settings['postnl_password'] || '';
    if (!username || !password) {
      me.$mountPoint
        .find('.dt_state')
        .html(
          '<div class="postnl-rows postnl-error">' +
            (misc.postnl_not_configured ||
              'Configure your PostNL account in Settings -> Widgets -> PostNL.') +
            '</div>'
        );
      return;
    }

    $.ajax({
      url: settings['dashticz_php_path'] + 'postnl/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        username: username,
        password: password,
        days: parseInt(settings['postnl_days'], 10) || 2,
        pollMinutes: parseInt(settings['postnl_pollminutes'], 10) || 60,
      }),
    }).then(
      function (res) {
        var html = listHtml(res);
        me.$mountPoint
          .find('.dt_state')
          .html('<div class="postnl-rows">' + html + '</div>');
      },
      function (jqXHR) {
        var errorMessage =
          (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error) ||
          misc.postnl_error ||
          'Unable to fetch PostNL shipments.';
        me.$mountPoint
          .find('.dt_state')
          .html(
            '<div class="postnl-rows postnl-error">' + errorMessage + '</div>'
          );
      }
    );
  }
})();

Dashticz.register(DT_postnl);
