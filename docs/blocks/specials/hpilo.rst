.. _hpilo :

HP iLO
======

The HP iLO widget shows clustered status information of an HPE server, read
from its iLO Redfish API. Each line has a small icon, a label and the value,
for example server uptime, fan speed and temperature. You choose which lines
are shown, and in which order.

The widget talks to the iLO server-side (``vendor/dashticz/hpilo/index.php``),
using the same Redfish endpoints as the
`domoticz_HP_ilo <https://github.com/MadPatrick/HP_ilo>`_ plugin. The iLO does
not have to be reachable from your browser. The iLO uses a self-signed
certificate by default, so certificate verification is disabled for this
connection.

Add the widget via the Screen Editor: "Add items" -> Widgets -> HP iLO, and
fill in the settings with the cog icon. Icon, title and background are set
like for any other widget. The icon and title sit in their own header row
above the metrics by default (``template: 1``); set ``template: 0`` on the
block to go back to the icon beside the rows for the whole tile height.

Settings
--------

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - hpilo_host
    - IP address or hostname of the iLO
  * - hpilo_port
    - HTTPS port of the iLO. Default: 443
  * - hpilo_username
    - iLO user name
  * - hpilo_password
    - iLO password
  * - hpilo_pollseconds
    - Poll interval in seconds. Minimum 30. Default: 300
  * - hpilo_fontsize
    - Font size in pixels (8..60). Default: 14
  * - hpilo_rows
    - Comma-separated list of the rows to show, in the order they appear on
      the tile. Rows: ``name``, ``model``, ``power``, ``health``, ``uptime``,
      ``fanspeed``, ``cputemp``, ``inlettemp``, ``watts``, ``storage``,
      ``ssdlife``, ``firmware``, ``network``, ``serial``, ``minfan``,
      ``thermalconfig``, ``powerregulator``. Default:
      ``power,health,uptime,fanspeed,cputemp,inlettemp``
  * - hpilo_icons
    - JSON map of a row to the icon shown in front of it, chosen per row in
      the widget config (the pull-down in each row). A Font Awesome class,
      or ``none`` to hide the icon; rows without an entry keep their own
      icon. Example: ``{"power":"fas fa-bolt","serial":"none"}``. Default:
      ``{}``

Server uptime is shown as days, hours and minutes.

Rows that the iLO does not report (for example uptime on older iLO versions)
are left out.
