Screens
=======

There is the ability to use multiple screens within Dashticz. Each screen can use it's own background.
The background can also automatically change for the part of the day.

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
The screen get sort of grayed out and you can show items on the standby theme. These items MUST have been declared and used in the Dashboard::

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
