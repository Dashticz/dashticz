Screens
=======

There is the ability to use multiple screens within Dashticz. Each screen can use it's own background.
The background can also automatically change for the part of the day.

In Wizard mode the topbar shows square buttons for **S** (Standby), **1** (Screen 1), and any extra screens.
Screen 1 is always present. Use the **+** button to add Screen 2, 3, and so on. Those screens can hold the same kind of device and widget tiles as Screen 1; the Device / Widget / Layout editors apply to the screen that is currently active.

::

    //if you want to use multiple screens, use the code below:

    var screens = {}
    screens[1] = {}
    screens[1]['background'] = 'bg1.jpg';
    screens[1]['background_morning'] = 'bg_morning.jpg';
    screens[1]['background_noon'] = 'bg_noon.jpg';
    screens[1]['background_afternoon'] = 'bg_afternoon.jpg';
    screens[1]['background_night'] = 'bg_night.jpg';
    screens[1]['columns'] = [1,2,3]

    screens[2] = {}
    screens[2]['background'] = 'bg3.jpg';
    screens[2]['background_morning'] = 'bg_morning.jpg';
    screens[2]['background_noon'] = 'bg_noon.jpg';
    screens[2]['background_afternoon'] = 'bg_afternoon.jpg';
    screens[2]['background_night'] = 'bg_night.jpg';
    screens[2]['columns'] = [4,5,6]

Screen parameters
-----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - background
    - | Defines the screen background - the image file must be in the ``<dashticz>/img`` folder
      | ``'bg1.jpg'``
  * - background_morning
    - | Defines the screen background for morning (06:00-10:59) - the image file must be in the ``<dashticz>/img`` folder
      | ``'bg_morning.jpg'``
  * - background_noon
    - | Defines the screen background for noon (11:00-15:59) - the image file must be in the ``<dashticz>/img`` folder
      | ``'bg_noon.jpg'``
  * - background_afternoon
    - | Defines the screen background for afternoon (16:00-19:59) - the image file must be in the ``<dashticz>/img`` folder
      | ``'bg_afternoon.jpg'``
  * - background_night
    - | Defines the screen background for night (20:00-05:59) - the image file must be in the ``<dashticz>/img`` folder
      | ``'bg_night.jpg'``
  * - columns
    - | Defines which columns are shown on this screen
      | ``[1,2,3]``
  * - auto_slide_page
    - | Redefines the audo slide time as set in config['auto_slide_pages'] for this screen.
      | ``3``: The time before auto slide to the next page is 3 seconds.

Free-positioned grid layout
---------------------------

The existing column layout remains the default. To position blocks independently,
set ``layout: 'grid'`` on one screen and list its blocks directly in ``blocks``.
Grid coordinates start at 1. The ``w`` and ``h`` values are measured in grid
columns and rows; the existing block ``height`` property continues to mean pixels.

The grid screen parameters are:

.. list-table::
  :header-rows: 1
  :widths: 8, 8, 24
  :class: tight-table

  * - Parameter
    - Default
    - Description
  * - ``gridColumns``
    - ``24``
    - Number of equal-width columns.
  * - ``rowHeight``
    - ``20``
    - Fixed height of one row in pixels.
  * - ``gap``
    - ``0``
    - Space between rows and columns in pixels.
  * - ``mobileLayout``
    - ``'stack'``
    - Below 768 pixels, show blocks full-width in ``screens[x].blocks`` order.

The ``gridColumns``/``rowHeight`` defaults above can also be changed dashboard-wide
from Settings > Weergave (screen), for every grid screen that doesn't set its own
``gridColumns``/``rowHeight``. This doesn't affect the classic column layout, and
leaving both settings untouched keeps existing installs exactly as they were.
Changing either after blocks were already placed on a grid screen will typically
require repositioning them, since the row/column size they were placed against
has changed.

Each referenced block needs a ``grid`` object with positive integer ``x``, ``y``,
``w`` and ``h`` values. Invalid positions are corrected to safe values and
reported in the browser console. Blocks are never moved to fill empty cells.
Overlaps remain visible and are also reported in the console.

The following complete example deliberately leaves cells empty between blocks::

    var blocks = {};

    blocks['grid_clock'] = {
        type: 'clock',
        grid: {
            x: 1,
            y: 1,
            w: 6,
            h: 3
        }
    };

    blocks['grid_calendar'] = {
        type: 'calendar',
        icalurl: 'https://example.com/calendar.ics',
        maxitems: 5,
        grid: {
            x: 9,
            y: 1,
            w: 10,
            h: 8
        }
    };

    blocks['grid_weather'] = {
        type: 'weather',
        grid: {
            x: 17,
            y: 10,
            w: 8,
            h: 5
        }
    };

    var screens = {};
    screens[1] = {
        layout: 'grid',
        gridColumns: 24,
        rowHeight: 20,
        gap: 5,
        mobileLayout: 'stack',
        blocks: [
            'grid_clock',
            'grid_calendar',
            'grid_weather'
        ]
    };

Grid mode only changes the outer screen layout. Domoticz updates, click handlers,
component refreshes and pixel-based block heights continue to use the normal
block implementation. Content that is taller than its configured grid item can
be scrolled inside that item.

