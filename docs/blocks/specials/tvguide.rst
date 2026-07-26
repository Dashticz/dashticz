
.. _tvguide:

TV Guide
========

.. image :: tv-guide.png

In ``CONFIG.js`` add::

    var tvguide = {}
    tvguide.dutch = { key:'dutch', icon: 'fas fa-tv', width:12, channels: [1,2,3,4,31,46,92], maxitems: 10 }

And add the tvguide to a column with::

    columns[4] = {
      blocks: [tvguide.dutch]      
    }

When you click on the TV Guide block a *www.tvgids.nl* popup will open (default). You can set your own url via the url parameter (optional).

TV Guide Parameters
-------------------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
    
  * - Parameters
    - Description
  * - title
    - | Title of the TV Guide block.
  * - width
    - | ``1..12`` Width of the block.
  * - layout
    - | Shows or hides the channel name
      | ``0``: Shows the channel name (=default)
      | ``1``: Hides the channel name
  * - key
    - | ``'key'``: unique identifier.
  * - icon
    - | ``'fas fa-icon'``: icon to show in the TV Guide block. You choose an icon from the FontAwesome Free set.
  * - image
    - | ``'image.png'``: image to show as icon. Image path is relative to the <dashticz>/img folder.
  * - maxitems
    - | Maximum number of items to show.
  * - url
    - ``'<url>'``: The web address of the page to open in the popup window when clicking the block.
  * - channels
    - | Selected channels. 

The parameter ``channels`` contains an array of the selected channel IDs.  Find the channel ID in the list below:

.. csv-table:: Channel IDs
  :header: ID, Channel
  :widths: 5, 30
  :class: tight-table

  "1", "NPO 1"
  "2", "NPO 2"
  "3", "NPO 3"
  "4", "RTL 4"
  "5", "VRT 1"
  "6", "VRT Canvas"
  "7", "BBC 1"
  "8", "BBC 2"
  "9", "ARD"
  "10", "ZDF"
  "11", "RTL"
  "12", "WDR Fernsehen"
  "13", "NDR Fernsehen"
  "15", "RTBF La 1"
  "16", "RTBF Tipik"
  "17", "TV5MONDE"
  "18", "National Geographic"
  "19", "Eurosport 1"
  "21", "Cartoon Network"
  "24", "Film 1 Premiere"
  "25", "MTV"
  "26", "CNN"
  "27", "Rai Uno"
  "28", "Sat 1"
  "29", "Discovery"
  "31", "RTL 5"
  "32", "TRT World"
  "34", "Veronica"
  "36", "SBS 6"
  "37", "NET 5"
  "38", "ARTE"
  "39", "Film1 Family"
  "40", "AT5"
  "46", "RTL 7"
  "50", "3Sat"
  "58", "PRO 7"
  "60", "Play4"
  "70", "NPO 2 extra"
  "73", "Mezzo"
  "86", "BBC News"
  "87", "TV E"
  "89", "Nickelodeon"
  "90", "BVN"
  "91", "Comedy Central"
  "92", "RTL 8"
  "99", "Ziggo Sport"
  "100", "RTV Utrecht"
  "101", "RTV West"
  "102", "RTV Rijnmond"
  "103", "NH"
  "108", "RTV Noord"
  "109", "Omrop Frysl&acirc;n"
  "110", "RTV Drenthe"
  "111", "RTV Oost"
  "112", "Omroep Gelderland"
  "113", "Omroep Flevoland"
  "114", "Omroep Brabant"
  "115", "L1 TV"
  "116", "Omroep Zeeland"
  "148", "ESPN 1"
  "301", "BBC 4" 
  "306", "Discovery Science"
  "311", "Disney XD"
  "312", "Nick Jr."
  "313", "Cartoonito"
  "315", "CBS Reality"
  "406", "Ons"
  "407", "OUTtv"
  "408", "RTL Lounge"
  "409", "Rtl Crime"
  "410", "NPO 1 extra"
  "411", "Film1 Action"
  "413", "HISTORY"
  "414", "Investigiation Discovery"
  "416", "Nat Geo Wild"
  "417", "Extreme Sports Channel"
  "419", "Ziggo Sport 6"
  "420", "Ziggo Sport 3"
  "422", "Euronews"
  "423", "Al Jazeera Engels"
  "424", "Disney Channel"
  "429", "Oranje TV"
  "430", "Film1 Drama"
  "435", "24Kitchen"
  "436", "Eurosport 2"
  "438", "TLC"
  "439", "Animal Planet"
  "440", "STAR Channel"
  "441", "VRT Ketnet"
  "460", "SBS 9"
  "461", "Pebble TV"
  "462", "Shorts TV"
  "464", "BBC NL"
  "465", "RTL Z"
  "468", "ESPN 2"
  "469", "ESPN 3"
  "470", "ESPN 4"
  "472", "Crime + Investigation"
  "474", "Ziggo Sport 2"
  "475", "INPLUS"
  "476", "TV 538"
  "480", "Veronica/Disney Jr."
  "481", "XITE"
  "482", "Stingray Classica"
  "483", "E! Entertainment"
  "485", "RTL Telekids"
  "486", "Love Nature"
  "487", "CNBC"
  "490", "Ziggo Sport 4"
  "491", "Ziggo Sport 5"
  "494", "NPO Politiek"
  "495", "Filmbox.nl"
  "496", "Paramount Network"
  "497", "HGTV"
  "498", "Canal+ Action"
  "499", "Viaplay TV"
  "500", "Viaplay TV+"
