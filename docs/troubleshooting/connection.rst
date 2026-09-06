Connection
==========

This sections addresses several connection issues

Cross-Origin (CORS) error accessing Domoticz
---------------------------------------------

Description
~~~~~~~~~~~~

Dashticz shows::

    Can't access Domoticz via http://<domoticz ip>:<port>/
    Check domoticz_ip in config.js

The browser console (F12) shows something like::

    Cross-Origin Request Blocked: The Same Origin Policy disallows reading the
    remote resource at http://<domoticz ip>:<port>/json.htm?type=...
    (Reason: CORS header 'Access-Control-Allow-Origin' missing).

Applicability
~~~~~~~~~~~~~~

Dashticz is served from a different origin than Domoticz - a different host,
port, or protocol (``http`` vs ``https``). This is the normal setup, since
Dashticz needs its own PHP-enabled web server while Domoticz uses its own
built-in web server (see :ref:`ManualInstall`).

``config['use_cors']`` does **not** apply here - it only controls the CORS
proxy used for OpenWeatherMap, not the connection to Domoticz itself.

Solution
~~~~~~~~

First confirm Domoticz itself is reachable: open
``http://<domoticz ip>:<port>/json.htm?type=command&param=getauth&plan=0``
directly in a new browser tab. If that fails to load at all, fix
``domoticz_ip`` in ``CONFIG.js`` (wrong IP/port, Domoticz not running, or a
firewall blocking the connection) rather than the CORS setting below.

If that page loads fine, the browser is blocking the request only because
it's cross-origin. In Domoticz, go to **Setup -> Settings -> Security** and
configure **Allowed CORS Origins**:

* Add the exact origin Dashticz is served from (e.g. ``http://192.168.1.50``), or
* Use ``*`` to allow any origin, or
* Enable **Also allow origins from local networks** to allow any device on
  your local network.

Save the settings and reload Dashticz.

Network time-out errors
-----------------------

Description
~~~~~~~~~~~~

Dashticz in most cases won't load, or loads partially.
DevTools network tab shows 408 errors.

Applicability
~~~~~~~~~~~~~~

Dashticz server runs in a Docker container.
You are using a Pi Raspbian 10 (Buster)

Check this with::

   cat /etc/os-release

Solution
~~~~~~~~

There is an incompatibility issue between one the libraries. You can fix this by executing the following commands::

    sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 04EE7237B7D453EC 648ACFD622F3D138
    echo "deb http://deb.debian.org/debian buster-backports main" | sudo tee -a /etc/apt/sources.list.d/buster-backports.list
    sudo apt update
    sudo apt install -t buster-backports libseccomp2

After this stop and start the Docker container by executing the following commands in the Dashticz folder on your PI::

    make stop
    make start