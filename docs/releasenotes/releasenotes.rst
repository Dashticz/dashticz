Release Notes
=============

For Dashticz's **beta** version Release Notes go to: https://dashticz.readthedocs.io/en/beta/releasenotes/index.html

For Dashticz's **master** version Release Notes go to: https://dashticz.readthedocs.io/en/master/releasenotes/index.html


Unreleased (11-8-2026)
--------------------------

* **Enhancements**

- Added a **Radio** widget to Widget Editor, built on the existing
  Streamplayer block. Add and remove radio stations (name + stream URL) from
  a repeatable list; saved stations are written as
  ``blocks['streamplayer'].tracks``, the same shape a hand-written
  ``_STREAMPLAYER_TRACKS`` global uses, so existing Streamplayer
  configurations keep working unchanged. ``tracks`` is a managed property,
  so it does not also appear as a raw JSON row in the generic Custom fields
  section. See :ref:`customstreamplayer`.

- Added a **Multi Device** type to the Screen Editor's add menu, to combine
  several IDX/value pairs — optionally from different Domoticz devices —
  into one block, for example ``blocks['combine'] = {idx: 43, values:
  [{value: '<NettUsage>'}, {idx: 1247, value: '<Temp>'}]}``. It is built on
  the existing Custom Device engine: a ``values`` row without its own
  ``idx`` falls back to the block's own ``idx``. See :ref:`dom_blockparameters`.

* **Fixes**

- Screen Editor: the config cog was missing for devices/widgets added by
  hand in CONFIG.js using the documented syntax (for example
  ``blocks['weather'] = {type: 'weather'}``), rather than the Widget
  Editor's own ``widget_xxx`` block keys. The Screen Editor now also
  resolves a widget from its block's ``type``/shape, matching how Widget
  Editor itself already identifies existing blocks.

- Widget titles set via the config menu were not visible on the dashboard
  and reverted after every reload. ``getBlockConfig`` in ``js/dashticz.js``
  applied a translated default title to any Widget-Editor block
  unconditionally, even when the block already defined its own ``title``,
  so a saved custom title was immediately overwritten again on render. It
  now only falls back to the translated default when the block does not
  define its own title.

- iFrame widget: new blocks now default ``scaletofit``/``aspectratio`` to
  empty instead of ``300``/``0.9``, so a newly added iFrame simply fills the
  tile's own width/height instead of assuming a fixed-width embedded page.
  Existing blocks that already set these values are unaffected. In a grid
  layout, an iFrame with neither set now measures and fills its grid cell's
  own height instead of collapsing to the browser's small default iframe
  height. See :ref:`Frames`.

* **Code**

- Custom Device and the new Multi Device popup now start with an empty IDX
  and device name instead of showing example values (``1380`` /
  ``BTC_Price``) that could be mistaken for defaults. Existing Custom
  Devices are unaffected.

v3.41.0 beta (10-8-2026)
--------------------------

* **Enhancements**

