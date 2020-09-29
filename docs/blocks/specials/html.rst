.. _customhtml :

HTML custom block 
#################

This module can display a custom html block.

As example we will add a weather widget created on https://weatherwidget.io

Confige your widget on weatherwidget.io. Copy-paste the widget code into a html-file in the custom folder.

Example for Amsterdam::

    <a class="weatherwidget-io" href="https://forecast7.com/en/52d374d90/amsterdam/" data-label_1="AMSTERDAM" data-theme="original" >AMSTERDAM</a>
    <script>
    !function(d,s,id){var js,fjs=d.getElementsByTagName(s)[0];if(!d.getElementById(id)){js=d.createElement(s);js.id=id;js.src='https://weatherwidget.io/js/widget.min.js';fjs.parentNode.insertBefore(js,fjs);}}(document,'script','weatherwidget-io-js');
    </script>

Copy this code into a file ``custom/weatherwidget.html``

Create a block containing the ``htmlfile`` parameter::

    blocks['weatherwidget'] = {
        htmlfile: 'weatherwidget.html'
    }

Add "weatherwidget" to a column::

	columns[1]['blocks'] = [
		'weatherwidget',


.. image :: img/weatherwidget.jpg


Parameters
----------

=======================   ===============================
Parameter                 Description 
=======================   ===============================
htmlfile                  Filename of the html code (relative to custom/)
margin                    ``true / false``: To display a margin around the html block (default: false) 
title                     ``'<string>'``: Custom title for the block
width	            	  The block width
icon                      The icon to show in the block. Default no icon.
image                     The image to use instead of an icon. Location is relative to ``./img``
=======================   ===============================


