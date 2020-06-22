Domoticz blocks
===============

Several types of Domoticz blocks can be defined:

* Devices
* Scenes
* Groups
* Variables
* Texts

Devices
-------

Almost all Domoticz devices can be shown on the Dashticz dashboard.
Before you can use a device in a column you must make it known in your CONFIG.js as follows::

   blocks = {}        //only once
   blocks[123] = {
    title: 'My device',
    width: 12
   }
   
If you use anything other than a number you have to put it between quotes: ``['s1']`` ``['v3']`` ``['123_1']``

The number ``123`` is the Domoticz device id. The example above also shows the use of two parameters: ``title`` and ``width``.
For a full list of parameters see :ref:`dom_blockparameters`.

For most devices containing a value, like temperature, power, etc, it's possible to show the data as a graph. See :ref:`dom_graphs`.

You can also use custom names for the block identfier. In that case you have to add the ``idx`` parameter to indicate which Domoticz device you want to use::

   blocks['my device'] = {
      idx: 123
   }

Scenes and Groups
-----------------

To select a Domoticz Group or Scene add 's' in front of the Scene/Group ID.

Example::

    blocks['s12'] = {    //Select group/scene with Domoticz index 12
      title: 'My group 12'
    }


Variables
---------

To select a Domoticz variable add 'v' in front of the Domoticz variable ID. 

Example::

    blocks['v3'] = {    //Select variable with Domoticz index 3
      title: 'My variable 3'
    }

After that you can use ``'v3'`` in your column definitions in ``CONFIG.js`` as usual.

A list of all Domoticz variables can be obtained via::

    http://[DomoticzIP:Port]/json.htm?type=command&param=getuservariables


.. _dom_blockparameters:

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
  * - idx
    - | Index of the Domoticz device id, group/scene id, or variable id you want to use.
      | ``<idx>`` or ``'<idx>'``: Device idx to use
      | ``'<idx>_<subidx>'``: To select subdevice from Domoticz device, like temperature/humidity.
      | ``'s<idx>'``: Select group or scene with id <idx>
      | ``'v<idx>'``: Select variable with id <idx>
  * - icon
    - | Defines alternative icon of the device instead of the default, choose from: https://fontawesome.com/icons?d=gallery&m=free
      | ``'fas fa-eye'``
  * - image
    - | If you want to show an image instead of an icon, place image in ``img/`` folder
      | ``'bulb_off.png'``
  * - iconOn
    - | Icon to show in case the device state is on.
      | ``'fas fa-eye'``
  * - iconOff
    - | Icon to show in case the device state is off.
      | ``'fas fa-eye'``
  * - imageOn
    - | Image to show in case the device state is on. Place image in ``img/`` folder
      | ``'bulb_off.png'``
  * - imageOff
    - | Image to show in case the device state is off. Place image in ``img/`` folder
      | ``'bulb_off.png'``
  * - textOn
    - Text to display in case the device is on.
  * - textOff
    - Text to display in case the device is off.
  * - switch
    - | ``true`` Switch title and data
      | ``false`` (default)
  * - hide_data
    - | ``true`` Don't show data
      | ``false`` (default) Show data field
  * - last_update
    - | ``true`` (default) Show the time when this block was updated for the last time
      | ``false`` Don't show the last update time for this block
  * - flash
    - | Controls the flashing of the block when it's value changes.
      | ``0`` : No flashing (=default)
      | ``1..1000`` : Duration (in ms) of the flashing effect
  * - hide_stop
    - | ``true`` Hide stop button for applicable devices, like blinds
      | ``false`` (Default) Show stop button
  * - playsound
    - | Play a sound when a device changes
      | ``'sounds/ping.mp3'``
  * - playsoundOn
    - | Play a sound when a device changes to On
      | ``'sounds/ping.mp3'``
  * - playsoundOff
    - | Play a sound when a device changes to Off
      | ``'sounds/ping.mp3'``
  * - speak
    - | Speaks text when a device changes
      | ``'Device status has changed'``
  * - speakOn
    - | Speaks text when a device changes to on
      | ``'Device is on'``
  * - speakOff
    - | Speaks text when a device changes to off
      | ``'Device is off'``
  * - protected
    - | ``true`` Protect switching manually in Dashticz (not in Domoticz)
      | ``false`` (Default) Switch state can be changed in Dashticz
  * - confirmation
    - | ``0`` No confirmation (default)
      | ``1`` Dashticz asks the user for confirmation before changing a switch-device
  * - password
    - | Password protect switches, buttons, thermostats, sliders, blinds
      | ``'secret'``: Password to use
  * - gotoslide
    - | Goto screen when a device changes
      | ``1`` .. ``99``
  * - gotoslideOn
    - | Goto screen when a device changes to on
      | ``1`` .. ``99``
  * - gotoslideOff
    - | Goto screen when a device changes to off
      | ``1`` .. ``99``
  * - popup
    - | This allows the popup to use all the block parameters that a graph block does, allowing users to style the graph.
      | ``popup: 'popup_your_graph'``
  * - openpopup
    - Open a popup when a device changes. See :ref:`openpopup`
  * - openpopupOn
    - Open a popup when a device changes to on. See :ref:`openpopup`
  * - openpopupOff
    - Open a popup when a device changes to off. See :ref:`openpopup`
  * - addClass
    - | The CSS class name, that will be added to the block.
      | ``'myclassname'``: Define 'myclassname' in ``custom.css``
  * - unit
    - | String that will be placed behind the device value to indicate the unit.
      | ``'kilowatt'``: The string will replace the default unit.
  * - url
    - ``'<url>'``: URL of the page to open in a popup frame or new window on click. For text blocks.
  * - newwindow
    - | ``0``: open in current window
      | ``1``: open in new window
      | ``2``: open in new frame (default, to prevent a breaking change in default behavior)
      | ``3``: no new window/frame (for intent handling, api calls)

