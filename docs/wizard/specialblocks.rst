.. _WizardSpecialBlocks :

Special blocks
==============

Besides Domoticz devices and widgets, the :ref:`AddItems` offers a number of
special blocks. Each one opens its own popup. They all start with the same
**Display options** as a device (Icon, Updated, Title), and most of them ask
for a **name**: the key under which the block is stored in ``CONFIG.js``
(``blocks['name']``). The name must be unique.

After **Save** the block appears on the grid as a new tile. Arrange it and
press **Save** in the Layout Editor toolbar to keep it. You can open the popup
again later with the cog on the tile.

Custom devices
--------------

.. image :: ../img/wizard/custom-device.png
   :width: 500px

A Domoticz device that you configure completely yourself.

* **IDX**: the Domoticz device idx, ``s<idx>`` for a scene or group (for
  example ``s3``), or ``v<idx>`` for a user variable (for example ``v3``).
* **Title**: the title of the tile.
* **Device options**: any block parameter as a Field/Setting row. For arrays or
  objects, enter valid JSON.

Multi Device
------------

One tile that shows several values, from the main device and/or from other
devices. Set the **Main IDX**, then add one row per value under **Values**. A
value row without its own IDX uses the main IDX. See :ref:`multi_device`.

Group
-----

Shows several devices in one tile.

* **Group/Scene IDX**: a Domoticz group or scene, as its number (``12``) or as
  ``s12``. Its devices are shown in the tile.
* **Devices**: alternatively, a comma-separated list of Domoticz device IDs
  (used when the Group/Scene IDX is empty).

See :ref:`grouped_devices`.

Cluster
-------

.. image :: ../img/wizard/cluster.png
   :width: 500px

A compact list of devices in one tile, one row per device.

* **Row type**: *Switch* (every row gets its own on/off toggle),
  *Temperature* (every row shows the temperature) or *Other* (every row shows
  the value of a device that is neither a switch nor a temperature sensor).
  The row type can't be changed after the cluster has been saved.
* **Switch size**: scale factor for the toggles, for example ``1.5`` for
  150 %.
* **Font size (px)**: font size of the whole cluster (``8``-``60``).
* **Devices**: choose a device and click **+**. Per row you can enter a custom
  name, choose an icon, and choose a device whose consumption is shown next
  to it.

See :ref:`cluster`.

HTML Block
----------

Shows the contents of an HTML file.

* **HTML file**: the file name in the ``custom/`` folder, for example
  ``widget.html``.
* **Margin**: show the block with or without its normal margin.

See :ref:`customhtml`.

Slide button
------------

.. image :: ../img/wizard/slide-button.png
   :width: 500px

A button with an icon or image and a title that performs an action when you
tap it:

* **Change screen**: go to another screen.
* **Open URL**: open a web page.
* **Open popup block**: show another block in a popup, which closes
  automatically after **Auto close (seconds)**.

A **Password** can be set to protect the button.

Separator
---------

A full-width bar with a title, used to divide a screen into sections. It is
added directly to the screen, without a popup. Use the cog on the tile to
change its title, icon or image.
