Release Notes
=============

For Dashticz's **beta** version Release Notes go to: https://dashticz.readthedocs.io/en/beta/releasenotes/index.html

For Dashticz's **master** version Release Notes go to: https://dashticz.readthedocs.io/en/master/releasenotes/index.html

Recent changes
---------------

.. note:: Dial ring styling changed. See :ref:`v389`.

Enhancements
~~~~~~~~~~~~

* Special blocks: Add class ``empty`` in case the special block is empty. Applicable to alarmmeldingen, calendar, traffic, trafficinfo and train.

Fixes
~~~~~~

* Changed dial styling for ring and blinds text. See :ref:`dialstyling`.
* Dial: P1 decimals configurable via decimals block parameter.

v3.8.9 Beta (23-12-2021)
------------------------

.. note:: Your images in buttons now might scale to the full block width. This is a side effect of the fix of the moon scaling. Reduce the block width in case your image is too wide.

Enhancements
~~~~~~~~~~~~

* Dial: Support for blinds. See :ref:`dialblinds`
* Frame: Add block parameters ``scaletofit`` and ``aspectratio`` to automatically scale the frame content to the block width. See :ref:`Frames`

Fixes
~~~~~~

* Moon image scaling


v3.8.8 Beta (17-12-2021)
------------------------

Fixes
~~~~~~

* Garbage: Recycleapp (BE)
* Dials: Fix for so called splitdial with 0 not at top. For instance: min=-10 and max=50
 
v3.8.7 Beta (5-12-2021)
------------------------

.. note:: Weather icons changed. See :ref:`weathericons`
.. note:: CSS styling for calendar events changed. See :ref:`eventClasses`   

Enhancements
~~~~~~~~~~~~

* Calendar: eventClasses block parameter to customize styling based on event description. See :ref:`eventClasses`
* Weather: New block parameter ``icons`` to set weather icons to 'line', 'linestatic', 'fill','static' or 'meteo'. See :ref:`weathericons`
* New upgrade scripts in Makefile (Documentation to be updated)
  
Fixes
~~~~~~

* Garbage: Recycleapp (BE), Avalex, Suez 


v3.8.6 Beta (22-10-2021)
------------------------

Enhancements
~~~~~~~~~~~~

* Graphs: Now you can also display switch information in your graphs

Fixes
~~~~~~

* Graphs: Fixes in y-axes labeling

v3.8.5 Beta (15-10-2021)
------------------------

Fixes
~~~~~~

* Make door lock switchable. 
* Garbage: Venlo (new website)
* Custom function getStatus will be called twice. Second time after block creation (fixed)
* Weather block: fixed rain rate in hourly forecast
* Graph: Fix for displaying energy values, for instance for P1 devices

v3.8.4 Beta (13-8-2021)
-----------------------

Fixes
~~~~~~

* Calendar fixes (recurring events, multiple events on same moment)
* ANWB traffic info: Change API v1 to v2
* Garbage: Fix for Rova

