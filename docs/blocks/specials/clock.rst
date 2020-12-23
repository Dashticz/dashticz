Clocks
######
.. _stationclock :

Station Clock
-------------

.. image :: Stationclock.jpg

This is an 'old fashioned' station clock. http://www.3quarks.com/en/StationClock

You can add the station clock to a column with::

    columns[1]['blocks'] = ['stationclock'];

Block parameter
^^^^^^^^^^^^^^^
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - size
    - | Size of the stationclock in pixels. The default size of the station clock is the column width.
      | ``200`` The clock will have a width and height of 200 pixels
  * - scale
    - | Scale factor for the width of the clock. Should be smaller than 1
      | ``0.75``: Scales the clock down to 75% (default ``1`` = 100%).
  * - body
    - clock body (Uhrgehäuse)
  * - dial
    - stroke dial (Zifferblatt)
  * - hourhand
    - clock hour hand (Stundenzeiger)
  * - minutehand
    - clock minute hand (Minutenzeiger)
  * - secondhand
    - clock second hand (Sekundenzeiger)
  * - boss
    - clock boss (Zeigerabdeckung)
  * - minutehandbehavior
    - minute hand behavior
  * - secondhandbehavior
    - second hand behavior

The value for all the configuration parameters can be found in the code block below::

  // clock body (Uhrgehäuse)
  StationClock.NoBody         = 0;
  StationClock.SmallWhiteBody = 1;
  StationClock.RoundBody      = 2;
  StationClock.RoundGreenBody = 3;
  StationClock.SquareBody     = 4;
  StationClock.ViennaBody     = 5;

  // stroke dial (Zifferblatt)
  StationClock.NoDial               = 0;
  StationClock.GermanHourStrokeDial = 1;
  StationClock.GermanStrokeDial     = 2;
  StationClock.AustriaStrokeDial    = 3;
  StationClock.SwissStrokeDial      = 4;
  StationClock.ViennaStrokeDial     = 5;

  //clock hour hand (Stundenzeiger)
  StationClock.PointedHourHand = 1;
  StationClock.BarHourHand     = 2;
  StationClock.SwissHourHand   = 3;
  StationClock.ViennaHourHand  = 4;

  //clock minute hand (Minutenzeiger)
  StationClock.PointedMinuteHand = 1;
  StationClock.BarMinuteHand     = 2;
  StationClock.SwissMinuteHand   = 3;
  StationClock.ViennaMinuteHand  = 4;

  //clock second hand (Sekundenzeiger)
  StationClock.NoSecondHand            = 0;
  StationClock.BarSecondHand           = 1;
  StationClock.HoleShapedSecondHand    = 2;
  StationClock.NewHoleShapedSecondHand = 3;
  StationClock.SwissSecondHand         = 4;

  // clock boss (Zeigerabdeckung)
  StationClock.NoBoss     = 0;
  StationClock.BlackBoss  = 1;
  StationClock.RedBoss    = 2;
  StationClock.ViennaBoss = 3;

  // minute hand behavoir
  StationClock.CreepingMinuteHand        = 0;
  StationClock.BouncingMinuteHand        = 1;
  StationClock.ElasticBouncingMinuteHand = 2;

  // second hand behavoir
  StationClock.CreepingSecondHand        = 0;
  StationClock.BouncingSecondHand        = 1;
  StationClock.ElasticBouncingSecondHand = 2;
  StationClock.OverhastySecondHand       = 3;

Config settings
^^^^^^^^^^^^^^^

To maintain backwards compatibility the station clock defaults can be set with the following config settings:


.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Settings
    - Description
  * - boss_stationclock
    - | shows hands red axis cover
      | ``'RedBoss'`` ``'NoBoss'`` ``'BlackBoss'`` ``'RedBoss'`` ``'ViennaBoss'``
  * - hide_seconds_stationclock
    - | ``true`` Hides second hand
      | ``false`` Default. Show second hand.

