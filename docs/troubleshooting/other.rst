Other
==========

This sections addresses several other issues

No sound after restart
-----------------------

Description
~~~~~~~~~~~~

No sound after restart

Applicability
~~~~~~~~~~~~~~

All (?) situations

Solution
~~~~~~~~

Most browsers now only will play sound after user interaction like clicking a button.

For Chrome you can allow sound without user interaction by adding the IP address of the Dashticz server to ``chrome://settings/content/sound``

Changes from the editors or the Settings menu are not saved
-----------------------------------------------------------

Description
~~~~~~~~~~~~

The setup wizard shows **Configuration permissions**, or changes made in the
Screen Editor, the Device/Widget Config popups or the Settings menu are gone
after a reload.

Applicability
~~~~~~~~~~~~~~

Dashticz 4 in Wizard mode, and the Settings menu in both modes.

Solution
~~~~~~~~

These editors save their changes via PHP to ``CONFIG.js``, ``custom.css`` and
``custom.js`` in the ``custom/`` folder. Make sure that:

* PHP is enabled in the web server that serves Dashticz;
* the web server account (for example ``www-data``) can write to the
  ``custom/`` folder and the files in it, for example::

    sudo chgrp -R www-data /var/www/html/dashticz/custom
    sudo chmod -R g+w /var/www/html/dashticz/custom

When the setup wizard shows the permissions message, correct the permissions
and press **Check again**.
