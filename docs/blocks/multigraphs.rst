.. _multigraphs:

Multigraphs
===========

Multigraphs can be used to combine the data from several devices into one single graph

.. note :: The multigraph functionality has been recently added to Dashticz and is still under development 

Multigraph block parameters
----------------------------

.. list-table:: 
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Parameter
    - Description
  * - devices
    - an array of the device ids that you want to report on, e.g. [ 17, 18, 189 ]
  * - multigraphTypes
    - similar to graphTypes for the standard graph, an array of values you want to show in the graph, e.g. ['te'] (default is all)
  * - exclude
    - exclude certain data from being returned from one or more devices, e.g. ['te']
  * - interval
    - a time based limiter, to limit time data, e.g. 2 will show 1/2 the time labels, 5 will show 20% of the time labels (default is 1)
  * - maxTicksLimit
    - specifies how many labels (ticks) to display on the X axis, this does not limit the data in the graph, e.g. 10 (default is all)
  * - cartesian
    - scales the graph with standard 'linear' scale, or 'logarithmic', an algorithm to ensure all data can be seen (default is linear)
  * - iconColour
    - colours the graph's title icons (default is grey)
  * - lineFill
    - if line graph, this fills the graph, it is an array for each dataset, e.g.['true', 'false', 'true'] (default is false)
  * - borderWidth
    - this is actually the width of the line (default is 2)
  * - borderDash
    - use if you want a dashed line, it takes an array of two values; length of the line and the space, e.g. [ 10, 10 ] (default is off)
  * - borderColors
    - handy for bar graphs, takes an array of colours like datasetColors, e.g. ['red', 'green', 'blue'] (default uses datasetColors)
  * - pointRadius
    - the size of each data point, e.g. 3 (default is 1)
  * - pointStyle
    - an array of the shape of each point, such as circle|cross|dash|line|rect|star|triangle, e.g.['star','triangle'] (default is circle)
  * - pointFillColour
    - an array containing the colour of each point, e.g. ['red', 'green', 'blue'] (default uses datasetColors)
  * - pointBorderColor
    - an array containing the border colour of each point, e.g. ['red', 'green', 'blue'] (default is light grey)
  * - pointBorderWidth
    - the thickness of the point border, e.g. 2 (default is 0)
  * - barWidth
    - if a bar graph, this is the width of each bar, 0-1, e.g. 0.5 is half bar, half gap (default is 0.9)
  * - reverseTime
    - use this if you want to reverse your X axis, i.e. setting 'true' would mean the time will be reversed (default is false)
  * - lineTension
    - sets the bezier curve the line is, 0 is straight, 1 is extremely curved! e.g. 0.4 gives a nice bendy line (default is 0.1)
  * - drawOrderLast
    - an array stating the order in which each dataset should be added to the graph for "last hours", e.g. ['v2', 'v1']
  * - drawOrderDay
    - an array stating the order in which each dataset should be added to the graph for "today", e.g. ['v3', 'v1', 'v2']
  * - drawOrderMonth
    - an array stating the order in which each dataset should be added to the graph for "last month", e.g. ['v1', 'v2', 'c1', 'c2']
  * - buttonsBorder
    - color of the buttons border, e.g. 'red', default is 'white'
  * - buttonsColor
    - color of the buttons text, e.g. '#fff' or 'white', default is 'black'
  * - buttonsFill
    - color of the buttons background colour, e.g '#000' or 'black', default is 'white'
  * - buttonsIcon
    - color of the buttons icon, e.g. 'blue', default is 'grey'
  * - buttonsMarginX
    - gap (or margin) between the buttons (left and right), e.g. 5, default is 2
  * - buttonsMarginY
    - gap (or margin) above and below the buttons, e.g. 5, default is 0
  * - buttonsPadX
    - padding inside the buttons (left and right), e.g. 10, default is 6
  * - buttonsPadY
    - padding inside the buttons, top and bottom, e.g. 5, default is 2
  * - buttonsRadius
    - the curveture of the corners of the buttons, e.g. 10, default is 4
  * - buttonsShadow
    - the shadow below the button in RGBA format (last number is opacity), e.g. 'rgba(0,0,0,0.5)', default is off
  * - buttonsSize
    - the size of the button, e.g. 12, default is 14
  * - buttonsText
    - change the text displayed on each button in an array, e.g. ['Now', 'Today', 'Month'], default is what you see today