Basic clock
-------------

.. image :: clock.jpg

This is the standard clock. You can add this clock to a column with::

    columns[1]['blocks'] = ['basicclock'];

Block parameter
^^^^^^^^^^^^^^^
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - width
    - | block width
      | ``1 .. 12``: (default ``12``).  
  * - size
    - | Size of the stationclock in pixels. The default size of the station clock is the column width.
      | ``200`` The clock will have a width and height of 200 pixels
  * - scale
    - | Scale factor for the width of the clock. Should be smaller than 1
      | ``0.75``: Scales the clock down to 75% (default ``1`` = 100%).

Flipclock
-------------

.. image :: img/flipclock.jpg

You can add the flipclock to a column with::

    columns[1]['blocks'] = ['flipclock'];

Block parameter
^^^^^^^^^^^^^^^
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - width
    - | block width
      | ``1 .. 12``: (default ``12``).  
  * - size
    - | Size of the stationclock in pixels. The default size of the station clock is the column width.
      | ``200`` The clock will have a width and height of 200 pixels
  * - scale
    - | Scale factor for the width of the clock. Should be smaller than 1
      | ``0.75``: Scales the clock down to 75% (default ``1`` = 100%).
  * - showSeconds
    - | ``true``: (=default) Show seconds
      | ``false``: Hide seconds
  * - clockFace
    - | ``24``: 24 hour clock
      | ``12``: 12 hour clock
      

Hayman clock
-------------

.. image :: img/haymanclock.jpg

Clock by Emily Hayman. Design based off: https://dribbble.com/shots/2271565-Day-095-Time-is-Money

You can add the Hayman clock to a column with::

    columns[1]['blocks'] = ['haymanclock'];

Or define a custom block as follows::

    blocks['myclock'] = {
           type: 'haymanclock'
    }
    
    columns[1]['blocks'] = ['myclock'];
    
    
Block parameter
^^^^^^^^^^^^^^^
.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - width
    - | block width
      | ``1 .. 12``: (default ``12``).  
  * - size
    - | Size of the stationclock in pixels. The default size of the station clock is the column width.
      | ``200`` The clock will have a width and height of 200 pixels
  * - scale
    - | Scale factor for the width of the clock. Should be smaller than 1
      | ``0.75``: Scales the clock down to 75% (default ``1`` = 100%).

Miniclock
-------------

.. image :: img/miniclock.jpg

You can add the miniclock to a column with::

    columns[1]['blocks'] = ['miniclock'];


Usage
-------

The clock types dtclock, stationclock and flipclock are responsive, meaning they will adapt the size to the block width.

Example code for the several clocks::

  blocks['stationclock'] = {
    width: 3,
  };
  blocks['stationclock2'] = {
    type: 'stationclock',
    width: 3,
    boss: 'NoBoss',
    body: 4,
    secondhand: 0
  };
  blocks['stationclock3'] = {
    type: 'stationclock',
    width: 3,
    body: 0,
    dial: 0,
    secondhand: 1
  };
  blocks['stationclock4'] = {
    type: 'stationclock',
    width: 3,
    body: 3,
    dial: 1,
    boss: 'ViennaBoss',
    secondhandbehavior: 2
  };
  blocks['stationclock5'] = {
    type: 'stationclock',
    width: 3,
    boss: 'RedBoss' //'RedBoss' 'NoBoss' 'BlackBoss' 'RedBoss' 'ViennaBoss'
  };

  blocks['clock'] = {
      width: 4
  }

  blocks['flipclock'] = {
      width: 8
  }

  blocks['miniclock'] = {
    width: 4
  }

  var columns = {};

  columns[1] = {};
  columns[1]['blocks'] = [
    'stationclock',
    'stationclock2',
    'stationclock3',
    'stationclock4',
    'clock',
    'flipclock',
    'miniclock',
  ];

.. image :: clocks.jpg

