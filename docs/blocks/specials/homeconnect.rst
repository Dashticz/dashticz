.. _homeconnect :

Home Connect
============

The Home Connect widget shows the appliances of the `Home Connect plugin for
Domoticz <https://github.com/Rouzax/home-connect-domoticz-plugin>`_ (washing machine,
dryer, coffee machine, ...) in one tile. The appliances are found automatically: you do
not have to enter device idx numbers.

What the tile shows, per appliance:

- an icon (washing machine, dryer, coffee machine, dishwasher, oven, fridge, or a plug for
  anything else), each in its own colour (``.homeconnect-icon-washer`` and so on in
  ``custom.css``), and the name of the appliance. A leading ``Home Connect`` in the device
  name is left out;
- while a program runs: the progress as a small bar in the colour of the appliance icon and a percentage, and *ready at HH:MM*. That time is the one in the
  status of the appliance (*klaar om ongeveer ...*), or else the current time plus the remaining
  time;
- at 100% a check mark;
- a warning when the status of the appliance needs attention (*Actie vereist*, *Fout*, *Wordt
  afgebroken*, *Gepauzeerd*; in English *Action required*, *Error*, *Aborting*, *Paused*), or
  when the appliance has an alert, for example *Drip tray full*. Texts like
  *No active alerts* or *No notification* are not shown.

An appliance that is switched off, or has nothing to report, is left out. The title of the
block is the standard title of a widget.

How the devices are found
-------------------------

The widget takes the devices of the hardware whose name contains ``Home Connect`` and groups
them by name. The plugin names a device ``<appliance> <value>``, for example ``Washer
Progress`` or, in Dutch, ``Wasautomaat Voortgang``. A leading ``$`` is ignored.

.. list-table::
  :header-rows: 1
  :widths: 10 30

  * - Value
    - Device name ends with
  * - Power
    - ``Power`` or ``Aan/uit``
  * - Progress
    - ``Progress`` or ``Voortgang``
  * - Remaining time
    - ``Remaining time``, ``Resterende tijd``, ``Finish time`` or ``Eindtijd``. A number of
      minutes or a text like ``1h 20min``
  * - State
    - ``Status`` or ``State``. A text that starts with ``Klaar`` or ``Finished`` shows the check
      mark, also when there is no progress device. Without a Progress or Remaining time device the
      progress and the ready time are read from this text, for example
      ``Bezig, Katoen, 40%, klaar om ongeveer 16:03``
  * - Alerts
    - ``Notifications`` or ``Meldingen``, and every other alert device of the appliance that
      is not a status, for example ``Drip tray full`` or ``Leeg lekbakjes``. The alert devices
      ``Status``, ``Remote control`` / ``Bediening op afstand`` and the *finished* events
      (``Program finished``, ``Programma klaar``, ...) are not shown as a warning

An appliance is shown while its progress is above 0% (or there is remaining time). The
hardware name is matched on ``Home Connect`` (also ``Home-Connect`` or ``HomeConnect``); when
no device matches, all devices are looked at.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - hcmode
    - ``'appliances'``. Required: this property makes the block a Home Connect widget
  * - hcfontsize
    - Optional: font size of the tile in pixels (``8``-``60``). Default: the size of the theme
  * - hchardware
    - Optional: part of the hardware name of the plugin. Default: ``Home Connect``
  * - hcdebug
    - ``true``: a test view below the rows with the hardware names that Domoticz has and the
      devices that were found per appliance. Default: false
  * - hcip
    - Optional: IP address (or host, or a complete ``http://...`` address) of another Domoticz
      to read the devices from, for testing. The browser reads that Domoticz directly, so it
      must be reachable from the browser (and allow it, no login). Default: the Domoticz of
      the dashboard.
      In the editor choose ``Default Domoticz`` (the address from ``config.js``, hcip and hcport stay
      empty) or ``Custom`` (shows the IP address and port fields)
  * - hcport
    - Optional: port of that Domoticz. Default: ``8080``
  * - hcexclude
    - Optional: names of appliances to hide, separated by commas
  * - hcdevices
    - Optional: per appliance the idx of a device that is not found by its name. The
      fields are ``power``, ``progress``, ``time`` and ``alert``; ``name`` and ``icon`` (``washer``, ``dryer``,
      ``coffee``, ``dishwasher``, ``oven``, ``fridge``, ``plug`` or a Font Awesome class) overrule the name and icon

Example:

.. code-block:: javascript

    blocks['homeconnect'] = {
        title: 'Appliances',
        hcmode: 'appliances',
        hcexclude: 'Fridge',
        hcdevices: {
            'Coffee machine': { alert: 1512, name: 'Koffieautomaat' }
        },
        width: 4
    }

The texts follow the language of Dashticz.

Add it via the Screen Editor: "Add items" -> Widgets -> Home Connect. It can also be added by
hand to the config, as in the example.