v3.8.3 Beta (29-5-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Weather: Added layout 4 option. See :ref:`customweather`
* Weather: Colored icons (animated weather icons only). See :ref:`customweather` 
* Weather: show/hide wind dial and wind info, Wind as Beaufort, show/hide first forecast card

Fixes
~~~~~~

* Weather: Changed styling of current weather block (center the three parts)
* Weather: Fix styling of forecast block for white Dashticz template
* Merged changes from master v3.8.0.1 and v3.8.0.2

Code
~~~~~

* Bump Swiper.js from 5.4.5 to 6.4.2

v3.8.2 Beta (24-4-2021)
-----------------------

.. note:: Breaking changes: New weather block.

Enhancements
~~~~~~~~~~~~

* Rewrite of the weather block. See :ref:`customweather`.
  

v3.8.1 Beta (14-4-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Change in auto swipe behavior. See :ref:`autoswipe`.

v3.8.0 Beta (10-4-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Auto slide timer configurable per screen via screen parameter ``auto_slide_page``

* Fix for columns without block parameter
* Fix for icon size for special blocks on screen width < 975 pixels

v3.8.0.2 Master (14-5-2021)
---------------------------

Fixes
~~~~~

* Fix potential error in startup behavior

v3.8.0.1 Master (26-4-2021)
---------------------------

Fixes
~~~~~~

* Standby: Prevent click to activate a Dashticz block while in standby

v3.8 Master (9-4-2021)
----------------------

Master version derived from v3.7.7 Beta.

If your current Dashticz version is lower than v3.7.2 then before upgrading make a copy of custom/custom.css and custom/custom.js first!

See the upgrade instructions at v3.7.2 below.

v3.7.7 Beta (8-4-2021)
------------------------


Fixes
~~~~~~

* Garbage: Repaired Area, EDG, Groningen, Meerlanden

Enhancements
~~~~~~~~~~~~

* P1 Smart Meter: Computed fields 'NettUsage', 'NettCounterToday' and 'NettCounter' which can be used as value in dials.
* Garbage: Set block parameter 'ignoressl' to true to disable https SSL checks.

Code
~~~~

* Update of the external npm modules
  
v3.7.6 Beta (12-3-2021)
------------------------

Enhancements
~~~~~~~~~~~~

.. note:: Breaking changes. See :ref:`v376` for update instuctions

* Several dial enhancements. See :ref:`dialvalues`
* Device hook: Function in custom.js which is called on every device update. See :ref:`devicehook`

Fixes
~~~~~~

* Blinds: Support textOn and textOff block parameters

v3.7.5 Beta (28-2-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* OWM widgets. See :ref:`owmwidgets`

Fixes
~~~~~~

* Dials: Fix dimmer decimals
* Dials: Improved formatting
* Dials: Improved error handling
* Dials: Support setpoint for default dial

v3.7.4 Beta (20-2-2021)
-----------------------

Fixes
~~~~~~

* Fix for Spotify block (removed the additional dummy block)
* Spotify: Improved playlist popup layout
* Improved error handling in PHP modules for calendar and garbage
* Dials: Resize disabled (to prevent size changes after first rendering)
* Garbage: block with company: 'ical' will now be detected correctly as Garbage block instead of Calendar
* Garbage: recycleapp.be
* Colorpicker: Add support for Hue RGBWW device by adding mode:1 block parameter

Enhancements
~~~~~~~~~~~~

* Dial: block parameter ``iconSwitch`` to set the fontawesome icon to use for an on/off switch
* Dials: Support added for text devices and for dials without device. 
* Dials: Text devices will be recognized correctly in default dial as well, meaning you can combine several text devices into one dial.
* Dials: Set number of decimals with ``decimals`` parameter
* Garbage will be sorted in the same order as ``garbage`` block parameter (or ``config['garbage']``)

v3.7.3 beta (24-1-2021)
-----------------------

.. note :: Make a backup of CONFIG.js, custom.css and custom.js

Code
~~~~

* Redesign internal block framework
* Removed old calendar block 'icalendar' and calendarurl config setting

Enhancements
~~~~~~~~~~~~

* Calendar: (New calendar block, layout 0 and 1 only) The class 'agenda-empty' is applied to the calendar block in case there are no appointments.
* Battery Level indicator for Domoticz devices. Battery icon will be displayed when the battery level is below ``batteryThreshold``. See :ref:`batterylevel`. 
* TV Guide: Block parameter ``layout`` has been added, to display the TV guide with/without channel name. See :ref:`tvguide`
* Graph: Block parameter ``labels`` has been added, to rename the device names that are used in groupByDevice graphs.

Fixes
~~~~~~

* Bugfix security panel lock screen default setting
* Show last update time when last_update is set as block parameter
* Graph: Fix for block parameter aggregate as array
* Calendar: Update icalparser for PHP8 compatibility


3.7.2 Beta (27-12-2020)
-----------------------

.. note:: Update instructions.

I've removed custom/custom.css and custom/custom.js from the Dashticz repository,  because these are user configuration files, and should not be part of the Dashticz repository.

However, that means this update cannot be installed with ``git pull`` directly, because then git will report an error if you have modified one or both files.

To solve this, first make a backup of these two files::

  mv custom/custom.js custom/custom.js.bak
  mv custom/custom.css custom/custom.css.bak

In case you use the custom_2 folder, repeat these steps for that folder::

  mv custom_2/custom.js custom_2/custom.js.bak
  mv custom_2/custom.css custom_2/custom.css.bak

Then update to the latest version as usual::

  git pull

And restore your backups::

  mv custom/custom.js.bak custom/custom.js
  mv custom/custom.css.bak custom/custom.css

And for the custom_2 folder::

  mv custom_2/custom.js.bak custom_2/custom.js
  mv custom_2/custom.css.bak custom_2/custom.css

You only have to do this once: Next updates can be installed with a normal 'git pull'


Enhancements
~~~~~~~~~~~~

* Calendar: New block parameter ``emptytext`` to define the text to show where there are no calendar appointments. Only works for the new calendar block. See :ref:`newcalendar`
* Custom graph: aggregate parameter can be an array to specify different aggregation methods per data element. See :ref:`groupBy`
* Graph: New parameters ``axisRight`` to show the first Y axis on the right (default is ``false``), and ``axisAlternating`` to show Y axes alternating left/right (default: ``true``).
* Support for device (sub)type Managed Counter
* Flipclock: New block parameters showSeconds (true or false) and clockFace (12 or 24)
* Security panel: New block parameters ( ``decorate``, ``headerText``, ``footerText``, ``scale``). See :ref:`secpanel`

Fixes
~~~~~~

* Graph: Fix for data acquistion day graph gas device.
* Colorpicker: Some fixes in warm white/cold white color setting.
* Improved styling of modal popup windows.


3.7.1 Beta (19-12-2020)
-----------------------

Enhancements
~~~~~~~~~~~~

* Graph: Enable graphs for Lux device type
* Popup window: Add ``newwindow: 5`` to open an url as image instead of iframe (doc to be updated)
* Clock: New Hayman clock. Add block 'haymanclock' to a column, or use ``type: 'haymanclock'`` in your block definition.
* Clock: New basicclock, which is the same as the normal clock, but then responsive. (scales with the width)
* Clock parameters: haymanclock, flipclock, stationclock and basicclock all support the block parameters ``size`` to set the width of the clock and the parameter ``scale`` to scale down the width with a relative factor (``scale: 0.6``)

3.7.0 Beta (13-12-2020)
-----------------------

Code
~~~~~

* NPM update, code formatting

3.7 Master (13-12-2020)
------------------------

Master version derived from 3.6.9 Beta

3.6.9 Beta (10-12-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: New garbage block parameter ``maxdays`` to set the number of days to show the garbage collection info (2 means today and tomorrow) 
* Stationclock: New block parameter ``size`` to set the size of the clock. See :ref:`stationclock`
* Stationclock: New configuration parameters. See :ref:`stationclock`

Fixes
~~~~~~

* Garbage: Fix DeAfvalApp (https instead of http)
* Garbage: Add avri as garbage company
* Garbage: add layout as block parameter. Use ``layout: 0`` to format the garbage rows as one string and ``layout: 1`` to use table layout.
* Garbage: Fix Afvalwijzer 2021 data
* Prevent :hover effect for touch devices

3.6.8 Beta (27-11-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: New providers Suez (Arnhem), Blink (Asten, Deurne, Gemert-Bakel, Heeze-Leende, Helmond, Laarbeek, Nuenen, Someren), Purmerend
* Garbage: New provider afvalstoffendienst
* Garbage: New provider GAD
* Colorpicker: Add support for WW dimmers (Philips Hue)
* Chart: For custom graphs you can define the icon to use for each graph button. See :ref:`custom_graph`
* Timegraph: New special block to define a moving time graph. See :ref:`timegraph`
* Garbage: Additional styling. See :ref:`garbage_styling`
* Garbage: New block parameter ``date_separator`` to configure the text between garbage type and date
* Garbage: Format as table. See :ref:`garbage_styling`

Fixes
~~~~~~

* Calendar: Add 'method:0' to your calendar block definition in case you experience issues with recurring events. Only works for the new calendar block. See :ref:`newcalendar`
* Fix for X10 security motion device.

3.6.7 Beta (4-11-2020)
------------------------

Update of the Garbage module. See :ref:`garbage_upgrade` for upgrade information.

3.6.6 Beta (30-10-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Dashticz URL parameters. See :ref:`urlparameters`
* Dials: Set the block parameter ``animation`` to ``true`` or ``false`` to enable/disable dial animations.
* Add ``timeout`` CSS class to Domoticz devices in the timeout state. See :ref:`domoticzStyling`
 
Fixes
~~~~~~~

* Garbage: Fix for Mijnafvalwijzer on iOS
* Disable Dashticz refresh if `config['dashticz_refresh']` is 0
* Bugfix initialization code

3.6.5 Beta (22-10-2020)
------------------------

Fixes
~~~~~~~

* Button: ``newwindow: 3`` handling is fixed.
* Scenes: Switch always on
* Switched to an alternative server to provide the covid-19 data

Enhancements
~~~~~~~~~~~~

* Button, special blocks: Initiate the ``url`` parameter as POST request by setting ``newwindow: 4``
* Add support for Domoticz x10 security sensor
* Dial: Combine data from several devices. See :ref:`genericdial`

3.6.4 Beta (6-10-2020)
----------------------

Fixes
~~~~~

* PV Output Temp device.
  
Update notes
~~~~~~~~~~~~

* The icon for PV Output blocks are not automatically set to 'fas fa-sun' anymore. You still can do this manually in a block definition. In a future version I'll improve the default settings for Domoticz device types.

3.6.3 Beta
-----------

Enhancements
~~~~~~~~~~~~

* Set config setting ``security_panel_lock`` to ``2`` to activate security panel lock in 'Armed Home' mode as well.
* Dial type now enabled for most devices. See :ref:`genericdial`

Fixes
~~~~~

* Remove scroll bar of the modal security panel (security panel lock)
* New config setting ``use_cors`` to enable CORS proxy for OWM. Set to ``true`` on Android 4.4.2.
* Garbage: recycleapp

3.6.2 Beta
----------

Fixes
~~~~~

* Fix for graph issues in 3.6

3.6.1 Beta
----------

Enhancements
~~~~~~~~~~~~

* Custom HTML block. See :ref:`customhtml`

3.6.0 Beta
----------
Beta version, same as 3.6 master.

Code
~~~~~

* Update of the external js modules

3.6 Master
----------

Enhancements
~~~~~~~~~~~~

* New Dashticz config parameter 'swiper_touch_move' to disable/enable swiping the screen on touch
* Graph: The 'today' button now shows the full day data. The range 'day'still exists as well, which still can be used in custom graphs.
* Add support for device with subtype 'Current'
* Popup graphs enabled by default for most block types. To disable a popup graph, add ``graph: false`` to the block definition.

Code
~~~~~

* Update FontAwesome to 5.14.0

Fixes
~~~~~

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
~~~~~~~~~~~~

* New colorpicker for RGB devices, including support for whites. The ``no_rgb`` setting is absolete. See :ref:`colorpicker`

Fixes
~~~~~

* Fix for Omrin garbage provider
* Fix for Venlo garbage provider

Code
~~~~~

* Update to jquery 3.5.1

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
