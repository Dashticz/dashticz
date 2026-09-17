.. _postnl :

PostNL
======

A PostNL block shows the `domoticz_postnl
<https://github.com/MadPatrick/domoticz_postnl>`_ plugin's "Packages
Incoming" and "Packages Sent" Text devices combined in one block, as two
rows: Incoming and Sent.

Either device is optional, and each row is only shown when its device
actually has a package to report. The plugin's own Text devices never
really go empty - they hold a fixed placeholder string instead (e.g.
"Nothing on the way" / "Geen pakketten onderweg") - so this block recognizes
that placeholder (in either of the plugin's two supported languages) and
renders nothing for that row rather than showing filler text. When neither
device has anything to report, the block simply shows no rows at all.

Added via the Screen Editor's "Add items" menu -> PostNL, by entering the
IDX of the plugin's "Packages Incoming" and/or "Packages Sent" Text
devices.

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
    - | Defines the icon for this block, choose from: https://fontawesome.com/icons?d=gallery&m=free
      | ``'fas fa-box'``
  * - incomingIdx
    - | Optional (at least one of incomingIdx/sentIdx is required): the
        domoticz_postnl plugin's "Packages Incoming" Text device idx.
      | ``12``
  * - sentIdx
    - | Optional (at least one of incomingIdx/sentIdx is required): the
        domoticz_postnl plugin's "Packages Sent" Text device idx.
      | ``13``

Example
-------

::

    blocks['postnl'] = {
      type: 'postnl',
      title: 'PostNL',
      incomingIdx: 12,
      sentIdx: 13
    }
