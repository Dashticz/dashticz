Release Notes
=============

For Dashticz's **beta** version Release Notes go to: https://dashticz.readthedocs.io/en/beta/releasenotes/index.html
For Dashticz's **master** version Release Notes go to: https://dashticz.readthedocs.io/en/master/releasenotes/index.html

Recent changes
---------------

3.6.0 Beta
----------
Beta version, same as 3.6 master.

Updates
  * Update of the external js modules

3.6 Master
----------

Enhancements:
  * New Dashticz config parameter 'swiper_touch_move' to disable/enable swiping the screen on touch
  * Graph: The 'today' button now shows the full day data. The range 'day'still exists as well, which still can be used in custom graphs.
  * Add support for device with subtype 'Current'
  * Popup graphs enabled by default for most block types. To disable a popup graph, add ``graph: false`` to the block definition.

Updates
  * Update FontAwesome to 5.14.0

Fixes
  * Camera block 
  * Garbage: Ophaalkalender (BE) doesn't work anymore. It has been replaced by recycleapp.
  * Security panel home symbol.
  * Garbage: Meerlanden switched to ximmio as garbage data provider
  * Garbage: Fixed method to retrieve data from mijnafvalwijzer
  * Fixed use_favorites config setting. Changed default to false, meaning all devices will be available for Dashticz.
  * Remove CORS for OWM data

3.5.2 Beta
-----------

Enhancements
  * New colorpicker for RGB devices, including support for whites. The ``no_rgb`` setting is absolete. See :ref:`colorpicker`

Fixes
  * Fix for Omrin garbage provider
  * Fix for Venlo garbage provider

Code
  # Update to jquery 3.5.1

3.5.1 Beta
-----------

Enhancements
  * Domoticz textblocks, traffic, trafficinfo, longfonds and public transport now support the block parameters ``url``, ``newwindow``, ``forcerefresh`` and ``password`` giving it the same behavior as a button if you want to open an url on click.

Fixes
  * Change traffic info provider for traffic block

3.5.0 Beta
-----------

Same as 3.5 Master

3.5 Master
--------------

New master release derived from 3.4.10 beta.

See the release notes for the beta releases below for all changes.

3.4.10 (Beta) (7-6-2020)
---------------------------

Enhancements
  * Japanese language support (preliminary)
  * Improved Camera block . See :ref:`cameras`

Fixes
  * Stop called twice for Blinds stop button
  * Improve Dial representation on Android devices
  * Improved graph groupBy function

3.4.9.1 (Beta) (26-5-2020)
--------------------------
Fixes
  * Several bug fixes

3.4.9 (Beta) (25-5-2020)
------------------------

Fixes
  * Improved number formatting for graph header and tooltip. See :ref:`graphNumberFormat`
  * Block definition with custom keys: consistency in block selection for subdevices, CSS class application and function names in custom.js. This may result in a breaking change. See :ref:`v349`

3.4.8 (Beta) (20-5-2020)
------------------------

Enhancements
  * Improved trafficinfo layout

Fixes
  * IE11 support
  * iOS9 support

Code
  * Standardized formatting of source code
  * Removed eslint warnings (first batch)  

3.4.7 (Beta) (18-5-2020)
------------------------

Enhancements
  * Support for Dials. See :ref:`dial`

Fixes
  * Refresh of graph while in standby

3.4.6 (Beta) (13-5-2020)
------------------------

Enhancements
  * Enable graphs for Voltage and Distance devices
  * Parameter ``timeformat`` to configure time format for 'alarmmeldingen'. See :ref:`customalarmmeldingen`
  * TV guide (Dutch: tvgids) made clickable
  * More options to customize the graph header. See :ref:`customheader`

Fixes
  * Fix for ANWB Traffic Info (new API)
  * Fix for recurring calendar events (older than 3 year, without end date)

3.4.5 (Beta) (23-4-2020)
------------------------

Fixes
  * Garbage: Cure moved to 'mijnafvalwijzer'
  * Synchronization Domoticz security panel state
  * Bug fix popup chart refresh

3.4.4 (Beta) (18-4-2020)
-------------------------

Enhancements
  * Add 'Current' Domoticz device type.
  * Improved security panel. See <todo>

Fixes
  * Fix for refresh of Scenes/Groups and some temperature sensors

3.4.3 (Beta) (9-4-2020)
-----------------------

Enhancements
  * New calendar layout. See :ref:`newcalendar`

Fixes
  * Group/scene status refresh
  * Unit parameter, which can be used for formatting the value of some Domoticz devices. See :ref:`formatting`

3.4.2 (Beta) (3-4-2020)
------------------------

Enhancements
  * Add dewpoint block for TempHumBar devices
  * Corona block type
  * Custom header for graph blocks. See :ref:`customheader`
  * Camera block. See :ref:`cameras`