The visual Layout Editor can move and resize named grid blocks. Drag a block to
change ``x`` and ``y``; use its bottom-right handle to change ``w`` and ``h``.
The editor shows extra empty rows, adds more rows while dragging downward and
scrolls when the pointer approaches the top or bottom of the screen.
Save stores the positions as a marked override section in ``CONFIG.js`` and
Cancel restores the previous positions. Blocks must have a safe named
``blocks['name']`` definition so their positions can be persisted. The Device
and Widget editors can add, remove or configure their tiles without changing
the positions of existing grid blocks. New tiles are placed in the first free
grid cells. Normal block buttons remain active whenever no editor is open.

Wizard mode always uses the grid Layout Editor. When an existing columns screen
is opened in the Wizard Layout Editor, Dashticz asks for confirmation and
converts its devices, widgets and inline blocks to named grid blocks. The
initial conversion compacts each block into the first free cells at its current
horizontal position, so a tall neighbouring block no longer creates an empty
row. Switching from Custom to Wizard shows the same confirmation before the
current screen is converted.


Usage
-----

Layout per device
~~~~~~~~~~~~~~~~~

It is now possible to use another column/block setup per resolution.

To setup, use this code in config.js, change according your own needs::

    var screens = {}
    screens['default'] = {}
    screens['default']['maxwidth'] = 1920;
    screens['default']['maxheight'] = 1080;

    screens['default'][1] = {}
    screens['default'][1]['background'] = 'bg9.jpg';
    screens['default'][1]['columns'] = [1,2,4]

    screens['default'][2] = {}
    screens['default'][2]['background'] = 'bg9.jpg';
    screens['default'][2]['columns'] = [5,6,7]

    screens['tablet'] = {}
    screens['tablet']['maxwidth'] = 1024;
    screens['tablet']['maxheight'] = 768;
    screens['tablet'][1] = {}
    screens['tablet'][1]['background'] = 'bg9.jpg';
    screens['tablet'][1]['columns'] = [3,1]

    screens['tablet'][2] = {}
    screens['tablet'][2]['background'] = 'bg9.jpg';
    screens['tablet'][2]['columns'] = [2,4]

.. note :: If you are testing this on your laptop with resizing your browser window, refresh to rebuild the columns/blocks.

Standby Screen
~~~~~~~~~~~~~~
There is the ability to let Dashticz go into standby mode. This defined with the ``config['standby_after']`` parameter in the CONFIG.js file.
The screen get sort of grayed out and you can show items on the standby theme. These items MUST have been declared and used in the Dashboard.

Wizard Standby uses the same free-positioned grid as numbered screens. Its
configuration is stored separately in ``standby_screen``::

    var standby_screen = {
        layout: 'grid',
        gridColumns: 24,
        rowHeight: 20,
        gap: 5,
        mobileLayout: 'stack',
        blocks: ['standby_clock', 'standby_weather']
    };

    blocks['standby_clock'] = {
        type: 'clock',
        grid: {x: 1, y: 1, w: 6, h: 3}
    };

    blocks['standby_weather'] = {
        type: 'weather',
        grid: {x: 10, y: 1, w: 10, h: 5}
    };

Open **S** and then the Layout Editor to drag or resize these blocks. Existing
``columns_standby`` configurations remain supported. In Wizard mode, opening
their Layout Editor asks for confirmation and converts them to
``standby_screen`` grid configuration.

You can also open Standby manually with the **S** button in the topbar screen switcher (and return with **1**, **2**, …)::

    config['standby_after'] = 5;  //Enter standby mode after 5 minutes
    
    var columns_standby = {}

    columns_standby[1] = {}
    columns_standby[1]['blocks'] = ['clock','currentweather_big','weather']  //specify blocks for the standby mode
    columns_standby[1]['width'] = 12;
    
The following config settings are applicable to the standby screen:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Setting
    - Description
  * - standby_after
    - | Enter the amount of minutes
      | ``0`` = No standby mode(default)
      | ``1..1000`` = Switch to standby after `<value>` minutes
  * - standby_call_url'
    - | [URL]
      | Enter the url for adjusting the brightness when entering stand-by mode
  * - standby_call_url_on_end
    - | [URL]
      | Enter the url for adjusting the brightness when exiting stand-by mode


.. _autoswipe:

Auto swipe, auto slide
~~~~~~~~~~~~~~~~~~~~~~~

Two auto swipe modes exist

1. Auto swipe back to a specific screen (default)
2. Auto slide to the next screen

The 'swipe back' mode is selected by setting ``config['auto_swipe_back_after']`` to non zero.
The 'next screen' mode is selected by setting ``config['auto_slide_pages']`` to non zero.

The initial delay before starting 'next screen' mode, can be set via ``config['auto_swipe_back_after']``.

The default timeout which is used for each screen in 'next screen' mode can be defined by ``config['auto_slide_pages']``.
However, you can overrule this for each screen by adding the ``auto_slide_page`` parameter to the screen block.
In case the screen parameter ``auto_slide_page`` is 0 , then this screen will be skipped during auto slide.

All timeouts (auto_swipe_back_after, auto_slide_pages, auto_slide_page) are defined in seconds.

The auto swipe countdown timer will reset after mouse moves and screen touches.

Styling
-------

If you want to be able to scroll the screen vertically add the following to custom.css::

    .swiper-slide {
        overflow: auto!important
    }
