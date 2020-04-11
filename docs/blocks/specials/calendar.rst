.. _customcalendar :

Calendar 
########

You can add a block with upcoming events from your ical-calendar (gmail, apple etc.).
You have to add the following code into the ``CONFIG.js`` file and define them as::

    var calendars = {}
    calendars.business = { maxitems: 5, url: 'https://calendar.google.com/calendar/', icalurl: 'https://calendar.google.com/calendar/ical/email%40gmail.com/public/basic.ics' }
    calendars.private = { maxitems: 5, icalurl: 'https://calendar.google.com/calendar/ical/myemail%40gmail.com/private-xxxxxxxxxxx/basic.ics' }

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - maxitems
    - ``1..30``: Maximum number of calendar items to display
  * - icalurl
    - the web address to the ical-version of your calendar.
  * - url
    - (optional) The web address of the page to be shown when clicking the block.
  * - calFormat
    - | The calendar formatting to use
      | ``0``: Compact format (default)
      | ``1``: Table format
  * - dateFormat
    - | String to change the date formatting of a calendar item using moments.js
      | Only applicable for ``calFormat: 1``
      | ``'dd DD-MM'``. This will represent the dates as 'di 24-9'
  * - timeFormat
    - | String to change the time formatting of a calendar item using moments.js
      | Only applicable for ``calFormat: 1``. Examples:
      | ``'LT'`` (=default): This will represent the time in the local time format.
      | ``'HH:mm'``. This will represent the time as '23:12'
  * - icon
    - | Icon name. Example:
      | ``'fas fa-car'``. To display a car icon in the left column.
  * - image
    - Name of custom image to display in the first column. 
  * - adjustTZ
    - | Adjust start- and end-time for all calendar events to compensate time zone errors
      | ``-24 .. 24``: Number of hours to adjust
  * - adjustAllDayTZ
    - | Adjust start- and end-time for 'All Day'-events to compensate for time zone differences
      | ``-24 .. 24``: Number of hours to adjust
  * - fixAllDay
    - | Remove start time for All Day events that are created in a different time zone (only applicable in case ``calFormat: 0``)
      | ``false``: Show the start time for 'All Day'-events in case the start time is not 00:00
      | ``true``: Don't show the start time for 'All Day'-events
  * - key
    - | ``'key'``: unique identifier. You can use ``[data-id='calendars.key']`` in your ``custom.css``
  * - startonly
    - | Display start time only
      | ``false`` (=default): Display start time and end time
      | ``true`` : Display start time only
  
And define them in a column like::

    columns[1] = {}
    columns[1]['width'] = 2;
    columns[1]['blocks'] = [calendars.business,calendars.private]

If you want to combine multiple calendars, add this code:: 

    calendars.combined = {}
    calendars.combined.maxitems = 5;
    calendars.combined.calendars = [
       { color:'white',calendar:calendars.business }, 
       { color:'#ccc',calendar:calendars.private }
    ]
    calendars.combined.url = 'https://calendar.google.com/calendar';

And define them in a column like::

    columns[1] = {}
    columns[1]['width'] = 2;
    columns[1]['blocks'] = [calendars.combined]
    
.. note :: PHP support is required. See system preparation.

Dashticz config settings
------------------------

The following config settings are applicable:

.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - calendarformat
    - | Configure the Calendar Date/Time format. Only applicable in case ``calFormat`` is ``0``
      | ``'dd DD.MM HH:mm'`` = default
  * - calendarlanguage
    - | Controls the calendar locale
      | ``'nl'`` , ``'en'`` , ``'hu'``, etc.

Example
-------

::

    config['calendarlanguage'] = 'nl';

    var calendars = {}
    calendars.f1 = { 
      maxitems: 6,
      url: 'https://www.f1calendar.com/#!/timezone/Europe-Amsterdam',
      icalurl: 'http://www.f1calendar.com/download/f1-calendar_p1_p2_p3_q_gp_alarm-20.ics'
    }

    //Definition of columns
    columns = {}
    columns[1] = { 
      //In this example: No blocks are defined in this column
      //This column will be empty
      blocks : [calendars.f1],
      width: 4
    }

    //Definition of screens
    screens = {}
    screens[1] = {
      columns: [1]
    }

This will give:

.. image :: calendar.jpg

.. _calTable :

Example of table format
-----------------------

