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
| General | Dashboard name, language (`nl_NL`, `en_US`, `de_DE` or `fr_FR`), theme (`modern-dark`, `liquid-glass-grey`, `liquid-glass-blue`, `default` or `white`) and topbar auto-hide time |

The topbar auto-hide time defaults to 5 seconds. Select **Save & Start** to
create the configuration and open the dashboard.

### Wizard and Custom configuration modes

The mode icon in the topbar selects how the dashboard is managed. It shows a
sliders icon in Custom mode or a wizard-hat icon in Wizard mode; selecting it
opens a **Configuration mode** popup with a Custom-mode and a Wizard-mode
tile, each with a short explanation, and the tile matching the current mode
highlighted. This replaced the previous two always-visible Custom/Wizard text
buttons with a single icon plus popup.

- **Wizard** shows the Screen Editor magic wand. While the Screen Editor is
  active its plus button opens the Device, Widget, Custom-device, Slide button
  and Separator workflows. These editors write only their managed sections in
  `custom/CONFIG.js`.
- **Custom** hides the Screen Editor workflow and exposes the complete settings
  catalog, including the widget settings. Use this mode for a hand-written
  configuration.

A valid but otherwise empty `CONFIG.js` can also be switched from Custom to
Wizard. Dashticz creates an empty grid for screen 1, after which devices and
widgets can be added from the Screen Editor plus menu.

Picking a tile hands off to the existing confirmation warning before the mode
actually switches. Changing mode is saved in `custom/CONFIG.js` and reloads
the dashboard. The regular settings menu remains available in both modes.
After the first-run setup wizard saves its basic settings and reloads, this
picker popup opens once automatically so the mode choice is immediate.

### Topbar controls

In **Wizard** mode the normal topbar keeps the editor controls compact:

| Control | Function |
| --- | --- |
| Mode icon (sliders / wizard hat) | Open the Configuration mode popup to switch between Custom and Wizard |
| Magic wand | Start or stop the Screen Editor |
| Cog | Open Settings |
| Fullscreen | Enter or leave fullscreen mode |

The old always-visible Device (+) and Widget (puzzle) buttons are no longer
shown in the normal topbar. While the **Screen Editor** is active, a plus button
appears immediately to the left of the magic wand. Closing the Screen Editor
hides that plus button again.

Select the Screen Editor plus button to open one central add menu with five
equal tiles:

- **Add devices** opens the existing Domoticz Device Editor and keeps its
  device selection/filtering behavior unchanged;
- **Widgets** opens the existing Widget Editor;
- **Custom devices** opens a dedicated popup for creating a named custom
  block with a primary IDX and repeatable Field/Setting options;
- **Slide button** opens a dedicated popup for creating a slide-navigation
  button block (for example `blocks.slidehome = {key:'Home', title:'Home Screen', slide:1, icon:'fas fa-home'}`);
- **Separator** immediately adds a full-width (12-column) Title/block-title
  separator to the active screen without opening another popup.

All labels in this workflow are read from the active `/lang` JSON file, with
the normal English fallback. The editor controls are part of the `settings`
topbar block, so a custom topbar must include that block:

```javascript
var columns = {};
columns['bar'] = {
  blocks: ['logo', 'miniclock', 'settings']
};
```

Enabling the optional topbar clock keeps the original layout: the logo stays
in its left-hand lane and the clock starts directly after that lane. The screen
selector, Custom/Wizard switch and configuration icons form a single
right-aligned cluster.

The default topbar uses the same compact height as the Modern Dark theme,
including when no explicit theme is selected.

### Device Editor and Device Config

Start the **Screen Editor**, select its plus button and choose **Devices**.
The Device Editor continues to use the existing Domoticz device list and can:

- add devices and sub-devices detected in Domoticz;
- remove devices from the generated dashboard configuration;
- change the mixed device and widget order by dragging rows;
- set each block width from 1 through 12 (new devices default to 3);
- open a device cog for **Device Config**;
- show existing widgets as `Widget - name` rows. Selecting a widget cog here
  now opens the same complete Widget Config popup used by the Widget Editor,
  including all widget-specific settings and the same save model.
- keep widget overview labels language-based; a custom widget title only changes
  the rendered tile title on the screen, immediately and after a reload — a
  saved custom title is no longer overwritten by the widget's translated
  default title on render.

