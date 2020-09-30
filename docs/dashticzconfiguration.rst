.. _dashticzconfiguration :

Dashticz configuration
======================

Dashticz can be configured by editing the ``CONFIG.js`` file.
This file you can find in the subfolder ``[dashticz]/custom``.

.. note:: TIP! If CUSTOM POSITIONING is not working check if you have uncomment all lines from the blocks/colums/screens you want.

In the following part, the ``CONFIG.js`` is divided in sections. For each section there will be an explanation how to use.

First part describes setting up the configuration of the Domoticz connection. After that an overview of all configuration parameters can be found.

    .. _config-connection:

Connection
##########
Below the basic configuration to make the connection with Domoticz work.

.. code-block:: bash

    var config = {}
    config['language'] = 'nl_NL'; //or: en_US, de_DE, fr_FR, hu_HU, it_IT, pt_PT, sv_SE
    config['domoticz_ip'] = 'http://192.168.1.3:8084';
    config['domoticz_refresh'] = '5';
    config['dashticz_refresh'] = '60';


==========================        =============
Parameter                         Description
==========================        =============
config['language']                can be used to select the language, Dutch (nl_NL), English (en_US), German (de_DE),French (fr_FR), Hungarian (hu_HU), Italian (it_IT), Portuguese (pt_PT), or Swedish (sv_SV)

config['domoticz_ip']             is the URL to your Domoticz installation (with the correct PORT address)
config['domoticz_refresh']        the refresh rate of Dashticz to get information from Domoticz
config['dashticz_refresh']        the refresh rate of the Dashticz Dashboard
==========================        =============

.. _ConfigParams :

