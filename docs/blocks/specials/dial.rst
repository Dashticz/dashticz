.. _dial :

Dial
=====

.. image :: img/dials.jpg

The following Domoticz devices can be represented with a dial:
  * Type = 'Heating'
  * Type = 'P1 Smart Meter'
  * Type = 'Temp + Humidity + Baro'
  * Type = 'Temp + Humidity'
  * Type = 'Thermostat'
  * Type = 'Wind'
  * SubType = 'Evohome'
  * SubType = 'SetPoint'
  * SwitchType = 'Dimmer
  * SwitchType = 'On/Off'
  * SwitchType = 'Selector'

To represent these devices with a dial add ``type:'dial'`` to the block definition::

  blocks['my thermostat'] = {
    type: 'dial',               //Display as dial  
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


Usage
-----

Dimmer
~~~~~~

You can use the dial just like a dimmer slider. Click on the dial to switch the dimmer on/off. 

.. image :: ./img/dial_dimmer.jpg
::

	blocks["bathroom_lights"] = {
		idx: 439,
		title: "Bathroom",
		type: "dial",
		color: "#57c4d6",
		width: 2,
	}
	

On/Off Switch
~~~~~~~~~~~~~

Any devices with this switchtype and type: 'dial' will automatically render as a dial button.

.. image :: ./img/dial_on-of_switch.jpg
::

	blocks['kitchen_lights'] = {
		idx: 451,
		title: 'Kitchen',
		type: 'dial',
		color: '#57c4d6',
		width: 2
	}


Temp + Humidity
~~~~~~~~~~~~~~~

Will display temperature as the main value and humidity as extra info below. There is enough room to display last_update with this dial.

.. image :: ./img/dial_temp-humidity.jpg
::

	blocks['temp_hum'] = {
		idx: 435,
		title: 'Weather 1',
		type: 'dial', 
		setpoint: 15,  // this value will be used to control the color of the outer ring, e.g. < 15 is blue, >= 15 is orange
		min: -10, // set the minimum value for the dial range (default is 5)
		max: 40, // set the maximum value for the dial range (default is 35)
		width: 2,
		shownumbers: true,  // display the numbers on the dial (default is false)
		showring: true, // display outer ring color all the time (default is false, will only display when hover over)
		showunit: true // display unit for the dial value (default is false)
	}


Temp + Humidity + Baro
~~~~~~~~~~~~~~~~~~~~~~

Similar to above, but with Baro as extra info too. Last_update can be added but it is a tight fit.

.. image :: ./img/dial_temp-hum-baro.jpg
::

	blocks['temp_hum_baro'] = {
		idx: 72,
		title: 'Weather 2',
		type: 'dial',
		setpoint: 15,
		min: -10,
		max: 40,
		width: 2,
		/* dialicon: ['fas fa-thermometer-half', 'fas fa-arrow-down'], */   // dial icons array when for dials have more than 1 extra info
		/* dialimage: ['volumio.png', 'air.png'],  */   // dial images array when for dials have more than 1 extra info
		showunit: true,
		shownumbers: true,
		last_update: false  // disabling last update to allow for more room
	}


Wind
~~~~

This dial has a 360 degree range (like a compass). The wind direction can be set to point to where the wind is blowing from or to, by using the new "offset" parameter. Below I have set the dial to point to which direction the wind is blowing.

.. image :: ./img/dial_wind.jpg
::

	blocks['wind'] = {
		idx: 73,
		title: 'Wind',
		type: 'dial',
		setpoint: 18, // the entire outer ring will change color based on this setpoint, factoring in the current temperature (default 15)
		offset: 180,  // 0 will point to the wind source, 180 will point to wind direction (default is 0)
		width: 2,
		showring: true,
		showunit: true,
		shownumbers: true,
		last_update: false
	}


P1 Smart Meter
~~~~~~~~~~~~~~

Currently this is configured to use the "Today" counters; CounterDelivToday and CounterToday, i.e. production vs consumption. Unlike any other dial, zero is at "12 o'clock" (instead of the tradional dial which starts at "7 o'clock").

.. image :: ./img/dial_p1-meter-cons.jpg
Today's energy consumption is more than production

.. image :: ./img/dial_p1-meter-prod.jpg
Today's energy production is more than consumption
::

	blocks['p1'] = {
		idx: 454,
		title: 'P1 Meter',
		type: 'dial',
		width: 2,
		min: -10,
		max: 10,
		showring: true,
		showunit: true,
		shownumbers: true,
		last_update: false
	}


.. _Toon:

Toon Thermostat
~~~~~~~~~~~~~~~

.. image :: ./img/toon_dial.jpg

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


Custom styling
--------------
In Domoticz you can hide the Off level of a Selector Switch. In Dashticz you can hide the Off level by adding the following code to your *custom.css*::

	[data-id='<block_name>'] .dial-menu li:nth-child(1){
		display: none;
	}

To change the grey dial bezel color from grey to red::

	.dt_content .dial {
		background-color: #bb2424;
	}

To change the outer ring primary color from orange (default) to yellow::

	.dial .bar.primary,
	.dial .fill.primary {
	    border-color: #d9e900;
	}

To change the outer ring secondary color from blue (default) to lime green::

	.dial .bar.secondary,
	.dial .fill.secondary {
		border-color: #26e500;
	}

To change the dial needle color from orange (default) to lime green::

	.dial-needle::before {
		border-bottom-color: lime!important;
	}

To target just one dial, you can prefix the above code snippets with block id of the dial, for example::

	[data-id='temp_hum_baro'] .dial-needle::before {
		border-bottom-color: lime!important;
	}

Change the size of the dial-center::

	.dial-center {
		height: 65%!important;
		width: 65%!important;
	}