::

    calendars.f1 = {
        maxitems: 6,
        url: 'https://www.f1calendar.com/#!/timezone/Europe-Amsterdam',
        icalurl: 'http://www.f1calendar.com/download/f1-calendar_p1_p2_p3_q_gp_alarm-20.ics',
        calFormat: 1,
        dateFormat: "dd M",
        timeFormat: "HH",
        icon: 'fas fa-car'
    }

This will give:

.. image :: img/calendar1.jpg

Usage
-----

Google Calendar
~~~~~~~~~~~~~~~

You have to know the correct link to your Google Calendar. You can find them as follows:

* Open https://calendar.google.com/calendar
* Under 'My calendars' click on the three dots behind your calendar -> settings and sharing

* In the page that opens look for the following links:
  
  * Public URL to this calendar. It's something like:
    ``https://calendar.google.com/calendar/embed?src=yourname%40gmail.com&ctz=Europe%2FAmsterdam``

    Use this public url as url parameter in your calendar block.

  * Secret address in ICAL format. It's something like:
    ``https://calendar.google.com/calendar/ical/yourname%40gmail.com/private-5045b31...........ba/basic.ics``

    Use this ical url as icalurl parameter in your calendar block.


New Calendar 
############

The **new** calendar block follows the same look and feel as most other blocks. It uses "type" to tell Dashticz that its a calendar block. The new calendar block can be configured as follows::

	blocks['my_calendar'] = {
		type: 'calendar',
		maxitems: 5, 
		layout: 0,
		url: 'https://calendar.google.com/calendar/embed?src=_REDACTED_&ctz=Europe%2FLondon',
		icalurl: 'https://calendar.google.com/calendar/ical/_REDACTED_/private-123456789/basic.ics',
		holidayurl: 'https://www.calendarlabs.com/ical-calendar/ics/75/UK_Holidays.ics',	
		weeks: 5,
		lastweek: false,	
		isoweek: false,
		width: 12
	}

The "calFormat" parameter is now called "layout", it has 3 options:

* layout: 0 - lists an agenda of events in text format
* layout: 1 - lists an agenda of events in table format
* layout: 2 - displays a traditional calendar in table format

Other parameters include the following:

* **url** - this can be set on the block or in settings['calendarurl']. Whenever you click the calendar block whilst setting layout 0 or 1, an embedded gmail calendar will display in a popup dialog (modal). Alternatively, when layout 2 is set, when clicking on any event, it will display a popup with the event details and provide a link to the calendar (e.g. gmail).
* **icalurl** - this can accept either a single url (string) or one or more calendar objects (example below).
::

	blocks['gmail_calendars'] = {
		type: 'calendar',
		layout: 2,
		icalurl: { 
			Personal: {
				ics: 'https://calendar.google.com/calendar/ical/_REDACTED_/private-123456789/basic.ics',
			color: 'blue'
			},
			Business: { 
				ics: 'https://calendar.google.com/calendar/ical/_REDACTED_/private-123456789/basic.ics',
				color: 'purple'
			}
		},
		holidayurl: 'https://www.calendarlabs.com/ical-calendar/ics/75/UK_Holidays.ics',	
		maxitems: 100, 
		weeks: 5,
		lastweek: true,	
		isoweek: false,
		width: 12
	} 
* **holidayurl** this allows users to add public holidays (or other public events) to their calendar.
* **maxitems** - this limits the number of events that you want to display. When setting layout 2, I set it to 100 to allow for 35 days. Adjust to your own preference.
* **weeks** - this is how many weeks, or rows of 7 days, you wish to display when layout 2 is selected.
* **lastweek** - if set to true, this will show the previous week and any events from that week. It accepts true or false. Default is false.
* **isoweek** - if set to true, the week will start on a Monday. If false, it will start on a Sunday. Accepts true or false. Default is false.

The layout set to 0 will display this:

.. image :: img/calendar0.png

The layout set to 1 will display this:

.. image :: img/calendar1.png

The layout set to 2 will display this:

.. image :: img/calendar2.png

When the user clicks on any events, it opens details about that event. If the event details is already HTML, it will render the HTML event body, including font, tags, anchors/links, etc. The contents of the popup is scrollable. Also included in the popup is a link to source calendar (bottom left), if one has been set in config.js. On the bottom right of the popup, the event location is displayed (if this exists). When clicked, it will take the user to the location on Google maps.

.. image :: img/calendar2_modal.png
