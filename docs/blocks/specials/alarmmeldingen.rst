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

If you want to remove the icon, add the following to your block definition::

	icon: '',  //This are two tick-marks

.. image :: alarmmeldingen.JPG