The old Dummy/custom-device and Title/separator entries are no longer in the
normal Domoticz device dropdown. Use **Custom devices** and **Separator** from
the Screen Editor add menu instead. Separator is written immediately at width
12. Custom devices use their own popup and keep the user-entered block key, for
example `BTC_Price`, instead of converting it to an editor-generated device key.

### Custom devices

The **Custom devices** tile opens a dedicated popup with:

- **Device name**: the `blocks['...']` key. It must be a unique JavaScript-safe
  identifier such as `BTC_Price`;
- **IDX**: the primary positive Domoticz IDX;
- repeatable **Field / Setting** rows. `title`, `icon` and `values` are shown as
  common starting rows; unused rows may be left empty. The plus button is shown
  on the last row and adds another option.

Both **Device name** and **IDX** start empty in a new Custom devices popup;
existing Custom Devices are unaffected.

Field/Setting values use the same typed conversion as Device Config: numbers
become numbers, `true`/`false` become booleans, valid JSON arrays or objects stay
typed, and other input is stored as text. This makes multi-value blocks possible,
for example enter `values` with:

```json
[{"idx":1380,"value":"EUR: <Data>"},{"idx":3118,"value":"USD: <Data>"}]
```

which produces a block equivalent to:

```javascript
blocks['BTC_Price'] = {
  idx: 1380,
  width: 3,
  title: 'Cours du Bitcoin',
  icon: 'fab fa-bitcoin',
  values: [
    {idx: 1380, value: 'EUR: <Data>'},
    {idx: 3118, value: 'USD: <Data>'}
  ]
};
```

The layout writer still controls where the block appears on the active screen.
Existing custom blocks with a hand-picked key are recognized as Custom devices
so later Device Editor saves preserve that key.

#### Multi Device

The **Multi Device** tile (next to **Custom devices** in the Screen Editor
add menu) is a graphical builder for combining values from several Domoticz
devices into one block, built on that same Custom Device engine. It has a
**Device name**, a **Main IDX**, an optional **Title**, and a repeatable list
of value rows — each with an optional **IDX** and a **Value** placeholder
(for example `<Usage>`) — with a plus button on every row to add another
value and a minus button to remove one. A row without its own IDX falls back
to the Main IDX. Saving writes:

```javascript
blocks['combine'] = {
  idx: 43,
  values: [
    { value: '<NettUsage>' },
    { idx: 1247, value: '<Temp>' }
  ]
};
```

which is edited afterwards through the same Device Config popup as any other
Custom Device.

A Multi Device is listed in the Device Editor with a distinct **Multi Device**
label and layer-group icon, instead of the generic "Custom devices" label
plain Custom devices get, so the two are easy to tell apart at a glance.
Opening Device Config on an existing Multi Device edits its `values` with the
same friendly IDX/Value row builder the creation popup uses, instead of a
single raw JSON text field.

Device Config also shows an editable **Main IDX** field for Custom and Multi
devices, so the underlying Domoticz idx can be corrected after creation — for
example after the Domoticz device was recreated with a new idx, which
previously left the tile stuck on its "Getting device N" placeholder forever.

Device Config's display checkboxes are **Icon**, **Data**, **Updated**,
**Dial** and **Title**, shown centered on one row (a separator/title bar only
shows **Icon** and **Title**, since it has no data value or update timestamp
of its own). Checking **Dial** renders the block via the dial widget instead
of the default one; dial-specific parameters (color, min/max, subtype, scale,
values, etc.) remain configurable via Custom fields. The old text-alignment
editor support has been removed completely: rendered blocks no longer receive
editor alignment classes and the block writers no longer emit alignment
properties. Existing hand-written CSS remains untouched.

While Layout Editor is active, both device and widget tiles show a configuration
cog in the top-left corner. Device cogs open Device Config and widget cogs open
the matching full Widget Config without changing the pending layout. Config
popup titles include the current device/widget name so the edited tile remains
clear. The cog is shown for widgets regardless of how they were added to
`CONFIG.js` — both Widget Editor's own `widget_xxx` block keys and blocks
added by hand using the documented syntax (for example `blocks['weather'] =
{type: 'weather'}`) are recognized, on every screen and the standby screen.

The **Custom fields** section contains repeatable **Field** and **Setting**
rows. The plus button adds another row and the minus button removes an editable
row. Values are written as numbers, booleans, JSON arrays/objects or strings in
`CONFIG.js`.

