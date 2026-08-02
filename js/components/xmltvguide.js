/* global Dashticz _CORS_PATH moment settings language DT_function templateEngine */
//# sourceURL=js/components/xmltvguide.js

/**
 * XMLTV TV Guide widget for Dashticz.
 *
 * Fetches an XMLTV-format XML file from a configurable URL and displays
 * current and upcoming TV programs for the selected channels.
 *
 * XMLTV is a widely-supported open standard for TV program listings.
 * Many home-media solutions (e.g. Jellyfin, Emby, Plex, EPG123, WebGrab+)
 * can export or serve guide data in XMLTV format.
 *
 * Minimal CONFIG.js example:
 *
 *   var xmltvguide = {}
 *   xmltvguide.home = {
 *     key: 'home',
 *     icon: 'fas fa-tv',
 *     width: 12,
 *     xmltvurl: 'http://my-epg-server/guide.xml',
 *     channels: ['BBC One', 'ITV', 'Channel 4'],
 *     maxitems: 10
 *   }
 */

var DT_xmltvguide = {
  name: 'xmltvguide',

  /** Activate for xmltvguide blocks or legacy blocks that carry an xmltvurl property. */
  canHandle: function (block) {
    return block && (
      block.type === 'xmltvguide' ||
      (typeof block.xmltvurl === 'string' && block.xmltvurl !== '')
    );
  },

  defaultCfg: {
    type: 'xmltvguide',
    icon: 'fas fa-tv',
    xmltvurl: _xmltvSettingString('xmltv_url', ''),
    /** Refresh interval in seconds (default 1 hour – XMLTV data is large). */
    refresh: _xmltvSettingNumber('xmltv_refresh', 3600),
    /** Maximum number of programme rows to display. */
    maxitems: _xmltvSettingNumber('xmltv_maxitems', 10),
    containerClass: 'hover',
    /**
     * Channel filter.  Accepts an array of channel IDs (as defined in the
     * XMLTV <channel id="…"> attribute) or display-names.
     * When omitted or empty all channels in the file are shown.
     */
    channels: _xmltvSettingChannels(),
    /**
     * Display layout:
     *   0 – show time, channel name, programme title (default)
     *   1 – show time and programme title only (no channel column)
     */
    layout: _xmltvSettingLayout(),
    /** Separator character shown between columns. */
    separator: _xmltvSettingString('xmltv_separator', '-'),
  },

  refresh: function (me) {
    var tvobject = $(me.mountPoint + ' .dt_state');
    var block = me.block;

    // Resolve language strings with fallback to English literals.
    var lang_loading =
      (language.xmltvguide && language.xmltvguide.loading) ||
      (language.misc && language.misc.loading) ||
      'Loading…';
    var lang_error =
      (language.xmltvguide && language.xmltvguide.error) ||
      'Error loading TV guide.';
    var lang_no_programs =
      (language.xmltvguide && language.xmltvguide.no_programs) ||
      (language.misc && language.misc.no_alerts) ||
      'No upcoming programs found.';

    tvobject.html('<span class="xmltv-loading">' + lang_loading + '</span>');

    var proxyUrl = _xmltvRequestUrl(block.xmltvurl);
    var fallbackUrl = _CORS_PATH + block.xmltvurl;

    _fetchXmltvText(proxyUrl, fallbackUrl)
      .done(function (responseText) {
        var parsed = _parseXmltvData(responseText, block, lang_no_programs);
        if (!parsed) {
          tvobject.html(
            '<span class="xmltv-error">' + lang_error + '</span>'
          );
          return;
        }

        templateEngine
          .load('xmltvguide_' + block.layout)
          .then(function (template) {
            var html = template({
              separator: block.separator,
              items: parsed,
            });
            tvobject.html(html);

            // Install click handlers.
            tvobject.off();
            if (block.url) {
              tvobject.on('click', function () {
                DT_function.clickHandler(me, block);
              });
            } else {
              // Clicking a row opens a detail popup when a detail_url template
              // is configured, otherwise nothing happens.
              tvobject.on('click', 'tr.xmltv-row', function () {
                var url = $(this).data('url');
                if (url) DT_function.clickHandler(me, { url: url });
              });
            }
          });
      })
      .fail(function () {
        console.error(
          '[xmltvguide] Failed to load XMLTV data from:',
          block.xmltvurl
        );
        tvobject.html('<span class="xmltv-error">' + lang_error + '</span>');
      });
  },
};

