/* global Dashticz settings language */
//# sourceURL=js/components/f1.js
/* F1 widget: shows the upcoming Formula 1 race weekend, based on the
 * domoticz_F1 plugin (https://github.com/MadPatrick/domoticz_F1). It is
 * standalone - no Domoticz device needed. The calendar (ICS feed) is
 * downloaded and parsed by vendor/dashticz/f1/index.php, a same-origin PHP
 * bridge like the PostNL and HP iLO widgets; the filtering and formatting
 * below mirror the plugin's settings.
 *
 * It is a repeatable block (Widgets -> F1, multiple per screen), configured
 * per block, and dispatched on f1mode:
 *
 *   f1mode         'next': the plugin's 'next event' text, centered - the
 *                  Grand Prix name, and below it the next session
 *                  ("Do 24 Sep 10:30 : Vrije Training 1").
 *                  'all': all (filtered) sessions of that race weekend, one
 *                  row per session: name left, date/time right, finished
 *                  ones dimmed. The race location is added to the tile
 *                  title ("F1 agenda - Baku"); without a title it is the
 *                  heading above the rows.
 *   f1language     'en' (default) | 'nl'  (weekday/month names and feed)
 *   f1urlen/f1urlnl  ICS feed per language (defaults: the plugin's feeds)
 *   f1utcoffset    hours added to the (UTC) session times (default 1)
 *   f1pollminutes  how often the feed is downloaded (default 60)
 *   f1sessions     'all' (default) | 'sprint_race' | 'race'
 *   f1visibility   show the event this many days before its first upcoming
 *                  session (default 3); otherwise the 'no-event' text
 *   f1emptytext    text shown when there is no event (may be empty)
 *   hideimageonempty  hide the tile image while there is no event
 *   f1fontsize     optional font size in px (8-60), like the cluster's fontSize:
 *                  sets --font-device-title on the tile, so the title follows
 *                  too; empty = the theme's size
 *   f1image        image (from img/, chosen in the config) shown before the
 *                  text of the 'next' tile; the tile icon stays as it is
 */