There are several additional parameters for Graphs. See :ref:`dom_graphs`
      
Usage
-----

Example of a block definition::

    var blocks = {}

    blocks[1] = {
      width: 4,               //1 to 12, remove this line if you want to use the default (4)
      title : 'Living room',  //if you want change the name of switch different then domoticz
      icon : 'fa-eye',        //if you want an other icon instead of the default, choose from: https://fontawesome.com/icons?d=gallery&m=free
      image : 'bulb_off.png', //if you want to show an image instead if icon, place image in img/ folder
      switch : true,          //if you want to switch the title and data
      hide_data : true,       //if you want to hide the data of this block
      last_update : true,     //if you want to show the last update specific for this block
      playsound : 'sounds/ping.mp3', //play a sound when a device changes
      protected : true,       //protect switching manually in Dashticz
      speak : 'Device status has changed',  //speak text when device is changed
      gotoslide: 2            //Goto screen when a device changes
    };  

Device with subdevices
~~~~~~~~~~~~~~~~~~~~~~~~~~~

If a device consists of several subdevices, like a TempHumBar device or SmartMeter, then for each subdevice a block will be generated.

In this example device device 659 is a TempHumBar device::

  columns[1] = {
    blocks: [659]
  }

.. image :: img/block659.jpg

In case I want to show all four subdevices onto one row I've to change the default width from 4 to 3::

  blocks[659] = {
    width:4
  }
  columns[1] = {
    blocks: [659]
  }

.. image :: img/block659_w3.jpg

Now assume I want to have the first 3 subdevices on one row, and the fourth device on a new row, full width, with some additional customizations::

  blocks[659] = {
    width:4
  }

  blocks['659_4'] = {
    width:12,
    title: 'Dew temperature of device 659',
    icon: 'fas fa-bus',
    last_update: 'false',
    switch: true
  }

  columns[1] = {
    blocks: [659]
  }

  In the previous example first the settings of ``block[659]`` will be applied to all subblocks, followed by a subblock if it has been defined.
  (In this case ``blocks['659_4']``)

.. image :: img/block659_4_custom.jpg

In case you only want to show subdevice 1, the column definition should be as follows::

  columns[1] = {
    blocks: [ '659_1' ]
  }

Don't forget the tick marks around ``659_1``

As for single device it's also possible to use a custom block key in combination with the ``idx`` parameter.

To make this visible I've defined two classes in custom.css::

  .css_red {
    background-color: red !important;
  }

  .css_green {
    background-color: green !important;
  }

Now I'll add the temperature twice, with different backgrounds::

  blocks['659_1'] = {
    addClass: 'css_red'
  }

  blocks['another'] = {
    idx: '659_1',
    addClass: 'css_green'
  }

  columns[1] = {
    blocks: [ '659_1', 'another' ]
  }

.. image :: img/659_1_2.jpg  

You can also change a subdevice of a block with custom key::

  blocks['another'] = { //This block will show domoticz device 659
    idx: 659,
    addClass: 'css_red'
  }

  blocks['another_1'] = { //This block will be applied to subdevice 1 of "another"
    addClass: 'css_green'
  }

  columns[1] = {
    blocks: [ 'another' ]
  }

