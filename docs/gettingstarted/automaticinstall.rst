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

The installer accepts these equivalent directory forms:

.. code-block:: sh

   # Short option
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- -d /var/www/html/my-dashboard

   # Option with equals sign
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory=/var/www/html/my-dashboard

   # Positional directory
   bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- /var/www/html/my-dashboard

The ``DASHTICZ_INSTALL_DIR`` environment variable can also select the target:

.. code-block:: sh

   DASHTICZ_INSTALL_DIR=/var/www/html/my-dashboard \
     bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"

Use ``--help`` to show the installer help. An explicit directory argument
overrides ``DASHTICZ_INSTALL_DIR``. Relative and absolute paths are supported;
quote a path containing spaces.

The installer:

* installs Git when necessary and supported by the operating system;
* clones the stable ``master`` branch into the selected directory (``dashticz``
  by default);
* creates ``custom/CONFIG.js`` below that directory with the content
  ``#EMPTY#``;
* gives ``CONFIG.js`` file mode ``0644``;
* attempts to give the web-server account write access to ``custom/`` and the
  Git checkout for browser settings and updates.

The target directory must not exist yet. To update an existing stable
installation, run:

.. code-block:: sh

   cd dashticz
   sh update.sh

After installation, edit ``custom/CONFIG.js`` to configure the dashboard.
