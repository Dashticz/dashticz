.. _customlog :

Domoticz log 
############

You can add the Domoticz log to a column as follows::

    columns[4] = {
      blocks: ['log']  
    }

Block parameters
----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - title
    - | ``'Domoticz log'``: Title of the log block
  * - type
    - ``'log'``: Show the Domoticz log in this block
  * - width
    - ``1..12``: Dial width (optional, default 12)
  * - height
    - ``<number>``: Dial height (optional, default based on width)
  * - aspectratio
    - The height of the block compared to the width. Only applicable if ``height`` has not been defined.
  * - scrolltimeout
    - | Delay in seconds after manual scrolling until auto-scroll will be activated.
      | ``60`` (=default) : 60 seconds delay
  * - ascending
    - | ``false``: Show last log message first
      | ``true`` (=default): Show last log message at the end


.. image :: domoticzlog.png
