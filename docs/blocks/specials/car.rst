.. _car :

Car info
========

The Car info widget shows the status of one car on a picture of the car seen
from above, with the front of the car to the left. The tyre pressures sit at
the wheels, the battery level (with a bar) and the range on the bonnet, the
doors and windows on the roof, and the charging state and the door lock at the
rear. Charging, doors, windows and lock are green when charging or closed and
orange when open; a tyre is green from 2.2 bar, orange below 2.2 bar and red
below 2.0 bar.

Add the widget via the Screen Editor: "Add items" -> Widgets -> Car info. There
is one tile for one car. For another car, add another tile. Choose the Domoticz
devices with the selection lists; a device that is not chosen is not shown.
Change the choices later with the cog icon of the tile.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - carmode
    - Always ``'info'``. This makes the block a Car info tile.
  * - carfl, carfr, carrl, carrr
    - Idx of the tyre pressure device: front left, front right, rear left and
      rear right.
  * - carsoc
    - Idx of the battery level device.
  * - carrange
    - Idx of the range device.
  * - carcharging
    - Idx of the charging device.
  * - carlock
    - Idx of the door lock device.
  * - cardoors
    - Idx of the doors device.
  * - carwindows
    - Idx of the windows device.
  * - carimage
    - Your own picture of the car, for example ``'custom/car.png'``: a file in
      ``img/custom``, seen from above with the front to the left. The empty
      (white or transparent) border around the car is cut away automatically.
      Without a picture, a simple drawing of a car is used.

Example
-------

.. code-block:: javascript

  blocks['car_1'] = {
    title: 'BMW',
    icon: 'fas fa-car',
    carmode: 'info',
    carfl: '1696', carfr: '1697', carrl: '1698', carrr: '1699',
    carsoc: '915',
    carrange: '912',
    carcharging: '913',
    cardoors: '909',
    carwindows: '910',
    carimage: 'custom/car-top.webp'
  };