- The Air Quality widget (``longfonds`` in CONFIG.js, id/key kept for backward
  compatibility) now renders through the World Air Quality Index (WAQI)
  component instead of the Longfonds/RIVM postcode lookup, which is why it was
  no longer working. Configure it with a WAQI city code (found on
  https://aqicn.org/) and a layout, both in Widget Editor or Settings ->
  Widgets -> Air Quality. The ``longfonds_zipcode``/``longfonds_housenumber``
  settings and ``js/components/longfonds.js`` are removed; the (previously
  unused, disabled) ``js/components/waqi.js`` component is now enabled and
  reads the ``waqi_city``/``waqi_layout`` global settings.

* **Fixes**

- Public transport widget: added the missing default icon
  (``fas fa-train``) to ``js/components/publictransport.js``. The widget
  catalog already showed a train icon when picking the widget, but the
  component itself never wrote one into ``defaultCfg``, so a newly created
  widget had no icon at all unless one was set by hand.

- Device Editor: saving a device still failed with "requires a non-empty XMLTV
  URL" when an XMLTV TV Guide widget configured the normal way (its URL set as
  the global ``xmltv_url`` setting, via Widget Editor) was on the same screen.
  The earlier fix for this (issue #98) only checked the block's own
  ``xmltvurl`` property, but that property is empty for a widget using the
  global setting — so the resubmitted payload still carried an empty URL and
  ``savewidgets.php`` still rejected the save. It now falls back to
  ``settings.xmltv_url`` when the block has no URL of its own.

v3.40.6 beta (10-8-2026)
--------------------------

* **Enhancements**

- Device Editor: the Separator/title bar block now has an **Icon** checkbox and
  value, same as other special blocks. Previously it had no dedicated icon
  option, and typing ``icon`` into its Custom Fields section was rejected with
  "This field is duplicated or reserved" because ``icon`` is a managed property
  everywhere else — there was simply no supported way to add one. The block's
  rendering already draws a leading icon for any block type, so this only
  needed the missing Device Editor UI and ``saveblocks.php``/``configwriter.php``
  wiring to carry the icon through to ``CONFIG.js``.

v3.40.5 beta (10-8-2026)
--------------------------

* **Code**

- Removed ``configwriter_normalise_text_alignment()`` from ``js/configwriter.php``,
  a leftover helper from the removed alignment editor that was no longer called
  anywhere.
- Updated a stale ``tests/php-security.test.js`` assertion for the grid layout
  writer's ``$forceClone`` check, which still expected its previous form and
  never matched the current cross-screen ownership logic (commit a88f728).

v3.40.4 beta (10-8-2026)
--------------------------

* **Fixes**

- Device Editor: saving from Device Editor now fails with a 400 error
  ("XMLTV TV Guide requires a non-empty XMLTV URL" / "iFrame requires a
  non-empty URL") when adding or editing *any* device, as long as an
  ``xmltvguide`` or ``iframe`` widget block already exists on the dashboard.
  Device Editor resubmits every existing widget block to ``savewidgets.php``
  on each save, but it never copied the block's ``xmltvurl``/``frameurl``
  (or the widget's other saved options) into that resubmission, so the
  server-side validation added for those two widgets always saw an empty
  URL and rejected the whole save. Device Editor now carries those fields
  over like it already does for the calendar widget's ``icalurl``, so
  adding a device no longer breaks dashboards that also use the XMLTV TV
  Guide or an iFrame widget. (#98)

v3.40.3 beta (10-8-2026)
--------------------------

* **Fixes**

- Grid screens: widgets created (or resaved) from the Widget Editor no longer get a
  default fixed pixel ``height`` written into their block config. A grid item's
  height is already determined by its grid-row span; the leftover column-layout
  default fought that sizing and caused iframes, camera/image widgets and other
  dynamically-sized content to be clipped or leave empty space, especially on
  mobile stacking. ``renderBlock`` now also skips forcing a block's configured
  ``height`` as inline CSS when it renders inside a grid item, so dashboards with
  an already-saved default height are fixed immediately without editing
  ``CONFIG.js``. Column-mode layouts are unaffected: they still get the catalog
  default height needed to pack columns, and any explicitly-set height keeps
  working in both modes.

v3.40.2 beta (7-8-2026)
--------------------------

* **Fixes**

- Grid screens: placing the same device or widget on both a normal screen and the
  standby screen now keeps independent positions for each screen.  Previously the
  grid position was stored in the shared ``blocks['ref']['grid']`` global, so the
  second screen's save silently overwrote the first screen's position and both
  screens rendered at the same location.  The config writer now stores each block's
  grid position as a per-screen ``{key, grid}`` inline descriptor inside
  ``screens[N]['blocks']`` / ``standby_screen['blocks']``, and ``renderGridScreen``
  reads the per-screen grid from that descriptor instead of from the shared
  ``blocks`` object.  Old-format configs (string refs with ``blocks[ref].grid``)
  remain fully backward-compatible.
- Layout Editor now recognises Domoticz group/scene block references (for
  example ``s1``) as normal configurable devices. Their top-left edit-mode control
  is now the same configuration cog used by other devices, and it opens the
  existing Device Config popup instead of showing only the move icon.
- Widget custom titles edited from Device/Widget Config now stay screen-local:
  the rendered widget block title changes on-screen, while widget catalog/menu
  labels remain language-driven and no longer inherit a saved block title.
- The Screen Editor add menu now includes a dedicated **Slide button** tile.
  It opens a small popup (similar to Custom devices) that saves a named block
  with ``slide``, ``key``, ``title`` and optional ``icon`` properties for quick
  page navigation buttons.

v3.40.1 beta (7-8-2026)
--------------------------

* **Fixes**

- Theme settings panel: ``_getStoredCssVarOverrides`` now only reads CSS variable
  overrides from the ``dashticz-theme-vars`` block written by ``savecustomcss.php``
  (an inline ``<style>`` element), not from theme stylesheet ``<link>`` rules.
  Previously the function scanned all ``<link>`` stylesheets including
  ``creative.css``, which caused ``_hasThemeCssVarCustomizations`` to always
  return ``true`` even when no user overrides were saved.  The ``(custom)`` marker
  in the theme dropdown therefore never cleared after a reset, making saved changes
  appear not to take effect.

v3.40.0 beta (7-8-2026)
--------------------------

* **Enhancements**

- Data checkboxes in Device Config and Widget Config now use positive semantics:
  checked shows the data text, while unchecked writes ``hide_data: true``.
- The Screen Editor add tile is now labeled **Devices**.
- Device tiles in Layout Editor show a top-left configuration cog that opens the
  existing Device Config flow.
- The Wizard icon now uses ``fa-wand-magic-sparkles`` in all editor topbars.
- Layout Editor widget tiles now use the same top-left configuration cog as
  devices and open the matching full Widget Config. Device/Widget config headers
  include the name of the tile being edited.
- Removed the obsolete editor text-alignment classes/writer support and changed
  the default normal-screen background to ``/img/custom/BG_Dashticz_bw.png``.

* **Code**

- Bumped the beta package and runtime version to 3.40.0 and updated regression
  coverage for the editor controls.

v3.30.3 beta (5-8-2026)

* **Enhancements**

- Device Editor rows now use a cog button that opens **Device Config**. The
  existing Icon, Data, Updated, Switch and Title controls and visual
  left/center/right alignment buttons are grouped in that popup. The Device
  Editor is hidden while the popup is open so the configuration always remains
  in front; it returns after OK or Cancel.
- Device Config now also contains repeatable Field/Setting rows for typed custom
  device parameters. Checkboxes are larger and the smaller alignment controls
  have a visible localized label loaded from ``lang/*.json``.
- Widget Config now includes Icon, Data, Updated and Title options plus
  repeatable Field/Setting rows for typed custom block parameters.
- The generated ``blocks[...]`` definitions now save and reload those settings
  through the existing Device Editor flow, including helper title blocks.
- Per-device alignment is also maintained in an isolated generated section of
  ``custom/custom.css`` without replacing hand-written CSS.

* **Code**

- Updated English, Dutch and French editor translations, validation and
  source/playwright tests. Existing ``CONFIG.js`` variables and alignment
  options remain supported and the version number is unchanged.

v3.30.2 beta (4-8-2026)

* **Fixes**

- Theme settings: after selecting the "original" (reset) option, the reset entry no longer reappears in the dropdown while the panel is still open.

v3.30.1 beta (5-8-2026)

* **Enhancements

- Switching from Custom mode to Wizard mode now shows a clear warning that the
  current dashboard configuration will be removed and a clean page will be
  created.
- Added a new **Theme** category to the settings menu.
- Moved Dashticz theme selector, background image picker, and Pad/URL from the Screen settings to the Theme settings.
- Added color pickers for CSS custom properties (``--main-bg``, ``--home-bg``, ``--border-color-*``, ``--button-*``, ``--text-*``, ``--selector-bg``, ``--blocktitle``) in the Theme panel.
- Added font-size inputs for ``--font-small`` and ``--font-large``.
- Color and font overrides are written to ``custom/custom.css`` (inside a ``/* dashticz-theme-vars */`` block) so they take effect on top of the active theme without touching ``CONFIG.js``.

* **Fixes

- When switching from Custom mode to Wizard mode, `CONFIG.js` now removes all
  Blocks, Columns and Screens while keeping the existing config settings.

* **Code

- Limited the mode-switch change to the Wizard confirmation text and the
  configuration cleanup written by `saveconfigmode.php`.

v3.30.0 beta (4-8-2026)

* **Changes

* **Device Editor

- Added the missing `Title` field to dummy devices and title blocks.
- Added the following options to dummy devices:
  - Icon
  - Hide data
  - Last update
  - Switch
- Ensured these values are correctly loaded from and saved to `CONFIG.js`.
- Fixed the alignment of dummy devices and title blocks so their controls match normal device rows.
- Fixed an issue where `Hide data` was incorrectly shown as enabled for existing blocks without an explicit `hide_data` setting.
- Only writes `hide_data: true` when the option is actually enabled.

* **Hide data

- Fixed `hide_data: true` being ignored when the Modern Dark theme was active.
- Fixed two incorrect references to the global `blocks` object instead of the current `block`.
- `hide_data` now behaves consistently across all themes.

* **Layout Editor / Move mode

- Fixed widgets remaining in move mode after being updated by Domoticz.
- When a Domoticz refresh replaces a widget DOM element, the Layout Editor now updates its internal element reference.
- Editor overlays and temporary move-mode classes are now removed correctly when move mode is closed.
- Added cleanup safeguards for overlays and drag/drop classes.
- Preserved block dimensions and editor controls when a widget is refreshed during editing.

* **Modern Dark theme

- Restored the default block height to 120 px so it aligns with the 10 px layout grid.
- Fixed standby background images being overwritten by the theme.
- Kept the top-bar clock transparent without its own background, border or shadow.
- Restored the intended title-group panel styling.
- Added a minimum height for dropdown controls.
- Corrected garbage-widget alignment.
- Restored the intended block spacing and border transparency values.

* **Settings cleanup

- Removed the obsolete and unused `edit_mode` setting.
- Removed its default value and translations.
- Updated the related tests.

* **PHP compatibility

- Replaced deprecated PHP string-offset syntax in the legacy iCalendar parser.
- The parser is now compatible with PHP 8.

v3.23.7 beta (2-8-2026)
--------------------------

* **Consistent localization for settings and widgets**: user-facing text in
  Settings, Device Editor, Widget Editor, Layout Editor, screen controls and
  widget status/error messages is now sourced from ``/lang/*.json``. Dashticz
  always loads ``en_US.json`` as the base and recursively overlays the selected
  locale. Missing locale entries therefore fall back to English without mixing
  in hard-coded Dutch or French text.

* **Topbar clock and widget sizing options**: the topbar Mini clock now has a
  transparent background in Custom mode. Calendar exposes a visible-row limit
  (``maxitems``, default 15). Garbage exposes both ``maxitems`` (default 4) and
  ``maxdays`` (default 32), and stores both properties in the generated block.

* **Responsive iframe defaults**: newly added iframe widgets now default to
  ``scaletofit: 300`` and ``aspectratio: 0.9`` and omit a fixed ``height``.
  Existing iframe blocks that use only ``height`` remain unchanged and fully
  supported.

* **Fix topbar block order**: blocks listed in ``columns['bar']['blocks']``
  now appear in the configured order. Previously ``sunriseholder`` (and any
  other block without an explicit CSS ``order`` value) defaulted to ``order:0``
  and was always placed before ``logo`` and ``miniclock``, regardless of their
  position in the config. Content blocks now rely on DOM order (which already
  matches the config), while only the screen-switcher and settings cluster are
  pinned to the far right via high CSS order values.

* **Restore adding devices and widgets**: the Device Editor now sends the
  immutable ``device_<IDX>`` reference with every selected Domoticz device for
  the complete blocks/layout save sequence. The Widget Editor similarly gives
  new widgets their catalog reference immediately and retains existing custom
  widget references. Adding tiles therefore works again after the IDX-key
  migration in both column and grid layouts.

* **Start Wizard with an empty configuration**: switching an otherwise empty
  ``CONFIG.js`` to Wizard now creates an empty grid for screen 1 instead of
  reporting that no blocks could be converted. The Device and Widget editors
  can immediately populate the new screen. This empty bootstrap remains
  separate from the delete-screen operation.

v3.23.6 beta (1-8-2026)
--------------------------

* **Stable Domoticz device keys**: blocks written by the Device Editor now use
  ``device_<IDX>`` or ``device_<IDX>_<subidx>`` instead of a mutable Domoticz
  name. Generated normal-device blocks omit ``title``, so the dashboard follows
  later Domoticz renames. Existing hand-written keys and explicit titles remain
  supported and editor-managed layouts migrate on their next save. Grid saves
  also remove their superseded generated column section, preventing duplicate
  old-name and IDX-key definitions. Repeated saves reuse the same IDX key rather
  than producing suffixed duplicates such as ``device_1498_2``.

* **Modern Dark garbage alignment**: the Garbage widget now right-aligns its
  collection text while retaining the garbage icon on the left.

* **Movement mode and live updates**: Domoticz device refreshes no longer
  remove the editor overlay or restore the old fixed pixel height. Updated
  blocks therefore remain draggable and resizable throughout the edit.

* **XMLTV grid sizing**: the TV Guide tile now follows its assigned grid row
  span in both movement mode and the dashboard. Only programme rows that fit
  completely are shown, extra rows return when enlarged, and no internal
  scrollbar is displayed.

Enhancements
~~~~~~~~~~~~

* **Dynamic theme selector**: **Settings > Display > Dashticz-Theme** is now a dropdown populated from valid theme folders in ``themes/``. A theme is listed when ``themes/<name>/<name>.css`` exists; **Default** and existing manually configured values remain available.

* **Device Editor helper blocks**: the add selector now starts with **Dummy device** and **Title**, separated from Groups, Scenes and Devices by divider rows. Dummy devices request a positive IDX and generate ``blocks['dummyblock_N']`` with ``hide_data: true``; titles request text and generate an IDX-free ``blocks['Title_N']`` with ``type: 'blocktitle'``, width 12 and height 120px. Both types work in column and grid layouts. Grid titles default to three rows, may be resized down to three rows and do not show a scrollbar at that height. Modern Dark title blocks use the theme panel background, border, radius and shadow, with title text at the top left. Dutch, English and French strings are included; other locales safely use the English fallback.

Fixes
~~~~~

* **XMLTV TV Guide — consistent setting storage**: the Widget Editor now stores the XMLTV widget's URL, channel filter, maximum items, layout, separator, and refresh interval as global ``config['xmltv_*']`` settings, matching the pattern already used by widgets such as Sonarr.  Generated XMLTV blocks now use ``type: 'xmltvguide'`` and read those shared settings automatically, while existing hand-written blocks that keep ``xmltvurl`` / ``channels`` / ``maxitems`` directly on the block remain supported as overrides.

v3.23.5 beta (1-8-2026)
--------------------------

Fixes
~~~~~

* **XMLTV TV Guide — settings not saved**: in grid mode, changing the XMLTV URL (or any other XMLTV widget setting) via the widget-editor settings popup now persists correctly.  Previously ``savegridlayout.php`` would re-apply the stale block definition from the old grid-layout section of ``CONFIG.js`` instead of the freshly-saved definition written by ``savewidgets.php``, silently discarding the change.  Additionally, the widget editor now reads back ``layout``, ``separator`` and ``refresh`` from an existing saved block when the settings popup is opened in grid mode.

v3.23.4 beta (1-8-2026)
--------------------------

Fixes
~~~~~

* **XMLTV TV Guide**: the XMLTV widget now stays on its own XMLTV data path instead of falling back to the legacy ``tvgids.nl`` JSON API when ``channels`` is configured.  Widget saves now preserve the XMLTV-specific ``layout``, ``separator`` and ``refresh`` options during Widget/Layout Editor updates.  Public XMLTV feeds can now be fetched through a dedicated PHP endpoint that caches downloads for 24 hours and accepts plain XML plus ``.gz`` and ``.zip`` guide files.

v3.23.3 beta (1-8-2026)
--------------------------

Fixes
~~~~~

* **Default topbar height**: when no theme is selected, the topbar now uses the same compact height as Modern Dark.
* **Topbar screen-switcher PNG icons**: when **Custom iconen topbalk** is enabled, the Standby and screen buttons now automatically use the bundled ``Standby.png``, ``One.png``, ``Two.png``, ``Three.png``, and ``Four.png`` assets when no explicit per-screen icon is configured.  These screen-switcher PNG icons now render at 30px.

v3.23.2 beta (1-8-2026)
--------------------------

Fixes
~~~~~

* **Topbar custom icons**: renamed the topbar icon setting from *"Default iconen topbalk"* to **"Custom iconen topbalk"** and corrected the logic so that **off** (default) keeps Font Awesome icons and **on** switches to custom PNG images from ``img/icons/``.  The fix applies consistently to the main topbar, the Standby-screen editor icons, and the fullscreen toggle.

v3.23.1 beta (1-8-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* **Topbar icons — PNG mode**: a new setting **"Default iconen topbalk"** (``topbar_use_png_icons``) has been added to the *Screen* settings tab.  When the checkbox is **on** (default), the topbar action buttons (Add devices +, Add widgets 🧩, Move tiles ✤, Settings ⚙, Fullscreen ⛶) continue to use Font Awesome icons as before.  When it is **off**, they switch to custom image files from ``img/icons/``: ``Plus.png``, ``Puzzle.png``, ``Arrows.png``, ``Cog.png``, ``Expand.png`` (and ``Minus.png`` for the compressed-fullscreen state).  The setting also applies to the editor icons shown on the Standby screen.  Existing configs without the setting behave exactly as before.

~~~~~~~~~~~~



v3.23.0 beta (1-8-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Widget editor / screenswitcher: widget tile names and editor-icon tooltips ("Add devices", "Add widgets", "Move and scale tiles") are now translated using the active language file (``/lang/<locale>.json``).  English is used as fallback when a key is missing.  New keys ``add_devices``, ``add_widgets``, and ``move_tiles`` have been added under ``settings.widgeteditor`` for ``en_US``, ``nl_NL``, and ``fr_FR``.

* **Screen-switcher icons**: the topbar buttons for Screen 1, 2, 3 … and the Standby button now support custom icons.  Set ``screens[n]['icon']`` in ``CONFIG.js`` to any Font Awesome class string (``'fas fa-home'``) or an image path relative to the Dashticz root (``'img/icons/home.svg'``).  For the Standby button use ``standby_screen['icon']`` or ``config['standby_icon']``.  A new ``img/icons/`` directory is provided for local icon storage; SVG, PNG, and other image formats are all supported.  All existing configs without ``icon`` keys continue to work unchanged — the buttons fall back to the original number/letter text.

* **Screenswitcher i18n**: the topbar screen-switcher button labels (Standby, Screen #, Add screen, Delete screen) are now driven by a new ``screenswitcher`` section in each ``/lang/<locale>.json`` file.  Previously the "Add screen" and "Delete screen" tooltips were hard-coded in Dutch.  All 28 bundled language files have been updated.  English is the automatic fallback when a key is absent.

* Device Editor: the "Add device from Domoticz" dropdown now lists items in the order Groups, Scenes, then Devices (each group alphabetically), instead of a flat alphabetical sort across all types.
* Device Editor: Domoticz groups and scenes are now listed in the "Add device from Domoticz" dropdown with a ``Group_`` (or ``Scene_``) prefix so they can be added to any screen.  Saved group blocks use the group's scene key (e.g. ``s1``) directly as the block reference, matching the hand-written CONFIG.js convention.

* Widget editor: an **iFrame** widget has been added to the widget catalog.  It uses the existing ``DT_frame`` component and generates a block with ``frameurl`` in ``CONFIG.js``.  Configurable options are: URL (required), height (px), scrollbars (on/off), scale-to-fit width, force cache refresh, and refresh interval.  Translations for the new widget and its settings have been added to ``en_US``, ``nl_NL``, and ``fr_FR``.  Existing hand-written ``frames.*`` blocks (using ``frameurl``) are automatically recognised by the widget editor when the screen is opened.

* A new **XMLTV TV Guide** widget (``DT_xmltvguide``) has been added.  It fetches guide data from any XMLTV-compatible source (WebGrab+Plus, EPG123, Jellyfin, Tvheadend, etc.) and displays current and upcoming programmes.  The ``xmltvurl`` block property selects the data source; ``channels`` filters by channel id or display-name; ``maxitems``, ``layout``, and ``separator`` control the presentation.  Translation strings for loading, error, and no-programme states have been added to all supported language files.  See :ref:`xmltvguide` for full documentation.

~~~~~~~~~~~~


Fixes
~~~~~

* Widget editor: widget tile names now always reflect the active language when the device-editor popup opens, even when a hardcoded ``title`` (e.g. ``title:'Afval'``) is present in the ``blocks[...]`` definition in ``CONFIG.js``.  The translated name from the language file (``settings.widgeteditor.*_title``) now takes priority over any stored title for all known widget types.  Type-mapped widgets (blocks defined with a ``type:`` property rather than a ``widget_xxx`` key) are fixed in the same way.



v3.22.2 beta (1-8-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Config mode: the Custom/Wizard switch now defaults to **Custom** when ``config["config_mode"]`` is absent from CONFIG.js (hand-written configs are treated as Custom). On startup and on every settings save the auto-detected value is written back to CONFIG.js so that subsequent loads resolve it directly.


v3.22.1 beta (1-8-2026)
--------------------------

Fixes
~~~~~

* Grid Layout Editor: the delete (remove) and resize handles are no longer clipped when a grid item is resized very small or its content overflows the tile boundary — ``overflow`` on the grid item is now ``visible`` while the editor is active.
* Calendar (agenda layouts 0 and 1): the block background now expands to fit all displayed agenda items instead of being capped at a fixed 120 px default.  Users who want a fixed-height scrollable agenda can still set ``height`` explicitly in their block config; layout 2 (monthly view) is unaffected.


v3.22.0 beta (30-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Standby: Wizard Standby now uses the same free-positioned, editable CSS Grid layout as numbered screens. Existing ``columns_standby`` layouts can be converted after confirmation.
* Grid editors: Device and Widget Editors can add, remove and configure tiles on numbered and Standby grids while retaining existing positions; newly added tiles use the first free cells.
* Grid Layout Editor: vertical placement and resizing now use 20 px rows, giving twice the precision while the horizontal grid remains 24 columns.
* OpenWeather: Config and Widget Editors expose ``showGust`` (No), ``showWind`` (No), ``showDescription`` (Yes), ``showRain`` (Yes), plus a five-choice icon dropdown (``line``, ``linestatic``, ``fill``, ``static`` and ``meteo``).
* Updates: the Update control now appears only in the Info tile; newer versions produce a persistent lower-right overlay notification.

Fixes
~~~~~

* General Settings: Save now updates only submitted settings instead of rebuilding all root configuration, preserving Garbage, Weather and other widget settings plus custom arrays and objects.
* Configuration editors: every save endpoint now follows ``?cfg=...`` (for example ``CONFIG2.js``), validates the filename, and leaves unchanged settings untouched.
* Configuration output: editor-owned settings remain deduplicated and generated layout output stays grouped as blocks, columns and screens without rewriting hand-written content.
* Screens: saving an empty numbered grid removes that screen and renumbers every following screen sequentially from 1, including its generated editor sections and column references.
* Screens: an explicit minus control now removes the active extra screen; screen 1 remains protected.
* Grid Layout Editor: existing screens that explicitly stored the former 40 px row default are migrated to 20 px rows without shrinking their blocks.
* Grid Layout Editor: resize and remove controls remain reachable on one-row tiles, and Domoticz flash updates no longer turn tiles grey while they are being moved.
* Standby: the S-screen is constrained to the viewport; oversized background images use centered ``cover`` cropping and can no longer enlarge the standby canvas beyond the display resolution.
* Topbar and Calendar: restored spacing between weekday and date, and constrained overflowing agenda text to the configured tile background.
* Clock settings: repeated saves now compare against the rendered values and persist each new change.
* Garbage: built-in collection names, empty/error states and provider errors now use language JSON entries (English and Dutch included).
* Topbar: restored the original logo and clock proportions while grouping the screen selector, Custom/Wizard switch and configuration icons at the far-right edge.
* Grid Layout Editor: blocks cannot be resized below two columns by four rows.
* Garbage: collection date names now explicitly follow the language selected under Settings > Localize.

v3.21.7 beta (30-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Wizard layout: opening a legacy columns screen now offers a confirmed conversion to a compact 24-column grid, including named, numeric and inline blocks. Switching from Custom to Wizard performs the same conversion, ensuring Wizard uses free grid placement.

v3.21.6 beta (30-7-2026)
--------------------------

Fixes
~~~~~

* Grid Layout Editor: the editing canvas now exposes and dynamically adds empty rows, scrolls automatically near the viewport edge, and keeps pointer capture outside the original block area so blocks can be dropped at any grid coordinate.

v3.21.5 beta (30-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Grid Layout Editor: named blocks on a grid screen can be dragged to new ``x``/``y`` coordinates and resized in ``w``/``h`` grid units. Save persists a safe grid-only override in ``CONFIG.js``; Cancel restores the original layout.

v3.21.4 beta (30-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Screens: optional CSS Grid layouts place blocks at explicit ``x``, ``y``, ``w`` and ``h`` coordinates while preserving empty cells. Grid dimensions, row height and gap are configurable per screen.
* Grid screens: invalid positions receive safe fallbacks with console warnings, overlapping blocks remain rendered and are marked for diagnosis, mobile screens stack blocks in configured order, and column-based Device/Widget editors are disabled to protect grid configuration.

v3.21.3 beta (30-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Widget defaults: Google Maps, Camera, Air Quality, News, Weather, Spotify, Sonarr, Calendar, Public Transport, Traffic Information and 112 now use compact 4/12 widths and the requested rounded default heights.
* Camera widget: the Widget Editor can configure multiple named cameras with image and optional MJPEG URLs, using the existing camera carousel.
* Backgrounds: personal images named ``BG_*`` and placed in ``img/custom`` appear in both the **Screen** and **Standby** background selectors. Other filenames stay hidden, and all files in this directory are ignored by Git so updates leave them untouched.

Fixes
~~~~~

* Standby settings: changing the background no longer rebuilds or clears ``columns_standby``, so standby blocks remain accessible and retain their configured widths and positions.
* Standby settings: removed the redundant **Standby blocks** text field; standby content is managed through the Device, Widget and Layout editors.
* Localization: the language selected in **Settings → Localize** now takes precedence over a stale browser language value after saving and reloading.
* Widget editor: widget names, descriptions, controls, statuses and validation messages now use the language JSON files. English and Dutch translations are included.
* Widget editor: opening the widget menu from Standby no longer makes its blue widget icons and grey settings icons white or invisible.
* Widget editor: settings entered while adding a widget to screen 2, another numbered screen or Standby are now retained in ``CONFIG.js`` just like settings entered on screen 1.
* Info: Domoticz, dzVents, Python and PHP versions are retained until the Info panel opens; the server operating system, version and architecture are now shown as well.
* Version check: the comparison now follows the current Git checkout's preferred remote and branch, and its status text is translated.
* Visual editors: saving a layout with tall and short tiles now keeps every tile on the same 12-column grid, preserving its configured width, order and height after reload.

v3.21.2 beta (28-7-2026)
--------------------------

Fixes
~~~~~

* CONFIG.js: visual editor saves now consolidate generated output into one section with settings at the top, followed by grouped blocks, columns and screens. Existing separate Device, Widget and Layout Editor sections are migrated automatically on the next save.

v3.21.1 beta (28-7-2026)
--------------------------

Fixes
~~~~~

* Modern Dark: restored the larger 56 x 44 pixel selector-button touch targets that were accidentally removed while adjusting the theme colours.

Documentation
~~~~~~~~~~~~~

* README: documents the first-run wizard, Wizard/Custom modes, all topbar editors, the complete 15-widget catalog, standby settings, browser updates, and every supported installer directory option.
* Automatic installer guide: documents ``-d``, ``--directory``, ``--directory=PATH``, a positional directory, ``DASHTICZ_INSTALL_DIR``, and ``--help``.

v3.21.0 beta (28-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Settings: the Update button is larger, with Beta/Main branch selection and **Update uitvoeren** shown beside it.
* Settings Widgets: category tiles for widget-related settings (including Weather provider groups and Clock type-specific defaults).
* Widget Editor / Clock: selecting a clock type shows the relevant options from the clock docs — size and scale for Basic/Hayman/Flip/Station; Flipclock ``showSeconds`` and ``clockFace``; Stationclock body, dial, hands, boss, and hand behavior. Values are saved on the clock block in ``CONFIG.js``.
* Widget catalog: additional widgets (security panel, public transport, traffic, 112/alarmmeldingen, camera, map, longfonds, moon, news) and OpenWeather display options (rain, description, wind, gust, icon set).
* Standby: standby screen settings available as a Settings tile.
* Settings → Weergave: background image uses the same pulldown as Standby (``BG_*`` labels for ``img/bg*`` files), with a **Pad/URL** field underneath for custom paths or full URLs. Standby uses the same pattern.
* Settings → Widgets → Clock: **Grootte** and **Schaal** apply as defaults; clocks (especially station clock) fit inside the device tile.
* Topbar: Dashticz logo is shown before the app title. The topbar clock is optional via Settings → Weergave (default off).
* Settings Update: Git commands pass ``safe.directory`` for the Dashticz checkout so updates work when the web-server user does not own the files (e.g. Docker / www-data). Permission errors show a fix hint; use ``tools/install-dashticz-write-access --git-update`` to grant write access. ``install.sh`` runs that helper after a fresh clone so first installs can use Settings → Update.

v3.20.4 beta (24-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Widget Editor: a puzzle-piece icon in the topbar opens a tile catalog for Weather (OpenWeather or Weather Underground), Garbage, Spotify, Sonarr, Clock, and ICS Calendar widgets. The clock widget supports Basic, Station, Flip, Hayman, and Mini clock variants. Selected widgets are stored in a separate managed section in ``custom/CONFIG.js`` and added to screen 1.
* Visual Layout Editor: an arrows icon has been added to the topbar. Generated device and widget blocks on screen 1 can be reordered and resized directly on the dashboard. The editor uses the same 12-column grid as the normal dashboard, so opening it keeps positions stable. Blocks visibly move to their new position while dragging and can also be dropped in empty grid space. A red minus button at the bottom-left removes a tile from the saved layout. Width snaps to the 12-column grid, height snaps in 10-pixel steps, and the size label is shown at the bottom-right. **Save** persists the mixed device/widget order to ``custom/CONFIG.js``; the Device Editor uses that same visual order. **Cancel** or Escape restores the original layout.
* Topbar: editor, settings, and fullscreen icons now show a description on hover.

* Device Editor: a plus icon has been added to the topbar (left of the layout and settings icons). Clicking it opens a modal that lists all Domoticz devices currently shown in Dashticz, and provides a dropdown to select additional Domoticz devices and add them with the **+** button. Each listed device has a **−** button to remove it from Dashticz; numeric device IDs are now removed correctly instead of being recreated as ``Device IDX`` entries. The removed device is restored to the "Add device" dropdown. Added/remaining devices are saved to ``custom/CONFIG.js`` as named ``blocks[...]`` entries grouped into ``columns[de_colN]`` definitions (up to 4 blocks per column), and ``screens[1]`` is created or extended automatically. Requires PHP to be installed.
* First-run setup: the topbar auto-hide time now defaults to 5 seconds.
* Modern Dark: selector dropdowns now use the same larger touch target and font size as selector buttons.
* Settings: the legacy automatic-device, favorites, hidden-device, room-plan, RGB colorpicker, and colorpicker-scale controls have been removed from the visible settings menu. Their internal defaults remain available for backward compatibility.
* Screens: ``buildDefaultScreens`` is only called when ``auto_positioning`` is enabled, preventing automatic device injection on a fresh install.

Fixes
~~~~~

* Widget Weather: Weather Underground now uses its legacy renderer, while OpenWeather displays a visible loading or missing-API-key state instead of an empty area.
* Device Editor save: ``managedDevices`` is now initialised from **all** devices currently shown in Dashticz (previously it only read from the ``device_editor`` column, so the list was always empty on first use and nothing was written to CONFIG.js).
* Device Editor save: blocks are now written as proper named ``blocks['Name'] = {idx, …}`` entries with grouped columns and a ``screens[1]`` initialisation; previously only a raw IDX array was written to a single ``columns['device_editor']`` entry and ``screens[1]`` was never created on a fresh CONFIG.js.
* Device Editor remove: restoring a removed device back into the ``available[]`` array so that subsequent **+** dropdown rows correctly include it.

v3.20.3 beta (20-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Docker: Migrated to a PHP 8.3-FPM Alpine + Nginx based image, plus a ``docker-compose.yaml`` (contributed by jgaalen)

Code
~~~~~

* Makefile: Rewritten container management targets (contributed by jgaalen)

v3.20.2 beta (20-7-2026)
--------------------------

Code
~~~~~

* Docs: Fixed remaining ``thermostat.js`` reference to ``tempcontrol.js`` (contributed by jgaalen)

v3.20.1 beta (20-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: Added HVC waste collection provider (contributed by me-processware)

v3.20.0 beta (20-7-2026)
--------------------------

Enhancements
~~~~~~~~~~~~

* Merged MadPatrick fork: Bootstrap 5 compatibility, modernized build tooling (webpack/babel/sass upgrades) and a new optional "modern dark" theme

Code
~~~~~

* Build tooling moved to the ``build/`` folder (webpack, babel and prettier configs)

v3.14.1.5 beta (29-4-2025)
--------------------------

Enhancements
~~~~~~~~~~~~

* Improved styling of blinds and thermostat buttons. See :ref:`blindsstyling`

Code
~~~~~

* Thermostat styling: CSS class for thermostat value renamed from ``.state`` to ``.value``
  
v3.14.1.4 beta (18-4-2025)
--------------------------

Fixes
~~~~~~

* Fix for Logitech Media Server

v3.14.1.3 beta (17-4-2025)
--------------------------

Fixes
~~~~~~

* Fix for default icons of a switch block

v3.14.1.2 beta (15-4-2025)
--------------------------

Fixes
~~~~~~

* Some Domoticz blocks related fixes

Code
~~~~~

* First version of autotest
  
v3.14.1.1 beta (1-4-2025)
------------------------

Fixes
~~~~~~

* Fix for Domoticz device types Usage and Scale
* Fix for Domoticz subdevice numbering

v3.14.1 beta (24-3-2025)
------------------------

.. warning :: Some breaking changes. See :ref:`v3_14_1`

Enhancements
~~~~~~~~~~~~

Rework of Domoticz blocks, giving the following new parameters:

* ``values``: To define how (and which) subvalues of a device will be displayed. It's also possible to combine data from several devices in one block.
* ``multi_line``: Set to ``true`` to show all subvalues as multiple lines in one block
* ``single_line``: Set to ``true`` to show all subvalues on one line in one block
* ``showsubtitles``: To show the subtitles of subvalues. Two variants are supported: ``1`` and ``2``
* ``showvalues``: Array to indicate which subvalues of the device will be displayed (starting at ``1``)
* ``scale``: Multiplier for the data value
* ``decimals``: To set the number of decimals for the data value.
* ``unit``: Text to place behind the data value. 

See :ref:`dom_blockparameters` and :ref:`multiplevaluesblock`

v3.14.0 beta (23-2-2025)
------------------------

Beta version, same as v3.14

v3.14 master (23-2-2025)
------------------------

Master version derived from v3.13.1. See below.

V3.13.1 beta (18-2-2025)
---------------------------

Fixes
~~~~~~

* Garbage: Fix for recycleapp (BE)
* Fix for network errors resulting from undefined background image
* Fix: Remove text shadow for blocks without background
* Dials: remove off level for devices with hidden off level
* Weather: language for owm3
* Work-around for broken websocket with Domoticz 2024.7
* Weather: Fix for OWM3. (@meal)

V3.13.0 beta (14-7-2024)
---------------------------

Beta version, derived from v3.13 master

V3.13 master (14-7-2024)
---------------------------

Same as v3.12.1 beta

V3.12.1 beta (14-7-2024)
---------------------------

Enhancements
~~~~~~~~~~~~

* Use device name instead of device idx (undocumented)
* custom.js: New hook which will be called before first Dashticz render: ``beforeFirstRenderHook()``. See :ref:`beforefirstrenderhook`
* Styling: Add correct data-id to a Dashticz block consisting of multiple blocks. See :ref:`grouped_devices`
* World Air Quality Index: Support for the WAQI widgets have been added. See :ref:`waqi`
* publictransport: ``'drgl'`` as new provider, which will give bus and train departures in the Netherlands. See :ref:`drgl`
* Weather: Add support by display the weather forecast elements on multiple rows by setting the ``rows`` block parameter. See :ref:`weatherrows`
* Domoticz device block: Background image can be added. See :ref:`blockbackground`

Fixes
~~~~~~

* P1 block: Fix unit of first value (Nett Energy)
* Graph: Fix graph for switches (for Domoticz 2024.1 and higher)
* Calendar: Fix for showing a calendar block more than once
* Dial: Prevent error when device is not defined
* Dial: Fix updown dial (bug introduced by recent change)

V3.12.0 beta (26-1-2024)
---------------------------

Beta version, derived from v3.12 master

V3.12 Master (26-1-2024)
---------------------------

Roll-up of all v3.11.x beta changes,summarized below:

Enhancements
~~~~~~~~~~~~

* Google Maps: Coordinates for marker and destination can be set via Domoticz device. See :ref:`mapsdyncoord`
* Google Maps: New block parameter ``showmarker`` which can be used to hide the marker by setting this parameter to ``false``
* Dial: For a UpDown Setpoint dial with temperature you can swap the setpoint and temp values by setting the block parameter ``setpointfirst`` to ``true``
* Dial: Support for background images. See :ref:`dialbackground`
* Dial: Combine onoff switch with setpoint device now supported
* Dial: Default min and max values, and the unit (text behind the main value) are derived from the device information
* Dial: You now can set the min and max values for updown setpoint dial 
* Log: Change scroll behavior. While scrolling, window will not automatically scroll to end position when updating.
* Colorpicker: Size of colorpicker popup can now be scaled by setting block parameter ``colorpickerscale``. Type 2 only. See :ref:`colorpicker`
* RGBxx blocks: You can now open colorpicker popup instead of switching on/off by setting ``switchMode`` to ``'color'``.
* Domoticz authentication improvements, including oAuth2 support.


Fixes
~~~~~~

* Graph: Fix for Temp + Baro devices.
* Local build of documentation. See :ref:`documentation`
* Calendar: Fix for error when using eventClasses on empty events
* Dial: Fix for a needle with a custom setpoint: main value was replaced by the needle value
* Settings: Fix for save settings with setting containing a ' character
* Setpoint devices: Fix for new Domoticz setpoint devices (Domoticz build 15555)

V3.11.2 Beta (26-1-2024)
---------------------------

Enhancements
~~~~~~~~~~~~

* Google Maps: Coordinates for marker and destination can be set via Domoticz device. See :ref:`mapsdyncoord`
* Dial: For a UpDown Setpoint dial with temperature you can swap the setpoint and temp values by setting the block parameter ``setpointfirst`` to ``true``
* Dial: Support for background images. See :ref:`dialbackground`
* Dial: Combine onoff switch with setpoint device now supported
* Dial: Default min and max values, and the unit (text behind the main value) are derived from the device information
* Dial: You now can set the min and max values for updown setpoint dial 
* Log: Change scroll behavior. While scrolling, window will not automatically scroll to end position when updating.
* Colorpicker: Size of colorpicker popup can now be scaled by setting block parameter ``colorpickerscale``. Type 2 only. See :ref:`colorpicker`
* RGBxx blocks: You can now open colorpicker popup instead of switching on/off by setting ``switchMode`` to ``'color'``.

Fixes
~~~~~~

* Graph: Fix for Temp + Baro devices.
* Local build of documentation. See :ref:`documentation`
* Calendar: Fix for error when using eventClasses on empty events
* Dial: Fix for a needle with a custom setpoint: main value was replaced by the needle value
* Settings: Fix for save settings with setting containing a ' character

V3.11.1 Beta (23-9-2023)
---------------------------

Enhancements
~~~~~~~~~~~~

* Google Maps: New block parameter ``showmarker`` which can be used to hide the marker by setting this parameter to ``false``
* Domoticz authentication improvements, including oAuth2 support.

Fixes
~~~~~~

* Setpoint devices: Fix for new Domoticz setpoint devices (Domoticz build 15555)

V3.11.0 Beta (8-9-2023)
---------------------------

Beta version, derived from v3.11 master

V3.11 Master (8-9-2023)
---------------------------

Roll-up of all v3.10.x beta changes,summarized below:

Enhancements
~~~~~~~~~~~~

* Google maps: Improved block, optionally showing traffic conditions and a route to a destination. See :ref:`googlemaps` 
* Weather: Add support for OWM free api. See :ref:`customweather`
* Weather: Support for OpenWeatherMap 3 API. See :ref:`owm3`. 
* Garbage: New generic garbage company ``afvalinfo`` covering 98% of The Netherlands. See :ref:`afvalinfo`
* Graph: Add filter option ``'todaytomorrow'`` to filter the graph data of today and tomorrow (to be used for dynamic energy pricing)
* Dial: New subtype options for P1smartmeter and energy devices to show power (Usage) instead of daily energy usage (TodayCounter). See :ref:`dialp1` and :ref:`dialenergy`.
* Garbage: New block parameter ``defaultGarbage`` to define which garbage type to use in case garbage type is unknown. (default: 'kerstboom') 

Fixes
~~~~~

* Domoticz: Login from trusted network without username.
* Domoticz: Support for Domoticz authentication for Domoticz version > 14708 (by mce35)
* Domoticz devices: Fix for ``setBlock`` functionality
* Dial: Update custom dial setpoint after Domoticz device update.
* Dial: Improve handling of Generic/kWh devices (by mce35)
* Dial: Fix for offset parameter wind dial
* Graph: Fix for changes in Domoticz API (2023.1, build 15330)
* Graph: Unit detection for Youless gas meter
* Garbage: Fix recycleapp (BE)
* Garbage: Uden, Maashorst now use DeAfvalApp
* Publictransport: Fix for OVAPI (SSL certificate expired)
* Debug: Fix some iOS 7 and 9 incompatibility

v3.10.9 Beta (8-9-2023)
-------------------------

Fixes
~~~~~~

* Graph: Fix height computation.

v3.10.8 Beta (5-9-2023)
-------------------------

Enhancements
~~~~~~~~~~~~~

* Google maps: Take actual traffic situation into account when computing optimal route.
* Google maps: Show refresh moment for map without route as well
* Selector switch: New block parameter ``sortOrder`` to sort selector switch options. See :ref:`dom_blockparameters` and :ref:`dialselector`
* Weather: Add support for OWM free api. See :ref:`customweather`
* Weather: Autodetect weather forecast provider. No need to set the ``provider`` block parameter anymore.

Fixes
~~~~~~

* Login from trusted network without username.
* Dial: Update custom dial setpoint after Domoticz device update.

v3.10.7 Beta (15-6-2023)
-------------------------

Enhancements
~~~~~~~~~~~~~

* Google maps: Improved block, optionally showing traffic conditions and a route to a destination. See :ref:`googlemaps` 

Fixes
~~~~~~

* Fix loading problems

v3.10.6 Beta (11-6-2023)
-------------------------

Code
~~~~~~

* Bump versions

v3.10.5 Beta (6-6-2023)
-------------------------

Fixes
~~~~~

* Fix for additional changes in Domoticz API (2023.1, build 15327 and up)

v3.10.4 Beta (4-6-2023)
-------------------------

Fixes
~~~~~

* Graph: Fix for changes in Domoticz API (2023.1, build 15330)

v3.10.3 Beta (2-5-2023)
-------------------------

Enhancements
~~~~~~~~~~~~~

* Weather: Support for OpenWeatherMap 3 API. See :ref:`owm3`. 
* Garbage: New generic garbage company ``afvalinfo`` covering 98% of The Netherlands. See :ref:`afvalinfo`

Fixes
~~~~~

* Garbage: Fix recycleapp (BE)

v3.10.2 Beta (19-2-2023)
-------------------------

Enhancements
~~~~~~~~~~~~~

* Graph: Add filter option ``'todaytomorrow'`` to filter the graph data of today and tomorrow (to be used for dynamic energy pricing)
* Dial: New subtype options for P1smartmeter and energy devices to show power (Usage) instead of daily energy usage (TodayCounter). See :ref:`dialp1` and :ref:`dialenergy`.

Fixes
~~~~~

* Dial: Improve handling of Generic/kWh devices (by mce35)
* Debug: Fix some iOS 7 and 9 incompatibility
* Domoticz devices: Fix for ``setBlock`` functionality

v3.10.1 Beta (28-1-2023)
----------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: New block parameter ``defaultGarbage`` to define which garbage type to use in case garbage type is unknown. (default: 'kerstboom') 

See :ref:`v3_10_1` for upgrade instructions in case you see unexpected kerstbomen as garbage collection types.

Fixes
~~~~~

* Dial: Fix for offset parameter wind dial
* Graph: Unit detection for Youless gas meter
* Garbage: Uden, Maashorst now use DeAfvalApp
* Domoticz: Support for Domoticz authentication for Domoticz version > 14708 (by mce35)

Code
~~~~

* Enhanced debug functionality

v3.10.0.1 Beta (27-12-2022)
----------------------------

Fixes
~~~~~

* Publictransport: Fix for OVAPI (SSL certificate expired)

v3.10.0 Beta (27-12-2022)
-------------------------

Beta version derived from v3.10 Master.

V3.10 Master (27-12-2022)
---------------------------

Roll-up of all v3.9.x beta changes,summarized below:

Enhancements
~~~~~~~~~~~~

* Dials: Add colored ring to dimmers in on state (optionally to blinds as well)
* Dials: Add 'delay' parameter to delay the updating of Up/Down percentage blinds.
* Dials: For RGB switches you can open the color selector popup by adding ``switchMode: 'color'`` to the block definition.
* Dials: Needle step size configurable via ``steps`` block parameter.
* Dials: For wind device, add block parameter ``subtype: 'windspeed'`` to use wind speed for needle position instead of wind direction.
* Dials: For wind device, add block parameter ``subtype: 'windgust'`` to use wind gust for needle position instead of wind direction.
* Dials : Up/down dials for Thermostats, Blinds and Dimmers. See :ref:`updowndial`
* Garbage: Added Maashorst (Uden, Volkel, Odiliapeel, Reek, Schaijk en Zeeland)
* Public transport: New block parameter ``show_direction`` to show bus line direction.
* Public transport: New block parameter ``lang`` to set language for search results (for ``irailbe`` only).
* Public Transport: New block parameter ``direction`` to filter on line direction number. See :ref:`publictransport`
* Weather: Added 'knmi' as weather forecast provider.
* Config: New config parameter 'use_hidden' to make use of Domoticz hidden devices as well.

Fixes
~~~~~

* Fixes in autoswipe timeout computations
* Swiper vertical scroll bar
* Selector switches: Hide title in case parameter ``hide_title`` is true, ``title`` is 0 or ``title`` is ''
* Switches: Fix textOn textOff block parameter for some switch types
* Blinds: Fix Open/Close in new Domoticz version (build>14535)
* Dials: Fix scaling parameter for computed values (NettUsage, NettCounterToday, NettCounter) for P1 Smart Meter
* Dials: Slightly bigger default size of dial. Set block parameter ``scale: 0.9`` to reduce the dial size.
* Dials: Fix min, max setpoint setting in CONFIG.js
* Dials: Translations for wind direction.
* Dials: Added translations for the EvoHome controller
* Graph: Remove total counter graph line for some dial types, only in case graphTypes and legend have not been defined.
* Calendar: Fix for opening Outlook calendar files
* Calendar: Fix styling for some events with customized styling
* Calendar: Fix start date (method:2, layout:2)
* Garbage: Fix for Circulus-Berkel
* Garbage: Fix for Purmerend, Suez, Blink
* Garbage: Uden (new URL, same as Maashorst)
* Public transport: Translations


V3.9.8 Beta (27-12-2022)
---------------------------

Enhancements
~~~~~~~~~~~~

* Dials: Add colored ring to dimmers in on state (optionally to blinds as well)

Fixes
~~~~~

* Dials: Fix scaling parameter for computed values (NettUsage, NettCounterToday, NettCounter) for P1 Smart Meter

V3.9.7 Beta (8-12-2022)
---------------------------

Enhancements
~~~~~~~~~~~~

* Weather: Added 'knmi' as weather forecast provider.
* Dials: Add 'delay' parameter to delay the updating of Up/Down percentage blinds.
* COnfig: New config parameter 'use_hidden' to make use of Domoticz hidden devices as well.

Fixes
~~~~~

* Fix for opening Outlook calendar files

V3.9.6.1 Beta (28-10-2022)
---------------------------

Fixes
~~~~~

* Fixed incompatibility for IOS introduced with v3.9.6

V3.9.6 Beta (18-10-2022)
-------------------------

Fixes
~~~~~

* Selector switches: Hide title in case parameter ``hide_title`` is true, ``title`` is 0 or ``title`` is ''
* Calendar: Fix start date (method:2, layout:2)
* Switches: Fix textOn textOff block parameter for some switch types
* Fixes in autoswipe timeout computations
* Dial: Slightly bigger default size of dial. Set block parameter ``scale: 0.9`` to reduce the dial size.
* Graph: Remove total counter graph line for some dial types, only in case graphTypes and legend have not been defined.
* Garbage: Fix for Circulus-Berkel
* Blinds: Fix Open/Close in new Domoticz version (build>14535)

V3.9.5 Beta (25-3-2022)
-----------------------

Enhancements
~~~~~~~~~~~~

* Dials: Translations for wind direction.

Fixes
~~~~~

* Rollback upgrade development environment to maintain iOS10 compatibility.

V3.9.4 Beta (19-3-2022)
-----------------------

Enhancements
~~~~~~~~~~~~

* Dials: For RGB switches you can open the color selector popup by adding ``switchMode: 'color'`` to the block definition.
* Dials: Added translations for the EvoHome controller

Fixes
~~~~~~

* Swiper vertical scroll bar
* Calendar: Fix styling for some events with customized styling
* Rova: Re-enabled old API, since new API was not working on all systems (SSL related)

Code
~~~~

* [Prelim] Calendar: New ical module to parse calendar data. Should solve most calendar issues, especially related to recurring events. Select via ``method:2``

V3.9.3 Beta (9-3-2022)
-----------------------

Enhancements
~~~~~~~~~~~~

* Dial: Needle step size configurable via ``steps`` block parameter.
* Dial: For wind device, add block parameter ``subtype: 'windspeed'`` to use wind speed for needle position instead of wind direction.
* Dial: For wind device, add block parameter ``subtype: 'windgust'`` to use wind gust for needle position instead of wind direction.
* Dial: Up/down dials for Thermostats, Blinds and Dimmers. See :ref:`updowndial`
* Public Transport: New block parameter ``direction`` to filter on line direction number. See :ref:`publictransport`

Fixes
~~~~~~

* Public transport: Translations
* Dial: Fix min, max setpoint setting in CONFIG.js
* Garbage: Fix for Purmerend, Suez, Blink

V3.9.2 Beta (27-2-2022)
-----------------------

Enhancements
~~~~~~~~~~~~

* Garbage: Added Maashorst (Uden, Volkel, Odiliapeel, Reek, Schaijk en Zeeland)
* Public transport: New block parameter ``show_direction`` to show bus line direction.
* Public transport: New block parameter ``lang`` to set language for search results (for ``irailbe`` only).

Fixes
~~~~~~

* Garbage: Uden (new URL, same as Maashorst)
* Garbage: Rova (for some zipcodes)

Code
~~~~

* Switched to worker-timers, to improve background refresh
* Prevent caching index.html
* Update caching behavior

V3.9.1 Beta (13-2-2022)
-----------------------

Code
~~~~

* Update development dependencies
* Update FontAwesome, Popper, IRO and Swiper to latest versions

V3.9.0 Beta (10-2-2022)
-----------------------

Beta version derived from v3.9 Master

v3.9 Master (10-2-2022)
------------------------

Enhancements
~~~~~~~~~~~~

* Trafficinfo: Add block parameters ``showempty`` and ``showemptyroads`` to control what to show in case of no announcements. See :ref:`trafficinfo`

Fixes
~~~~~~

* Trafficinfo: Bug fixes (wrong road name if no announcements)
* P1 Smart Meter: Display NettUsage as default value (=Usage-Delivery)


v3.8.11 Beta (28-1-2022)
------------------------

.. note:: Some changes in dial styling, especially dial font sizes.

Enhancements
~~~~~~~~~~~~

* New block type 'Door Lock Inverted'
* Dial: Selector menu can show title. See :ref:`dialselector`

v3.8.10 Beta (23-1-2022)
------------------------

.. note:: Public Transport changed. See :ref:`publictransport`.
.. note:: Dial ring styling changed. See :ref:`v389`.

Enhancements
~~~~~~~~~~~~

* Special blocks: Add class ``empty`` in case the special block is empty. Applicable to alarmmeldingen, calendar, traffic, trafficinfo and train.
* Graph: Improvement in customized axes styling. See :ref:`xyaxesstyling`
* Publictransport: Added 'ovapi' and 'treinen' as providers.  Removed 9292, mobiliteit and VVS (non working APIs). Changed rendering. For all changes see :ref:`publictransport`.

Fixes
~~~~~~

* Changed dial styling for ring and blinds text. See :ref:`dialstyling`.
* Dial: P1 decimals configurable via decimals block parameter.
* Calendar: Fixed issues with some recurring events in ical modules (PHP5 as well as PHP7 version)

v3.8.9 Beta (23-12-2021)
------------------------

.. note:: Your images in buttons now might scale to the full block width. This is a side effect of the fix of the moon scaling. Reduce the block width in case your image is too wide.

Enhancements
~~~~~~~~~~~~

* Dial: Support for blinds. See :ref:`dialblinds`
* Frame: Add block parameters ``scaletofit`` and ``aspectratio`` to automatically scale the frame content to the block width. See :ref:`Frames`

Fixes
~~~~~~

* Moon image scaling


v3.8.8 Beta (17-12-2021)
------------------------

Fixes
~~~~~~

* Garbage: Recycleapp (BE)
* Dials: Fix for so called splitdial with 0 not at top. For instance: min=-10 and max=50
 
v3.8.7 Beta (5-12-2021)
------------------------

.. note:: Weather icons changed. See :ref:`weathericons`
.. note:: CSS styling for calendar events changed. See :ref:`eventClasses`   

Enhancements
~~~~~~~~~~~~

* Calendar: eventClasses block parameter to customize styling based on event description. See :ref:`eventClasses`
* Weather: New block parameter ``icons`` to set weather icons to 'line', 'linestatic', 'fill','static' or 'meteo'. See :ref:`weathericons`
* New upgrade scripts in Makefile (Documentation to be updated)
  
Fixes
~~~~~~

* Garbage: Recycleapp (BE), Avalex, Suez 


v3.8.6 Beta (22-10-2021)
------------------------

Enhancements
~~~~~~~~~~~~

* Graphs: Now you can also display switch information in your graphs

Fixes
~~~~~~

* Graphs: Fixes in y-axes labeling

v3.8.5 Beta (15-10-2021)
------------------------

Fixes
~~~~~~

* Make door lock switchable. 
* Garbage: Venlo (new website)
* Custom function getStatus will be called twice. Second time after block creation (fixed)
* Weather block: fixed rain rate in hourly forecast
* Graph: Fix for displaying energy values, for instance for P1 devices

v3.8.4 Beta (13-8-2021)
-----------------------

Fixes
~~~~~~

* Calendar fixes (recurring events, multiple events on same moment)
* ANWB traffic info: Change API v1 to v2
* Garbage: Fix for Rova

v3.8.3 Beta (29-5-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Weather: Added layout 4 option. See :ref:`customweather`
* Weather: Colored icons (animated weather icons only). See :ref:`customweather` 
* Weather: show/hide wind dial and wind info, Wind as Beaufort, show/hide first forecast card

Fixes
~~~~~~

* Weather: Changed styling of current weather block (center the three parts)
* Weather: Fix styling of forecast block for white Dashticz template
* Merged changes from master v3.8.0.1 and v3.8.0.2

Code
~~~~~

* Bump Swiper.js from 5.4.5 to 6.4.2

v3.8.2 Beta (24-4-2021)
-----------------------

.. note:: Breaking changes: New weather block.

Enhancements
~~~~~~~~~~~~

* Rewrite of the weather block. See :ref:`customweather`.
  

v3.8.1 Beta (14-4-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Change in auto swipe behavior. See :ref:`autoswipe`.

v3.8.0 Beta (10-4-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* Auto slide timer configurable per screen via screen parameter ``auto_slide_page``

* Fix for columns without block parameter
* Fix for icon size for special blocks on screen width < 975 pixels

v3.8.0.2 Master (14-5-2021)
---------------------------

Fixes
~~~~~

* Fix potential error in startup behavior

v3.8.0.1 Master (26-4-2021)
---------------------------

Fixes
~~~~~~

* Standby: Prevent click to activate a Dashticz block while in standby

v3.8 Master (9-4-2021)
----------------------

Master version derived from v3.7.7 Beta.

If your current Dashticz version is lower than v3.7.2 then before upgrading make a copy of custom/custom.css and custom/custom.js first!

See the upgrade instructions at v3.7.2 below.

v3.7.7 Beta (8-4-2021)
------------------------


Fixes
~~~~~~

* Garbage: Repaired Area, EDG, Groningen, Meerlanden

Enhancements
~~~~~~~~~~~~

* P1 Smart Meter: Computed fields 'NettUsage', 'NettCounterToday' and 'NettCounter' which can be used as value in dials.
* Garbage: Set block parameter 'ignoressl' to true to disable https SSL checks.

Code
~~~~

* Update of the external npm modules
  
v3.7.6 Beta (12-3-2021)
------------------------

Enhancements
~~~~~~~~~~~~

.. note:: Breaking changes. See :ref:`v376` for update instuctions

* Several dial enhancements. See :ref:`dialvalues`
* Device hook: Function in custom.js which is called on every device update. See :ref:`devicehook`

Fixes
~~~~~~

* Blinds: Support textOn and textOff block parameters

v3.7.5 Beta (28-2-2021)
-----------------------

Enhancements
~~~~~~~~~~~~

* OWM widgets. See :ref:`owmwidgets`

Fixes
~~~~~~

* Dials: Fix dimmer decimals
* Dials: Improved formatting
* Dials: Improved error handling
* Dials: Support setpoint for default dial

v3.7.4 Beta (20-2-2021)
-----------------------

Fixes
~~~~~~

* Fix for Spotify block (removed the additional dummy block)
* Spotify: Improved playlist popup layout
* Improved error handling in PHP modules for calendar and garbage
* Dials: Resize disabled (to prevent size changes after first rendering)
* Garbage: block with company: 'ical' will now be detected correctly as Garbage block instead of Calendar
* Garbage: recycleapp.be
* Colorpicker: Add support for Hue RGBWW device by adding mode:1 block parameter

Enhancements
~~~~~~~~~~~~

* Dial: block parameter ``iconSwitch`` to set the fontawesome icon to use for an on/off switch
* Dials: Support added for text devices and for dials without device. 
* Dials: Text devices will be recognized correctly in default dial as well, meaning you can combine several text devices into one dial.
* Dials: Set number of decimals with ``decimals`` parameter
* Garbage will be sorted in the same order as ``garbage`` block parameter (or ``config['garbage']``)

v3.7.3 beta (24-1-2021)
-----------------------

.. note :: Make a backup of CONFIG.js, custom.css and custom.js

Code
~~~~

* Redesign internal block framework
* Removed old calendar block 'icalendar' and calendarurl config setting

Enhancements
~~~~~~~~~~~~

* Calendar: (New calendar block, layout 0 and 1 only) The class 'agenda-empty' is applied to the calendar block in case there are no appointments.
* Battery Level indicator for Domoticz devices. Battery icon will be displayed when the battery level is below ``batteryThreshold``. See :ref:`batterylevel`. 
* TV Guide: Block parameter ``layout`` has been added, to display the TV guide with/without channel name. See :ref:`tvguide`
* Graph: Block parameter ``labels`` has been added, to rename the device names that are used in groupByDevice graphs.

Fixes
~~~~~~

* Bugfix security panel lock screen default setting
* Show last update time when last_update is set as block parameter
* Graph: Fix for block parameter aggregate as array
* Calendar: Update icalparser for PHP8 compatibility


3.7.2 Beta (27-12-2020)
-----------------------

.. note:: Update instructions.

I've removed custom/custom.css and custom/custom.js from the Dashticz repository,  because these are user configuration files, and should not be part of the Dashticz repository.

However, that means this update cannot be installed with ``git pull`` directly, because then git will report an error if you have modified one or both files.

To solve this, first make a backup of these two files::

  mv custom/custom.js custom/custom.js.bak
  mv custom/custom.css custom/custom.css.bak

In case you use the custom_2 folder, repeat these steps for that folder::

  mv custom_2/custom.js custom_2/custom.js.bak
  mv custom_2/custom.css custom_2/custom.css.bak

Then update to the latest version as usual::

  git pull

And restore your backups::

  mv custom/custom.js.bak custom/custom.js
  mv custom/custom.css.bak custom/custom.css

And for the custom_2 folder::

  mv custom_2/custom.js.bak custom_2/custom.js
  mv custom_2/custom.css.bak custom_2/custom.css

You only have to do this once: Next updates can be installed with a normal 'git pull'


Enhancements
~~~~~~~~~~~~

* Calendar: New block parameter ``emptytext`` to define the text to show where there are no calendar appointments. Only works for the new calendar block. See :ref:'newcalendar'
* Custom graph: aggregate parameter can be an array to specify different aggregation methods per data element. See :ref:`groupBy`
* Graph: New parameters ``axisRight`` to show the first Y axis on the right (default is ``false``), and ``axisAlternating`` to show Y axes alternating left/right (default: ``true``).
* Support for device (sub)type Managed Counter
* Flipclock: New block parameters showSeconds (true or false) and clockFace (12 or 24)
* Security panel: New block parameters ( ``decorate``, ``headerText``, ``footerText``, ``scale``). See :ref:`secpanel`

Fixes
~~~~~~

* Graph: Fix for data acquistion day graph gas device.
* Colorpicker: Some fixes in warm white/cold white color setting.
* Improved styling of modal popup windows.


3.7.1 Beta (19-12-2020)
-----------------------

Enhancements
~~~~~~~~~~~~

* Graph: Enable graphs for Lux device type
* Popup window: Add ``newwindow: 5`` to open an url as image instead of iframe (doc to be updated)
* Clock: New Hayman clock. Add block 'haymanclock' to a column, or use ``type: 'haymanclock'`` in your block definition.
* Clock: New basicclock, which is the same as the normal clock, but then responsive. (scales with the width)
* Clock parameters: haymanclock, flipclock, stationclock and basicclock all support the block parameters ``size`` to set the width of the clock and the parameter ``scale`` to scale down the width with a relative factor (``scale: 0.6``)

3.7.0 Beta (13-12-2020)
-----------------------

Code
~~~~~

* NPM update, code formatting

3.7 Master (13-12-2020)
------------------------

Master version derived from 3.6.9 Beta

3.6.9 Beta (10-12-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: New garbage block parameter ``maxdays`` to set the number of days to show the garbage collection info (2 means today and tomorrow) 
* Stationclock: New block parameter ``size`` to set the size of the clock. See :ref:`stationclock`
* Stationclock: New configuration parameters. See :ref:`stationclock`

Fixes
~~~~~~

* Garbage: Fix DeAfvalApp (https instead of http)
* Garbage: Add avri as garbage company
* Garbage: add layout as block parameter. Use ``layout: 0`` to format the garbage rows as one string and ``layout: 1`` to use table layout.
* Garbage: Fix Afvalwijzer 2021 data
* Prevent :hover effect for touch devices

3.6.8 Beta (27-11-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Garbage: New providers Suez (Arnhem), Blink (Asten, Deurne, Gemert-Bakel, Heeze-Leende, Helmond, Laarbeek, Nuenen, Someren), Purmerend
* Garbage: New provider afvalstoffendienst
* Garbage: New provider GAD
* Colorpicker: Add support for WW dimmers (Philips Hue)
* Chart: For custom graphs you can define the icon to use for each graph button. See :ref:`custom_graph`
* Timegraph: New special block to define a moving time graph. See :ref:`timegraph`
* Garbage: Additional styling. See :ref:`garbage_styling`
* Garbage: New block parameter ``date_separator`` to configure the text between garbage type and date
* Garbage: Format as table. See :ref:`garbage_styling`

Fixes
~~~~~~

* Calendar: Add 'method:0' to your calendar block definition in case you experience issues with recurring events. Only works for the new calendar block. See :ref:'newcalendar'
* Fix for X10 security motion device.

3.6.7 Beta (4-11-2020)
------------------------

Update of the Garbage module. See :ref:`garbage_upgrade` for upgrade information.

3.6.6 Beta (30-10-2020)
------------------------

Enhancements
~~~~~~~~~~~~

* Dashticz URL parameters. See :ref:`urlparameters`
* Dials: Set the block parameter ``animation`` to ``true`` or ``false`` to enable/disable dial animations.
* Add ``timeout`` CSS class to Domoticz devices in the timeout state. See :ref:`domoticzStyling`
 
Fixes
~~~~~~~

* Garbage: Fix for Mijnafvalwijzer on iOS
* Disable Dashticz refresh if `config['dashticz_refresh']` is 0
* Bugfix initialization code

3.6.5 Beta (22-10-2020)
------------------------

Fixes
~~~~~~~

* Button: ``newwindow: 3`` handling is fixed.
* Scenes: Switch always on
* Switched to an alternative server to provide the covid-19 data

Enhancements
~~~~~~~~~~~~

* Button, special blocks: Initiate the ``url`` parameter as POST request by setting ``newwindow: 4``
* Add support for Domoticz x10 security sensor
* Dial: Combine data from several devices. See :ref:'genericdial'

3.6.4 Beta (6-10-2020)
----------------------

Fixes
~~~~~

* PV Output Temp device.
  
Update notes
~~~~~~~~~~~~

* The icon for PV Output blocks are not automatically set to 'fas fa-sun' anymore. You still can do this manually in a block definition. In a future version I'll improve the default settings for Domoticz device types.

3.6.3 Beta
-----------

Enhancements
~~~~~~~~~~~~

* Set config setting ``security_panel_lock`` to ``2`` to activate security panel lock in 'Armed Home' mode as well.
* Dial type now enabled for most devices. See :ref:'genericdial'

Fixes
~~~~~

* Remove scroll bar of the modal security panel (security panel lock)
* New config setting ``use_cors`` to enable CORS proxy for OWM. Set to ``true`` on Android 4.4.2.
* Garbage: recycleapp

3.6.2 Beta
----------

Fixes
~~~~~

* Fix for graph issues in 3.6

3.6.1 Beta
----------

Enhancements
~~~~~~~~~~~~

* Custom HTML block. See :ref:`customhtml`

3.6.0 Beta
----------
Beta version, same as 3.6 master.

Code
~~~~~

* Update of the external js modules

3.6 Master
----------

Enhancements
~~~~~~~~~~~~

* New Dashticz config parameter 'swiper_touch_move' to disable/enable swiping the screen on touch
* Graph: The 'today' button now shows the full day data. The range 'day'still exists as well, which still can be used in custom graphs.
* Add support for device with subtype 'Current'
* Popup graphs enabled by default for most block types. To disable a popup graph, add ``graph: false`` to the block definition.

Code
~~~~~

* Update FontAwesome to 5.14.0

Fixes
~~~~~

  * Camera block 
  * Garbage: Ophaalkalender (BE) doesn't work anymore. It has been replaced by recycleapp.
  * Security panel home symbol.
  * Garbage: Meerlanden switched to ximmio as garbage data provider
  * Garbage: Fixed method to retrieve data from mijnafvalwijzer
  * Fixed use_favorites config setting. Changed default to false, meaning all devices will be available for Dashticz.
  * Remove CORS for OWM data

3.5.2 Beta
-----------

Enhancements
~~~~~~~~~~~~

* New colorpicker for RGB devices, including support for whites. The ``no_rgb`` setting is absolete. See :ref:`colorpicker`

Fixes
~~~~~

* Fix for Omrin garbage provider
* Fix for Venlo garbage provider

Code
~~~~~

* Update to jquery 3.5.1

3.5.1 Beta
-----------

Enhancements
  * Domoticz textblocks, traffic, trafficinfo, longfonds and public transport now support the block parameters ``url``, ``newwindow``, ``forcerefresh`` and ``password`` giving it the same behavior as a button if you want to open an url on click.

Fixes
  * Change traffic info provider for traffic block

3.5.0 Beta
-----------

Same as 3.5 Master

3.5 Master
--------------

New master release derived from 3.4.10 beta.

See the release notes for the beta releases below for all changes.

3.4.10 (Beta) (7-6-2020)
---------------------------

Enhancements
  * Japanese language support (preliminary)
  * Improved Camera block . See :ref:`cameras`

Fixes
  * Stop called twice for Blinds stop button
  * Improve Dial representation on Android devices
  * Improved graph groupBy function

3.4.9.1 (Beta) (26-5-2020)
--------------------------
Fixes
  * Several bug fixes

3.4.9 (Beta) (25-5-2020)
------------------------

Fixes
  * Improved number formatting for graph header and tooltip. See :ref:`graphNumberFormat`
  * Block definition with custom keys: consistency in block selection for subdevices, CSS class application and function names in custom.js. This may result in a breaking change. See :ref:`v349`

3.4.8 (Beta) (20-5-2020)
------------------------

Enhancements
  * Improved trafficinfo layout

Fixes
  * IE11 support
  * iOS9 support

Code
  * Standardized formatting of source code
  * Removed eslint warnings (first batch)  

3.4.7 (Beta) (18-5-2020)
------------------------

Enhancements
  * Support for Dials. See :ref:`dial`

Fixes
  * Refresh of graph while in standby

3.4.6 (Beta) (13-5-2020)
------------------------

Enhancements
  * Enable graphs for Voltage and Distance devices
  * Parameter ``timeformat`` to configure time format for 'alarmmeldingen'. See :ref:`customalarmmeldingen`
  * TV guide (Dutch: tvgids) made clickable
  * More options to customize the graph header. See :ref:`customheader`

Fixes
  * Fix for ANWB Traffic Info (new API)
  * Fix for recurring calendar events (older than 3 year, without end date)

3.4.5 (Beta) (23-4-2020)
------------------------

Fixes
  * Garbage: Cure moved to 'mijnafvalwijzer'
  * Synchronization Domoticz security panel state
  * Bug fix popup chart refresh

3.4.4 (Beta) (18-4-2020)
-------------------------

Enhancements
  * Add 'Current' Domoticz device type.
  * Improved security panel. See <todo>

Fixes
  * Fix for refresh of Scenes/Groups and some temperature sensors

3.4.3 (Beta) (9-4-2020)
-----------------------

Enhancements
  * New calendar layout. See :ref:'newcalendar'

Fixes
  * Group/scene status refresh
  * Unit parameter, which can be used for formatting the value of some Domoticz devices. See :ref:`formatting`

3.4.2 (Beta) (3-4-2020)
------------------------

Enhancements
  * Add dewpoint block for TempHumBar devices
  * Corona block type
  * Custom header for graph blocks. See :ref:`customheader`
  * Camera block. See :ref:`cameras`

Fixes
  * Calendar recurring events (experimental)

Internal
  * Refactoring blocktypes

3.4.1 (Beta)
---------------

.. note:: Breaking changes. See :ref:`v341` for update instuctions

Redesign
  * Domoticz blocks: inline blocks. Use ``idx`` as parameter in your block definition to indicate the block is a domoticz device. See :ref:`v341`

Enhancements
  * Support for showing a graph more than once on the dashboard.
  * Support for RGBWZ devices
  * Omrin garbage company
  * Calendar: Optionally display start time only by setting ``startonly`` block parameter
  * New block parameter ``password`` to password protect switches, buttons, thermostats, sliders.
  * Filter parameter for the news block. Define as block parameter. Example:
    
  ::  

      blocks['my_news'] {
        feed: 'http://www.nu.nl/rss/Algemeen',
        filter : '5 items',  // to only show the 5 latest news items, or:
        filter: '2 days',    // to only show news items of the last 2 days, or:
        filter: '1 month',   // to only show news items from last month
      }

  * New special block: alarmmeldingen (Dutch). See :ref:`customalarmmeldingen`
  * Update other blocks from ``custom.js`` functions by calling ``Dashticz.setBlock``. See :ref:`setblock`

Fixes
  * Requests to Domoticz will not be send via a websocket connection (not reliable)
  * Fix for Evo devices
  * Improved the height adjustment of a news block with inline images
  * Fix for updating devices via ``getStatus_idx`` in ``custom.js``
  * Fix for initial update of block defined by ``getBlock_<idx>()`` in ``custom.js``

3.4.0 Beta (8-2-2020)
---------------------

Enhancements
  * Websocket interface for Domoticz version > 4.11000 to receive instant device updates. See :ref:`websocket`
  * The News block will show the inline images. By setting the news block parameter 'showimages: false' the inline images will be hidden.  See :ref:`newsconfig`
  * graph and multigraph have been combined into the same graph block. See :ref:`dom_graphs`.

In case you update from 3.3.5 beta: The parameter ``multigraphTypes`` has been replaced by ``graphTypes``

Optimizations
  * Dashticz will only receive the updates for devices that changed since the previous update. This will increase responsiveness. In the previous version Dashticz received all device info at every update (default 5 second cycle).



3.3.5 Beta (28-1-2020)
----------------------

Fixes
  * Garbage Uden
  * Restored PHP5 compatible ical library next to the PHP7 library.
    The PHP5 library is selected automatically on systems with PHP version lower than 7.1.
    The PHP5 library doesn't show yearly recurring events correctly.

3.3.4 Beta (22-1-2020)
----------------------

Enhancements:
  * Multigraph functionality. See :ref:`dom_graphs`.

3.3.3.1 Master (4-2-2020)
-------------------------

Fixes
  * Garbage Uden
  * Reenabled PHP5 calendar module

3.3.3 Master (22-1-2020)
------------------------

Fixes
  * New PHP ical library to solve issue with recurring events. Note: PHP 7.1 or higher is required.

3.3.2 Master (18-1-2020)
------------------------
Master version derived from 3.3.1 beta.

If you are upgrading from a previous master version please read :ref:`v320`.

Additional fixes
  * Fix standby screen in case of single screen.

3.3.1 Beta (13-1-2020)
----------------------

Enhancements
  * Complete dimmer block is clickable (not just the icon)

Fixes
  * Multiple stationclocks
  * Background fill complete screen in case of single screen
  * Add dimmer for RGBWWZ devices
  * TwenteMilieu garbage collection
  * Bar-afvalbeheer garbage collection (for Barendrecht, Rhoon). Use 'barafvalbeheer' as garbage_company.

3.3.0 Beta (5-1-2020)
---------------------

Enhancements
  * Evohome support. See :ref:`Evohome`

Fixes
  * Improved error handling
  * Improved handling of chart data
  * Almere garbage
  * Login screen background image

3.2.1 (10-12-2019)
------------------

Enhancements
  * Addition of special block 'secpanel' which adds a Domoticz like security panel. See :ref:`secpanel`

Fixes
  * Swiper transition effect
  * Update to latest jQuery version to solve security alert

3.2.0
-----------

.. warning :: Breaking changes

Main change:
  * Standardization of the html template for special blocks. See :ref:`v320`

Other changes:
  * Enable swiper for mobile devices
  * Update to swiper 5.2.0. Added the config parameters ``vertical_scroll`` and ``enable_swiper`` to control swiping and scrolling behavior. See :ref:`ConfigParams`
  * Bundle most external dependencies (webpack, babel, package.json)

Fixes
  * Calendar: Improved handling for recurring events
  * Blinds: Fix for custom icons

3.1.2 (26-10-2019)
------------------

Enhancements
  * Improved calendar layout for full day events. Added timezone adjust parameters.

Fixes
  * Fix for loading Dashticz without external network
  * Load Sonarr images via CORS proxy

3.1.1 (15-10-2019)
------------------

Enhancements
  * Show calendar with table formatting by setting blockparameter ``calFormat:1``. See :ref:'calTable'
  * Session Time Out option
  
Fixes
  * Graph for barometer device
  * Almere garbage provider
  * Wind speed unit interpretation in case of non default Domoticz setting
  * Protect parameter for dimmers.
  * Removal of ES6 dependency (introduced by the graph update)

Upgrading from earlier versions:

buttons:
  Use the btnimage parameter instead of the image parameter.
  The parameter ``isimage`` is not used anymore.

3.1.0 (18-9-2019)
-----------------

Enhancements
  * New config setting ``'start_page'`` to set Dashticz start page number
  * New parameter ``'scrollbars'`` to set scrollbars in frame. See :ref:`Frames`
  * New graph module. It's not completely backwards compatible. Especialy styling will be different. See :ref:`dom_graphs`

Fixes
  * Faster initial display of the Dashticz dashboard.

3.0.6 (28-8-2019)
-----------------
Enhancements
  * OpenWeatherMap module: support for using the city id as city name
  * Icon/image options for blocktitles

Fixes
  * Docker PHP timezone
  * News update in standby
  * Robustness install script and makefile
  * Auto restart docker container after reboot
  * Documentation updates (Thanks to HansieNL)

3.0.5 (4-8-2019)
------------------
  * Update of documentation.
  * Improvements in the automatic installation script.

3.0.4 (1-8-2019)
------------------
Main changes:
  * New Domoticz Github location: https://github.com/Dashticz/dashticz
  * New graph options to set the graph appearance. See :ref:`dom_graphs`.

Fixes:
  * OWM Weather layout
  
3.0.3 (20-7-2019)
-----------------
Main changes:
  * Fixed the broken Spotify module
  * Improved layout (icon size for certain screen widths)

3.0.2 (19-7-2019)
-----------------
Main changes:
  * New block parameters (textOn, textOff, imageOn, imageOff, iconOn, iconOff) to control the display of block text, icons and images depending on the device state.

3.0.1 (25-6-2019)
-----------------

Main changes (thanks to Steven):
  * New special block: Traffic information based on providers, ANWB is the first one. See :ref:`trafficinfo`.
  * Additional filter options for the public transport module. See :ref:`publictransport`. 

Fixes:
  * Update of the installation script. See :ref:`AutomaticInstall`

3.0.0 (13-6-2019)
-----------------
This is the first Dashticz v3 release.

Main change: New Domoticz Github location: https://github.com/dashticzv3/dashticz_v3

New functionality:

* Change in ``forcerefresh`` parameter of a button to support cheap Chinese webcams.
* Support for TempBaro device
* Sizing the y-axis of the graph to relevant data
* Adding possibility to draw graph data for Qubino ZMNHTDx Smart meter
* Add bar graph type option.
* Streamplayer: Add class when in playing state to enable styling via custom.css
* Radio streaming image (radio-streaming.png)

Fixes:

* Make index2.html consistent with index.html
* Streamplayer error handling

2.5.9 (11-3-2019)
------------------
New functionality:

* Caching prevention mechanism also applied to button popup frame (``forcerefresh`` parameter)
* Added Air Quality as graph type (and CO2 as graph property)
* Support of RGB dimmers (RGBW and RGBWW dimmers were supported already)
* Added confirmation option for switches (See ``confirmation`` parameter in Domoticz blocks)

Small fix:

* TwenteMilieu garbage pickup dates


2.5.8 (8-3-2019)
----------------
Small fixes:

* Prevent caching of the version info.

2.5.6 and 2.5.7
---------------

* Graph improvements. See :ref:`dom_graphs` for usage description. 

  * Selection of values you want to show in a graph via the graphTypes parameter. See :ref:`dom_blockparameters`.
  * Support for the ``title`` and ``width`` parameter in a graph block.

* Additional mechanism to prevent caching of images in a button via the ``forcerefresh`` parameter. See :ref:`forcerefresh`.

* Change background color for active 'slide' button. See :ref:`slidebutton`.

* Flash on change. See  :ref:`Flashonchange`.
  
  If you have defined the flash parameter for a device-block, then the block will flash on change.
  The formatting of the flash can be modified via the class ``.blockchange`` in your ``custom.css``.

  The parameter ``config['blink_color']`` is (temporarily?) not used anymore.
  (reason: the apply background mechanism didn't work for non-touch devices)

* Improved layout of blinds
* Update of Romanian language
* Update to FontAwesome 5.7.2
* Fix for some RFX meters (incl. water meter)