Config parameters
#################

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
   
  * - Parameter
    - Description
  * - domoticz_ip 
    - | IP Address and Portnumber of your Domoticz installation
      | ``'http://192.168.1.3:8084'``
  * - user_name
    - | Domoticz username
      | ``''`` = No username (default)
      | ``'john'`` = Use 'john' as Domoticz username
  * - pass_word
    - | Domoticz password
      | ``''`` = No password (default)
      | ``'secret'`` = Use 'secret' as Domoticz password
  * - loginEnabled
    - | Enable if you want a login form to dashticz
      | ``false`` = No login form (default)
      | ``true`` = Show login form
  * - login_timeout
    - | Time to keep Dashticz logged in
      | ``60`` = Time in minutes
  * - enable_websocket
    - | Enable Domoticz websocket connection. See :ref:`websocket`
      | ``false`` = Dashticz will use a http connection.
      | ``true`` = Dashticz will switch to a websocket connection if the Domoticz version is above 4.11000.     
  * - domoticz_timeout
    - | Time Dashticz is fetching for Domoticz devices during the initial request. After this time Dashticz falls back from websocket to HTTP.
      | ``2000`` = Time in <value> milliseconds (default=2000).
  * - app_title
    - | Name of the Dashboard - Title to show in the :ref:`customtopbar`
      | ``'Dashticz'`` = Show 'Dashticz' in the top bar
  * - domoticz_refresh
    - | Number of seconds to get the information from Domoticz
      | ``5`` = Refresh of Domoticz data every 5 seconds
  * - dashticz_refresh
    - | Number of minutes to refresh the Dashticz dashboard
      | ``60`` = Refresh of the Dashticz dashboard every 60 minutes
  * - default_news_url
    - | URL of the default news feed
      | ``'http://www.nu.nl/rss/algemeen'`` = Example for nu.nl
  * - news_scroll_after
    - | Enter the ammount in seconds (delay)
      | ``5`` = Scroll the news message every 5 seconds
  * - standby_after
    - | Enter the amount of minutes
      | ``0`` = No standby mode(default)
      | ``1..1000`` = Switch to standby after `<value>` minutes
  * - start_page
    - | Page to show after starting Dashticz
      | ``1..100`` = Page number
  * - vertical_scroll
    - | Enable vertical scroll in case Dashticz dashboard height is more than the screen height
      | ``0`` = Disable vertical scroll
      | ``1`` = Enable vertical scroll if swiper is disabled
      | ``2`` = Enable vertical scroll (=default)
  * - enable_swiper
    - | Enable horizontal swiping in case multiple screens have been defined.
      | ``0`` = Swiper disabled
      | ``1`` = Swiper enabled if screen width > 760px
      | ``2`` = Swiper enabled (=default)
  * - swiper_touch_move
    - | Swipe the screen by touch. Only applicable in case swiper is enabled.
      | ``0`` = Swipe by touch disabled
      | ``1`` = Swipe by touch enabled
  * - auto_swipe_back_to
    - | when no activity, swipe back to the selected page
      | ``1..100`` = page number
  * - auto_swipe_back_after
    - | The amount of seconds after which Dashticz will swipe back to the default page, as defined by ``auto_swipe_back_to``
      | ``0`` = No auto swiping back (default)
      | ``1..9999`` = Swipe back after <value> seconds
  * - auto_slide_pages
    - | Loop all pages and change page every x (min. 5) seconds,
      |     set ``config['auto_swipe_back_after'] = 0``
      | ``false`` = No auto slide (default)
      | ``5..9999`` = Auto slide to the next page every <value> second
  * - slide_effect
    - | Control which Screenslider effect you prefer
      | ``'slide'``, ``'fade'``, ``'cube'``, ``'coverflow'``, ``'flip'``
  * - standard_graph
    - | Default Graph shown on the Dashticz Dashboard
      | ``'HOUR'``, ``'MONTH'``, ``'DAY'``
  * - security_panel_lock
    - | If set the Security Panel in Domoticz or Dashticz to 'Arm - Away', then Dashticz will automatically load a full screen panel.
      | ``0`` = Loading Security Panel full screen disabled (default)
      | ``1`` = Loading Security Panel full screen enabled
  * - language
    - | Default language of Dashticz. See the ``lang`` folder for all supported languages.
      | ``'en_us'`` = default
      | ``'nl_NL'``, ``'de_DE'``, ``'...'``
  * - timeformat
    - | Configure the TimeFormat
      | ``'DD-MM-YY HH:mm'`` = default
  * - calendarformat
    - | Configure the Calendar Date/Time format.
      | ``'dd DD.MM HH:mm'`` = default
  * - calendarlanguage
    - | Controls the weather dates and garbage pickup dates language
      | ``'<LANGUAGE>'``
  * - calendarurl
    - ``'<url>'`` = Configure your Calendar URL if only 1 Calendar (ICS)
  * - boss_stationclock
    - | Configure your type of clock
      | ``'NoBoss'``, ``'BlackBoss'``, ``'RedBoss'`` = Default, ``'ViennaBoss'``
  * - gm_api
    - ``[API KEY]`` = API Key to use with the Google Maps functionality
  * - gm_latitude
    - ``[LATITUDE]`` = Enter the Latitude to use within Google Maps
  * - gm_longitude
    - ``[LONGITUDE]`` = Enter the Longitude to use within Google Maps
  * - gm_zoomlevel
    - | Enter the Google Maps zoom level
      | ``1`` = Whole world
      | ``2..14``
      | ``15`` = Most detail
  * - wu_api
    - | ``'[API KEY]'``
      | Your Wundergrond Weather API key. You can get a API key at https://www.wunderground.com/weather/api/d/pricing.html '. ''Edit: You can no longer get a free API key from Wunderground'''
  * - wu_city
    - ``'[CITY]'`` Put here your weather city.
  * - wu_country
    - ``'[COUNTRY]'`` Put here your weather country
  * - wu_name
    - ``'[CITY]'`` Alternative display name of your city
  * - switch_horizon
    - ``'<url>'`` (Only Dutch users) If you have a Ziggo Horizon box, you can set the url of the Horizon box here
  * - host_nzbget
    - ``'[IP ADDRESS:PORT NUMBER]'`` Configure the IP Address and Portnumber of your NZB Host
  * - spot_clientid
    - ``'[CLIENTID]'`` Configure your Spotify Client ID (see also :ref:`customspotify`)
  * - selector_instead_of_buttons
    - | Choose how to show your selector switches
      | ``0`` As buttons
      | ``1`` As dropdown menu
  * - auto_positioning
    - | Configure the ability to define your own positioning for the buttons (in combination with ``config['use_favorites']``)
      | ``0`` Use this if you have defined your own columns
      | ``1`` Default
  * - use_favorites
    - | ``0`` Show all domoticz devices (default)
      | ``1`` Only show Domoticz devices marked as favorite in Domoticz
      | If use auto positioning, then this item should be 1
  * - use_cors
    - | ``0`` Don't use CORS proxy for OpenWeatherMap (default)
      | ``1`` Use CORS proxy for OpenWeatherMap. Needed on Android 4.4.2.
  * - last_update
    - ``0`` / ``1`` To show the time when the device was updated for the last time
  * - hide_topbar
    - | 0 / 1
      | Hide or Show :ref:`customtopbar`
  * - hide_seconds
    - | 0 / 1
      | Show the seconds of the clock
  * - hide_seconds_stationclock
    - | 0 / 1
      | Configure if you like to show seconds in the StationClock
  * - use_fahrenheit
    - | 0 / 1
      | Select temperature in Celcius (Default) of Fahrenheit
  * - use_beaufort
    - | 0 / 1
      | Use Bft instead of m/s for windspeed
  * - translate_windspeed
    - | 0 / 1
      | For windspeed use north northwest instead of NNW
  * - static_weathericons'
    - | 0 / 1
      | Use Static or 'moving'  weather icons
  * - hide_mediaplayer'
    - | 0 / 1
      | When you have a mediaplayer connected, hide it when nothing is playing
  * - selector_instead_of_buttons'
    - | 0 / 1
      | Use buttons for the selector switch in stead of the dropdown menu
  * - settings_icons
    - | ``["settings", "fullscreen"]``
      | Show the given icons if the settings block is selected. Available: "settings", "fullscreen"
  * - shortdate'
    - | 'D MMM'
      | Short format for dates, see https://momentjs.com/ for all options.
  * - longdate
    - | 'D MMMM YYYY'
      | Long format for dates, see https://momentjs.com/ for all options.
  * - shorttime
    - | HH:mm
      | Short format for time, see https://momentjs.com/ for all options.
  * - longtime
    - | HH:mm:ss
      | Long format for time, see https://momentjs.com/ for all options.
  * - weekday
    - | 'dddd'
      | Format to show the weekday, see https://momentjs.com/ for all options.
  * - no_rgb
    - | 0 / 1
      | Hide or show RGB button on switch
  * - colorpicker
    - | 0: No RGB colorpicker, 1: Old style RGB colorpicker, 2: New style RGB colorpicker
      | Choose the default RGB colorpicker for RGB devices
  * - standby_call_url'
    - | [URL]
      | Enter the url for adjusting the brightness when entering stand-by mode
  * - standby_call_url_on_end
    - | [URL]
      | Enter the url for adjusting the brightness when exiting stand-by mode
  * - hide_off_button
    - | 0 / 1
      | Hide off button of selector switch
  * - speak_lang
    - | Text to speech language
      | ``'<LANGUAGE>'`` Language options: de-DE, en-US, es-ES, fr-FR, it-IT, nl-NL, pl-PL, ru-RU
  * - longfonds_zipcode
    - | Longfonds (Dutch air quality check) zipcode.
      | ``'1234AZ'`` Language options
  * - longfonds_housenumber
    - | Longfonds (Dutch air quality check) housenumber
      | ``'123'`` Language options
      

