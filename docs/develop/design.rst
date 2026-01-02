Design
======

Starting to collect some design info here. Some structure will be added later.

File structure
--------------

main.js is the starting point. This file is responsible for:
  * loading all necessary js files, the config files, the css files. 
  * Creation of screen and column layout, including the multi screen swiper, top bar, settings screen.

When this is ready, blocks.js gets the lead.

Blocks
~~~~~~
blocks.js is responsible for creating all blocks on the Dashboard. Depending on the block type this responsibility is delegated to helpers.

Switches are handled by switches.js
Thermostats and EvoHome devices are handled by thermostat.js

Several specific Domoticz devices are handled by block.js itself, like P1 smart meter and  TempHumBar devices.

Most of the non-Domoticz block will be handled by special components, which can be found in the ``js/components`` folder.
The Dashticz.js file functions as generic component factory.
Depending on the block type, the specific components factories are called to create a component instance.

Services
~~~~~~~~
The most important service modules are:

  * dashticz.js: Responsible for creation of components, as described above
  * domoticz-api.js: Responsible for handling all interaction with Domoticz
  * settings.js: Responsible for configuring all Dashticz settings


Domoticz-api
------------

This module handles most of the communication with Domoticz. Two types of communication channels are being used:

* websocket connection, supported from Domoticz 2020.1 onwards.
* http connection

At startup ``domoticz-api`` tries to initiate a websocket connection. The advantage of a websocket connection is:

* less overhead, since the websocket connection stays alive. So no overhead for recreating a http connection
* Domoticz actively pushes device changes to the websocket interface, meaning instant device updates in Dashticz

At startup ``Domoticz-api`` requests all devices from Domoticz, and caches the information for later use.

Subscribe
~~~~~~~~~~

``domoticz-api`` provides a subscribe interface::

  Domoticz.subscribe(idx, getCurrent, callback)
 
idx:
Domoticz device index you want to get a subscribtion on.

To subscribe to a variable add 'v' in front of the variable index, like 'v1'.
To subscribe to a group or scene add 's' in front of the group index, like 's1'

There are some special purpose indices, which can be subscribed to as well:

============   ==========================================
idx            Description 
============   ==========================================
_secstatus     Domoticz security status
_secondelay    Delay used by Domoticz before switching the alarm to 'Arm Away' or 'Arm Home'
_Sunrise       Sunrise time
_Sunset        Sunset time
============   ==========================================

If getCurrent is set to true then the callback function will be called with the current value directly.

The callback function receives the device info as parameter.

getAllDevices
~~~~~~~~~~~~~

You can request the actual status of devices via ``Domoticz.getAllDevices``::

  var alldevices = Domoticz.getAllDevices();
  var device = alldevices[123]; //To get device 123

Domoticz request
~~~~~~~~~~~~~~~~

Use the request interface to send a request to Domoticz::

  request(query, forcehttp)

============   ==================================================
Parameter      Description 
============   ==================================================
query          The Domoticz json query: everything after /json.htm?
forcehttp      Set to true (=default) to enforce http connection.
============   ==================================================

The default value of forcehhtp is true, because Domoticz doesn't handle all websocket commands correctly.
Examples::

* EvoHome devices (and thermostats?)

The function ``request`` returns a JQuery promise, containing the Domoticz reply as resolve parameter.

Message queue
~~~~~~~~~~~~~~

Sometimes it might be needed to prevent handling of device updates by Dashticz. You can put the message queue of a specific id on hold via::

  Domoticz.hold(idx)

Don't forget to release the message queue afterwards:

  Domoticz.release(idx)

