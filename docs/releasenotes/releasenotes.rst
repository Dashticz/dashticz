Release Notes
=============

For Dashticz's **beta** version Release Notes go to: https://dashticz.readthedocs.io/en/beta/releasenotes/index.html

For Dashticz's **master** version Release Notes go to: https://dashticz.readthedocs.io/en/master/releasenotes/index.html


v3.45.8 beta (26-8-2026)
-------------------------

* **Enhancements**

- Added repeatable iFrame, Calendar, Public transport, Timegraph and
  TV Guide (XMLTV) blocks (Screen Editor's Widgets catalog, each card
  now behaving like LMS's own): each can now be placed any number of
  times on a dashboard, with fully independent settings per instance -
  previously each was a singleton in the catalog (one fixed widget_*
  block, one shared config for every added instance), addressing
  `issue #201 <https://github.com/MadPatrick/dashticz/issues/201>`_'s
  request for per-instance widget settings similar to LMS.

- Added M3U/M3U8 playlist support to the StreamPlayer widget. A
  playlist placed at ``custom/radio_playlist.m3u`` (``#EXTINF`` tags
  ``tvg-name``/``tvg-logo``/``tvg-id``/``group-title``, followed by
  the stream URL) is loaded automatically when present and valid,
  with a station-selection popup grouped by ``group-title`` and
  sorted; the widget falls back to the existing configured track list
  when the file is missing, empty or invalid. When a station's
  ``tvg-id`` matches a locally stored logo in ``img/custom/radio/``,
  that local image is preferred over the playlist's own remote
  ``tvg-logo`` URL.

* **Fixes**

- Fixed the local-logo matching being completely inert as originally
  submitted: the widget called ``vendor/dashticz/streamplayer.php``
  to resolve a station's ``tvg-id`` to a local filename, but that
  endpoint didn't exist, so the lookup always 404'd and silently fell
  back to no local logos at all. Added it, following the existing
  ``listcustomicons.php``/``listbackgrounds.php`` pattern (same-origin
  GET only, ``scandir()``'d against a real path, image-extension
  allowlist, symlinks rejected).

- Async playlist/logo loading is now guarded by a per-instance
  generation token so a rerender never duplicates event handlers or
  leaves stale UI state behind.

- Fixed Automation trigger comparisons (greater than/less than/etc.)
  failing on Domoticz values that glue a unit straight onto the
  number with no space (e.g. a pressure sensor's Data/sValue reading
  "1,8Bar") or mix a thousands separator with a decimal comma (e.g.
  "1.020,5 hPa"). ``numericValue()`` (js/devicerules.js) now extracts
  the numeric run from the value first and, when both '.' and ','
  appear, treats whichever comes last as the decimal separator,
  instead of naively replacing only the first comma - which
  previously truncated a value like "1.020,5" at the thousands
  separator.

- Fixed the Automation editor's "Add CSS to current device" and "Put
  text in another device" checkboxes rendering as small native
  checkboxes instead of matching the size of the Condition/Style
  dropdowns and the popup's own top-level Automation switch - both
  now use the existing ``.de-switch`` class (css/creative.css)
  already standard for every other Device Config switch, instead of
  a plain unstyled checkbox.

* **Code**

- Every one of the five is implemented by extending the same
  managedSpecials mechanism already used for Group/HTML Block/LMS
  rather than the catalog's singleton selectedWidgets/blockKey
  pattern, each with its own quick-add popup
  (js/deviceeditor.js). iFrame/Calendar/Public transport/TV Guide are
  recognized by their own component's existing field-shape dispatch
  (frameurl/icalurl/station-or-tpc/xmltvurl, no explicit type,
  mirroring HTML Block's htmlfile); Timegraph, whose component
  requires an explicit type:'timegraph', is recognized and written the
  same way Group/LMS already are. Every existing singleton catalog
  widget is untouched and keeps working exactly as before - Calendar's
  multi-source/color-picker config and TV Guide's global
  settings['xmltv_*'] fallback remain available there. Also fixed the
  new iFrame popup's two checkboxes rendering as plain unstyled
  Bootstrap checkboxes instead of the app's standard 38x20px blue
  switch (.de-switch, already the documented standard class in
  css/creative.css for exactly this case) - every checkbox added
  across all five new popups uses it from the start. The Widgets
  catalog modal now visually separates the two kinds of card under
  their own heading - "Widgets (once per screen)" for the remaining
  singleton cards and "Widgets (multiple per screen)" for the six
  repeatable cards (iFrame/Calendar/Public transport/Timegraph/TV
  Guide/LMS) - instead of mixing both in one grid. Refactored the
  special-block kind lists that had grown into a hand-duplicated
  ``kind === 'x' || kind === 'y' || ...`` chain repeated at up to 10
  call sites across js/deviceeditor.js, js/layouteditor.js and
  js/saveblocks.php into a small number of named, shared arrays
  declared once per file, each call site now doing a plain
  ``.indexOf(kind) > -1`` membership check instead - a behavior-
  preserving refactor (every array's contents were extracted 1:1 from
  the chain it replaces) fixing a recurring structural pain point:
  those duplicated chains, and the test assertions matching their
  exact literal multi-line text, were a frequent source of merge
  conflicts between feature branches touching nearby special-block
  code. A future repeatable special now touches one line per array
  instead of up to 10 separately-duplicated chains, and the
  corresponding test assertions were rewritten to check each array's
  declaration/membership directly. Verified with the full node --test
  suite (183 tests, including source-shape assertions updated for each
  new kind) and Prettier's format check; live browser verification of
  the Screen Editor flow was not possible in this environment (no
  Domoticz/Docker stack available).

- Fixed Prettier formatting mismatches in
  ``js/components/streamplayer.js`` and
  ``js/components/streamplayer.css`` (no functional change) that were
  failing CI's ``format:check`` job on Node 20/22/24.

- Verified with the full node --test suite (184 tests, including a
  new ``php-security.test.js`` regression test for the new endpoint)
  and Prettier's format check.

v3.45.7 beta (25-8-2026)
-------------------------

* **Enhancements**

- Reworked Device Rules Automation to a v2 schema that groups one
  trigger with two independent, simultaneously-selectable actions
  instead of a single mutually-exclusive action: CSS styling applied
  to the current device (as before), and a new "Set text" action that
  writes separate "text when true"/"text when false" values onto a
  different, selected target device's title via Dashticz.setBlock.
  The normaliser still accepts previously saved flat
  action/target/className and action/target/textOn/textOff records,
  so existing automation keeps working unchanged.

- Added a new "Floating banner" styling option (alongside the
  existing background/border/text combinations), matching the
  hand-written custom.css pattern for full-screen alert banners - a
  visibility toggle plus a :before with static content, background,
  border, border-radius, centered fixed position and z-index.
  Per-rule fields are banner text (baked into the CSS content: value
  at save time, validated client- and server-side to reject
  quote/backslash characters since it's written verbatim into a CSS
  string), distance from top in px (so multiple banners can stack
  without overlapping), and font size, with width left automatic so
  the banner fits any length of text.

- Text actions now write to a target device's data/value field
  instead of its title, matching how the block itself renders device
  data. Disabled master rules no longer generate any CSS. When
  several devices' text actions target the same device, each is
  tracked by its own source key/label/rule index instead of
  colliding, so they render as independent lines that stay correct
  regardless of processing order.

* **Code**

- Verified with the full node --test suite (173 tests) and Prettier's
  format check.

- Fixed a Prettier formatting mismatch in ``css/creative.css`` and
  ``js/devicerules.js`` (no functional change) that was failing CI's
  ``format:check`` job on Node 20/22/24.

v3.45.6 beta (24-8-2026)
-------------------------

* **Enhancements**

- Extended #195's icon-button conversion (previously Device Config
  only) to every other place Icon/Updated/Title/Data switches
  appeared: the Screen Editor's five quick-add popups (Custom device,
  Multi Device, Group, HTML Block, LMS) and Widget Config's own
  Icon/Title row. Both now use the same click-to-toggle icon-button
  look and behavior as Device Config's row, instead of native
  checkboxes. button.js's injected Background toggle matches whichever
  row it lands in.

- Extended #195 to the Slide button quick-add popup too - the one
  place it was still missing entirely. Icon was previously shown
  unconditionally with no toggle at all, and its "No background"
  checkbox was a lone switch with no Display options row around it.
  Both are now icon buttons in a proper Display options row, matching
  every other popup, positioned at the top of the popup body like
  every other popup's row too (it had briefly landed after the
  Name/Key/Title/Screen fields instead).

- The Slider visual mode (next to Icon/Dial/Bar in Device Config) is
  now available for Dimmer devices too, not just Blinds Percentage -
  previously the button stayed disabled for a Dimmer and had no
  working renderer behind it even if forced (#197). It shows On/Off
  labels and no Stop button (a dimmer has no motor to stop), and its
  vertical slider runs bottom-to-top - 0% Off at the bottom, 100% On
  at the top - matching a physical dimmer/volume slider, unlike
  Blinds' top-to-bottom Open/Closed convention.

* **Fixes**

- Fixed a block's icon rendering visibly larger than every other
  block's icon under the Modern Dark/Liquid Glass themes when the
  block has no ``refresh()`` of its own to later repaint it through
  ``iconORimage()`` (which always adds the ``icon`` class).
  ``getColIcon()`` (``js/dashticz.js``), the one-time initial-render
  path every block goes through, was missing that class - its own
  image branch right below it already had it - so a block that never
  gets repainted (for example an HTML block with a custom icon)
  permanently rendered at each theme's unscoped default size instead
  of matching its ``.col-icon .icon`` size variable.

- Fixed the Screen Editor quick-add popups' (Custom device, Multi
  Device, Group, HTML Block, LMS) Icon/Updated/Title row rendering
  centered instead of left-aligned like Device Config's own row.
  Also left-aligned Device Config's own Icon/Data/Updated/Title/
  Background group specifically, so it now sits at the left edge with
  Dial/Bar/Slider pinned to the right, matching #195's original
  mockup.