`title` is always present as a non-removable Field row. Its Setting shows the
current explicit block title and changing it updates that block's `title`
property. The internal property `c` is intentionally not shown in Device Config;
when an existing editor-managed block contains `c`, its value is preserved
unchanged when the block is saved.

A custom `icon` Field is active only while the **Icon** checkbox is enabled. If
Icon is enabled and a non-empty `icon` Setting is supplied, that value takes
precedence and is written as the block's explicit `icon` property. If Icon is
disabled, the custom icon Field is inactive and Dashticz uses the existing
checkbox behavior. Enabling Icon without an explicit icon Field keeps the
normal default icon behavior.

Field names are trimmed, spaces and hyphens are converted to underscores and
the first character is made lowercase. Empty rows are ignored. Duplicate,
invalid and editor-reserved keys such as `idx`, `type`, `width` and internal
identity fields are rejected before saving. Hidden compatibility fields are
preserved separately rather than exposed for editing.

Select **Save** to write the generated blocks and layout to the active
`custom/CONFIG*.js` file. Existing editor-managed block properties that are not
being changed remain preserved where supported, and saving one block does not
intentionally alter another block. Back up a hand-written configuration before
first using Wizard mode.

Editor-generated Domoticz devices use stable IDX-based block keys, for example
`blocks['device_1498']` or `blocks['device_1498_2']` for a subdevice. Existing
hand-written name-based keys and explicit custom titles remain supported. The
stable reference is assigned before the editor starts its save sequence, so
newly selected devices remain available while the blocks and layout are
written. In grid layouts repeated saves reuse the same stable block reference.

### Widget Editor

Start the **Screen Editor**, select its plus button and choose **Widgets** to
open the existing Widget Editor. It provides the same tile catalog as before.
Select a tile to add it to the active screen, or select an active tile to remove
it. A selected tile with configurable options has a cog button. The same full
Widget Config popup is also opened when that widget's cog is selected from the
Device Editor.

Every widget settings popup also contains common Icon, Data, Updated and Title
checkboxes. The **Custom fields** section accepts repeatable `Field` and
`Setting` pairs. Use the plus button to add a row and the minus button to
remove one. Field names are trimmed, spaces and hyphens become underscores,
and the first character is normalised to lowercase (`Layout` becomes
`layout`). Names must be valid JavaScript property names, may not duplicate
another row, and may not replace editor-managed identity properties such as
`type`, `key`, `width` or `height`.

Settings are written with a matching JavaScript type: `true` and `false`
become booleans, numeric input becomes a number, valid JSON beginning with
`[` or `{` becomes an array or object, and all other input becomes a string.
For example, `Field: Layout` and `Setting: 1` writes `layout: 1` into the
widget's `blocks[...]` definition. Empty rows are ignored. Invalid JSON and
duplicate or reserved fields are rejected before saving. A widget block accepts
up to 50 custom fields; the combined custom value payload is limited to 32 KiB,
and nested arrays or objects are validated to a depth of four. Existing custom
icon strings remain intact until the Icon checkbox is explicitly switched off.

| Widget | Available options |
| --- | --- |
| Weather | OpenWeather or Weather Underground; API key and location; forecast count; daily/minimum temperature; rain, description, wind and gust display; icon set; Fahrenheit, Beaufort and wind-speed translation |
| Garbage | Waste company; address; maximum visible items (default 4), maximum days ahead (default 32) and width; iCal or Google Calendar details; icon, colour, name and CORS-prefix display options |
| Spotify | Spotify client ID |
| Sonarr | Server URL, API key and maximum items |
| Clock | Basic, Station, Flip, Hayman or Mini clock (each with a default clock icon); size and scale; 12/24-hour flipclock with optional seconds; station body, dial, hands, boss and hand behaviour |
| Calendar (ICS) | One or more named HTTP(S) ICS sources, a colour per source, date format, calendar language and maximum visible rows (default 15) |
| Security panel | Button icons and fullscreen lock |
| Public transport | Train, OV API, DRGL, iRail or De Lijn provider and station/stop |
| Traffic information | ANWB API key |
| 112 | RSS feed and optional comma-separated location/text filter |
| Cameras | Image URL and optional MJPEG video URL |
| Google Maps | API key, zoom level, latitude and longitude |
| Air quality | WAQI city code and layout |
| Moon | Domoticz IDX for the moon image |
| News | RSS URL and automatic-scroll interval |
| iFrame | URL, scrollbars, scale-to-fit width, aspect ratio, optional legacy fixed height and refresh interval |
| XMLTV TV Guide | XMLTV source URL; channel filter (id or display-name); maximum items, layout and refresh interval |
| Radio | Stations (name + stream URL); a single Add-station button, each row with its own Remove button |
| Domoticz log | Optional height and aspect ratio, scroll timeout, and a checkbox for whether the newest log line is shown at the bottom |
| OpenWeatherMap | Optional API key, city and country (fall back to the global settings when left empty); layout 1-24 |
| Sunrise / Sunset | Only the common Title/Width/Custom fields options |
| Timegraph | Main IDX, duration, height, x/y-axis label counts, x-axis labels, animation, line tension, point radius, and a dynamic list of values (each with an optional own IDX and label) |

