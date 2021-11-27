Connection
==========

This sections addresses several connection issues

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