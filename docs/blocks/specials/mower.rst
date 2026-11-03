.. _mower :

Mower
=====

The Mower widget shows a Husqvarna robotic mower, as the Domoticz Husqvarna
plugin creates its devices. The data comes from Domoticz: the devices of the
hardware whose name contains "Husqvarna" are found automatically, so there is
nothing to choose.

It shows the state, the location, the battery level (with a bar), a switch to
turn mowing on or off, and the buttons Start and Park. A device that does not
exist is not shown.

Add the widget via the Screen Editor: "Add items" -> Widgets -> Mower.

Data source
-----------

In the widget settings (cog icon) the setting "Data source" has two choices:

- **Domoticz (automatic)**: the default, as described above.
- **Dashticz (direct connection)**: Dashticz asks Husqvarna itself, through the
  Automower Connect API. Domoticz is not needed. Create an application at
  https://developer.husqvarnagroup.cloud/applications and use its client ID and
  client secret (the same as in the Domoticz Husqvarna plugin). The client
  secret stays on the server; the answer of Husqvarna is cached, so several
  dashboards share the API quota (the quota is shared with the Domoticz
  plugin).

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - mowersource
    - ``'domoticz'`` (default) or ``'dashticz'``.
  * - mowerclientid
    - Client ID (application key) of your Husqvarna application.
  * - mowerclientsecret
    - Client secret of your Husqvarna application.
  * - mowername
    - Name of the mower. Empty: the first mower.
  * - mowerpoll
    - Refresh interval in minutes (1-60). Default ``5``.
  * - mowerstart
    - Mowing time in minutes of the Start button (1-1440). Default ``120``.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - mowermode
    - Always ``'info'``. This makes the block a Mower tile.

Example
-------

.. code-block:: javascript

  blocks['mower_1'] = {
    title: 'Husqvarna',
    icon: 'fas fa-robot',
    mowermode: 'info'
  };
