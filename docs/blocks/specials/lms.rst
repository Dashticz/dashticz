.. _lms :

Lyrion Music Server
####################

Shows a read-only "Now Playing" block for one player on a `Lyrion Music
Server <https://lyrion.org>`_ (LMS, formerly Logitech Media Server): cover
artwork on the left, artist/title/album (or station/artist/title for
internet radio) on the right. It never sends any playback command to LMS -
play/pause/volume controls are intentionally out of scope.

Requires the PHP ``curl`` extension on the server running Dashticz (the
same one used for most of Dashticz's other remote/proxy requests) - without
it, "Test connection" and the block itself show
*"The PHP curl extension is required for the Lyrion Music Server block."*

Wizard
------

The easiest way to add this block is via the Screen Editor's **Add items**
menu -> **Widgets** -> **Lyrion Music Server** (next to Spotify/Sonarr).
Enter the server address and port (and username/password only if LMS
authentication is enabled), click **Test connection** to discover the
players on that server, and pick one from the **Player** dropdown. The
block's own configuration cog reopens the same popup later to change the
server, player or refresh interval. The **Hide block when player is off**
switch replaces the "Player off" message with nothing at all (no icon, no
text) whenever the player is powered down - useful together with a
device/widget's own **No background** option to make the whole block
disappear until the player is turned back on. The **Text style** section lets
you set a font size and color for the Title, Artist and Station lines
independently (the title is always shown in bold); leaving these untouched
keeps the active theme's own defaults. Unlike the other tiles in the
Widgets catalog, this one can be added more than once, so each LMS player on
the network can get its own block.

Manual configuration
---------------------

A block can also be hand-written directly in ``custom/CONFIG.js``::

    blocks['lms_livingroom'] = {
        type: 'lms',
        server: '192.168.1.6',
        port: 9000,
        username: '',
        password: '',
        player: 'aa:bb:cc:dd:ee:ff',
        refresh: 5,
        hide_when_off: false,
        width: 6
    };

``player`` is the LMS player id (its MAC address for most hardware/software
players) rather than its display name - the Wizard's Test connection step
looks this up automatically, but it is also shown in LMS's own
Settings -> Information page.

Parameters
----------

=======================   ===============================
Parameter                 Description
=======================   ===============================
type                      Must be ``'lms'``
server                    LMS server hostname or IP address
port                      LMS HTTP port (default LMS install: ``9000``)
username                  Only needed when LMS authentication is enabled
password                  Only needed when LMS authentication is enabled
player                    LMS player id (MAC-style, not the display name)
refresh                   Poll interval in seconds (2-3600, default: ``5``)
hide_when_off             ``true``: show nothing (no icon, no "Player off" text) while the player is off, instead of the usual "Player off" message. Default ``false``
title                     ``'<string>'``: Custom title for the block
width                     The block width
icon                      Optional icon to show in the block. Default no icon (the cover artwork is this block's own visual). When set, it's shown as a small badge in the top-left corner of the cover artwork itself, rather than in the usual icon column
title_size                Song title font size in px (default ``16``). Also settable from Device Config's Text style section
title_color               Song title color as ``'#rrggbb'`` (default ``'#ffffff'``). The title is always bold
artist_size               Artist font size in px (default ``14``)
artist_color              Artist color as ``'#rrggbb'`` (default ``'#cccccc'``)
station_size              Station font size in px (default ``14``, internet radio only)
station_color             Station color as ``'#rrggbb'`` (default ``'#999999'``, internet radio only)
=======================   ===============================

Networking
----------

The dashboard's own browser never talks to LMS directly: every request
(player discovery, the "Now Playing" poll, and cover artwork) goes through
``vendor/dashticz/lms/index.php`` on the Dashticz server itself, which then
talks to LMS. This avoids CORS restrictions when LMS has no CORS headers of
its own, and avoids the "mixed content" browser block that would otherwise
apply to a plain-HTTP LMS server embedded in an HTTPS dashboard.

Multiple LMS blocks are supported - each is configured (and polled)
completely independently, whether they point at the same LMS server and
different players, or different LMS servers entirely.
