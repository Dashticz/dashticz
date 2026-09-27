.. _FirstRun :

First start
===========

When you open Dashticz for the first time, there is no ``custom/CONFIG.js`` yet.
Dashticz then starts a short setup instead of the dashboard.

Write access
------------

Dashticz first checks that the web server can write to the ``custom/`` folder.
The setup, the editors and the Settings menu all save their changes to
``custom/CONFIG.js`` (and to ``custom/custom.css`` / ``custom/custom.js`` for
theme colors and automations), so write access is required.

If the check fails, a **Configuration permissions** dialog explains what is
wrong. Correct the file permissions and press **Check again**. The automatic
installer (see :ref:`Installation`) sets these permissions for you.

Setup wizard
------------

.. image :: ../img/wizard/setup-wizard.png
   :width: 600px

The setup wizard asks for the basic settings:

.. list-table::
  :header-rows: 1
  :widths: 10, 30
  :class: tight-table

  * - Field
    - Description
  * - Domoticz URL
    - | Address and port of your Domoticz server, for example ``http://192.168.1.5:8080``.
      | This field is required.
  * - Login required
    - | Enable when Domoticz requires a login. Dashticz then uses the OAuth client ID and secret below
      | (see :ref:`oauth2`).
  * - OAuth client ID / secret
    - | The application name and secret you created in Domoticz for Dashticz.
  * - Dashboard name
    - | The title shown in the topbar.
  * - Language
    - | Language of the dashboard and the editors.
  * - Theme
    - | Look of the dashboard: Modern Dark, Default or White.
      | More themes can be chosen later in the Settings menu.
  * - Topbar auto-hide
    - | Hide the topbar after this many seconds (``0`` = always visible).
      | Move the mouse to the top of the screen to show it again.

Press **Save & Start**. Dashticz writes these settings to ``custom/CONFIG.js``
and reloads.

Choose a configuration mode
---------------------------

.. image :: ../img/wizard/mode-picker.png
   :width: 600px

After the reload Dashticz asks how you want to manage the dashboard:

**Wizard mode**
  Build and adjust the dashboard visually. You add Domoticz devices, widgets
  and special blocks from menus, drag and resize them on a grid, and configure
  them in popups. You never have to edit ``CONFIG.js`` yourself.
  See :ref:`WizardMode`.

**Custom mode**
  Manage the dashboard by hand in ``CONFIG.js``, as in earlier Dashticz
  versions. The Screen Editor stays hidden, but the Settings menu is still
  available. See :ref:`BasicDashboard`.

You can switch between the two modes at any time with the mode icon in the
topbar. See :ref:`SwitchingModes`.

.. note:: When ``config['config_mode']`` is missing from an existing
   ``CONFIG.js``, Dashticz treats it as a Custom mode configuration, so an
   existing hand-written dashboard keeps working after an update.