function _xmltvSettingString(key, fallback) {
  if (
    typeof settings !== 'undefined' &&
    typeof settings[key] === 'string' &&
    settings[key] !== ''
  ) {
    return settings[key];
  }
  return fallback;
}

function _xmltvSettingNumber(key, fallback) {
  var value =
    typeof settings !== 'undefined' ? parseInt(settings[key], 10) : NaN;
  return value > 0 ? value : fallback;
}

function _xmltvSettingLayout() {
  return _xmltvSettingNumber('xmltv_layout', 0) === 1 ? 1 : 0;
}

function _xmltvSettingChannels() {
  if (typeof settings === 'undefined') return [];
  var channels = settings['xmltv_channels'];
  if (Array.isArray(channels)) return channels;
  if (typeof channels !== 'string' || channels.trim() === '') return [];
  return channels.split(',').map(function (channel) {
    return channel.trim();
  }).filter(Boolean);
}

function _xmltvRequestUrl(xmltvurl) {
  var phpPath =
    typeof settings !== 'undefined' && settings['dashticz_php_path']
      ? settings['dashticz_php_path']
      : '';
  if (phpPath) {
    return phpPath + 'xmltv.php?url=' + encodeURIComponent(xmltvurl);
  }
  return _CORS_PATH + xmltvurl;
}

function _fetchXmltvText(primaryUrl, fallbackUrl) {
  return $.ajax({
    url: primaryUrl,
    dataType: 'text',
    cache: true,
  }).then(null, function () {
    if (fallbackUrl && fallbackUrl !== primaryUrl) {
      return $.ajax({
        url: fallbackUrl,
        dataType: 'text',
        cache: true,
      });
    }
    return $.Deferred().reject().promise();
  });
}

/**
 * Parse raw XMLTV XML text and return an array of programme objects that
 * are currently running or will start in the near future, filtered and
 * sorted by start time.
 *
 * @param {string}  xmlText       Raw XMLTV XML string.
 * @param {object}  block         Widget block configuration.
 * @param {string}  lang_no_prg   Fallback "no programmes" message.
 * @returns {Array|null}          Array of programme objects, or null on parse error.
 */
