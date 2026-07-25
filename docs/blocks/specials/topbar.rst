.. _customtopbar :

Topbar
#######

This module adds a topbar to Dashticz.

Default there will be the name, clock and settings-button presented in the Topbar.
You can customize the Topbar with the following settings in ``CONFIG.js``::

    var columns = {}
    columns['bar'] = {}
    columns['bar']['blocks'] = ['logo','miniclock','settings']

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
   
  * - Item
    - Description
  * - logo
    - Title of Topbar (as defined in config['app_title'] = 'Dashticz';)
  * - miniclock
    - Clock in Topbar
  * - settings
    - Device Editor, Visual Layout Editor, Settings & Fullscreen buttons in Topbar

Applicable config-parameters from ``CONFIG.js``:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
   
  * - Parameter
    - Description
  * - app_title
    - | Name of the Dashboard - Title to show in the :ref:`customtopbar`
      | ``'Dashticz'`` = Show 'Dashticz' in the top bar
  * - topbar_timeout
    - | Number of seconds after which the topbar is automatically hidden (0 = always visible)
      | The topbar reappears when the mouse moves to the top of the screen.
      | Example: ``config['topbar_timeout'] = 20;``

Complete example::

    config['topbar_timeout'] = 20;
    config['app_title'] = 'Dashticz';

    var columns = {}
    columns['bar'] = {}
    columns['bar']['blocks'] = ['logo','miniclock','settings']
