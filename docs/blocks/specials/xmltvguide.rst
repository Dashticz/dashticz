.. _xmltvguide:

XMLTV TV Guide
==============

The XMLTV TV Guide widget displays current and upcoming TV programmes from
any source that exports guide data in the
`XMLTV format <http://wiki.xmltv.org/index.php/XMLTVFormat>`_.

XMLTV is a widely-supported open standard.  Many home-media and recording
solutions can serve guide data in this format, including:

* `WebGrab+Plus <http://webgrabplus.com/>`_
* `EPG123 <https://epg123.garyan2.net/>`_
* `Jellyfin <https://jellyfin.org/>`_ / `Emby <https://emby.media/>`_ (built-in EPG export)
* `Tvheadend <https://tvheadend.org/>`_
* `Zap2XML <http://zap2xml.awardspace.info/>`_

Basic usage
-----------

In ``CONFIG.js`` add::

    var xmltvguide = {}
    xmltvguide.home = {
        key: 'home',
        icon: 'fas fa-tv',
        width: 12,
        xmltvurl: 'http://my-epg-server/guide.xml',
        channels: ['BBC One', 'ITV', 'Channel 4'],
        maxitems: 10
    }

And add the widget to a column::

    columns[4] = {
        blocks: [xmltvguide.home]
    }

The ``xmltvurl`` property is the only required setting.  It must point to a
valid XMLTV XML file.  If the file is on a different origin you may need to
prefix it with ``_CORS_PATH`` (see the Dashticz CORS settings).

When you use the Widget Editor / Settings UI, Dashticz stores these widget
settings as global ``config[...]`` values for consistency with widgets such as
Sonarr::

    config['xmltv_url'] = 'http://my-epg-server/guide.xml';
    config['xmltv_channels'] = 'BBC One, ITV, Channel 4';
    config['xmltv_maxitems'] = 10;
    config['xmltv_layout'] = 0;
    config['xmltv_separator'] = '-';
    config['xmltv_refresh'] = 3600;

    blocks['widget_xmltvguide'] = {
        type: 'xmltvguide',
        width: 12,
        title: 'TV Guide'
    }

Hand-written block-local settings (``xmltvurl``, ``channels``, etc.) remain
supported and override the global ``config[...]`` values for that block.

Parameters
----------

.. list-table::
  :header-rows: 1
  :widths: 5, 30
  :class: tight-table

  * - Parameter
    - Description
  * - xmltvurl
    - | ``'<url>'`` *(required)* URL of the XMLTV XML file to fetch.
      | Example: ``'http://192.168.1.10:5004/epg.xml'``
  * - channels
    - | Array of channel identifiers to display.  Each entry may be either:
      | – the channel **id** attribute as it appears in the XMLTV file
      |   (e.g. ``'BBC1.uk'``)
      | – the channel **display-name** text (e.g. ``'BBC One'``)
      | Matching is case-insensitive.
      | When omitted or empty **all** channels in the file are shown.
  * - maxitems
    - | Maximum number of programme rows to display. Default: ``10``.
  * - layout
    - | ``0`` – show time, **channel name** and programme title (default)
      | ``1`` – show time and programme title only (no channel column)
  * - separator
    - | Character shown between columns. Default: ``'-'``
  * - refresh
    - | Refresh interval in seconds. Default: ``3600`` (1 hour).
      | XMLTV files can be large; a long interval reduces server load.
  * - title
    - | Title shown in the block header.
  * - width
    - | ``1..12`` Width of the block.
  * - icon
    - | ``'fas fa-icon'`` FontAwesome Free icon for the block header.
  * - image
    - | ``'image.png'`` Image used as icon (relative to ``<dashticz>/img/``).
  * - url
    - | ``'<url>'`` When set, clicking the block opens this URL in a popup
      | instead of the default behaviour.
  * - key
    - | ``'key'`` Unique identifier for this block.

Finding channel identifiers
---------------------------

Open the XMLTV file in a text editor (or browser) and look for ``<channel>``
elements near the top of the file.  The ``id`` attribute and the
``<display-name>`` text are both accepted::

    <channel id="bbc1.uk">
        <display-name>BBC One</display-name>
    </channel>

Either ``'bbc1.uk'`` or ``'BBC One'`` works as an entry in the ``channels``
array.

Differences from the built-in TV Guide
---------------------------------------

.. list-table::
  :header-rows: 1
  :widths: 10, 20, 20
  :class: tight-table

  * - Feature
    - Built-in TV Guide (``tvgids.nl``)
    - XMLTV TV Guide (this widget)
  * - Data source
    - Hard-coded ``tvgids.nl`` API (Dutch only)
    - Any XMLTV-compatible source
  * - Channel filter
    - Numeric channel IDs from tvgids.nl
    - Channel id or display-name from the XML file
  * - Language
    - Dutch-centric
    - Universal
  * - Subtitle / category
    - Not shown
    - Shown when present
