.. _trafficinfo :

Traffic info 
################

With a traffic info block you can show the ANWB (Dutch) traffic info. 

For public transport info see :ref:`publictransport`.

A traffic info block can be configured as follows::

    var trafficinfo = {}
    trafficinfo.anwbA1 = {
        trafficJams: true,
        roadWorks: false,
        radars: false,
        road:'A1',
        provider: 'anwb',
        show_lastupdate:true,
        icon: 'fas fa-car',
        width:12,
        results: 100 };

segStart and segEnd can also be provided to filter the results even more.

.. image :: img/trafficinfo.jpg


Parameters
----------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - road
    - Name of the road(s) to show, comma seperated (Example: "A1, A73")
  * - title
    - Title of the block
  * - show_lastupdate
    - ``false`` , ``true``. To display the time of the last update.
  * - provider
    - | Traffic info provider to use. Choose from
      | ``'anwb'`` The Netherlands
  * - icon
    - | The font-awesome icon (including ``fas fa-``)
      | ``'fas fa-car'``, ...
  * - refresh 
    - time in seconds for refreshing the data
  * - results 
    - Number of results to show 
  * - width
    - To customize the width. It's not recommended to change the default value (``12``) because of the size of the output.
  * - trafficJams
    - ``false`` , ``true``.  To show traffic jam info
  * - roadWorks
    - ``false`` , ``true``.  To show road work info
  * - radars
    - ``false`` , ``true``.  To show radar info
  * - showempty
    - | Control text to show in case of no traffic announcements
      | ``false``: Don't show a message in case of no traffic announcements
      | ``true``: Display default message in case of no traffic announcements
      | ``'<text>'``: Display <text> in case of no traffic announcements
  * - showemptyroads
    - | Control text to show in case of no traffic announcements for a certain road (only applicable in combination with block parameter ``road``)
      | ``false``: Don't show a message in case of no traffic announcements for a certain road.
      | ``true``: Display default message in case of no traffic announcements for a certain road.
      | ``'<text>'``: Display <text> in case of no traffic announcements for a certain road.  
  * - url
    - ``'<url>'``: URL of the page to open in a popup frame or new window on click. 
  * - newwindow
    - | ``0``: open in current window
      | ``1``: open in new window
      | ``2``: open in new frame (default, to prevent a breaking change in default behavior)
      | ``3``: no new window/frame (for intent handling, api calls). HTTP get request.
      | ``4``: no new window/frame (for intent handling, api calls). HTTP post request. (forcerefresh not supported)

Styling
--------

In case no info is available then the CSS class ``empty`` will be added to block.
This can be used to adjust the styling of an empty block via ``custom.css``