- Fixed "Display options" showing in English regardless of the active
  language, in Device Config and every quick-add popup - the
  translation key only ever existed for Widget Config's own copy of
  this heading, never for Device Config's. Added it to the three
  language files that already translate Widget Config's copy (English,
  French, Dutch).

- Fixed the Bar visual mode showing "OPEN"/"DICHT" (Open/Closed)
  segment labels for Dimmer devices instead of On/Off - it worked
  correctly for sunscreens/blinds, but a Dimmer's own SwitchType was
  never checked (#197).

- Fixed a Dimmer's Slider up/down buttons still looking like Blinds'
  matched pair of green move-actions, which doesn't read as an On/Off
  toggle for a lamp. The down (Off) button is now colored red to
  contrast with the up (On) button's green, like a switch's own
  on/off colors (#197). Blinds' own up/down buttons are unchanged.

- Fixed those same buttons still using chevron-up/chevron-down icons,
  which read as a physical move action rather than On/Off. A Dimmer's
  Slider buttons now use toggle-on/toggle-off icons instead (#197);
  Blinds keep their chevrons unchanged.

* **Code**

- Removed the now fully unused ``.de-config-options`` switch-grid CSS
  (and its ``-three``/``-four``/``-five`` column-count modifiers) and
  the ``.we-block-option.form-check-input`` switch-sizing rule, since
  nothing renders that markup anymore; folded the surviving switches
  (``#hb-device-border``, ``.we-widget-field``, ``#we-cfg-ascending``,
  ``.de-switch``, ``.de-lms-switch``) into the shared blue-switch color
  rule on their own.

v3.45.5 beta (23-8-2026)
-------------------------

* **Enhancements**

- The Layout Editor's per-tile **-** (remove) button now asks
  "Remove this tile from the layout?" before deleting a block or
  widget, for every block type and widget the button appears on.
  Uses the same ``window.confirm()`` pattern already used for screen
  deletion and Wizard grid conversion.

- Device Config's Data/Updated/Title/No background switches are now
  icon buttons, matching the look of the existing Icon/Dial/Bar/Slider
  visual-mode picker (#195). Icon moved out of that mutually-exclusive
  Dial/Bar/Slider group into its own independent toggle: Icon, Data,
  Updated, Title and Background now sit together as one row of
  bordered icon buttons, beside the still mutually-exclusive Dial/Bar/
  Slider group, both under the same *Display options* heading. Every
  device now gets an Icon toggle (previously only Group/HTML/LMS/
  Separator blocks did, and dial-capable devices only got it as one of
  the exclusive modes), and toggling it no longer depends on which
  Dial/Bar/Slider mode, if any, is selected. Widget Config keeps its
  original switch-based layout, unchanged.

* **Fixes**

- Fixed the Sunrise/Sunset widget showing a real, clickable scrollbar
  instead of clipping its content on a grid row too short for its
  icon/title header plus the sunrise/sunset line. ``.sunriseholder``
  only had ``min-height: 100%`` (a floor, not a ceiling), unlike every
  sibling grid-aware block (``.frame``, ``.waqi``, ``.log``,
  ``.basicclock``, ``.stationclock``, ``.flipclock``, ``.haymanclock``,
  ``.map``, ``.trash``), which already clamp to ``height: 100%`` plus
  ``overflow: hidden``. It now gets the same treatment.

- Fixed the Layout Editor showing a Group block's
  (``js/components/group.js``, ``type: 'group'``) settings control as
  a plain drag icon instead of the normal configuration cog, so its
  config popup never opened. ``_resolveBlock()`` only recognized
  separator/HTML/LMS/widget/idx-based-device blocks, so a group block
  (which has no numeric ``idx``) fell through to the untyped ``grid``
  fallback kind with no config affordance - the same fix shape as
  #168's HTML block cog icon.

- Fixed a block's configured custom icon (for example a Group block's
  default ``fas fa-object-group``) silently rendering as a blank or
  broken image instead of the icon, whenever the block's ``image``
  had also been reset to ``''`` by ``getBlockConfig()``.
  ``iconORimage()`` (``js/blocks.js``) checked
  ``typeof block['image'] !== 'undefined'`` rather than its
  truthiness, so the defined-but-empty ``''`` image always won over a
  real configured icon, since it is checked after the icon check.

* **Code**

- Updated ``dayjs`` (1.11.21 to 1.11.23) and ``sass`` (1.101.0 to
  1.103.1) to their latest patch releases, per the technical audit's
  dependency-update recommendation. Verified with a clean ``npm ci``,
  a production build (no new Sass deprecation warnings, entrypoint
  size unchanged within budget), the full ``node --test`` suite,
  Prettier's format check, and the Playwright suite.

v3.45.4 beta (22-8-2026)
-------------------------

* **Enhancements**

- Added a new **Needle** visual mode for Blinds Percentage/Blinds
  Inverted Percentage devices, selectable in the Device Config popup's
  visual-mode selector alongside the existing Icon/Dial/Bar options
  (now Icon/Dial/Bar/Needle, ``block.needle`` in CONFIG.js). It renders
  as a continuous vertical slider - a title, a compact OPEN button
  above the slider, the slider itself (a wide track with a green
  gradient fill up to a small round handle, a clickable/typeable
  percentage readout beside it, and a clickable tick scale down its
  left edge), then DICHT (and STOP, unless ``hide_stop`` is set) below
  it - implemented as a new ``renderBlindsSliderBlock()`` in
  ``js/switches.js``.

- This is purely additive: Icon mode's own classic thin percentage bar
  (``getBlindsBlock()``'s ``withPercentage`` branch) is completely
  unchanged from its original implementation, and the separate Dial
  widget's existing Dial/Bar modes (``js/components/dial.js``) are
  untouched.

- Needle's scale tick count reads the same ``barsteps`` config field
  (default 10) the Bar dial subtype already exposes as its **Steps**
  field in the Device Config popup - that field is now shown for
  either mode. Clicking a tick, or the live percentage readout itself,
  jumps straight to that value (typing an exact number is also
  supported); dragging the handle works as expected.

- The block escapes the classic 85px default block height (the same
  way ``multi_line`` blocks like graphs already do) while still
  properly shrinking/growing with a grid screen's own row-driven
  height, so resizing the tile in the Layout Editor works as expected.

- Handled Domoticz's inverted blinds percentage scale (0% fully open
  instead of 100%) for Needle mode: auto-detected from the device's
  SwitchType (the same "Inverted" check already used for the
  OPEN/DICHT command direction), so the green fill and the OPEN/DICHT
  command direction both flip together for those devices with no
  configuration needed. A new **Inverse** switch in the Device Config
  popup (shown only in Needle mode, pre-checked to match the
  auto-detected value) can override it for the rare device that
  doesn't expose this correctly through Domoticz.

* **Fixes**

- OPEN/DICHT were unexpectedly taller than STOP because their chevron
  icon inherited the theme's blanket ``.fas { font-size: 30px }`` rule
  (the codebase's own ``.fa-small`` opt-out still resolves to 20px,
  itself too big here), overriding the button's own 8px text size and
  dragging its height back up regardless of padding; fixed, and
  OPEN/DICHT now have an explicit height that's exactly twice STOP's,
  ``!important`` so the ratio holds regardless of any other rule's
  specificity. STOP also gets a light red background/border to set it
  apart from OPEN/DICHT.

- Shrunk the slider handle further (20px to 16px) and made its
  width/height ``!important`` so it can never end up non-square. jQuery
  UI positions the handle by its *bottom edge*, not its center, while
  the tick labels and value bubble both center on their percentage via
  ``translateY(-50%)`` - so without correction the handle visually sat
  about half its own height too high, not matching the tick/bubble it
  was next to. Restored a negative ``margin-bottom`` sized to half the
  handle's height so its center lands on the same percentage the
  ticks/bubble do (an earlier pass in this same release had zeroed this
  out, mistaking jQuery UI's own equivalent default compensation -
  ``.ui-slider-vertical .ui-slider-handle``'s ``margin-bottom: -.6em`` -
  for an unwanted quirk rather than the same fix, sized for the
  theme's own default handle).

- Selecting Needle and saving didn't actually switch to it: the classic
  bar kept showing instead, and the Needle button lost its highlighted
  state on reopening the Device Config popup.
  ``saveblocks.php``/``configwriter.php`` only recognize a fixed set of
  top-level device properties (unlike Dial/Bar's existing
  ``type: 'dial'``), so a plain ``needle: true`` on the saved entry was
  silently dropped - the same way Bar's own ``subtype: 'bar'`` and
  ``barsteps`` already have to ride through ``custom_fields`` instead.
  ``needle`` now does the same, and the popup also hydrates
  ``options.needle`` from the live config when reopening.

- The slider is now correctly given jQuery UI's ``orientation:
  'vertical'`` and ``range: 'min'`` options, so the handle position,
  drag direction and gradient fill are all actually value-driven,
  rather than only looking that way via CSS - without ``orientation``,
  the handle stayed visually static and dragging mapped vertical mouse
  movement almost randomly to a value; without ``range``, jQuery UI
  never even created the ``.ui-slider-range`` element the gradient
  fill CSS targets.

- Clicking a scale tick or typing an exact value each used to send
  every command twice, or (when typing) re-open the edit input instead
  of committing cleanly - both were re-entrancy bugs where
  programmatically setting the slider's value, or removing a focused
  input from the DOM, re-triggered the same handler a second time
  while the first call was still on the stack.

- The track, range and handle colors are now ``!important``, so
  jQuery UI's own bundled default theme CSS (which styles the same
  generic ``.ui-slider``/``.ui-widget-header`` classes, e.g. with
  blue) can no longer visually override them.

- Fixed the scale reading -1% for a fully-closed normal device and
  101% for a fully-open inverted one. The slider's ``min`` was
  hardcoded to 1 instead of 0, so the percent-space math behind the
  tick labels, the value bubble and the click-to-type input landed
  just past 0%/100% for a raw Level of 0. ``min`` is now 0, the
  device's real Level range - the same range the Bar dial subtype
  (``js/components/dial.js``) already uses.

- Reverted an earlier misstep from this same release: the tick
  labels/bubble/typed value had briefly been made to flip their
  printed number for an inverted device (0% at the top, 100% at the
  bottom). The Bar dial subtype never does this - it always shows the
  device's raw, unconverted Level regardless of an inverted
  SwitchType - and that plain behavior is what's wanted here too. An
  inverted SwitchType now only changes which direction the OPEN/DICHT
  buttons move the blind, exactly as the classic bar has always
  treated it.

- Checking the Bar dial subtype's actual template
  (``tpl/dialbar.tpl``) and CSS showed its segments are always laid
  out top-to-bottom as 0%, then increasing to 100% - a plain flex
  column with no reversal - for every device, not only inverted ones.
  Needle's scale now matches that same fixed layout (0% at the top,
  100% at the bottom), the opposite of a plain vertical slider's own
  min-at-bottom/max-at-top convention. jQuery UI has no built-in option
  to flip a vertical slider, so every value handed to or read from the
  widget is now mirrored around the midpoint of its 0-100 range before
  reaching it and un-mirrored on the way back out, while every
  displayed number (tick labels, the value bubble, the click-to-type
  input) stays in plain raw-value space throughout - a tick's printed
  label always matches the raw value it jumps to when clicked. The
  gradient fill direction (``range: 'max'`` instead of ``'min'``) was
  adjusted to match, keeping transparent-at-0%/filled-at-100%
  consistent with the new physical layout.

- Shrunk OPEN/DICHT's chevron icon to half its previous size (9px to
  4.5px).

- Found the actual cause behind two bugs that kept reappearing:
  the handle looking stuck near the middle of the track no matter the
  device's value, and the chevron staying oversized despite the fix
  above. The Modern Dark, Liquid Glass Blue and Liquid Glass Grey
  themes each carry their own theme-wide ``.fas.fa-chevron-up,
  .fas.fa-chevron-down { font-size: 40px !important; }`` and
  ``.ui-slider-handle { top: 50% !important; margin-top: -20px
  !important; width: 20px !important; height: 40px !important;
  border-radius: 14px !important; ... }``, written for the horizontal
  dimmer slider's own up/down buttons and handle. Needle's chevron
  rule had no ``!important``, so the theme's won outright regardless
  of its higher selector specificity; Needle's handle rule never
  touched ``top``/``margin-top`` at all, so the theme's ``top: 50%``
  applied uncontested - and once ``top``, ``height`` and jQuery UI's
  own dynamic ``bottom: value%`` are all specified on the same
  absolutely-positioned element, the box is over-constrained and
  ``bottom`` is dropped entirely in favor of ``top``, pinning the
  handle to the track's vertical center regardless of the actual
  value. Needle's chevron rule now carries ``!important`` (its higher
  specificity then correctly wins the tie); its handle rule now resets
  ``top``/``margin-top`` to ``auto``/``0`` with ``!important``, handing
  vertical positioning back to jQuery UI's own ``bottom`` entirely, and
  ``border-radius`` also gained ``!important`` so the theme can no
  longer square off the handle's shape. Reproduced by loading a theme
  stylesheet alongside creative.css in a test render - something
  earlier verification in this release had not done - and confirmed
  fixed for all three themes.

