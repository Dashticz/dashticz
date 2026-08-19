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
  cover: function (block, coverid, artworkUrl) {
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

  function render(me, meta) {
    var $state = me.$mountPoint.find('.dt_state');
    var $existing = $state.find('.lms-block-inner');
    if (!$existing.length) {
      $state.html('<div class="lms-block-inner"><div class="lms-cover"></div><div class="lms-info"></div></div>');
      $existing = $state.find('.lms-block-inner');
    }
    $existing.attr('data-lms-state', meta.state).toggleClass('lms-remote', !!meta.remote);

    // hide_when_off (Wizard's "Hide block when player is off" switch): the
    // player being off is a normal, common state - not an error - so unlike
    // the "unavailable"/"unreachable" messages below, a user can choose to
    // show nothing at all (no icon, no text) rather than "Player off" every
    // time it's powered down.
    var hideWhenOff = me.block.hide_when_off === true && meta.known && !meta.power;
    $existing.toggleClass('lms-hidden-off', hideWhenOff);

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
      return;
    }

    // artwork_url wins when LMS provides one - a radio track's synthetic,
    // negative coverid has no real library artwork (its own cover lookup
    // just returns a generic placeholder icon), while artwork_url is what
    // LMS actually resolved for the currently playing item. See
    // vendor/dashticz/lms/index.php's dashticz_lms_fetch_cover().
    var artworkKey = meta.state === 'play' || meta.state === 'pause'
      ? (meta.artworkUrl ? 'u:' + meta.artworkUrl : (meta.coverid ? 'c:' + meta.coverid : ''))
      : '';
    if (artworkKey === me.lmsArtworkKey) return; // unchanged track: never re-fetch (#9)
    me.lmsArtworkKey = artworkKey;

    if (!artworkKey) {
      _renderCover($cover, null);
      return;
    }
    DT_lms_api.cover(me.block, meta.coverid, meta.artworkUrl)
      .then(function (dataUrl) {
        // The user may have moved on to a newer track while this request was
        // in flight - never let a slow, stale artwork fetch overwrite it.
        if (me.lmsArtworkKey !== artworkKey) return;
        _renderCover($cover, dataUrl);
      })
      .catch(function () {
        if (me.lmsArtworkKey !== artworkKey) return;
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
          // Connection/HTTP failure (server unreachable, auth failed, ...):
          // a distinct message from "player unavailable" above, and never
          // logged to the console on every poll (#18's "do not flood").
          // The one exception is a missing PHP curl extension: unlike a
          // network blip, that never resolves itself on the next poll, so
          // it is shown verbatim (the backend's own fixed, safe message -
          // see vendor/dashticz/lms/index.php) instead of the generic text,
          // so the block itself explains what to fix without needing the
          // Wizard's "Test connection" to be reopened.
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
