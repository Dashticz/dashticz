Configuration
=============


The Dashticz configuration is stored in the file ``[dashticz folder]/custom/CONFIG.js`` and consists of several parts.

In Wizard mode the setup wizard, the editors and the Settings menu write this
file for you (see :ref:`WizardMode` and :ref:`SettingsMenu`). The sections below
describe the file itself, which is what you edit in Custom mode. The same
parameters also work in Wizard mode, as long as you add them outside the
sections that the editors manage.

The first part is used to configure all kind of global Dashticz settings, including the Domoticz connection, language settings, etc. See :ref:`dashticzconfiguration`.

The second part is used to define all blocks.

In the third part the columns are defined, followed by the screens.

These four parts will be discussed in the following sections.

.. toctree::
   :maxdepth: 2

   dashticzconfiguration
   blocks/blocks
   columns
   screens
