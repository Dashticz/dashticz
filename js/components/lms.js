/* global Dashticz settings language */
// Lyrion Music Server (LMS) "Now Playing" block. Read-only: shows player
// state/artist/title/album/artwork for one configured player, refreshed on
// Dashticz's own per-block polling (see me.block.refresh below) - it never
// sends any playback command to LMS. Configured via the Screen Editor's
// "Lyrion Music Server" quick-add popup (js/deviceeditor.js), which discovers
// players through the same backend bridge this component polls
// (vendor/dashticz/lms/index.php) rather than talking to LMS directly, so
// this never hits a CORS or mixed-content wall regardless of deployment -
// see docs/blocks/specials/lms.rst.
// Shared LMS backend bridge, kept as its own global (mirroring the NZBGET
// object in js/components/nzbget.js) rather than nested inside DT_lms's own
// closure below: js/deviceeditor.js's Lyrion Music Server quick-add/edit
// popup reuses DT_lms_api.request() for player discovery/"Test connection",
// posting the very same request shape this block polls with, so both share
// one implementation of the fetch/error handling instead of two. Component
// scripts are all loaded unconditionally at dashboard startup (well before
// the Screen Editor can lazy-load deviceeditor.js), so this is available by
// the time it's needed.
// eslint-disable-next-line no-unused-vars
var DT_lms_api = {
  request: function (block, params, player) {
    return $.ajax({
      url: settings['dashticz_php_path'] + 'lms/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        action: 'rpc',
        server: block.server,
        port: block.port,
        username: block.username || '',
        password: block.password || '',
        player: player || '',
        params: params,
      }),
    }).then(function (res) {
      return res && res.result;
    });
  },
  cover: function (block, player, coverid, artworkUrl) {
    return $.ajax({
      url: settings['dashticz_php_path'] + 'lms/index.php',
      method: 'POST',
      contentType: 'application/json',
      dataType: 'json',
      data: JSON.stringify({
        action: 'cover',
        server: block.server,
        port: block.port,
        username: block.username || '',
        password: block.password || '',
        player: player || '',
        coverid: coverid || '',
        artworkUrl: artworkUrl || '',
      }),
    }).then(function (res) {
      return res && res.dataUrl;
    });
  },
};