- OPEN/DICHT's chevron is now exactly as tall as its own surrounding
  text (``font-size: inherit``, instead of a hardcoded pixel value).

- Fixed the round slider handle visually poking out above/below the
  slider track's own background at the 0%/100% extremes. The handle
  can overhang up to half its own height past the track's logical
  0%/100% edge - needed so its center still lands exactly on the
  value's position, matching the ticks/bubble - but the track's own
  visible background previously stopped exactly at that edge, cutting
  the handle off there. The track element's own box (what jQuery UI
  and this file's own tick/bubble math measure 0%-100% against) is now
  left completely alone and made transparent/borderless, with its
  actual visible background moved onto a ``::before`` pseudo-element
  sized 8px (half the handle's 16px) taller at both ends, so the
  handle now always renders fully inside the visible track.

- Adjusted OPEN/DICHT/STOP's heights: STOP is 5px taller (20px to
  25px) and OPEN/DICHT are 5px shorter (40px to 35px).

- The tick in the 0%-100% scale closest to the slider's current value
  is now highlighted (the same green the value bubble used to use), so
  the current position stays visible in the list of percentages.

- Removed the value bubble entirely (and, with it, the click-to-type-
  an-exact-value input it offered), leaving the highlighted tick as
  the slider's only on-track indicator of the current reading - also
  made that tick's label bold, not just colored, so it still stands
  out on its own now that it's the sole indicator.

- Doubled the slider track's width (30px to 60px).

- Fixed the gradient fill leaving a visibly empty sliver at the top of
  the track's background, and, symmetrically, the bottom, instead of
  reaching all the way to its edges. The track's visible background is
  drawn 8px taller at each end than the coordinate box jQuery UI
  positions everything against, reserving room for the round handle's
  own overhang there - but the gradient fill (``.ui-slider-range``) is
  a jQuery UI-managed element sized purely as a percentage of that
  *unextended* box, so it always stopped 8px short of the
  background's actual top, and, for the same reason, never reached
  down to the handle's own bottom edge at high values either. The
  fill's anchored top edge is now shifted up 8px to match; its height
  is topped up by 16px on every value change so its bottom edge always
  reaches exactly to the handle's own visible bottom edge, at every
  value - not only the 0%/100% extremes.

