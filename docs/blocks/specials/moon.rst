.. _custommoon :

Moon 
####

With the moon block you can add a picture of the current moon phase
to your dashboard. Use the following code::

    columns[2] = {}
    columns[2]['blocks'] = [ 'moon']

If needed you can change the width::

  blocks['moon'] = {
    width: 6
  }

We have 100 moon images. A moon cycle takes approximately 28 days.
That means that the moon picture will refresh approximately 4 times a day.

.. image:: moon.17.png
