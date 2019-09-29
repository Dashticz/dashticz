/* global _STREAMPLAYER_TRACKS infoMessage*/
// eslint-disable-next-line no-unused-vars
function DT_streamplayer(block)  {
    return {
        name: "streamplayer",
        getState: getStateStreamPlayer,
        run: runStreamPlayer
    }
}

function runStreamPlayer(me) {
    var defaultTracks = [
        {"track":1,"name":"Q-music","file":"http://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3"},
        {"track":2,"name":"Slam! NonStop","file":"http://stream.radiocorp.nl/web10_mp3"},
        {"track":3,"name":"100%NL","file":"http://stream.100p.nl/100pctnl.mp3"},
        {"track":4,"name":"NPO Radio 1","file":"http://icecast.omroep.nl/radio1-bb-mp3"},
        ]


    var streamelement = me.mountPoint+' .'+me.name;
    var connecting = null;
    var supportsAudio = !!document.createElement('audio').canPlayType;
    if (supportsAudio) {
            var tracks = typeof _STREAMPLAYER_TRACKS !== 'undefined' ?  _STREAMPLAYER_TRACKS : defaultTracks;
            var index = 0,
            playing = false,
            trackCount = tracks.length,
            npTitle = $(streamelement + ' .dt_state h3'),
            audio = $(streamelement + ' .audio1').bind('play', function () {
                $(streamelement + ' .stateicon').removeClass('fas fa-play');
                $(streamelement + ' .stateicon').addClass('fas fa-pause');
                $(streamelement).addClass('playing')
                playing = true;
                connecting = setTimeout(function () {
                    infoMessage("StreamPlayer", "connecting ... ", 0);
                }, 1000);
            }).bind('pause', function () {
                $(streamelement + ' .stateicon').removeClass('fas fa-pause');
                $(streamelement + ' .stateicon').addClass('fas fa-play');
                $(streamelement).removeClass('playing')

                playing = false;
            }).get(0),
            // eslint-disable-next-line no-unused-vars
            btnPrev = $(streamelement + ' .btnPrev').click(function () {
                if ((index - 1) > -1) {
                    index--;
                    loadTrack(index);
                } else {
                    index = 0
                    loadTrack(trackCount - 1);
                }
                if (playing) {
                    doPlay();
                }
            }),
            // eslint-disable-next-line no-unused-vars
            btnNext = $(streamelement + ' .btnNext').click(function () {
                if ((index + 1) < trackCount) index++;
                else index = 0;

                loadTrack(index);
                if (playing) {
                    doPlay();
                }
            }),
            // eslint-disable-next-line no-unused-vars
            btnPlay = $(streamelement + ' .playStream').click(function () {
                if (audio.paused) {
                    doPlay();
                } else {
                    audio.pause();
                }
            }),
            loadTrack = function (id) {
                npTitle.text(tracks[id].name);
                index = id;
                audio.src = tracks[id].file;
            },
            doPlay = function () {
                audio.play()
                    .then(function () {
                        clearTimeout(connecting);
                        $(".update").remove();
                    })
                    .catch(function (err) {
                        console.log(err);
                        console.log(err.message);
                        infoMessage("Streamplayer", err.message);

                    })
            };
        loadTrack(index);
    }
}

function getStateStreamPlayer() {
    const html = '<h3 class="title"></h3>'
    + '<audio class="audio1" preload="none"></audio>'
    + '<div class="col-xs-4 transbg hover text-center btnPrev">'
    + '<em class="fas fa-chevron-left fa-small"></em>'
    + '</div>'
    + '<div class="col-xs-4 transbg hover text-center playStream">'
    + '<em class="fas fa-play fa-small stateicon"></em>'
    + '</div>'
    + '<div class="col-xs-4 transbg hover text-center btnNext">'
    + '<em class="fas fa-chevron-right fa-small"></em>'
    return html;
}
