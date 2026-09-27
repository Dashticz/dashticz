.. _WizardAutomation :

Automation
==========

With an automation a tile reacts to the status of its own Domoticz device.
You can give the tile a different background or border, or show a text in
another tile, for example a red border around a door sensor that is open, or
the text *Mower is active* in a text tile while the mower runs.

Automations are configured in the **Automation** section of the
:ref:`DeviceConfig` of the device that triggers them. They are available for
every tile that is linked to a Domoticz device.

.. image :: ../img/wizard/automation.png
   :width: 600px

Click **Add automation** to add a rule. A device can have several rules; each
rule has its own switch to enable or disable it, and a trash button to remove
it.

Trigger
-------

Every rule checks one condition on the device:

* **Status / property**: the device property to check, for example ``Status``,
  ``Data`` or ``Level``. The list suggests the properties of the device.
* **Condition**: *equals*, *not equals*, *less than*, *less than or equal*,
  *greater than*, *greater than or equal*, *contains*, *does not contain*,
  *is empty* or *is not empty*.
* **Value**: the value to compare with. Not used for *is empty* and
  *is not empty*.

Actions
-------

A rule needs at least one enabled action. The actions follow the trigger:
they are applied while the condition is true, and removed again as soon as it
is false.

**Add CSS to current device**
  Gives the tile of this device a **Background** (color and opacity) and/or a
  **Border** (color, width and style) while the condition is true.

  Under **Advanced CSS options** you can choose another **Styling**: only a
  CSS class of your own (*Existing CSS / class only*), background, border,
  text color or combinations of these, or a *Floating banner*: a text shown
  on top of the tile, with its own position and font size. You can also set
  the name of the generated **CSS class**.

**Put text in another device**
  Shows **Text when true** or **Text when false** in the data field of another
  tile, the **target device**. The list shows all configured tiles with their
  name, IDX and key; Domoticz text devices are listed first. When several
  automations write to the same target, their texts are shown on separate
  lines.

  **Also apply CSS to target device** gives the target tile its own
  background and/or border while the condition is true, with the same options
  as above.

Custom JS handler
-----------------

Under **Advanced** at the bottom of the Automation section you can link the
device to a function of your own in ``custom/custom.js``:
enter a name, and Dashticz calls ``getStatus_<name>(block, afterupdate)`` on
every update of the device. See :ref:`custom.js`.

Where automations are stored
----------------------------

Dashticz stores the rules and the generated styling in ``custom/custom.js``
and ``custom/custom.css``, in sections marked with comments. Don't edit these
sections by hand; Dashticz rewrites them when you change an automation. Your
own code outside these sections is left alone.