In grid layouts, the XMLTV TV Guide follows its assigned row height. It shows
only complete programme rows that fit and never adds an internal scrollbar;
enlarging the tile makes the additional rows visible again.

Widget-specific settings are kept together with the other `config[...]`
settings at the top of `custom/CONFIG.js`.

Calendar Widget Config shows every source as a separate row with **Name**,
**ICS URL** and **Color**. Use **Add calendar** to add a source and the minus
button to remove one. Existing single-string `icalurl` blocks are loaded as one
source and remain supported by the calendar runtime. Saving through the editor
uses the named multi-source structure:

```javascript
blocks['gmail_calendars'] = {
  type: 'calendar',
  layout: 2,
  icalurl: {
    Personal: { ics: 'https://example.test/personal.ics', color: 'blue' },
    Business: { ics: 'https://example.test/business.ics', color: 'purple' }
  },
  holidayurl: 'https://example.test/holidays.ics',
  maxitems: 100,
  weeks: 5,
  lastweek: true,
  isoweek: false,
  width: 12
};
```

Calendar properties outside the source list, including `holidayurl`, `layout`,
`weeks`, `lastweek`, `isoweek`, `maxitems` and `width`, are retained when the
Widget Config is saved. Calendar names must be unique and every source must
contain a valid HTTP(S) ICS URL.

