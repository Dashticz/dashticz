.. _SettingsMenu :

The Settings menu
=================

Most global settings of Dashticz can be changed from the browser, in both
Wizard and Custom mode. Click the cog in the topbar to open the Settings menu.

.. image :: img/wizard/settings.png
   :width: 700px

Choose a category, change the settings and press **Save**. Dashticz writes the
changed settings to ``custom/CONFIG.js`` as ``config['...']`` lines and
reloads. Every setting corresponds to a config parameter described in
:ref:`dashticzconfiguration`; the small info icon next to a field shows a
short explanation.

.. list-table::
  :header-rows: 1
  :widths: 8, 30
  :class: tight-table

  * - Category
    - Contents
  * - General
    - Domoticz URL and refresh times, login, dashboard name, which Domoticz
      devices to use (favorites, room plan), CORS and PHP paths, update check.
  * - Screen
    - Topbar and clock, start page, swiping and auto-slide between screens,
      graphs, security panel, and the number of columns and row height of
      grid screens.
  * - Theme
    - Theme, background image, colors, font sizes and icon sizes. See below.
  * - Standby
    - Standby delay, standby background and the URLs to call at the start and
      end of standby.
  * - Localize
    - Language, date and time formats, calendar settings, Google Maps
      location, text-to-speech language.
  * - Widgets
    - Only in Custom mode: settings that are shared by all widgets of one type,
      such as API keys. In Wizard mode these are part of each widget's
      :ref:`WidgetConfig`.
  * - Other
    - Thermostat setpoint range and EvoHome settings.
  * - Info
    - Version information of Dashticz, Domoticz, PHP and the operating system,
      and the **Update** control (see below).

Theme
-----

.. image :: img/wizard/theme.png
   :width: 700px

* **Dashticz Theme**: Default, Modern Dark, Liquid Glass Blue,
  Liquid Glass Grey or White.
* **Background image**: choose one of the images from ``img/`` or
  ``img/custom/``, or enter a path or URL.
* **Colors**: the colors of the page and tile backgrounds, borders, buttons and
  texts. Each color has a color picker and an opacity slider.
* **Font size**: the text size of the title bar, device titles, data and the
  last-update time.
* **Icon size**: the size of icons and images, and the width of the icon
  column.

The colors and sizes are stored in ``custom/custom.css`` and override the
selected theme. To change the text size or alignment of one single tile, use
the **Text** options in its :ref:`DeviceConfig`.

Updating Dashticz
-----------------

The **Info** category contains the **Update** control. Choose the branch
(**Main** for the stable version or **Beta**) and press **Run update**. When
the update is complete, reload Dashticz to use the new version. The web server
needs write access to the Dashticz folder for this; otherwise update from the
command line (see :ref:`Installation`).
