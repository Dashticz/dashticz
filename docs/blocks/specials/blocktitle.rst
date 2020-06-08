.. _blocktitle :

Blocktitle
==========

.. image :: img/blocktitle.jpg

A special block type is a block title.
You define a block title as follows::

  blocks['blocktitle_1'] = {  //'blocktitle_1' must be an unique name
    type: 'blocktitle',       //Set type to 'blocktitle' (required for block title)
    title: 'My Devices Block',        //The title of the block as shown in the dashboard.
    width: 6,                 //The width of the block relative to the column width
    icon: 'far fa-lightbulb', //If you want  to show an icon, choose from: https://fontawesome.com/icons?d=gallery&m=free
    image: 'lightbulb.png'    //If you want to show an image instead if icon, place image in img/ folder    
  }

Block parameters
----------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - title
    - ``'<string>'``: Custom title for the block
  * - icon
    - | Defines the icon for this block, choose from: https://fontawesome.com/icons?d=gallery&m=free
      | ``'fas fa-eye'``
  * - image
    - | If you want to show an image instead of an icon, place image in ``img/`` folder
      | ``'bulb_off.png'``
  * - type
    - Set this parameter to ``'blocktitle'``
  

