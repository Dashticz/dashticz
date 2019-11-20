.. _secpanel:

Domoticz Security Panel
#######################

There are three ways to show the Domoticz Security Panel:

* As special block 'secpanel'
* As Domoticz device
* In a frame

Security Panel special block
----------------------------

You can add the Domoticz Security Panel as special block ::

    columns[1]['blocks'] = ['secpanel'];

This will show a Domoticz like security panel, which automatically scales to the block width.
The styling can be modified via custom.css.

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
