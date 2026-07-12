# Dashticz
Alternative dashboard for Domoticz.

This repository is a lean runtime-focused fork. The dashboard block
implementations are intentionally kept intact; historical source copies,
the bundled documentation website, editor metadata, and example/test suites
are not part of this fork.

Development configuration lives in `build/`. Optional diagnostic utilities
live in `tools/`. The root contains only files required by the browser,
the updater, npm, or backwards-compatible integrations.

The optional Ziggo/UPC helper is available at `tools/switch_horizon.php`.
Existing configurations that use `switch_horizon.php` are redirected to the
new location by the dashboard code.

## Dependency compatibility

Dependencies are kept on the newest compatible release line. Major upgrades
of Bootstrap, Chart.js, jQuery, Font Awesome and their related plugins require
dedicated UI migrations and must not be applied as automated version bumps.
Bootstrap 3 currently has no patched 3.x release; Dashticz does not use the
affected tooltip, popover or `data-loading-text` APIs. Swiper is pinned to the
patched 12.x line to retain broader tablet browser support.

The Dashboard of Domoticz is quite powerful. The disadvantage is that it's only possible to show information known in Domoticz.
There is where Dashticz steps in. Dashticz is able to show (almost) all Domoticz information.
In addition to that it's possible to show information from all kind of other sources.

# Screenshots
![alt tag](http://i.imgur.com/9DBcpNd.jpg)

# Installation instructions
See https://dashticz.readthedocs.io/en/master/gettingstarted/

# Documentation and support
Documentation can be found on:
https://dashticz.readthedocs.io

For additional information and support please visit the Dashticz forum:
https://www.domoticz.com/forum/viewforum.php?f=67

**Additional info**

This currently is the active Dashticz repository. Previous repositories (dashticz/dashticz_v2 and dashticzv3/dashticz_v3) will not be updated anymore.
