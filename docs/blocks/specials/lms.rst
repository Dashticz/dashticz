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
server, player or refresh interval. Unlike the other tiles in the Widgets
catalog, this one can be added more than once, so each LMS player on the
network can get its own block.

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
title                     ``'<string>'``: Custom title for the block
width                     The block width
icon                      Optional icon to show in the block. Default no icon (the cover artwork is this block's own visual)
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
