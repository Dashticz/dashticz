.. _weatherinfo :

Weather info
============

The Weather Info widget shows the rain forecast and the current weather of a
location. It is standalone (no Domoticz device needed) and based on the
`domoticz_weatherinfo <https://github.com/MadPatrick/domoticz_weatherinfo>`_
plugin, with the same texts and options. All data comes from Buienradar: the
rain forecast from the ``raintext`` feed, the current weather from the
measurements of the nearest Buienradar weather station. Both are downloaded server-side (``vendor/dashticz/weatherinfo/index.php``) and
cached, so several connected dashboards share one download.

The tile shows one line, like the Text device of the plugin, with the parts
separated by dots: the rain status (``Het regent nu 0,8 mm/u``, ``Regen
verwacht 1,2 tot 2,4 mm/u``, ``2,4 mm/u regen verwacht om 14:35`` or
``Voorlopig droog``; in English ``Raining now``, ``Rain expected``, ``rain
expected at`` and ``Dry for now``), the temperature, the weather description,
the wind (direction and force in Beaufort, for example ``NW4``) and a weather
icon. Which parts are shown, and in which order, is the *Text parts* setting.

The weather station can be some kilometres away and reports every 10
minutes, while the radar shows the rain at your exact location, so they can
disagree. While the radar reports rain right now and the station still says
clear, cloudy or fog, the widget shows a rain cloud icon and the description
light rain, rain or heavy rain, so the line stays consistent.

The station is the nearest one within 75 km; a value that station does not
measure (temperature or wind) comes from the next nearest station. Buienradar
covers the Netherlands: outside it the widget shows only the rain status (and
a message that there is no weather station nearby). The Dutch description is
the text of Buienradar; the English description is derived from its icon.

The plugin's Rainfall device (the current rain intensity) is an optional extra
row, see ``wishowrainfall``. The accumulated rain (mm) of that device is a
running total in Domoticz and is not shown by the widget.

You can place it several times on one screen, for example for two locations.
Add it via the Screen Editor: "Add items" -> Widgets -> Weather info (in the
"Widgets (multiple per screen)" section). Change the settings of a placed tile
with the cog icon.

Settings
--------

These are block properties. The Screen Editor writes only the ones that differ
from the default. The first column shows the matching option of the plugin.

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - wimode
    - ``'forecast'``. Required: this property makes the block a Weather Info
      widget
  * - wilat, wilon
    - Plugin options *Latitude (lat)* and *Longitude (lon)*. Optional location;
      a comma is accepted as decimal separator. Default: empty, which uses the
      location of Domoticz (Setup -> Settings -> System). Set both or none
  * - wipollminutes
    - Plugin option *Poll-interval (min)*. How often the rain forecast is
      downloaded, ``1``-``60`` minutes. Default: 5. Like in the plugin, the
      current weather is downloaded once every 15 minutes
  * - wilanguage
    - Plugin option *Language*. ``'nl'`` (default) or ``'en'``: the language of
      the status text, the weather description and the wind direction
      (``NO``/``ZW`` or ``NE``/``SW``)
  * - wiparts
    - Plugin option *Text device*, with a free choice: the parts of the text
      and their order, comma separated. Parts: ``status`` (the rain status), ``temp``, ``desc`` (weather description), ``wind``
      and ``logo`` (the weather icon); the parts are shown after each other on one
      row. Default: ``'status,temp,desc,wind,logo'``, the plugin's default. In
      the config of the widget you tick the parts you want and drag the rows
      to set the order
  * - wiicons
    - ``'animated'`` (default): animated SVG weather icons (turning sun, drifting
      clouds, falling rain and snow, flashing lightning; no images needed; the
      animation runs whatever the reduced-motion setting of the system is) or
      ``'emoji'``: the static emoji of the plugin
  * - wishowrainfall
    - ``true``: an extra row with the current rain intensity in mm/h. Default:
      false
  * - wifontsize
    - Optional: font size of the tile in pixels (``8``-``60``), same as the
      font size of the cluster widget. Default: the size of the theme

The plugin's *Debug* option has no equivalent: errors are shown in the tile and
in the browser console.

Example
-------

.. code-block :: javascript

  blocks['weatherinfo_1'] = {
    title: 'Weather',
    width: 4,
    wimode: 'forecast',
    wilanguage: 'en',
    wiparts: 'status,temp,wind,logo'
  };
