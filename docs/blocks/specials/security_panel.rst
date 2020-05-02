.. _secpanel:

Domoticz Security Panel
#######################

There are three ways to show the Domoticz Security Panel:

* As special block 'secpanel'
* As Domoticz device
* In a frame

Security Panel special block
----------------------------

Add the special block to a column::

    columns[1]['blocks'] = ['secpanel'];

This will show a Dashticz security panel, which automatically scales to the column width.

.. image :: secpanel.jpg

Additionally, if you have set your Domoticz security panel to "Armed Away", you can now configure Dashticz to secure automatically by applying the following setting in *CONFIG.js*::

    config['security_panel_lock'] = 1;

If the panel has been set to "Armed Away", it will display a fullscreen panel. The user will need to enter the code and either set "Disarm" or "Armed Home" to enable the blue enter button". Pressing this will then show your Dashticz main screen.

Buttons:
  * Green: Disarm
  * Amber: Armed Home
  * Red: Armed Away
  * Blue: Enter Dashticz

The countdown delay is set in *Domoticz, Setup > Settings > Security Panel > Delay*. If set to zero, there will be no countdown.

The above fullscreen lock feature does not require you to also have a Security Panel block added in *CONFIG.js*. But if you want one, you can add one::

  blocks['secpanel'] = {
    title: '',
    width: 6
  }

Or you can have a block defined and disable the fullscreen lock feature with this (which is the default if not set)::

  config['security_panel_lock'] = 0;

The secpanel height is based on its width to maintain the correct aspect ratio. The height is 1.35 x the width. You can set the height and width in the block, or in custom.css::

    [data-id='secpanel'] .dt_content {
        height: 200px!important;
        width: 148px!important;
    }


Security Panel block
--------------------

.. image :: security_panel_block.jpg

This is the Domoticz Security Panel as block. You can use the normal block parameters. See :ref:`dom_blockparameters` ::

    blocks[123] = {};  //123 is the Domoticz Security Panel device ID

You can add this block to a column with::

    columns[1]['blocks'] = [123];

CSS Tip!
To the active button an additional class ``btn-warning`` is added::

  .block_123 .btn.btn-warning {
    color: black !important;
  }

      
Security Panel frame
--------------------

.. image :: security_panel_frame.jpg

This is the Domoticz Security Panel as frame. You can use the normal frame parameters. See :ref:`Frames` ::

    frames.secpanel = {key: 'secpanel', height: 390, width: 12, frameurl: "http://<YOUR DOMOTICZ IP>:<PORT>/secpanel/index.html"}

You can add this frame to a column with::

    columns[1]['blocks'] = [frames.secpanel];

CSS Tip!
What you can do to scale the content of the iframe. Assuming you add ``key: 'secpanel'`` to the ``frames.secpanel`` definition, you can scale the secpanel with::

  [data-id='secpanel'].frame iframe {
    transform: scale(0.5);
    border: 0px;
    height: 600px !important;
    width: 200%;
    max-width: 200%;
    transform-origin: 0 0;
  }
