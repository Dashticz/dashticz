# Dashticz
Alternative dashboard for Domoticz.

Dashticz shows Domoticz devices together with information and controls from
other services. The production bundles are included, so a normal installation
does not require Node.js or a local build.

## Updating an existing installation

1. Back up the `custom/` directory, especially `custom/CONFIG.js` and
   `custom/custom.css`.
2. Update the Dashticz runtime files while preserving the contents of
   `custom/`.
3. Reload the dashboard. The bundle cache version is updated automatically;
   use a hard refresh once if an older browser tab still shows cached styling.
4. Verify custom selectors, camera blocks, clocks, and screensaver content.

Developers who change files under `src/` should use `npm ci`, run `npm test`,
and rebuild the committed production bundle with `npm run build`. The
`node_modules/` directory must not be committed.

## Browser configuration

### First-run wizard

When `custom/CONFIG.js` is missing or contains only `#EMPTY#`, Dashticz opens a
first-run wizard. PHP must be enabled and `custom/CONFIG.js` must be writable
by the web-server account. The wizard saves these options directly to that
file:

| Section | Options |
| --- | --- |
| Connection | Domoticz URL, login required, OAuth client ID and OAuth client secret |
| General | Dashboard name, language (`nl_NL`, `en_US`, `de_DE` or `fr_FR`), theme (`modern-dark`, `default` or `white`) and topbar auto-hide time |

The topbar auto-hide time defaults to 5 seconds. Select **Save & Start** to
create the configuration and open the dashboard.

### Wizard and Custom configuration modes

The mode switch in the topbar selects how the dashboard is managed:

- **Wizard** shows the Device, Widget and Visual Layout editors. These editors
  write only their marked sections in `custom/CONFIG.js`.
- **Custom** hides the three visual editor buttons and exposes the complete
  settings catalog, including the widget settings. Use this mode for a
  hand-written configuration.

Changing mode is saved in `custom/CONFIG.js` and reloads the dashboard. The
regular settings menu remains available in both modes.

### Topbar controls

The settings block can show the following controls. Hover an icon to see its
function:

| Control | Function |
| --- | --- |
| **Custom / Wizard** | Switch configuration mode |
| Plus | Open the Device Editor |
| Puzzle piece | Open the Widget Editor |
| Arrows | Open the Visual Layout Editor |
| Cog | Open Settings |
| Fullscreen | Enter or leave fullscreen mode |

The editor icons are available in Wizard mode. They are part of the `settings`
topbar block, so a custom topbar must include that block:

```javascript
var columns = {};
columns['bar'] = {
  blocks: ['logo', 'miniclock', 'settings']
};
```

Enabling the optional topbar clock keeps the original layout: the logo stays
in its left-hand lane and the clock starts directly after that lane. The screen selector,
Custom/Wizard switch and configuration icons form a single right-aligned
cluster.

The default topbar uses the same compact height as the Modern Dark theme,
including when no explicit theme is selected.

### Device Editor

After Dashticz has started, select the plus icon next to the settings icon in
the topbar to open the **Device Editor**. The editor can:

- add devices and sub-devices detected in Domoticz;
- add a **Dummy device** by entering a positive IDX; it is saved as
  `blocks['dummyblock_N'] = {idx: ..., width: 3, hide_data: true, title: 'Dummy_N'}`;
- add a **Title** by entering its text; it is saved without an IDX as
  `blocks['Title_N'] = {width: 12, type: 'blocktitle', title: '...', height: 120}`;
- remove devices from the generated dashboard configuration;
- change the mixed device and widget order by dragging rows;
- set each block width from 1 through 12 (new devices default to 3);
- show existing widgets as locked `Widget - name` rows, so they keep their
  correct position. Remove widgets through the Widget Editor.

Select **Save** to write the generated blocks and columns to
`custom/CONFIG.js`. Generated columns are added to screen 1 and the dashboard
reloads after saving. Back up an existing `CONFIG.js` before first using the
editor.

Dummy and Title appear above Groups, Scenes and Devices in the add selector,
separated by divider rows. Their labels and input validation use the selected
Dashticz language; English is used when a locale has no Device Editor strings.
In the Modern Dark theme, title blocks use the theme panel background, border,
rounded corners and shadow. Their title text is aligned at the top left.
In grid layouts a new title block is three rows high by default. Title blocks
may be resized down to three rows and never show an internal scrollbar.

### Widget Editor

Select the puzzle-piece icon to open the **Widget Editor**. It provides a tile
catalog. Select a tile to add it to screen 1, or select an active tile to remove
it. A selected tile with configurable options has a cog button. Choose
**Settings** on that tile, configure it, and then select **Save** in the main
Widget Editor.

