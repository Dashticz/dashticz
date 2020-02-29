Domoticz blocks
===============

Several types of Domoticz blocks can be defined:

* Devices
* Scenes
* Groups
* Variables

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
  * - type
    - Set this parameter to ``'blocktitle'`` if you want to define a block title instead of a normal block. See :ref:`blocktitle`

There are several additional parameters for Graphs. See :ref:`dom_graphs`
      
Usage
-----

.. _blocktitle :

Block title
~~~~~~~~~~~

A special block type is a block title.
You define a block title as follows::

  blocks['blocktitle_1'] = {  //'blocktitle_1' must be an unique name
    type: 'blocktitle',       //Set type to 'blocktitle' (required for block title)
    title: 'Switches',        //The title of the block as shown in the dashboard.
    width: 6,                 //The width of the block relative to the column width
    icon: 'far fa-lightbulb', //If you want  to show an icon, choose from: https://fontawesome.com/icons?d=gallery&m=free
    image: 'lightbulb.png'    //If you want to show an image instead if icon, place image in img/ folder    
  }
  
Full example of one block title and two devices::

    var config = {}
    config['language : 'nl_NL'; //or: en_US, de_DE, fr_FR, hu_HU, it_IT, pt_PT, sv_SV
    config['domoticz_ip : 'http://192.168.178.18:8080';
    config['domoticz_refresh : '5';
    config['dashticz_refresh : '60';

    config['use_favorites'] = 0; //Request all Domoticz Devices, not only favorites

    //Definition of blocks
    blocks = {}

    blocks['myblocktitle'] = {
      type: 'blocktitle',
      title: 'My Devices Block'
    }

    blocks[120] = {
      width: 6
    }

    blocks[121] = {
      width: 6
    }

    //Definition of columns
    columns = {}

    columns[1] = { 
      blocks: ['myblocktitle', 120, 121],
      width: 4
    }

    //Definition of screens
    screens = {}
    screens[1] = {
      columns: [1]
    }

This example will give the following result:

.. image :: blocktitle.jpg

Example of a more extensive block definition::

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

Blocks with a sub device id
~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

Dashticz recognizes Evohome devices.

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

