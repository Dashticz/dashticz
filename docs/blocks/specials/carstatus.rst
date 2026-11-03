.. _carstatus :

Car status
==========

The Car status widget shows the status of a car, for example a BMW or a MINI, in its
own tile. The data is read directly from Domoticz devices, for example dummy
devices that are updated by your car integration. Place the widget once per
car; the block title is the name of the car.

What the tile shows:

- **The battery**, always: the progress bar with the percentage at its start
  and the mileage at its end. While the car charges at home, the filled part of
  the bar pulses.
- **Below a line**, the status: *On the road* while driving, *Not home* when the
  car is not at home, and nothing when it is at home.
- **Below that**, only when they apply: *Charging until* followed by the time at
  which the car is charged (now plus the charge time in minutes), and *Doors*
  and *Windows* when one is open (shown as a warning).

The battery level is a progress bar like the one of the :ref:`Mower widget <mower>`,
The color follows the level:
below 15% blinking red, below 30% red, below 50% orange, from 50% the green bar
of the mower with a white percentage, and at 100% a light green percentage. This
widget is for the status of a car from the devices of your car integration; the
:ref:`Car info widget <car>` draws the tyre pressures and doors on a picture of
the car.

Without a title the battery bar, with the percentage at its start and the
mileage at its end, is shown next to the icon.

Add it via the Screen Editor: "Add items" -> Widgets -> Car status. Change the
settings of a placed block with the cog icon.

Settings
--------

These are block properties. The Screen Editor writes only the ones that are
set. Every device option is the idx of a Domoticz device. A device that is not
set is treated as off (or 0).

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - csmode
    - ``'status'``. Required: this property makes the block a Car widget
  * - csbattery
    - Idx of the device with the battery level in percent
  * - csmileage
    - Idx of the device with the mileage in km
  * - csdriving
    - Idx of the switch that is on while the car is driving
  * - cshome
    - Idx of the switch that is on while the car is at home
  * - cscharging
    - Idx of the switch that is on while the car charges
  * - cschargetime
    - Idx of the device with the minutes until the car is charged
  * - csdoor
    - Idx of the device that is ``Open`` (or on) while a door is open
  * - cswindows
    - Idx of the device that is ``Open`` (or on) while a window is open
  * - csdebug
    - ``true``: a test view that always shows the rows *Charging until*, *Doors*
      and *Windows* (also when they do not apply), to check the devices.
      Default: false
  * - csfontsize
    - Optional: font size of the tile in pixels (``8``-``60``). Default: the
      size of the theme

Example:

.. code-block:: javascript

    blocks['bmw'] = {
        title: 'BMW',
        csmode: 'status',
        csbattery: 915,
        csmileage: 912,
        csdriving: 917,
        cshome: 918,
        cscharging: 913,
        cschargetime: 914,
        csdoor: 909,
        cswindows: 910,
        width: 4
    }

The texts (*On the road*, *Not home*, *Charging until*, ...) follow the
language of the dashboard.
