/* global Dashticz DT_function settings */
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
 *   f1timezone     'browser' (default): show the session times in the time
 *                  zone of the browser. 'domoticz': use the time zone of the
 *                  Domoticz location (latitude/longitude), looked up by the
 *                  bridge; falls back to the browser time zone when the
 *                  location or the lookup is not available. Both follow
 *                  summer time.
 *   f1utcoffset    optional: fixed hours added to the (UTC) session times;
 *                  overrides f1timezone and does NOT follow summer time;
 *                  empty (default) or 0 = use f1timezone
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
  var WEEKDAY_KEYS = WEEKDAYS.en;
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
      return !!(
        block &&
        ((typeof block.f1mode === 'string' && block.f1mode) ||
          /^(?:f1|f1events)$/i.test(String(block.type || '')))
      );
    },
    defaultCfg: {
      width: 4,
      icon: 'fas fa-flag-checkered',
      refresh: 60,
      containerClass: 'f1-block dt-widget-rows',
    },
    // Mounting calls refresh() itself when block.refresh is set.
    run: function (me) {
      if (!me.block.refresh) refresh(me);
    },
    refresh: refresh,
  };

  // Compatibility for the original singleton F1 widgets. Their mode lived
  // in block.type and all other options in global settings. Device Editor
  // writes this normalized shape back as per-block fields on the next save.
  function normaliseLegacyBlock(block) {
    var type = String((block && block.type) || '').toLowerCase();
    if (type !== 'f1' && type !== 'f1events') return block;

    var normalised = $.extend({}, block);
    if (!normalised.f1mode) {
      normalised.f1mode = type === 'f1events' ? 'all' : 'next';
    }
    var legacySettings = {
      f1language: 'f1_language',
      f1urlen: 'f1_url_en',
      f1urlnl: 'f1_url_nl',
      f1timezone: 'f1_timezone',
      f1utcoffset: 'f1_utcoffset',
      f1pollminutes: 'f1_pollminutes',
      f1sessions: 'f1_sessions',
      f1visibility: 'f1_visibility',
      f1emptytext: 'f1_emptytext',
      hideimageonempty: 'f1_hideimageonempty',
      f1fontsize: 'f1_fontsize',
    };
    Object.keys(legacySettings).forEach(function (blockField) {
      var settingField = legacySettings[blockField];
      if (
        typeof normalised[blockField] === 'undefined' &&
        typeof settings[settingField] !== 'undefined'
      ) {
        normalised[blockField] = settings[settingField];
      }
    });
    return normalised;
  }

  function num(block, key, def, min, max) {
    return DT_function.clampNumber(block[key], def, min, max);
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

  function esc(value) {
    return DT_function.escapeHtml(value);
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  // The location of Domoticz: {lat, lon} or null.
  function domoticzLocation() {
    var location = {};
    try {
      location = (Domoticz.getAllDevices()['_settings'] || {}).Location || {};
    } catch (e) {
      return null;
    }
    var lat = parseFloat(String(location.Latitude).replace(',', '.'));
    var lon = parseFloat(String(location.Longitude).replace(',', '.'));
    return isFinite(lat) && isFinite(lon) ? { lat: lat, lon: lon } : null;
  }

  // Valid IANA time zone name, else ''.
  function validTimeZone(name) {
    if (typeof name !== 'string' || !name) return '';
    try {
      new Intl.DateTimeFormat('en-GB', { timeZone: name });
      return name;
    } catch (e) {
      return '';
    }
  }

  // Calendar parts of a unix time in an IANA time zone ('' = the browser's),
  // so summer time is applied for that very moment.
  function zoneParts(ts, timeZone) {
    var options = {
      weekday: 'short',
      day: 'numeric',
      month: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    };
    if (timeZone) options.timeZone = timeZone;
    var parts = {};
    new Intl.DateTimeFormat('en-GB', options)
      .formatToParts(new Date(ts * 1000))
      .forEach(function (part) {
        parts[part.type] = part.value;
      });
    return {
      day: WEEKDAY_KEYS.indexOf(parts.weekday),
      date: parseInt(parts.day, 10),
      month: parseInt(parts.month, 10) - 1,
      hours: parseInt(parts.hour, 10) % 24,
      minutes: parseInt(parts.minute, 10),
    };
  }

  // Unix time -> "Sat 5 Jul 12:30", in the chosen time zone (timeZone, ''
  // = browser) or shifted by the fixed f1utcoffset, which wins when set.
  function formatWhen(block, ts, timeZone) {
    var offset = parseFloat(block.f1utcoffset);
    var p;
    // Empty and 0 mean 'no fixed offset', so the time zone setting is used.
    if (isNaN(offset) || offset === 0) {
      p = zoneParts(ts, timeZone);
    } else {
      var d = new Date(
        (ts + Math.min(24, Math.max(-24, offset)) * 3600) * 1000
      );
      p = {
        day: d.getUTCDay(),
        date: d.getUTCDate(),
        month: d.getUTCMonth(),
        hours: d.getUTCHours(),
        minutes: d.getUTCMinutes(),
      };
    }
    var l = lang(block);
    return (
      WEEKDAYS[l][p.day] +
      ' ' +
      p.date +
      ' ' +
      MONTHS[l][p.month] +
      ' ' +
      pad(p.hours) +
      ':' +
      pad(p.minutes)
    );
  }

  function isTraining(event) {
    return /training|practice|^fp\d/i.test(event.session);
  }

  function isRace(event) {
    return /grand prix/i.test(event.session);
  }

  // "Grand Prix van Azerbeidzjan" -> "GP van Azerbeidzjan" to keep the heading short.
  function shortHeading(text) {
    return String(text || '').replace(/\bGrand Prix\b/gi, 'GP');
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

  function weekendHtml(block, weekend, now, titleHasLocation, timeZone) {
    var head = shortHeading(weekend[0].gp || weekend[0].location);
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
            esc(formatWhen(block, event.start, timeZone)) +
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
  function eventHtml(block, event, timeZone) {
    var head = shortHeading(event.gp || event.location);
    return (
      '<div class="f1-next">' +
      imageHtml(block) +
      '<div class="f1-rows">' +
      (head ? '<div class="f1-heading">' + esc(head) + '</div>' : '') +
      '<div class="f1-session">' +
      esc(formatWhen(block, event.start, timeZone) + ' : ' + event.session) +
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
    var block = normaliseLegacyBlock(me.block);
    // Set on every refresh; empty removes the override.
    var fontSize = parseInt(block.f1fontsize, 10);
    me.$mountPoint.css(
      '--font-device-title',
      fontSize >= 8 && fontSize <= 60 ? fontSize + 'px' : ''
    );
    var request = {
      url: feedUrl(block),
      pollMinutes: num(block, 'f1pollminutes', 60, 5, 1440),
    };
    var location = block.f1timezone === 'domoticz' ? domoticzLocation() : null;
    if (location) {
      request.lat = location.lat;
      request.lon = location.lon;
    }
    DT_function.bridge('f1/index.php', request).then(
      function (res) {
        var now = Math.floor(Date.now() / 1000);
        var events = (res && res.events) || [];
        // Empty = the time zone of the browser.
        var timeZone = validTimeZone(res && res.timezone);
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
              setTitleLocation(me, weekend[0].location),
              timeZone
            );
        } else {
          var event = nextEvent(block, events, now);
          html = event && eventHtml(block, event, timeZone);
        }
        if (!html) {
          // showEmpty reads me.block for the legacy hide-image/no-event
          // options, so expose the normalized instance for this refresh.
          me.block = block;
          return showEmpty(me);
        }
        me.$mountPoint.find('.dt_state').html(html);
        setImageVisible(me, true);
      },
      function (jqXHR) {
        showError(
          me,
          DT_function.bridgeError(
            jqXHR,
            DT_function.t('f1_error', 'Unable to fetch the F1 calendar.')
          )
        );
      }
    );
  }
})();

Dashticz.register(DT_f1);