.. image :: img/block_another.jpg



Thermostat devices
~~~~~~~~~~~~~~~~~~~

For a thermostat IDX, IDX_1 or IDX_2 can be used.
If IDX_1 is used the thermostat +/- buttons will not be shown.
If IDX_2 is used the icon/image of the block can be changed as in a normal block.

::

    blocks['123_2'] = {
        image: 'toon.png'
    } 


Usage of popup graph window
~~~~~~~~~~~~~~~~~~~~~~~~~~~

With the popup parameter you can configure to open a popup graph window. Example::

   blocks[258] = {
      title: 'Consumption',
      flash: 500,
      width: 4,
      popup: 'popup_consumption'
   }

In this example, the specified popup will use a defined graph called 'popup_consumption' instead of the default popup. This defined graph is then added to the config.js just like a normal graph::
  
   blocks['popup_consumption'] = {
      title: 'Energy Consumption Popup',
      devices: [258],
      toolTipStyle: true,
      datasetColors: ['red', 'yellow'],
      graph: 'line',
      legend: {
         'v_258' : 'Usage',          
         'c_258' : 'Total'
      }
   }


.. _openpopup :

Usage of openpopup(On)(Off)
~~~~~~~~~~~~~~~~~~~~~~~~~~~

With the openpopup, openpopupOn and openpopupOff parameter you can configure to open a popup window when the device changes. Example::

  blocks[123]['openpopup'] = {
      url: 'http://www.urltocamera.nl/image.jpg',   //Open a popup window with this url when the device changes
      framewidth:500,                               //specific width of the frame
      frameheight:400,                              //specific height of the frame
      autoclose: 5                                  //autoclose the popup window after 5 seconds.
  } 
  
  blocks[123]['openpopupOn'] = {
      url: 'http://www.urltocamera.nl/image.jpg',   //Open a popup window with this url when the device changes to On
      framewidth:500,                               //specific width of the frame
      frameheight:400,                              //specific height of the frame
      autoclose: 5                                  //autoclose the popup window after 5 seconds.
  } 
  
  blocks[123]['openpopupOff'] = {
      url: 'http://www.urltocamera.nl/image.jpg',   //Open a popup window with this url when the device changes to Off
      framewidth:500,                               //specific width of the frame
      frameheight:400,                              //specific height of the frame
      autoclose: 5                                  //autoclose the popup window after 5 seconds.
  } 

To remove the close button of the block-popup add the following text to custom.css::

  .frameclose { display: none; }


.. _Flashonchange:

Flash on change
~~~~~~~~~~~~~~~~
To control the flashing of the block when it's value change you can set the ``flash`` parameter.
Via the style ``blockchange`` in ``custom.css`` you can set the class-style that needs to be applied.

Example ``CONFIG.js``::

  blocks[123] = {             //123 is the Domoticz device ID
    title: 'My new device',
    flash: 500                //flash effect of 500 ms
  }
  
Example ``custom.css`` (only needed in case you want to change the default flash effect)::

  .blockchange {
    background-color: #0f0 !important;	
  }
  
.. _Evohome:

Evohome
~~~~~~~

The following Domoticz devices can be represented with a dial. See :ref:`dial`
   * EvoHome devices
   * Thermostats
   * Dimmers

.. image :: img/evohome.png

The following config parameters from CONFIG.js are applicable:

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - evohome_status
    - ``'Auto'``: 
  * - evohome_boost_zone
    - ``<number>``: Zone boost temporary override time in minutes. Default: 60
  * - evohome_boost_hw
    - ``<number>``: Hot water boost temporary override time in minutes. Default: 15

The EvoHome devices can be represented as dial by adding ``type: 'dial'`` to the block definition.

.. image :: img/dial.png


.. _formatting:

Formatting
~~~~~~~~~~

You can define the default unit text and number of decimals to show for some (most?) blocks by adding the following to CONFIG.js::

    config['units'] = {
      names: {
        kwh: 'kWh',
        watt: 'W',
        gas: 'm3',
        water: 'l',
        time: ''
      },
      decimals: {
        kwh: 1,
        watt: 0,
        gas: 1,
        water: 0,
        time: 0
      }
    }

You can also define the unit parameter on block level by setting the ``unit`` parameter::

    blocks[123] = {
      unit: 'Watt'
    }
