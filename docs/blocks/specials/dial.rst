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

Usage
-----


Dimmers
~~~~~~~

Click on the dial to switch the dimmer on/off.