function _parseXmltvData(xmlText, block, lang_no_prg) {
  var xmlDoc;
  try {
    var parser = new DOMParser();
    xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // Detect parser errors (Firefox wraps them in <parsererror>).
    var parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      console.error('[xmltvguide] XML parse error:', parseError.textContent);
      return null;
    }
  } catch (e) {
    console.error('[xmltvguide] DOMParser error:', e);
    return null;
  }

  // ── 1. Build a map of channel id → display-name ──────────────────────────
  var channelNames = {}; // { id: displayName }
  var channelNodes = xmlDoc.getElementsByTagName('channel');
  for (var i = 0; i < channelNodes.length; i++) {
    var ch = channelNodes[i];
    var id = ch.getAttribute('id') || '';
    var nameNode = ch.getElementsByTagName('display-name')[0];
    var name = nameNode ? (nameNode.textContent || '').trim() : id;
    channelNames[id] = name;
  }

  // ── 2. Build the channel filter set ──────────────────────────────────────
  // block.channels may contain channel IDs or display-names.
  // An empty / absent array means "show all channels".
  var filterSet = null; // null = no filter (show all)
  if (block.channels && block.channels.length > 0) {
    filterSet = {};
    // Index both IDs and display-names for O(1) look-up.
    for (var fi = 0; fi < block.channels.length; fi++) {
      filterSet[String(block.channels[fi]).toLowerCase()] = true;
    }
  }

  /**
   * Returns true when the given channel should be included.
   * @param {string} chId  The channel id attribute from <programme>.
   */
  function _channelAllowed(chId) {
    if (!filterSet) return true;
    var lower = chId.toLowerCase();
    if (filterSet[lower]) return true;
    var nameMatch = (channelNames[chId] || '').toLowerCase();
    return filterSet[nameMatch] || false;
  }

  // ── 3. Parse <programme> elements ────────────────────────────────────────
  var nowTs = moment().unix();
  var maxitems = block.maxitems || 10;
  var programmes = [];

  var progNodes = xmlDoc.getElementsByTagName('programme');
  for (var pi = 0; pi < progNodes.length; pi++) {
    var prog = progNodes[pi];
    var chId = prog.getAttribute('channel') || '';

    if (!_channelAllowed(chId)) continue;

    var startAttr = prog.getAttribute('start') || '';
    var stopAttr = prog.getAttribute('stop') || prog.getAttribute('end') || '';

    var startTs = _parseXmltvTimestamp(startAttr);
    var stopTs = stopAttr ? _parseXmltvTimestamp(stopAttr) : null;

    // Skip programmes that have already finished.
    if (stopTs !== null && stopTs <= nowTs) continue;
    // Skip programmes that start more than 24 h in the future (optional guard).
    if (startTs > nowTs + 86400) continue;

    var titleNode = prog.getElementsByTagName('title')[0];
    var descNode = prog.getElementsByTagName('desc')[0];
    var subTitleNode = prog.getElementsByTagName('sub-title')[0];
    var categoryNode = prog.getElementsByTagName('category')[0];
    var iconNode = prog.getElementsByTagName('icon')[0];

    programmes.push({
      starttime: moment.unix(startTs).format('HH:mm'),
      endtime: stopTs ? moment.unix(stopTs).format('HH:mm') : '',
      starttimestamp: startTs,
      channel: channelNames[chId] || chId,
      channelid: chId,
      title: titleNode ? (titleNode.textContent || '').trim() : '',
      subtitle: subTitleNode ? (subTitleNode.textContent || '').trim() : '',
      description: descNode ? (descNode.textContent || '').trim() : '',
      category: categoryNode ? (categoryNode.textContent || '').trim() : '',
      img: iconNode ? (iconNode.getAttribute('src') || '') : '',
    });
  }

  // ── 4. Sort by start time and limit ──────────────────────────────────────
  programmes.sort(function (a, b) {
    return a.starttimestamp - b.starttimestamp;
  });

  return programmes.slice(0, maxitems);
}

/**
 * Parse an XMLTV timestamp string to a Unix timestamp (seconds).
 *
 * XMLTV timestamps have the form:  YYYYMMDDHHmmss [±HHMM]
 * The timezone offset is optional; when absent UTC is assumed.
 *
 * @param  {string} ts  Raw timestamp attribute value.
 * @returns {number}    Unix timestamp in seconds.
 */
function _parseXmltvTimestamp(ts) {
  if (!ts) return 0;

  // Strip any non-digit / sign / space characters that may appear after
  // the 14-digit date string (e.g. timezone names).
  var m = ts.match(
    /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/
  );
  if (!m) return 0;

  var year = parseInt(m[1], 10);
  var month = parseInt(m[2], 10) - 1; // JS months are 0-based
  var day = parseInt(m[3], 10);
  var hour = parseInt(m[4], 10);
  var min = parseInt(m[5], 10);
  var sec = parseInt(m[6], 10);
  var tzString = m[7] || '+0000';

  // Convert timezone offset string (e.g. "+0200") to minutes.
  var tzSign = tzString.charAt(0) === '-' ? -1 : 1;
  var tzHours = parseInt(tzString.substr(1, 2), 10);
  var tzMins = parseInt(tzString.substr(3, 2), 10);
  var tzOffsetMinutes = tzSign * (tzHours * 60 + tzMins);

  // Build a UTC date by subtracting the timezone offset.
  var utcMs =
    Date.UTC(year, month, day, hour, min, sec) - tzOffsetMinutes * 60000;
  return Math.floor(utcMs / 1000);
}

Dashticz.register(DT_xmltvguide);
