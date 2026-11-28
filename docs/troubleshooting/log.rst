Log
===

Dashticz can write errors and actions to a log file on the server: ``custom/logs/dashticz.log``.

What is logged
--------------

- ``error``: JavaScript errors, unhandled promise rejections, failed requests, errors of the PHP bridges (also when a bridge answers with an error message) ``console.error`` messages, every notification that a widget or Dashticz shows on screen (the yellow message bar) and messages of widgets, for example a notification of a HomeConnect appliance (``[HomeConnect] Washer: Drip tray full``).
- ``action``: switching devices (Domoticz commands) and saving settings, layouts, devices or configurations.
- ``debug``: ``console.warn`` messages and everything that the debug window (click on the logo) shows too.

Level
-----

Open Settings -> Log, or add ``logLevel`` to ``CONFIG.js``::

    config['logLevel'] = 'action'; // off, error (default), action or debug

Viewing the log
---------------

Settings -> Log shows the newest entries, with a filter per level, a download button and a button to clear the log.

Good to know
------------

- The log rotates at 1 MB and keeps three older files.
- Passwords, tokens, API keys and ``user:password@`` parts of URLs are masked before they are stored.
- The same message is logged only once per 5 minutes, and the browser can write at most 200 lines per minute.
- The folder ``custom/logs`` must be writable by the web server. It is never served to browsers (``.htaccess`` for Apache, ``docker/default.conf`` for nginx; add the same block to your own nginx configuration).
