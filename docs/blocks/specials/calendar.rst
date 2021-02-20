.. _customcalendar :
.. _newcalendar :

.. note :: From 3.7.3 onwards only the 'new calendar' block is supported.

New Calendar 
############

You can add a block with upcoming events from your ical-calendar (gmail, apple etc.).

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
    - | Configure the Calendar Date/Time format.
      | ``'dd DD.MM HH:mm'`` = default
  * - calendarlanguage
    - | Controls the calendar locale
      | ``'nl'`` , ``'en'`` , ``'hu'``, etc.

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


The **new calendar** block follows the same look and feel as most other blocks. It uses ``type`` to tell Dashticz that its a calendar block. The **new calendar** block can be configured as follows::

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


.. list-table:: 
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table
      
  * - Parameter
    - Description
  * - emptytext
    - The text to show in case there are no appointments. Default: ``'Geen afspraken'``
  * - calFormat
    - The parameter "calFormat" is absolete. The "calFormat" parameter for the **new calendar** is called ``layout``
  * - layout
    - | ``0``: Lists an agenda of events in text format
      | ``1``: Lists an agenda of events in table format
      | ``2``: Displays a traditional calendar in table format
      | ``3``: Lists an agenda of all day events in text format (no time is shown)
      | ``4``: Lists an agenda of all day events in table format (no time is shown)
  * - icalurl
    - This can accept either a single url (string) or one or more calendar objects (example below)
  * - ics
    - Url (string) of the calendar object
  * - color
    - Color of the calendar text. Must be *html colors, hex code, rgb* or *rgba string*
  * - url
    - This can be set on the block or in settings['calendarurl']. Whenever you click the calendar block whilst setting layout 0 or 1, an embedded gmail calendar will display in a popup dialog (modal). Alternatively, when layout 2 is set, when clicking on any event, it will display a popup with the event details and provide a link to the calendar (e.g. gmail)
  * - holidayurl
    - This allows users to add public holidays (or other public events) to their calendar
  * - maxitems
    - This limits the number of events that you want to display. When setting layout 2, I set it to 100 to allow for 35 days. Adjust to your own preference
  * - weeks
    - This is how many weeks, or rows of 7 days, you wish to display when layout 2 is selected
  * - lastweek
    - | Show the previous week and any events from that week
      | ``true``: Show the previous week
      | ``false`` (=default): Don't how the previous week
  * - isoweek
    - | The week will start on a Sunday or on a Monday
      | ``true``: Week will start on a Monday
      | ``false`` (=default): Week will start on a Sunday
  * - icon
    - | Icon name. Example:
      | ``'fas fa-car'``. To display a car icon in the left column
  * - image
    - | If you want to show an image instead of an icon in the left column. Place image in ``img/`` folder
      | ``'calendar.png'``
  * - title
    - | A title will be shown above the calendar
      | ``'<string>'``: Title for the block
  * - width
    - ``1..12``: The width of the block relative to the column width
  * - method
    - | ``0``: ical method 0 (recommended. Default when PHP version < 7.1)
      | ``1``: ical method 1 (default when PHP version >=  7.1)
  * - dateFormat
    - | String to change the date formatting of a calendar item using moments.js
      | ``'dd DD-MM'``. This will represent the dates as 'di 24-9'
  * - timeFormat
    - | String to change the time formatting of a calendar item using moments.js
      | Examples:
      | ``'LT'`` (=default): This will represent the time in the local time format
      | ``'HH:mm'``. This will represent the time as '23:12'
  * - startonly
    - | Display start time only
      | ``false`` (=default): Display start time and end time
      | ``true`` : Display start time only
  * - fixAllDay
    - | Remove start time for All Day events that are created in a different time zone
      | ``false``: Show the start time for 'All Day'-events in case the start time is not 00:00
      | ``true``: Don't show the start time for 'All Day'-events
  * - key
    - | ``'key'``: unique identifier. You can use ``[data-id='calendars.key']`` in your ``custom.css``


Notes
-----

I did not find an ical library that handles all ical files correctly.

ical method 0 has issues with yearly recurring events.

ical method 1 has issues for recurring events with interval more than 1 (for instance biweekly events)


Example of traditional calendar in table format
-----------------------------------------------

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


The layout set to 0 will display this:

.. image :: img/calendar0.png


The layout set to 1 will display this:

.. image :: img/calendar1.png


The layout set to 2 will display this:

.. image :: img/calendar2.png


When the user clicks on any events, it opens details about that event. If the event details is already HTML, it will render the HTML event body, including font, tags, anchors/links, etc. The contents of the popup is scrollable. Also included in the popup is a link to source calendar (bottom left), if one has been set in config.js. On the bottom right of the popup, the event location is displayed (if this exists). When clicked, it will take the user to the location on Google maps.

.. image :: img/calendar2_modal.png


Example of a birthday calendar
------------------------------
When using ``layout: 3`` or ``layout: 4`` no time will be shown.

.. image :: img/calendar_birtdays.png

::

	blocks['birthdays'] = {
		type: 'calendar',
		layout: 4,
		dateFormat: 'D MMMM',
		icalurl: 'http://... .../birthdays.ics'
		maxitems: 5, 
		icon: 'fas fa-birthday-cake',	
	}

