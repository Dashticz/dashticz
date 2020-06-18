.. _longfonds :

Longfonds
=========

.. image :: img/longfonds.jpg

Longfonds shows the air quality as a value from https://www.longfonds.nl/gezondelucht/check

First you have to set the following config parameters::

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
  * - switch
    - | ``true`` Switch title and data
      | ``false`` (default)
  * - url
    - ``'<url>'``: URL of the page to open in a popup frame or new window on click. 
  * - newwindow
    - | ``0``: no new window/frame (for intent handling, api calls)
      | ``1``: open in new window
      | ``2``: open in new frame (default, to prevent a breaking change in default behavior)
