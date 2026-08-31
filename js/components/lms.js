/* global Dashticz settings language DT_function */
// Lyrion Music Server (LMS) "Now Playing" block. The component keeps
// Dashticz's existing per-block refresh timer, while DT_lms_scheduler below
// deduplicates LMS requests shared by blocks on the same server. Interactive
// transport, volume and power controls use the same backend bridge as status
// polling. Existing cover-icon and per-line text-style support from beta is
// intentionally retained.

// Shared LMS backend bridge, also reused by js/deviceeditor.js for player
// discovery and connection testing.
// eslint-disable-next-line no-unused-vars
var DT_lms_api = {
  _errorMessage: function (jqXHR) {
    return (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.error) || '';
  },

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

  getPlayers: function (block) {
    return this.request(block, ['players', 0, 100], '').then(function (result) {
      if (!result || !Array.isArray(result.players_loop)) {
        throw new Error('LMS player list unavailable');
      }
      return result.players_loop;
    });
  },
};

var STATUS_TAGS = 'tags:aclKN'; // (a)artist, (l)album, (c)coverid, (K)artwork_url, (N)remote_title

// Shared request scheduler. It owns no timer: Dashticz continues to call each
// block's refresh() at block.refresh seconds. The short cache only coalesces
// calls arriving in the same refresh window.
// eslint-disable-next-line no-unused-vars
var DT_lms_scheduler = {
  CACHE_TTL_MS: 1000,
  playersCache: {},
  statusCache: {},

  _key: function (block) {
    return block.server + ':' + block.port;
  },

  _statusKey: function (block, playerid) {
    return this._key(block) + ':' + playerid;
  },

  poll: function (block, playerid, cb) {
    var self = this;
    this._getPlayersMap(block)
      .then(function (playersMap) {
        var playerInfo = playersMap[playerid];

        if (!playerInfo || Number(playerInfo.connected) === 0) {
          cb({
            playerid: playerid,
            connected: 0,
            power: 0,
            known: true,
          });
          return;
        }

        if (Number(playerInfo.power) === 0) {
          cb({
            playerid: playerid,
            connected: 1,
            power: 0,
            player_name: playerInfo.name || playerInfo.player_name || '',
            known: true,
          });
          return;
        }

        self
          ._getStatus(block, playerid)
          .then(function (detail) {
            var merged = $.extend({}, playerInfo, detail || {});
            merged.known = true;
            cb(merged);
          })
          .catch(function () {
            playerInfo.known = true;
            cb(playerInfo);
          });
      })
      .catch(function (playersError) {
        // Backwards-compatible fallback: if an older/mock backend does not
        // expose the server-wide players query, keep the block functional by
        // using the historical direct status request for this player.
        self
          ._getStatus(block, playerid)
          .then(function (detail) {
            cb(detail || {});
          })
          .catch(function (statusError) {
            cb(null, statusError || playersError);
          });
      });
  },

  invalidate: function (block, playerid) {
    delete this.playersCache[this._key(block)];
    if (playerid) delete this.statusCache[this._statusKey(block, playerid)];
  },

  _getPlayersMap: function (block) {
    var self = this;
    var key = this._key(block);
    var entry = this.playersCache[key];
    var now = Date.now();

    if (entry && entry.inFlight) return entry.inFlight;
    if (entry && now - entry.ts < this.CACHE_TTL_MS) {
      return $.Deferred().resolve(entry.data).promise();
    }

    var req = DT_lms_api.getPlayers(block)
      .then(function (playersLoop) {
        var map = self._indexPlayersLoop(playersLoop);
        self.playersCache[key] = { data: map, ts: Date.now() };
        return map;
      })
      .catch(function (err) {
        delete self.playersCache[key];
        throw err;
      });

    this.playersCache[key] = {
      data: (entry && entry.data) || {},
      ts: 0,
      inFlight: req,
    };
    req.always(function () {
      if (self.playersCache[key] && self.playersCache[key].inFlight === req) {
        delete self.playersCache[key].inFlight;
      }
    });
    return req;
  },

  _getStatus: function (block, playerid) {
    var self = this;
    var key = this._statusKey(block, playerid);
    var entry = this.statusCache[key];
    var now = Date.now();

    if (entry && entry.inFlight) return entry.inFlight;
    if (entry && now - entry.ts < this.CACHE_TTL_MS) {
      return $.Deferred().resolve(entry.data).promise();
    }

    var req = DT_lms_api.request(
      block,
      ['status', '-', 1, STATUS_TAGS],
      playerid
    )
      .then(function (detail) {
        self.statusCache[key] = { data: detail, ts: Date.now() };
        return detail;
      })
      .catch(function (err) {
        delete self.statusCache[key];
        throw err;
      });

    this.statusCache[key] = {
      data: (entry && entry.data) || null,
      ts: 0,
      inFlight: req,
    };
    req.always(function () {
      if (self.statusCache[key] && self.statusCache[key].inFlight === req) {
        delete self.statusCache[key].inFlight;
      }
    });
    return req;
  },

  _indexPlayersLoop: function (playersLoop) {
    var map = {};
    (playersLoop || []).forEach(function (player) {
      if (player && player.playerid) map[player.playerid] = player;
    });
    return map;
  },
};