Fixes
  * Calendar recurring events (experimental)

Internal
  * Refactoring blocktypes

3.4.1 (Beta)
---------------

.. note:: Breaking changes. See :ref:`v341` for update instuctions

Redesign
  * Domoticz blocks: inline blocks. Use ``idx`` as parameter in your block definition to indicate the block is a domoticz device. See :ref:`v341`

Enhancements
  * Support for showing a graph more than once on the dashboard.
  * Support for RGBWZ devices
  * Omrin garbage company
  * Calendar: Optionally display start time only by setting ``startonly`` block parameter
  * New block parameter ``password`` to password protect switches, buttons, thermostats, sliders.
  * Filter parameter for the news block. Define as block parameter. Example:
    
  ::  

      blocks['my_news'] {
        feed: 'http://www.nu.nl/rss/Algemeen',
        filter : '5 items',  // to only show the 5 latest news items, or:
        filter: '2 days',    // to only show news items of the last 2 days, or:
        filter: '1 month',   // to only show news items from last month
      }

  * New special block: alarmmeldingen (Dutch). See :ref:`customalarmmeldingen`
  * Update other blocks from ``custom.js`` functions by calling ``Dashticz.setBlock``. See :ref:`setblock`

Fixes
  * Requests to Domoticz will not be send via a websocket connection (not reliable)
  * Fix for Evo devices
  * Improved the height adjustment of a news block with inline images
  * Fix for updating devices via ``getStatus_idx`` in ``custom.js``
  * Fix for initial update of block defined by ``getBlock_<idx>()`` in ``custom.js``

3.4.0 Beta (8-2-2020)
---------------------

Enhancements
  * Websocket interface for Domoticz version > 4.11000 to receive instant device updates. See :ref:`websocket`
  * The News block will show the inline images. By setting the news block parameter 'showimages: false' the inline images will be hidden.  See :ref:`newsconfig`
  * graph and multigraph have been combined into the same graph block. See :ref:`dom_graphs`.

In case you update from 3.3.5 beta: The parameter ``multigraphTypes`` has been replaced by ``graphTypes``

Optimizations
  * Dashticz will only receive the updates for devices that changed since the previous update. This will increase responsiveness. In the previous version Dashticz received all device info at every update (default 5 second cycle).



3.3.5 Beta (28-1-2020)
----------------------

Fixes
  * Garbage Uden
  * Restored PHP5 compatible ical library next to the PHP7 library.
    The PHP5 library is selected automatically on systems with PHP version lower than 7.1.
    The PHP5 library doesn't show yearly recurring events correctly.

3.3.4 Beta (22-1-2020)
----------------------

Enhancements:
  * Multigraph functionality. See :ref:`dom_graphs`.

3.3.3.1 Master (4-2-2020)
-------------------------

Fixes
  * Garbage Uden
  * Reenabled PHP5 calendar module

3.3.3 Master (22-1-2020)
------------------------

Fixes
  * New PHP ical library to solve issue with recurring events. Note: PHP 7.1 or higher is required.

3.3.2 Master (18-1-2020)
------------------------
Master version derived from 3.3.1 beta.

If you are upgrading from a previous master version please read :ref:`v320`.

Additional fixes
  * Fix standby screen in case of single screen.

3.3.1 Beta (13-1-2020)
----------------------

Enhancements
  * Complete dimmer block is clickable (not just the icon)

Fixes
  * Multiple stationclocks
  * Background fill complete screen in case of single screen
  * Add dimmer for RGBWWZ devices
  * TwenteMilieu garbage collection
  * Bar-afvalbeheer garbage collection (for Barendrecht, Rhoon). Use 'barafvalbeheer' as garbage_company.

3.3.0 Beta (5-1-2020)
---------------------

Enhancements
  * Evohome support. See :ref:`Evohome`

Fixes
  * Improved error handling
  * Improved handling of chart data
  * Almere garbage
  * Login screen background image

3.2.1 (10-12-2019)
------------------

Enhancements
  * Addition of special block 'secpanel' which adds a Domoticz like security panel. See :ref:`secpanel`

Fixes
  * Swiper transition effect
  * Update to latest jQuery version to solve security alert

3.2.0
-----------

.. warning :: Breaking changes

Main change:
  * Standardization of the html template for special blocks. See :ref:`v320`

Other changes:
  * Enable swiper for mobile devices
  * Update to swiper 5.2.0. Added the config parameters ``vertical_scroll`` and ``enable_swiper`` to control swiping and scrolling behavior. See :ref:`ConfigParams`
  * Bundle most external dependencies (webpack, babel, package.json)

Fixes
  * Calendar: Improved handling for recurring events
  * Blinds: Fix for custom icons

3.1.2 (26-10-2019)
------------------

