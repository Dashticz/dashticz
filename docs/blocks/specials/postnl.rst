.. _postnl :

PostNL
======

The PostNL widget shows your incoming and sent PostNL shipments (Track & Trace)
in one list, soonest first. Each line starts with a icon: a green truck for an incoming package, a blue paper plane for a sent
package, and a grey open box for a delivered package. Nothing is shown when
there are no shipments.

PostNL has no public API. The widget logs in to your PostNL account server-side
(``vendor/dashticz/postnl/index.php``), using the same unofficial login flow as
the `domoticz_postnl <https://github.com/MadPatrick/domoticz_postnl>`_ plugin.
If PostNL changes their login process, the widget may stop working.

Add the widget via the Screen Editor: "Add items" -> Widgets -> PostNL, and
fill in the settings with the cog icon.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - postnl_username
    - Your PostNL e-mail address
  * - postnl_password
    - Your PostNL password
  * - postnl_showdelivered
    - ``1``/``0``: Show delivered packages (on) or hide them (off). Default: 1
  * - postnl_days
    - ``1..30``: Number of days a package (incoming or sent) stays visible after delivery. Default: 2
  * - postnl_pollminutes
    - ``15..720``: Poll interval in minutes. Minimum 15, to avoid your account being flagged. Default: 60

The status texts follow the language that is configured in Dashticz.

Example
-------

::

    config['postnl_username'] = 'me@example.com';
    config['postnl_password'] = 'secret';
    blocks['widget_postnl'] = {
      type: 'postnl',
      title: 'PostNL'
    }
