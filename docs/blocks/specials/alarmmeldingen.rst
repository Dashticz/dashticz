.. _customalarmmeldingen :

Alarmmeldingen 
##############

This module can display (Dutch) 112 Meldingen.

Define your "alarmmeldingen" block (optional)::

	blocks['alarmmeldingen'] = {
		rss: 'https://alarmeringen.nl/feeds/city/venlo.rss',
		filter: 'Venlo',   //filter the messages for your town and if you want the cities around you
		show_lastupdate: true,
		width: 12,
		interval: 300,   //refresh rate in seconds
		results: 5   //number of recent results to show
	}

Add "alarmmeldingen" to a column::

	columns[1]['blocks'] = [
		'alarmmeldingen',


Use the site https://alarmeringen.nl to find the rss-feed of your choice (region, city)

.. image :: alarmmeldingen.JPG


Parameters
----------

=======================   ===============================
Parameter                 Description 
=======================   ===============================
rss                       The rss url for your City or Region from https://www.alarmeringen.nl/
filter                    Add search filters for surrounding cities or special messages mentioned in the alarmmessage like Traumaheli or Brandweer
show_lastupdate           ``true / false``: To display the ime of the last update of the data displayed
width	            	  The block width
interval                  The update interval of this block in seconds
icon                      The icon to show in the block, if you dont want to show an icon use ''
image                     The image to use instead of an icon. Location is relative to ``./img``
results                   The number of most recent results found by using the filter parameter
=======================   ===============================


Usage
-----

.. note:: Alarmmeldingen requires beta 3.4.0 or higher.

If you want to remove the icon, add the following to your block definition::

	icon: '',  //This are two tick-marks

To use your own image instead of a FontAwsome Free icon you can add this to your ''CONFIG.js""::

	image: '../custom/img/siren.png',

Styling
-------
To change the color of the alarmmessages add the following to your ``custom.css``::

	.alarmrow{
    	font-size: 14px !important;
	}
	.alarmrow a {
  	color: white;
	}
	.alarmrow strong{
    	display: inline-block;
	}


