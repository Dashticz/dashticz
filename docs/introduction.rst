Introduction
============

Why Dashticz
------------

The Dashboard of Domoticz is quite powerful. The disadvantage is that it's only possible to show information known in Domoticz.
There is where Dashticz steps in. Dashticz is able to show (almost) all Domoticz information.
In addition to that it's possible to show information from all kind of other sources.

Concept
-------

The Dashticz dashboard may consist of several screens, plus an optional
Standby screen.

On every screen you place blocks (also called tiles). A block may be a
Domoticz device, a widget (such as weather, a clock, a calendar or the news),
external content displayed in a frame, or some other special block.

Dashticz 4 offers two ways to build the dashboard:

**Wizard mode**
  Build the dashboard from the browser. Every screen is a grid on which you
  place, move and resize tiles with the mouse, and every tile has its own
  configuration popup. No knowledge of ``CONFIG.js`` is needed.
  See :ref:`WizardMode`.

**Custom mode**
  Describe the dashboard by hand in ``custom/CONFIG.js``: define the blocks,
  put them in columns, and put the columns on screens (or place the blocks on
  a grid). This gives full control over every option and is the way earlier
  Dashticz versions were configured. See :ref:`BasicDashboard`.

Global settings, such as the Domoticz connection, language and theme, can be
changed from the Settings menu in both modes (see :ref:`SettingsMenu`).

The next sections show how to set up your system, how to build a dashboard in
Wizard mode, and how to configure Dashticz, blocks, columns and screens by
hand.