datasetColors
~~~~~~~~~~~~~
Custom colors, defined by the parameter ``datasetColors``::

    datasetColors: ['red', 'yellow', 'blue', 'orange', 'green', 'purple']
    
Set the dataset colors to html colors, hex code, rgb or rgba string::

    datasetColors: [colourBlueLight, colourLightGrey, colourBlue]
    var colourBlueLight= 'rgba(44, 130, 201, 1)';

Examples
---------

**CPU, Memory & HDD**::

    blocks['multigraph_17'] = {
	    title: 'CPU, Memory & HDD',
	    devices: [ 17, 18, 189 ],
      datasetColors: [colourRed, colourOrange, colourBlue, colourGreen, colourBlueLight, colourAqua, colourYellow, colourPurple, colourPink],
      legend: true,
      cartesian : 'linear', 	
      graph: 'line',
      lineFill: true,
      drawOrderDay:   ['v1', 'v3', 'v2'],
      drawOrderMonth: ['v_min1', 'v_avg1', 'v_min2', 'v_max1', 'v_avg3', 'v_max3', 'v_min3', 'v_avg2', 'v_max2'],
      legend: {
        'v1'		: 'CPU',	  
        'v_avg1'	: 'CPU avg',
        'v_max1'	: 'CPU max',
        'v_min1'	: 'CPU min',
        'v2'		: 'MEM',
        'v_avg2'	: 'MEM avg',
        'v_max2'	: 'MEM max',
        'v_min2'	: 'MEM min',
        'v3'		: 'HDD',
        'v_avg3'	: 'HDD avg',
        'v_max3'	: 'HDD max',
        'v_min3'	: 'HDD min'
    }
  }

.. image :: img/multigraph3.png

**Grid vs Solar**::

	blocks['multigraph_1'] = {
		title: 'Grid vs Solar',
		devices: [ 162, 1],
		datasetColors: [colourRed, colourGreen],		
		lineFill: [true, true],						
		graph: 'line',				
		cartesian: 'logarithmic', 				
		drawOrderLast: ['v2', 'v1'],
		drawOrderDay: ['v2', 'v1'],
		drawOrderMonth: ['v1', 'v2', 'c1', 'c2'],
		legend: {
			'v1': 'Grid',	
			'v2': 'Solar', 
			'c1': 'Solar Cumulative',	  
			'c2': 'Solar Cumulative'
		}
	} 


This is using the standard linear scale (i.e. ``cartesian = linear``):

.. image :: img/multigraph6.png

This is using the new logarithmic scale (i.e. ``cartesian = logarithmic``). Note the y axis labelling on the left:

.. image :: img/multigraph5.png

**Outside vs Inside Temp**::

	blocks['multigraph_72'] = {
		title: 'Outside vs Inside Temp',
		devices: [ 72, 152],
		datasetColors: [colourBlueLight, colourLightGrey, colourBlue, colourOrange, colourRed, colourYellow],
		exclude: ['ba', 'hu'],
		graph: 'line',
		legend: {
          		'te1'	: 'Outside (max)',	  
	  		'ta1'	: 'Outside (avg)',
	  		'tm1'	: 'Outside (min)',
	  		'te2'	: 'Inside (max)',
	  		'ta2'	: 'Inside (avg)',
	  		'tm2'	: 'Inside (min)'
		}
	}

.. image :: img/multigraph4.png