Usage
#####

.. _dom_CORS_proxy:

PHP based CORS proxy
--------------------

To be able to load resources from other domains, like tvguide data and news updates, we need a CORS proxy (Cross Origin Resouce Sharing). Public CORS proxies exist on the internet, like cors-anywhere.herokuapp.com. These public CORS proxies might be slow or not available at all.

A basic PHP based CORS proxy has been integrated into Dashticz.

For normal use just remove the ``config['default_cors_url']`` from your ``CONFIG.js`` and the internal CORS proxy will be used.

If you prefer to use a different CORS proxy you can define it in ``CONFIG.js`` as usual::

    config['default_cors_url'] = 'http://cors-anywhere.herokuapp.com'

In case PHP is not installed it falls back to the defined CORS proxy in ``config['default_cors_url']``. In case ``config['default_cors_url']`` is not set, it will use ``cors-anywhere.herokuapp.com`` by default.

.. _websocket:

Websocket connection
---------------------

From v4.11000 Domoticz supports a so called websocket connection next to the standard http(s) connection.

.. note:: Currently the Domoticz stable version is 4.10717 which doesn't support the websocket connection. That means you have to update to the Domoticz develop branch.

.. warning:: The Domoticz develop branch may give issues, especially on Raspberry PI. Make a backup of Domoticz first! If you switch to the develop branch, the Domoticz database will be upgraded as well, and cannot be downgraded.

The advantages of a websocket connection:

* instant updates in Dashticz in case of a changing Domoticz device
* Faster and less overhead

To prevent switching to a websocket connection add the following setting to CONFIG.js::

  config['enable_websocket'] = false;

In the <gif> below you see the instant updates in action. On the right you see the Domoticz dashboard. On the left Dashticz.

.. image :: img/dashticz-websocket.gif
