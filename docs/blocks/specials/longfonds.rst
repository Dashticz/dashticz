.. _longfonds :

Longfonds
=========

.. image :: img/longfonds.jpg

RIVM measures our air quality on a daily basis. The air is not equally healthy everywhere in the Netherlands. With the Longfonds check https://www.longfonds.nl/gezondelucht/check you can see how healthy the air is in your neighbourhood. The data for this check comes from the RIVM.
- The air quality is a value from 0 (good) to 11 (very bad)

You can use the following config settings or use the block parameters to set the address::

	config['longfonds_zipcode'] = '1234AZ';
	config['longfonds_housenumber'] = '99';

You can customize longfonds as follows::

	blocks['longfonds'] = {
		title: 'Luchtkwaliteit',
		switch: true,
		width: 12,
	}

Add ``'longfonds'`` to your colum

Block parameters
----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - zipcode
    - ``<zipcode>``: Zipcode (if not set in config)
  * - housenumber
    - ``<housenumber>``: Housenumber (if not set in config)
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - title
    - ``'<string>'``: Custom title for the block
  * - icon
    - | Defines the icon for this block, choose from: https://fontawesome.com/icons?d=gallery&m=free
      | ``'fas fa-eye'``
  * - image
    - | If you want to show an image instead of an icon, place image in ``img/`` folder
      | ``'bulb_off.png'``
  * - url
    - ``'<url>'``: URL of the page to open in a popup frame or new window on click. 
  * - newwindow
    - | ``0``: open in current window
      | ``1``: open in new window
      | ``2``: open in new frame (default, to prevent a breaking change in default behavior)
      | ``3``: no new window/frame (for intent handling, api calls). HTTP get request.
      | ``4``: no new window/frame (for intent handling, api calls). HTTP post request. (forcerefresh not supported)
