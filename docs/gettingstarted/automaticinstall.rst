.. _AutomaticInstall :

Automatic install
=================

Open a terminal in the directory in which you want to install Dashticz. Then
run the installer:

.. code-block:: sh

   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"

The installer:

* installs Git when necessary and supported by the operating system;
* clones the stable ``master`` branch into a new ``dashticz`` directory;
* creates ``dashticz/custom/CONFIG.js`` with the content ``#EMPTY#``;
* gives ``CONFIG.js`` file mode ``0755``.

The target directory must not exist yet. To update an existing stable
installation, run:

.. code-block:: sh

   cd dashticz
   sh update.sh

After installation, edit ``custom/CONFIG.js`` to configure the dashboard.
