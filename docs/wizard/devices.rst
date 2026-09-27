.. _WizardDevices :

Adding and configuring devices
==============================

.. _AddItems :

The Add items menu
------------------

Open the Screen Editor (magic wand) and click the **+** in the topbar. The
**Add items** menu shows everything you can place on the current screen:

.. image :: ../img/wizard/add-items.png
   :width: 600px

.. list-table::
  :header-rows: 1
  :widths: 10, 30
  :class: tight-table

  * - Item
    - Description
  * - Add device
    - A Domoticz device. See below.
  * - Widgets
    - Weather, clock, calendar, garbage and many other functions. See
      :ref:`WizardWidgets`.
  * - Custom devices
    - A Domoticz device, scene (``s<idx>``) or user variable (``v<idx>``)
      with your own name and typed options.
  * - Multi Device
    - One tile that combines values from one or more Domoticz devices.
  * - Group
    - The devices of a Domoticz group or scene, or a list of devices, in one
      tile.
  * - Cluster
    - A compact list of switches, temperatures or other values in one tile.
  * - HTML Block
    - The contents of an HTML file from the ``custom/`` folder.
  * - Slide button
    - A button that changes screen, opens a URL or opens a popup.
  * - Separator
    - A full-width title bar to divide the screen into sections. It is placed
      immediately, without a popup.

The special blocks (Custom devices up to Separator) are described in
:ref:`WizardSpecialBlocks`.

.. _DeviceEditor :

The Device Editor
-----------------

**Add device** opens the Device Editor:

.. image :: ../img/wizard/device-editor.png
   :width: 600px

To add a device:

1. Choose the device in the **Add device** list. The list contains all
   Domoticz devices that are not on the screen yet, with their IDX.
2. Optionally change the width (``1``-``12``, default ``3``). The width is
   used as the starting size of the tile; you can resize it later in the
   Layout Editor.
3. Click the green **+**. The device is added to the list above.
4. Repeat for more devices and press **Save**.

The new devices appear on the grid as tiles marked *New – not saved yet*.
Arrange them and press **Save** in the Layout Editor toolbar to keep them.

Devices that report more than one value, such as a temperature/humidity sensor
or an energy meter, appear once per value in the list, for example
``Woonkamer klimaat (1) (IDX 22_1)`` and ``Woonkamer klimaat (2) (IDX 22_2)``.
Add each value you want to show as its own tile.

In the list of configured devices you can:

* change the **Width** and **Title** of a device (leave the title empty to use
  the Domoticz name),
* open its **Device Config** with the cog,
* remove it with the red minus,
* change the order by dragging the handle on the left.

**Back** returns to the Add items menu, **Close** closes the editor without
saving.

.. _DeviceConfig :

Device Config
-------------

The Device Config popup contains all options of one device. Open it with the
cog on a tile in the Layout Editor, or with the cog in the Device Editor list.

.. image :: ../img/wizard/device-config.png
   :width: 600px

When you open Device Config from a tile in the Layout Editor, **OK** saves the
changes to ``CONFIG.js`` right away. When you open it from the Device Editor
list, the changes are saved with the Device Editor's **Save** button.

Display options
~~~~~~~~~~~~~~~

Each button switches one part of the tile on or off. A green button is on.

.. list-table::
  :header-rows: 1
  :widths: 10, 30
  :class: tight-table

  * - Option
    - Description
  * - Icon
    - Show the icon (or image) of the device.
  * - Data
    - Show the value or status of the device.
  * - Updated
    - Show the time of the last update.
  * - Title
    - Show the title of the device.
  * - Background
    - Show the tile background. Switch it off for a transparent tile.

Dial, Bar and Slider
~~~~~~~~~~~~~~~~~~~~

For devices with a value, you can choose a different presentation:

* **Dial** shows the value on a round dial. The remaining dial options (color,
  min/max, subtype, values) can be set as custom fields, see
  :ref:`dial`.
* **Bar** shows the value as a bar divided into segments. Set the number of
  segments with **Steps** (default ``10``).
* **Slider** is available for dimmers and blinds with a percentage. It shows a
  slider with a scale; **Steps** sets the number of scale marks. For blinds,
  **Inverse** swaps the direction (0 % is fully open instead of 100 %).
  Dashticz detects this from the Domoticz device type, so you only need it
  for a device that reports this incorrectly.

Click the active mode again to return to the normal presentation.

Compact selector
~~~~~~~~~~~~~~~~

For a Selector Switch in button style with exactly three levels (for example
Open / Half / Closed), **Compact** shows the title and the three level
buttons on one line as small icon buttons. With **Icon per level** you can
choose the icon of each button, or keep **Automatic**.

Text
~~~~

Set the font size and alignment for this tile only:

* **Title size** and **Value size**, in pixels.
* **Alignment**: theme default, left, center or right.

Empty fields and *Theme default* use the settings of the selected theme (or
the base style). A value set here overrides the theme for this tile only. The
text of the last update keeps the theme size. In ``CONFIG.js`` these options
are stored as ``fontsize_title``, ``fontsize_value`` and ``textalign``.

Automation
~~~~~~~~~~

Rules that change the look of this tile, or show a text in another tile, based
on the status of this device. See :ref:`WizardAutomation`.

Custom fields
~~~~~~~~~~~~~

Custom fields let you set any block parameter that has no button of its own.
Each row has a **Field** (the parameter name) and a **Setting** (the value).
Use the green **+** to add a row and the red **−** to remove one.

* Values are written with their type: ``true``/``false`` become booleans,
  numbers become numbers, and text between ``[`` ``]`` or ``{`` ``}`` is read as
  JSON. Everything else is stored as text.
* While you type a field name, a list of known parameters with a short
  explanation is shown. You can still enter any other name.
* The **title** row is the title of the tile.
* The **Icon** / **Image** row chooses between a Font Awesome icon (for example
  ``fas fa-lightbulb``) and an image. For an image, click the field to pick
  one of the images in the ``img/custom`` folder, or type a file name.

All block parameters are described in :ref:`dom_blockparameters`.
