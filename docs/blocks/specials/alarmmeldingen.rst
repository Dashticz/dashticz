.. _customalarmmeldingen :

Alarmmeldingen 
##############


.. image :: 112.png

Add a block to your Dashboard containing 112 Alarm messages in your City or region.
This block is based on the RSS feed provided by https://www.alarmeringen.nl/

Define the block as follows in your ''CONFIG.js''::

	var alarmmeldingen = {
		rss: 'http://www.alarmeringen.nl/feeds/region/rotterdam-rijnmond.rss',
		filter: 'Poortugaal,Rhoon,Hoogvliet,Traumaheli,Pernis',
 		show_lastupdate:true,
		icon: '',
        width: 12,
		interval: 180,
		results: 5}
    
Add the block to a column, like::

	columns[1]['blocks'] = [alarmmeldingen]

Don't use 'alarmmeldingen'.

The parameters are

Parameters
----------

=======================   ===============================
Parameter                 Description 
=======================   ===============================
rss						  The rss url for your City or Region from https://www.alarmeringen.nl/
filter			          Add search filters for surrounding cities or special messages mentioned in the alarmmessage like Traumaheli or Brandweer
show_lastupdate           ``true / false``: To display the ime of the last update of the data displayed
width	            	  The block width
interval                  The update interval of this block in seconds
icon                      The icon to show in the block, if you dont want to show an icon use ''
results                   The number of most recent results found by using the filter parameter
=======================   ===============================


Usage
-----

.. note:: Alarmmeldingen requires beta 3.4.0 or higher.

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


To use your own image instead of a FontAwsome Free icon you can add this to your ''CONFIG.js""::

	image: '../custom/img/siren.png',

