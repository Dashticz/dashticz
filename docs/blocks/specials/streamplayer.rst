.. _customstreamplayer :

Streamplayer
############


For those who like to listen to the radio on Dashticz, there is a Plugin available.

Add the following to your CONFIG.js::

    var _STREAMPLAYER_TRACKS     = [
       {"track":1,"name":"Q-music","file":"http://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3"},
       {"track":2,"name":"538 Hitzone","file":"http://vip-icecast.538.lw.triple-it.nl/WEB11_MP3"},
       {"track":3,"name":"Slam! NonStop","file":"http://stream.radiocorp.nl/web10_mp3"},
       {"track":4,"name":"100%NL","file":"http://stream.100p.nl/100pctnl.mp3"},
       {"track":5,"name":"StuBru","file":"http://mp3.streampower.be/stubru-high.mp3"},
       {"track":6,"name":"NPO Radio 1","file":"http://icecast.omroep.nl/radio1-bb-mp3"},
       {"track":7,"name":"Omroep Brabant","file":"http://streaming.omroepbrabant.nl/mp3"},
    ];

To enable, use the key: 'streamplayer' in the block definitions::

    columns[2]['blocks'] = [1,4,'streamplayer']

.. image :: customstreamplayer.png

To change the color of the Streamplayer buttons add the following to your ``custom.css``::

    div[data-id='streamplayer'] > div {
    background-color: blue !important;
    }

    div[data-id='streamplayer'].playing > div {
    background-color: orange !important;
    }

This last part is applied if the Streamplayer is in playing state.