- Moved OPEN/STOP/DICHT off their own row above/below the slider and
  onto a column beside it instead - OPEN top, STOP middle, DICHT
  bottom, all within the slider's own height (a plain flex column
  with ``justify-content: space-between``, stretched to match the
  slider via the new row container's ``align-items: stretch``) -
  freeing up the vertical room they used to take for the slider and
  its percentage scale instead. The buttons are now small round
  icon-only buttons (OPEN/DICHT's existing chevrons, plus a new
  ``fa-stop-circle`` icon for STOP, the same icon already used for a
  media player's own Stop button elsewhere in this codebase) - their
  OPEN/DICHT/STOP text is gone from the visible button entirely, kept
  only as an ``aria-label`` for screen readers.

- Moved the button column closer to the slider (10px gap to 5px) and
  made the buttons themselves 2px bigger (30px to 32px).

- Shrunk each tick's dash line by half (20px to 10px) and moved its
  percentage label in to match, keeping the same small gap between
  them instead of leaving a floating space where the dash used to
  reach.

- Moved the button column right up against the slider (5px gap to
  1px).

- Gave DICHT the same green colors as OPEN, instead of its own plain
  grey.

- Fixed the percentage scale's ticks (and the track itself) being
  able to render partly outside a narrower block, and the gap to the
  button column still looking large even at 1px. Both
  ``.slider-scale`` (the ticks) and ``.slider`` (the track) used to
  center themselves independently within ``.blinds-slider-wrap`` via
  ``position: absolute`` plus a fixed negative ``margin-left`` each -
  correct only for the exact wrap width those margins were tuned
  against, so a narrower block (or the track's own width changing, see
  below) could push the ticks partly outside the visible block, and a
  wide wrap left a lot of empty, un-styled space between the visible
  track and the button column that the wrap's own tiny gap never
  accounted for. Both are now plain flex children of
  ``.blinds-slider-wrap`` (now itself a flex row) instead, always
  staying inside it; ``justify-content: flex-end`` keeps the
  scale+track group hugging the button column with no leftover space
  in between, at any width. The track's own width is no longer a
  fixed 60px either - it now flexes with how much room the block
  actually has, so a narrow block shrinks it instead of overflowing or
  clipping.

- Removed the track width's own upper cap (previously 60px) - it had
  only ever shrunk along with a narrower block, not grown along with
  a wider one, since ``.slider-scale`` (the only other item sharing
  the row) never grows, so all of the wrap's own extra width was
  going unused instead of into the track. A 30px floor is kept so it
  never disappears on a very narrow block.

- Nudged the button column's gap to the slider from 1px to 3px.

- Made the percentage scale's tick labels 2 sizes bigger, converting
  ``font-size`` from a relative ``0.85em`` (9.35px computed, against
  an 11px inherited base) to a flat 11px.

- Renamed the Needle visual-mode button in the Device Config popup to
  Slider (``lang/*.json``'s ``dial_needle``, and its mention in
  ``dial_barsteps_help``) - the internal mode/property name
  (``block.needle``) is unchanged, only the label shown to the user.

- Fixed the Inverse switch (Device Config popup, Slider mode)
  rendering noticeably smaller than the Data/Update switches next to
  it - it fell outside ``.de-config-options``, the container the
  Data/Update switches' own bigger size (38x20px instead of
  Bootstrap's default) is scoped to. Rather than adding yet another
  one-off selector to that already-long list (``css/creative.css``
  already lists five: ``.de-config-options``, ``#hb-device-border``,
  ``.we-widget-field``, ``#we-cfg-ascending``, ``.we-block-option``,
  ``.de-lms-switch``), added a new shared ``.de-switch`` class
  carrying the same size/color and applied it to the Inverse checkbox
  - any future standalone Device Config switch can just add this
  class instead of needing its own new CSS rule.

v3.45.3 beta (21-8-2026)
-------------------------

* **Enhancements**

- The Modern Dark, Liquid Glass Blue and Liquid Glass Grey themes' icon
  and image size (previously a hardcoded 35px) is now configurable from
  the settings menu, in a new **Icon size** section next to the existing
  **Font size** fields on the Theme tab, with separate **Icon** and
  **Image** fields. It's backed by two new CSS variables - ``--icon-font-size``
  (the FontAwesome icon column, ``.col-icon .icon``) and
  ``--icon-image-size`` (actual ``<img>`` icons) - since a device's custom
  image and a widget's FontAwesome icon are unrelated and were previously
  forced to the same size. Both are wired into the same CSS-variable
  settings panel, save endpoint and ``custom.css`` override mechanism the
  Colors and Font size sections already use.

- The Font size and new Icon size fields now use a compact 2-column
  layout, matching the Colors section, instead of a full-width
  single-column row with the same 40-character-wide input as every other
  setting - far more than a short pixel value like ``18`` needs.

- The Font size and Icon size fields now take a bare number with a fixed
  "px" shown next to the field, instead of free text requiring e.g.
  ``18px`` to be typed - these variables are always a pixel size, so
  there was never a reason to type or accept a unit.

- The Theme tab's background-image preview swatch and the active custom
  stylesheet notice now sit beside their **Choose background image** /
  **Path/URL** fields instead of stacking underneath them. The notice was
  also sizing to its own content by default, wrapping its text across 4
  short lines - it now has a 260px minimum width and grows to fill the
  row, wrapping across 2 lines instead.

- The free-positioned grid layout's ``gridColumns`` (default ``24``) and
  ``rowHeight`` (default ``20`` px) can now be set dashboard-wide from
  Settings > **Weergave** (screen), instead of only per-screen in
  ``CONFIG.js``. Any ``layout: 'grid'`` screen that doesn't set its own
  ``gridColumns``/``rowHeight`` falls back to these settings before the
  hardcoded default, so leaving both untouched keeps every existing
  install's grid screens exactly as they were. The Layout/Device/Widget
  editors' save flows only pin an explicit ``gridColumns``/``rowHeight``
  onto a screen when it actually diverges from this dashboard-wide
  default (a genuine per-screen customization) - a plain save otherwise
  keeps that screen following the setting, and it no longer gets frozen
  to whatever was in effect the first time the screen was ever saved.
  Changing the setting itself also clears any existing per-screen
  override for that same property on every screen at once, so an
  install with grid screens saved before this existed - which all had
  an explicit value pinned - isn't stuck manually editing ``CONFIG.js``
  to let the dashboard-wide setting reach them.

* **Fixes**

- Fixed ``CONFIG.js`` accumulating a growing run of blank lines between
  editor-managed sections (screens, grid layouts, widgets) every time one
  was resaved. ``configwriter_remove_section()`` spliced the raw text
  before the removed section straight onto the raw text after it, but
  both sides already carried their own leading blank line from
  ``configwriter_wrap_section()`` - since a section is always removed and
  re-appended on every save, each save stacked another blank line onto
  the same spot, compounding without bound. It now trims the whitespace
  on both sides of the cut and rejoins with exactly one blank line.

- Fixed settings saved from the Settings UI always jumping to the end of
  the ``config["key"] = value;`` block, scattering an edited setting away
  from the related settings it was originally grouped near.
  ``configwriter_upsert_root_config_settings()`` now updates an existing
  single-line setting in place; only genuinely new keys get appended.

- Centered a Selector Switch device's option buttons
  (``.btn-group.selector-buttons``, e.g. Open/Half/Dicht) horizontally
  within its block on the Modern Dark, Liquid Glass Blue and Liquid Glass
  Grey themes, instead of hugging the right edge - Bootstrap's
  ``.btn-group`` is an inline-flex element, so it inherited its position
  from ``.mh``'s ``text-align: right``.

- Vertically centered a Selector Switch's option buttons/dropdown below
  the title, and gave the ``SelectorStyle`` ``1`` dropdown (e.g.
  Husqvarna, Lyrion) the same full-width treatment the buttons already
  got - previously the plain ``<select>`` was sized to its own content
  and left, right-aligned like the buttons used to be.

- Moved that same Selector Switch buttons/dropdown 5px above dead-center,
  shrinking the gap to the title above by 5px (and growing the gap below
  by the same amount).

- Fixed unreadable white text on the Device Config popup's **Icon** /
  **Dial** / **Bar** display-mode buttons when selected - Bootstrap's
  default active-button text color assumes the usual solid dark
  background, but this component's selected background is a light mint
  green instead. The selected button's label now uses the same accent
  blue as its icon.

- Shifted a section title block's (``type: 'blocktitle'``, e.g.
  "Lichtschakelaars") title text 10px to the right of its icon, on the
  Modern Dark, Liquid Glass Blue and Liquid Glass Grey themes.

- Fixed editing a device's config from inside the Layout Editor, clicking
  OK, then editing a *different* device and clicking OK, silently
  reverting the first device's change - only the most-recently-edited
  device's edit actually persisted. Each confirmed change there is saved
  immediately, resending every currently-placed device's definition, but
  the in-memory device state was always rebuilt from ``blocks``/
  ``columns`` on every popup open - and those client-side globals are
  never patched after a save, only the server's ``CONFIG.js`` is - so the
  second edit's save resent the first device using its stale pre-edit
  data, reverting it server-side. Opening a device's config from the
  Layout Editor now keeps already-known device/special state across
  repeated edits in the same session instead of re-deriving it from those
  stale globals.

- Fixed finger-swipe screen navigation silently doing nothing on narrow
  (phone-width) touch devices when **Enable Swiper** was set to ``1``.
  Per its own settings help text, ``1`` means "Enable on narrow screens",
  but ``buildSwipingScrolling()`` tested the opposite condition and only
  ever started Swiper on wide screens - with Swiper never created, the
  non-swiper screen-switching fallback has no touch/gesture handling at
  all, so a swipe had nothing listening for it.

- Fixed touch-swipe screen navigation not working at all on at least one
  real Android tablet, even with **Enable Swiper** left on its default
  value. Swiper was loaded via a separate lazily-fetched chunk
  (``window.loadSwiper()``); on that tablet, fetching the chunk at
  runtime silently failed, so Swiper never initialized and no touch
  handler was ever listening for a swipe, while the screen-switcher
  buttons and mouse drag - which don't depend on it - kept working.
  Swiper is now bundled directly into ``dist/bundle.js`` instead, with no
  separate runtime fetch to fail.

- Corrected the grid layout documentation (``docs/screens.rst``), which
  still listed ``rowHeight``'s default as the old value of ``40`` and used
  it in both example snippets. The code's actual default has been ``20``
  for a while, with an existing migration shim that treats an explicit
  ``rowHeight: 40`` on a screen as that legacy value and normalizes it to
  today's real default - so the example was liable to silently produce
  blocks half the intended height if copied as-is.

* **Removed**

- The **Media** tile in the settings menu (**switch_horizon**,
  **host_nzbget** and **hide_mediaplayer**) - it saw little use as a
  dedicated settings category. The config keys it edited are still fully
  functional for anyone who sets them directly in ``CONFIG.js``; only the
  settings-UI entry point was removed.

v3.45.2 beta (20-8-2026)
-------------------------

* **Enhancements**

- Added a **Full-width image** toggle to the Add Button Wizard popup's
  Icon/Image picker (shown once a custom image is picked). Previously the
  picker only ever saved a chosen image into the small, fixed-size icon
  field (``.col-icon``), with no way to reproduce a webcam/radar-style
  button that fills and scales with the block - reported as a missing
  ``btnimage`` parameter, distinct from ``image``. Checking the toggle
  saves the same picked image as ``btnimage`` instead, Dashticz's existing
  dedicated full-block-width image field, instead of leaving users with an
  oversized icon floating in an otherwise-empty block (#171).

- The Bar display mode's number of segments is now configurable via a new
  ``barsteps`` block parameter (default 10, e.g. ``barsteps: 5`` gives 5
  segments of 20% each plus the 0% segment) instead of always being fixed.
  Choosing **Bar** in the Device Config popup's Icon/Dial/Bar selector now
  reveals a **Steps** number field to set it directly, instead of having
  to add ``barsteps`` by hand via Custom fields. See :ref:`dialbar`.

- The selected option in the Device Config popup's Icon/Dial/Bar selector
  now uses the same light-green "added" look as a selected widget card in
  the Add items gallery, instead of a plain grey/orange outline - with a
  blue icon rather than one matching the border color, so the icon stays
  the one visual cue that changes per mode at a glance.

- Device, Multi Device and Custom device icons are now the same 45px width
  as every other block type placed on screen (Widget, Separator, Slide
  button, Group), instead of rendering 5px narrower at 40px. Widget,
  Separator, Slide button and Group already built their wrapper with the
  ``dt_block`` class that the wider ``.dt_block .col-icon`` rule targets;
  plain devices and Multi/Custom device value rows now get that class too.

* **Fixes**

- Fixed thermostat (and other) dial widgets still rendering off-centre on
  the Modern Dark, Liquid Glass Blue and Liquid Glass Grey themes. The
  earlier #177 fix only zeroed the padding on the dial's wrapper
  (``.transbg.dial``), but the themes' generic panel styling - padding,
  border, background and box-shadow, applied via a broad ``.transbg``
  selector - still applied to it, and could still shift the dial's
  square-face calculation off-centre. Dial components are now fully
  excluded from that themed panel styling (``.transbg:not(.dial)``), so
  they use the same plain, unthemed layout as the default theme, where the
  dial was already correctly centred (#177).

- Fixed a Full-width image (or any plain URL/popup) button always
  rendering with a permanent, bluish-tinted "active menu button"
  background, instead of matching every other block's default background,
  even on the default theme. Every button created via the Add Button
  Wizard carries a ``slide`` property (so it's still recognised as a
  button even without an image), which also always tagged it with the
  ``.slide``/``.slideN`` CSS classes ``js/main.js`` uses to highlight
  whichever button targets the currently active screen - so it permanently
  looked "selected". Buttons whose real action is a URL/popup (``newwindow``
  set) no longer get those classes, since they never actually navigate via
  slide; genuine slide/menu buttons keep highlighting correctly (#171).

- Fixed the Bar subtype (#182) losing its themed panel background, border
  and shadow on Modern Dark, Liquid Glass Blue and Liquid Glass Grey,
  instead of matching every other block like it should. The #177 fix
  above excluded every ``.dial`` element from that panel styling to fix
  the circular dial's centering, but Bar is a vertical rectangle that
  never shared that centering problem - ``js/components/dial.js``'s
  ``_dialFitSize()`` already measures Bar's content box directly rather
  than the padding-sensitive ``outerWidth``/``outerHeight`` measurement
  the circular dial relies on. Bar now gets the same themed panel every
  other block has, targeted via the ``.dialbar`` class ``dial.js``
  already adds to its parent element to tell it apart from the circular
  dial (#182).

- Fixed custom image icons (and inline icons like a thermostat dial's
  value-row icon) rendering far too large on the Modern Dark, Liquid Glass
  Blue and Liquid Glass Grey themes. Those themes' blanket
  ``.icon { font-size: 40px !important; }`` rule matched *any* element
  carrying the generic ``icon`` class, not just the intended main
  device/widget icon column, so unrelated inline icons elsewhere in the
  UI were blown up too. Their ``.col-icon img, .icon img`` rule also
  capped custom image icons at 65px - more than double the 30px every
  other theme and block type uses - so a device's image icon rendered
  visibly larger than a Separator's or Widget's icon using that same
  file. The font-size rule is now scoped to ``.col-icon .icon`` and the
  image cap is now 30px, matching the default theme and the themes' own
  existing dimmer/blinds-slider carve-out.

- Unified image-icon sizing on the Modern Dark, Liquid Glass Blue and
  Liquid Glass Grey themes to 35px everywhere. The fix above still left
  two slightly different sizes in place - 30px for the general
  ``.col-icon``/``.icon`` image cap and the dimmer/blinds-slider
  carve-out, 34px for the Separator's dedicated
  ``.titlegroups .col-icon img.icon`` and ``.blocktitle img`` rules - so
  a device's image icon and a Separator's image icon using the same file
  still rendered at two different sizes. All four rules now use 35px.

- Fixed screen navigation - both swiping and tapping a slide button -
  being unreliable on tablets while working fine on a PC. A touchscreen
  tap almost always drifts a few pixels, unlike a precise mouse click,
  and Swiper's default ``threshold`` (5px) misreads that drift as an
  aborted swipe attempt; while a transition is still animating, Swiper's
  default ``preventClicksPropagation`` then stops that tap from ever
  reaching the block's click handler - invisible on desktop, where a
  mouse click rarely moves at all. ``js/main.js``'s ``startSwiper()`` now
  raises ``threshold`` to 10 and sets ``preventClicksPropagation: false``.

- Fixed ``js/loader.js``'s ``loadScript()`` (used for ``js/main.js``,
  ``js/functions.js`` and ``js/polyfills.js``) serving a stale cached copy
  of those files after any same-day edit, with no visible sign anything
  was wrong. It busted the cache on the static ``_DASHTICZ_VERSION`` build
  number, which is only bumped on a real ``dist/bundle.js`` rebuild, so a
  device that had already loaded the dashboard earlier that day (e.g. a
  tablet left on) kept serving its old cached ``js/main.js`` indefinitely -
  silently missing fixes such as the Swiper tuning above. It now busts on
  a per-page-load timestamp instead, matching how the theme CSS already
  cache-busts; ``dist/bundle.js`` itself is intentionally left on
  ``_DASHTICZ_VERSION``, since it's only rebuilt on a real release.

* **Code**

- Updated 4 ``tests/source.test.js`` assertions left stale by the Bar
  subtype work (#182), which moved the Dial checkbox into a shared
  Icon/Dial/Bar visual-mode selector without updating the tests pinning
  its previous single-checkbox shape. No production code changed - the
  tests now assert ``deviceeditor.js``'s actual current implementation
  instead of its old one.

- Updated 3 more ``tests/source.test.js`` assertions and 3
  ``tests/php-security.test.js`` assertions left stale by earlier work on
  the LMS "Now Playing" block's cover-artwork handling: a player-based
  artwork lookup and change-detection/retry state machine
  (``js/components/lms.js``), and a broader relative-artwork-path
  normalization on the backend (``vendor/dashticz/lms/index.php``). No
  production code changed - the tests now assert the actual current
  implementation instead of an earlier, simpler shape.

v3.45.1 beta (19-8-2026)
-------------------------

* **Enhancements**

- Added a **Hide block when player is off** switch to the Lyrion Music
  Server Wizard popup (both the quick-add and edit popups). Enabled, the
  block shows nothing at all - no icon, no cover art placeholder, no text -
  instead of the usual "Player off" message while the player is powered
  down, so it can be combined with a block's own **No background** option
  to make it disappear entirely until the player turns back on. Only
  suppresses that specific "off" state; "Player unavailable" and "Nothing
  is playing" still show their own message as before. Sized and styled
  (via a new ``.de-lms-switch`` class) to match the other Wizard switches
  rather than falling back to a smaller, unstyled default.
- Added a new Dial ``subtype: 'bar'`` for Blinds Percentage / Blinds
  Inverted Percentage devices: renders them as a vertical 10-segment bar
  (0% at the bottom, 100% at the top) instead of the draggable dial.
  Tapping a segment sets the device directly to that segment's 10% level;
  segments up to the current level are shown in green, the rest in grey.
  The bar scales with its block's size, both height and width, and its
  title uses the same styling as every other device/widget title instead
  of a bar-specific size and color. A **Bar** switch in the Device Config
  popup (shown once **Dial** is enabled on a qualifying device) turns it
  on/off directly, instead of having to set ``subtype`` by hand via
  Custom fields. Ignored for any other dial-rendered device (Dimmers,
  plain Blinds without a percentage, Thermostats, ...). See
  :ref:`dialbar`.

* **Fixes**

- Fixed the **No background** checkbox in Device Config and Widget Config
  rendering smaller than, and separately positioned above, the other
  Display options switches (Icon/Data/Title) - it was injected as its own
  row outside the switch group and so fell back to Bootstrap's default
  switch styling instead of the project's larger, blue-styled switches.
  It now sits inside the same switch row as Icon/Data/Title and matches
  their size, color and spacing exactly.
- Fixed that same switch then landing alone on its own row below the others
  (Icon/Data/Updated/Dial/Title, or Icon/Updated/Title) once it matched
  their size - the row used a fixed 3/5-column grid sized for the original
  switches only, so the extra one always overflowed onto a row by itself.
  The row now always auto-fits exactly as many equal columns as there are
  visible switches on a single row, including when the Dial checkbox
  hides/shows Icon and Title.
- Fixed enabling **No background** leaving a soft colored glow behind the
  block on the Liquid Glass Blue/Grey themes instead of true transparency -
  those themes' backdrop-filter blur/saturate effect on every block was
  left untouched, so it kept sampling and intensifying whatever sits
  behind the now-transparent block. The backdrop-filter is now cleared
  along with the background (#170).

* **Code**

- Updated two ``tests/source.test.js`` assertions that had gone stale after
  an earlier, unrelated basicclock.js v4 sizing fix (#175): they still
  pinned its previous ``$block``-scaling/``titleHeight``+``stateMarginV``
  approach, which that fix had already replaced with scaling ``$state``
  only and a ``getBoundingClientRect()``-based measurement. No production
  code changed - the tests now assert basicclock.js's actual current
  behavior instead of its old one.

v3.45.0 beta (19-8-2026)
-------------------------

* **Enhancements**

- Every Screen Editor quick-add popup (Custom device, Multi Device, Group,
  HTML Block, Slide button) now renders its Icon field with the same
  Icon/Image row Device Config and Widget Config already use, instead of a
  plain text input: a source dropdown to switch between a Font Awesome
  class and a custom image, and - once Image is selected - the same
  picker grid of files from ``img/custom/``. Multi Device and Slide button
  previously had no way to point at a custom image at all; picking one
  through Custom device, Group or HTML Block's old plain icon field would
  have silently saved the path as an ``icon`` value instead of an
  ``image`` one.
- Added the same **Display options** heading above the Icon/Update/Title
  checkboxes that Widget Config already has, on both every quick-add popup
  and Device Config, so the three popup families read as one consistent
  design instead of two of them being unlabelled.
- The Device Config popup title now shows the device's IDX in brackets
  after its name (e.g. ``Device Config — Power [43]``), covering plain
  devices, sub-devices, Domoticz groups/scenes and Custom/Multi/Group
  specials, so a device stays identifiable even when several rows share
  the same (possibly hand-edited) title. Specials with no IDX of their own
  (Separator, HTML Block, Slide button) omit the bracket.

* **Fixes**

- Fixed a Separator/title block configured with a custom image also
  rendering its old default divide icon next to it - the block-saving code
  fell back to a default icon whenever the Icon option was on, even when
  the user had switched to Image and had no icon value to fall back from.
  The renderer draws an icon and an image side by side rather than one
  replacing the other, so both showed up together.
- Right-aligned Slide button titles, in the Modern Dark and both Liquid
  Glass themes, so they read away from the button's icon/image instead of
  butting up against it. Also fixed a Slide button's custom image
  rendering smaller than every other device's image in these themes: an
  earlier size exception, meant to stop it overlapping the title, capped
  it well below the generic size regular device tiles use - now it
  matches other devices' image size, same as before that exception was
  added.
- Fixed the Layout Editor showing an HTML block's settings control as a
  generic drag icon instead of the normal configuration cog, so it could
  not be told apart from a plain move handle and never opened that
  block's own configuration - the Layout Editor never recognised HTML
  blocks as a configurable kind in the first place. Clicking the cog now
  opens that exact block's Device Config, same as any other special
  block, and works the same whether the block came from the Wizard or a
  hand-written CONFIG.js (#168).
- Fixed a Separator/title block with no ``icon`` property at all - as in a
  hand-written or pre-Wizard CONFIG.js - rendering the runtime's default
  divide icon instead of no icon. Wizard already writes an explicit empty
  ``icon: ''`` when its Icon option is turned off, and that already
  rendered correctly; the missing-property case now behaves the same way
  instead of silently falling back to a default. An explicitly configured
  icon is unaffected and keeps rendering as before (#169).

v3.44.3 beta (18-8-2026)
-------------------------

* **Enhancements**

- The Layout Editor now stays open when switching between screens (the
  topbar's S/1/2/... buttons keep working while it is open). Previously
  the editor stayed bound to whichever screen was active when it was
  opened, so switching screens left the newly visible screen without any
  editing overlay underneath the still-open toolbar. Each screen now gets
  its own in-memory editing session, collected the first time it is
  visited; switching back to an already-visited screen restores its
  session so edits made on one screen never bleed into another, and Save
  persists every screen actually edited in that round - not just the one
  on display when Save was pressed.
- Adding a device, widget or separator from the topbar's "Add items" menu
  while the Layout Editor is open no longer closes the editor and reloads
  immediately, silently dropping whatever was still pending there (a
  removed tile, a resize, a move). The new tile is added as a pending,
  not-yet-saved placeholder - still fully draggable/resizable/removable -
  and only the Layout Editor's own Save button persists it, together with
  everything else pending; Cancel discards it. Custom device, Multi
  Device, Group, HTML Block and Slide button - kinds the Layout Editor
  can't yet represent as an editable tile - keep the previous
  save-and-reload behavior.

* **Fixes**

- Fixed a "Grid block is not declared and cannot be created" error when
  saving a newly added device, widget or separator on a grid screen: its
  save now declares the new block in the same request instead of only
  sending a grid position for something the config didn't know yet.

v3.44.2 beta (17-8-2026)
-------------------------

* **Fixes**

- Fixed the Layout Editor's per-tile gear icon: configuring a device or
  separator directly from the grid (not via the add-item tile menu) built
  and silently surfaced the full Device Editor once its Device Config popup
  closed, instead of returning to the grid the user was actually editing -
  closing that unexpected Device Editor then exited the whole editing
  session. The gear icon's popup now saves the confirmed change by itself
  (``saveblocks.php`` with ``blocksOnly``) and simply closes, leaving the
  Layout Editor open and untouched underneath the whole time, the same way
  a widget tile's gear icon already worked.

v3.44.1 beta (17-8-2026)
-------------------------

* **Enhancements**

- The Icon/Update/Title checkbox row on every Screen Editor quick-add popup
  (Custom device, Multi Device, Group, HTML Block) now sits at the top,
  right below the header, matching where the equivalent Icon/Data/Update/
  Dial/Title row already sits on the Device Config popup for an
  already-placed block. Custom device's popup also gained this row for the
  first time - Icon and Title were previously only settable as generic,
  easy-to-miss Field/Setting rows, and there was no way to hide the title
  at creation time at all.
- Every popup reachable from the Screen Editor's add-item tile menu (Custom
  device, Multi Device, Group, HTML Block, Slide button, Add device, and
  Widgets) now has a **Back** button to the left of Cancel/Close, matching
  the height of the buttons next to it, that returns to the tile menu
  instead of just closing.
- The wand/Screen Editor topbar icon has no function once the Screen Editor
  is already active (clicking it again does nothing); it's now hidden in
  favor of the **+** add-item icon in that same topbar slot while editing,
  and swaps back once editing closes.

v3.44.0 beta (17-8-2026)
-------------------------

* **Enhancements**

- Added **Group** and **HTML Block** to the Screen Editor's add-item menu,
  built the same way as **Multi Device**: a dedicated popup for creating one,
  and afterwards a regular, fully configurable entry in the Device Editor
  list (draggable, resizable, removable, with its own Device Config gear
  icon). Group wraps ``js/components/group.js`` (a client-side group/scene
  aggregate with instant status updates and a longpress popup - not the
  plain Domoticz Group/Scene device already offered by Add device); HTML
  Block wraps ``js/components/html.js`` (a static ``custom/*.html`` snippet).
  Neither offers a Dial option, since it doesn't apply to either block type.
- Multi Device's own popup, and the new Group/HTML Block popups, now expose
  Icon, Update and Title checkboxes directly in their own top section -
  matching the Icon/Data/Update/Dial/Title options every already-placed
  block gets from Device Config - instead of Multi Device silently hard
  coding a fixed icon and title visibility with no way to change either
  before saving.

v3.43.5 beta (16-8-2026)
-------------------------

* **Fixes**

- Fixed the Hayman clock rendering disproportionately large compared to the
  other three clock types: its face is mostly whitespace around a thin
  digit/label glyph, so fitting it to the full available block space the
  same way looked oversized. Its computed size is now halved on top of the
  usual fit-to-block/Scale calculation.
- Fixed the ``:`` separator dots sitting too high above the digits: they
  were vertically centered on the whole column (digit + label underneath),
  which pulls the center down away from the digit itself. Repositioned
  lower to align with the digit.

v3.43.4 beta (16-8-2026)
-------------------------

* **Fixes**

- Fixed the Flip clock leaving a lot of empty space below the digits: it
  was sized to fit inside a square (``min(availW, availH)``), badly
  under-using the available width for a clock face that is much wider than
  it is tall. Its size is now computed analytically from flipclock.css's
  own fixed per-``em`` multipliers, filling the block correctly.
- Fixed the Flip clock overflowing past its block's right edge: the block's
  own width also included the fixed-width icon column next to the clock,
  which is now excluded from the available-width calculation.
- Fixed the Hayman clock's ``:`` separator dots being inconsistently
  positioned between columns (most noticeable next to the wider day-label
  column): they were positioned as a percentage of each column's own
  (variable) width, and are now positioned in ``em`` instead, consistent
  regardless of a column's width.
- Fixed the Miniclock's text (weekday/date/time) never getting bigger or
  smaller when its block is resized - it now fits and live-resizes the
  same way the four dedicated clock widgets do, including overriding the
  theme's ``!important`` font-size/height rules. The fixed-height topbar
  Miniclock is unaffected.

v3.43.3 beta (16-8-2026)
-------------------------

* **Fixes**

- Fixed the Basic clock leaving large unused margins on a wide/short block:
  it was sized to fit inside a square (``min(availW, availH)``), instead of
  actually measuring the rendered text and filling both the width and
  height of the block.
- All four clock types (Basic, Station, Flip, Hayman) now keep resizing
  live while dragging a block in the Grid Layout Editor, instead of only
  picking up the new size after a save/reload - the same
  ``ResizeObserver``-based approach already used by the Dial widget.
- Fixed a runaway grow-remeasure-grow loop specific to grid screens: the
  clock components measured ``.dt_block``'s own box, which a grid item's
  automatic minimum size can inflate past its actual grid row (its
  ``height: 100%`` only *looks* fixed); each resize picked up that inflated
  height and grew it further. They now measure the outer, CSS-Grid-fixed
  mount point instead, same as Dial's ``_dialFitSize()``.
- Fixed the Flip clock not resizing at all when its block changed size.
- Fixed the Hayman clock rendering with an oversized, overlapping face
  (digits touching, the ':' separators hidden behind them) instead of
  scaling with the block.

v3.43.2 beta (16-8-2026)
-------------------------

* **Enhancements**

- The Clock widget's Size (px) field has been removed; **Scale** is now the
  only sizing control. All four clock types (Basic, Station, Flip, Hayman)
  always fit their block automatically, and Scale is a relative factor on
  top of that (still capped to the available block space).
- Basic clock's 42px font-size cap, Flip clock's 3.5-7em size range, and
  Hayman clock's ``scale``-only (max 100%) container width are removed, so
  all four clock types now scale proportionally with their block instead of
  plateauing well before the block is filled.
- The Widget Config **Clock type** dropdown now shows a small preview image
  of the selected clock style.

* **Fixes**

- Hayman clock's visible width now follows the same computed size as its
  font, instead of only reacting to Scale (and never past 100%) while Size
  had no effect on the visible clock at all.

v3.43.1 beta (16-8-2026)
-------------------------

* **Fixes**

- Changed the Separator/title block's default icon (``blocktitle``'s
  ``defaultCfg.icon``, the Device Editor's ``SEPARATOR_DEFAULT_ICON``, and
  its editor-list icon) and the Screen Editor add-menu's **Separator** tile
  icon from ``fa-heading`` to ``fa-divide``.

v3.43.0 beta (16-8-2026)
-------------------------

* **Improvements**

- Cleaned up Widget Config and Global Settings by removing duplicate, unused
  and misleading controls while keeping legacy configuration keys compatible.
- Improved compact grid layouts with two-row Separators, consistently sized
  configuration controls and a Garbage widget without an unnecessary scrollbar.

* **Fixes**

- Fixed Dial configuration state and resizing behavior.
- Separator icons now have a visible default and remain hidden after the Icon
  option is unchecked and saved.

v3.42.10 beta (15-8-2026)
---------------------------

* **Fixes**

- Restored full-size Dials in classic Bootstrap column layouts. Their
  content-driven, pre-render height is no longer treated as a fixed size;
  grid Dials still respect both dimensions of their assigned cell and now
  follow live Wizard/Layout Editor resizing in both directions.
- Device Config no longer shows the ineffective Icon and Title checkboxes for
  Dials. Existing values remain preserved when changing the device type.
- Existing iframe and Sunrise/Sunset blocks without an ``icon`` property keep
  their historic iconless appearance. Newly added Editor widgets retain the
  newer default icons by saving those icons explicitly in ``CONFIG.js``.
- Explicit custom/default icons remain supported for both widgets.

* **Code**

- Added Chromium regressions covering legacy column sizing/icon behavior and
  fixed grid-cell sizing with explicit icons.

v3.42.9 beta (15-8-2026)
--------------------------

* **Fixes**

- Domoticz log messages are now escaped before they are rendered, preventing
  device, plugin or script log text from being interpreted as dashboard HTML.
- The Domoticz log widget now keeps one namespaced set of scroll listeners
  instead of adding another pair on every refresh.
- Fixed Group blocks using ``switchMode: 'toggleoff'`` sending an undefined
  command instead of an explicit ``On`` or ``Off`` command.

* **Code**

- Updated the Playwright, Prettier and Webpack patch/minor versions and patched
  the indirect ``fast-uri``, ``nanoid`` and ``postcss`` build
  dependencies. The npm security audit now reports no vulnerabilities.
- Removed unused ``@babel/node`` and ``style-loader`` build dependencies, and
  moved the optional jQuery migration diagnostics package to development-only
  dependencies.
- Webpack now removes stale generated chunks from ``dist`` before producing a
  new build, while retaining legacy font formats for custom CSS compatibility.
  Removed the obsolete unreferenced ``dist/475.js`` chunk and duplicate legacy
  ``packagelock.json`` file.

v3.42.8 beta (14-8-2026)
--------------------------

* **Fixes**

- Fixed the **Settings** popup's Save button silently sending an empty
  payload to the server, so changing the theme (or any other setting) had
  no effect and the dashboard reverted to whatever was previously saved
  after the reload. A merge conflict resolution between two versions of
  ``saveSettings()`` left the code collecting changed values into a
  ``savePayload`` object, but still writing them onto the unrelated
  ``saveSettings`` function object instead — so the actual AJAX request
  body stayed ``{}``. All collected values (theme, CSS variable overrides,
  language, ``config_mode``, and every other setting) are now written to
  and read from the same object that is actually submitted.

v3.42.7 beta (14-8-2026)
--------------------------

* **Fixes**

- The web UI's **Update** button now recognizes Git's "insufficient
  permission for adding an object to repository database .git/objects" /
  "failed to write object" errors (seen when ``.git/objects`` is owned by a
  different user than the web-server process, e.g. after a manual ``git``
  run as root) and shows the same concrete ``chown``/permission-fix hint as
  the existing "permission denied" and "dubious ownership" cases, instead of
  just the raw Git error.

v3.42.6 beta (14-8-2026)
--------------------------

* **Enhancements**

- Added the **Liquid Glass Grey** and **Liquid Glass Blue** themes. Both are
  based on **Modern Dark** and keep its block rounding, spacing and block
  heights unchanged, but restyle blocks as frosted, translucent "liquid
  glass" panels — blurred backgrounds with a soft top sheen — in a neutral
  graphite/silver palette (Grey) and a deep navy/blue palette (Blue). Enable
  either with ``config['theme'] = 'liquid-glass-grey';`` or
  ``config['theme'] = 'liquid-glass-blue';``.

v3.42.5 beta (14-8-2026)
--------------------------

* **Fixes**

- Fixed the **News** widget never showing an icon even with the Widget
  Editor's Icon checkbox on. Checking Icon without typing a custom value
  relies on the widget's own default icon (the same pattern Weather already
  uses), but News had none to fall back to. Added a default news icon.
- Fixed the **Sunrise/Sunset** widget never showing an icon or a title.
  Unlike every other block, this widget builds its own markup instead of
  going through the shared container/icon/title rendering, so the Icon and
  Title options in its Widget Config popup were saved correctly but never
  actually painted onto the block. It now reads and renders them, using its
  own default icon (it had none to fall back to, unlike News/Weather) and a
  small, compact icon+title header row sitting above the sunrise/sunset
  line - like every other device/widget - instead of the oversized,
  full-width title style a large widget header uses. On grid screens that
  header and the sunrise/sunset line previously also got flexed onto a
  single, cramped row instead of stacking properly; both rows now stack
  vertically there too, matching column/classic mode. The header also sits
  flush at the top-left of the block now, matching every other device and
  widget, instead of being centered with empty space above it - but only
  when a header actually renders: with Icon and Title both off, the
  sunrise/sunset line is the block's only content again and correctly stays
  vertically centered on a grid screen, instead of also being pinned to the
  top.
- Fixed **Multi Device** and **Custom Device** creation silently defaulting
  the "Updated" (last update timestamp) option off, with no checkbox in
  either creation popup to turn it on — the only way to enable it was to
  create the device first, then separately reopen its Device Config popup.
  Both creation popups now show an Updated checkbox, checked by default.
- Fixed Custom Device and Multi Device's Icon checkbox not actually turning
  the icon off: unchecking it and saving left the icon showing (falling
  back to the underlying Domoticz device type's own default icon) and
  reopening Device Config showed the checkbox checked again. The Device
  Editor always writes a full replacement of the block, and the checkbox
  being off correctly sent an empty icon value, but the config writer
  skipped writing it whenever it was empty specifically for this block kind
  - so the property ended up simply absent instead of explicitly cleared,
  which read back as "never configured" rather than "off".

v3.42.4 beta (14-8-2026)
--------------------------

* **Fixes**

- Fixed multi-camera blocks rendering invisible (0-height) thumbnails on
  grid screens (`#132 <https://github.com/MadPatrick/dashticz/issues/132>`_).
  Each camera in the ``cameras`` array is mounted in its own wrapper element
  alongside its siblings, one level deeper than the grid CSS's normal
  ``min-height``/width rules reach (those only match a block's direct
  wrapper). Since each camera's own thumbnail image is absolutely
  positioned, its wrapper collapsed to zero height and the images never
  rendered. The per-camera wrappers on a grid screen now lay out side by
  side and fill the block's full height again, matching column/classic mode.
- Fixed the Device Editor's **Dial** checkbox producing a plain on/off
  switch instead of a gauge when applied to one value of a multi-value
  Domoticz device, e.g. a combined Temp + Humidity sensor (`#118
  <https://github.com/MadPatrick/dashticz/issues/118>`_ follow-up). Add
  Device offers such sensors as separate per-value rows (idx ``12_1``,
  ``12_2``, ...) so classic gauge/switch blocks can bind to a single value,
  but the Dial widget reads the whole Domoticz device to detect its type and
  couldn't resolve a sub-value idx to any device. Checking Dial on one of
  these rows now saves the device's base idx instead, so the dial correctly
  detects the combined sensor type and renders a gauge.

v3.42.3 beta (13-8-2026)
--------------------------

* **Fixes**

- Fixed a once-set iframe (or camera/log/timegraph) height on a grid screen
  being impossible to remove again via Device Editor (`#100
  <https://github.com/MadPatrick/dashticz/issues/100>`_ follow-up). An
  earlier fix in 3.42.1 stopped Widget Editor from resending a stale cached
  height, but Device Editor had its own separate copy of the same caching
  bug: it hydrated a widget's stored height from CONFIG.js unconditionally
  and resent it on every Device Editor save — including a save that only
  touched a completely different device — silently reinstating a height the
  user had already cleared via the widget's own field. Grid mode now only
  keeps a height a widget's own field explicitly (re)sets on that save;
  column mode is unaffected.

v3.42.2 beta (13-8-2026)
--------------------------

* **Fixes**

- Fixed the Domoticz log widget triggering a spurious outer scrollbar on
  grid screens, even when the tile visually had enough room (`#105
  <https://github.com/MadPatrick/dashticz/issues/105>`_). ``.log .items``
  already scrolls internally on purpose once there are more log lines than
  fit, but the outer ``.dt_block`` was only floored by the generic grid
  ``min-height: 100%`` rule, not capped — so a fraction of extra height from
  title/content rounding let it grow past its own grid row, and the grid
  item's own ``overflow: auto`` then added a second, unwanted scrollbar
  around the whole tile. Capped the log widget's block to its row height,
  matching the same fix already applied to the iFrame/WAQI/clock widgets.

v3.42.0 beta (12-8-2026)
--------------------------

* **Enhancements**

- Device Editor: the Device Config popup now has a **Dial** checkbox next to
  Icon/Data/Updated, writing ``type: 'dial'`` to CONFIG.js so the block
  renders using the :ref:`dial <dial>` block instead of the default one.
  Applies to plain devices, Domoticz groups/scenes, dummy blocks and Custom
  devices — all of which share this same popup. ``type`` itself stays a
  rejected/reserved name in the Custom fields section; the checkbox is the
  only way to set it. Dial-specific parameters (``color``, ``min``, ``max``,
  ``subtype``, ``values``, etc.) remain configurable via Custom fields.
- Checking the **Dial** checkbox now shows an inline hint explaining that
  the remaining dial options are set manually via Custom fields, with a
  link to the dial documentation.
- Documented the dial block's previously-undocumented ``scale`` parameter
  (a multiplier on the dial's automatically measured/configured size) as
  the supported way to manually fine-tune a dial that still renders too
  large/small for its block. It isn't a reserved Custom field name, so it
  already works via the Device Editor's Custom fields with no code change.

* **Fixes**

- Dial blocks could render far larger than their block (up to a hardcoded
  240px font-size) whenever the automatic size measurement failed — for
  example on a block sitting on a screen that isn't the active tab at mount
  time, where the container is ``display:none`` and has zero measured
  width. The dead ``height < 0`` guard in ``js/components/dial.js`` never
  actually caught this (a failed measurement yields ``NaN``/``0``, never a
  negative number), so ``fontsize`` became ``NaN``, the resulting inline
  style was invalid and got dropped, and the oversized CSS default won.
  The guard now correctly detects a failed measurement and falls back to a
  sane default (also lowered the CSS backstop default from 240px to 100px).
- The dial's default face/content area (``.dial-container``/``.dial-center``)
  left a visibly roomy margin before the outer ring. Tightened from 90%/85%
  to 93%/88% — still comfortably inside the 95% already used for ``fixed``
  dials, so the ring, needle and numbers keep their existing clearance.
- Dial sizing now measures its actual rendered block (both width **and**
  height, using the smaller of the two — the dial is always a perfect
  circle) via a live ``ResizeObserver``, instead of only re-measuring width
  at mount time. Resizing a dial's block in the editor (grid row/column span
  or classic column width) now updates the dial live, matching what you see
  right after saving instead of only after a reload.
- Fixed two further sources of scrollbars around a dial block on grid
  screens (``.dt-grid-item`` scrolls on overflow):

  - ``getContainer()`` gives a block's *outer* wrapper the component name as
    a CSS class too, which for the dial component is literally ``dial`` — so
    the live-resize code's ``.dial`` selector also matched that outer
    wrapper (not just the template's own inner circle) and inflated its
    (and everything em-sized inside it) font-size, overflowing the block
    sideways. Scoped to ``.dt_content .dial``, matching the dial's own CSS.
  - The colored ring/slice indicator is rotated (``transform:
    rotate(-140deg)``), so its axis-aligned bounding box is wider/taller
    than its own size; the old ``clip: rect()`` used to shape it into a
    pie-slice only clips *painting*, not layout, so the full rotated box
    still counted toward the scrollable area of every ancestor. Wrapped in
    a new ``.dial-ring-clip`` container (not ``.dial`` itself, which would
    also clip the dial's own intentional glow/flash effect).
  - The needle (drawn via a CSS border-triangle, deliberately a little
    longer than ``.dial``'s own radius so its tip reaches the ring) was
    never clipped by anything either, contributing a small but constant
    overflow regardless of the needle's rotation angle/device value —
    confirmed with a dimmer dial swept across its full 0–100% range.
    Wrapped in a new ``.dial-needle-clip`` container.

v3.41.7 beta (12-8-2026)
--------------------------

* **Fixes**

- Screen Editor: the config-cog for a widget that also carries its own
  ``idx`` (TimeGraph, whose catalog entry uses ``idx`` as the fallback
  device for value rows without one) opened that idx's plain Device
  Config popup instead of the widget's own Widget Config. ``_resolveBlock``
  now checks whether a block is a recognised widget before falling
  through to its idx-based device-detection fallback.
- Multi Device and Custom Device now get a sensible default icon
  (matching their own popup's header icon) when the user doesn't type one
  in — previously the saved block carried no ``icon`` field at all, and
  since these devices aren't a real, recognised Domoticz device type there
  was nothing else to derive an icon from, so the tile rendered with none.

v3.41.6 beta (11-8-2026)
--------------------------

* **Fixes**

- Domoticz log widget: the Widget Config editor's grid-mode default size
  used to scale proportionally from the widget's column-mode width (12,
  i.e. full width), producing a short full-width strip. It now defaults to
  an 8x8 grid cell (in grid columns/rows) instead, independent of the
  column-mode default the widget still uses outside grid screens.

v3.41.5 beta (11-8-2026)
--------------------------

* **Enhancements**

- Device Editor: the Device Config popup now has a **Title** checkbox next
  to Icon/Data/Updated, toggling ``hide_title`` the same way the Widget
  Config editor's Title checkbox already does. Title text remains a typed
  Field/Setting; this only controls whether it's shown. Applies to plain
  devices, the separator/title bar block (**Tussenbalk**), Slide button,
  Multi Device, and Custom device — all of which share this same popup.

v3.41.4 beta (11-8-2026)
--------------------------

* **Fixes**

- Clock widgets (Basic clock, Flip clock, Station clock, Hayman clock)
  ignored the Widget Config editor's Title checkbox (and a hand-written
  ``hide_title``/``title`` in ``CONFIG.js``): each clock's own render
  overwrote ``.dt_content``/``.dt_block``, which also holds the
  ``.dt_title`` element that ``dashticz.js`` builds from
  ``block.title``/``block.hide_title``, wiping it out again right after
  it was set. The clocks now render into ``.dt_state`` instead, leaving
  the title alone.

v3.41.3 beta (11-8-2026)
--------------------------

* **Code**

- Fixed a stale ``$forceClone`` regex assertion in
  ``tests/php-security.test.js`` (still expected the pre-issue-#98 shape of
  that check).
- Removed ``tests/phpsecurity.test.js``, a stale duplicate of
  ``tests/php-security.test.js`` that had drifted out of sync with it.

v3.41.2 beta (11-8-2026)
--------------------------

* **Enhancements**

- Radio Widget Config: each station row now only has a Remove button. A
  single Add station button is shown once, next to the Display options
  checkboxes, with the station list between the checkboxes and the Custom
  fields section.
- Grid layout: lowered the minimum block height from 4 rows to 2 (already
  proven safe for the Miniclock widget). A block whose content needs more
  room than that simply gets its own internal scrollbar.

* **Fixes**

- Sunrise/Sunset: resizing the widget's height in a grid layout no longer
  reverts to a small block. ``renderSunrise`` builds its own markup, which
  did not receive the existing rule that lets other blocks fill their
  reserved grid cell; only the visible content was affected, the stored
  size was never actually lost.

v3.41.1 beta (11-8-2026)
--------------------------

* **Enhancements**

- Added four existing Dashticz Special Widgets to the graphical Widget
  Config editor as a configuration/management layer on top of their
  existing implementations — none of them were rewritten:

  - **Domoticz log** (:ref:`customlog`): Title, Width, optional Height,
    optional Aspect ratio, Scroll timeout, and a checkbox for ``ascending``
    ("newest log lines at the bottom"). Written to ``blocks['log']``, so
    ``columns[4] = {blocks: ['log']}`` keeps working unchanged.
  - **OWM widget** (:ref:`owmwidgets`): API key, Layout (1-24), City and
    Country, each optional. An empty API key/City/Country is never written
    to the block, so ``config['owm_api']``/``owm_city``/``owm_country``
    keep working as the fallback.
  - **Sunrise / Sunset** (:ref:`sunrise`): added with only the generic
    title/width/custom-fields options, matching how little the existing
    ``sunrise`` block actually uses. Written under the bare ``sunrise``
    key, so ``columns[1]['blocks'] = ['sunrise']`` keeps working.
  - **Timegraph** (:ref:`timegraph`): Main IDX, Duration, Height, X/Y-axis
    label counts, X-axis labels toggle, Animation, Line tension, Point
    radius, and a dynamic, unlimited list of values. Each value row has its
    own optional IDX, a Value (e.g. ``Temp``, ``Usage``, or the special
    ``NettUsage``) and an optional Label — a value row without its own IDX
    falls back to the block's main IDX, matching ``DT_timegraph``'s
    existing fallback logic, so both single-device and multi-device
    Timegraphs can be built from the GUI.

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
* Settings Update: Git commands pass ``safe.directory`` for the Dashticz checkout so updates work when the web-server user does not own the files (e.g. Docker / www-data). Permission errors show a fix hint; use ``tools/install-dashticz-write-access.sh --git-update`` to grant write access. ``install.sh`` runs that helper after a fresh clone so first installs can use Settings → Update.

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
