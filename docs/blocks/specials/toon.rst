.. _toon :

Toon
====

The Toon widget shows the sensors and controls of a Toon thermostat, as the
Domoticz Toon plugin creates them. The data comes from Domoticz: the devices of
the hardware whose name contains "Toon" are found automatically, so there is
nothing to choose.

It shows the room temperature, the thermostat setpoint with - and + buttons,
the boiler pressure, boiler state and modulation (with a bar), the scene
buttons, the program info and a summer mode button. A device that does not
exist is not shown.

Add the widget via the Screen Editor: "Add items" -> Widgets -> Toon.

Data source
-----------

In the widget settings (cog icon) the setting "Data source" has two choices:

- **Domoticz (automatic)**: the default, as described above.
- **Dashticz (direct connection)**: Dashticz asks the Toon itself, through the
  local API of the rooted Toon (the same API the Domoticz Toon plugin uses).
  Domoticz is not needed. Not every Toon reports every value: a part without
  data is not shown. The summer mode is not available with this source.

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - toonsource
    - ``'domoticz'`` (default) or ``'dashticz'``.
  * - toonhost
    - IP address of the Toon (source ``'dashticz'``).
  * - toonport
    - Port of the Toon. Default ``80``.
  * - toonpoll
    - Refresh interval in seconds (5-600). Default ``30``.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - toonmode
    - Always ``'info'``. This makes the block a Toon tile.

Example
-------

.. code-block:: javascript

  blocks['toon_1'] = {
    title: 'Toon',
    icon: 'fas fa-temperature-half',
    toonmode: 'info'
  };
