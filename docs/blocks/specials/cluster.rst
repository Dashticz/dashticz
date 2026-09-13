.. _cluster :

Cluster
=========

A Cluster block shows a fixed list of Domoticz devices as individual rows in
one block. It has two row types, chosen once when the cluster is created (a
single cluster is never a mix of both):

- **Switch** (the default): each row has its own on/off toggle. Unlike a
  :ref:`group`, which shows one combined status and switches every member
  device to the same new state together, each row in a Cluster switches only
  its own device.
- **Temperature**: each row instead shows that device's own temperature
  reading, with no toggle.

Added via the Screen Editor's "Add items" menu -> Cluster, by picking
devices from the same device list used to add a normal device. The row type
buttons filter that list to match: Switch to plain on/off switches
(Domoticz's ``On/Off`` switch type - a cluster row is only ever a simple
toggle), Temperature to plain temperature-reporting devices (Domoticz Type
``Temp``, or one of the Temp+Humidity/Baro combo types). Switching row type
clears any devices already picked, since the two device sets don't overlap -
row type can only be set while creating a cluster; once it has been saved
with devices, the buttons are locked.

Each row's name defaults to that device's own Domoticz name, but can be
overridden per row in either popup - the same as a normal device's own Title
field when adding a device.

Block parameters
----------------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - title
    - ``'<string>'``: Custom title for the block
  * - icon
    - | Defines the icon for this block, choose from: https://fontawesome.com/icons?d=gallery&m=free
      | ``'fas fa-list-check'``
  * - devices
    - | Domoticz device id's shown as rows in this cluster (required, at least one)
      | ``[ 1, 3, 5]``: Devices 1, 3 and 5 are each shown as their own row
  * - titles
    - | Optional: overrides a row's displayed name (the device's own
        Domoticz name is used when absent).
      | ``{ 12: 'Ceiling light' }``: Device 12's row shows "Ceiling light"
  * - mode
    - | Optional: ``'temperature'`` switches every row to a plain
        temperature reading instead of a toggle. Absent (the default) means
        Switch rows.
      | ``'temperature'``
  * - usage
    - | Switch mode only. Optional: maps a device's own idx to a companion
        Domoticz device that reports its power consumption, shown next to
        that row. Many switches (Shelly/Zigbee2MQTT/Sonoff plugs, etc.)
        report their wattage through a *separate* Domoticz device (Type
        ``Usage``, or Type ``General`` with SubType ``kWh``) rather than a
        field on the switch itself - there is no reliable idx relationship
        between the two, so this is picked per row in the Cluster popup
        rather than auto-detected.
      | ``{ 12: 13 }``: Device 12's row also shows device 13's consumption
  * - switchScale
    - | Switch mode only. Optional: a scale factor (``0.3``-``3``) resizing
        the on/off toggle. Absent (the default) means the normal size.
      | ``1.5``: Toggles render at 150% size

Example
-------

A switch cluster::

    blocks['mycluster'] = {
      type: 'cluster',
      title: 'Living room lights',
      devices: [12, 14, 16],
      titles: { 12: 'Ceiling light' },
      usage: { 12: 13 },
      switchScale: 1.5
    }

A temperature cluster::

    blocks['mytempcluster'] = {
      type: 'cluster',
      title: 'Room temperatures',
      mode: 'temperature',
      devices: [21, 22, 23]
    }