| Widget | Available options |
| --- | --- |
| Weather | OpenWeather or Weather Underground; API key and location; forecast count; daily/minimum temperature; rain, description, wind and gust display; icon set; Fahrenheit, Beaufort and wind-speed translation |
| Garbage | Waste company; address; maximum items and width; iCal or Google Calendar details; icon, colour, name and CORS-prefix display options |
| Spotify | Spotify client ID |
| Sonarr | Server URL, API key and maximum items |
| Clock | Basic, Station, Flip, Hayman or Mini clock; size and scale; 12/24-hour flipclock with optional seconds; station body, dial, hands, boss and hand behaviour |
| Calendar (ICS) | HTTP(S) ICS URL, date format and calendar language |
| Security panel | Button icons and fullscreen lock |
| Public transport | Train, OV API, DRGL, iRail or De Lijn provider and station/stop |
| Traffic information | ANWB API key |
| 112 | RSS feed and optional comma-separated location/text filter |
| Cameras | Image URL and optional MJPEG video URL |
| Google Maps | API key, zoom level, latitude and longitude |
| Air quality | Longfonds postcode and house number |
| Moon | Domoticz IDX for the moon image |
| News | RSS URL and automatic-scroll interval |
| XMLTV TV Guide | XMLTV source URL; channel filter (id or display-name); maximum items, layout and refresh interval |

In grid layouts, the XMLTV TV Guide follows its assigned row height. It shows
only complete programme rows that fit and never adds an internal scrollbar;
enlarging the tile makes the additional rows visible again.

Widget-specific settings are kept together with the other `config[...]`
settings at the top of `custom/CONFIG.js`.

For OpenWeather, `showDescription` and `showRain` default to **Yes**, while
`showWind` and `showGust` default to **No**. The icon selector provides
`line`, `linestatic`, `fill`, `static` and `meteo` with their descriptive
labels. Garbage collection names and status messages use the selected language
when translations are available; custom names still take precedence when
`use_names` is enabled.

### Visual Layout Editor

Select the arrows icon in the topbar to open the **Visual Layout Editor** on
screen 1. Blocks created by the Device Editor receive a blue edit overlay:

- drag a block to change its position;
- drag the bottom-right corner to change its width and height;
- select the red minus button at the bottom-left to remove a device;
- width snaps to the 12-column dashboard grid;
- height snaps to steps of 10 pixels;
- free-grid blocks cannot be resized below 2x4 grid cells;
- select **Save** to update `custom/CONFIG.js`, or **Cancel**/Escape to restore
  the original layout.

Blocks inside generated `de_col*`, `we_col*`, and combined `le_col*` columns
are editable. This includes devices and widgets created by either editor.
Their mixed order is stored separately so the dashboard and Device Editor show
the same ordering. Manually configured blocks and topbar blocks are deliberately
left unchanged. Saved heights are applied to classic Domoticz device blocks as
well as the `modern-dark` theme.

Use the minus control directly beside the plus control to delete the active
extra screen. The minus control is disabled for Standby, screen 1 and when only
one numbered screen remains. Higher screen numbers are compacted after deletion.

After any visual editor is saved, Dashticz automatically consolidates its
generated output between `// [dashboard-editor-start]` and
`// [dashboard-editor-end]`. Inside that section all `blocks[...]` definitions
are grouped first, followed by all `columns[...]` definitions and finally the
`screens[...]` wiring. Older separate device, widget and layout sections are
migrated on the next save. Hand-written configuration outside the generated
section is preserved.

### Briefly show the topbar

Set `topbar_timeout` to the number of seconds that the topbar should remain
visible. It is shown when the dashboard opens and then automatically slides
out. Move the pointer to the top edge of the screen to show it again.

```javascript
config['topbar_timeout'] = 10;
```

Use `0` to keep the topbar permanently visible:

```javascript
config['topbar_timeout'] = 0;
```

The same value can be changed through **Settings → Screen → Topbar auto-hide**.
Existing configurations that still contain `config['hide_topbar']` should
remove that legacy setting when switching to `topbar_timeout`.

### Custom icons on screen-switcher buttons

By default the topbar screen-switcher shows the screen number (1, 2, 3 …) and
the letter **S** for the Standby button. You can replace those labels with any
**Font Awesome** icon or a custom **image file** stored in `img/icons/`.

#### Font Awesome icons

Use the Font Awesome class string as the `icon` value:

```javascript
screens[1]['icon'] = 'fas fa-home';
screens[2]['icon'] = 'fas fa-film';
screens[3]['icon'] = 'fas fa-music';

// Standby button
standby_screen['icon'] = 'fas fa-moon';
// or equivalently:
config['standby_icon'] = 'fas fa-moon';
```

Browse free icons at <https://fontawesome.com/icons>.

#### Custom image files (SVG, PNG …)

Download or create icon files and place them in the `img/icons/` directory,
then reference them by path:

```javascript
screens[1]['icon'] = 'img/icons/home.svg';
screens[2]['icon'] = 'img/icons/camera.png';
standby_screen['icon'] = 'img/icons/sleep.svg';
```

