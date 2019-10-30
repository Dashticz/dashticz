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
    - Name of the road to show, (Example: "A1")
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
  * - interval 
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



