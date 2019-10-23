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