var DT_f1 = (function () {
  var DEFAULT_URLS = {
    en: 'https://files-f1.motorsportcalendars.com/f1-calendar_p1_p2_p3_qualifying_sprint_gp.ics',
    nl: 'https://files-f1.motorsportcalendars.com/nl/f1-calendar_p1_p2_p3_qualifying_sprint_gp.ics',
  };
  var WEEKDAYS = {
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    nl: ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za'],
  };
  var MONTHS = {
    en: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ],
    nl: [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Okt',
      'Nov',
      'Dec',
    ],
  };

  return {
    name: 'f1',
    canHandle: function (block) {
      return !!(block && typeof block.f1mode === 'string' && block.f1mode);
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-flag-checkered',
      refresh: 60,
      containerClass: 'f1-block',
    },
    run: function (me) {
      refresh(me);
    },
    refresh: refresh,
  };

  function misc() {
    return (typeof language !== 'undefined' && language.misc) || {};
  }

  function num(block, key, def, min, max) {
    var value = parseFloat(block[key]);
    return isNaN(value) ? def : Math.min(max, Math.max(min, value));
  }

  function lang(block) {
    return block.f1language === 'nl' ? 'nl' : 'en';
  }

  function feedUrl(block) {
    var l = lang(block);
    return (
      String(block[l === 'nl' ? 'f1urlnl' : 'f1urlen'] || '').trim() ||
      DEFAULT_URLS[l]
    );
  }

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[c];
    });
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // Unix time -> "Sat 5 Jul 12:30", shifted by the UTC offset.
  function formatWhen(block, ts) {
    var offset = num(block, 'f1utcoffset', 1, -24, 24);
    var d = new Date((ts + offset * 3600) * 1000);
    var l = lang(block);
    return (
      WEEKDAYS[l][d.getUTCDay()] +
      ' ' +
      d.getUTCDate() +
      ' ' +
      MONTHS[l][d.getUTCMonth()] +
      ' ' +
      pad(d.getUTCHours()) +
      ':' +
      pad(d.getUTCMinutes())
    );
  }

  function isTraining(event) {
    return /training|practice|^fp\d/i.test(event.session);
  }

  function isRace(event) {
    return /grand prix/i.test(event.session);
  }

  function passesFilter(block, event) {
    var mode = block.f1sessions;
    if (mode === 'race') return isRace(event);
    if (mode === 'sprint_race') return !isTraining(event);
    return true;
  }

  // The next (or running) session, or null when there is nothing to show.
  function nextEvent(block, events, now) {
    var next = events
      .filter(function (event) {
        return passesFilter(block, event);
      })
      .filter(function (event) {
        return event.end > now;
      })[0];
    if (!next) return null;
    if (next.start - now > num(block, 'f1visibility', 3, 0, 365) * 86400)
      return null;
    return next;
  }

  // All sessions of the next event's weekend (see f1sessions), or null.
  function nextWeekend(block, events, now) {
    var next = nextEvent(block, events, now);
    if (!next) return null;
    return events
      .filter(function (event) {
        return passesFilter(block, event);
      })
      .filter(function (event) {
        return event.gp === next.gp;
      });
  }

  // The location of the race is added to the tile title ("F1 agenda - Baku").
  // Returns false when the tile has no title to put it in.
  function setTitleLocation(me, location) {
    var $title = me.$mountPoint.find('.dt_title');
    if (!$title.length || !me.block.title) return false;
    $title.html(me.block.title + (location ? ' - ' + esc(location) : ''));
    return !!location;
  }

  function weekendHtml(block, weekend, now, titleHasLocation) {
    var head = weekend[0].gp || weekend[0].location;
    return (
      '<div class="f1-rows f1-list">' +
      (head && !titleHasLocation
        ? '<div class="f1-heading">' + esc(head) + '</div>'
        : '') +
      weekend
        .map(function (event) {
          return (
            '<div class="f1-row' +
            (event.end < now ? ' f1-past' : '') +
            '">' +
            '<span class="f1-label">' +
            esc(event.session) +
            '</span>' +
            '<span class="f1-value">' +
            esc(formatWhen(block, event.start)) +
            '</span>' +
            '</div>'
          );
        })
        .join('') +
      '</div>'
    );
  }

  // Optional image before the text, from block.f1image (path relative to img/).
  function imageHtml(block) {
    var image = String(block.f1image || '');
    if (!/^[A-Za-z0-9 _.\/-]{1,100}$/.test(image) || image.indexOf('..') > -1)
      return '';
    return '<img class="f1-image" src="img/' + esc(image) + '" alt="">';
  }

  // Grand Prix name, and below it "Do 24 Sep 10:30 : Vrije Training 1".
  function eventHtml(block, event) {
    var head = event.gp || event.location;
    return (
      '<div class="f1-next">' +
      imageHtml(block) +
      '<div class="f1-rows">' +
      (head ? '<div class="f1-heading">' + esc(head) + '</div>' : '') +
      '<div class="f1-session">' +
      esc(formatWhen(block, event.start) + ' : ' + event.session) +
      '</div>' +
      '</div>' +
      '</div>'
    );
  }

  // Same behaviour as the hideimageonempty block option of Domoticz blocks
  // (js/components/domoticzblock.js): only the tile image is hidden.
  function setImageVisible(me, visible) {
    me.$mountPoint.find('.col-icon img').each(function () {
      if (visible) this.style.removeProperty('display');
      else this.style.setProperty('display', 'none', 'important');
    });
  }

  function hideImageOnEmpty(block) {
    return (
      block.hideimageonempty === true ||
      block.hideimageonempty === 1 ||
      String(block.hideimageonempty).toLowerCase() === 'true'
    );
  }

  function showEmpty(me) {
    setTitleLocation(me, '');
    var text = String(me.block.f1emptytext || '').trim();
    me.$mountPoint
      .find('.dt_state')
      .html(
        text ? '<div class="f1-rows f1-empty">' + esc(text) + '</div>' : ''
      );
    setImageVisible(me, !hideImageOnEmpty(me.block));
  }

  function showError(me, text) {
    me.$mountPoint
      .find('.dt_state')
      .html('<div class="f1-rows f1-error">' + esc(text) + '</div>');
    setImageVisible(me, true);
  }

  function refresh(me) {
    var block = me.block;
    // Set on every refresh; empty removes the override.
    var fontSize = parseInt(block.f1fontsize, 10);
    me.$mountPoint.css(
      '--font-device-title',
      fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : ''
    );
    $.ajax({
      url: settings['dashticz_php_path'] + 'f1/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        url: feedUrl(block),
        pollMinutes: num(block, 'f1pollminutes', 60, 5, 1440),
      }),
    }).then(
      function (res) {
        var now = Math.floor(Date.now() / 1000);
        var events = (res && res.events) || [];
        var html;
        if (block.f1mode === 'all') {
          var weekend = nextWeekend(block, events, now);
          html =
            weekend &&
            weekend.length &&
            weekendHtml(
              block,
              weekend,
              now,
              setTitleLocation(me, weekend[0].location)
            );
        } else {
          var event = nextEvent(block, events, now);
          html = event && eventHtml(block, event);
        }
        if (!html) return showEmpty(me);
        me.$mountPoint.find('.dt_state').html(html);
        setImageVisible(me, true);
      },
      function (jqXHR) {
        showError(
          me,
          (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error) ||
            misc().f1_error ||
            'Unable to fetch the F1 calendar.'
        );
      }
    );
  }
})();

Dashticz.register(DT_f1);