Enhancements
  * Improved calendar layout for full day events. Added timezone adjust parameters.

Fixes
  * Fix for loading Dashticz without external network
  * Load Sonarr images via CORS proxy

3.1.1 (15-10-2019)
------------------

Enhancements
  * Show calendar with table formatting by setting blockparameter ``calFormat:1``. See :ref:`calTable`
  * Session Time Out option
  
Fixes
  * Graph for barometer device
  * Almere garbage provider
  * Wind speed unit interpretation in case of non default Domoticz setting
  * Protect parameter for dimmers.
  * Removal of ES6 dependency (introduced by the graph update)

Upgrading from earlier versions:

buttons:
  Use the btnimage parameter instead of the image parameter.
  The parameter ``isimage`` is not used anymore.

3.1.0 (18-9-2019)
-----------------

Enhancements
  * New config setting ``'start_page'`` to set Dashticz start page number
  * New parameter ``'scrollbars'`` to set scrollbars in frame. See :ref:`Frames`
  * New graph module. It's not completely backwards compatible. Especialy styling will be different. See :ref:`dom_graphs`

Fixes
  * Faster initial display of the Dashticz dashboard.

3.0.6 (28-8-2019)
-----------------
Enhancements
  * OpenWeatherMap module: support for using the city id as city name
  * Icon/image options for blocktitles

Fixes
  * Docker PHP timezone
  * News update in standby
  * Robustness install script and makefile
  * Auto restart docker container after reboot
  * Documentation updates (Thanks to HansieNL)

3.0.5 (4-8-2019)
------------------
  * Update of documentation.
  * Improvements in the automatic installation script.

3.0.4 (1-8-2019)
------------------
Main changes:
  * New Domoticz Github location: https://github.com/Dashticz/dashticz
  * New graph options to set the graph appearance. See :ref:`dom_graphs`.

Fixes:
  * OWM Weather layout
  
3.0.3 (20-7-2019)
-----------------
Main changes:
  * Fixed the broken Spotify module
  * Improved layout (icon size for certain screen widths)

3.0.2 (19-7-2019)
-----------------
Main changes:
  * New block parameters (textOn, textOff, imageOn, imageOff, iconOn, iconOff) to control the display of block text, icons and images depending on the device state.

3.0.1 (25-6-2019)
-----------------

Main changes (thanks to Steven):
  * New special block: Traffic information based on providers, ANWB is the first one. See :ref:`trafficinfo`.
  * Additional filter options for the public transport module. See :ref:`publictransport`. 

Fixes:
  * Update of the installation script. See :ref:`AutomaticInstall`

3.0.0 (13-6-2019)
-----------------
This is the first Dashticz v3 release.

Main change: New Domoticz Github location: https://github.com/dashticzv3/dashticz_v3

New functionality:

* Change in ``forcerefresh`` parameter of a button to support cheap Chinese webcams.
* Support for TempBaro device
* Sizing the y-axis of the graph to relevant data
* Adding possibility to draw graph data for Qubino ZMNHTDx Smart meter
* Add bar graph type option.
* Streamplayer: Add class when in playing state to enable styling via custom.css
* Radio streaming image (radio-streaming.png)

Fixes:

* Make index2.html consistent with index.html
* Streamplayer error handling

2.5.9 (11-3-2019)
------------------
New functionality:

* Caching prevention mechanism also applied to button popup frame (``forcerefresh`` parameter)
* Added Air Quality as graph type (and CO2 as graph property)
* Support of RGB dimmers (RGBW and RGBWW dimmers were supported already)
* Added confirmation option for switches (See ``confirmation`` parameter in Domoticz blocks)

Small fix:

* TwenteMilieu garbage pickup dates


2.5.8 (8-3-2019)
----------------
Small fixes:

* Prevent caching of the version info.

2.5.6 and 2.5.7
---------------

* Graph improvements. See :ref:`dom_graphs` for usage description. 

  * Selection of values you want to show in a graph via the graphTypes parameter. See :ref:`dom_blockparameters`.
  * Support for the ``title`` and ``width`` parameter in a graph block.

* Additional mechanism to prevent caching of images in a button via the ``forcerefresh`` parameter. See :ref:`forcerefresh`.

* Change background color for active 'slide' button. See :ref:`slidebutton`.

* Flash on change. See  :ref:`Flashonchange`.
  
  If you have defined the flash parameter for a device-block, then the block will flash on change.
  The formatting of the flash can be modified via the class ``.blockchange`` in your ``custom.css``.

  The parameter ``config['blink_color']`` is (temporarily?) not used anymore.
  (reason: the apply background mechanism didn't work for non-touch devices)

* Improved layout of blinds
* Update of Romanian language
* Update to FontAwesome 5.7.2
* Fix for some RFX meters (incl. water meter)