(function (Dashticz) {
  'use strict';

  var STATUS_TAGS = 'tags:aclK'; // artist, album, coverid, artwork_url - see docs/blocks/specials/lms.rst
  var ARTWORK_RETRY_MS = 30000;
  // Must match vendor/dashticz/lms/index.php's fixed message exactly - see
  // the try block's function_exists('curl_init') check there.
  var LMS_CURL_REQUIRED_ERROR = 'The PHP curl extension is required for the Lyrion Music Server block.';

  function _esc(value) {
    return $('<div>').text(value === null || typeof value === 'undefined' ? '' : String(value)).html();
  }

  function _lmsText(key, fallback) {
    return (language.misc && language.misc[key]) || fallback;
  }

  /* Normalization layer: the only place that reads raw LMS 'status' fields
     (remote/current_title/remoteMeta/playlist_loop/...), so the renderer
     below never has to know how local tracks and internet radio streams
     differ in LMS's response shape. */
  function normalizeStatus(status, fallbackName) {
    status = status || {};
    var power = Number(status.power) === 1;
    var mode = status.mode || 'stop';
    var remote = Number(status.remote) === 1;
    var track = (Array.isArray(status.playlist_loop) && status.playlist_loop[0]) || {};
    var remoteMeta = status.remoteMeta || {};
    var currentTitle = status.current_title || '';

    var meta = {
      playerName: status.player_name || fallbackName || '',
      known: typeof status.mode !== 'undefined' || typeof status.power !== 'undefined',
      power: power,
      state: !power ? 'off' : (mode === 'play' || mode === 'pause' ? mode : 'stop'),
      remote: remote,
      station: '',
      artist: '',
      title: '',
      album: '',
      coverid: track.coverid || '',
      artworkUrl: track.artwork_url || remoteMeta.artwork_url || '',
    };

    if (!power || meta.state === 'stop') {
      // A stopped/off player must not keep showing the last track (#18).
      return meta;
    }

    if (remote) {
      meta.station = currentTitle;
      meta.artist = remoteMeta.artist || '';
      meta.title = remoteMeta.title || (meta.station ? '' : currentTitle);
      meta.album = remoteMeta.album || '';
    } else {
      meta.artist = track.artist || '';
      meta.title = track.title || currentTitle;
      meta.album = track.album || '';
    }
    return meta;
  }

  function _line(cls, text) {
    return text ? '<div class="' + cls + '">' + _esc(text) + '</div>' : '';
  }

  function _skeletonHtml() {
    return (
      '<div class="lms-block-inner">' +
      '<div class="lms-cover"><div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div></div>' +
      '<div class="lms-info"><div class="lms-title">' + _esc(_lmsText('loading', 'Loading...')) + '</div></div>' +
      '</div>'
    );
  }

  function _renderCover($cover, dataUrl) {
    if (!dataUrl) {
      $cover.html('<div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div>');
      return;
    }
    var $img = $('<img class="lms-cover-img" alt="">');
    // A broken/expired data URL must fall back to the placeholder instead of
    // the browser's own broken-image icon (#9's "sensible placeholder").
    $img.on('error', function () {
      $cover.html('<div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div>');
    });
    $img.attr('src', dataUrl);
    $cover.html($img);
  }

  /* Write an inline style with !important when hiding the whole block.
     Several optional Dashticz themes intentionally use !important for their
     glass/panel background, border and shadow, so a normal jQuery .css()
     assignment would not reliably make hide_when_off fully transparent. */
  function _setImportantStyle($nodes, property, value) {
    $nodes.each(function () {
      if (!this || !this.style) return;
      if (value === null) this.style.removeProperty(property);
      else this.style.setProperty(property, value, 'important');
    });
  }

  /* Keep an off player in the layout but make the complete tile visually
     disappear. This includes generic title/icon content and every panel
     effect. Removing these inline overrides when the player returns hands
     styling back to the active theme without changing the saved config. */
  function _setHiddenOff(me, hidden) {
    var $block = me.$mountPoint.find('.lms-block').addBack('.lms-block').first();
    if (!$block.length) $block = me.$mountPoint;
    var $content = $block.find('.col-icon, .dt_content');

    if (hidden) {
      _setImportantStyle($block, 'background', 'transparent');
      _setImportantStyle($block, 'border-color', 'transparent');
      _setImportantStyle($block, 'box-shadow', 'none');
      _setImportantStyle($block, 'backdrop-filter', 'none');
      _setImportantStyle($block, '-webkit-backdrop-filter', 'none');
      _setImportantStyle($content, 'visibility', 'hidden');
      _setImportantStyle($content, 'pointer-events', 'none');
      return;
    }

    [
      'background',
      'border-color',
      'box-shadow',
      'backdrop-filter',
      '-webkit-backdrop-filter',
    ].forEach(function (property) {
      _setImportantStyle($block, property, null);
    });
    ['visibility', 'pointer-events'].forEach(function (property) {
      _setImportantStyle($content, property, null);
    });
  }

  /* Build a key from visible metadata as well as LMS's artwork fields. Radio
     stations often keep the same coverid/artwork_url while the programme or
     song changes; including the textual metadata ensures current-cover is
     refreshed when the actual now-playing item changes. */
  function _artworkKey(meta) {
    if (meta.state !== 'play' && meta.state !== 'pause') return '';
    return [
      meta.remote ? 'remote' : 'local',
      meta.station,
      meta.artist,
      meta.title,
      meta.album,
      meta.coverid,
      meta.artworkUrl,
    ].join('|');
  }

  function _resetArtworkState(me) {
    me.lmsArtworkCurrentKey = '';
    me.lmsArtworkLoadedKey = '';
    me.lmsArtworkRequestKey = '';
    me.lmsArtworkRetryKey = '';
    me.lmsArtworkRetryAt = 0;
  }

  function render(me, meta) {
    var $state = me.$mountPoint.find('.dt_state');
    var $existing = $state.find('.lms-block-inner');
    if (!$existing.length) {
      $state.html('<div class="lms-block-inner"><div class="lms-cover"></div><div class="lms-info"></div></div>');
      $existing = $state.find('.lms-block-inner');
    }
    $existing.attr('data-lms-state', meta.state).toggleClass('lms-remote', !!meta.remote);

    // hide_when_off means the complete LMS tile is visually absent while
    // preserving its grid/column footprint, so surrounding layout never jumps.
    var hideWhenOff = me.block.hide_when_off === true && meta.known && !meta.power;
    _setHiddenOff(me, hideWhenOff);

    var $info = $existing.find('.lms-info');
    if (hideWhenOff) {
      $info.empty();
    } else {
      var lines = '';
      if (!meta.known) {
        lines = _line('lms-state-label', _lmsText('lms_player_unavailable', 'Player unavailable'));
      } else if (!meta.power) {
        lines = _line('lms-state-label', _lmsText('lms_player_off', 'Player off'));
      } else if (meta.state === 'stop') {
        lines = _line('lms-state-label', _lmsText('mediaplayer_nothing_playing', 'Nothing is playing right now'));
      } else {
        lines += _line('lms-station', meta.station);
        lines += _line('lms-artist', meta.artist);
        lines += _line('lms-title', meta.title);
        lines += _line('lms-album', meta.album);
        if (meta.state === 'pause') {
          lines += _line('lms-state-label lms-paused', _lmsText('lms_paused', 'Paused'));
        }
      }
      $info.html(lines || _line('lms-state-label', _lmsText('lms_player_unavailable', 'Player unavailable')));
    }

    var $cover = $existing.find('.lms-cover');
    if (hideWhenOff) {
      $cover.empty();
      _resetArtworkState(me);
      return;
    }

    var artworkKey = _artworkKey(meta);
    me.lmsArtworkCurrentKey = artworkKey;

    if (!artworkKey) {
      _resetArtworkState(me);
      _renderCover($cover, null);
      return;
    }

    // A successfully loaded cover is cached until the now-playing metadata
    // changes. Failed artwork is deliberately not marked as loaded: it gets
    // one retry after a quiet period so a temporary LMS image-proxy/network
    // failure can recover without issuing a cover request every refresh tick.
    if (me.lmsArtworkLoadedKey === artworkKey) return;
    if (me.lmsArtworkRequestKey === artworkKey) return;
    if (
      me.lmsArtworkRetryKey === artworkKey &&
      me.lmsArtworkRetryAt &&
      Date.now() < me.lmsArtworkRetryAt
    ) return;

    // A failure for the previous station/track must never postpone artwork
    // for a newly selected item. Retry throttling therefore belongs to the
    // artwork key, not to the LMS block globally.
    if (me.lmsArtworkRetryKey !== artworkKey) {
      me.lmsArtworkRetryKey = '';
      me.lmsArtworkRetryAt = 0;
    }

    me.lmsArtworkRequestKey = artworkKey;
    DT_lms_api.cover(me.block, me.block.player, meta.coverid, meta.artworkUrl)
      .then(function (dataUrl) {
        // Always release this request key, even when a slow result became
        // stale because the player already moved to another track.
        if (me.lmsArtworkRequestKey === artworkKey) me.lmsArtworkRequestKey = '';
        if (me.lmsArtworkCurrentKey !== artworkKey) return;
        if (dataUrl) {
          me.lmsArtworkLoadedKey = artworkKey;
          me.lmsArtworkRetryKey = '';
          me.lmsArtworkRetryAt = 0;
          _renderCover($cover, dataUrl);
        } else {
          me.lmsArtworkLoadedKey = '';
          me.lmsArtworkRetryKey = artworkKey;
          me.lmsArtworkRetryAt = Date.now() + ARTWORK_RETRY_MS;
          _renderCover($cover, null);
        }
      })
      .catch(function () {
        if (me.lmsArtworkRequestKey === artworkKey) me.lmsArtworkRequestKey = '';
        if (me.lmsArtworkCurrentKey !== artworkKey) return;
        me.lmsArtworkLoadedKey = '';
        me.lmsArtworkRetryKey = artworkKey;
        me.lmsArtworkRetryAt = Date.now() + ARTWORK_RETRY_MS;
        _renderCover($cover, null);
      });
  }

  var DT_lms = {
    name: 'lms',
    canHandle: function (block) {
      return block && block.type === 'lms';
    },
    defaultCfg: {
      containerClass: 'lms-block',
      width: 6,
      port: 9000,
      refresh: 5,
    },
    defaultContent: _skeletonHtml,
    refresh: function (me) {
      if (!me.block.server || !me.block.player) {
        _setHiddenOff(me, false);
        me.$mountPoint.find('.dt_state').html(
          _line('lms-state-label', _lmsText('lms_server_unavailable', 'LMS unavailable'))
        );
        return;
      }
      DT_lms_api.request(me.block, ['status', '-', 1, STATUS_TAGS], me.block.player)
        .then(function (status) {
          render(me, normalizeStatus(status, me.block.title));
        })
        .catch(function (xhr) {
          // A connection error is not a confirmed powered-off state. Always
          // reveal a previously hidden tile so the LMS-unavailable message is
          // visible instead of leaving a stale transparent block indefinitely.
          _setHiddenOff(me, false);
          var serverError = xhr && xhr.responseJSON && xhr.responseJSON.error;
          var text = serverError === LMS_CURL_REQUIRED_ERROR
            ? serverError
            : _lmsText('lms_server_unavailable', 'LMS unavailable');
          me.$mountPoint.find('.dt_state').html(_line('lms-state-label', text));
        });
    },
  };

  Dashticz.register(DT_lms);
})(Dashticz);

//# sourceURL=js/components/lms.js
