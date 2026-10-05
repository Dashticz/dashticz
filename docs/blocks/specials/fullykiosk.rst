.. _fullykiosk :

Fully Kiosk
===========

The Fully Kiosk widget shows the battery of a tablet that runs
`Fully Kiosk Browser <https://www.fully-kiosk.com/>`_ and controls its charger.
It is based on the `domoticz_fullykiosk plugin
<https://github.com/MadPatrick/domoticz_fullykiosk>`_ and uses the same charge
logic.

The block combines:

- the battery percentage of the tablet (can be hidden);
- the percentage at which the charger is switched next: the stop percentage
  while the charger is on, the start percentage while it is off;
- a switch to turn the charger on or off by hand;
- optionally the other devices of the plugin as extra rows, each with its own
  on/off switch in the settings: charging state (plugged in), screen on/off, screensaver on/off, motion
  sensor on/off, brightness (a 0-100 slider) and a button that loads the start URL of
  the tablet again.

The battery level is read from the Remote Admin API of Fully Kiosk by a
same-origin PHP bridge (``vendor/dashticz/fullykiosk/``), so the tablet only has
to be reachable from the Dashticz server. Enable "Remote Administration" in the
Fully Kiosk settings and, if you set one, enter the Remote Admin password in the
widget. The charger is a normal Domoticz switch (for example a Z-Wave plug) that
you select in the widget settings.

Add it via the Screen Editor: "Add items" -> Widgets -> Fully Kiosk. You can
place it several times, for example one block per tablet. Change the settings of
a placed block with the cog icon.

Charge control
--------------

With *Automatic charge control* on (the default) the widget switches the
charger like the plugin does:

- charging starts at a random percentage between *start from* and *start up to*
  (default 25-30%), and stops at a random percentage between *stop from* and
  *stop up to* (default 80-90%);
- every time the charger is switched, a new random percentage is picked: both
  percentages when charging starts, the start percentage when it stops;
- charging always starts at the *hard minimum* (default 15%) or lower, and
  always stops at the *hard maximum* (default 95%) or higher, and at 100%;
- when the tablet cannot be reached and the charger has been off for 16 hours,
  the charger is switched on as a backup.

The charge control runs in the browser, so only while a dashboard with this
widget is open (normally the one on the tablet itself). Leave the *Charger
switch ID* of the plugin empty when this widget controls the same charger,
otherwise both switch it. The percentages are remembered in the browser, so a
reload keeps the next switch percentage.

Switching the charger by hand with the switch in the block does not stop the
automatic control: the next time a percentage is reached the charger is switched
again.

Settings
--------

These are block properties. The Screen Editor writes only the ones that differ
from the default.

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - fullymode
    - ``'charge'``. Required: this property makes the block a Fully Kiosk
      widget
  * - fullyhost
    - IP address or host name of the tablet. Required
  * - fullyport
    - Port of the Remote Admin interface. Default: 2323
  * - fullypassword
    - Remote Admin password of Fully Kiosk
  * - fullyhttps
    - ``true``: use HTTPS (the self-signed certificate of the tablet is
      accepted). Default: false
  * - fullyswitch
    - Domoticz idx of the charger switch
  * - fullyauto
    - ``false``: no automatic charge control, only show the battery and the
      switch. Default: true
  * - fullystartmin, fullystartmax
    - Range of the random start percentage. Default: 25 and 30
  * - fullystopmin, fullystopmax
    - Range of the random stop percentage. Default: 80 and 90
  * - fullyhardmin
    - Charging always starts at or below this percentage. Default: 15
  * - fullyhardmax
    - Charging always stops at or above this percentage. Default: 95
  * - fullyshowbattery
    - ``false``: hide the battery percentage row. Default: true
  * - fullyshowcharging
    - ``true``: show whether the tablet is plugged in (the Charging device of
      the plugin). Default: false
  * - fullyshowscreen, fullyshowscreensaver, fullyshowmotion, fullyshowbrightness, fullyshowloadurl
    - ``true``: show that extra row (screen, screensaver, motion sensor,
      brightness, load start URL). Default: false
  * - fullyfontsize
    - Font size in pixels (8-60). Default: the size of the theme

Example
-------

.. code-block :: javascript

  blocks['fullykiosk_1'] = {
    title: 'Tablet',
    width: 4,
    fullymode: 'charge',
    fullyhost: '192.168.1.50',
    fullypassword: 'secret',
    fullyswitch: 123
  };
