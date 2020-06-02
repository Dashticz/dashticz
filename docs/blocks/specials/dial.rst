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
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - title
    - ``'<string>'``: Custom title for the block
  * - type
    - ``'dial'``: To select dial for this block
  * - last_update
    - ``true'``: Same as standard block (default: true)
  * - flash
    - ``0``: Same as standard block but around the outer dial with user or default color (default: 0)
  * - dialimage
    - ``'img/thermostat.png'``: An image instead of the calendar icon (default: false)
  * - dialicon
    - ``'fas fa-calendar-alt'``: A different font awesome icon instead of the default calendar icon (default: 'fas fa-calendar-alt')
  * - showring
    - ``false``:  Always show the outer color ring (default: false)

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
