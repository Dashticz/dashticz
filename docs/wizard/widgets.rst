.. _WizardWidgets :

Adding and configuring widgets
==============================

Widgets are the functions of Dashticz that don't come from a single Domoticz
device: weather, clock, calendar, garbage collection, news, cameras and many
more. In Wizard mode you add them from the **Widgets** item of the
:ref:`AddItems`.

The Widgets popup
-----------------

.. image :: ../img/wizard/widgets.png
   :width: 600px

The popup shows every available widget as a tile, in two groups:

**Widgets (once per screen)**
  112, Air Quality, Clock, Domoticz log, Garbage, Google Maps, HP iLO, Moon,
  OpenWeatherMap, PostNL, Radio, Security panel, Sonarr, Spotify,
  Sunrise / Sunset, Traffic information and Weather. Each of these can be
  placed once on a screen.

**Widgets (multiple per screen)**
  Calendar (ICS), Cameras, F1, Graph, iFrame, Lyrion Music Server, News,
  Public transport, Timegraph and XMLTV TV Guide. You can add these more than
  once, each with its own settings.

Click a tile (*Click to add*) to select a widget, and press **Save**. The new
widget appears on the grid as a tile marked *New – not saved yet*; arrange it
and press **Save** in the Layout Editor toolbar to keep it.

The cog in the top right corner of a tile opens the **Widget Config** of that
widget, so you can enter its settings (for example an API key) before you add
it.

.. _WidgetConfig :

Widget Config
-------------

.. image :: ../img/wizard/widget-config.png
   :width: 600px

Open the Widget Config with the cog on the widget's tile in the Layout Editor,
or with the cog on its tile in the Widgets popup. Every Widget Config has the
same layout:

**Display options**
  Switch the **Icon**, **Title** and **Background** of the tile on or off.
  The Sunrise / Sunset widget also has a **Data** button to hide the
  sunrise/sunset times.

**Settings**
  The settings of this widget, in two columns (one column on a phone).
  Widgets with many settings group them under their own headings, for
  example *iCal / Google* and *Text styling* for Garbage. Widgets with a list
  (calendars of the Calendar widget, cameras, radio stations, Timegraph
  values) show one box per entry, with a green **Add …** button below the
  list and a red minus to remove an entry.

**Custom fields**
  Extra block parameters, in the same way as for devices (see
  :ref:`DeviceConfig`).

Press **OK** to store the settings.

.. note:: Some widgets use settings that apply to the whole dashboard, such
   as the OpenWeather API key. In Wizard mode you set these in the Widget
   Config of the widget. In Custom mode they are set in ``CONFIG.js`` or in the
   **Widgets** category of the Settings menu.

The settings of each widget are described on its own page in
:ref:`specialblocks`.
