.. _WizardMode :

Wizard mode
===========

Wizard mode lets you build the complete dashboard from the browser. You add
Domoticz devices, widgets and special blocks from menus, place them on a grid,
and set their options in popups. Dashticz writes everything to
``custom/CONFIG.js`` for you.

.. image :: ../img/wizard/dashboard.png
   :width: 700px

The topbar
----------

.. image :: ../img/wizard/topbar.png

In Wizard mode the topbar contains, from left to right:

.. list-table::
  :header-rows: 1
  :widths: 10, 30
  :class: tight-table

  * - Control
    - Description
  * - Logo and name
    - The dashboard name you entered in the setup (``config['app_title']``).
  * - **S**, **1**, **2**, …
    - Screen switcher: **S** opens the Standby screen, the numbers open the
      numbered screens. See :ref:`WizardScreens`.
  * - **+** and **−**
    - Add a new screen, or delete the current screen.
  * - Mode icon
    - Shows the active configuration mode (wizard hat = Wizard, sliders =
      Custom). Click it to switch modes, see :ref:`SwitchingModes`.
  * - Magic wand
    - Opens the Screen Editor (the grid Layout Editor) for the current
      screen. See :ref:`LayoutEditor`.
  * - **+** (while editing)
    - Opens the **Add items** menu. Only visible while the Screen Editor is
      open. See :ref:`AddItems`.
  * - Cog
    - Opens the Settings menu, see :ref:`SettingsMenu`.
  * - Fullscreen
    - Toggles full-screen mode.

With a topbar auto-hide time set (``config['topbar_timeout']``), move the mouse
to the top edge of the screen to show the topbar again.

.. _SwitchingModes :

Switching between Wizard and Custom mode
----------------------------------------

Click the mode icon in the topbar and choose **Custom mode** or
**Wizard mode**. Dashticz asks for confirmation and stores the choice as
``config['config_mode']`` (``'wizard'`` or ``'custom'``) in ``CONFIG.js``.

**Custom → Wizard**
  The screen that is currently shown is converted to a grid layout: its
  devices, widgets and blocks are placed as tiles on the grid, and the Screen
  Editor opens so you can arrange them. The grid layout is written as a
  separate, marked section at the end of ``CONFIG.js``. Other screens keep
  their column layout until you open them in the Screen Editor, which asks
  for confirmation before converting that screen as well.

  .. tip:: Make a copy of ``custom/CONFIG.js`` before you switch, so you can
     always go back to your hand-written version.

**Wizard → Custom**
  The dashboard configuration is kept as it is. Only the Screen Editor
  controls are hidden, and you continue to manage the dashboard by editing
  ``CONFIG.js`` yourself.

How Wizard mode stores the configuration
----------------------------------------

The editors write their results into sections of ``CONFIG.js`` that are
marked with comments, for example::

    // [grid-layout-editor-start]
    ...
    blocks['Woonkamer_lamp'] = {"idx":11,"title":"Woonkamer lamp","width":3};
    blocks['Woonkamer_lamp']['grid'] = {x:1, y:1, w:8, h:6};
    ...
    screens[1]['layout'] = 'grid';
    screens[1]['blocks'] = [{key:'Woonkamer_lamp', grid:{x:1, y:1, w:8, h:6}}];
    // [grid-layout-editor-end]

Dashticz rewrites these sections every time you save in an editor. Don't edit
the lines between the markers by hand; your changes will be overwritten. Lines
outside the marked sections are left alone, so you can still add your own
settings to ``CONFIG.js``.

The grid layout itself is described in :ref:`gridlayout` (Screens).

The Wizard mode tools
---------------------

.. toctree::
   :maxdepth: 2

   layouteditor
   devices
   widgets
   specialblocks
   automation
