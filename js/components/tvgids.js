/* global Dashticz settings language */
//# sourceURL=js/components/tvgids.js
/* TVgids widget: today's TV programme of the chosen channels, from
 * tvgids24.nl. The pages are read and cached by vendor/dashticz/tvgids/,
 * a same-origin PHP bridge like the F1 and PostNL widgets.
 *
 * It is a repeatable block (Widgets -> TVgids, multiple per screen),
 * configured per block, and dispatched on tvgids:
 *
 *   tvgids             the channels, comma separated, in the order they are
 *                      shown ('npo_1,rtl_4'); the ids are those of
 *                      vendor/dashticz/tvgids/channels.json
 *   tvgidsmaxitems     programmes per channel, from the one on air now
 *                      (default 10; 0 = the rest of the day)
 *   tvgidsshowpast     also show the programmes that have finished
 *   tvgidshidelogo     the channel name instead of its logo above a column
 *   tvgidscolumnwidth  minimum column width in px (default 250): the block
 *                      shows as many columns next to each other as fit, so
 *                      a wider block gets more columns
 *   tvgidslogobg       background of the frame around each logo: '#rrggbb' or
 *                      'transparent' (default '#ffffff')
 *   tvgidsfontsize     optional font size in px (8-60); empty = the theme's
 *   tvgidspollminutes  how often the bridge downloads a channel (default 60)
 *
 * The logos are in img/custom/tvgids/<channel>.png.
 */
var DT_tvgids = (function () {
  return {
    name: 'tvgids',
    canHandle: function (block) {
      return !!(block && typeof block.tvgids === 'string' && block.tvgids);
    },
    defaultCfg: {
      width: 12,
      icon: 'fas fa-tv',
      // Moves the "on air now" marker along; the bridge only downloads a
      // channel again after tvgidspollminutes.
      refresh: 300,
      containerClass: 'tvgids-block',
    },
    run: function (me) {
      refresh(me);
    },
    refresh: refresh,
    // Exposed for the tests.
    channelsHtml: channelsHtml,
  };

  function misc() {
    return (typeof language !== 'undefined' && language.misc) || {};
  }

  function esc(value) {
    return String(value === null || typeof value === 'undefined' ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function num(block, field, def, min, max) {
    var value = parseInt(block[field], 10);
    return isNaN(value) ? def : Math.min(max, Math.max(min, value));
  }

  function channelIds(block) {
    return String(block.tvgids || '')
      .split(',')
      .map(function (id) {
        return id.trim();
      })
      .filter(function (id) {
        return /^[a-z0-9_]{1,40}$/.test(id);
      });
  }

  function hhmm(timestamp) {
    var date = new Date(timestamp * 1000);
    return (
      ('0' + date.getHours()).slice(-2) +
      ':' +
      ('0' + date.getMinutes()).slice(-2)
    );
  }

  function isOn(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  // The programmes of one channel to show: from the one on air now (or all
  // of today with tvgidsshowpast), at most tvgidsmaxitems of them.
  function visibleProgrammes(block, programmes, now) {
    var maxItems = num(block, 'tvgidsmaxitems', 10, 0, 200);
    var showPast = isOn(block.tvgidsshowpast);
    var list = (programmes || []).filter(function (programme) {
      return showPast || programme.end > now;
    });
    if (showPast && maxItems) {
      // Keep the programme on air now in view: the last maxItems up to and
      // including it, then the ones after it.
      var current = 0;
      list.forEach(function (programme, index) {
        if (programme.start <= now) current = index;
      });
      var first = Math.max(0, Math.min(current, list.length - maxItems));
      list = list.slice(first);
    }
    return maxItems ? list.slice(0, maxItems) : list;
  }

  function channelsHtml(block, channels, now) {
    var hideLogo = isOn(block.tvgidshidelogo);
    var html =
      '<div class="tvgids-grid" style="grid-template-columns: repeat(auto-fill, minmax(min(100%, ' +
      num(block, 'tvgidscolumnwidth', 250, 120, 1000) +
      'px), 1fr))">';
    channels.forEach(function (channel) {
      html +=
        '<div class="tvgids-channel" data-channel="' + esc(channel.id) + '">';
      html += '<div class="tvgids-head">';
      if (!hideLogo) {
        // A missing logo shows the name instead (see refresh()).
        html +=
          '<img class="tvgids-logo" src="img/custom/tvgids/' +
          esc(channel.id) +
          '.png" alt="' +
          esc(channel.name) +
          '" title="' +
          esc(channel.name) +
          '">';
      }
      html +=
        '<span class="tvgids-name' +
        (hideLogo ? '' : ' tvgids-name-fallback') +
        '">' +
        esc(channel.name) +
        '</span></div>';
      if (channel.error) {
        html += '<div class="tvgids-error">' + esc(channel.error) + '</div>';
      } else {
        var programmes = visibleProgrammes(block, channel.programmes, now);
        if (!programmes.length) {
          html +=
            '<div class="tvgids-empty">' +
            esc(misc().tvgids_empty || 'No more programmes today.') +
            '</div>';
        }
        html += '<ul class="tvgids-list">';
        programmes.forEach(function (programme) {
          var state =
            programme.end <= now
              ? ' tvgids-past'
              : programme.start <= now
                ? ' tvgids-now'
                : '';
          html +=
            '<li class="tvgids-item' +
            state +
            '"><span class="tvgids-time">' +
            hhmm(programme.start) +
            ' - ' +
            hhmm(programme.end) +
            '</span><span class="tvgids-title">' +
            esc(programme.title) +
            '</span></li>';
        });
        html += '</ul>';
      }
      html += '</div>';
    });
    return html + '</div>';
  }

  function showMessage(me, text) {
    me.$mountPoint
      .find('.dt_state')
      .html('<div class="tvgids-error">' + esc(text) + '</div>');
  }

  function refresh(me) {
    var block = me.block;
    var fontSize = parseInt(block.tvgidsfontsize, 10);
    me.$mountPoint.css(
      '--tvgids-font-size',
      fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : ''
    );
    var logoBg = String(block.tvgidslogobg || '');
    me.$mountPoint.css(
      '--tvgids-logo-bg',
      logoBg === 'transparent' || /^#[0-9a-f]{6}$/i.test(logoBg) ? logoBg : ''
    );
    var ids = channelIds(block);
    if (!ids.length) {
      showMessage(me, misc().tvgids_nochannels || 'Choose the TV channels.');
      return;
    }
    $.ajax({
      url: settings['dashticz_php_path'] + 'tvgids/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        channels: ids,
        pollMinutes: num(block, 'tvgidspollminutes', 60, 15, 1440),
      }),
    }).then(
      function (res) {
        var channels = (res && res.channels) || [];
        me.$mountPoint
          .find('.dt_state')
          .html(channelsHtml(block, channels, Date.now() / 1000))
          .find('.tvgids-logo')
          .on('error', function () {
            $(this).parent().addClass('tvgids-nologo');
          });
      },
      function (jqXHR) {
        showMessage(
          me,
          (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error) ||
            misc().tvgids_error ||
            'Unable to fetch the TV guide.'
        );
      }
    );
  }
})();

Dashticz.register(DT_tvgids);
