Domoticz blocks
===============

This sections addresses several issues related to displaying Domoticz blocks

Domoticz block not visible in Dashticz
--------------------------------------

There are a few possible causes

use_favorites
~~~~~~~~~~~~~~

In ``CONFIG.js`` you have ``CONFIG['use_favorites']=1``, while you did not mark your device as favorite in Domoticz

Solution:

Set ``CONFIG['use_favorites']=0`` in ``CONFIG.js`` or mark your device as favorite in Domoticz

device id incorrect
~~~~~~~~~~~~~~~~~~~~

Check that your device id actually exists in Domoticz

Room plan
~~~~~~~~~~

If you make use of a room plan in Dashticz, then check that you've added the device to the room plan in Domoticz.

User rights
~~~~~~~~~~~~

If you've configured a specific Domoticz user for Dashticz, then check that this Domoticz user has access to the device.

Support
~~~~~~~~

Describe your issue in the Dashticz forum https://www.domoticz.com/forum/viewforum.php?f=67

Include the Domoticz json device description, which you can obtain via the following link::

    http://domoticz ip:port/json.htm?type=devices&rid=123

Fill in your domoticz ip and port. Replace 123 with your device id.