Radio Widget Config is a graphical front end for the existing [Streamplayer
block](https://dashticz.readthedocs.io/en/beta/blocks/specials/streamplayer.html).
Each station row has a **Name** and **Stream URL** with its own minus button
to remove that station, and a single **Add station** plus button below the
list adds another row. Saving writes the stations as
`blocks['streamplayer'].tracks` — the same shape a
hand-written `_STREAMPLAYER_TRACKS` global uses — so existing Streamplayer
configurations, and blocks that only set other properties (like `icon` or
`image`) while relying on `_STREAMPLAYER_TRACKS`, keep working unchanged:

```javascript
blocks['streamplayer'] = {
  tracks: [
    { track: 1, name: 'Q-music', file: 'http://icecast-qmusic.cdp.triple-it.nl/Qmusic_nl_live_96.mp3' },
    { track: 2, name: '538 Hitzone', file: 'http://vip-icecast.538.lw.triple-it.nl/WEB11_MP3' }
  ]
};
```

**Domoticz log** Widget Config edits the existing [Domoticz log
block](https://dashticz.readthedocs.io/en/beta/blocks/specials/domoticzlog.html)
(`js/components/log.js`). Height and Aspect ratio are optional — leave both
empty to keep Dashticz's automatic sizing, and note that aspect ratio only
applies when height is left empty. Saving writes:

```javascript
blocks['log'] = {
  title: 'Domoticz log',
  scrolltimeout: 60,
  ascending: true
};
```

which keeps working with the documented `columns[4] = {blocks: ['log']}`
shorthand, since both refer to the same `blocks['log']` definition. Placing
the log widget on a second screen now gives that screen its own independent
config (for example a different Max lines) instead of both screens sharing
one definition.

**OpenWeatherMap** Widget Config edits the existing [OWM
widget](https://dashticz.readthedocs.io/en/beta/blocks/specials/owmwidget.html)
(`js/components/owmwidget.js`), with a Layout selector for all 24 layouts.
API key, City and Country stay empty by default; an empty value is never
written to the block, so the widget keeps falling back to
`config['owm_api']`, `config['owm_city']` and `config['owm_country']` (the
same global settings the Weather widget's OpenWeather provider uses). Saving
writes only the fields that were actually filled in:

```javascript
blocks['widget_owmwidget'] = {
  type: 'owmwidget',
  layout: 11
};
```

**Sunrise / Sunset** Widget Config adds the existing [Sunrise
block](https://dashticz.readthedocs.io/en/beta/blocks/specials/sunrise.html)
with only the common Title/Width/Custom fields options, since `renderSunrise`
(`js/components/simpleblock.js`) does not use a title, icon or configurable
height. It is written under the bare `sunrise` key, so the documented
`columns[1]['blocks'] = ['sunrise']` shorthand keeps working unchanged.

**Timegraph** Widget Config edits the existing [Timegraph
block](https://dashticz.readthedocs.io/en/beta/blocks/specials/timegraph.html)
(`js/components/timegraph.js`). Values are a repeatable list — each row has
an optional **IDX**, a **Value** (for example `Temp`, `Usage`, or the
special `NettUsage` field Dashticz computes from a P1 meter's `Usage` and
`UsageDeliv`) and an optional **Label** — with a plus button on every row to
add another value and a minus button to remove one; there is no fixed limit
on the number of rows. A value row without its own IDX falls back to the
block's Main IDX. A single-device graph is written using the simple string
form:

```javascript
blocks['widget_timegraph'] = {
  type: 'timegraph',
  idx: 43,
  values: ['NettUsage'],
  duration: 60
};
```

and combining several devices in one graph automatically switches to the
object form, matching the syntax `DT_timegraph` already supports:

```javascript
blocks['widget_timegraph'] = {
  type: 'timegraph',
  duration: 600,
  values: [
    { idx: 28, value: 'Temp', label: 'Boiler' },
    { idx: 31, value: 'Temp', label: 'Return' }
  ]
};
```

All Settings and editor labels, widget status messages and validation errors
are read from the JSON files in `lang/`. `en_US.json` is loaded as the complete
base language before the selected locale is merged over it. A missing locale
entry therefore remains readable in English and cannot introduce a different
hard-coded language into the interface.

New iframe widgets default `scaletofit` and `aspectratio` to empty, without a
fixed `height`. With both empty the iframe simply fills the tile's own width
and height: no JS scaling is applied and no height is forced. Set
`scaletofit` to the embedded page's own design width in pixels when it needs
to be scaled to the tile, and set `aspectratio` (height divided by width)
when the tile's height should follow its width — for example
`scaletofit: 300, aspectratio: 0.9` for a page designed at 300px wide.
Existing iframe blocks that already set these values keep working
unchanged; leave the aspect-ratio field empty to keep the legacy
fixed-`height` sizing method.

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
- live Domoticz updates keep the edit overlay and current temporary dimensions,
  so refreshed device blocks remain draggable and resizable;
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
built-in image selector and a custom path/URL. The default normal-screen
background is `/img/custom/BG_Dashticz_bw.png`; place that file in `img/custom`
or choose another background in Settings. The update control is available
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

The `modern-dark` theme provides a reusable dark dashboard style with
right-aligned collection text in the Garbage widget while keeping its icon on
the left. It also includes active button states, compact rounded blocks, subtle
dark borders and spacing
between blocks, larger selector buttons and pull-down controls, switch status
text, styled titles, sliders, battery states, 120-pixel default device blocks
and a black standby background. Enable it in `custom/CONFIG.js`:

```javascript
config['theme'] = 'modern-dark';
```

The `liquid-glass-grey` and `liquid-glass-blue` themes are based on
`modern-dark` — they keep the same block rounding, spacing and block
heights — but restyle the blocks as frosted, translucent "liquid glass"
panels (blurred backgrounds with a soft top sheen), in a neutral
graphite/silver palette and a deep navy/blue palette respectively. Enable
either with:

```javascript
config['theme'] = 'liquid-glass-grey';
// or
config['theme'] = 'liquid-glass-blue';
```

Theme files contain general-purpose styling only. Dashticz loads
`custom/custom.css` after the selected theme, so device-specific block rules,
personal layouts, private URLs, and local overrides can remain in that ignored
file without being committed to Git.

When `/custom/custom.css` is present and loaded, Settings > Theme shows a
framed active-stylesheet notice beside the Path/URL field. The notice is
informational: the file and all existing custom rules remain untouched.

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