(function (Dashticz) {
  'use strict';

  var VOLUME_STEP = 2;
  var ARTWORK_RETRY_MS = 30000;
  var LMS_CURL_REQUIRED_ERROR =
    'The PHP curl extension is required for the Lyrion Music Server block.';

  // Device Config Title/Artist/Station styling introduced on current beta.
  var LMS_TEXT_STYLE_VARS = {
    title_size: '--lms-title-font-size',
    title_color: '--lms-title-color',
    artist_size: '--lms-artist-font-size',
    artist_color: '--lms-artist-color',
    album_size: '--lms-station-font-size',
    album_color: '--lms-station-color',
    station_size: '--lms-station-font-size',
    station_color: '--lms-station-color',
  };

  function _applyTextStyleVars(me, $el) {
    var el = $el[0];
    if (!el) return;
    Object.keys(LMS_TEXT_STYLE_VARS).forEach(function (blockProp) {
      var cssVar = LMS_TEXT_STYLE_VARS[blockProp];
      var value = me.block[blockProp];
      if (value === undefined || value === null || value === '') {
        el.style.removeProperty(cssVar);
        return;
      }
      el.style.setProperty(
        cssVar,
        /_size$/.test(blockProp) ? value + 'px' : String(value)
      );
    });
  }

  function _esc(value) {
    return $('<div>')
      .text(value === null || typeof value === 'undefined' ? '' : String(value))
      .html();
  }

  function _lmsText(key, fallback) {
    return (language.misc && language.misc[key]) || fallback;
  }

  function normalizeStatus(status, fallbackName) {
    status = status || {};

    if (status.connected === 0 || Number(status.connected) === 0) {
      return {
        playerName: fallbackName || '',
        known: true,
        power: false,
        connected: false,
        state: 'disconnected',
        remote: false,
        station: '',
        artist: '',
        title: '',
        album: '',
        coverid: '',
        artworkUrl: '',
        volume: null,
      };
    }

    var power = Number(status.power) === 1;
    var mode = status.mode || 'stop';
    var remote = Number(status.remote) === 1;
    var track =
      (Array.isArray(status.playlist_loop) && status.playlist_loop[0]) || {};
    var remoteMeta = status.remoteMeta || {};
    var currentTitle = status.current_title || '';

    var meta = {
      playerName: status.player_name || status.name || fallbackName || '',
      known:
        status.known === true ||
        typeof status.mode !== 'undefined' ||
        typeof status.power !== 'undefined',
      power: power,
      connected: true,
      state: !power
        ? 'off'
        : mode === 'play' || mode === 'pause'
          ? mode
          : 'stop',
      remote: remote,
      station: '',
      artist: '',
      title: '',
      album: '',
      coverid: track.coverid || '',
      artworkUrl: track.artwork_url || remoteMeta.artwork_url || '',
      volume:
        typeof status['mixer volume'] !== 'undefined'
          ? Math.max(0, Math.min(100, Number(status['mixer volume'])))
          : null,
    };

    if (!power || meta.state === 'stop') {
      // A stopped/off player must not keep showing the last track (#18).
      return meta;
    }

    if (remote) {
      meta.station = remoteMeta.remote_title || currentTitle;
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

  // Current-beta LMS icon/image handling (#217): keep the generic icon column
  // out of the cover and render the configured icon as an artwork badge.
  function _coverIconHtml(me) {
    var icon = me.block.icon;
    if (icon) return '<em class="' + icon + ' lms-cover-icon"></em>';
    var image = me.block.image;
    if (image)
      return (
        '<img src="img/' +
        image +
        '" class="lms-cover-icon lms-cover-icon-img"/>'
      );
    return '';
  }

  function _skeletonHtml(me) {
    return (
      '<div class="lms-block-inner">' +
      '<div class="lms-cover">' +
      _coverIconHtml(me) +
      '<div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div></div>' +
      '<div class="lms-info"><div class="lms-title">' +
      _esc(_lmsText('loading', 'Loading...')) +
      '</div></div>' +
      '<div class="lms-controls"></div>' +
      '</div>'
    );
  }

  function _renderCover(me, $cover, dataUrl) {
    var iconHtml = _coverIconHtml(me);
    if (!dataUrl) {
      $cover.html(
        iconHtml +
          '<div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div>'
      );
      return;
    }
    $cover.html(iconHtml);
    var $img = $('<img class="lms-cover-img" alt="">');
    $img.on('error', function () {
      $cover.html(
        iconHtml +
          '<div class="lms-cover-placeholder"><em class="fas fa-music" aria-hidden="true"></em></div>'
      );
    });
    $img.attr('src', dataUrl);
    $cover.append($img);
  }

  function _setImportantStyle($nodes, property, value) {
    $nodes.each(function () {
      if (!this || !this.style) return;
      if (value === null) this.style.removeProperty(property);
      else this.style.setProperty(property, value, 'important');
    });
  }

  function _setHiddenOff(me, hidden) {
    var $block = me.$mountPoint
      .find('.lms-block')
      .addBack('.lms-block')
      .first();
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

  var CONTROL_BUTTONS = [
    {
      action: 'power',
      icon: 'fa-power-off',
      labelKey: 'lms_power',
      fallback: 'Power',
    },
    {
      action: 'prev',
      icon: 'fa-step-backward',
      labelKey: 'lms_prev',
      fallback: 'Previous',
    },
    {
      action: 'playpause',
      icon: 'fa-play',
      labelKey: 'lms_playpause',
      fallback: 'Play/Pause',
    },
    {
      action: 'next',
      icon: 'fa-step-forward',
      labelKey: 'lms_next',
      fallback: 'Next',
    },
    {
      action: 'voldown',
      icon: 'fa-volume-down',
      labelKey: 'lms_vol_down',
      fallback: 'Volume down',
    },
    {
      action: 'volup',
      icon: 'fa-volume-up',
      labelKey: 'lms_vol_up',
      fallback: 'Volume up',
    },
  ];

  function _controlsHtml(meta) {
    if (!meta.known || meta.state === 'disconnected') return '';

    var html = '';
    CONTROL_BUTTONS.forEach(function (def) {
      var icon = def.icon;
      var active = false;
      if (def.action === 'playpause') {
        icon = meta.state === 'play' ? 'fa-pause' : 'fa-play';
      } else if (def.action === 'power') {
        active = meta.power;
      }
      var label = _esc(_lmsText(def.labelKey, def.fallback));
      html +=
        '<button type="button" class="transbg hover lms-btn lms-btn-' +
        def.action +
        (active ? ' lms-btn-active' : '') +
        '" data-action="' +
        def.action +
        '" title="' +
        label +
        '" aria-label="' +
        label +
        '"><em class="fas fa-small ' +
        icon +
        '" aria-hidden="true"></em></button>';
    });
    return html;
  }

  function _sendCommand(me, params) {
    DT_lms_api.request(me.block, params, me.block.player).always(function () {
      DT_lms_scheduler.invalidate(me.block, me.block.player);
      DT_lms.refresh(me);
    });
  }

  function _handleControlClick(me, action) {
    var meta = me.lmsLastMeta || {};
    switch (action) {
      case 'power':
        _sendCommand(me, ['power', meta.power ? 0 : 1]);
        break;
      case 'playpause':
        _sendCommand(me, meta.state === 'play' ? ['pause'] : ['play']);
        break;
      case 'stop':
        _sendCommand(me, ['stop']);
        break;
      case 'next':
        _sendCommand(me, ['playlist', 'index', '+1']);
        break;
      case 'prev':
        _sendCommand(me, ['playlist', 'index', '-1']);
        break;
      case 'volup':
        _sendCommand(me, ['mixer', 'volume', '+' + VOLUME_STEP]);
        break;
      case 'voldown':
        _sendCommand(me, ['mixer', 'volume', '-' + VOLUME_STEP]);
        break;
    }
  }

  var LONG_PRESS_MS = 600;

  function _bindControls(me) {
    if (me.lmsControlsBound) return;
    me.lmsControlsBound = true;

    var $state = me.$mountPoint.find('.dt_state');
    var longPressTimer = null;
    var longPressFired = false;

    $state.on('pointerdown', '.lms-btn-playpause', function () {
      longPressFired = false;
      clearTimeout(longPressTimer);
      longPressTimer = setTimeout(function () {
        longPressFired = true;
        _handleControlClick(me, 'stop');
      }, LONG_PRESS_MS);
    });

    $state.on(
      'pointerup pointerleave pointercancel',
      '.lms-btn-playpause',
      function () {
        clearTimeout(longPressTimer);
      }
    );

    $state.on('click', '.lms-btn', function (event) {
      event.preventDefault();
      event.stopPropagation();
      var action = $(this).data('action');
      if (action === 'playpause' && longPressFired) {
        longPressFired = false;
        return; // déjà traité par le long press, on ignore le click playpause
      }
      _handleControlClick(me, action);
    });
  }

  function render(me, meta) {
    _bindControls(me);
    me.lmsLastMeta = meta;

    var $state = me.$mountPoint.find('.dt_state');
    var $existing = $state.find('.lms-block-inner');
    if (!$existing.length) {
      $state.html(
        '<div class="lms-block-inner"><div class="lms-cover"></div><div class="lms-info"></div><div class="lms-controls"></div></div>'
      );
      $existing = $state.find('.lms-block-inner');
    }
    _applyTextStyleVars(me, $existing);
    $existing
      .attr('data-lms-state', meta.state)
      .toggleClass('lms-remote', !!meta.remote);

    var hideWhenOff =
      me.block.hide_when_off === true && meta.known && !meta.power;
    _setHiddenOff(me, hideWhenOff);

    var $info = $existing.find('.lms-info');
    var $controls = $existing.find('.lms-controls');
    if (hideWhenOff) {
      $info.empty();
      $controls.empty();
    } else {
      var lines = '';
      if (!meta.known) {
        lines = _line(
          'lms-state-label text-center',
          _lmsText('lms_player_unavailable', 'Player unavailable')
        );
      } else if (meta.state === 'disconnected') {
        lines = _line(
          'lms-state-label text-center',
          _lmsText('lms_player_disconnected', 'Player disconnected')
        );
      } else if (!meta.power) {
        lines = _line(
          'lms-state-label text-center',
          _lmsText('lms_player_off', 'Player off')
        );
      } else if (meta.state === 'stop') {
        lines = _line(
          'lms-state-label text-center',
          _lmsText(
            'mediaplayer_nothing_playing',
            'Nothing is playing right now'
          )
        );
      } else {
        lines += _line('lms-title', meta.title);
        lines += _line('lms-artist', meta.artist);
        lines += _line('lms-album', meta.album);
        lines += _line('lms-station', meta.station);
        if (meta.state === 'pause') {
          lines += _line(
            'lms-state-label lms-paused',
            _lmsText('lms_paused', 'Paused')
          );
        }
      }

      $info.html(
        lines ||
          _line(
            'lms-state-label text-center',
            _lmsText('lms_player_unavailable', 'Player unavailable')
          )
      );
      $controls.html(_controlsHtml(meta));
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
      _renderCover(me, $cover, null);
      return;
    }

    if (me.lmsArtworkLoadedKey === artworkKey) return;
    if (me.lmsArtworkRequestKey === artworkKey) return;
    if (
      me.lmsArtworkRetryKey === artworkKey &&
      me.lmsArtworkRetryAt &&
      Date.now() < me.lmsArtworkRetryAt
    )
      return;

    if (me.lmsArtworkRetryKey !== artworkKey) {
      me.lmsArtworkRetryKey = '';
      me.lmsArtworkRetryAt = 0;
    }

    me.lmsArtworkRequestKey = artworkKey;
    DT_lms_api.cover(me.block, me.block.player, meta.coverid, meta.artworkUrl)
      .then(function (dataUrl) {
        if (me.lmsArtworkRequestKey === artworkKey)
          me.lmsArtworkRequestKey = '';
        if (me.lmsArtworkCurrentKey !== artworkKey) return;
        if (dataUrl) {
          me.lmsArtworkLoadedKey = artworkKey;
          me.lmsArtworkRetryKey = '';
          me.lmsArtworkRetryAt = 0;
          _renderCover(me, $cover, dataUrl);
        } else {
          me.lmsArtworkLoadedKey = '';
          me.lmsArtworkRetryKey = artworkKey;
          me.lmsArtworkRetryAt = Date.now() + ARTWORK_RETRY_MS;
          _renderCover(me, $cover, null);
        }
      })
      .catch(function () {
        if (me.lmsArtworkRequestKey === artworkKey)
          me.lmsArtworkRequestKey = '';
        if (me.lmsArtworkCurrentKey !== artworkKey) return;
        me.lmsArtworkLoadedKey = '';
        me.lmsArtworkRetryKey = artworkKey;
        me.lmsArtworkRetryAt = Date.now() + ARTWORK_RETRY_MS;
        _renderCover(me, $cover, null);
      });
  }

  var DT_lms = {
    name: 'lms',
    canHandle: function (block) {
      return block && block.type === 'lms';
    },
    init: function () {
      return DT_function.loadCSS('./js/components/lms.css');
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
        me.$mountPoint
          .find('.dt_state')
          .html(
            _line(
              'lms-state-label text-center',
              _lmsText('lms_server_unavailable', 'LMS unavailable')
            )
          );
        return;
      }

      DT_lms_scheduler.poll(
        me.block,
        me.block.player,
        function (rawStatus, serverError) {
          if (!rawStatus) {
            _setHiddenOff(me, false);
            serverError = DT_lms_api._errorMessage(serverError);
            var text =
              serverError === LMS_CURL_REQUIRED_ERROR
                ? serverError
                : _lmsText('lms_server_unavailable', 'LMS unavailable');
            me.$mountPoint
              .find('.dt_state')
              .html(_line('lms-state-label text-center', text));
            return;
          }
          render(me, normalizeStatus(rawStatus, me.block.title));
        }
      );
    },
  };

  Dashticz.register(DT_lms);
})(Dashticz);

//# sourceURL=js/components/lms.js
