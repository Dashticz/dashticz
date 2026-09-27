.. _LayoutEditor :

Screen Editor and Layout Editor
===============================

In Wizard mode every screen is a free-positioned grid. You place tiles
(Domoticz devices, widgets and special blocks) on that grid, and change their
position and size with the Layout Editor.

Opening the editor
------------------

Click the magic wand in the topbar. The Screen Editor opens for the screen
that is currently shown:

.. image :: ../img/wizard/layout-editor.png
   :width: 700px

* The grid lines become visible.
* Every tile gets its own controls (see below).
* A **+** button appears in the topbar to add new items, see :ref:`AddItems`.
* A toolbar at the bottom of the screen shows **Cancel** and **Save**.

While the editor is open, the normal buttons of the tiles (switching a lamp,
opening a graph) are disabled, so you can drag tiles without switching
anything. They work again as soon as the editor is closed.

Tile controls
-------------

.. list-table::
  :header-rows: 1
  :widths: 10, 30
  :class: tight-table

  * - Control
    - Description
  * - Drag the tile
    - Move the tile to another grid cell. Dragging towards the bottom adds
      extra rows, and the screen scrolls when you approach the top or bottom
      edge.
  * - Striped corner (bottom right)
    - Drag to change the width and height of the tile.
  * - Position label
    - Shows the current position and size, for example ``x9 y1 · 8×6``: column
      9, row 1, 8 columns wide and 6 rows high.
  * - Cog (top left)
    - Opens the configuration popup of the tile: Device Config for devices
      (see :ref:`DeviceConfig`), Widget Config for widgets (see
      :ref:`WidgetConfig`), or the popup of a special block.
  * - Red minus (top right)
    - Removes the tile from the screen, after confirmation.

Saving
------

Press **Save** in the bottom toolbar to store the new positions and sizes in
``CONFIG.js``. **Cancel** restores the positions from before you opened the
editor.

New tiles that you add while the editor is open are shown with the label
*New – not saved yet*. They are only kept after you press **Save**.

Grid size
---------

By default a screen is 24 columns wide and every row is 20 pixels high, with 5
pixels between tiles. The number of columns and the row height can be changed
for all grid screens in the Settings menu (**Screen**), or per screen in
``CONFIG.js`` (see :ref:`gridlayout`).

.. note:: Changing the number of columns or the row height after tiles were
   placed changes their size on screen, so you will usually have to rearrange
   them.

On a narrow screen (less than 768 pixels wide, for example a phone), the tiles
of a grid screen are shown below each other in one full-width column.

.. _WizardScreens :

Screens and the Standby screen
------------------------------

The screen switcher in the topbar shows one button per screen:

* **1**, **2**, … open the numbered screens. The Screen Editor and the
  **Add items** menu always work on the screen that is currently shown.
* **+** adds a new, empty screen with the next number, and opens it.
* **−** deletes the current screen, after confirmation. Screen 1 can't be
  deleted.
* **S** opens the Standby screen. Open the Screen Editor while the Standby
  screen is shown to decide which tiles are visible in standby. When Dashticz
  should switch to standby automatically is set in the Settings menu
  (**Standby**, ``config['standby_after']``).

You can also swipe between screens, or let Dashticz switch screens
automatically (see :ref:`autoswipe`).