SVG files are recommended because they scale crisply at any size. Good free
sources include [Font Awesome SVG downloads](https://fontawesome.com/icons) and
[Streamline HQ Core Duo Free](https://www.streamlinehq.com/icons/core-duo-free).

Screens without an `icon` key continue to show the original number label — the
feature is fully **opt-in** and backward compatible.

### Standby screen

The **Settings → Standby** category contains:

- the inactivity time in minutes (`0` disables standby);
- an optional URL to call when standby starts;
- an optional URL to call when standby ends;
- standby content managed through the Device, Widget and Layout editors;
- a background selected from the bundled `img/bg*` files, a personal image
  named `BG_*` and placed in `img/custom`, or a custom path/URL, with a preview.

The standby background is independent from the normal screen background.
Files placed in `img/custom` are ignored by Git, remain in place during Git
updates, and appear in both the Screen and Standby background selectors only
when their filename starts with `BG_`.

### Settings and updates

Settings are grouped into General, Screen, Standby, Localization, Media,
Widgets (Custom mode), Other and About tiles. Background fields support a
built-in image selector and a custom path/URL. The update control is available
only inside the **Info** tile and can update directly to either the **Beta** or
**Main** branch when the web-server account has write access to the Git
checkout. When a newer version is detected, a persistent notification is shown
over the dashboard at the lower-right.

Settings saves are delta-based: only changed controls are replaced or added,
so hand-written variables and untouched values remain intact. Every visual
editor follows the configuration selected in the URL; for example,
`?cfg=CONFIG2.js` reads and writes `custom/CONFIG2.js` rather than `CONFIG.js`.

## Included themes

The **Dashticz-Theme** field under Settings > Display is a dropdown populated
from valid subdirectories in `themes/`. A directory is listed when it contains
`themes/<name>/<name>.css`; `Default` remains available for the built-in style.

The `modern-dark` theme provides a reusable dark dashboard style with clear
active button states, compact rounded blocks, subtle dark borders and spacing
between blocks, larger selector buttons and pull-down controls, switch status
text, styled titles, sliders, battery states, 120-pixel default device blocks
and a black standby background. Enable it in `custom/CONFIG.js`:

```javascript
config['theme'] = 'modern-dark';
```

Theme files contain general-purpose styling only. Dashticz loads
`custom/custom.css` after the selected theme, so device-specific block rules,
personal layouts, private URLs, and local overrides can remain in that ignored
file without being committed to Git.

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

Bootstrap 5, Chart.js 4, Day.js, jQuery, Font Awesome, and their related plugins
are kept on compatible maintained release lines. Bootstrap 3 compatibility is
implemented locally for the legacy markup still used by the dashboard; the
project no longer loads Bootstrap 3 itself. Future major dependency upgrades
must continue to include compatibility and visual regression checks. Swiper
remains on the patched 12.x line to retain broader tablet browser support.

The Dashboard of Domoticz is quite powerful. The disadvantage is that it's only possible to show information known in Domoticz.
There is where Dashticz steps in. Dashticz is able to show (almost) all Domoticz information.
In addition to that it's possible to show information from all kind of other sources.

## Screenshots
<img width="632" height="459" alt="image" src="https://github.com/user-attachments/assets/b4aee392-f753-4d44-b428-694f166fb57c" />


## Installation
See https://dashticz.readthedocs.io/en/master/gettingstarted/

Run the installer from the directory in which you want to create the default
`dashticz` directory:

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"
```

The installer accepts one target directory. With the downloaded command, put
`--` before installer arguments:

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory /var/www/html/my-dashboard
```

All supported forms are:

```sh
# Long option
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory /var/www/html/my-dashboard

# Short option
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- -d /var/www/html/my-dashboard

# Option with equals sign
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --directory=/var/www/html/my-dashboard

# Positional directory
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- /var/www/html/my-dashboard

# Environment variable
DASHTICZ_INSTALL_DIR=/var/www/html/my-dashboard \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)"

# Help
bash -c "$(curl -fsSL https://raw.githubusercontent.com/dashticz/dashticz/master/install.sh)" -- --help
```

Relative and absolute paths are supported; quote a path containing spaces. An
explicit argument overrides `DASHTICZ_INSTALL_DIR`. The target directory must
not exist yet.

The installer:

- installs Git through a supported package manager when necessary;
- clones the latest stable `master` branch into the selected directory;
- creates `custom/CONFIG.js` containing `#EMPTY#` with file mode `0644`;
- attempts to give the web-server account write access to `custom/` and the
  Git checkout, so browser settings and updates can be saved.

If the write-access step cannot run yet, the installer prints the command to
run after the web server has been installed.

### Updating

Use the **Update** control in Settings, or run one of these commands from the
installation directory:

```sh
# Beta
sh updatebeta.sh

# Stable
sh update.sh
```

## Documentation and support
Documentation can be found on:
https://dashticz.readthedocs.io

For additional information and support please visit the Dashticz forum:
https://www.domoticz.com/forum/viewforum.php?f=67

**Additional info**

This currently is the active Dashticz repository. Previous repositories (dashticz/dashticz_v2 and dashticzv3/dashticz_v3) will not be updated anymore.
