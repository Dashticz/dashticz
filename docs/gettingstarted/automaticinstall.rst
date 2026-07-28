.. _AutomaticInstall :

Automatic install
=================

Open a terminal in the directory in which you want to install Dashticz. Then
run the installer:

.. code-block:: sh

   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"

To install directly into a different directory, pass the target path after
``--``:

.. code-block:: sh

   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory /var/www/html/my-dashboard

The shorter positional form is also supported:

.. code-block:: sh

   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- /var/www/html/my-dashboard

The installer:

* installs Git when necessary and supported by the operating system;
* clones the stable ``master`` branch into the selected directory (``dashticz``
  by default);
* creates ``custom/CONFIG.js`` below that directory with the content
  ``#EMPTY#``;
* gives ``CONFIG.js`` file mode ``0644``.

The target directory must not exist yet. To update an existing stable
installation, run:

.. code-block:: sh

   cd dashticz
   sh update.sh

After installation, edit ``custom/CONFIG.js`` to configure the dashboard.
