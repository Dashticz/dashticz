.. _AUtomaticInstall :

Automatic install
=================

.. note :: The installation scripts currently only works on Raspberry and Ubuntu

For the automatic install open a terminal in a folder of choice where Dashticz V3 will get installed::

    mkdir dev
    cd dev

Then start the installation script with::

    . <(curl https://raw.githubusercontent.com/dashticzv3/dashticz_v3/beta/scripts/dashticz_install.sh )

If ``curl`` is not installed on your system, then install it first with::

    sudo apt-get install curl


The script:

* asks for a folder where to install Dashticz V3 
* asks to install the beta or master branch : For now only beta works with the auto install!!
* Clones the Dashticz V3 repository and selected branch into a new folder
* Asks for the IP adress of your Domoticz server.
* Copies CONFIG_DEFAULT.js to CONFIG.js with the correct IP address for Domoticz

Then a Makefile is executed which:

* Installs Docker (if not installed yet)
* Creates a Dashticz V3 container, named dtv3, containing Apache and PHP
* FInd the first free port, 8082 or higher
* Starts the container on the first free port
* Mounts the dashticz_v3 folder to the web-root of the container
* Shows the Dashticz url

If you open this url then the default Dashticz dashboard becomes visible.

So no more need to configure Apache and/or PHP! It just works out-of-the box.
You need a few 100 MB free space on your system.

The first time the installation may take a while (5 - 15 minutes?): be patient.

Update from a previous version
------------------------------
If the default page is working then you can copy your previous CONFIG.js, custom.css, custom.js from your previous installation to dashticz_v3/custom.

Just refresh your browser, and your new dashboard is shown. No need to rebuild the docker container.
