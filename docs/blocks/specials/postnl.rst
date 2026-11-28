.. _postnl :

PostNL
======

The PostNL widget shows your incoming and sent PostNL, DHL and/or DPD shipments
(Track & Trace) in one list, soonest first. Each line starts with a icon: a green truck for an incoming package, a blue paper plane for a sent
package, and a grey open box for a delivered package. Nothing is shown when
there are no shipments.

PostNL has no public API. The widget logs in to your PostNL account server-side
(``vendor/dashticz/postnl/index.php``), using the same unofficial login flow as
the `domoticz_postnl <https://github.com/MadPatrick/domoticz_postnl>`_ plugin.
If PostNL changes their login process, the widget may stop working.

DHL
---

Fill in your My DHL account (``dhl_username``/``dhl_password``) to also show
your DHL packages: everything that is listed when you log in at
`my.dhlecommerce.nl <https://my.dhlecommerce.nl>`_ (DHL eCommerce NL / DHL
Parcel). That includes returns you send back and parcels you sent yourself
(shown as sent). DHL Express is not part of that account and is not shown.
No tracking numbers or API key are needed.

The DHL part runs server-side as well (``vendor/dashticz/dhl/index.php``) and
uses the same unofficial API as the my.dhlecommerce.nl website. Only the
fetched package list is cached, never the password or a session.

You can use a PostNL account, a DHL account, a DPD account or any mix. With more than one, each line
names its carrier after the sender, for example ``Coolblue (DHL)``. When one
carrier cannot be reached, the packages of the other one are still shown,
with the error below them. DHL parcels can have two extra statuses: "Ready
for pickup" (waiting at a ServicePoint or locker) and "Delayed" (DHL reports
a problem).

DPD
---

Fill in your myDPD account (``dpd_username``/``dpd_password``, the same
account as the myDPD app) to also show your DPD Netherlands packages: the
incoming parcels and the parcels you sent, as listed in the myDPD app. No
tracking numbers are needed. An account that only signs in with Google, Apple
or Facebook has no password and cannot be used.

The DPD part runs server-side too (``vendor/dashticz/dpd/index.php``) and uses
the same unofficial login chain as the myDPD app. Only the fetched package
list is cached. A ParcelShop parcel shows "Ready for pickup" and a missed
delivery attempt "Delayed".

UPS is not supported: UPS has no consumer account feed that can be read
without an interactive browser login.

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
  * - dhl_username
    - Your My DHL e-mail address (optional)
  * - dhl_password
    - Your My DHL password (optional)
  * - dpd_username
    - Your myDPD e-mail address (optional)
  * - dpd_password
    - Your myDPD password (optional)
  * - postnl_showdelivered
    - ``1``/``0``: Show delivered packages (on) or hide them (off). Default: 1
  * - postnl_iconstyle
    - ``fa``/``emoji``: Show Font Awesome icons or colorful emoji icons. Default: fa
  * - postnl_date_color, postnl_time_color, postnl_text_color
    - Hex color (e.g. ``#ffff00``) of the date, time and text part of each line. Default: theme color
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
    config['dhl_username'] = 'me@example.com';
    config['dhl_password'] = 'secret';
    config['dpd_username'] = 'me@example.com';
    config['dpd_password'] = 'secret';
    blocks['widget_postnl'] = {
      type: 'postnl',
      title: 'PostNL'
    }
