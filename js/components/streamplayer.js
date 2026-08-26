/* global _STREAMPLAYER_TRACKS infoMessage Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_streamplayer = {
  init: function () {
    return DT_function.loadCSS('./js/components/streamplayer.css');
  },
  name: 'streamplayer',
  // Path to the m3u file used if present/valid, instead of the tracks config
  m3uPath: 'custom/radio_playlist.m3u',
  // Local logo folder, checked first (filename = tvg-id)
  localLogoDir: 'img/custom/radio/',
  // PHP script that scans the folder once and returns the mapping
  // tvg-id -> real filename (see vendor/dashticz/streamplayer.php)
  localLogoLookup: 'vendor/dashticz/streamplayer.php',
  defaultCfg: function () {
    var defaultTracks = [
      {
        track: 1,
        name: 'Q-music',
        file: 'http://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3',
        // station logo/cover (optional)
        logo: '',
      },
      {
        track: 2,
        name: 'Slam! NonStop',
        file: 'http://stream.radiocorp.nl/web10_mp3',
        logo: '',
      },
      {
        track: 3,
        name: '100%NL',
        file: 'http://stream.100p.nl/100pctnl.mp3',
        logo: '',
      },
      {
        track: 4,
        name: 'NPO Radio 1',
        file: 'http://icecast.omroep.nl/radio1-bb-mp3',
        logo: '',
      },
    ];
    return {
      icon: 'fas fa-broadcast-tower',
      tracks:
        typeof _STREAMPLAYER_TRACKS !== 'undefined'
          ? _STREAMPLAYER_TRACKS
          : defaultTracks,
    };
  },

  // Parses the text content of an m3u/m3u8 file (#EXTINF format)
  // and returns an array of tracks usable by the player:
  // [{ track: 1, name: "Nostalgie", file: "http://...", logo: "" }, ...]
  // Returns an empty array if no valid entry was found.
  parseM3U: function (text) {
    var lines = text.split(/\r?\n/);
    var result = [];
    var current = null;
    var trackNum = 0;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;

      if (line.indexOf('#EXTINF') === 0) {
        var nameMatch = line.match(/tvg-name="([^"]*)"/i);
        var logoMatch = line.match(/tvg-logo="([^"]*)"/i);
        var idMatch = line.match(/tvg-id="([^"]*)"/i);
        var groupMatch = line.match(/group-title="([^"]*)"/i);
        var commaIdx = line.lastIndexOf(',');
        var displayName =
          commaIdx > -1 ? line.substring(commaIdx + 1).trim() : '';

        current = {
          name: (nameMatch && nameMatch[1]) || displayName,
          logo: logoMatch ? logoMatch[1] : '',
          tvgId: idMatch ? idMatch[1] : '',
          group: groupMatch ? groupMatch[1] : '',
        };
      } else if (line.indexOf('#') !== 0 && current) {
        // Stream URL line, associated with the previous #EXTINF block
        trackNum++;
        result.push({
          track: trackNum,
          name: current.name || 'Track ' + trackNum,
          file: line,
          logo: current.logo,
          tvgId: current.tvgId,
          group: current.group,
        });
        current = null;
      }
    }
    return result;
  },

  // Tries to load and parse the custom m3u file.
  // callback(tracks) is called with a valid tracks array,
  // or null if the file is missing/empty/invalid.
  loadM3UPlaylist: function (path, callback) {
    var self = this;
    $.get(path)
      .done(function (data) {
        var tracks = self.parseM3U(data || '');
        if (tracks.length > 0) {
          callback(tracks);
        } else {
          console.log(
            'StreamPlayer: ' +
              path +
              ' found but empty/invalid, falling back to config'
          );
          callback(null);
        }
      })
      .fail(function (jqXHR, textStatus) {
        console.log(
          'StreamPlayer: ' +
            path +
            ' not found (' +
            textStatus +
            '), falling back to config'
        );
        callback(null);
      });
  },

  // Loads, in a single call, the tvg-id -> local logo file mapping.
  // callback(map) always receives an object (empty on failure).
  loadLocalLogos: function (callback) {
    $.getJSON(this.localLogoLookup)
      .done(function (data) {
        callback(data || {});
      })
      .fail(function () {
        console.log('StreamPlayer: unable to load the local logo list');
        callback({});
      });
  },

  run: function (me) {
    var self = this;

    // Generation token: incremented on every run() call for this instance.
    // The async callbacks below check they still match the latest generation
    // before acting, to avoid duplicate event handlers if Dashticz re-runs
    // run() while a previous load (m3u / logos) is still in progress.
    me._runToken = (me._runToken || 0) + 1;
    var myToken = me._runToken;

    var html =
      '<div class="playerRoot streamplayer-root">' +
      '<div class="headerWrap streamplayer-header">' +
      '<div class="coverWrap streamplayer-cover-wrap">' +
      '<img class="cover streamplayer-cover" src="" alt="">' +
      '</div>' +
      '<h3 class="station streamplayer-station-name"></h3>' +
      '<div class="coverSpacer streamplayer-spectrum">' +
      '<span></span><span></span><span></span><span></span>' +
      '</div>' +
      '</div>' +
      '<audio class="audio1" preload="none"></audio>' +
      '<div class="stationPopup streamplayer-popup">' +
      '<ul class="stationList streamplayer-list"></ul>' +
      '</div>' +
      '<div class="col-xs-3 transbg hover text-center btnPrev">' +
      '<em class="fas fa-chevron-left fa-small"></em>' +
      '</div>' +
      '<div class="col-xs-3 transbg hover text-center playStream">' +
      '<em class="fas fa-play fa-small stateicon"></em>' +
      '</div>' +
      '<div class="col-xs-3 transbg hover text-center btnNext">' +
      '<em class="fas fa-chevron-right fa-small"></em>' +
      '</div>' +
      '<div class="col-xs-3 transbg hover text-center btnList">' +
      '<em class="fas fa-list fa-small"></em>' +
      '</div>' +
      '</div>';

    $(me.mountPoint + ' .dt_state').html(html);

    var streamelement = me.mountPoint + ' .' + me.name;
    var connecting = null;
    var supportsAudio = !!document.createElement('audio').canPlayType;
    if (!supportsAudio) return;

    // Try the m3u first; if missing/invalid, keep the existing config
    this.loadM3UPlaylist(this.m3uPath, function (m3uTracks) {
      if (myToken !== me._runToken) return; // a newer run() has taken over

      if (!m3uTracks) {
        initPlayer(me.block.tracks);
        return;
      }

      // m3u playlist in use: resolve local logos in a single call
      // and attach them directly to each track before starting.
      self.loadLocalLogos(function (logoMap) {
        if (myToken !== me._runToken) return; // same check as above

        m3uTracks.forEach(function (t) {
          var file = t.tvgId ? logoMap[t.tvgId.toLowerCase()] : null;
          t.localLogo = file ? self.localLogoDir + file : null;
        });
        initPlayer(m3uTracks);
      });
    });

    function initPlayer(tracks) {
      if (!tracks || tracks.length === 0) {
        console.log('StreamPlayer: no station available');
        $(streamelement).html('<p>No radio station configured.</p>');
        return;
      }

      var index = 0,
        playing = false,
        trackCount = tracks.length,
        npTitle = $(streamelement + ' .station'),
        coverImg = $(streamelement + ' .cover'),
        stationPopup = $(streamelement + ' .stationPopup'),
        stationList = $(streamelement + ' .stationList'),
        audio = $(streamelement + ' .audio1')
          .on('play', function () {
            $(streamelement + ' .stateicon').removeClass('fas fa-play');
            $(streamelement + ' .stateicon').addClass('fas fa-pause');
            $(streamelement).addClass('playing');
            playing = true;
            connecting = setTimeout(function () {
              infoMessage('StreamPlayer', 'connecting ... ', 0);
            }, 1000);
          })
          .on('pause', function () {
            $(streamelement + ' .stateicon').removeClass('fas fa-pause');
            $(streamelement + ' .stateicon').addClass('fas fa-play');
            $(streamelement).removeClass('playing');

            playing = false;
          })
          .get(0),
        // eslint-disable-next-line no-unused-vars
        btnPrev = $(streamelement + ' .btnPrev').on('click', function () {
          if (index - 1 > -1) {
            index--;
            loadTrack(index);
          } else {
            index = 0;
            loadTrack(trackCount - 1);
          }
          if (playing) {
            doPlay();
          }
        }),
        // eslint-disable-next-line no-unused-vars
        btnNext = $(streamelement + ' .btnNext').on('click', function () {
          if (index + 1 < trackCount) index++;
          else index = 0;

          loadTrack(index);
          if (playing) {
            doPlay();
          }
        }),
        // eslint-disable-next-line no-unused-vars
        btnPlay = $(streamelement + ' .playStream').on('click', function () {
          if (audio.paused) {
            doPlay();
          } else {
            audio.pause();
          }
        }),
        // eslint-disable-next-line no-unused-vars
        btnList = $(streamelement + ' .btnList').on('click', function (e) {
          e.stopPropagation();
          stationPopup.slideToggle(150);
        }),
        loadTrack = function (id) {
          index = id;
          npTitle.text(tracks[id].name);
          audio.src = tracks[id].file;
          // Local logo (already resolved via loadLocalLogos) takes priority,
          // otherwise fall back to the remote logo from the m3u / config.
          setCover(tracks[id].localLogo || tracks[id].logo);
          stationList
            .find('li')
            .removeClass('selected')
            .filter('[data-index="' + id + '"]')
            .addClass('selected');
        },
        setCover = function (logo) {
          if (!logo) {
            coverImg.hide().attr('src', '');
            return;
          }
          coverImg
            .off('load error')
            .on('load', function () {
              coverImg.show();
            })
            .on('error', function () {
              coverImg.hide().attr('src', '');
            })
            .attr('src', logo);
        },
        doPlay = function () {
          audio
            .play()
            .then(function () {
              clearTimeout(connecting);
              $('.update').remove();
            })
            .catch(function (err) {
              console.log(err);
              console.log(err.message);
              infoMessage('Streamplayer', err.message);
            });
        };

      // Populate the popup with all stations.
      // If at least one track has a group (from m3u group-title), the list
      // is grouped by group and sorted; otherwise it stays a flat list.
      var escapeHtml = function (str) {
        return $('<div>').text(str).html();
      };
      var renderStationItem = function (t, i) {
        var logo = t.localLogo || t.logo;
        var logoHtml = logo
          ? '<img class="streamplayer-list-logo" src="' + logo + '" alt="">'
          : '';
        return (
          '<li data-index="' +
          i +
          '">' +
          '<span class="streamplayer-list-name">' +
          escapeHtml(t.name) +
          '</span>' +
          logoHtml +
          '</li>'
        );
      };

      var hasGroups = tracks.some(function (t) {
        return t.group;
      });

      var listHtml;
      if (!hasGroups) {
        listHtml = tracks.map(renderStationItem).join('');
      } else {
        var groups = {};
        tracks.forEach(function (t, i) {
          var g = t.group || 'Other';
          if (!groups[g]) groups[g] = [];
          groups[g].push({ track: t, index: i });
        });

        var groupNames = Object.keys(groups).sort(function (a, b) {
          // Keep the "Other" bucket (ungrouped tracks) last
          if (a === 'Other') return 1;
          if (b === 'Other') return -1;
          return a.localeCompare(b);
        });

        listHtml = groupNames
          .map(function (g) {
            var items = groups[g].slice().sort(function (a, b) {
              return a.track.name.localeCompare(b.track.name);
            });
            var groupHtml =
              '<li class="streamplayer-list-group">' + escapeHtml(g) + '</li>';
            var itemsHtml = items
              .map(function (item) {
                return renderStationItem(item.track, item.index);
              })
              .join('');
            return groupHtml + itemsHtml;
          })
          .join('');
      }
      stationList.html(listHtml);

      // Cleanly hide a logo image that fails to load
      stationList.on('error', 'img.streamplayer-list-logo', function () {
        $(this).hide();
      });

      // [data-index] excludes group headers, which aren't clickable
      stationList.on('click', 'li[data-index]', function () {
        var id = parseInt($(this).data('index'), 10);
        loadTrack(id);
        stationPopup.hide();
        if (playing) {
          doPlay();
        }
      });

      // Close the popup when clicking outside it or outside the toggle button
      var clickNamespace =
        'click.stationPopup_' +
        (me.mountPoint || '').replace(/[^a-zA-Z0-9]/g, '');
      $(document)
        .off(clickNamespace)
        .on(clickNamespace, function (e) {
          if (
            !$(e.target).closest(
              streamelement + ' .stationPopup, ' + streamelement + ' .btnList'
            ).length
          ) {
            stationPopup.hide();
          }
        });

      loadTrack(index);
    }
  },
};

Dashticz.register(DT_streamplayer);
