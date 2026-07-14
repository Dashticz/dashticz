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

## Recent modernization and stability update

This fork includes a broad maintenance update focused on reliability,
security, and long-term browser compatibility:

- The screensaver timeout is now calculated from the last real user activity.
  Touching or operating the dashboard after closing the screensaver correctly
  restarts the inactivity period.
- Bootstrap remains on the 3.4 compatibility line because the existing
  Dashticz themes, grid markup, modals, buttons, and camera carousel depend on
  Bootstrap 3 layout behaviour. A future Bootstrap 5 upgrade requires a
  dedicated visual migration of all themes and components.
- Chart.js has been upgraded from 2.9 to 4.5, together with the current zoom
  plugin and date adapter. Existing graph definitions are converted to the new
  axes, tooltip, font, dataset, and zoom configuration at runtime.
- Moment.js and `handlebars.moment` have been replaced by Day.js. The existing
  global `moment(...)` calls and Handlebars templates remain compatible,
  including localized formats, Unix timestamps, date arithmetic, and custom
  parsing.
- The PHP proxy, calendar, settings, and bundled Horizon endpoints now enforce
  same-origin and CSRF protection where appropriate. Remote URLs are validated
  and private or reserved destinations are blocked by default to reduce SSRF
  risk.
- RSS and OAuth output is escaped or sanitized, and remote news links and
  images are restricted to HTTP(S) URLs.
- Block removal, map subscriptions, camera timers and listeners, WebSocket
  callbacks, authentication refresh, URL parsing, and sequential script
  loading have received lifecycle and error-handling fixes.
- The production bundle is rebuilt from the upgraded dependencies. Automated
  checks cover JavaScript syntax, JSON parsing, URL parsing, endpoint security,
  dependency versions, compatibility adapters, and LF-only line endings.

Existing login behaviour has deliberately not been redesigned as part of this
update.

## Security configuration

The bundled PHP proxy and calendar endpoints only fetch public HTTP(S) URLs.
Private, loopback, link-local, and reserved addresses are blocked by default.
If an internal calendar or feed is intentional, add its exact hostname to the
web server environment variable `DASHTICZ_ALLOWED_REMOTE_HOSTS`. Separate
multiple hosts with commas; a leading wildcard such as `*.example.local` is
also supported.

Saving settings through the browser uses a same-origin CSRF token and safely
serializes setting names and values. If PHP is unavailable or rejects the
write, Dashticz shows configuration text that can be copied into
`custom/CONFIG.js` manually.

## Development checks

Run `npm test` for the source, JSON, URL parsing, and endpoint security
regression checks. Run `npm run build` to verify the production bundle.

## Dependency compatibility

Chart.js 4, Day.js, jQuery, Font Awesome, and their related plugins are kept on
compatible maintained release lines. Bootstrap remains on 3.4 until the
dashboard markup and themes receive a complete Bootstrap 5 visual migration.
Future major upgrades must be treated as dedicated migrations rather than
automated version bumps. Swiper remains on the patched 12.x line to retain
broader tablet browser support.

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
