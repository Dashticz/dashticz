.. _waqi :

World Air Quality Index 
#######################

This block will show the World Air Quality Index widgets.

See: https://aqicn.org/

A WAQI block can be configured as follows::

   //example for Amsterdam, large
   blocks['My WAQI']= {
      type: 'waqi',
      layout: 'large',
      city: 5771
   };

.. image :: img/waqi-large.jpg

Parameters
----------

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - type
    - ``'waqi'``
  * - width
    - Set the width (1 to 12)
  * - layout
    - | choose from 'xsmall','small','large','xlarge','xxl'
      | ``'small'``: Use small layout 
  * - city
    - WAQI city code. See below

Usage
-----

City code
~~~~~~~~~

To find the right city code browse to https://aqicn.org/

There find your city.

Then scroll to the bottom and click on 'Wordpress' within the Air Quality Widget section.

.. image :: img/waqi-wordpress.jpg

Then within the widget code look for the city number:

.. image :: img/waqi-citycode.jpg

Layout
~~~~~~

The following layout options are supported:

  * xsmall
  * small
  * large
  * xlarge
  * xxl

Below an example of all the layout options:


.. image :: img/waqi.jpg
