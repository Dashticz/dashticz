
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
  "16", "RTBF La 2"
  "17", "TV 5"
  "18", "National Geographic"
  "19", "Eurosport 1"
  "21", "Cartoon Network"
  "24", "Film 1 Premiere"
  "25", "MTV"
  "26", "CNN"
  "28", "Sat 1"
  "29", "Discovery Channel"
  "31", "RTL 5"
  "32", "TRT int."
  "34", "Veronica"
  "36", "SBS 6"
  "37", "NET 5"
  "38", "ARTE"
  "39", "Film1 Family"
  "40", "AT 5"
  "46", "RTL 7"
  "50", "3Sat"
  "58", "PRO 7"
  "59", "2BE"
  "60", "VT4"
  "64", "NPO Zapp Xtra  NPO Best"
  "65", "Animal Planet OUD"
  "70", "NPO Cultura"
  "83", "3voor12"
  "86", "BBC World"
  "89", "Nickelodeon"
  "90", "BVN"
  "91", "Comedy Central"
  "92", "RTL 8"
  "99", "Ziggo Sport Select"
  "100", "RTV Utrecht"
  "101", "RTV West"
  "102", "RTV Rijnmond"
  "103", "NH"
  "104", "BBC Entertainment"
  "105", "Private Spice"
  "107", "Film 1 Sundance"
  "108", "RTV Noord"
  "109", "Omrop Frysl&acirc;n"
  "110", "RTV Drenthe"
  "111", "RTV Oost"
  "112", "Omroep Gelderland"
  "113", "Omroep Flevoland"
  "114", "Omroep Brabant"
  "115", "L1 TV"
  "116", "Omroep Zeeland"
  "148", "ESPN"
  "301", "BBC 4" 
  "304", "AMC"
  "305", "Discovery World"
  "306", "Discovery Science"
  "308", "3voor12 Central"
  "309", "3voor12 On Stage"
  "310", "3voor12 Portal"
  "311", "Disney XD"
  "312", "Nick Jr."
  "313", "Boomerang"
  "315", "CBS Reality"
  "317", "Comedy Family"
  "401", "Playboy TV"
  "403", "Goed TV"
  "404", "FOXlife"
  "406", "Ons"
  "407", "OUTTV"
  "408", "RTL Lounge"
  "409", "Rtl crime"
  "410", "101 TV"
  "411", "Film1 Action"
  "412", "Film1 Premiere +1"
  "413", "HISTORY"
  "414", "Investigiation discovery"
  "415", "Travel Channel"
  "416", "Nat Geo Wild"
  "417", "Extreme Sports Channel"
  "419", "Ziggo Sport Golf"
  "420", "Ziggo Sport Racing"
  "422", "Euronews"
  "423", "Al Jazeera Engels"
  "424", "Disney Channel"
  "427", "MTV Brand new"
  "428", "Brava NL"
  "429", "Oranje TV"
  "430", "Film1 Drama"
  "434", "Dusk"
  "435", "24 Kitchen"
  "436", "Eurosport 2"
  "437", "Comedy Central Extra"
  "438", "TLC"
  "439", "Animal Planet"
  "440", "Fox"
  "441", "VRT Ketnet"
  "460", "SBS 9"
  "461", "Pebble TV"
  "462", "Shorts TV"
  "464", "BBC First"
  "465", "RTL Z"
  "466", "Ziggo Sport"
  "467", "Spike"
  "468", "ESPN 2"
  "469", "ESPN 3"
  "470", "ESPN 4"
  "471", "KPN presenteert "
  "472", "Crime + Investigation"
  "473", "Viceland"
  "476", "TV 538"
  "495", "Filmbox.nl"
