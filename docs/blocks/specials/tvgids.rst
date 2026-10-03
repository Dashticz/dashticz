.. _tvgids :

TVgids24
========

The TVgids24 widget shows today's TV programme of the channels you choose, from
`tvgids24.nl <https://www.tvgids24.nl/>`_. Every channel gets its own column
with its logo above it: the programme on air now (in bold) and the ones after
it. The columns have a minimum width, so the block shows as many of them next
to each other as fit, and more of them when the block gets wider.

.. image :: img/tvgids.png

The programme is read server-side (``vendor/dashticz/tvgids/``) and cached per
channel for the poll interval, so several dashboards share one download. It is
the programme of the current day.

Add it via the Screen Editor: "Add items" -> Widgets -> TVgids24 (in the "Widgets
(multiple per screen)" section). You can place it several times, for example
one block per screen. Pick the channels by clicking their logos: they are
grouped as on tvgids24.nl (General, Other, Regional, Sport and Films), and the
order in which you click them is the order of the columns (the numbers on the
logos). Click a logo again to remove the channel. Change the channels and
settings of a placed block with the cog icon.

.. image :: img/tvgids_config.png

The logos are in ``img/custom/tvgids/``.

Settings
--------

These are block properties. The Screen Editor writes only the ones that differ
from the default.

.. list-table::
  :header-rows: 1
  :widths: 5 30
  :class: tight-table

  * - Setting
    - Description
  * - tvgids
    - The channels, comma separated, in the order of the columns, for example
      ``'npo_1,rtl_4,sbs6'``. Required: this property makes the block a TVgids24
      widget. The channel ids are those in
      ``vendor/dashticz/tvgids/channels.json``
  * - tvgidsmaxitems
    - Programmes per channel, from the one on air now. ``0``: the rest of the
      day. Default: 10
  * - tvgidsshowpast
    - ``true``: also show the programmes that have finished (dimmed). Default:
      false
  * - tvgidshidelogo
    - ``true``: the channel name above a column instead of its logo. Default:
      false
  * - tvgidscolumnwidth
    - Minimum width of a column in pixels (``120``-``1000``). Default: 250
  * - tvgidsfontsize
    - Optional: font size in pixels (``8``-``60``). Default: the size of the
      theme
  * - tvgidspollminutes
    - How often the programme of a channel is downloaded, in minutes. Minimum
      15. Default: 60

Example::

  blocks['tvgids_1'] = {
    width: 12,
    title: 'TVgids24',
    icon: 'fas fa-tv',
    tvgids: 'npo_1,npo_2,npo_3,rtl_4,sbs6,omroep_brabant',
    tvgidsmaxitems: 8
  };
