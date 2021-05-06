.. _customweather :

Weather forecast
################

.. note:: In version 3.8.2 Dashticz switched to the new weather block as described here.

Dashticz supports the following weather forecast provider:

* Open Weather Map: https://openweathermap.org/


Before you can use the weather module, you must request an API key at https://openweathermap.org/

Open Weather Map
----------------

A basic weather block can be defined as follows::

  blocks['weather'] = {
    type: 'weather',
    apikey: 'abc123...xyz', /Your OpenWeatherMap API key
    city: 'Amsterdam', 
  }

.. image :: img/weather_default.jpg

Besides the daily forecast, you can also show the current weather or an hourly forecast.

Parameters
~~~~~~~~~~

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Block parameter
    - Description
  * - type
    - ``'weather'``. To select a weather block
  * - width
    - ``1..12``: Width of the block
  * - refresh
    - ``3600`` Update once per hour. (default=3600, minimum=900, 15 minutes)
  * - scale
    - | Number between 0 and 1 to make the weather block smaller
      | ``1`` Normal block width
      | ``0.5`` 50% width
  * - apikey
    - ``'abc123...xyz'``. OWM api key
  * - city
    - ``'Amsterdam'``. City name. You can also use the OWM city id code.
  * - country
    - ``'nl'``. Country code.
  * - name
    - ``'My place'``. Name to use instead of city name on the dashboard.
  * - lang
    - ``'nl'``: Language to use for OWM data
  * - layout
    - | Choose a layout for the weather block
      | ``0``: Daily forecast (=default)
      | ``1``: Hourly forecast
      | ``2``: Current weather
      | ``3``: Current weather detailed
      | ``4``: Combination of 2,3,0,1
  * - count
    - ``5``: Number of forecast items to show (default=3). Only for daily and hourly forecast.
  * - interval
    - | Use every n-th forecast item.
      | ``1``. Use every forecast item (=default)
      | ``3``. Set to 3 to get 3-hourly forecast
  * - static_weathericons
    - | ``true`` Static weather settings
      | ``false`` Animated weather icons (=default)
  * - decimals
    - | Number of temperature decimals to show
      | ``1`` One decimal (=default)  
  * - showMin
    - | Show/hide minimum temperature (only for daily forecast)
      | ``false``: Hide minimum temperature
      | ``true``: Show minimum temperature (=default)
  * - showRain
    - | Show/hide rain rate (only for daily and hourly forecast)
      | ``false``: Hide rain rate
      | ``true``: Show rain rate (=default)
  * - showDescription
    - | Show/hide weather description (only for daily and hourly forecast)
      | ``false``: Hide weather description
      | ``true``: Show weather description
  * - showWind
    - | Show/hide wind info and wind dial (daily and hourly forecast only)
      | ``false``: Hide wind info
      | ``true``: Show wind info (=default)
  * - useBeaufort
    - Set to ``true`` to show wind speed in Beaufort instead of m/s
  * - skipFirst
    - Set to ``true`` to skip the first daily/hourly forecast card   
  * - monochrome
    - | ``false``: Show colored icons (animated weather icons only)
      | ``true``: Show monochrome icons (animated weather icons only)
  * - colors
    - Object to color the animated weather icons. See below.
  * - showCurrent
    - Set to ``false`` to hide current weather (layout 4 only)    
  * - showDetails
    - Set to ``false`` to hide current weather details (layout 4 only)    
  * - showDaily
    - Set to ``false`` to hide daily weather forecast (layout 4 only)    
  * - showHourly
    - Set to ``false`` to hide hourly weather forecast (layout 4 only)    
      
The weather module makes use of the following CONFIG parameters:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - owm_api
    - ``'<api-key>'`` API-key provided by https://openweathermap.org/
  * - owm_city
    - | Your city or nearby city to use in OWM. You can also fill in the city id here.
      | ``'Utrecht'``
      | ``'2748075'``
  * - owm_name
    - | Name to use instead of city name
      | ``'Tuinwijk'``
  * - owm_country
    - | Your country to use in OWM
      | ``'nl'``
  * - owm_lang
    - | Set language for de description of the forecast (rain, cloudy, etc.). For available languages, see https://openweathermap.org/forecast5/#multi
      | ``''`` (empty string, default) Use Dashticz language setting
  * - owm_cnt
    - | Number of forecast elements (3-hour intervals or days) to show
      | ``1..5``
  * - owm_min
    - | Show minimum temperature on 2nd row (only for daily forecast)
      | ``false`` / ``true``
  * - static_weathericons
    - | ``true`` Static weather settings
      | ``false`` (default) Animated weather icons
  * - use_beaufort
    - | This config setting is used as default value for block parameter ``useBeaufort``
      | ``true`` Use Beaufort for wind speed
      | ``false`` Use m/s for wind speed

    
Usage
~~~~~~

In the next examples the config parameter ``owm_api`` and ``owm_city`` have been set globally, so they are not part of the weather block definitions.

To show the hourly forecast with an 3 hour interval::

  blocks['weather1'] = {
      type: 'weather',
      layout: 1,
      count: 7,
      interval: 3,
  }

.. image :: img/weather_hourly.jpg

To show the current weather, with a custom name::

  blocks['weather2'] = {
    type: 'weather',
    layout: 2,
    name: 'My place',
  }

.. image :: img/weather_current.jpg

To show detailed info on the current weather::

  blocks['weather3'] = {
      type: 'weather',
      layout: 3,
      name:'Home is home',
  }

.. image :: img/weather_detailed.jpg

Icon colors
~~~~~~~~~~~~

The default icon colors (animated weather icons only) are as follows::

  {
    main        :  "#FFF",
    moon        :  "#353545",
    fog         :  "#CCC",
    fogbank     :  "#AAA",
    light_cloud :  "#DDD",
    cloud       :  "#BBB",
    dark_cloud  :  "#999",
    thunder     :  "#FF0",
    snow        :  "#C2EEFF",
    hail        :  "#CCF",
    sleet       :  "#C2EEFF",
    wind        :  "#777",
    leaf        :  "#2C5228",
    rain        :  "#7FDBFF",
    sun         :  "#FFDC00"
  }

You can redefine the default colors via the colors block parameter. For instance, if you would like to have orange clouds (for whatever reason)::

    blocks['weather4'] = {
        type: 'weather',
        layout: 4,
        count: 6,
        name: 'Amsterdam',
        showDetails: false,
        showHourly: false,
    //    monochrome: true,
        colors: {
            cloud: 'orange',
            light_cloud: 'orange',
            dark_cloud: 'orange',
        }
    }

.. image :: img/orangeclouds.jpg



styling
~~~~~~~

All blocks have the css class ``weather`` assigned in combination with ``weather_0``, ``weather_1``, ..., where the number indicates the layout number.

Further, all info items have css classes assigned. The names are self explanatory.

* ``icon``: Weather icon
* ``day``: Day item ('Saturday')
*  ``time``: Forecast time (hourly forecast only)
* ``city``: City name
* ``description``: Weather description
* ``temp``: temperature
* ``max``: Max temperature
* ``min``: Min temperature
* ``temp``: Current temperature
* ``feels``: Feel-like temperature
* ``rain``: Rain rate
* ``humidity``
* ``pressure``: Barometric pressure
* ``windspeed``
* ``windgust``
* ``winddirection``


To capitalize the day of the week have to add the following code to ``custom.css``::

  .weather .day {
    text-transform: capitalize;
  }
