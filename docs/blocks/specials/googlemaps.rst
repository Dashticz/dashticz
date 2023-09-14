.. _googlemaps :

Google Maps
###########

.. image :: googlemaps.png

With the 'maps' block you can display map from Google Maps, with optionally:

* Traffic information
* Route to a certain destination.

First get a Google Maps API key: :ref:`gmapikey`
  
Adding the GM to the dashboard::

    config['gm_api'] = 'xxxxxxxxxxxxxx'; // The API key you received from Google

    blocks['mymap'] =  {
      type: 'map',
      latitude: 40.4989948,
      longitude: -3.6610076
    }

and used in::

    columns[3] = {}
    columns[3]['blocks'] = ['mymap']

Block parameters
----------------
The Google Maps module uses the following block parameters:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - width
    - Width of the Google Maps block compared to the full screen, not the column. Full screen width is 12. Meaning width of 6 will give a width of 50% of the screen size.
  * - height
    - The height of the block in pixels
  * - aspectratio
    - The height of the block compared to the width. (default: 0.6) Only applicable if ``height`` has not been defined.
  * - latitude
    - Latitude
  * - longitude
    - Longitude
  * - destlatitude
    - Latitude of the destination
  * - destlongitude
    - Longitude of the destination  
  * - zoom
    - Zoom level (default ``15``)
  * - showmarker
    - | ``true``: Show marker on the map (=default)
      | ``false``: Don't show the marker
  * - showtraffic
    - | ``true``: Show actual traffic (=default)
      | ``false``: Don't show traffic info
  * - showUI
    - | ``true``: Shows the default Google Maps UI
      | ``false``: Hides the default Google Maps UI (=default)
  * - showrouteinfo
    - | ``true``: Show route distance and travel time (=default)
      | ``false``: Hide route info
  * - showrefresh
    - | ``true``: Show refresh button in upper right corner (=default)
      | ``false``: Hide refresh button
    

Config settings
---------------
The Google Maps module uses the following config settings:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Setting
    - Description
  * - gm_api
    - The API key you received from Google

Usage
-----

.. _gmapikey :

Getting a Google Maps API key
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Obtain your Google Maps API key from:

  https://developers.google.com/maps/documentation/javascript/get-api-key

  * Press Get Started
  
    .. image :: gmChooseMaps.png
    
  * Choose Maps, and press Continue
  * Follow the instructions

If you would like to be able to display routes, then you have to enable the Directions API as well.

You have to activate billing.

Using Google Maps API costs money. However, you get a monthly credit of $200 for free (June 2023).

If you have a low ``refresh`` block parameter, and show multiple maps simultaneously, you may run out of your monthly credit quite quickly.
So, especially in the beginning, pay attention to your API usage via the Google dashboard.

To prevent unnecessary cost, I would recommend to set some quotas in the Google Maps dashboard. For instance, set a limit for the Maps javascript API as well as the Directions API to 500 requests per day. This will limit the cost to max $3.50 + $2.50 = $6.00 per day, meaning you will not reach the $200 monthly credit.
 
.. _mapsroute :

Show a route to a destination
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Example of a block to show a route::

  blocks['route'] = {
    type: 'map', 
    latitude: 52.377956,
    longitude: 4.897070,
    destlatitude: 51.4176337,
    destlongitude: 5.4060209,
  }

.. image :: img/googlemapsroute.jpg

