# Dashticz — Change log for recent update work

## 3.42.3 — Device Editor widget height fix (#100 follow-up)

- Fixed a once-set iframe (or camera/log/timegraph) height on a grid screen
  being impossible to remove again via Device Editor. An earlier #100 fix
  (3.42.1) stopped Widget Editor from resending a stale cached height, but
  `deviceeditor.js` had its own separate copy of the same caching bug:
  `_init()` hydrated `widgetHeights[orderKey]` straight from the widget's
  current CONFIG.js height, unconditionally, and `_widgetPayload()`
  unconditionally resent that as `entry.height` on every Device Editor
  save — including a save that only touched a completely different device.
  `savewidgets.php` only overrides that top-level height for iframe/log/
  timegraph when their own `*Height` property is explicitly sent, which
  Device Editor's resubmission never does, so the stale value silently won
  every time. Grid mode now leaves `widgetHeights[orderKey]` unset unless a
  widget's own field explicitly (re)sets it on that save; column mode is
  unaffected.

## 3.42.2 — Domoticz log widget scrollbar fix

- Fixed the Domoticz log widget triggering a spurious outer scrollbar on
  grid screens, even when the tile visually had enough room (#105). `.log
  .items` already scrolls internally on purpose once there are more log
  lines than fit, but the *outer* `.dt_block` was only floored by the
  generic grid `min-height: 100%` rule, not capped — so a fraction of extra
  height from title/content rounding let it grow past its own grid row, and
  the grid item's own `overflow: auto` then added a second, unwanted
  scrollbar around the whole tile. Capped `.log`'s block to its row height
  in `css/creative.css`, matching the same fix already applied to
  `.frame`/`.waqi`/the clock widgets.

## 3.41.3 — Test suite cleanup

- Fixed a stale `$forceClone` regex assertion in
  `tests/php-security.test.js` that still expected the pre-issue-#98 shape
  of that check in `js/savegridlayout.php`, so it failed on every run
  regardless of unrelated changes.
- Removed `tests/phpsecurity.test.js`, a stale duplicate of
  `tests/php-security.test.js` (same origin, diverged over time — it was
  missing newer widget ids and had the same outdated `$forceClone` regex).
  Both files matched `tests/*.test.js` and ran independently, doubling
  maintenance and letting the two drift out of sync with each other.

## 3.41.2 — Radio widget layout, grid minimum height, Sunrise/Sunset resize fix

- Radio Widget Config: each station row now only has a Remove (`-`) button.
  A single Add (`+`) station button is shown once, docked to the right of
  the Display options checkboxes, with the station list rendered between
  the checkboxes and the Custom fields section. `_widgetBlockOptionsHtml()`
  gained two optional parameters (an extra control next to the checkboxes,
  and content to insert above Custom fields) so this reuses the existing
  shared markup instead of duplicating it.
- Grid layout: lowered the minimum block height from 4 rows to 2. The
  editor overlay's controls already rely on `overflow: visible` to stay
  clickable on a very small item, and 2 rows was already proven safe for
  the Miniclock widget (which no longer needs its own separate minimum —
  it now uses the same general floor). A block whose content needs more
  room than 2 rows simply gets its own internal scrollbar, same as picking
  any other too-small height.
- Fixed the Sunrise/Sunset widget not keeping a resized grid height:
  `renderSunrise` (`js/components/simpleblock.js`) replaces the mountpoint
  with markup that carries neither `.dt_block` nor `.mh`, so it never
  received the existing `min-height: 100%` rule that lets other blocks fill
  their reserved grid cell. The grid cell itself was always sized
  correctly; only the visible content stayed pinned at its small natural
  size, making a resize look like it reverted. Added a dedicated
  `.sunriseholder` grid rule (fill + center) in `css/creative.css`.

## 3.41.1 — Special widgets in Widget Config

- Added four existing Dashticz Special Widgets to the graphical Widget Config
  editor: **Domoticz log**, **OpenWeatherMap** (`owmwidget`), **Sunrise /
  Sunset**, and **Timegraph**. This is a configuration/management layer on
  top of the existing widget implementations (`js/components/log.js`,
  `js/components/owmwidget.js`, `js/components/simpleblock.js`'s `sunrise`
  entry, `js/components/timegraph.js`) — none of them were rewritten.
  - **Domoticz log**: Title, Width, optional Height, optional Aspect ratio,
    Scroll timeout, and a "Newest log lines at the bottom" checkbox for
    `ascending`. Written to `blocks['log']`, so the documented
    `columns[4] = {blocks: ['log']}` shorthand keeps working unchanged.
  - **OWM widget**: API key, Layout (1–24), City and Country, each optional.
    An empty API key/City/Country is never written to the block, so
    `config['owm_api']`/`owm_city`/`owm_country` keep working as the
    fallback exactly like `js/components/owmwidget.js`'s own `defaultCfg`
    already does.
  - **Sunrise / Sunset**: added as a minimal widget (only the generic
    title/width/custom-fields options), matching how little `renderSunrise`
    (`js/components/simpleblock.js`) itself actually uses. Written under the
    bare `sunrise` key, so `columns[1]['blocks'] = ['sunrise']` keeps working.
  - **Timegraph**: Main IDX, Duration, Height, X/Y axis label counts, X-axis
    labels toggle, Animation, Line tension, Point radius, and a dynamic list
    of values. Each value row has its own optional IDX, a Value field (e.g.
    `Temp`, `Usage`, or the special `NettUsage`) and an optional Label, with
    add/remove buttons per row and no artificial row limit — this is what
    lets a single Timegraph combine several Domoticz devices, exactly like
    the documented `values: [{idx, value, label}, ...]` syntax. A value row
    without its own IDX falls back to the block's main IDX, matching
    `DT_timegraph.run`'s existing fallback logic.
- Fixed the Screen Editor config cog being missing for devices/widgets added
  by hand in CONFIG.js (for example `blocks['weather'] = {type: 'weather'}`
  on Screen 2). The Screen Editor only recognised widgets keyed with the
  Widget Editor's own `widget_xxx` naming convention; it now also resolves a
  widget from its block's `type`/shape, matching how Widget Editor itself
  already identifies existing blocks. Devices, Custom Devices and separators
  were unaffected and keep working exactly as before.
- Changed the iFrame widget's default `scaletofit`/`aspectratio` from `300`/
  `0.9` to empty. With neither set, the iframe simply fills the tile's own
  width/height instead of assuming a fixed 256/300px-wide source. Existing
  blocks that already set these values are read from the block itself and
  are unaffected.
  - Follow-up fix: `.dt_state` only gets a real (non-content-driven) height
    through the `.fixedheight` class, which `js/dashticz.js` only adds when
    `aspectratio` or a fixed `height` is set. With both empty, a grid-layout
    iframe had no height at all and collapsed to the browser's own ~150px
    default — too small, as reported. `DT_frame.run` (`js/components/frame.js`)
    now measures its `.dt-grid-item` ancestor's already-allocated height and
    applies that when neither `aspectratio` nor `height` is configured, so
    the iframe fills the grid cell like other widgets.
- Added a Radio widget to Widget Editor, built on the existing Streamplayer
  block (`js/components/streamplayer.js`). Stations (name + stream URL) can
  be added and removed from a repeatable list, each row with its own add/
  remove buttons. Saved stations are written as `blocks['streamplayer'].tracks`
  — the same shape a hand-written `_STREAMPLAYER_TRACKS` global uses — so
  existing Streamplayer configs keep working unchanged.
  - Follow-up fix: `tracks` is now a managed property for the widget, so it
    no longer also shows up as a raw JSON `tracks` row in the generic Custom
    fields section underneath the dedicated station list.
- Added a Multi Device type to the Screen Editor's add menu, for combining
  several IDX/value pairs (optionally from different Domoticz devices) into
  one block, for example:
  ```js
  blocks['combine'] = {
    idx: 43,
    values: [
      { value: '<NettUsage>' },
      { idx: 1247, value: '<Temp>' },
    ],
  };
  ```
  This is built entirely on the existing Custom Device engine (a `values`
  array was already supported by `formatBlockValues`/`domoticzblock.js` for
  per-device sub-values); a value row without its own `idx` already falls
  back to the block's own `idx`. Multi Device is a graphical builder for that
  same `blocks[key] = {idx, values}` shape, saved and edited exactly like any
  other Custom Device.
- New Custom Device and Multi Device popups now start with an empty IDX and
  device name (previously the IDX field showed a `1380` placeholder and the
  name field a `BTC_Price` placeholder, which could read as a default).
  Existing Custom Devices are unaffected; this only changes what a brand new
  popup starts with.
- Fixed widget titles set via the config menu not appearing on the dashboard,
  and reverting after every reload/refresh. `getBlockConfig` (`js/dashticz.js`)
  applied a translated default title (e.g. "Weather") to any Widget-Editor
  block unconditionally, even when the block already had its own `title`
  set — so a saved custom title was immediately overwritten again on render.
  It now only falls back to the translated default when the block doesn't
  define its own title, matching how the same function already treated the
  Garbage widget's default title.

## 3.40.0 — Wizard editor polish

- Extended Calendar Widget Config with repeatable named calendar sources. Each
  source has its own HTTP(S) ICS URL and colour and can be added, edited or
  removed independently. Editor saves use the supported `icalurl` object while
  the existing single-string and legacy `calendars` formats remain readable.
  Unrelated calendar options such as `holidayurl`, `layout`, `weeks`,
  `lastweek`, `isoweek`, `maxitems` and `width` are preserved.
- Added a localized framed Theme notice when `/custom/custom.css` is actively
  loaded. The editor never rewrites the existing custom stylesheet.
- Standardized Device, Widget, block and Separator editor controls and restored
  the Separator configuration cog for existing and newly added separators.
  Hidden compatibility property `c`, unknown typed fields and existing custom
  icons remain preserved across editor saves.

- Fixed the empty-screen Wizard bootstrap: an empty grid is now a valid Screen
  Editor state, so switching from Custom to Wizard no longer blocks the magic
  wand/add menu when there are no existing blocks. Wizard mode can initialise
  an empty grid and devices, widgets, custom devices or separators can then be
  added normally.
- Removed the obsolete text-alignment editor pipeline. Dashticz no longer
  applies `dt-text-align-*` classes and the Device/Widget writers no longer emit
  `text_alignment`; the old keys are only treated as reserved legacy input so
  they cannot be reintroduced through custom fields.
- Changed the default normal-screen background to
  `/img/custom/BG_Dashticz_bw.png`.
- Added the same top-left configuration cog to widget tiles in Layout Editor.
  It opens that widget's full Widget Config and saves widget blocks/settings
  without touching the pending layout.
- Device Config and Widget Config headers now include the current device or
  widget name.
- Changed the Data checkbox in Device Config and Widget Config to positive
  semantics: checked means the data text is visible; unchecked stores
  `hide_data: true`. Existing CONFIG.js behaviour remains backwards compatible.
- Renamed the Screen Editor add-menu tile from **Add device** to **Devices**.
- Added a device configuration cog to the top-left of device tiles while Layout
  Editor is active. It opens the same Device Config flow used by Device Editor.
- Replaced the Wizard `fa-magic` icon with `fa-wand-magic-sparkles` in the normal
  topbar and standby editor controls.
- Bumped the beta version to **3.40.0**.

- Fixed Widget Editor saves being rejected with `Invalid or reserved custom
  widget field.` when stale editor-managed properties were duplicated in
  `custom_fields`. Icon/Data/Update/Title-related core properties are now
  filtered from custom fields on the client and safely ignored by the server,
  while dangerous prototype keys remain rejected. This restores saving
  configured widgets such as Weather, Clock and Spotify.
- Fixed the Layout Editor toolbar stacking above the Widget Editor. The toolbar
  now stays above editable dashboard tiles but below Bootstrap modals, so it no
  longer covers or intercepts the Widget Editor Save button. Representative
  Weather, Clock and Spotify payloads were also verified through the existing
  widget writer to ensure their save path remains compatible.
- Simplified the Wizard topbar so the normal editor controls are the Screen
  Editor magic wand, Settings and Fullscreen; the former always-visible Device
  and Widget buttons are now reached through the Screen Editor workflow.
- Added a Screen Editor-only plus button that opens a localized four-tile menu
  for **Add devices**, **Widgets**, **Custom devices** and **Separator**. The
  tiles reuse the existing editors and block writers instead of adding a second
  configuration system.
- Replaced the old Dummy/custom-device route with a dedicated **Custom devices**
  popup. It accepts a unique block name, primary IDX and repeatable typed
  Field/Setting options (including JSON `values` arrays) while preserving the
  chosen custom block key on later saves.
- Changed **Separator** so it immediately inserts a full-width (12-column)
  Title/block-title on the active screen without opening a second popup.
- Device Editor widget cogs now open the same complete Widget Config popup as
  the Widget Editor and reuse the same widget payload/config-setting logic.
- Reduced Device Config to the three centered Icon, Data and Updated checkboxes.
  Alignment controls and generated alignment CSS were removed; the obsolete
  alignment properties are now dropped when editor-managed blocks are saved.
- Device Config now always exposes `title` as a non-removable Field/Setting row,
  preserves the hidden `c` property across saves, and applies an explicit
  `icon` Field only while the Icon checkbox is enabled. A supplied custom icon
  is then the leading icon value.
- Retained repeatable typed Field/Setting rows and server-side validation for
  custom device and widget block properties.
- Added/updated English, Dutch and French labels for the Screen Editor add menu
  and its Custom devices/Separator routes. These changes are included in version 3.40.0.
- Layout Editor now treats Domoticz groups/scenes (`s<idx>`) as configurable
  devices, so their top-left control is the same config cog and opens the same
  Device Config flow as regular devices.
- Widget overview/catalog labels now stay language-based, while custom widget
  titles remain screen-only overrides.
- Added a new **Slide button** tile to the Screen Editor add menu. It opens a
  dedicated popup and saves a named slide-navigation block with configurable key,
  title, screen target and icon.

## 3.23.7 — Editor add regression

- **Consistent settings and widget localization**: Settings, Device Editor,
  Widget Editor, Layout Editor, screen controls and widget status/error text
  now read their user-facing labels from the JSON files in `lang/`. Dashticz
  first loads `lang/en_US.json` and merges the selected locale over it, so a
  missing translation is shown in English instead of a hard-coded Dutch,
  French or mixed-language string.

- **Responsive iframe defaults and row limits**: new iframe widgets use
  `scaletofit: 300` and `aspectratio: 0.9` without forcing a fixed `height`.
  Existing height-only iframe blocks remain supported. Calendar now exposes a
  visible-row limit (default 15), while Garbage stores both `maxitems` (default
  4) and the new `maxdays` search window (default 32) in its generated block.

- **Transparent Custom-mode topbar clock**: the Mini clock inside the topbar
  no longer receives an opaque block background in Custom mode.

- **Device and widget additions restored**: newly selected devices now carry
  their stable `device_<IDX>` reference through the complete save operation.
  New widgets likewise use their catalog reference immediately, while existing
  custom widget references remain unchanged. This restores adding tiles from
  both the Device Editor and Widget Editor after the IDX-key migration.

- **Empty CONFIG.js can enter Wizard mode**: when no dashboard blocks exist,
  the mode switch now creates an empty screen 1 grid instead of aborting the
  conversion. Device Editor and Widget Editor can then populate that clean
  dashboard normally. An empty Wizard bootstrap is never mistaken for the
  existing delete-screen action.

## 3.23.6 — Device Editor helper blocks

- **Stable Domoticz device keys**: Device Editor output now uses
  `device_<IDX>` (and `device_<IDX>_<subidx>`) instead of mutable device names.
  Normal device definitions omit `title` so later Domoticz renames appear on
  the dashboard automatically; explicit titles remain backwards compatible.
  Grid saves remove the superseded generated column section, preventing old
  name-based blocks from remaining beside their new IDX-based replacements.
  Repeated saves also reuse the same IDX key instead of creating suffixed
  variants such as `device_1498_2`.

- **Modern Dark garbage alignment**: collection types and dates are aligned at
  the right side of the data column while the garbage icon remains on the left.

- **Live Domoticz updates in movement mode**: device refreshes now preserve
  the Layout Editor overlay and its drag/resize controls. They no longer
  reapply the saved fixed pixel height while an edit is in progress.

- **XMLTV grid sizing**: the rendered TV Guide tile now matches its saved row
  span in movement mode and on the dashboard. Partially clipped programme rows
  are hidden, return automatically when enlarged, and no internal scrollbar is
  shown.

- **Device Editor helper blocks**: the add selector now offers a Dummy device
  with a user-entered IDX and a Title block with user-entered text, above the
  Group/Scene/Device entries. Both types remain editable in column and grid
  layouts and use localized labels with an English fallback. Title blocks
  default to 120px; Modern Dark gives them its panel background and border,
  with the title text aligned at the top left. Grid titles default to three
  rows and suppress scrollbars when displayed at that smaller height.

## 3.23.0 — Screen-switcher icons & i18n (1-8-2026)

- **Compact default topbar**: the topbar now uses the same height, padding and
  border dimensions as the Modern Dark theme when no theme is selected.
- **Dynamic theme selector**: Settings > Display now presents Dashticz-Theme
  as a dropdown populated from valid theme directories in `themes/`.
- **Per-screen custom icons**: topbar screen buttons (1, 2, 3 … and Standby) now support custom icons via `screens[n]['icon']` in `CONFIG.js`. Accepts Font Awesome class strings (`'fas fa-home'`) or image paths relative to the Dashticz root (e.g. `'img/icons/home.svg'`). The Standby button icon is set with `standby_screen['icon']` or `config['standby_icon']`. Existing configs without `icon` keys are unaffected.
- **`img/icons/` directory**: new directory provided for local custom icon storage. SVG, PNG, and other image formats are supported. Includes a README with usage examples and links to free icon sources.
- **Screenswitcher i18n**: "Add screen" and "Delete screen" button tooltips were previously hard-coded in Dutch. All screenswitcher labels (Standby, Screen #, Add screen, Delete screen) are now driven by a `screenswitcher` section in each `/lang/<locale>.json`. All 28 bundled language files have been updated. English is the automatic fallback when a key is absent.



- Restored the original logo/clock proportions and grouped the screen selector,
  Custom/Wizard switch and configuration icons at the far-right edge.
- Enforced a 2x4-cell minimum while resizing blocks in the grid editor.
- Made garbage collection date names use the selected interface locale.
- Added the advanced OpenWeather display defaults and five-option icon selector.
- Made all browser editors honor `?cfg=CONFIG2.js`, save only changed settings,
  retain hand-written configuration, and deduplicate editor-owned keys.
- Moved Update to the Info tile and made new-version notifications persistent
  at the lower-right of the dashboard.
- Kept grid resize/remove controls usable on very short blocks, prevented grey
  refresh flashes while moving blocks, fixed topbar spacing and agenda overflow,
  and added an explicit extra-screen delete control.
- Fixed repeated Clock settings saves and localized Garbage collection labels
  and status messages through the language JSON files.

The runtime and package version remain `3.23.7` for this beta maintenance set.

> **Version: 3.20.0**  
> This document describes every change made during three related tasks:
> 1. [Cleaning up unused files in the project](#1-cleaning-up-unused-files)
> 2. [Updating Bootstrap to the latest version maintaining existing features](#2-bootstrap-update-from-34-to-53)
> 3. [Investigating and fixing calendar issues after the updates](#3-calendar-fixes-and-backward-compatibility)
>
> For each section the documentation page(s) on
> <https://dashticz.readthedocs.io/en/master/> that may need to be added or
> updated are indicated.

---

## 1. Cleaning up unused files

### What was removed and why

Several files were removed because they were either dead code, personal test
data, or duplicate backup copies that no longer serve any purpose in the
project.


#### Dead/backup JavaScript source files

| Removed file | Reason |
|---|---|
| `js/thermostat.js` | Replaced by `js/components/thermostat.js` a long time ago; this file was never loaded |
| `js/chromecast.js` | Chromecast support code that was never wired into the dashboard |
| `js/domoticz-api.js_org` | Backup copy with `.js_org` extension — not loaded by the browser |
| `js/main.js_org`, `js/settings.js_org`, etc. | Additional backup copies — not loaded by the browser |
| `js/components/group.js_org`, `js/components/weather.js_org` | Same as above |

#### Root-level config and tooling files

| Removed file | Reason |
|---|---|
| `.babelrc` | Superseded by `build/babel.config.js` |
| `.prettierrc` | Moved to `build/prettier.json` |
| `.prettierignore` | Moved to `build/prettierignore` |
| `babel.config.js` | Moved to `build/babel.config.js` |
| `webpack.config.js` | Moved to `build/webpack.config.js` |
| `jsconfig.json` | VS Code helper file, not needed in the repository |
| `.jsbeautifyrc` | Not used (project uses Prettier) |
| `.eslintrc.js` | Not used (no ESLint run in the current workflow) |
| `.browserslistrc` | Browserslist config consolidated into `package.json` |
| `.dockerignore`, `Dockerfile`, `nginx.conf` | Docker deployment files removed (not part of the standard install) |
| `Makefile` | Replaced by `npm run build` / `npm test` |
| `scripts/bu.sh`, `scripts/dashticz_install.sh` | Installer and backup helper scripts removed |
| `playwright.config.js` | Playwright end-to-end test configuration removed (tests are Jest-based) |

#### Duplicate HTML entry point

`index2.html` — a second dashboard entry point that was never documented or
maintained — has been removed. The only entry point is `index.html`.

#### Upload helper

`vendor/dashticz/upload.php` — a bare PHP upload helper (no authentication,
no file-type check) has been removed. It was not integrated into the dashboard
UI. **If a custom integration referred to this endpoint it will stop working.**

#### Dead slider functions in `js/switches.js`

The internal `sliderAction` helper object and `slideDeviceExt()` function were
removed. Both were unused (`slideDeviceExt` had a comment "Function not used?")
and have been replaced by the live slider code in the component layer.

#### Simplification of `js/components/nzbget.js`

The NZBGet callback was using a string reference (`'returnNZBGET'`) instead of
the actual function reference. This has been corrected. **No configuration
change is required.**

#### Documentation folder

The entire `docs/` folder (RST sources + Sphinx theme) has been removed from
the repository. The live documentation is maintained separately at
<https://dashticz.readthedocs.io>. **This does not affect users; it only affects
contributors who want to build the docs locally.**

#### Log and diagnostic tools

`log.html` moved to `tools/log.html`. `switch_horizon.php` moved to
`tools/switch_horizon.php`. The dashboard automatically redirects calls to the
new location, so no configuration change is required for Ziggo/UPC users.

---

### Documentation pages that may need updating

| Page | What to add / change |
|---|---|
| **Getting started / Installation** | Mention that `index2.html` no longer exists; only `index.html` is used |
| **Configuration / Blocks / Switch** (`switch_horizon.php`) | Note that the helper has moved to `tools/switch_horizon.php`; existing configs are auto-redirected |
| **Development** (if it exists) | Build config files are now in the `build/` directory instead of the project root |

---

## 2. Bootstrap update from 3.4 to 5.3

### Summary

Bootstrap has been upgraded from **3.4.1** to **5.3.8**. Because Bootstrap 5
removes many features and renames almost all data attributes, a dedicated
**compatibility layer** has been added so that existing dashboards, themes, and
`custom/custom.css` files continue to work without changes in most cases.

### What changed under the hood

| Area | Old | New |
|---|---|---|
| Bootstrap version | 3.4.1 | 5.3.8 |
| Chart.js | 2.9.4 | 4.5.1 |
| chart.js zoom plugin | 0.7.7 | 2.2.0 |
| Date/time library | Moment.js 2.29 + handlebars.moment | Day.js 1.11 |
| Swiper | 8.x | 12.x |
| jQuery | 3.5.x | 3.7.1 |
| Font Awesome | 6.0 | 6.7 |

### Compatibility layer (`src/bootstrap-compat.js` and `src/_bootstrap3-compat.scss`)

A JavaScript file and a SCSS file were added that translate Bootstrap 3
patterns to Bootstrap 5 at run time:

- **Data attribute aliases** — `data-toggle`, `data-target`, `data-dismiss`,
  `data-parent`, `data-ride`, `data-interval`, `data-slide`, `data-slide-to`,
  `data-backdrop`, `data-keyboard` are all silently mapped to their `data-bs-*`
  equivalents.
- **Grid classes** — `col-xs-*` and other Bootstrap 3 grid helpers are mapped
  to their Bootstrap 5 counterparts.
- **Modals, dropdowns, tabs, collapses, carousels** — Bootstrap 3 jQuery calls
  (e.g. `$(...).modal('show')`) are intercepted and forwarded to the Bootstrap 5
  API.
- **Button groups / selector buttons** — Radio and checkbox button groups are
  isolated so selecting a button in one group does not affect another group.
  The active button retains its highlight colour and dispatches the correct
  value. This fixes a pre-existing bug with selector blocks.
- **Visibility helpers** — `.hidden`, `.show`, `.visible-xs`, etc. are kept
  working.
- **Alignment and float classes** — `.pull-left`, `.pull-right`,
  `.text-left`, `.text-right` remain functional.
- **Camera carousel** — the camera block template has been updated to use
  Bootstrap 5 carousel markup; the configuration interface is unchanged.

### Chart.js 4 compatibility layer (`src/chart-compat.js`)

Existing graph block configurations written for Chart.js 2.x are
automatically converted at run time:

- `scaleLabel` → `title`
- `gridLines` → `grid`
- `fontColor` / `fontSize` in ticks → `color` / `font`
- Axis tick-level `min`/`max`/`suggestedMin`/`suggestedMax` moved to the axis root
- `tooltips` → `tooltip`
- `hover` callbacks → `interaction`/`plugins` equivalents
- Dataset-level font/color properties normalized
- Zoom plugin configuration migrated to the `chartjs-plugin-zoom` 2.x API

**No changes to `CONFIG.js` graph definitions are required** for standard graph
blocks. Heavily customized graphs that pass raw `Chart.js` options may
need a review.

### Day.js as a drop-in for Moment.js

`moment` (the global function and object) is still available after the upgrade.
All standard `moment(...)` calls work as before including:

- `moment().format(...)` with existing format strings
- `moment().locale(lang)` with any of the Dashticz-supported locales
- Unix timestamp parsing: `moment.unix(ts)`, `moment(ts * 1000)`
- Relative time: `.fromNow()`, `.toNow()`
- Date arithmetic: `.add()`, `.subtract()`, `.startOf()`, `.endOf()`
- Handlebars helper `{{moment date format="..."}}` (from `handlebars.moment`)

**Configuration keys that control date/time formatting
(`calendarformat`, `calendarLanguage`, etc.) are unchanged.**

### What could break with custom CSS

If `custom/custom.css` contains rules that directly target Bootstrap internal
class names or variables (e.g. `.navbar-default`, `@{color-base}`) these may
need to be updated to Bootstrap 5 equivalents. Rules that target Dashticz block
classes (e.g. `.dt_block`, `.dt_button`, `.block_frame`) should continue to
work normally.

### Screensaver fix

The screensaver inactivity timer now resets from the **last real user
interaction**, including touches that close the screensaver. Previously, the
timer could restart from the wrong base time, causing the screensaver to
re-activate too quickly.

---

### Documentation pages that may need updating

| Page | What to add / change |
|---|---|
| **Getting started / Dependencies** | Update Bootstrap version to 5.3 |
| **Configuration / Graphs** | Note that Chart.js 2.x options are auto-converted; heavy custom options may need review |
| **Configuration / Calendar** (`calendarformat`, `calendarlanguage`) | Confirm that Moment.js format strings are still valid (they are) |
| **Configuration / Blocks / Camera** | Camera carousel now uses Bootstrap 5 markup internally; user config unchanged |
| **Configuration / Screensaver** | Note improved inactivity timer behaviour |
| **Custom CSS / Themes** | Add a note that Bootstrap 5 renamed some internal classes; advise checking custom overrides |
| **Selector block** | Document the fix: each selector button group is now independent and active state is preserved |

---

## 3. Calendar fixes and backward compatibility

### Background

After the Bootstrap and Day.js upgrade, the calendar block stopped rendering in
some dashboards. Investigation showed two causes:

1. Dashboards created with **Dashticz 3.14 or earlier** used a different
   calendar block format (`calendars` array instead of `icalurl` object).
2. The same older dashboards also used a property called `calFormat` (a number)
   instead of the new `layout` property.

### What changed in `js/components/calendar.js`

#### Backward-compatible `calendars` array support

Old (Dashticz ≤ 3.14) CONFIG.js calendar block format:

```javascript
var blocks = {
  'mycal': {
    type: 'calendar',
    calendars: [
      { color: 'lightblue', calendar: { icalurl: 'https://...', adjustTZ: 1 } },
      { color: 'lightgreen', calendar: { icalurl: 'https://...' } }
    ]
  }
};
```

New (Dashticz 3.15+) CONFIG.js calendar block format:

```javascript
var blocks = {
  'mycal': {
    type: 'calendar',
    icalurl: {
      work:    { ics: 'https://...', color: 'lightblue' },
      private: { ics: 'https://...', color: 'lightgreen' }
    },
    adjustTZ: 1
  }
};
```

Both formats are now supported simultaneously. **If your dashboard still uses
the old `calendars` array format it will continue to work without any change.**

The `adjustTZ` and `adjustAllDayTZ` properties from individual calendar entries
in the old format are promoted to the block level (the first value found is
used).

#### Backward-compatible `calFormat` → `layout` mapping

Old format used `calFormat: 0|1|2` to control the calendar display mode. The
current property name is `layout`. Both are now accepted. **No change required
in `CONFIG.js` if you use `calFormat`.**

#### `canHandle` check extended

The `canHandle` function now recognizes blocks that carry a `calendars` array
even when `icalurl` is absent. This means calendar blocks in the old format are
correctly identified and rendered.

### Calendar configuration reference (current)

| Property | Type | Default | Description |
|---|---|---|---|
| `type` | string | — | Must be `'calendar'` |
| `icalurl` | object \| string | — | One or more calendar sources. Object keys are arbitrary names; each value has `ics` (URL) and optionally `color`. A plain string URL is also accepted for a single calendar. |
| `calendars` | array | — | **(Legacy)** Array of `{ color, calendar: { icalurl, adjustTZ, adjustAllDayTZ } }` objects. Still supported; converted automatically. |
| `layout` | number | `0` | Display layout: `0` = list, `1` = list with click-to-full-screen, `2` = week grid |
| `calFormat` | number | — | **(Legacy)** Alias for `layout`. Still supported. |
| `adjustTZ` | number | `0` | Timezone offset in hours to apply to event times |
| `adjustAllDayTZ` | boolean \| number | `false` | Apply timezone adjustment to all-day events |
| `maxitems` | number | `15` | Maximum number of events to show |
| `weeks` | number | `5` | Number of weeks to look ahead |
| `lastweek` | boolean | `true` | Include events from the past 7 days |
| `isoweek` | boolean | `false` | Start week on Monday (ISO week) instead of Sunday |
| `dateFormat` | string | `'ddd DD/MM/YY'` | Date format string (Moment-compatible) |
| `timeFormat` | string | `'HH:mm'` | Time format string (Moment-compatible) |
| `startonly` | boolean | `false` | Show only the event start time, not the end time |

Global calendar settings in `CONFIG.js`:

| Setting | Description |
|---|---|
| `config['calendarurl']` | Default URL for the built-in Domoticz Google Calendar integration |
| `config['calendarformat']` | Default date format string |
| `config['calendarlanguage']` | Locale code for day/month names (e.g. `'nl'`, `'de'`) |

---

### Documentation pages that may need updating

| Page | What to add / change |
|---|---|
| **Configuration / Blocks / Calendar** | Add the full configuration table above; document both `icalurl` (new) and `calendars` (legacy, still supported); document `calFormat` as a legacy alias for `layout` |
| **Migration guide** (new page or section) | Explain how to convert from the old `calendars` array format to the new `icalurl` object format |
| **Configuration / Settings** | Confirm `calendarurl`, `calendarformat`, `calendarlanguage` still work as before |

---

## Summary of configuration changes

This table lists every configuration key and property that **changed name** or
**changed behaviour**. All old names are still supported via backward
compatibility.

| Old name | New name | Component | Notes |
|---|---|---|---|
| `calendars` (array) | `icalurl` (object) | Calendar block | Old array format auto-converted; no change required |
| `calFormat` | `layout` | Calendar block | Old property auto-converted; no change required |
| `data-toggle` | `data-bs-toggle` | HTML attributes | Auto-translated by compat layer |
| `data-target` | `data-bs-target` | HTML attributes | Auto-translated by compat layer |
| `data-dismiss` | `data-bs-dismiss` | HTML attributes | Auto-translated by compat layer |
| Chart.js v2 axis options | Chart.js v4 axis options | Graph block | Auto-converted at run time |
| `handlebars.moment` helper | Day.js-backed moment | Templates | Existing templates unchanged |
| `switch_horizon.php` (root) | `tools/switch_horizon.php` | Ziggo/UPC helper | Auto-redirected; no change required |

---

## Files added, moved, or deleted — quick reference

### Added

| File | Purpose |
|---|---|
| `src/bootstrap-compat.js` | Bootstrap 3 → 5 JavaScript compatibility layer |
| `src/_bootstrap3-compat.scss` | Bootstrap 3 → 5 CSS compatibility layer |
| `src/chart-compat.js` | Chart.js 2 → 4 configuration migration helper |
| `src/date-time.js` | Day.js setup with full Moment.js API surface |
| `vendor/dashticz/security.php` | Shared PHP helper: same-origin checks, CSRF tokens, SSRF protection |
| `tools/log.html` | Moved from root |
| `tools/switch_horizon.php` | Moved from root |
| `build/babel.config.js` | Moved from root |
| `build/webpack.config.js` | Moved from root |
| `build/prettier.json` | Moved from `.prettierrc` |
| `build/prettierignore` | Moved from `.prettierignore` |
| `tests/source.test.js` | Automated regression tests (JS syntax, JSON, URL, security, compat) |
| `tests/php-security.test.js` | Automated regression tests for PHP endpoint security |

### Removed

| File | Reason |
|---|---|
| `js/thermostat.js` | Dead code (replaced by `js/components/thermostat.js`) |
| `js/chromecast.js` | Unused Chromecast integration |
| `js/domoticz-api.js_org` and other `*.js_org` files | Backup copies |
| `index2.html` | Undocumented second entry point |
| `vendor/dashticz/upload.php` | Unauthenticated upload helper |
| `docs/` folder | RST docs removed (maintained separately at readthedocs.io) |
| `scripts/` folder | Installer/backup scripts |
| `Makefile`, `Dockerfile`, `nginx.conf` | Infrastructure files not part of standard install |
| `playwright.config.js` | Playwright config (tests migrated to Jest) |
