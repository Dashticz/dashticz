.. _dial :

Dial
=====

.. image :: img/dials.png

The following Domoticz devices can be represented with a dial:
  * EvoHome devices
  * Thermostats
  * Dimmers

To represent these devices with a dial add ``type:'dial'`` to the block definition::

  blocks['my thermostat'] = {
    type: 'dial'                //Display as dial  
    idx: 123,                   //The Domoticz device id
    title: 'Device name',       //The title of the block as shown in the dial.
    width: 6,                   //The width of the block relative to the column width
  }

Block parameters
----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - idx
    - ``<idx>``: IDX of the device (mandatory if named block)
  * - title
    - ``'custom_title'``: Title that will appear on the dial (mandatory)
  * - type
    - ``'dial'``: Indentifies this block as a dial (mandatory)
  * - width
    - ``1..12``: Dial width (optional, default 3)
  * - height
    - ``<number>``: Dial height (optional, default based on width)
  * - color
    - ``'<string>'``: Color theme for the dial (default orange). Must be *html color, hex code, rgb or rgba string*
  * - last_update
    - ``true``: Shows last update info (default: true)
  * - flash
    - ``true``: Outer dial will flash with user or default color (default: 0)
  * - dialimage
    - ``'img/image.png'``: Show an image instead of the calendar icon (default: false)
  * - dialicon
    - ``'fas fa-icon-alt'``: Show a different font awesome icon (default: 'fas fa-calendar-alt')
  * - showring
    - ``true``:  Always show the outer color ring (default: false)


Custom styling
~~~~~~~~~~~~~~
In Domoticz you can hide the Off level of a Selector Switch. In Dashticz you can hide the Off level by adding the following code to your *custom.css*::

	[data-id='<block_name>'] .dial-menu li:nth-child(1){
		display: none;
	}


Usage
-----


Dimmers
~~~~~~~

Click on the dial to switch the dimmer on/off.


.. _Toon:

Toon Thermostat as dial
~~~~~~~~~~~~~~~~~~~~~~~

.. image :: ../img/toon_dial.png

"SwitchType": "Selector"

::

   blocks['toon_controller'] = {
	   idx: 419,
	   title: 'Toon Controller',
	   type: 'dial',
      width: 3,
   }


1 = "Type": "Temp", 
2 = "Type": "Thermostat"

::

   blocks['toon_thermostat_temp'] = {
	   idx: '421',   // -> 2
	   title: 'Thermostat',
	   type: 'dial',
	   temp: 420,   // -> 1
	   width: 3,
   }
