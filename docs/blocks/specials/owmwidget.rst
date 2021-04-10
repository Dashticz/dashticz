.. _owmwidgets :

OWM widgets
============

.. image :: img/owmwidgets_layout.jpg

Collection of Open Weather Map widgets.

First create an account on https://openweathermap.org to obtain your free api key.
You can use the following config settings or use the block parameters to set the api key::

	config['owm_api'] = '123abc....';

You can choose one of the 24 widgets with the layout block parameter::

	blocks['mywidget'] = {
        type: 'owmwidget',  //to select a owm widget        
        layout: 11, //1 .. 24
        width: 12,
	}

Block parameters
----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - apikey
    - ``'123abc...'``: OWM api key. Default setting is the value of config['owm_api']
  * - layout
    - ``11``: Select a layout from 1 to 24
  * - city
    - | ``'Amsterdam'``: The city name to search for.  Default is config['owm_city'] value.
      | ``2643743``: or the Open Weather Map city id.
  * - country
    - ``'nl'``: Country used in the city name search. Default is config['owm_country'] value.
  * - width
    - ``1..12``: The width of the block relative to the column width
