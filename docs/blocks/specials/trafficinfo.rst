.. _trafficinfo :

Traffic info
################

With a traffic info block you can show Dutch traffic jams and roadworks, from RWS
(Rijkswaterstaat)'s public traffic API. No API key is needed.

For public transport info see :ref:`publictransport`.

A traffic info block shows one of two selections:

* **Everything within a distance** (``filter: 'distance'``, the default): all
  announcements within ``maxDistance`` km of a location.
* **Selected roads** (``filter: 'roads'``): only the roads listed in ``road``,
  for example ``'A4, A17'``. The roads are shown in that order, each with at
  most ``results`` announcements. With ``showemptyroads`` a road without
  announcements is listed as well.

A traffic info block for selected roads can be configured as follows::

    var trafficinfo = {}
    trafficinfo.rwsA4A17 = {
        trafficJams: true,
        roadWorks: false,
        filter: 'roads',
        road: 'A4, A17',
        showemptyroads: true,
        show_lastupdate: true,
        icon: 'fas fa-car',
        width: 12,
        results: 10 };

To show two roads in two separate blocks, define two blocks with one road
each.

.. image :: img/trafficinfo.jpg

Using the Widget editor
-----------------------

In Wizard mode all options can be set in the Widget Config of the Traffic
information widget (see :ref:`WidgetConfig`), without hand-writing a block:
traffic jams, roadworks and radars, **Show** (*Everything within a distance*
or *Selected roads*), the maximum number of results, and either the distance
and location, or the **Roads** and **Show roads without announcements**.


Parameters
----------

.. list-table::
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table

  * - Parameter
    - Description
  * - filter
    - | ``'distance'``: show everything within ``maxDistance`` (default)
      | ``'roads'``: show only the roads in ``road``
      | Without ``filter``, a block with a ``road`` list uses ``'roads'``, as in earlier versions.
  * - road
    - | The road(s) to show with ``filter: 'roads'``, comma separated, in the order they are shown. Case and spaces don't matter.
      | ``'A1, A73'``
  * - title
    - Title of the block
  * - show_lastupdate
    - ``false`` , ``true``. To display the time of the last update.
  * - maxDistance
    - Only show items within this distance, in km straight-line, from ``latitude``/``longitude``. Defaults to ``40``. Not used with ``filter: 'roads'``.
  * - latitude, longitude
    - | Reference location for ``maxDistance``. Leave both unset to use Domoticz's own configured system location (Settings > System > Location) - only set these yourself if that isn't configured.
  * - icon
    - | The font-awesome icon (including ``fas fa-``)
      | ``'fas fa-car'``, ...
  * - refresh
    - time in seconds for refreshing the data
  * - results
    - Number of results to show: per road with ``filter: 'roads'``, in total with ``filter: 'distance'``. Defaults to ``5``.
  * - width
    - To customize the width. It's not recommended to change the default value (``12``) because of the size of the output.
  * - trafficJams
    - ``false`` , ``true``.  To show traffic jam info
  * - roadWorks
    - ``false`` , ``true``.  To show road work info
  * - radars
    - ``false`` , ``true``.  To show radar info. RWS has no radar data, so this currently has no visible effect.
  * - showempty
    - | Control text to show in case of no traffic announcements
      | ``false``: Don't show a message in case of no traffic announcements
      | ``true``: Display default message in case of no traffic announcements
      | ``'<text>'``: Display <text> in case of no traffic announcements
  * - showemptyroads
    - | Control text to show in case of no traffic announcements for a certain road (only applicable with ``filter: 'roads'``)
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
