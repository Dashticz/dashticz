/* global Domoticz settings columns columns_standby blocks blocktypes screens standby_screen DashticzScreenSwitcher standbyActive language getBlockTypesBlock DashticzLayoutEditor */
// eslint-disable-next-line no-unused-vars
var DashticzDeviceEditor = (function () {
  'use strict';

  /* ── state ──────────────────────────────────────────────────── */
  /* Composite keys: '493' for plain devices, '1298_1' for sub-devices */
  var managedDevices = []; // composite keys managed by the device editor
  var managedOrder = []; // device:<ck> and widget:<id> in screen order
  var managedWidgets = {}; // order key -> widget metadata
  var managedSpecials = {}; // order key -> dummy/title block metadata

  /* Special-block kind groupings shared by _specialFromReference(),
     _showConfigPopup() and _buildDevicePayload() below. Centralizing
     these here means adding another repeatable special (see the iFrame/
     Calendar/Public transport/Timegraph/TV Guide additions for the
     pattern - each is a `kind:'special'` entry in managedSpecials, same
     mechanism as Group/HTML Block/LMS) touches one array per grouping
     instead of a hand-duplicated `kind === 'x' || kind === 'y' || ...`
     chain repeated at every call site - less code to keep in sync, and
     far less likely to conflict with a concurrent branch adding a
     different kind to the same chain. */

  // No real Domoticz-device idx of their own (a plain numeric idx would
  // be meaningless for these). 'group' is handled separately just below
  // its own idx is optional-but-real; 'custom'/'dummy'/'timegraph' keep
  // their real parsed idx.
  var IDX_LESS_SPECIAL_KINDS = [
    'title',
    'slidebutton',
    'html',
    'iframe',
    'calendar',
    'publictransport',
    'xmltvguide',
    'lms',
  ];

  // Title is optional (blank is fine) rather than required.
  var TITLE_OPTIONAL_SPECIAL_KINDS = [
    'custom',
    'group',
    'html',
    'iframe',
    'calendar',
    'publictransport',
    'timegraph',
    'xmltvguide',
    'lms',
  ];

  // Defaults to a 6-column width instead of the generic 3-column
  // default - their content needs more horizontal room.
  var WIDE_DEFAULT_SPECIAL_KINDS = [
    'lms',
    'iframe',
    'calendar',
    'timegraph',
    'xmltvguide',
  ];

  // No Dial/Bar/Slider visual mode of their own, and only Icon/Last
  // update/Title among the Device Config display options (no Data/
  // Switch) - every special except a plain dummy/custom device.
  var NO_DIAL_SPECIAL_KINDS = [
    'group',
    'html',
    'iframe',
    'calendar',
    'publictransport',
    'timegraph',
    'xmltvguide',
    'lms',
  ];

  // _buildDevicePayload()'s shared "just Icon + Last update (+ Group's
  // own optional idx)" branch - a subset of NO_DIAL_SPECIAL_KINDS
  // excluding Timegraph/LMS, which need their own dedicated payload
  // branches (a required idx + explicit type for Timegraph, several
  // dedicated connection fields for LMS) despite sharing the same popup
  // option set.
  var SIMPLE_ICON_PAYLOAD_KINDS = [
    'group',
    'html',
    'iframe',
    'calendar',
    'publictransport',
    'xmltvguide',
  ];
  var deviceNames = {}; // composite key -> device name
  var deviceWidths = {}; // composite key -> block width (1..12)
  var deviceHeights = {}; // composite key -> optional block height
  var deviceTitles = {}; // composite key -> optional title override
  var deviceOptions = {}; // composite key -> icon/hide_data/last_update/switch
  var deviceRefs = {}; // composite key -> exact block reference on the active screen
  var deviceTitleVisible = {}; // composite key -> title shown/hidden
  var deviceCustomFields = {}; // composite key -> editable extra CONFIG.js fields
  var devicePreservedFields = {}; // hidden CONFIG.js fields (for example c) that must survive saves
  var widgetWidths = {}; // widget order key -> block width (1..12)
  var widgetHeights = {}; // widget order key -> optional block height
  var widgetTitles = {}; // widget order key -> optional title override
  var widgetOptions = {}; // widget order key -> icon/hide_data/last_update
  var widgetTitleVisible = {}; // widget order key -> title shown/hidden
  var pendingWidgetSettings = {}; // full Widget Config settings edited from Device Editor
  var editorMode = 'devices'; // devices, dummy or title
  // Only true when open() (the Add items tile menu's "Add device" tile) is
  // the current opener - openConfig()/openSpecial() build the same modal
  // from a different entry point (a tile's own gear icon, no tile menu to
  // return to), so their Back button must stay off.
  var openedFromAddMenu = false;
  var gridMode = false;
  var gridConfig = null;
  var gridPositions = {}; // order key -> {x,y,w,h}
  var gridRefs = {}; // order key -> block reference
  var gridExtras = []; // non-device/widget blocks
  var TITLE_GRID_HEIGHT = 2;
  var SEPARATOR_DEFAULT_ICON = 'fas fa-divide';
  var customImageListPromise = null;
  // Snapshot of managedOrder taken when this popup opened, only while the
  // Layout Editor was already open underneath it. Used by _save() to graft
  // newly added devices/widgets/separators into that still-open editor
  // instead of persisting immediately and reloading (see
  // _graftIntoLayoutEditor). Null whenever the Layout Editor isn't active.
  var layoutEditorBaseline = null;

  function _translations() {
    var configured =
      typeof language !== 'undefined' &&
      language.settings &&
      language.settings.deviceeditor
        ? language.settings.deviceeditor
        : {};
    return $.extend(
      {
        editor_title: 'Device Editor',
        configured_items: 'Devices and widgets in Dashticz',
        empty_items: 'No devices or widgets configured in Dashticz.',
        add_item: 'Add device or block',
        select_item: 'Select a device or block',
        dummy_device: 'Dummy device',
        title_block: 'Title',
        enter_idx: 'Enter IDX',
        enter_title: 'Enter title',
        invalid_idx: 'Enter a valid positive IDX.',
        invalid_title: 'Enter a title.',
        width: 'Width',
        title: 'Title',
        display_options: 'Display options',
        icon: 'Icon',
        hide_data: 'Hide data',
        last_update: 'Last update',
        switch: 'Switch',
        dial: 'Dial',
        dial_hint:
          'Dial type selected. Set the remaining dial options (color, min/max, subtype, values, etc.) manually via Custom fields below.',
        dial_hint_link: 'Dial documentation',
        dial_bar: 'Bar',
        dial_barsteps: 'Steps',
        dial_barsteps_help:
          'Number of segments the Bar is divided into (default 10).',
        invalid_barsteps: 'Enter a positive number of steps.',
        show_title: 'Title',
        device_config: 'Device Config',
        widget_config: 'Widget Config',
        configure: 'Configure',
        custom_fields: 'Custom fields',
        custom_fields_help:
          'Field and Setting are written as typed block parameters in CONFIG.js.',
        custom_images: 'Custom images',
        loading_images: 'Loading images…',
        no_custom_images: 'No custom images found.',
        custom_images_error: 'Unable to load custom images.',
        custom_devices: 'Custom devices',
        slide_button: 'Slide button',
        slide_button_name: 'Button name',
        slide_button_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        slide_button_key: 'Key',
        slide_button_title: 'Title',
        slide_button_screen: 'Screen',
        slide_button_icon: 'Icon',
        slide_button_full_image:
          'Full-width image (fills the block, e.g. a webcam or radar image)',
        invalid_slide_button_name: 'Enter a valid unique button name.',
        invalid_slide_target: 'Enter a valid positive screen number.',
        custom_device_name: 'Device name',
        custom_device_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        custom_device_title: 'Title',
        custom_device_options: 'Device options',
        custom_device_values_help: 'For arrays or objects, enter valid JSON.',
        invalid_custom_device_name: 'Enter a valid unique device name.',
        multi_device: 'Multi Device',
        multi_device_name: 'Device name',
        multi_device_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        multi_device_idx: 'Main IDX',
        multi_device_idx_help:
          'Used by every value row below that does not set its own IDX.',
        multi_device_title: 'Title',
        multi_device_values: 'Values',
        multi_device_values_help:
          'Combine values from the main device and/or other devices in one block.',
        multi_device_row_idx: 'IDX (optional)',
        multi_device_row_value: 'Value, e.g. <Usage>',
        add_value_row: 'Add value',
        remove_value_row: 'Remove value',
        invalid_multi_device_name: 'Enter a valid unique device name.',
        invalid_value_row:
          'Enter a value placeholder (e.g. <Usage>) for every row.',
        group_block: 'Group',
        group_name: 'Group name',
        group_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        group_idx: 'Group/Scene IDX',
        group_idx_help:
          'Optional. Domoticz group or scene ID whose devices are grouped.',
        group_devices: 'Devices',
        group_devices_help:
          'Comma-separated Domoticz device IDs to group (used when IDX is empty).',
        group_title: 'Title',
        invalid_group_name: 'Enter a valid unique group name.',
        invalid_group_devices:
          'Enter a Group/Scene IDX or at least one valid device ID.',
        html_block: 'HTML Block',
        html_block_name: 'Block name',
        html_block_name_help: 'Used as the blocks[...] key in CONFIG.js.',
        html_block_file: 'HTML file',
        html_block_file_help:
          'Filename in the custom/ folder, e.g. widget.html.',
        html_block_title: 'Title',
        html_block_border: 'Margin',
        invalid_html_block_name: 'Enter a valid unique block name.',
        invalid_html_block_file:
          'Enter a valid html filename (relative to custom/).',
        lms_block: 'Lyrion Music Server',
        lms_title: 'Title',
        lms_server: 'Server / IP',
        lms_port: 'Port',
        lms_username: 'Username',
        lms_password: 'Password',
        lms_credentials_help:
          'Only needed when Lyrion Music Server authentication is enabled.',
        lms_test_connection: 'Test connection',
        lms_testing_connection: 'Connecting…',
        lms_connection_ok: 'Connected to Lyrion Music Server',
        lms_players_found: 'player(s) found',
        lms_connection_failed: 'Unable to connect to Lyrion Music Server',
        lms_auth_failed: 'Authentication failed',
        lms_no_players: 'No LMS players found',
        lms_player: 'Player',
        lms_player_placeholder: 'Test the connection to list players',
        lms_refresh_interval: 'Refresh interval',
        lms_hide_when_off: 'Hide block when player is off',
        invalid_lms_server: 'Enter the Lyrion Music Server address.',
        invalid_lms_port: 'Enter a valid port (1-65535).',
        invalid_lms_player: 'Test the connection and select a player.',
        seconds: 'seconds',
        separator: 'Separator',
        icon_requires_checkbox: 'Enable Icon before using the icon field.',
        field: 'Field',
        setting: 'Setting',
        add_field: 'Add field',
        remove_field: 'Remove field',
        invalid_field: 'Enter a valid Field and Setting.',
        duplicate_field: 'This field is duplicated or reserved.',
        invalid_setting: 'Setting contains invalid JSON.',
        cancel: 'Cancel',
        ok: 'OK',
        remove: 'Remove block',
        close: 'Close',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Saved!',
        drag_to_reorder: 'Drag to reorder',
        widget: 'Widget',
        widget_prefix: 'Widget -',
        managed_widget: 'Remove this widget from the Widgets menu',
        select_aria: 'Select device to add',
        column_width: 'Column width (1-12)',
        add_device: 'Add device',
        save_failed: 'Devices could not be saved automatically.',
        error_prefix: 'Error:',
      },
      configured
    );
  }

  /* ── public API ─────────────────────────────────────────────── */
  function open() {
    editorMode = 'devices';
    openedFromAddMenu = true;
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _buildAndShowModal();
  }

  function openSpecial(kind) {
    editorMode = kind === 'title' ? 'title' : 'dummy';
    openedFromAddMenu = false;
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _buildAndShowModal();
  }

  /** Open Device Config directly for a rendered block while retaining the
   * normal Device Editor as the save parent shown after the config popup closes. */
  function openConfig(reference) {
    editorMode = 'devices';
    openedFromAddMenu = false;
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();

    var prepared = _prepareManagedDeviceState();
    var orderKey = '';
    var special = _specialFromReference(reference);
    if (special && managedSpecials[special.orderKey]) {
      orderKey = special.orderKey;
    } else {
      var definition =
        typeof reference === 'string' &&
        typeof blocks !== 'undefined' &&
        blocks[reference]
          ? blocks[reference]
          : reference;
      var ck = _toCompositeKey(definition);
      if (ck && managedOrder.indexOf(_deviceOrderKey(ck)) > -1) {
        orderKey = _deviceOrderKey(ck);
      }
    }
    if (!orderKey) return false;

    $('#deviceeditorpopup').remove();
    $('body').append(_buildModalHtml(prepared.available, prepared.allDomoticz));
    _attachHandlers(prepared.available, prepared.allDomoticz);
    _showConfigPopup(orderKey, document.getElementById('deviceeditorpopup'));
    return true;
  }

  /** Open Device Config directly from the Layout Editor, for one rendered
   * grid tile. Unlike openConfig() above, this never builds/shows the full
   * Device Editor as a "parent" to return to - the Layout Editor stays open,
   * untouched, underneath this popup the whole time, and simply regains
   * focus once the popup closes. Confirmed changes are persisted right away
   * via _saveDeviceConfigOnly() (blocksOnly), so nothing depends on the
   * user later finding a Save button on a screen they never opened. Mirrors
   * DashticzWidgetEditor.openLayoutConfig(). */
  function openLayoutConfig(reference) {
    editorMode = 'devices';
    openedFromAddMenu = false;
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init(true);
    _prepareManagedDeviceState();

    var orderKey = '';
    var special = _specialFromReference(reference);
    if (special && managedSpecials[special.orderKey]) {
      orderKey = special.orderKey;
    } else {
      var definition =
        typeof reference === 'string' &&
        typeof blocks !== 'undefined' &&
        blocks[reference]
          ? blocks[reference]
          : reference;
      var ck = _toCompositeKey(definition);
      if (ck && managedOrder.indexOf(_deviceOrderKey(ck)) > -1) {
        orderKey = _deviceOrderKey(ck);
      }
    }
    if (!orderKey) return false;

    _showConfigPopup(orderKey, null, { persistOnly: true });
    return true;
  }

  /** Open the dedicated Custom devices popup used by the Screen Editor add menu. */
  function openCustom() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showCustomDevicePopup();
  }

  /** Open the dedicated Multi Device popup used by the Screen Editor add menu. */
  function openMultiDevice() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showMultiDevicePopup();
  }

  /** Open the dedicated Group block popup used by the Screen Editor add menu. */
  function openGroup() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showGroupPopup();
  }

  /** Open the dedicated HTML Block popup used by the Screen Editor add menu. */
  function openHtmlBlock() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showHtmlBlockPopup();
  }

  /** Open the dedicated iFrame popup used by the Screen Editor add menu. */
  function openIframe() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showIframePopup();
  }

  /** Open the dedicated Calendar popup used by the Screen Editor add menu. */
  function openCalendar() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showCalendarPopup();
  }

  /** Open the dedicated Public transport popup used by the Screen Editor
   * add menu. */
  function openPublicTransport() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showPublicTransportPopup();
  }

  /** Open the dedicated Timegraph popup used by the Screen Editor add menu. */
  function openTimegraph() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showTimegraphPopup();
  }

  /** Open the dedicated TV Guide popup used by the Screen Editor add menu. */
  function openXmltvguide() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showXmltvguidePopup();
  }

  /** Open the dedicated Lyrion Music Server popup used by the Screen Editor
   * add menu. */
  function openLms() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showLmsPopup();
  }

  /** Open the dedicated Slide button popup used by the Screen Editor add menu. */
  function openSlideButton() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();
    _showSlideButtonPopup();
  }

  /** Add a full-width separator immediately, without opening the Device Editor. */
  function addSeparator() {
    editorMode = 'devices';
    gridMode = _activeScreenDom().hasClass('dt-grid-screen');
    _init();
    _prepareManagedDeviceState();

    var t = _translations();
    var reference = _nextSpecialReference('title');
    var orderKey = _specialOrderKey(reference);
    managedSpecials[orderKey] = {
      kind: 'special',
      specialType: 'title',
      orderKey: orderKey,
      reference: reference,
      definition: {},
      idx: null,
      title: t.separator,
      width: 12,
      height: 120,
      showTitle: true,
      options: {
        icon: true,
        iconValue: SEPARATOR_DEFAULT_ICON,
        hide_data: false,
        last_update: false,
        switch: false,
      },
      customFields: [
        {
          field: 'title',
          setting: t.separator,
          value: t.separator,
          system: true,
        },
      ],
      preservedFields: {},
    };
    managedOrder.push(orderKey);
    _save();
  }

  /* ── initialise managed-device list from ALL current Dashticz devices ── */
  /* preserveDeviceState (only passed by openLayoutConfig()) keeps
   * deviceTitles/deviceOptions/deviceTitleVisible/deviceCustomFields/
   * devicePreservedFields and any already-known managedSpecials entry
   * instead of wiping them. openLayoutConfig() reopens this popup once per
   * edited device without a page reload in between (an in-progress
   * drag/resize in the Layout Editor must survive it), so blocks[]/
   * columns[] on the client still reflect the *pre-edit* state of any
   * device/special already confirmed and persisted via
   * _saveDeviceConfigOnly() earlier in the same session. Re-deriving from
   * them here would silently revert that earlier edit the next time this
   * device/special's own entry gets resent as part of a later save (#?). */
  function _init(preserveDeviceState) {
    managedDevices = [];
    managedOrder = [];
    managedWidgets = {};
    if (!preserveDeviceState) managedSpecials = {};
    deviceNames = {};
    deviceWidths = {};
    deviceHeights = {};
    if (!preserveDeviceState) {
      deviceTitles = {};
      deviceOptions = {};
      deviceTitleVisible = {};
      deviceCustomFields = {};
      devicePreservedFields = {};
    }
    deviceRefs = {};
    widgetWidths = {};
    widgetHeights = {};
    widgetTitles = {};
    widgetOptions = {};
    widgetTitleVisible = {};
    pendingWidgetSettings = {};
    gridPositions = {};
    gridRefs = {};
    gridExtras = [];
    gridConfig = gridMode ? _readGridConfig() : null;

    (gridMode ? _getAllManagedGridItems() : _getAllManagedItems()).forEach(
      function (item) {
        managedOrder.push(item.orderKey);
        if (gridMode) {
          gridPositions[item.orderKey] = item.grid;
          gridRefs[item.orderKey] = item.reference;
        }
        if (item.kind === 'widget') {
          managedWidgets[item.orderKey] = item;
          widgetWidths[item.orderKey] = _parseWidth(item.definition.width);
          // Never read a saved height back in here on a grid screen: _widgetPayload
          // resends this on every Device Editor save (including a save that only
          // touches a different device), so a height read back from a widget with
          // no way to edit it here (e.g. camera) - or read once and then left
          // stale after the user clears it via its own Widget Config field
          // (iframe/log/timegraph) - got silently reinstated forever with no way
          // to remove it (#100 follow-up, this time in Device Editor's own
          // resubmission rather than Widget Editor's). Grid mode only keeps a
          // height a widget's own field explicitly (re)sets on this save; column
          // mode still needs the existing height to keep packing columns.
          widgetHeights[item.orderKey] = gridMode
            ? null
            : _parseHeight(item.definition.height);
          widgetTitles[item.orderKey] = String(
            item.definition.title || item.title || ''
          );
          var legacyImplicitIcon =
            (item.id === 'iframe' || item.id === 'sunrise') &&
            typeof item.definition.icon === 'undefined';
          widgetOptions[item.orderKey] = {
            icon:
              (typeof item.definition.image === 'string' &&
                item.definition.image !== '') ||
              (!legacyImplicitIcon && item.definition.icon !== ''),
            iconValue:
              typeof item.definition.icon === 'string' &&
              item.definition.icon !== ''
                ? item.definition.icon
                : null,
            hide_data: item.definition.hide_data === true,
            last_update: item.definition.last_update === true,
          };
          widgetTitleVisible[item.orderKey] =
            item.definition.hide_title !== true;
        } else if (item.kind === 'special') {
          if (!preserveDeviceState || !managedSpecials[item.orderKey]) {
            managedSpecials[item.orderKey] = item;
          }
        } else {
          managedDevices.push(item.ck);
          deviceRefs[item.ck] = item.reference;
        }
      }
    );

    layoutEditorBaseline =
      typeof DashticzLayoutEditor !== 'undefined' &&
      DashticzLayoutEditor.isActive &&
      DashticzLayoutEditor.isActive()
        ? managedOrder.slice()
        : null;
  }

  /* ── composite key helpers ──────────────────────────────────── */
  /* Build a composite key from a base idx and optional sub-index  */
  function _ck(idx, subidx) {
    return subidx ? idx + '_' + subidx : String(idx);
  }

  /* Parse a composite key back into {idx, subidx} */
  function _parseCk(ck) {
    /* group/scene key e.g. 's1' */
    if (/^s\d+$/.test(String(ck))) {
      return { idx: String(ck), subidx: 0 };
    }
    var parts = String(ck).split('_');
    return {
      idx: parseInt(parts[0], 10),
      subidx: parts.length === 2 ? parseInt(parts[1], 10) : 0,
    };
  }

  /* Return true when ck is a group/scene composite key (e.g. 's1') */
  function _isGroupCk(ck) {
    return /^s\d+$/.test(String(ck));
  }

  /* Sort rank for available-device list: Groups first, Scenes second, Devices last */
  function _typeOrder(type) {
    if (type === 'Group') return 0;
    if (type === 'Scene') return 1;
    return 2;
  }

  /* Sort available[] by category (Group < Scene < Device) then alphabetically */
  function _sortAvailable(list) {
    list.sort(function (a, b) {
      var diff = _typeOrder(a.type) - _typeOrder(b.type);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
  }

  /* Convert a block reference (number / string / object) to a composite key */
  function _toCompositeKey(b) {
    if (typeof b === 'number' && b > 0) return String(b);
    if (typeof b === 'string') {
      var n = parseInt(b, 10);
      /* pure numeric string e.g. '493' */
      if (n > 0 && String(n) === b) return b;
      /* group/scene key e.g. 's1' */
      if (/^s\d+$/.test(b)) return b;
      /* compound string e.g. '1298_1' */
      var parts = b.split('_');
      if (parts.length === 2) {
        var base = parseInt(parts[0], 10);
        var sub = parseInt(parts[1], 10);
        if (base > 0 && sub > 0) return b;
      }
      return null;
    }
    if (typeof b === 'object' && b !== null) {
      /* b.idx may be a compound string like '907_1' written by saveblocks.php */
      if (typeof b.idx === 'string') {
        var ckFromStr = _toCompositeKey(b.idx);
        if (ckFromStr) return ckFromStr;
      }
      var idx = parseInt(b.idx, 10);
      if (idx > 0) {
        var subidx =
          typeof b.subidx === 'number' && b.subidx > 0 ? b.subidx : 0;
        return _ck(idx, subidx);
      }
    }
    return null;
  }

  /* ── collect every managed device from all columns ─────────── */
  // Recognise both the historic Dial+subtype syntax and the shorthand
  // type:'bar'. The editor saves the historic form for server compatibility.
  function _isBarDefinition(definition) {
    if (!definition) return false;
    var type = String(definition.type || '').toLowerCase();
    var subtype = String(definition.subtype || '').toLowerCase();
    return type === 'bar' || (type === 'dial' && subtype === 'bar');
  }

  function _deviceOrderKey(ck) {
    return 'device:' + ck;
  }

  function _widgetOrderKey(id) {
    return 'widget:' + id;
  }

  function _specialOrderKey(reference) {
    return 'special:' + reference;
  }

  /* Build the same immutable reference that saveblocks.php uses. Supplying the
     reference in the initial request keeps a newly added device addressable
     throughout the complete blocks -> layout save chain. */
  function _stableDeviceReference(ck) {
    if (_isGroupCk(ck)) return String(ck);
    var parsed = _parseCk(ck);
    return 'device_' + parsed.idx + (parsed.subidx ? '_' + parsed.subidx : '');
  }

  /* Recognise editor-created dummy and title blocks without treating every
     hand-written block with hide_data as a dummy device. */
  function _specialFromReference(reference) {
    if (
      typeof reference !== 'string' ||
      typeof blocks === 'undefined' ||
      !blocks[reference]
    ) {
      return null;
    }
    var definition = blocks[reference];
    var kind = null;
    if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      String(definition.type || '').toLowerCase() === 'blocktitle'
    ) {
      kind = 'title';
    } else if (/^dummyblock_\d+$/.test(reference)) {
      kind = 'dummy';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      typeof definition.idx === 'undefined' &&
      parseInt(definition.slide, 10) > 0
    ) {
      // Keep slide-only helper buttons editable in Device/Layout Editor.
      kind = 'slidebutton';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      !/^device_\d+(?:_\d+)?$/.test(reference) &&
      (!definition.type ||
        definition.type === 'dial' ||
        definition.type === 'bar' ||
        definition.type === reference) &&
      parseInt(definition.idx, 10) > 0
    ) {
      // A device with a hand-picked block key is a Custom device. Recognising
      // it before the normal IDX path preserves that key on later editor saves.
      // A Custom device rendered with Dial or Bar still carries an explicit
      // type, so those display types must not be excluded like widget types.
      // Once rendered, blocks.js's convertBlock() stamps block.type with the
      // block's own storage key as a dispatch hint (see e.g. the 'sunrise'/'log'
      // key-as-type convention), and dashticz.js writes that back into blocks[key].
      // For a Custom/Multi Device that hint is never a real widget type, so
      // definition.type === reference must not be treated as one either -
      // otherwise the Settings button opens the wrong (shared-idx) device once
      // the tile has rendered at least once (#115).
      kind = 'custom';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      String(definition.type || '').toLowerCase() === 'group'
    ) {
      // Dashticz's own client-side group/scene aggregate block (js/components/group.js),
      // not the plain Domoticz Group/Scene device the normal Add device dropdown
      // already offers.
      kind = 'group';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      !definition.type &&
      typeof definition.htmlfile === 'string' &&
      definition.htmlfile !== ''
    ) {
      // Matches js/components/html.js's own canHandle(): dispatched purely on a
      // truthy htmlfile, with no `type` of its own.
      kind = 'html';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      reference !== 'widget_iframe' &&
      !definition.type &&
      typeof definition.frameurl === 'string' &&
      definition.frameurl !== ''
    ) {
      // Repeatable iFrame block, added via the Screen Editor's own "Add
      // items" -> iFrame quick-add popup (_showIframePopup() above) rather
      // than the Widgets catalog's singleton 'iframe' entry. Matches
      // js/components/frame.js's own canHandle(): dispatched purely on a
      // truthy frameurl, with no `type` of its own - same convention as
      // html above. The fixed 'widget_iframe' key is excluded so the
      // existing singleton catalog widget keeps going through
      // DashticzWidgetEditor's own (unrelated) config path unchanged.
      kind = 'iframe';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      reference !== 'widget_calendar' &&
      String(definition.type || '').toLowerCase() !== 'calendar' &&
      typeof definition.icalurl === 'string' &&
      definition.icalurl !== ''
    ) {
      // Repeatable Calendar block, added via the Screen Editor's own "Add
      // items" -> Calendar quick-add popup (_showCalendarPopup() above)
      // rather than the Widgets catalog's singleton 'calendar' entry.
      // Matches js/components/calendar.js's own canHandle(): dispatched on
      // a truthy icalurl (this popup never writes an explicit type, same
      // convention as html/iframe above). The fixed 'widget_calendar' key,
      // and any block with an explicit type: 'calendar' (the legacy
      // multi-source `calendars` array shape the singleton widget itself
      // writes), are excluded so those keep going through
      // DashticzWidgetEditor's own (unrelated) config path unchanged.
      kind = 'calendar';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      reference !== 'widget_publictransport' &&
      !definition.type &&
      ((typeof definition.station === 'string' && definition.station !== '') ||
        (typeof definition.tpc === 'string' && definition.tpc !== ''))
    ) {
      // Repeatable Public transport block, added via the Screen Editor's
      // own "Add items" -> Public transport quick-add popup
      // (_showPublicTransportPopup() above) rather than the Widgets
      // catalog's singleton 'publictransport' entry. Matches
      // js/components/publictransport.js's own canHandle(): dispatched on
      // a truthy station or tpc, no `type` of its own. The fixed
      // 'widget_publictransport' key is excluded so that singleton keeps
      // going through DashticzWidgetEditor's own (unrelated) config path
      // unchanged.
      kind = 'publictransport';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      reference !== 'widget_timegraph' &&
      String(definition.type || '').toLowerCase() === 'timegraph'
    ) {
      // Repeatable Timegraph block, added via the Screen Editor's own "Add
      // items" -> Timegraph quick-add popup (_showTimegraphPopup() above)
      // rather than the Widgets catalog's singleton 'timegraph' entry.
      // Unlike html/iframe/calendar/publictransport above,
      // js/components/timegraph.js dispatches purely on an explicit
      // type:'timegraph' (like Group's type:'group'), so this is a type
      // check rather than a field-shape one. The fixed 'widget_timegraph'
      // key is excluded so that singleton keeps going through
      // DashticzWidgetEditor's own (unrelated) config path unchanged.
      kind = 'timegraph';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      reference !== 'widget_xmltvguide' &&
      !definition.type &&
      typeof definition.xmltvurl === 'string' &&
      definition.xmltvurl !== ''
    ) {
      // Repeatable TV Guide (XMLTV) block, added via the Screen Editor's
      // own "Add items" -> TV Guide quick-add popup
      // (_showXmltvguidePopup() above) rather than the Widgets catalog's
      // singleton 'xmltvguide' entry. Matches
      // js/components/xmltvguide.js's own canHandle(): dispatched on a
      // truthy xmltvurl, no `type` of its own (this popup never writes
      // one, same convention as html/iframe/calendar/publictransport
      // above). The fixed 'widget_xmltvguide' key is excluded so that
      // singleton keeps going through DashticzWidgetEditor's own
      // (unrelated) config path unchanged.
      kind = 'xmltvguide';
    } else if (
      /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference) &&
      String(definition.type || '').toLowerCase() === 'lms'
    ) {
      // Lyrion Music Server "Now Playing" block (js/components/lms.js),
      // dispatched on type: 'lms' like Group's type: 'group' above.
      kind = 'lms';
    }
    if (!kind) return null;
    var hasConfiguredImage =
      typeof definition.image === 'string' && definition.image !== '';
    var barMode = _isBarDefinition(definition);

    return {
      kind: 'special',
      specialType: kind,
      orderKey: _specialOrderKey(reference),
      reference: reference,
      definition: definition,
      idx:
        IDX_LESS_SPECIAL_KINDS.indexOf(kind) > -1
          ? null
          : kind === 'group'
            ? parseInt(definition.idx, 10) > 0
              ? parseInt(definition.idx, 10)
              : null
            : parseInt(definition.idx, 10),
      title:
        TITLE_OPTIONAL_SPECIAL_KINDS.indexOf(kind) > -1
          ? String(definition.title || '')
          : String(
              definition.title || (kind === 'title' ? 'Title' : reference)
            ),
      width: _parseWidth(
        definition.width ||
          (kind === 'title'
            ? 12
            : WIDE_DEFAULT_SPECIAL_KINDS.indexOf(kind) > -1
              ? 6
              : 3)
      ),

      height: _parseHeight(definition.height),
      // Lyrion Music Server connection/player fields - kept as their own
      // properties (like slideTarget/buttonKey below) rather than routed
      // through custom_fields/options, since they need their own dedicated
      // Server/Port/.../Player UI in _showConfigPopup, not the generic
      // custom-fields grid (see protectedCustomDeviceProperties).
      lmsServer: kind === 'lms' ? String(definition.server || '') : '',
      lmsPort: kind === 'lms' ? parseInt(definition.port, 10) || 9000 : 9000,
      lmsUsername: kind === 'lms' ? String(definition.username || '') : '',
      lmsPassword: kind === 'lms' ? String(definition.password || '') : '',
      lmsPlayer: kind === 'lms' ? String(definition.player || '') : '',
      lmsPlayerLabel: '',
      lmsRefresh: kind === 'lms' ? parseInt(definition.refresh, 10) || 5 : 5,
      lmsHideWhenOff:
        kind === 'lms' ? definition.hide_when_off === true : false,
      // hide_data/last_update/switch are unused for a title/separator block,
      // but icon applies to every special kind.
      options: {
        icon:
          hasConfiguredImage ||
          typeof definition.icon === 'undefined' ||
          definition.icon !== '',
        // Icon and Image are one source selector in the editor. Prefer the
        // configured image when an older block still contains both so an
        // unrelated Device Editor save also cleans up the stale icon.
        iconValue: hasConfiguredImage
          ? null
          : typeof definition.icon === 'string' && definition.icon !== ''
            ? definition.icon
            : kind === 'title' && typeof definition.icon === 'undefined'
              ? SEPARATOR_DEFAULT_ICON
              : null,
        hide_data: definition.hide_data === true,
        last_update: definition.last_update === true,
        switch: definition.switch === true,
        dial: definition.type === 'dial' && !barMode,
        bar: barMode,
        needle: definition.needle === true,
        // Preserved as a real tri-state (true/false/undefined), not coerced
        // to a boolean: undefined means "not explicitly set yet", so the
        // popup can fall back to auto-detecting from the live device's
        // SwitchType instead of defaulting to false.
        inverse: definition.inverse,
        barsteps:
          parseInt(definition.barsteps, 10) > 0
            ? parseInt(definition.barsteps, 10)
            : 10,
      },
      buttonKey: String(definition.key || ''),
      slideTarget:
        parseInt(definition.slide, 10) > 0 ? parseInt(definition.slide, 10) : 1,
      showTitle: definition.hide_title !== true,
      customFields: _deviceCustomFieldRows(definition, definition.title),
      preservedFields: _devicePreservedFieldValues(definition),
    };
  }

  function _widgetFromReference(reference) {
    // Use translations from the active language file (widgetEditorTranslations is defined
    // in settings.js and populated from /lang/<locale>.json settings.widgeteditor section).
    // Fall back to English when the key is missing or the variable is not yet available.
    var t =
      typeof widgetEditorTranslations !== 'undefined'
        ? widgetEditorTranslations
        : {};

    // Translated display titles keyed by widget type id.
    // This map is used both for named catalog entries (widget_xxx) and for
    // type-mapped blocks so that language changes always take effect immediately,
    // regardless of any hardcoded title stored in CONFIG.js.
    var translatedTitles = {
      weather: t.weather_title || 'Weather',
      garbage: t.garbage_title || 'Garbage',
      spotify: t.spotify_title || 'Spotify',
      sonarr: t.sonarr_title || 'Sonarr',
      clock: t.clock_title || 'Clock',
      calendar: t.calendar_title || 'Calendar (ICS)',
      secpanel: t.secpanel_title || 'Security panel',
      publictransport: t.publictransport_title || 'Public transport',
      trafficinfo: t.trafficinfo_title || 'Traffic information',
      alarmmeldingen: t.alarmmeldingen_title || '112',
      camera: t.camera_title || 'Cameras',
      map: t.map_title || 'Google Maps',
      longfonds: t.longfonds_title || 'Air quality',
      moon: t.moon_title || 'Moon',
      news: t.news_title || 'News',
      iframe: t.iframe_title || 'iFrame',
      xmltvguide: t.xmltvguide_title || 'TV Guide',
      radio: t.radio_title || 'Radio',
      log: t.log_title || 'Domoticz log',
      sunrise: t.sunrise_title || 'Sunrise / Sunset',
      owm: t.owm_title || 'OpenWeatherMap',
      timegraph: t.timegraph_title || 'Timegraph',
    };

    var catalog = {
      widget_weather: { id: 'weather', title: translatedTitles.weather },
      widget_garbage: { id: 'garbage', title: translatedTitles.garbage },
      widget_spotify: { id: 'spotify', title: translatedTitles.spotify },
      widget_sonarr: { id: 'sonarr', title: translatedTitles.sonarr },
      widget_clock: { id: 'clock', title: translatedTitles.clock },
      widget_calendar: { id: 'calendar', title: translatedTitles.calendar },
      widget_secpanel: { id: 'secpanel', title: translatedTitles.secpanel },
      widget_publictransport: {
        id: 'publictransport',
        title: translatedTitles.publictransport,
      },
      widget_trafficinfo: {
        id: 'trafficinfo',
        title: translatedTitles.trafficinfo,
      },
      widget_alarmmeldingen: {
        id: 'alarmmeldingen',
        title: translatedTitles.alarmmeldingen,
      },
      widget_cameras: { id: 'camera', title: translatedTitles.camera },
      widget_map: { id: 'map', title: translatedTitles.map },
      widget_longfonds: { id: 'longfonds', title: translatedTitles.longfonds },
      widget_moon: { id: 'moon', title: translatedTitles.moon },
      widget_news: { id: 'news', title: translatedTitles.news },
      widget_iframe: { id: 'iframe', title: translatedTitles.iframe },
      widget_xmltvguide: {
        id: 'xmltvguide',
        title: translatedTitles.xmltvguide,
      },
      // Streamplayer/Radio is dispatched by its component name directly, so
      // it is always keyed 'streamplayer' rather than a 'widget_' prefix.
      streamplayer: { id: 'radio', title: translatedTitles.radio },
      widget_owmwidget: { id: 'owm', title: translatedTitles.owm },
      widget_timegraph: { id: 'timegraph', title: translatedTitles.timegraph },
      // DT_log and 'sunrise' (via DT_simpleblock) are also dispatched by their
      // plain block key, exactly like streamplayer above.
      log: { id: 'log', title: translatedTitles.log },
      sunrise: { id: 'sunrise', title: translatedTitles.sunrise },
    };
    if (typeof blocks === 'undefined' || !blocks[reference]) {
      return null;
    }
    var definition = blocks[reference];
    var catalogItem = catalog[String(reference)];
    if (!catalogItem && Array.isArray(definition.tracks)) {
      catalogItem = { id: 'radio', title: translatedTitles.radio };
    }
    if (!catalogItem) {
      var type = String(definition.type || '').toLowerCase();
      var typeMap = {
        weather: 'weather',
        wunderground: 'weather',
        garbage: 'garbage',
        spotify: 'spotify',
        sonarr: 'sonarr',
        calendar: 'calendar',
        secpanel: 'secpanel',
        publictransport: 'publictransport',
        trafficinfo: 'trafficinfo',
        alarmmeldingen: 'alarmmeldingen',
        camera: 'camera',
        map: 'map',
        longfonds: 'longfonds',
        waqi: 'longfonds',
        moon: 'moon',
        news: 'news',
        frame: 'iframe',
        iframe: 'iframe',
        xmltvguide: 'xmltvguide',
        basicclock: 'clock',
        stationclock: 'clock',
        flipclock: 'clock',
        haymanclock: 'clock',
        miniclock: 'clock',
        log: 'log',
        sunrise: 'sunrise',
        owmwidget: 'owm',
        timegraph: 'timegraph',
      };
      var id = typeMap[type];
      if (!id) return null;
      // Keep widget list labels language-based. User-defined block titles remain
      // editable separately and are applied only on the rendered screen block.
      catalogItem = { id: id, title: translatedTitles[id] || id };
    }
    return {
      kind: 'widget',
      id: catalogItem.id,
      orderKey: _widgetOrderKey(catalogItem.id),
      reference: String(reference),
      // Always prefer the translated catalog title so that language changes in
      // Settings are immediately reflected, regardless of any title hardcoded
      // in CONFIG.js (e.g. title:'Afval' written in a previous language).
      title: catalogItem.title,
      definition: definition,
    };
  }

  function _copyDefinedWidgetProperties(entry, definition, properties) {
    properties.forEach(function (property) {
      if (typeof definition[property] !== 'undefined') {
        entry[property] = definition[property];
      }
    });
  }

  function _widgetCustomFields(definition) {
    var protectedFields = {
      type: true,
      id: true,
      key: true,
      width: true,
      height: true,
      grid: true,
      idx: true,
      subidx: true,
      icon: true,
      hide_data: true,
      last_update: true,
      hide_title: true,
      text_alignment: true,
      text_align: true,
      title: true,
    };
    var custom = {};
    Object.keys(definition || {}).forEach(function (property) {
      var value = definition[property];
      if (protectedFields[property] || /^_dashticz/.test(property)) return;
      if (typeof value === 'undefined' || typeof value === 'function') return;
      custom[property] = value;
    });
    return custom;
  }

  var protectedCustomDeviceProperties = {
    type: true,
    id: true,
    key: true,
    kind: true,
    width: true,
    height: true,
    grid: true,
    idx: true,
    subidx: true,
    title: true,
    icon: true,
    image: true,
    hide_data: true,
    last_update: true,
    switch: true,
    hide_title: true,
    text_alignment: true,
    text_align: true,
    custom_fields: true,
    c: true,
    // Bar's number-of-segments field - managed by the dedicated Steps input
    // in the visual mode selector below (see _showConfigPopup), not the
    // generic custom-fields grid. Has no meaning outside subtype: 'bar'.
    barsteps: true,
    // Lyrion Music Server (LMS) block fields - managed by the dedicated
    // Server/Port/Username/Password/Player/Refresh/Hide-when-off section of
    // the Lyrion Music Server popup below, not the generic custom-fields grid.
    server: true,
    port: true,
    username: true,
    password: true,
    player: true,
    refresh: true,
    hide_when_off: true,
    __proto__: true,
    prototype: true,
    constructor: true,
  };

  function _settingToText(value) {
    if (value !== null && typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch (ignore) {
        return '';
      }
    }
    return String(value);
  }

  function _normaliseCustomFieldName(value) {
    value = $.trim(String(value || '')).replace(/[\s-]+/g, '_');
    if (value) value = value.charAt(0).toLowerCase() + value.slice(1);
    return value;
  }

  function _parseCustomSetting(value) {
    var text = $.trim(String(value || ''));
    if (text === 'true') return { valid: true, value: true };
    if (text === 'false') return { valid: true, value: false };
    if (/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)) {
      return { valid: true, value: Number(text) };
    }
    if (/^[\[{]/.test(text)) {
      try {
        var parsed = JSON.parse(text);
        if (parsed && typeof parsed === 'object') {
          return { valid: true, value: parsed };
        }
      } catch (ignore) {
        /* a translated validation message is shown by the popup */
      }
      return { valid: false };
    }
    return { valid: true, value: text };
  }

  function _encodeCustomSettingValue(value) {
    if (Array.isArray(value)) {
      return value.map(_encodeCustomSettingValue);
    }
    if (value && Object.prototype.toString.call(value) === '[object Object]') {
      var keys = Object.keys(value);
      if (!keys.length) return { __dashticz_empty_object__: true };
      var encoded = {};
      keys.forEach(function (key) {
        encoded[key] = _encodeCustomSettingValue(value[key]);
      });
      return encoded;
    }
    return value;
  }

  function _deviceCustomFieldRows(definition, titleValue) {
    var rows = [
      {
        field: 'title',
        setting:
          typeof titleValue === 'undefined'
            ? String((definition || {}).title || '')
            : String(titleValue || ''),
        value:
          typeof titleValue === 'undefined'
            ? String((definition || {}).title || '')
            : String(titleValue || ''),
        system: true,
      },
    ];
    if (
      definition &&
      typeof definition.image === 'string' &&
      definition.image !== ''
    ) {
      rows.push({
        field: 'image',
        setting: definition.image,
        value: definition.image,
      });
    } else if (
      definition &&
      typeof definition.icon === 'string' &&
      definition.icon !== ''
    ) {
      rows.push({
        field: 'icon',
        setting: definition.icon,
        value: definition.icon,
      });
    }
    Object.keys(definition || {}).forEach(function (property) {
      var lowerProperty = property.toLowerCase();
      if (
        lowerProperty === 'image' ||
        protectedCustomDeviceProperties[lowerProperty] ||
        /^_dashticz/i.test(property)
      )
        return;
      var value = definition[property];
      if (typeof value === 'undefined' || typeof value === 'function') return;
      rows.push({
        field: property,
        setting: _settingToText(value),
        value: value,
      });
    });
    return rows;
  }

  function _fontIconClass($icon) {
    if (!$icon || !$icon.length) return '';
    return String($icon.attr('class') || '')
      .split(/\s+/)
      .filter(function (className) {
        return /^(?:fa[brsld]?|fa-|wi(?:-|$))/.test(className);
      })
      .join(' ');
  }

  function _renderedIconForReference(reference) {
    if (!reference) return '';
    var referenceText = String(reference);
    var $mount = $('[data-grid-block]')
      .filter(function () {
        return String($(this).attr('data-grid-block')) === referenceText;
      })
      .first();
    if (!$mount.length) {
      $mount = $('[data-id]')
        .filter(function () {
          return String($(this).attr('data-id')) === referenceText;
        })
        .first();
    }
    return _fontIconClass(
      $mount.find('.col-icon em, .sunrise-header em').first()
    );
  }

  function _defaultDomoticzIcon(device, subidx, idx) {
    if (!device || typeof getBlockTypesBlock !== 'function')
      return 'fas fa-question';
    try {
      var proto =
        getBlockTypesBlock({
          idx: device.idx || device.ID || device.Idx || idx,
          subidx: subidx || 0,
          device: device,
        }) || {};
      if (subidx && Array.isArray(proto.values) && proto.values[subidx - 1]) {
        proto = proto.values[subidx - 1];
      }
      var icon = proto.icon || proto.iconOn || proto.iconOff;
      if (typeof icon === 'function') icon = icon(device);
      if (typeof icon === 'string' && icon) return icon;
    } catch (ignore) {
      /* fall through to the neutral editable fallback */
    }
    return 'fas fa-question';
  }

  function _effectiveDeviceConfigIcon(ck, special, options) {
    if (options && options.iconValue) return options.iconValue;
    var reference = special ? special.reference : deviceRefs[ck];
    var renderedIcon = _renderedIconForReference(reference);
    if (renderedIcon) return renderedIcon;

    var parsed = special ? null : _parseCk(ck);
    var idx = special ? special.idx : parsed.idx;
    var subidx = special ? 0 : parsed.subidx;
    var devices = Domoticz.getAllDevices();
    var device = devices && (devices[String(idx)] || devices[idx]);
    if (device) return _defaultDomoticzIcon(device, subidx, idx);
    if (special) {
      if (special.specialType === 'title') return SEPARATOR_DEFAULT_ICON;
      if (special.specialType === 'slidebutton') return 'fas fa-home';
      if (special.specialType === 'custom') return 'fas fa-cube';
      if (special.specialType === 'group') return 'fas fa-object-group';
      if (special.specialType === 'html') return 'fas fa-code';
      if (special.specialType === 'iframe') return 'fas fa-window-maximize';
      if (special.specialType === 'calendar') return 'fas fa-calendar-alt';
      if (special.specialType === 'publictransport') return 'fas fa-train';
      if (special.specialType === 'timegraph') return 'fas fa-chart-line';
      if (special.specialType === 'xmltvguide') return 'fas fa-tv';
      if (special.specialType === 'lms') return 'fas fa-music';
    }
    return 'fas fa-question';
  }

  function _loadCustomImages() {
    if (customImageListPromise) return customImageListPromise;
    customImageListPromise = $.getJSON('js/listcustomicons.php').then(
      function (data) {
        return data && Array.isArray(data.images) ? data.images : [];
      }
    );
    customImageListPromise.fail(function () {
      customImageListPromise = null;
    });
    return customImageListPromise;
  }

  function _renderCustomImageGrid($picker, images, selectedPath, emptyText) {
    var $grid = $picker.find('.dt-custom-image-grid').empty();
    $picker
      .find('.dt-custom-image-status')
      .toggle(!images.length)
      .text(images.length ? '' : emptyText);
    images.forEach(function (imagePath) {
      var filename = String(imagePath).replace(/^custom\//, '');
      var $button = $(
        '<button type="button" class="dt-custom-image-option"></button>'
      )
        .attr('data-image-path', imagePath)
        .attr('title', filename)
        .toggleClass('is-selected', String(selectedPath || '') === imagePath);
      $('<img class="dt-custom-image-thumb" loading="lazy" alt="">')
        .attr('src', 'img/' + imagePath)
        .appendTo($button);
      $('<span class="dt-custom-image-name"></span>')
        .text(filename)
        .appendTo($button);
      $grid.append($button);
    });
  }

  function _devicePreservedFieldValues(definition) {
    var preserved = {};
    if (definition && Object.prototype.hasOwnProperty.call(definition, 'c')) {
      preserved.c = definition.c;
    }
    return preserved;
  }

  function _customFieldsObject(rows) {
    var customFields = {};
    (rows || []).forEach(function (row) {
      if (row && row.field) customFields[row.field] = row.value;
    });
    return customFields;
  }

  function _deviceCustomFieldsObject(rows, preserved) {
    var customFields = $.extend({}, preserved || {});
    (rows || []).forEach(function (row) {
      if (!row || !row.field) return;
      var field = _normaliseCustomFieldName(row.field);
      if (!field || field === 'title' || field === 'icon' || field === 'c')
        return;
      customFields[field] = _encodeCustomSettingValue(row.value);
    });
    Object.keys(customFields).forEach(function (field) {
      customFields[field] = _encodeCustomSettingValue(customFields[field]);
    });
    return customFields;
  }

  function _widgetPayload(orderKey) {
    var widget = managedWidgets[orderKey];
    var definition = widget.definition || {};
    if (widget.pendingPayload) {
      var pendingEntry = $.extend(true, {}, widget.pendingPayload);
      pendingEntry.id = widget.id;
      pendingEntry.width = _parseWidth(widgetWidths[orderKey]);
      if (widgetHeights[orderKey])
        pendingEntry.height = widgetHeights[orderKey];
      if (widget.pendingTitleEdited) {
        var pendingTitle = String(widgetTitles[orderKey] || '').trim();
        if (pendingTitle) pendingEntry.title = pendingTitle;
        else delete pendingEntry.title;
      } else if (widget.id !== 'camera') {
        // Opening full Widget Config from Device Editor must not drop the title
        // that Device Editor already preserved for regular widget blocks.
        var preservedTitle = String(widgetTitles[orderKey] || '').trim();
        if (preservedTitle) pendingEntry.title = preservedTitle;
      }
      return pendingEntry;
    }
    var entry = {
      id: widget.id,
      width: _parseWidth(widgetWidths[orderKey]),
    };
    var title = String(widgetTitles[orderKey] || '').trim();
    if (title) entry.title = title;
    if (widgetHeights[orderKey]) entry.height = widgetHeights[orderKey];
    var displayOptions = widgetOptions[orderKey] || {};
    if (displayOptions.icon === false) {
      entry.icon = '';
    } else if (displayOptions.iconValue) {
      // Preserve a hand-written custom icon while the visible Icon option stays on.
      entry.icon = displayOptions.iconValue;
    }
    entry.hide_data = displayOptions.hide_data === true;
    entry.last_update = displayOptions.last_update === true;
    if (widgetTitleVisible[orderKey] === false) entry.hide_title = true;
    if (widget.id === 'garbage') {
      entry.displayTitle = widget.title;
      _copyDefinedWidgetProperties(entry, definition, ['maxitems', 'maxdays']);
    }

    if (widget.id === 'weather') {
      entry.provider =
        definition.widget_provider ||
        (definition.type === 'wunderground' ? 'wunderground' : 'openweather');
      _copyDefinedWidgetProperties(entry, definition, [
        'showRain',
        'showDescription',
        'showWind',
        'showGust',
        'icons',
      ]);
    } else if (widget.id === 'calendar') {
      entry.icalurl = definition.icalurl || '';
      _copyDefinedWidgetProperties(entry, definition, ['maxitems']);
    } else if (widget.id === 'clock') {
      entry.clockType = definition.type || 'basicclock';
      _copyDefinedWidgetProperties(entry, definition, [
        'scale',
        'showSeconds',
        'clockFace',
        'body',
        'dial',
        'hourhand',
        'minutehand',
        'secondhand',
        'boss',
        'minutehandbehavior',
        'secondhandbehavior',
      ]);
    } else if (widget.id === 'publictransport') {
      entry.station = definition.station || 'UT';
      entry.provider = definition.provider || 'treinen';
    } else if (widget.id === 'camera') {
      // Multi-camera blocks use a cameras array instead of the legacy URL fields.
      // Preserve that shape so opening Device Config cannot invalidate the block.
      if (Array.isArray(definition.cameras)) {
        entry.cameras = definition.cameras;
      } else {
        entry.imageUrl = definition.imageUrl || '';
        if (definition.videoUrl) entry.videoUrl = definition.videoUrl;
      }
    } else if (widget.id === 'alarmmeldingen') {
      entry.rss = definition.rss || 'https://www.alarmeringen.nl/feeds/all.rss';
      if (definition.filter) entry.filter = definition.filter;
    } else if (widget.id === 'xmltvguide') {
      // savewidgets.php rejects the whole save when a resubmitted xmltvguide
      // block has no xmltvurl, so it must be carried over explicitly here.
      // The URL normally lives in the global xmltv_url setting rather than on
      // the block itself; only a hand-added block-level override takes
      // precedence over that.
      entry.xmltvurl =
        definition.xmltvurl ||
        (typeof settings !== 'undefined' && settings.xmltv_url) ||
        '';
      _copyDefinedWidgetProperties(entry, definition, [
        'channels',
        'maxitems',
        'layout',
        'separator',
        'refresh',
      ]);
    } else if (widget.id === 'iframe') {
      // Same requirement as xmltvguide above: frameurl is mandatory server-side.
      entry.frameurl = definition.frameurl || '';
      _copyDefinedWidgetProperties(entry, definition, [
        'scrollbars',
        'iframeHeight',
        'scaletofit',
        'aspectratio',
        'forcerefresh',
        'refresh',
      ]);
    } else if (widget.id === 'radio') {
      // Same requirement as xmltvguide/iframe above: savewidgets.php rejects
      // the whole save when a resubmitted radio block has no tracks, so the
      // station list must be carried over explicitly (it lives on the block
      // itself, not in custom_fields, which savewidgets.php never reads for
      // it). A block that only sets other properties (e.g. blocks['streamplayer']
      // = {image: 'radio.png'}, per the documented syntax) relies on the
      // legacy _STREAMPLAYER_TRACKS global instead, so fall back to that.
      entry.tracks = Array.isArray(definition.tracks)
        ? definition.tracks
        : typeof window !== 'undefined' &&
            Array.isArray(window._STREAMPLAYER_TRACKS)
          ? window._STREAMPLAYER_TRACKS
          : [];
    } else if (widget.id === 'log') {
      if (typeof definition.scrolltimeout !== 'undefined')
        entry.scrolltimeout = definition.scrolltimeout;
      entry.ascending = definition.ascending !== false;
      _copyDefinedWidgetProperties(entry, definition, [
        'aspectratio',
        'maxitems',
      ]);
      if (typeof definition.height !== 'undefined')
        entry.logHeight = definition.height;
    } else if (widget.id === 'owm') {
      _copyDefinedWidgetProperties(entry, definition, [
        'apikey',
        'layout',
        'city',
        'country',
      ]);
    } else if (widget.id === 'timegraph') {
      // idx is a protected/common property (see protectedCustomDeviceProperties
      // below), so it never survives the generic custom_fields fallback and
      // must be copied explicitly or a resize-only Device Editor save would
      // silently drop the block's main Domoticz device.
      _copyDefinedWidgetProperties(entry, definition, [
        'idx',
        'duration',
        'xTicks',
        'yTicks',
        'xLabels',
        'animation',
        'lineTension',
        'pointRadius',
        'values',
      ]);
      if (typeof definition.height !== 'undefined')
        entry.timegraphHeight = definition.height;
    }

    // savewidgets.php rebuilds the managed block section. Re-submit every safe
    // existing property so a Device Editor save cannot erase custom widget
    // parameters created in Widget Config or added by hand.
    entry.custom_fields = _widgetCustomFields(definition);

    return entry;
  }

  function _activeScreenTarget() {
    if (
      typeof DashticzScreenSwitcher !== 'undefined' &&
      DashticzScreenSwitcher.getActiveScreenNumber
    ) {
      return DashticzScreenSwitcher.getActiveScreenNumber();
    }
    if (typeof standbyActive !== 'undefined' && standbyActive) {
      return 'standby';
    }
    var $active = $(
      '.dt-container .screen.swiper-slide-active[data-screenindex]'
    );
    if (!$active.length) {
      $active = $('.dt-container .screen[data-screenindex]:visible').first();
    }
    if ($('.screenstandby:visible').length) return 'standby';
    var fromDom = parseInt($active.attr('data-screenindex'), 10);
    return fromDom > 0 ? fromDom : 1;
  }

  /** Numeric screen for PHP endpoints; standby is sent as the string "standby". */
  function _activeScreenPayload() {
    var target = _activeScreenTarget();
    return target === 'standby' ? 'standby' : parseInt(target, 10) || 1;
  }

  function _activeScreenDom() {
    if (_activeScreenTarget() === 'standby') {
      var $standby = $('.screenstandby:visible');
      if ($standby.length) return $standby;
      return $('.screenstandby').first();
    }
    var num = _activeScreenPayload();
    var $byIndex = $('.dt-container .screen[data-screenindex="' + num + '"]');
    if ($byIndex.length) return $byIndex.first();
    var $active = $('.dt-container .screen.swiper-slide-active');
    if ($active.length) return $active;
    return $('.dt-container .screen:visible').first();
  }

  function _defaultGridColumns() {
    return typeof settings !== 'undefined' && settings.gridColumns > 0
      ? Number(settings.gridColumns)
      : 24;
  }

  function _defaultRowHeight() {
    return typeof settings !== 'undefined' && settings.rowHeight > 0
      ? Number(settings.rowHeight)
      : 20;
  }

  function _readGridConfig() {
    var $grid = _activeScreenDom().children('.dt-grid-layout').first();
    function number(property, fallback) {
      var value = parseFloat(
        $grid[0] ? getComputedStyle($grid[0]).getPropertyValue(property) : ''
      );
      return isFinite(value) ? value : fallback;
    }
    return {
      gridColumns: number('--dt-grid-columns', 24),
      rowHeight: number('--dt-grid-row-height', 20),
      gap: number('--dt-grid-gap', 0),
      mobileLayout: $grid.hasClass('dt-grid-mobile-stack') ? 'stack' : 'stack',
    };
  }

  function _getAllManagedGridItems() {
    var ordered = [];
    var seen = {};
    _activeScreenDom()
      .children('.dt-grid-layout')
      .children('.dt-grid-item')
      .each(function (index) {
        var reference = String($(this).attr('data-grid-block') || '');
        var definition =
          typeof blocks !== 'undefined' && blocks[reference]
            ? blocks[reference]
            : null;
        if (!definition) return;
        var grid = {
          x: _gridValue(this, '--dt-grid-x', 1),
          y: _gridValue(this, '--dt-grid-y', index + 1),
          w: _gridValue(this, '--dt-grid-w', 1),
          h: _gridValue(this, '--dt-grid-h', 1),
        };
        var special = _specialFromReference(reference);
        if (special && !seen[special.orderKey]) {
          seen[special.orderKey] = true;
          special.grid = grid;
          ordered.push(special);
          return;
        }
        var ck = _toCompositeKey(definition);
        if (ck) {
          var deviceKey = _deviceOrderKey(ck);
          if (!seen[deviceKey]) {
            seen[deviceKey] = true;
            ordered.push({
              kind: 'device',
              ck: ck,
              orderKey: deviceKey,
              reference: reference,
              grid: grid,
            });
          }
          return;
        }
        var widget = _widgetFromReference(reference);
        if (widget && !seen[widget.orderKey]) {
          seen[widget.orderKey] = true;
          widget.reference = reference;
          widget.grid = grid;
          ordered.push(widget);
          return;
        }
        gridExtras.push({ ref: reference, grid: grid });
      });
    return ordered;
  }

  function _gridValue(element, property, fallback) {
    var value = parseInt(element.style.getPropertyValue(property), 10);
    return value > 0 ? value : fallback;
  }

  function _gridOverlap(left, right) {
    return (
      left.x < right.x + right.w &&
      left.x + left.w > right.x &&
      left.y < right.y + right.h &&
      left.y + left.h > right.y
    );
  }

  function _firstFreeGridPosition(occupied, width, height) {
    for (var y = 1; y < 10000; y++) {
      for (var x = 1; x <= gridConfig.gridColumns - width + 1; x++) {
        var candidate = { x: x, y: y, w: width, h: height };
        if (
          !occupied.some(function (position) {
            return _gridOverlap(candidate, position);
          })
        ) {
          return candidate;
        }
      }
    }
    return { x: 1, y: 10000, w: width, h: height };
  }

  function _getAllManagedItems() {
    var seen = {};
    var ordered = [];
    if (typeof columns === 'undefined') return ordered;

    var columnKeys = [];
    var $activeScreen = _activeScreenDom();
    $activeScreen.find('[data-colindex]').each(function () {
      var columnKey = String($(this).attr('data-colindex'));
      if (columnKeys.indexOf(columnKey) < 0) {
        columnKeys.push(columnKey);
      }
    });

    // Standby uses columns_standby, not screens[].
    if (_activeScreenTarget() === 'standby') {
      if (typeof columns_standby !== 'undefined' && columns_standby) {
        Object.keys(columns_standby).forEach(function (colKey) {
          if (columnKeys.indexOf(String(colKey)) < 0) {
            columnKeys.push(String(colKey));
          }
        });
      }
    }

    columnKeys.forEach(function (colKey) {
      var lookupKey = String(colKey);
      if (_activeScreenTarget() === 'standby' && /^standby/.test(lookupKey)) {
        lookupKey = lookupKey.replace(/^standby/, '');
      }
      var col =
        _activeScreenTarget() === 'standby' &&
        typeof columns_standby !== 'undefined' &&
        columns_standby[lookupKey]
          ? columns_standby[lookupKey]
          : columns[colKey];
      if (!col && typeof columns !== 'undefined') {
        col = columns[lookupKey];
      }
      if (col && Array.isArray(col.blocks)) {
        col.blocks.forEach(function (b) {
          var special = _specialFromReference(b);
          if (special && !seen[special.orderKey]) {
            seen[special.orderKey] = true;
            ordered.push(special);
            return;
          }
          var ck = _toCompositeKey(b);
          if (
            !ck &&
            typeof b === 'string' &&
            typeof blocks !== 'undefined' &&
            blocks[b]
          ) {
            ck = _toCompositeKey(blocks[b]);
          }
          if (ck) {
            var deviceKey = _deviceOrderKey(ck);
            if (!seen[deviceKey]) {
              seen[deviceKey] = true;
              ordered.push({
                kind: 'device',
                ck: ck,
                orderKey: deviceKey,
                reference:
                  typeof b === 'string' ? b : _stableDeviceReference(ck),
              });
            }
            return;
          }

          var widget = _widgetFromReference(b);
          if (widget && !seen[widget.orderKey]) {
            seen[widget.orderKey] = true;
            ordered.push(widget);
          }
        });
      }
    });
    return ordered;
  }

  /* ── count how many sub-values a device type has (0/1 = single) ── */
  function _getSubValueCount(device) {
    if (typeof blocktypes === 'undefined') return 0;
    var bt = blocktypes[device.Type];
    if (!bt) return 0;
    /* check sub-type first */
    var proto = bt;
    if (bt.SubType && device.SubType && bt.SubType[device.SubType]) {
      proto = bt.SubType[device.SubType];
    }
    if (Array.isArray(proto.values)) return proto.values.length;
    if (Array.isArray(bt.values)) return bt.values.length;
    return 0;
  }

  /* ── build available device list (Domoticz minus Dashticz) ─── */
  function _getAvailableDevices(managedKeys) {
    var all = Domoticz.getAllDevices();

    /* build fast lookup sets */
    var managedSet = {}; /* all composite keys currently managed */
    var managedFullIdx = {}; /* base idx that is managed WITHOUT a sub-index */
    managedKeys.forEach(function (ck) {
      managedSet[ck] = true;
      var p = _parseCk(ck);
      if (!p.subidx) managedFullIdx[p.idx] = true;
    });

    var available = [];
    Object.keys(all).forEach(function (key) {
      if (!key || key[0] === '_') return; /* internal entries */

      /* group/scene key e.g. 's1' */
      if (_isGroupCk(key)) {
        if (managedSet[key]) return;
        var d = all[key];
        var type = d.Type || 'Group';
        var prefix = type === 'Scene' ? 'Scene_' : 'Group_';
        var plainName = d.Name || key;
        available.push({
          key: key,
          idx: key,
          subidx: 0,
          name: prefix + plainName,
          plainName: plainName,
          type: type,
        });
        return;
      }

      var idx = parseInt(key, 10);
      if (!(idx > 0 && String(idx) === String(key))) return;
      if (managedFullIdx[idx])
        return; /* whole base device is already managed */

      var d = all[key];
      var name = d.Name || 'Device ' + key;
      var type = d.Type || '';
      var subCount = _getSubValueCount(d);

      if (subCount > 1) {
        /* expand into individual sub-device entries */
        for (var s = 1; s <= subCount; s++) {
          var ck = _ck(idx, s);
          if (!managedSet[ck]) {
            available.push({
              key: ck,
              idx: idx,
              subidx: s,
              name: name + '\u00a0(' + s + ')',
              plainName: null,
              type: type,
            });
          }
        }
      } else {
        var ck = _ck(idx, 0);
        if (!managedSet[ck]) {
          available.push({
            key: ck,
            idx: idx,
            subidx: 0,
            name: name,
            plainName: null,
            type: type,
          });
        }
      }
    });

    _sortAvailable(available);
    return available;
  }

  /* ── build and display the modal ───────────────────────────── */
  function _prepareManagedDeviceState() {
    var managedKeys = managedDevices.slice();
    var allDomoticz = Domoticz.getAllDevices();
    var available = _getAvailableDevices(managedKeys);

    /* Populate the regular-device state even when a direct Screen Editor action
       saves without opening the full Device Editor modal. */
    managedKeys.forEach(function (ck) {
      var p = _parseCk(ck);
      var d = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      deviceNames[ck] = d ? d.Name || 'Device ' + p.idx : 'Device ' + p.idx;
      deviceWidths[ck] = _getConfiguredWidthForCk(ck);
      deviceHeights[ck] = _getConfiguredHeightForCk(ck);
      if (typeof deviceOptions[ck] !== 'undefined') {
        // Already known from a prior openLayoutConfig() round in this same
        // session (_init()'s preserveDeviceState left it in place) - keep
        // it instead of re-deriving from blocks[], which an earlier
        // _saveDeviceConfigOnly() call already made stale for this device.
        return;
      }
      var configured = _getConfiguredBlockForCk(ck) || {};
      var barMode = _isBarDefinition(configured);
      deviceTitles[ck] = configured._dashticzAutoTitle
        ? ''
        : typeof configured.title === 'string'
          ? configured.title
          : '';
      deviceOptions[ck] = {
        icon:
          (typeof configured.image === 'string' && configured.image !== '') ||
          typeof configured.icon === 'undefined' ||
          configured.icon !== '',
        iconValue:
          typeof configured.icon === 'string' && configured.icon !== ''
            ? configured.icon
            : null,
        hide_data: configured.hide_data === true,
        last_update: configured.last_update === true,
        switch: configured.switch === true,
        dial: configured.type === 'dial' && !barMode,
        bar: barMode,
        needle: configured.needle === true,
        // See the analogous comment in _specialFromReference() - kept as a
        // tri-state, not coerced to a boolean.
        inverse: configured.inverse,
        barsteps:
          parseInt(configured.barsteps, 10) > 0
            ? parseInt(configured.barsteps, 10)
            : 10,
      };
      deviceTitleVisible[ck] = configured.hide_title !== true;
      deviceCustomFields[ck] = _deviceCustomFieldRows(
        configured,
        deviceTitles[ck]
      );
      devicePreservedFields[ck] = _devicePreservedFieldValues(configured);
    });

    return { available: available, allDomoticz: allDomoticz };
  }

  function _buildAndShowModal() {
    $('#deviceeditorpopup').remove();

    var prepared = _prepareManagedDeviceState();
    var available = prepared.available;
    var allDomoticz = prepared.allDomoticz;

    $('body').append(_buildModalHtml(available, allDomoticz));
    _attachHandlers(available, allDomoticz);
    _wireBackButton('deviceeditorpopup');

    var el = document.getElementById('deviceeditorpopup');
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el).show();
    }
  }

  /* ── build the full modal HTML string ──────────────────────── */
  function _buildModalHtml(available, allDomoticz) {
    var t = _translations();
    var html = '';
    html += '<div class="modal fade" id="deviceeditorpopup" tabindex="-1"';
    html += ' aria-labelledby="de-title" aria-hidden="true">';
    html += '<div class="modal-dialog modal-xl modal-dialog-scrollable">';
    html += '<div class="modal-content">';

    /* header */
    html += '<div class="modal-header">';
    html += '<h5 class="modal-title" id="de-title">';
    var modalTitle =
      editorMode === 'dummy'
        ? t.custom_devices
        : editorMode === 'title'
          ? t.separator
          : t.editor_title;
    html +=
      '<i class="fas fa-pencil-alt me-2" aria-hidden="true"></i>' +
      _esc(modalTitle);
    html += '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button>';
    html += '</div>';

    /* body */
    html += '<div class="modal-body">';

    /* section 1 – current devices */
    html +=
      '<h6 class="de-section-title">' + _esc(t.configured_items) + '</h6>';
    html += '<div id="de-device-list" class="de-device-list">';
    if (managedOrder.length === 0) {
      html += '<div class="de-empty">' + _esc(t.empty_items) + '</div>';
    } else {
      managedOrder.forEach(function (orderKey) {
        if (orderKey.indexOf('widget:') === 0) {
          html += _widgetItemHtml(orderKey);
        } else if (orderKey.indexOf('special:') === 0) {
          html += _specialItemHtml(orderKey);
        } else {
          html += _deviceItemHtml(orderKey.slice(7), allDomoticz, false);
        }
      });
    }
    html += '</div>';

    /* section 2 – the selected add workflow. Dummy/title helper blocks were
       removed from the normal device dropdown and now have their own entry point. */
    var addHeading =
      editorMode === 'dummy'
        ? t.custom_devices
        : editorMode === 'title'
          ? t.separator
          : t.add_device;
    html += '<h6 class="de-section-title mt-3">' + _esc(addHeading) + '</h6>';
    html += '<div id="de-add-rows">';
    html +=
      editorMode === 'devices'
        ? _addRowHtml(available)
        : _specialAddRowHtml(editorMode);
    html += '</div>';

    html += '</div>'; /* modal-body */

    /* footer */
    html += '<div class="modal-footer">';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += '<span class="text-danger me-auto de-nophp">';
      html +=
        '<i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>';
      html += 'PHP not available — saving is disabled.';
      html += '</span>';
    }
    if (openedFromAddMenu) html += _backButtonHtml();
    html +=
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.close) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="de-save-btn"';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += ' disabled';
    }
    html +=
      '><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div>';

    html += '</div></div></div>'; /* content, dialog, modal */
    return html;
  }

  function _configButtonHtml(orderKey, label) {
    var t = _translations();
    return (
      '<button type="button" class="btn btn-outline-secondary btn-sm de-config-btn" ' +
      'data-order-key="' +
      _esc(orderKey) +
      '" title="' +
      _esc(label || t.configure) +
      '" aria-label="' +
      _esc(label || t.configure) +
      '">' +
      '<i class="fas fa-cog" aria-hidden="true"></i></button>'
    );
  }

  /* opts.hideButtons: renders the icon/image row without the add/remove
     controls, for a popup with exactly one fixed icon field rather than a
     repeatable custom-fields list (see _quickOptionsHtml() below). Every
     icon/image row also carries data-icon-default, the value to restore if
     the source is switched from Image back to Icon - single-field callers
     rely on this; the full custom-fields grid's own wiring (_showConfigPopup)
     tracks its own effective/default icon instead and ignores it. */
  function _customFieldRowHtml(row, opts) {
    var t = _translations();
    row = row || { field: '', setting: '' };
    var isSystem = row.system === true;
    var field = String(row.field || '');
    var lowerField = field.toLowerCase();
    var isIconSource = lowerField === 'icon' || lowerField === 'image';
    var hideButtons = !!(opts && opts.hideButtons);
    var rowClass = 'de-custom-field-row input-group input-group-sm mb-2';
    if (isIconSource) rowClass += ' de-icon-field-row';
    if (isSystem) rowClass += ' de-system-field-row';
    return (
      '<div class="' +
      rowClass +
      '"' +
      (row.generated === true
        ? ' data-generated-icon="true" data-initial-setting="' +
          _esc(row.setting || '') +
          '"'
        : '') +
      (isIconSource
        ? ' data-icon-default="' +
          _esc(lowerField === 'icon' ? row.setting || '' : '') +
          '"'
        : '') +
      '>' +
      (isIconSource
        ? '<select class="form-select de-custom-field-name de-icon-source" aria-label="' +
          _esc(t.field) +
          '"><option value="icon"' +
          (lowerField === 'icon' ? ' selected' : '') +
          '>Icon</option><option value="image"' +
          (lowerField === 'image' ? ' selected' : '') +
          '>Image</option></select>'
        : '<input type="text" class="form-control de-custom-field-name" placeholder="' +
          _esc(t.field) +
          '" value="' +
          _esc(field) +
          '"' +
          (isSystem ? ' readonly aria-readonly="true"' : '') +
          '>') +
      '<input type="text" class="form-control de-custom-field-setting" placeholder="' +
      _esc(lowerField === 'image' ? 'custom/icon.png' : t.setting) +
      '" value="' +
      _esc(row.setting || '') +
      '">' +
      (isIconSource
        ? '<div class="dropdown-menu dt-custom-image-picker" role="dialog" aria-label="' +
          _esc(t.custom_images) +
          '"><div class="dt-custom-image-status"></div>' +
          '<div class="dt-custom-image-grid"></div></div>'
        : '') +
      (hideButtons
        ? ''
        : '<button type="button" class="btn btn-outline-success de-custom-field-add" title="' +
          _esc(t.add_field) +
          '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
          '<button type="button" class="btn btn-outline-danger de-custom-field-remove" title="' +
          _esc(t.remove_field) +
          '"' +
          (isSystem ? ' disabled' : '') +
          '><i class="fas fa-minus" aria-hidden="true"></i></button>') +
      '</div>'
    );
  }

  function _customDeviceFieldRowHtml(row) {
    var t = _translations();
    row = row || { field: '', setting: '' };
    return (
      '<div class="cd-custom-field-row input-group input-group-sm mb-2">' +
      '<input type="text" class="form-control cd-custom-field-name" placeholder="' +
      _esc(t.field) +
      '" value="' +
      _esc(row.field || '') +
      '">' +
      '<input type="text" class="form-control cd-custom-field-setting" placeholder="' +
      _esc(t.setting) +
      '" value="' +
      _esc(row.setting || '') +
      '">' +
      '<button type="button" class="btn btn-outline-success cd-custom-field-add" title="' +
      _esc(t.add_field) +
      '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger cd-custom-field-remove" title="' +
      _esc(t.remove_field) +
      '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>'
    );
  }

  function _showCustomDevicePopup() {
    var t = _translations();
    $('#customdevicepopup').remove();

    var html =
      '<div class="modal fade" id="customdevicepopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-cube me-2" aria-hidden="true"></i>' +
      _esc(t.custom_devices) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Icon/Update/Title come first, matching the Device Config popup's own
    // top section (see _quickOptionsHtml()). Last update checked by default:
    // without this the created device silently saved last_update: false with
    // no checkbox anywhere to change it until the user separately discovered
    // the gear-icon Device Config popup - it looked like the Custom Device
    // block simply had no last-update support.
    html += _quickOptionsHtml('cd', {
      icon: false,
      iconValue: 'fas fa-cube',
      lastUpdate: true,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="cd-device-name">' +
      _esc(t.custom_device_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cd-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.custom_device_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cd-device-idx">IDX</label>';
    html +=
      '<input type="number" min="1" step="1" class="form-control" id="cd-device-idx"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cd-device-title">' +
      _esc(t.custom_device_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cd-device-title" autocomplete="off"></div>';
    html +=
      '<div class="cd-custom-fields-section"><h6>' +
      _esc(t.custom_device_options) +
      '</h6>';
    html +=
      '<div class="form-text mb-2">' +
      _esc(t.custom_device_values_help) +
      '</div>';
    html += '<div class="cd-custom-fields">';
    html += _customDeviceFieldRowHtml({ field: 'values', setting: '' });
    html += '</div></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="cd-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#customdevicepopup');
    _wireQuickOptions('cd', $popup);
    _wireBackButton('customdevicepopup');

    function refreshButtons() {
      var $rows = $popup.find('.cd-custom-field-row');
      $rows.find('.cd-custom-field-add').addClass('d-none');
      $rows.last().find('.cd-custom-field-add').removeClass('d-none');
      $rows.find('.cd-custom-field-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.cd-custom-field-add', function () {
      $popup.find('.cd-custom-fields').append(_customDeviceFieldRowHtml());
      refreshButtons();
      $popup
        .find('.cd-custom-field-row')
        .last()
        .find('.cd-custom-field-name')
        .trigger('focus');
    });
    $popup.on('click', '.cd-custom-field-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.cd-custom-field-row').remove();
      refreshButtons();
    });
    refreshButtons();

    $('#cd-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#cd-device-name').val() || ''));
      var rawIdx = $.trim(String($('#cd-device-idx').val() || ''));
      var idx = parseInt(rawIdx, 10);
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_custom_device_name);
        $('#cd-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_custom_device_name);
        $('#cd-device-name').trigger('focus');
        return;
      }
      if (!(idx > 0 && String(idx) === rawIdx)) {
        $message.addClass('text-danger').text(t.invalid_idx);
        $('#cd-device-idx').trigger('focus');
        return;
      }

      var title = $.trim(String($('#cd-device-title').val() || '')).slice(
        0,
        100
      );
      var customRows = [];
      var seen = {};
      var valid = true;
      $popup.find('.cd-custom-field-row').each(function () {
        if (!valid) return;
        var rawField = $.trim(
          String($(this).find('.cd-custom-field-name').val() || '')
        );
        var rawSetting = $.trim(
          String($(this).find('.cd-custom-field-setting').val() || '')
        );
        if (!rawField && !rawSetting) return;
        // An empty predefined 'values' row is ignored until given a value.
        if (rawField && !rawSetting && rawField.toLowerCase() === 'values')
          return;
        var field = _normaliseCustomFieldName(rawField);
        var lowerField = field.toLowerCase();
        if (
          !field ||
          !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field) ||
          !rawSetting
        ) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_field);
          $(this)
            .find(!field ? '.cd-custom-field-name' : '.cd-custom-field-setting')
            .trigger('focus');
          return;
        }
        if (seen[lowerField]) {
          valid = false;
          $message.addClass('text-danger').text(t.duplicate_field);
          $(this).find('.cd-custom-field-name').trigger('focus');
          return;
        }
        seen[lowerField] = true;
        // title/icon are now the dedicated fields above, so a hand-typed
        // 'title' or 'icon' row here is rejected as reserved, same as every
        // other protected field name.
        if (protectedCustomDeviceProperties[lowerField]) {
          valid = false;
          $message.addClass('text-danger').text(t.duplicate_field);
          $(this).find('.cd-custom-field-name').trigger('focus');
          return;
        }
        var parsed = _parseCustomSetting(rawSetting);
        if (!parsed.valid) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_setting);
          $(this).find('.cd-custom-field-setting').trigger('focus');
          return;
        }
        customRows.push({
          field: field,
          setting: rawSetting,
          value: parsed.value,
        });
      });
      if (!valid) return;

      var quickOptions = _readQuickOptions('cd');
      // A custom image path is a regular custom field ('image'), not the
      // dedicated icon slot - matches how Device/Widget Config's own
      // icon/image row saves the two differently (see _showConfigPopup).
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      if (iconIsImage && quickOptions.iconValue) {
        customRows.unshift({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      if (title)
        customRows.unshift({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'custom',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 3,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          hide_data: false,
          last_update: quickOptions.lastUpdate,
          switch: false,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('customdevicepopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('customdevicepopup')
    ).show();
  }

  /* Multi Device: a graphical builder for the Custom Device engine's existing
   * blocks[key] = {idx, values:[{idx?, value}, ...]} shape. Each value row
   * without its own idx falls back to the main idx (see formatBlockValues in
   * blocks.js), so no rendering/parsing logic is duplicated here — this popup
   * only produces the same custom_fields.values JSON the Custom Device popup
   * already accepts by hand, and the saved device is a specialType 'custom'
   * device like any other (editable later via the normal device config). */
  function _multiDeviceRowHtml(row) {
    var t = _translations();
    row = row || { idx: '', value: '' };
    return (
      '<div class="md-value-row input-group input-group-sm mb-2">' +
      '<input type="number" min="1" step="1" class="form-control md-value-idx" ' +
      'style="max-width:110px" placeholder="' +
      _esc(t.multi_device_row_idx) +
      '" value="' +
      _esc(row.idx || '') +
      '">' +
      '<input type="text" class="form-control md-value-value" placeholder="' +
      _esc(t.multi_device_row_value) +
      '" value="' +
      _esc(row.value || '') +
      '">' +
      '<button type="button" class="btn btn-outline-success md-value-add" title="' +
      _esc(t.add_value_row) +
      '"><i class="fas fa-plus" aria-hidden="true"></i></button>' +
      '<button type="button" class="btn btn-outline-danger md-value-remove" title="' +
      _esc(t.remove_value_row) +
      '"><i class="fas fa-minus" aria-hidden="true"></i></button>' +
      '</div>'
    );
  }

  /* Shared Icon/Last update/Title checkbox row used by the Multi Device,
     Group and HTML Block quick-add popups below. It mirrors the same three
     options (minus Data/Dial, which don't apply to a quick-add block) the
     full Device Config popup already exposes for an already-placed block,
     so a block created here is just as configurable from the start. The
     Icon field itself reuses the Device/Widget Config custom-fields grid's
     own icon/image row (_customFieldRowHtml with hideButtons: true) instead
     of a plain text input, so a quick-add block can point at a custom image
     the same way an already-placed block can. */
  function _quickOptionsHtml(prefix, defaults) {
    var t = _translations();
    var html =
      '<h6 class="de-section-title">' + _esc(t.display_options) + '</h6>';
    // Icon/Updated/Title as icon buttons, same look as Device Config's own
    // .de-config-option row (#195) - kept on unique per-popup ids (not
    // data-option) since several of these quick-add popups can coexist and
    // _readQuickOptions() below already looked them up that way.
    html +=
      '<div class="d-flex flex-wrap gap-2 mb-3 de-config-options-icons" role="group" aria-label="' +
      _esc(t.display_options) +
      '">';
    [
      {
        id: 'opt-icon',
        icon: 'fas fa-image',
        label: t.icon,
        active: defaults.icon,
      },
      {
        id: 'opt-update',
        icon: 'fas fa-clock',
        label: t.last_update,
        active: defaults.lastUpdate,
      },
      {
        id: 'opt-title',
        icon: 'fas fa-heading',
        label: t.show_title,
        active: defaults.showTitle,
      },
    ].forEach(function (item) {
      html +=
        '<button type="button" class="btn btn-outline-secondary de-config-option' +
        (item.active ? ' active' : '') +
        '" id="' +
        prefix +
        '-' +
        item.id +
        '" aria-pressed="' +
        (item.active ? 'true' : 'false') +
        '" title="' +
        _esc(item.label) +
        '" style="min-width:72px;">' +
        '<i class="' +
        item.icon +
        '" aria-hidden="true"></i>' +
        '<span class="d-block small">' +
        _esc(item.label) +
        '</span></button>';
    });
    html += '</div>';
    html +=
      '<div class="mb-3 ' +
      prefix +
      '-opt-icon-field' +
      (defaults.icon ? '' : ' d-none') +
      '">';
    html += '<label class="form-label">' + _esc(t.icon) + '</label>';
    html += _customFieldRowHtml(
      { field: 'icon', setting: defaults.iconValue || '' },
      { hideButtons: true }
    );
    html += '</div>';
    return html;
  }

  /* Call once after appending markup built with _quickOptionsHtml() above,
     with the popup's own jQuery element (for correctly-scoped, leak-free
     event delegation - see _wireIconImagePicker()). */
  function _wireQuickOptions(prefix, $popup) {
    $popup.on('click', '.de-config-option', function () {
      if ($(this).prop('disabled')) return;
      var active = !$(this).hasClass('active');
      $(this)
        .toggleClass('active', active)
        .attr('aria-pressed', active ? 'true' : 'false');
      if ($(this).attr('id') === prefix + '-opt-icon') {
        $('.' + prefix + '-opt-icon-field').toggleClass('d-none', !active);
      }
    });
    _wireIconImagePicker($popup);
  }

  function _readQuickOptions(prefix) {
    var iconChecked = $('#' + prefix + '-opt-icon').hasClass('active');
    var $iconRow = $('.' + prefix + '-opt-icon-field .de-icon-field-row');
    var iconSource =
      $iconRow.find('.de-icon-source').val() === 'image' ? 'image' : 'icon';
    var rawValue = $.trim(
      String($iconRow.find('.de-custom-field-setting').val() || '')
    );
    return {
      icon: iconChecked,
      iconSource: iconSource,
      iconValue: iconChecked ? rawValue || null : null,
      lastUpdate: $('#' + prefix + '-opt-update').hasClass('active'),
      showTitle: $('#' + prefix + '-opt-title').hasClass('active'),
    };
  }

  /* Wire the Icon/Image source toggle and custom-image picker for every
     .de-icon-field-row within $popup - i.e. the single, non-removable icon
     field _quickOptionsHtml() renders for the Screen Editor's quick-add
     popups. Delegated on the popup's own element (removed from the DOM,
     handlers and all, once the popup closes) rather than document, so
     repeatedly opening/closing a popup never accumulates stale listeners.
     The full custom-fields grid's own icon row (Device/Widget Config) wires
     itself instead, since it also has to react to add/remove-field
     bookkeeping this simpler, single-field case doesn't have. */
  function _wireIconImagePicker($popup) {
    if (!$popup || !$popup.length) return;
    var t = _translations();
    function closeCustomImagePickers() {
      $popup.find('.dt-custom-image-picker').removeClass('show');
      $popup
        .find('.de-icon-field-row')
        .removeClass('dt-custom-image-picker-open');
    }
    function openCustomImagePicker($row) {
      if ($row.find('.de-icon-source').val() !== 'image') {
        closeCustomImagePickers();
        return;
      }
      var $picker = $row.find('.dt-custom-image-picker');
      var selectedPath = String(
        $row.find('.de-custom-field-setting').val() || ''
      );
      closeCustomImagePickers();
      $row.addClass('dt-custom-image-picker-open');
      $picker.addClass('show');
      $picker.find('.dt-custom-image-status').show().text(t.loading_images);
      $picker.find('.dt-custom-image-grid').empty();
      _loadCustomImages()
        .done(function (images) {
          _renderCustomImageGrid(
            $picker,
            images,
            selectedPath,
            t.no_custom_images
          );
        })
        .fail(function () {
          $picker.find('.dt-custom-image-grid').empty();
          $picker
            .find('.dt-custom-image-status')
            .show()
            .text(t.custom_images_error);
        });
    }
    $popup.on('change', '.de-icon-source', function () {
      var $row = $(this).closest('.de-icon-field-row');
      var useImage = $(this).val() === 'image';
      $row
        .find('.de-custom-field-setting')
        .val(useImage ? '' : String($row.attr('data-icon-default') || ''))
        .attr('placeholder', useImage ? 'custom/icon.png' : t.setting);
      closeCustomImagePickers();
    });
    $popup.on(
      'click focus',
      '.de-icon-field-row .de-custom-field-setting',
      function () {
        openCustomImagePicker($(this).closest('.de-icon-field-row'));
      }
    );
    $popup.on('click', '.dt-custom-image-option', function () {
      var $row = $(this).closest('.de-icon-field-row');
      $row
        .find('.de-custom-field-setting')
        .val(String($(this).attr('data-image-path') || ''));
      closeCustomImagePickers();
    });
    $popup.on('click', function (event) {
      if (
        $(event.target).closest(
          '.dt-custom-image-picker, .de-custom-field-setting'
        ).length
      )
        return;
      closeCustomImagePickers();
    });
  }

  /* Shared "Back" button for every popup reachable from the Screen Editor's
     Add items tile menu (js/components/simpleblock.js). Placed left of
     Cancel/Close in the footer, matching the Settings popup's own back
     button (js/settings.js). Reuses the existing settings.back translation
     instead of duplicating it under deviceeditor. */
  function _backButtonHtml() {
    var backLabel =
      (typeof language !== 'undefined' &&
        language.settings &&
        language.settings.back) ||
      'Back';
    return (
      '<button type="button" class="btn btn-secondary de-back-btn">' +
      '<i class="fas fa-arrow-left me-1" aria-hidden="true"></i>' +
      _esc(backLabel) +
      '</button>'
    );
  }

  /* Call once after appending markup built with _backButtonHtml() above.
     Tracks the click in a closure variable rather than $popup.data(), since
     deviceeditorpopup's own cleanup handler (_attachHandlers() below) calls
     $(this).remove() on hide - which jQuery documents as also clearing any
     data stored on the element - and can run before this handler depending
     on registration order. */
  function _wireBackButton(popupId) {
    var popup = document.getElementById(popupId);
    var $popup = $(popup);
    var backRequested = false;
    $popup.on('click', '.de-back-btn', function () {
      backRequested = true;
      window.bootstrap.Modal.getInstance(popup).hide();
    });
    $popup.one('hidden.bs.modal', function () {
      if (
        backRequested &&
        typeof DT_simpleblock !== 'undefined' &&
        typeof DT_simpleblock.openAddMenu === 'function'
      ) {
        DT_simpleblock.openAddMenu();
      }
    });
  }

  function _showMultiDevicePopup() {
    var t = _translations();
    $('#multidevicepopup').remove();

    var html =
      '<div class="modal fade" id="multidevicepopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-layer-group me-2" aria-hidden="true"></i>' +
      _esc(t.multi_device) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Icon and Last update default on (Last update was previously a lone
    // always-checked checkbox with no way to turn it off; Icon had no
    // checkbox at all and always saved the fixed 'fas fa-layer-group' value
    // below) so an unedited save keeps behaving exactly as before. Placed
    // first, matching the Device Config popup's own top section.
    html += _quickOptionsHtml('md', {
      icon: true,
      iconValue: 'fas fa-layer-group',
      lastUpdate: true,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="md-device-name">' +
      _esc(t.multi_device_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="md-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.multi_device_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="md-device-idx">' +
      _esc(t.multi_device_idx) +
      '</label>';
    html +=
      '<input type="number" min="1" step="1" class="form-control" id="md-device-idx">';
    html +=
      '<div class="form-text">' +
      _esc(t.multi_device_idx_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="md-device-title">' +
      _esc(t.multi_device_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="md-device-title" autocomplete="off"></div>';
    html +=
      '<div class="md-values-section"><h6>' +
      _esc(t.multi_device_values) +
      '</h6>';
    html +=
      '<div class="form-text mb-2">' +
      _esc(t.multi_device_values_help) +
      '</div>';
    html += '<div class="md-value-rows">';
    html += _multiDeviceRowHtml({ idx: '', value: '' });
    html += '</div></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="md-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#multidevicepopup');
    _wireQuickOptions('md', $popup);
    _wireBackButton('multidevicepopup');

    function refreshButtons() {
      var $rows = $popup.find('.md-value-row');
      $rows.find('.md-value-add').addClass('d-none');
      $rows.last().find('.md-value-add').removeClass('d-none');
      $rows.find('.md-value-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.md-value-add', function () {
      $popup.find('.md-value-rows').append(_multiDeviceRowHtml());
      refreshButtons();
      $popup
        .find('.md-value-row')
        .last()
        .find('.md-value-value')
        .trigger('focus');
    });
    $popup.on('click', '.md-value-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.md-value-row').remove();
      refreshButtons();
    });
    refreshButtons();

    $('#md-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#md-device-name').val() || ''));
      var rawIdx = $.trim(String($('#md-device-idx').val() || ''));
      var idx = parseInt(rawIdx, 10);
      var title = $.trim(String($('#md-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_multi_device_name);
        $('#md-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_multi_device_name);
        $('#md-device-name').trigger('focus');
        return;
      }
      if (!(idx > 0 && String(idx) === rawIdx)) {
        $message.addClass('text-danger').text(t.invalid_idx);
        $('#md-device-idx').trigger('focus');
        return;
      }

      var values = [];
      var valid = true;
      $popup.find('.md-value-row').each(function () {
        if (!valid) return;
        var rawRowIdx = $.trim(
          String($(this).find('.md-value-idx').val() || '')
        );
        var rawValue = $.trim(
          String($(this).find('.md-value-value').val() || '')
        );
        if (!rawRowIdx && !rawValue) return; // silently skip a fully empty row
        if (!rawValue) {
          valid = false;
          $message.addClass('text-danger').text(t.invalid_value_row);
          $(this).find('.md-value-value').trigger('focus');
          return;
        }
        var rowEntry = { value: rawValue };
        if (rawRowIdx) {
          var rowIdx = parseInt(rawRowIdx, 10);
          if (!(rowIdx > 0 && String(rowIdx) === rawRowIdx)) {
            valid = false;
            $message.addClass('text-danger').text(t.invalid_idx);
            $(this).find('.md-value-idx').trigger('focus');
            return;
          }
          rowEntry.idx = rowIdx;
        }
        values.push(rowEntry);
      });
      if (!valid) return;
      if (!values.length) {
        $message.addClass('text-danger').text(t.invalid_value_row);
        return;
      }

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      // Stored the same way a hand-written blocks[key].values JSON field would be:
      // one 'values' custom field whose value is the array itself.
      customRows.push({
        field: 'values',
        setting: JSON.stringify(values),
        value: values,
      });

      var quickOptions = _readQuickOptions('md');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      if (iconIsImage && quickOptions.iconValue) {
        customRows.unshift({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'custom',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 3,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          hide_data: false,
          last_update: quickOptions.lastUpdate,
          switch: false,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('multidevicepopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('multidevicepopup')
    ).show();
  }

  /* Group: Dashticz's own client-side group/scene aggregate block (not to be
   * confused with a plain Domoticz Group/Scene device already offered by the
   * normal Add device dropdown). See docs/blocks/specials/group.rst. Saved
   * as its own specialType 'group' - idx (optional) and devices/longpress/
   * mixed (optional, editable afterwards as custom fields like any Custom
   * device) are the only parameters unique to it; width/title/icon/last
   * update/title-visibility all reuse the same shared options every other
   * quick-add popup on this screen uses. */
  function _showGroupPopup() {
    var t = _translations();
    $('#groupblockpopup').remove();

    var html =
      '<div class="modal fade" id="groupblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-object-group me-2" aria-hidden="true"></i>' +
      _esc(t.group_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    html += _quickOptionsHtml('gb', {
      icon: true,
      iconValue: 'fas fa-object-group',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="gb-device-name">' +
      _esc(t.group_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="gb-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' + _esc(t.group_name_help) + '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="gb-device-idx">' +
      _esc(t.group_idx) +
      '</label>';
    html +=
      '<input type="number" min="1" step="1" class="form-control" id="gb-device-idx">';
    html += '<div class="form-text">' + _esc(t.group_idx_help) + '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="gb-device-devices">' +
      _esc(t.group_devices) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="gb-device-devices" placeholder="1, 3, 5">';
    html +=
      '<div class="form-text">' + _esc(t.group_devices_help) + '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="gb-device-title">' +
      _esc(t.group_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="gb-device-title" autocomplete="off"></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="gb-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#groupblockpopup');
    _wireQuickOptions('gb', $popup);
    _wireBackButton('groupblockpopup');

    $('#gb-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#gb-device-name').val() || ''));
      var title = $.trim(String($('#gb-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_group_name);
        $('#gb-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_group_name);
        $('#gb-device-name').trigger('focus');
        return;
      }

      var rawIdx = $.trim(String($('#gb-device-idx').val() || ''));
      var idx = null;
      if (rawIdx) {
        var parsedIdx = parseInt(rawIdx, 10);
        if (!(parsedIdx > 0 && String(parsedIdx) === rawIdx)) {
          $message.addClass('text-danger').text(t.invalid_idx);
          $('#gb-device-idx').trigger('focus');
          return;
        }
        idx = parsedIdx;
      }

      var rawDevices = $.trim(String($('#gb-device-devices').val() || ''));
      var devices = [];
      if (rawDevices) {
        var invalidDevices = false;
        devices = rawDevices
          .split(/[\s,]+/)
          .filter(function (part) {
            return part !== '';
          })
          .map(function (part) {
            var n = parseInt(part, 10);
            if (!(n > 0 && String(n) === part)) invalidDevices = true;
            return n;
          });
        if (invalidDevices) {
          $message.addClass('text-danger').text(t.invalid_group_devices);
          $('#gb-device-devices').trigger('focus');
          return;
        }
      }
      if (!idx && !devices.length) {
        $message.addClass('text-danger').text(t.invalid_group_devices);
        $('#gb-device-devices').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('gb');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      if (devices.length) {
        customRows.push({
          field: 'devices',
          setting: JSON.stringify(devices),
          value: devices,
        });
      }

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'group',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 3,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('groupblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('groupblockpopup')
    ).show();
  }

  var LMS_REFRESH_OPTIONS = [2, 5, 10, 20, 30, 60];

  /* Server/Port/Username/Password/Test connection/Player/Refresh interval -
   * shared between the Lyrion Music Server quick-add popup (_showLmsPopup)
   * and the normal Device Config popup's own edit view for an already-saved
   * LMS block (_showConfigPopup), so player discovery ("Test connection")
   * only has one implementation. currentPlayer/currentPlayerLabel let the
   * edit view show the configured player's last-known friendly name before
   * the user re-tests the connection (see docs/blocks/specials/lms.rst). */
  /* Mirrors vendor/dashticz/security.php's dashticz_normalize_host_input():
   * strips a pasted scheme ("http://"/"https://"), any trailing path/query/
   * fragment, and an accidentally-included ":port" from the "Server / IP"
   * field, so e.g. "http://192.168.1.6/" resolves instead of producing a
   * malformed double-scheme URL server-side. Applied both before "Test
   * connection" and before save, so the field always reflects what gets
   * persisted. */
  function _normalizeLmsServer(value) {
    var host = $.trim(String(value || ''));
    host = host.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
    host = host.replace(/[/?#].*$/, '');
    host = $.trim(host);
    if (host.indexOf('[') === -1 && (host.match(/:/g) || []).length === 1) {
      host = host.slice(0, host.indexOf(':'));
    }
    return host.replace(/\.+$/, '');
  }

  function _lmsFieldsHtml(prefix, values) {
    var t = _translations();
    values = values || {};
    var html =
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-server">' +
      _esc(t.lms_server) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="' +
      prefix +
      '-lms-server" autocomplete="off" value="' +
      _esc(values.server || '') +
      '"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-port">' +
      _esc(t.lms_port) +
      '</label>';
    html +=
      '<input type="number" min="1" max="65535" class="form-control" id="' +
      prefix +
      '-lms-port" value="' +
      _esc(values.port || 9000) +
      '"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-username">' +
      _esc(t.lms_username) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="' +
      prefix +
      '-lms-username" autocomplete="off" value="' +
      _esc(values.username || '') +
      '"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-password">' +
      _esc(t.lms_password) +
      '</label>';
    html +=
      '<input type="password" class="form-control" id="' +
      prefix +
      '-lms-password" autocomplete="off" value="' +
      _esc(values.password || '') +
      '">';
    html +=
      '<div class="form-text">' + _esc(t.lms_credentials_help) + '</div></div>';
    html += '<div class="mb-3">';
    html +=
      '<button type="button" class="btn btn-outline-secondary btn-sm de-lms-test" id="' +
      prefix +
      '-lms-test"><i class="fas fa-plug me-1" aria-hidden="true"></i>' +
      _esc(t.lms_test_connection) +
      '</button>';
    html += '<span class="de-lms-test-status ms-2"></span></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-player">' +
      _esc(t.lms_player) +
      '</label>';
    html +=
      '<select class="form-select de-lms-player" id="' +
      prefix +
      '-lms-player"' +
      (values.player ? '' : ' disabled') +
      '>';
    if (values.player) {
      html +=
        '<option value="' +
        _esc(values.player) +
        '" selected>' +
        _esc(values.playerLabel || values.player) +
        '</option>';
    } else {
      html +=
        '<option value="">' + _esc(t.lms_player_placeholder) + '</option>';
    }
    html += '</select></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="' +
      prefix +
      '-lms-refresh">' +
      _esc(t.lms_refresh_interval) +
      '</label>';
    html += '<select class="form-select" id="' + prefix + '-lms-refresh">';
    LMS_REFRESH_OPTIONS.forEach(function (seconds) {
      html +=
        '<option value="' +
        seconds +
        '"' +
        (Number(values.refresh || 5) === seconds ? ' selected' : '') +
        '>' +
        seconds +
        ' ' +
        _esc(t.seconds || 'seconds') +
        '</option>';
    });
    html += '</select></div>';
    html +=
      '<label class="form-check form-switch mb-3"><input class="form-check-input de-lms-switch" type="checkbox" id="' +
      prefix +
      '-lms-hide-when-off"' +
      (values.hideWhenOff ? ' checked' : '') +
      '>' +
      '<span class="form-check-label">' +
      _esc(t.lms_hide_when_off) +
      '</span></label>';
    return html;
  }

  /* Call once after appending markup built with _lmsFieldsHtml() above. */
  function _wireLmsFields(prefix, $popup) {
    var t = _translations();
    $popup.on('click', '#' + prefix + '-lms-test', function () {
      var $btn = $(this);
      var $status = $popup.find('.de-lms-test-status');
      var $player = $popup.find('#' + prefix + '-lms-player');
      var $serverInput = $popup.find('#' + prefix + '-lms-server');
      var server = _normalizeLmsServer($serverInput.val());
      $serverInput.val(server);
      var port =
        parseInt($popup.find('#' + prefix + '-lms-port').val(), 10) || 9000;
      if (!server) {
        $status
          .removeClass('text-success')
          .addClass('text-danger')
          .text(t.invalid_lms_server);
        $serverInput.trigger('focus');
        return;
      }
      var previousPlayer = $player.val();
      var block = {
        server: server,
        port: port,
        username: $.trim(
          String($popup.find('#' + prefix + '-lms-username').val() || '')
        ),
        password: String(
          $popup.find('#' + prefix + '-lms-password').val() || ''
        ),
      };
      $btn.prop('disabled', true);
      $status
        .removeClass('text-success text-danger')
        .text(t.lms_testing_connection);
      DT_lms_api.request(block, ['serverstatus', 0, 999], '')
        .then(function (result) {
          var players = (result && result.players_loop) || [];
          $player.empty();
          if (!players.length) {
            $player
              .append(
                '<option value="">' + _esc(t.lms_no_players) + '</option>'
              )
              .prop('disabled', true);
            $status
              .removeClass('text-success')
              .addClass('text-danger')
              .text(t.lms_no_players);
            return;
          }
          players.forEach(function (p) {
            var id = String((p && p.playerid) || '');
            if (!id) return;
            var name = String((p && p.name) || id);
            $player.append(
              '<option value="' + _esc(id) + '">' + _esc(name) + '</option>'
            );
          });
          $player.prop('disabled', false);
          if (
            previousPlayer &&
            $player.find(
              'option[value="' + previousPlayer.replace(/"/g, '\\"') + '"]'
            ).length
          ) {
            $player.val(previousPlayer);
          }
          $status
            .removeClass('text-danger')
            .addClass('text-success')
            .text(
              t.lms_connection_ok +
                ' — ' +
                players.length +
                ' ' +
                t.lms_players_found
            );
        })
        .catch(function (xhr) {
          var message =
            (xhr && xhr.responseJSON && xhr.responseJSON.error) ||
            t.lms_connection_failed;
          $status
            .removeClass('text-success')
            .addClass('text-danger')
            .text(message);
        })
        .always(function () {
          $btn.prop('disabled', false);
        });
    });
  }

  function _readLmsFields(prefix, $popup) {
    return {
      server: _normalizeLmsServer(
        $popup.find('#' + prefix + '-lms-server').val()
      ),
      port: parseInt($popup.find('#' + prefix + '-lms-port').val(), 10) || 9000,
      username: $.trim(
        String($popup.find('#' + prefix + '-lms-username').val() || '')
      ),
      password: String($popup.find('#' + prefix + '-lms-password').val() || ''),
      player: String($popup.find('#' + prefix + '-lms-player').val() || ''),
      playerLabel: String(
        $popup.find('#' + prefix + '-lms-player option:selected').text() || ''
      ),
      refresh:
        parseInt($popup.find('#' + prefix + '-lms-refresh').val(), 10) || 5,
      hideWhenOff: $popup
        .find('#' + prefix + '-lms-hide-when-off')
        .is(':checked'),
    };
  }

  /* Lyrion Music Server: a read-only "Now Playing" block for one LMS player
   * (js/components/lms.js), configured via player discovery instead of a
   * hand-typed MAC address - see docs/blocks/specials/lms.rst. Like Group/
   * HTML Block, it has no Domoticz idx of its own. */
  function _showLmsPopup() {
    var t = _translations();
    $('#lmsblockpopup').remove();

    var html =
      '<div class="modal fade" id="lmsblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-music me-2" aria-hidden="true"></i>' +
      _esc(t.lms_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Icon defaults off, like HTML Block: the cover artwork is this block's
    // own visual, so a leading icon would be redundant unless the user wants one.
    html += _quickOptionsHtml('lm', {
      icon: false,
      iconValue: 'fas fa-music',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="lm-device-title">' +
      _esc(t.lms_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="lm-device-title" autocomplete="off"></div>';
    html += _lmsFieldsHtml('lm', { port: 9000, refresh: 5 });
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="lm-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#lmsblockpopup');
    _wireQuickOptions('lm', $popup);
    _wireLmsFields('lm', $popup);
    _wireBackButton('lmsblockpopup');

    $('#lm-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var title = $.trim(String($('#lm-device-title').val() || ''));
      var lms = _readLmsFields('lm', $popup);
      if (!lms.server) {
        $message.addClass('text-danger').text(t.invalid_lms_server);
        $('#lm-lms-server').trigger('focus');
        return;
      }
      if (!(lms.port > 0 && lms.port <= 65535)) {
        $message.addClass('text-danger').text(t.invalid_lms_port);
        $('#lm-lms-port').trigger('focus');
        return;
      }
      if (!lms.player) {
        $message.addClass('text-danger').text(t.invalid_lms_player);
        $('#lm-lms-player').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('lm');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var reference = _nextSpecialReference('lms');
      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'lms',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title || lms.playerLabel || '',
        width: 6,
        // A block's `height` means two different things depending on mode
        // (js/dashticz.js's renderBlock(): grid-row count in grid mode vs.
        // a literal CSS pixel height outside it), so a fixed default is
        // only meaningful in grid mode - the only mode this popup is
        // actually reachable from (the Widgets catalog is grid-only).
        // 8 rows comfortably fits the 100px cover plus its info lines.
        height: gridMode ? 8 : null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: false,
        },
        customFields:
          title || lms.playerLabel
            ? [
                {
                  field: 'title',
                  setting: title || lms.playerLabel,
                  value: title || lms.playerLabel,
                  system: true,
                },
              ]
            : [],
        preservedFields: {},
        lmsServer: lms.server,
        lmsPort: lms.port,
        lmsUsername: lms.username,
        lmsPassword: lms.password,
        lmsPlayer: lms.player,
        lmsPlayerLabel: lms.playerLabel,
        lmsRefresh: lms.refresh,
        lmsHideWhenOff: lms.hideWhenOff,
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('lmsblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('lmsblockpopup')
    ).show();
  }

  /* HTML Block: renders a static custom/<file>.html snippet (e.g. an
   * embedded third-party widget) via DT_html (js/components/html.js), which
   * dispatches purely on the presence of a truthy `htmlfile` property - no
   * `type` is written for this block. See docs/blocks/specials/html.rst. */
  function _showHtmlBlockPopup() {
    var t = _translations();
    $('#htmlblockpopup').remove();

    var html =
      '<div class="modal fade" id="htmlblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-code me-2" aria-hidden="true"></i>' +
      _esc(t.html_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Icon defaults off ("Default no icon" per docs/blocks/specials/html.rst);
    // an arbitrary HTML snippet has no Domoticz device to derive one from.
    html += _quickOptionsHtml('hb', {
      icon: false,
      iconValue: 'fas fa-code',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="hb-device-name">' +
      _esc(t.html_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="hb-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' + _esc(t.html_block_name_help) + '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="hb-device-file">' +
      _esc(t.html_block_file) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="hb-device-file" placeholder="widget.html" autocomplete="off">';
    html +=
      '<div class="form-text">' + _esc(t.html_block_file_help) + '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="hb-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="hb-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input" type="checkbox" id="hb-device-border">';
    html +=
      '<label class="form-check-label" for="hb-device-border">' +
      _esc(t.html_block_border) +
      '</label></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="hb-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#htmlblockpopup');
    _wireQuickOptions('hb', $popup);
    _wireBackButton('htmlblockpopup');

    $('#hb-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#hb-device-name').val() || ''));
      var title = $.trim(String($('#hb-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_html_block_name);
        $('#hb-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_html_block_name);
        $('#hb-device-name').trigger('focus');
        return;
      }

      var htmlfile = $.trim(String($('#hb-device-file').val() || ''));
      if (
        !/^[A-Za-z0-9_\-./ ]+\.html?$/i.test(htmlfile) ||
        htmlfile.indexOf('..') > -1
      ) {
        $message.addClass('text-danger').text(t.invalid_html_block_file);
        $('#hb-device-file').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('hb');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var border = $('#hb-device-border').is(':checked');
      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      customRows.push({
        field: 'htmlfile',
        setting: htmlfile,
        value: htmlfile,
      });
      if (border)
        customRows.push({ field: 'border', setting: 'true', value: true });

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'html',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title,
        width: 3,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('htmlblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('htmlblockpopup')
    ).show();
  }

  /* Repeatable iFrame block - same managedSpecials mechanism as HTML Block
     above (kind:'special', specialType:'iframe'), so any number of
     independently-configured iframes can be placed, unlike the Widgets
     catalog's singleton 'iframe' entry (always the fixed 'widget_iframe'
     key). js/components/frame.js dispatches on a truthy frameurl alone, no
     `type` of its own - see _specialFromReference()'s matching 'iframe'
     branch, which excludes the legacy 'widget_iframe' key so that singleton
     stays on its own Widget Editor path unchanged. */
  function _showIframePopup() {
    var t = _translations();
    $('#iframeblockpopup').remove();

    var html =
      '<div class="modal fade" id="iframeblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-window-maximize me-2" aria-hidden="true"></i>' +
      _esc(t.iframe_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Icon defaults on, using the catalog's own iframe icon - unlike HTML
    // Block/Calendar, iframe already has a well-known default icon
    // (js/widgeteditor.js's _usesExplicitEditorDefaultIcon() persists this
    // exact icon for the singleton catalog widget too, to avoid a
    // historical no-icon regression - see its comment for context).
    html += _quickOptionsHtml('if', {
      icon: true,
      iconValue: 'fas fa-window-maximize',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-name">' +
      _esc(t.iframe_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="if-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.iframe_block_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-url">' +
      _esc(t.iframe_block_url) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="if-device-url" placeholder="https://..." autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.iframe_block_url_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="if-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-height">' +
      _esc(t.iframe_block_height) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="if-device-height" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="if-device-scrollbars">';
    html +=
      '<label class="form-check-label" for="if-device-scrollbars">' +
      _esc(t.iframe_block_scrollbars) +
      '</label></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-scaletofit">' +
      _esc(t.iframe_block_scaletofit) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="if-device-scaletofit" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-aspectratio">' +
      _esc(t.iframe_block_aspectratio) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="if-device-aspectratio" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="if-device-forcerefresh">';
    html +=
      '<label class="form-check-label" for="if-device-forcerefresh">' +
      _esc(t.iframe_block_forcerefresh) +
      '</label></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="if-device-refresh">' +
      _esc(t.iframe_block_refresh) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="if-device-refresh" min="0" autocomplete="off"></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="if-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#iframeblockpopup');
    _wireQuickOptions('if', $popup);
    _wireBackButton('iframeblockpopup');

    $('#if-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#if-device-name').val() || ''));
      var title = $.trim(String($('#if-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_iframe_block_name);
        $('#if-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_iframe_block_name);
        $('#if-device-name').trigger('focus');
        return;
      }

      var frameurl = $.trim(String($('#if-device-url').val() || ''));
      if (!frameurl || frameurl.length > 2048) {
        $message.addClass('text-danger').text(t.invalid_iframe_block_url);
        $('#if-device-url').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('if');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var height = $.trim(String($('#if-device-height').val() || ''));
      var scrollbars = $('#if-device-scrollbars').is(':checked');
      var scaletofit = $.trim(String($('#if-device-scaletofit').val() || ''));
      var aspectratio = $.trim(String($('#if-device-aspectratio').val() || ''));
      var forcerefresh = $('#if-device-forcerefresh').is(':checked');
      var refresh = $.trim(String($('#if-device-refresh').val() || ''));

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      customRows.push({
        field: 'frameurl',
        setting: frameurl,
        value: frameurl,
      });
      if (height) {
        var heightInt = parseInt(height, 10) || 0;
        if (heightInt > 0) {
          customRows.push({
            field: 'height',
            setting: String(heightInt),
            value: heightInt,
          });
        }
      }
      if (scrollbars) {
        customRows.push({
          field: 'scrollbars',
          setting: 'true',
          value: true,
        });
      }
      if (scaletofit) {
        var scaletofitInt = parseInt(scaletofit, 10) || 0;
        if (scaletofitInt > 0) {
          customRows.push({
            field: 'scaletofit',
            setting: String(scaletofitInt),
            value: scaletofitInt,
          });
        }
      }
      if (aspectratio) {
        customRows.push({
          field: 'aspectratio',
          setting: aspectratio,
          value: aspectratio,
        });
      }
      if (forcerefresh) {
        customRows.push({
          field: 'forcerefresh',
          setting: 'true',
          value: true,
        });
      }
      if (refresh) {
        var refreshInt = parseInt(refresh, 10) || 0;
        if (refreshInt > 0) {
          customRows.push({
            field: 'refresh',
            setting: String(refreshInt),
            value: refreshInt,
          });
        }
      }

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'iframe',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title,
        width: 6,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('iframeblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('iframeblockpopup')
    ).show();
  }

  /* Repeatable Calendar block - same managedSpecials mechanism as iFrame/
     HTML Block above (kind:'special', specialType:'calendar'), so any
     number of independently-configured calendars can be placed, unlike
     the Widgets catalog's singleton 'calendar' entry (always the fixed
     'widget_calendar' key). js/components/calendar.js dispatches on a
     truthy icalurl (or an explicit type:'calendar'/legacy calendars
     array) - see _specialFromReference()'s matching 'calendar' branch,
     which excludes the legacy 'widget_calendar' key so that singleton
     stays on its own Widget Editor path unchanged. Scoped to a single
     ICS source per block (title/icalurl/holidayurl/layout/maxitems/
     weeks/lastweek/isoweek/startonly) - the existing singleton widget's
     richer multi-source-with-color picker stays available there for
     anyone who needs it, same as hand-editing custom/CONFIG.js already
     supports every calendar.js field regardless. */
  function _showCalendarPopup() {
    var t = _translations();
    $('#calendarblockpopup').remove();

    var layoutOptions = [
      ['0', t.calendar_block_layout_0],
      ['1', t.calendar_block_layout_1],
      ['2', t.calendar_block_layout_2],
      ['3', t.calendar_block_layout_3],
      ['4', t.calendar_block_layout_4],
    ];

    var html =
      '<div class="modal fade" id="calendarblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-calendar-alt me-2" aria-hidden="true"></i>' +
      _esc(t.calendar_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    html += _quickOptionsHtml('cal', {
      icon: false,
      iconValue: 'fas fa-calendar-alt',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-name">' +
      _esc(t.calendar_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cal-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.calendar_block_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-icalurl">' +
      _esc(t.calendar_block_icalurl) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cal-device-icalurl" placeholder="https://..." autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.calendar_block_icalurl_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cal-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-holidayurl">' +
      _esc(t.calendar_block_holidayurl) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="cal-device-holidayurl" placeholder="https://..." autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-layout">' +
      _esc(t.calendar_block_layout) +
      '</label>';
    html += '<select class="form-select" id="cal-device-layout">';
    layoutOptions.forEach(function (option) {
      html +=
        '<option value="' +
        _esc(option[0]) +
        '">' +
        _esc(option[1]) +
        '</option>';
    });
    html += '</select></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-maxitems">' +
      _esc(t.calendar_block_maxitems) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="cal-device-maxitems" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="cal-device-weeks">' +
      _esc(t.calendar_block_weeks) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="cal-device-weeks" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="cal-device-lastweek">';
    html +=
      '<label class="form-check-label" for="cal-device-lastweek">' +
      _esc(t.calendar_block_lastweek) +
      '</label></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="cal-device-isoweek">';
    html +=
      '<label class="form-check-label" for="cal-device-isoweek">' +
      _esc(t.calendar_block_isoweek) +
      '</label></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="cal-device-startonly">';
    html +=
      '<label class="form-check-label" for="cal-device-startonly">' +
      _esc(t.calendar_block_startonly) +
      '</label></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="cal-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#calendarblockpopup');
    _wireQuickOptions('cal', $popup);
    _wireBackButton('calendarblockpopup');

    $('#cal-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#cal-device-name').val() || ''));
      var title = $.trim(String($('#cal-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_calendar_block_name);
        $('#cal-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_calendar_block_name);
        $('#cal-device-name').trigger('focus');
        return;
      }

      var icalurl = $.trim(String($('#cal-device-icalurl').val() || ''));
      if (!icalurl || icalurl.length > 2048) {
        $message.addClass('text-danger').text(t.invalid_calendar_block_icalurl);
        $('#cal-device-icalurl').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('cal');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var holidayurl = $.trim(String($('#cal-device-holidayurl').val() || ''));
      var layout = String($('#cal-device-layout').val() || '0');
      var maxitems = $.trim(String($('#cal-device-maxitems').val() || ''));
      var weeks = $.trim(String($('#cal-device-weeks').val() || ''));
      var lastweek = $('#cal-device-lastweek').is(':checked');
      var isoweek = $('#cal-device-isoweek').is(':checked');
      var startonly = $('#cal-device-startonly').is(':checked');

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      customRows.push({ field: 'icalurl', setting: icalurl, value: icalurl });
      if (holidayurl) {
        customRows.push({
          field: 'holidayurl',
          setting: holidayurl,
          value: holidayurl,
        });
      }
      if (layout !== '0') {
        customRows.push({
          field: 'layout',
          setting: layout,
          value: parseInt(layout, 10),
        });
      }
      if (maxitems) {
        var maxitemsInt = parseInt(maxitems, 10) || 0;
        if (maxitemsInt > 0) {
          customRows.push({
            field: 'maxitems',
            setting: String(maxitemsInt),
            value: maxitemsInt,
          });
        }
      }
      if (weeks) {
        var weeksInt = parseInt(weeks, 10) || 0;
        if (weeksInt > 0) {
          customRows.push({
            field: 'weeks',
            setting: String(weeksInt),
            value: weeksInt,
          });
        }
      }
      if (lastweek) {
        customRows.push({ field: 'lastweek', setting: 'true', value: true });
      }
      if (isoweek) {
        customRows.push({ field: 'isoweek', setting: 'true', value: true });
      }
      if (startonly) {
        customRows.push({ field: 'startonly', setting: 'true', value: true });
      }

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'calendar',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title,
        width: 6,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('calendarblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('calendarblockpopup')
    ).show();
  }

  /* Repeatable Public transport block - same managedSpecials mechanism as
     iFrame/Calendar/HTML Block above (kind:'special',
     specialType:'publictransport'), so any number of independently-
     configured departure boards can be placed, unlike the Widgets
     catalog's singleton 'publictransport' entry (always the fixed
     'widget_publictransport' key). js/components/publictransport.js
     dispatches on a truthy station or tpc - see
     _specialFromReference()'s matching branch, which excludes the legacy
     'widget_publictransport' key. Provider list/labels match the existing
     singleton widget's own Wizard config (js/widgeteditor.js's
     '_ptOption()' calls) for consistency. */
  function _showPublicTransportPopup() {
    var t = _translations();
    $('#publictransportblockpopup').remove();

    var providerOptions = [
      ['treinen', t.publictransport_block_provider_treinen],
      ['ovapi', t.publictransport_block_provider_ovapi],
      ['drgl', t.publictransport_block_provider_drgl],
      ['irailbe', t.publictransport_block_provider_irailbe],
      ['delijnbe', t.publictransport_block_provider_delijnbe],
    ];

    var html =
      '<div class="modal fade" id="publictransportblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-train me-2" aria-hidden="true"></i>' +
      _esc(t.publictransport_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    html += _quickOptionsHtml('pt', {
      icon: true,
      iconValue: 'fas fa-train',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-name">' +
      _esc(t.publictransport_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="pt-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.publictransport_block_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="pt-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-provider">' +
      _esc(t.publictransport_block_provider) +
      '</label>';
    html += '<select class="form-select" id="pt-device-provider">';
    providerOptions.forEach(function (option) {
      html +=
        '<option value="' +
        _esc(option[0]) +
        '">' +
        _esc(option[1]) +
        '</option>';
    });
    html += '</select></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-station">' +
      _esc(t.publictransport_block_station) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="pt-device-station" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.publictransport_block_station_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-tpc">' +
      _esc(t.publictransport_block_tpc) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="pt-device-tpc" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.publictransport_block_tpc_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-direction">' +
      _esc(t.publictransport_block_direction) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="pt-device-direction" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="pt-device-results">' +
      _esc(t.publictransport_block_results) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="pt-device-results" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="pt-device-showvia" checked>';
    html +=
      '<label class="form-check-label" for="pt-device-showvia">' +
      _esc(t.publictransport_block_showvia) +
      '</label></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="pt-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#publictransportblockpopup');
    _wireQuickOptions('pt', $popup);
    _wireBackButton('publictransportblockpopup');

    $('#pt-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#pt-device-name').val() || ''));
      var title = $.trim(String($('#pt-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message
          .addClass('text-danger')
          .text(t.invalid_publictransport_block_name);
        $('#pt-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message
          .addClass('text-danger')
          .text(t.invalid_publictransport_block_name);
        $('#pt-device-name').trigger('focus');
        return;
      }

      var station = $.trim(String($('#pt-device-station').val() || ''));
      var tpc = $.trim(String($('#pt-device-tpc').val() || ''));
      if (!station && !tpc) {
        $message
          .addClass('text-danger')
          .text(t.invalid_publictransport_block_station);
        $('#pt-device-station').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('pt');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var provider = String($('#pt-device-provider').val() || 'treinen');
      var direction = $.trim(String($('#pt-device-direction').val() || ''));
      var results = $.trim(String($('#pt-device-results').val() || ''));
      var showVia = $('#pt-device-showvia').is(':checked');

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      customRows.push({
        field: 'provider',
        setting: provider,
        value: provider,
      });
      if (station) {
        customRows.push({ field: 'station', setting: station, value: station });
      }
      if (tpc) {
        customRows.push({ field: 'tpc', setting: tpc, value: tpc });
      }
      if (direction) {
        customRows.push({
          field: 'direction',
          setting: direction,
          value: direction,
        });
      }
      if (results) {
        var resultsInt = parseInt(results, 10) || 0;
        if (resultsInt > 0) {
          customRows.push({
            field: 'results',
            setting: String(resultsInt),
            value: resultsInt,
          });
        }
      }
      customRows.push({
        field: 'show_via',
        setting: showVia ? 'true' : 'false',
        value: showVia,
      });

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'publictransport',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title,
        width: 3,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('publictransportblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('publictransportblockpopup')
    ).show();
  }

  /* Repeatable Timegraph block - same managedSpecials mechanism as
     Public transport/Calendar/iFrame/HTML Block above (kind:'special',
     specialType:'timegraph'), so any number of independently-configured
     graphs can be placed, unlike the Widgets catalog's singleton
     'timegraph' entry (always the fixed 'widget_timegraph' key). Unlike
     html/iframe/calendar/publictransport above, js/components/timegraph.js
     dispatches on an explicit type:'timegraph' only (no shape-based
     fallback), the same as Group/LMS - see _specialFromReference()'s
     matching branch and configwriter.php's 'timegraph' kind, which both
     write/read that type unconditionally. Scoped to a single graphed
     device per block (idx/duration/height/xTicks/yTicks/xLabels) - the
     existing singleton widget's richer repeatable multi-value-row editor
     (several series in one graph) stays available there for anyone who
     needs it, same as hand-editing custom/CONFIG.js already supports
     every timegraph.js field regardless. */
  function _showTimegraphPopup() {
    var t = _translations();
    $('#timegraphblockpopup').remove();

    var html =
      '<div class="modal fade" id="timegraphblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-chart-line me-2" aria-hidden="true"></i>' +
      _esc(t.timegraph_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    html += _quickOptionsHtml('tg', {
      icon: true,
      iconValue: 'fas fa-chart-line',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-name">' +
      _esc(t.timegraph_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="tg-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.timegraph_block_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="tg-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-idx">' +
      _esc(t.timegraph_block_idx) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="tg-device-idx" min="1" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.timegraph_block_idx_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-duration">' +
      _esc(t.timegraph_block_duration) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="tg-device-duration" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-height">' +
      _esc(t.timegraph_block_height) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="tg-device-height" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-xticks">' +
      _esc(t.timegraph_block_xticks) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="tg-device-xticks" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="tg-device-yticks">' +
      _esc(t.timegraph_block_yticks) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="tg-device-yticks" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3 form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="tg-device-xlabels" checked>';
    html +=
      '<label class="form-check-label" for="tg-device-xlabels">' +
      _esc(t.timegraph_block_xlabels) +
      '</label></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="tg-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#timegraphblockpopup');
    _wireQuickOptions('tg', $popup);
    _wireBackButton('timegraphblockpopup');

    $('#tg-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#tg-device-name').val() || ''));
      var title = $.trim(String($('#tg-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_timegraph_block_name);
        $('#tg-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_timegraph_block_name);
        $('#tg-device-name').trigger('focus');
        return;
      }

      var idx = parseInt($('#tg-device-idx').val(), 10) || 0;
      if (idx < 1) {
        $message.addClass('text-danger').text(t.invalid_timegraph_block_idx);
        $('#tg-device-idx').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('tg');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var duration = $.trim(String($('#tg-device-duration').val() || ''));
      var height = $.trim(String($('#tg-device-height').val() || ''));
      var xTicks = $.trim(String($('#tg-device-xticks').val() || ''));
      var yTicks = $.trim(String($('#tg-device-yticks').val() || ''));
      var xLabels = $('#tg-device-xlabels').is(':checked');

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      if (duration) {
        var durationInt = parseInt(duration, 10) || 0;
        if (durationInt > 0) {
          customRows.push({
            field: 'duration',
            setting: String(durationInt),
            value: durationInt,
          });
        }
      }
      if (height) {
        var heightInt = parseInt(height, 10) || 0;
        if (heightInt > 0) {
          customRows.push({
            field: 'height',
            setting: String(heightInt),
            value: heightInt,
          });
        }
      }
      if (xTicks) {
        var xTicksInt = parseInt(xTicks, 10) || 0;
        if (xTicksInt > 0) {
          customRows.push({
            field: 'xTicks',
            setting: String(xTicksInt),
            value: xTicksInt,
          });
        }
      }
      if (yTicks) {
        var yTicksInt = parseInt(yTicks, 10) || 0;
        if (yTicksInt > 0) {
          customRows.push({
            field: 'yTicks',
            setting: String(yTicksInt),
            value: yTicksInt,
          });
        }
      }
      if (!xLabels) {
        customRows.push({ field: 'xLabels', setting: 'false', value: false });
      }

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'timegraph',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: idx,
        title: title,
        width: 6,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('timegraphblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('timegraphblockpopup')
    ).show();
  }

  /* Repeatable TV Guide (XMLTV) block - same managedSpecials mechanism as
     Timegraph/Public transport/Calendar/iFrame/HTML Block above
     (kind:'special', specialType:'xmltvguide'), so any number of
     independently-configured guides can be placed, unlike the Widgets
     catalog's singleton 'xmltvguide' entry (always the fixed
     'widget_xmltvguide' key, and whose settings additionally fall back to
     global settings['xmltv_*'] when a block leaves a field unset -
     js/components/xmltvguide.js's defaultCfg). Every field below is
     always written explicitly onto the new block, so a repeatable
     instance never depends on those globals. js/components/xmltvguide.js
     dispatches on a truthy xmltvurl (or an explicit type:'xmltvguide') -
     see _specialFromReference()'s matching 'xmltvguide' branch, which
     excludes the legacy 'widget_xmltvguide' key. */
  function _showXmltvguidePopup() {
    var t = _translations();
    $('#xmltvguideblockpopup').remove();

    var layoutOptions = [
      ['0', t.xmltvguide_block_layout_0],
      ['1', t.xmltvguide_block_layout_1],
    ];

    var html =
      '<div class="modal fade" id="xmltvguideblockpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-tv me-2" aria-hidden="true"></i>' +
      _esc(t.xmltvguide_block) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    html += _quickOptionsHtml('xtv', {
      icon: true,
      iconValue: 'fas fa-tv',
      lastUpdate: false,
      showTitle: true,
    });
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-name">' +
      _esc(t.xmltvguide_block_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="xtv-device-name" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.xmltvguide_block_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-title">' +
      _esc(t.html_block_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="xtv-device-title" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-url">' +
      _esc(t.xmltvguide_block_url) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="xtv-device-url" placeholder="http://..." autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.xmltvguide_block_url_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-channels">' +
      _esc(t.xmltvguide_block_channels) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="xtv-device-channels" placeholder="BBC One, ITV, Channel 4" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.xmltvguide_block_channels_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-maxitems">' +
      _esc(t.xmltvguide_block_maxitems) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="xtv-device-maxitems" min="0" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-layout">' +
      _esc(t.xmltvguide_block_layout) +
      '</label>';
    html += '<select class="form-select" id="xtv-device-layout">';
    layoutOptions.forEach(function (option) {
      html +=
        '<option value="' +
        _esc(option[0]) +
        '">' +
        _esc(option[1]) +
        '</option>';
    });
    html += '</select></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="xtv-device-refresh">' +
      _esc(t.xmltvguide_block_refresh) +
      '</label>';
    html +=
      '<input type="number" class="form-control" id="xtv-device-refresh" min="0" autocomplete="off"></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="xtv-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#xmltvguideblockpopup');
    _wireQuickOptions('xtv', $popup);
    _wireBackButton('xmltvguideblockpopup');

    $('#xtv-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#xtv-device-name').val() || ''));
      var title = $.trim(String($('#xtv-device-title').val() || ''));
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_xmltvguide_block_name);
        $('#xtv-device-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_xmltvguide_block_name);
        $('#xtv-device-name').trigger('focus');
        return;
      }

      var xmltvurl = $.trim(String($('#xtv-device-url').val() || ''));
      if (!xmltvurl || xmltvurl.length > 2048) {
        $message.addClass('text-danger').text(t.invalid_xmltvguide_block_url);
        $('#xtv-device-url').trigger('focus');
        return;
      }

      var quickOptions = _readQuickOptions('xtv');
      var iconIsImage =
        quickOptions.icon && quickOptions.iconSource === 'image';
      var channelsRaw = $.trim(String($('#xtv-device-channels').val() || ''));
      var channels = channelsRaw
        ? channelsRaw
            .split(',')
            .map(function (value) {
              return value.trim();
            })
            .filter(Boolean)
        : [];
      var maxitems = $.trim(String($('#xtv-device-maxitems').val() || ''));
      var layout = String($('#xtv-device-layout').val() || '0');
      var refresh = $.trim(String($('#xtv-device-refresh').val() || ''));

      var customRows = [];
      if (title)
        customRows.push({
          field: 'title',
          setting: title,
          value: title,
          system: true,
        });
      if (iconIsImage && quickOptions.iconValue) {
        customRows.push({
          field: 'image',
          setting: quickOptions.iconValue,
          value: quickOptions.iconValue,
        });
      }
      customRows.push({
        field: 'xmltvurl',
        setting: xmltvurl,
        value: xmltvurl,
      });
      if (channels.length) {
        customRows.push({
          field: 'channels',
          setting: channels.join(', '),
          value: channels,
        });
      }
      if (maxitems) {
        var maxitemsInt = parseInt(maxitems, 10) || 0;
        if (maxitemsInt > 0) {
          customRows.push({
            field: 'maxitems',
            setting: String(maxitemsInt),
            value: maxitemsInt,
          });
        }
      }
      if (layout !== '0') {
        customRows.push({
          field: 'layout',
          setting: layout,
          value: parseInt(layout, 10),
        });
      }
      if (refresh) {
        var refreshInt = parseInt(refresh, 10) || 0;
        if (refreshInt > 0) {
          customRows.push({
            field: 'refresh',
            setting: String(refreshInt),
            value: refreshInt,
          });
        }
      }

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'xmltvguide',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: title,
        width: 6,
        height: null,
        showTitle: quickOptions.showTitle,
        options: {
          icon: quickOptions.icon,
          iconValue: iconIsImage ? null : quickOptions.iconValue,
          last_update: quickOptions.lastUpdate,
        },
        customFields: customRows,
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('xmltvguideblockpopup')
      ).hide();
      _save();
    });

    $popup.one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('xmltvguideblockpopup')
    ).show();
  }

  function _showSlideButtonPopup() {
    var t = _translations();
    $('#slidebuttonpopup').remove();

    var html =
      '<div class="modal fade" id="slidebuttonpopup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-sliders-h me-2" aria-hidden="true"></i>' +
      _esc(t.slide_button) +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // Display options: an Icon toggle button (#195, same look/behavior as
    // every other quick-add popup's _quickOptionsHtml() row, and in the
    // same top-of-body position - id="sb-opt-icon" and class
    // "sb-opt-icon-field" match that shared function's own naming so
    // _wireQuickOptions('sb', $popup) below can wire it unchanged).
    // button.js's injectButtonEditor() appends a matching Background button
    // into this same row.
    html += '<h6 class="de-section-title">' + _esc(t.display_options) + '</h6>';
    html +=
      '<div class="d-flex flex-wrap gap-2 mb-3 de-config-options-icons" role="group" aria-label="' +
      _esc(t.display_options) +
      '">';
    html +=
      '<button type="button" class="btn btn-outline-secondary de-config-option active" id="sb-opt-icon" aria-pressed="true" title="' +
      _esc(t.icon) +
      '" style="min-width:72px;">' +
      '<i class="fas fa-image" aria-hidden="true"></i>' +
      '<span class="d-block small">' +
      _esc(t.icon) +
      '</span></button>';
    html += '</div>';
    html += '<div class="mb-3 sb-opt-icon-field">';
    html += _customFieldRowHtml(
      { field: 'icon', setting: 'fas fa-home' },
      { hideButtons: true }
    );
    // Only meaningful once a custom image is picked (not a font icon) -
    // toggled by refreshFullImageOption() below, mirroring how the image
    // picker itself only opens for the 'image' source (#171).
    html +=
      '<label class="form-check form-switch mt-2 sb-full-image-option d-none">' +
      '<input class="form-check-input" type="checkbox" id="sb-button-full-image">' +
      '<span class="form-check-label">' +
      _esc(t.slide_button_full_image) +
      '</span></label>';
    html += '</div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="sb-button-name">' +
      _esc(t.slide_button_name) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="sb-button-name" value="slidehome" autocomplete="off">';
    html +=
      '<div class="form-text">' +
      _esc(t.slide_button_name_help) +
      '</div></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="sb-button-key">' +
      _esc(t.slide_button_key) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="sb-button-key" value="Home" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="sb-button-title">' +
      _esc(t.slide_button_title) +
      '</label>';
    html +=
      '<input type="text" class="form-control" id="sb-button-title" value="Home Screen" autocomplete="off"></div>';
    html +=
      '<div class="mb-3"><label class="form-label" for="sb-button-screen">' +
      _esc(t.slide_button_screen) +
      '</label>';
    html +=
      '<input type="number" min="1" step="1" class="form-control" id="sb-button-screen" value="1"></div>';
    html += '<div class="cd-custom-message mt-2" role="status"></div></div>';
    html +=
      '<div class="modal-footer">' +
      _backButtonHtml() +
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="sb-save-btn"><i class="fas fa-floppy-disk me-1" aria-hidden="true"></i>' +
      _esc(t.save) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);
    var $popup = $('#slidebuttonpopup');
    _wireQuickOptions('sb', $popup);
    _wireBackButton('slidebuttonpopup');

    function refreshFullImageOption() {
      var isImage = $popup.find('.de-icon-source').val() === 'image';
      $popup.find('.sb-full-image-option').toggleClass('d-none', !isImage);
      if (!isImage) $('#sb-button-full-image').prop('checked', false);
    }
    $popup.on('change', '.de-icon-source', refreshFullImageOption);
    refreshFullImageOption();

    $('#sb-save-btn').on('click', function () {
      var $message = $popup
        .find('.cd-custom-message')
        .removeClass('text-danger')
        .text('');
      var reference = $.trim(String($('#sb-button-name').val() || ''));
      var buttonKey = $.trim(String($('#sb-button-key').val() || ''));
      var buttonTitle = $.trim(String($('#sb-button-title').val() || ''));
      var rawSlide = $.trim(String($('#sb-button-screen').val() || ''));
      var slideTarget = parseInt(rawSlide, 10);
      var iconChecked = $('#sb-opt-icon').hasClass('active');
      var iconSource =
        $popup.find('.de-icon-source').val() === 'image' ? 'image' : 'icon';
      var iconValue = iconChecked
        ? $.trim(
            String(
              $popup
                .find('.de-icon-field-row .de-custom-field-setting')
                .val() || ''
            )
          )
        : '';
      if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(reference)) {
        $message.addClass('text-danger').text(t.invalid_slide_button_name);
        $('#sb-button-name').trigger('focus');
        return;
      }
      if (
        (typeof blocks !== 'undefined' && blocks[reference]) ||
        managedSpecials[_specialOrderKey(reference)]
      ) {
        $message.addClass('text-danger').text(t.invalid_slide_button_name);
        $('#sb-button-name').trigger('focus');
        return;
      }
      if (!(slideTarget > 0 && String(slideTarget) === rawSlide)) {
        $message.addClass('text-danger').text(t.invalid_slide_target);
        $('#sb-button-screen').trigger('focus');
        return;
      }
      if (!buttonKey) buttonKey = reference;
      if (!buttonTitle) buttonTitle = buttonKey;

      // A custom image path is a regular custom field ('image'), not the
      // dedicated icon slot - matches how every other quick-add popup and
      // Device/Widget Config itself save the two differently. "Full-width
      // image" instead saves the same picked image as `btnimage`, the
      // dedicated field js/components/button.js renders at the block's
      // full width/scales with it (e.g. a webcam or radar image), rather
      // than the fixed-size .col-icon `image` slot (#171).
      var fullImage =
        iconSource === 'image' &&
        iconValue !== '' &&
        $('#sb-button-full-image').is(':checked');
      var iconIsImage =
        iconSource === 'image' && iconValue !== '' && !fullImage;
      var slideButtonDefinition = {
        title: buttonTitle.slice(0, 100),
        slide: slideTarget,
      };
      if (iconIsImage) slideButtonDefinition.image = iconValue.slice(0, 100);
      if (fullImage) slideButtonDefinition.btnimage = iconValue.slice(0, 100);

      var orderKey = _specialOrderKey(reference);
      managedSpecials[orderKey] = {
        kind: 'special',
        specialType: 'slidebutton',
        orderKey: orderKey,
        reference: reference,
        definition: {},
        idx: null,
        title: buttonTitle.slice(0, 100),
        width: 12,
        height: null,
        showTitle: true,
        options: {
          icon: !fullImage && iconValue !== '',
          iconValue: fullImage || iconIsImage ? '' : iconValue.slice(0, 100),
          hide_data: false,
          last_update: false,
          switch: false,
        },
        buttonKey: buttonKey.slice(0, 100),
        slideTarget: slideTarget,
        customFields: _deviceCustomFieldRows(
          slideButtonDefinition,
          buttonTitle.slice(0, 100)
        ),
        preservedFields: {},
      };
      managedOrder.push(orderKey);
      window.bootstrap.Modal.getInstance(
        document.getElementById('slidebuttonpopup')
      ).hide();
      _save();
    });

    $('#slidebuttonpopup').one('hidden.bs.modal', function () {
      $(this).remove();
    });
    window.bootstrap.Modal.getOrCreateInstance(
      document.getElementById('slidebuttonpopup')
    ).show();
  }

  function _showParentEditor(editor) {
    if (editor && document.body.contains(editor)) {
      $(editor).removeData('de-config-transition');
      window.bootstrap.Modal.getOrCreateInstance(editor).show();
    }
  }

  /* Hide the Device Editor before opening a child configuration modal. Bootstrap
     otherwise keeps the child behind the editor's modal/backdrop stacking context. */
  function _openConfigPopup(orderKey) {
    if (orderKey.indexOf('widget:') === 0) {
      _openWidgetConfigPopup(orderKey);
      return;
    }
    var editor = document.getElementById('deviceeditorpopup');
    var editorModal =
      editor && window.bootstrap && window.bootstrap.Modal
        ? window.bootstrap.Modal.getInstance(editor)
        : null;

    function showChild() {
      _showConfigPopup(orderKey, editor);
    }
    if (editor && editorModal && $(editor).hasClass('show')) {
      $(editor).data('de-config-transition', true);
      $(editor).one('hidden.bs.modal', showChild);
      editorModal.hide();
      return;
    }
    showChild();
  }

  function _openWidgetConfigPopup(orderKey) {
    var editor = document.getElementById('deviceeditorpopup');
    var editorModal =
      editor && window.bootstrap && window.bootstrap.Modal
        ? window.bootstrap.Modal.getInstance(editor)
        : null;
    var widget = managedWidgets[orderKey];
    if (!widget) return;

    function openFullWidgetConfig() {
      DT_function.loadDTScript('js/widgeteditor.js').then(function () {
        if (
          !DashticzWidgetEditor ||
          typeof DashticzWidgetEditor.openConfig !== 'function'
        ) {
          _showParentEditor(editor);
          return;
        }
        DashticzWidgetEditor.openConfig(widget.id, {
          draft: widget.editorDraft || null,
          onApply: function (result) {
            if (!result || !result.entry) return;
            widget.pendingPayload = result.entry;
            widget.editorDraft = result.draft || null;
            var draftRows =
              widget.editorDraft &&
              widget.editorDraft.blockOptions &&
              widget.editorDraft.blockOptions.customFields
                ? widget.editorDraft.blockOptions.customFields
                : [];
            draftRows.some(function (row) {
              if (_normaliseCustomFieldName(row && row.field) !== 'title')
                return false;
              widgetTitles[orderKey] = String(row.setting || '');
              widget.pendingTitleEdited = true;
              return true;
            });
            pendingWidgetSettings = $.extend(
              {},
              pendingWidgetSettings,
              result.configSettings || {}
            );
            var entry = result.entry;
            widgetOptions[orderKey] = $.extend({}, widgetOptions[orderKey], {
              icon: typeof entry.icon === 'undefined' || entry.icon !== '',
              iconValue:
                typeof entry.icon === 'string' && entry.icon !== ''
                  ? entry.icon
                  : null,
              hide_data: entry.hide_data === true,
              last_update: entry.last_update === true,
            });
            widgetTitleVisible[orderKey] = entry.hide_title !== true;
          },
          onClose: function () {
            _showParentEditor(editor);
          },
        });
      });
    }

    if (editor && editorModal && $(editor).hasClass('show')) {
      $(editor).data('de-config-transition', true);
      $(editor).one('hidden.bs.modal', openFullWidgetConfig);
      editorModal.hide();
      return;
    }
    openFullWidgetConfig();
  }

  /* Build the Device Config popup. Switch visibility is not exposed as a
     checkbox here; title text remains available as a typed field, and its
     visibility is exposed via the Title checkbox below. */
  function _showConfigPopup(orderKey, editor, opts) {
    var t = _translations();
    var persistOnly = !!(opts && opts.persistOnly);
    var isSpecial = orderKey.indexOf('special:') === 0;
    var ck = orderKey.indexOf('device:') === 0 ? orderKey.slice(7) : '';
    var special = isSpecial ? managedSpecials[orderKey] : null;
    var isTitle = special && special.specialType === 'title';
    var isCustom = special && special.specialType === 'custom';
    var isGroupBlock = special && special.specialType === 'group';
    var isLmsBlock = special && special.specialType === 'lms';
    // No Dial/Bar/Slider mode, and a restricted display-options set (see
    // hasDial/configOptions below) - every special except dummy/custom.
    var isNoDialSpecial = !!(
      special && NO_DIAL_SPECIAL_KINDS.indexOf(special.specialType) > -1
    );
    var options = isSpecial ? special.options || {} : deviceOptions[ck] || {};
    var customRows = isSpecial ? special.customFields : deviceCustomFields[ck];
    if (!customRows || !customRows.length) {
      customRows = [{ field: 'title', setting: '', value: '', system: true }];
    }
    customRows = customRows.map(function (row) {
      return $.extend({}, row);
    });
    var currentTitle = isSpecial
      ? String(special.title || '')
      : String(deviceTitles[ck] || '');
    var displayName =
      currentTitle ||
      (isSpecial
        ? String((special && (special.title || special.reference)) || orderKey)
        : String(deviceNames[ck] || ck));
    var titleRow = customRows.find(function (row) {
      return String(row.field || '').toLowerCase() === 'title';
    });
    if (titleRow) {
      titleRow.setting = currentTitle;
      titleRow.value = currentTitle;
      titleRow.system = true;
    } else {
      customRows.unshift({
        field: 'title',
        setting: currentTitle,
        value: currentTitle,
        system: true,
      });
    }
    var iconRow = customRows.find(function (row) {
      var field = String(row.field || '').toLowerCase();
      return field === 'icon' || field === 'image';
    });
    var effectiveIcon = _effectiveDeviceConfigIcon(ck, special, options);
    if (!iconRow) {
      customRows.splice(1, 0, {
        field: 'icon',
        setting: effectiveIcon,
        value: effectiveIcon,
        generated: true,
      });
    }

    // A Multi Device's 'values' custom field is JSON produced by the Multi
    // Device popup (or hand-written in the same shape). Editing that as raw
    // JSON text made this popup look like a plain device editor instead of
    // the Multi Device it actually is, so give it back the same friendly
    // idx/value row builder the create popup uses, instead of listing it
    // among the generic custom fields.
    var valuesRowIndex = customRows.findIndex(function (row) {
      return String(row.field || '').toLowerCase() === 'values';
    });
    var multiDeviceValues =
      isCustom &&
      valuesRowIndex > -1 &&
      Array.isArray(customRows[valuesRowIndex].value) &&
      customRows[valuesRowIndex].value.length
        ? customRows[valuesRowIndex].value
        : null;
    if (multiDeviceValues) customRows.splice(valuesRowIndex, 1);

    // Shown after the title so a device can be identified unambiguously
    // even when several rows share the same (possibly hand-edited) title -
    // omitted for specials with no meaningful IDX of their own (Separator,
    // HTML Block, Slide button).
    var idxLabel = '';
    if (!isSpecial && ck) {
      if (_isGroupCk(ck)) {
        idxLabel = ck;
      } else {
        var ckParts = _parseCk(ck);
        idxLabel = ckParts.subidx
          ? ckParts.idx + '_' + ckParts.subidx
          : String(ckParts.idx);
      }
    } else if (isSpecial && (isCustom || isGroupBlock) && special.idx) {
      idxLabel = String(special.idx);
    }

    $('#de-config-popup').remove();
    var html =
      '<div class="modal fade de-config-popup" id="de-config-popup" tabindex="-1" aria-hidden="true">';
    html +=
      '<div class="modal-dialog modal-dialog-centered de-config-dialog"><div class="modal-content">';
    html +=
      '<div class="modal-header"><h5 class="modal-title"><i class="fas fa-cog me-2" aria-hidden="true"></i>' +
      _esc(t.device_config) +
      ' — ' +
      _esc(displayName) +
      (idxLabel
        ? ' <span class="de-config-idx-label">[' + _esc(idxLabel) + ']</span>'
        : '') +
      '</h5>';
    html +=
      '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="' +
      _esc(t.close) +
      '"></button></div>';
    html += '<div class="modal-body">';
    // A separator/title bar has no data value or last-update timestamp of its
    // own, but it can still show a leading icon like any other block.
    // No NO_DIAL_SPECIAL_KINDS special (Group/HTML/iFrame/Calendar/Public
    // transport/Timegraph/TV Guide/LMS) has a Dial/Bar display mode of
    // its own either.
    var hasDial = !isTitle && !isNoDialSpecial;
    var barDeviceIdx = null;
    if (hasDial) {
      if (!isSpecial && ck) {
        barDeviceIdx = _parseCk(ck).idx;
      } else if (isSpecial && isCustom && special.idx) {
        barDeviceIdx = special.idx;
      }
    }
    var barLiveDevice = barDeviceIdx
      ? Domoticz.getAllDevices(barDeviceIdx)
      : null;
    var isBlindsPercentage = !!(
      barLiveDevice &&
      typeof barLiveDevice.SwitchType === 'string' &&
      barLiveDevice.SwitchType.indexOf('Blinds') === 0 &&
      barLiveDevice.SwitchType.indexOf('Percentage') !== -1
    );
    var isDimmer = !!(barLiveDevice && barLiveDevice.SwitchType === 'Dimmer');
    // Keep an existing Bar selectable even if the live device is temporarily
    // unavailable. For new choices Bar is limited to Dimmer and percentage blinds.
    var supportsBar =
      hasDial && (isDimmer || isBlindsPercentage || options.bar === true);
    // Needle (js/switches.js renderBlindsSliderBlock(), block.needle) is a
    // continuous vertical slider - it works for percentage blinds and
    // Dimmers, the same two device types Bar supports.
    var supportsNeedle =
      hasDial && (isDimmer || isBlindsPercentage || options.needle === true);
    // The Steps field also governs Needle mode's scale (js/switches.js
    // addSlider()), which reads the same block.barsteps as the Bar subtype.
    function barStepsApplies(mode) {
      return mode === 'bar' || mode === 'needle';
    }
    // Unlike Steps, Inverse is Needle-only, and only meaningful for Blinds -
    // a Dimmer's Slider always runs 0% Off to 100% On, so there is nothing
    // to invert. The separate Dial widget's own Bar subtype
    // (js/components/dial.js) handles inversion on its own and is not
    // affected by this switch either.
    function inverseApplies(mode) {
      return mode === 'needle' && !isDimmer;
    }

    // subtype:'bar' and needle:true both belong to the visual mode selector,
    // not Custom fields (barsteps, also read by both modes, is left visible
    // there - unlike subtype/needle it has a value a user may actually want
    // to see/edit directly). Other subtype values (for example 'updown')
    // remain ordinary custom fields.
    var subtypeRowIndex = customRows.findIndex(function (row) {
      return (
        String(row.field || '').toLowerCase() === 'subtype' &&
        String(row.value || '').toLowerCase() === 'bar'
      );
    });
    if (subtypeRowIndex > -1) customRows.splice(subtypeRowIndex, 1);
    var needleRowIndex = customRows.findIndex(function (row) {
      return String(row.field || '').toLowerCase() === 'needle';
    });
    if (needleRowIndex > -1) customRows.splice(needleRowIndex, 1);
    var inverseRowIndex = customRows.findIndex(function (row) {
      return String(row.field || '').toLowerCase() === 'inverse';
    });
    if (inverseRowIndex > -1) customRows.splice(inverseRowIndex, 1);

    var visualMode =
      options.needle === true
        ? 'needle'
        : options.bar === true
          ? 'bar'
          : options.dial === true
            ? 'dial'
            : '';
    // Icon is no longer part of the Dial/Bar/Slider mutually-exclusive mode -
    // it's now an independent toggle living in .de-config-options-icons
    // below (#195), same as Data/Updated/Title/Background, so every device
    // gets it (previously only Group/HTML/LMS/Separator specials did).
    var configOptions = isTitle
      ? ['icon', 'show_title']
      : isNoDialSpecial
        ? ['icon', 'last_update', 'show_title']
        : ['icon', 'hide_data', 'last_update', 'show_title'];
    html += '<h6 class="de-section-title">' + _esc(t.display_options) + '</h6>';

    // Icon/Data/Updated/Title/Background: independent toggle buttons, never
    // mutually exclusive with each other or with Dial/Bar/Slider below -
    // .de-config-option shares the same selected look
    // (.de-visual-mode-button.active, css/creative.css) without sharing its
    // exclusive-select click handler.
    var OPTION_ICONS = {
      icon: 'fas fa-image',
      hide_data: 'fas fa-align-left',
      last_update: 'fas fa-clock',
      show_title: 'fas fa-heading',
    };
    var optionsHtml = '';
    configOptions.forEach(function (option) {
      var hiddenForDial = hasDial && option === 'show_title';
      // The Data button is user-facing: active means data is visible.
      // CONFIG.js keeps the backwards-compatible inverse hide_data property.
      // Title visibility is stored separately from the other display options.
      var checked;
      if (option === 'hide_data') {
        checked = options.hide_data !== true;
      } else if (option === 'show_title') {
        checked = isSpecial
          ? special.showTitle !== false
          : deviceTitleVisible[ck] !== false;
      } else {
        checked = options[option] === true;
      }
      optionsHtml +=
        '<button type="button" class="btn btn-outline-secondary de-config-option' +
        (checked ? ' active' : '') +
        (hiddenForDial ? ' de-hide-for-dial' : '') +
        '" data-option="' +
        option +
        '" aria-pressed="' +
        (checked ? 'true' : 'false') +
        '" title="' +
        _esc(t[option]) +
        '" style="min-width:72px;">' +
        '<i class="' +
        OPTION_ICONS[option] +
        '" aria-hidden="true"></i>' +
        '<span class="d-block small">' +
        _esc(t[option]) +
        '</span></button>';
    });
    html +=
      '<div class="d-flex flex-wrap justify-content-between gap-4 mb-3 de-config-options-row">';
    html +=
      '<div class="d-flex flex-wrap gap-2 de-config-options-icons" role="group" aria-label="' +
      _esc(t.display_options) +
      '">' +
      optionsHtml +
      '</div>';

    if (hasDial) {
      // Dial, Bar and Slider are one mutually-exclusive visual mode.
      // Bootstrap's btn-group provides the shared rounded border without
      // extra theme CSS.
      html +=
        '<div class="btn-group" role="group" aria-label="' +
        _esc(t.display_options) +
        '">';
      [
        {
          mode: 'dial',
          label: t.dial,
          icon: 'fas fa-tachometer-alt',
          enabled: true,
        },
        {
          mode: 'bar',
          label: t.dial_bar,
          icon: 'fas fa-bars',
          enabled: supportsBar,
        },
        {
          mode: 'needle',
          label: t.dial_needle,
          icon: 'fas fa-sliders',
          enabled: supportsNeedle,
        },
      ].forEach(function (item) {
        var active = visualMode === item.mode;
        html +=
          '<button type="button" class="btn btn-outline-secondary de-visual-mode-button' +
          (active ? ' active' : '') +
          '" data-visual-mode="' +
          item.mode +
          '"' +
          (item.enabled ? '' : ' disabled') +
          ' aria-pressed="' +
          (active ? 'true' : 'false') +
          '"' +
          ' title="' +
          _esc(item.label) +
          '" style="min-width:72px;">' +
          '<i class="' +
          item.icon +
          '" aria-hidden="true"></i>' +
          '<span class="d-block small">' +
          _esc(item.label) +
          '</span></button>';
      });
      html += '</div>';
    }
    html += '</div>';

    if (hasDial) {
      var currentBarSteps =
        parseInt(options.barsteps, 10) > 0
          ? parseInt(options.barsteps, 10)
          : 10;
      // The Bar dial subtype's segment count and the Icon-mode Blinds
      // Percentage slider's scale tick count are the same barsteps config
      // field, shown for either visual mode on a percentage blinds device.
      html +=
        '<div class="mb-3 de-bar-steps-row' +
        (barStepsApplies(visualMode) ? '' : ' d-none') +
        '">';
      html +=
        '<label class="form-label" for="de-config-barsteps">' +
        _esc(t.dial_barsteps) +
        '</label>';
      html +=
        '<input type="number" min="1" step="1" class="form-control" id="de-config-barsteps" value="' +
        _esc(currentBarSteps) +
        '">';
      html +=
        '<div class="form-text">' + _esc(t.dial_barsteps_help) + '</div></div>';
      // Domoticz already reports when a blind's percentage scale runs the
      // other way round (0% is fully open instead of 100%) via SwitchType
      // containing "Inverted" - the same check js/switches.js's
      // getBlindsBlock() uses. Default the switch to that; an explicitly
      // saved options.inverse (tri-state, see _specialFromReference()
      // above) overrides it once the user has touched this switch, for the
      // rare device that doesn't expose this correctly.
      var autoInverted = !!(
        barLiveDevice &&
        typeof barLiveDevice.SwitchType === 'string' &&
        barLiveDevice.SwitchType.toLowerCase().indexOf('inverted') >= 0
      );
      var inverseChecked =
        typeof options.inverse === 'boolean' ? options.inverse : autoInverted;
      html +=
        '<div class="mb-3 de-inverse-row' +
        (inverseApplies(visualMode) ? '' : ' d-none') +
        '">';
      // de-switch: standard size/color for a standalone Device Config
      // switch (css/creative.css) - any future one-off switch here should
      // use it too, instead of a new per-switch CSS rule.
      html +=
        '<label class="form-check form-switch"><input class="form-check-input de-switch" type="checkbox" id="de-config-inverse"' +
        (inverseChecked ? ' checked' : '') +
        '>' +
        '<span class="form-check-label">' +
        _esc(t.dial_inverse) +
        '</span></label>';
      html +=
        '<div class="form-text">' + _esc(t.dial_inverse_help) + '</div></div>';
    }

    if (!isTitle) {
      html += '<div class="alert alert-info de-dial-hint d-none" role="note">';
      html += _esc(t.dial_hint) + ' ';
      html +=
        '<a href="https://dashticz.readthedocs.io/en/beta/blocks/specials/dial.html" target="_blank" rel="noopener">' +
        _esc(t.dial_hint_link) +
        '</a>';
      html += '</div>';
    }
    if (isCustom) {
      // A Custom/Multi device's main idx was previously only settable at
      // creation time (idx is a protected/reserved custom field name, see
      // protectedCustomDeviceProperties), leaving no way to correct it
      // afterwards - e.g. after the underlying Domoticz device was recreated
      // with a new idx. The tile then keeps showing the "Getting device N"
      // placeholder forever, since the device data subscription for the old
      // idx never resolves, which also means the icon/title never render
      // (both are only painted once real device data arrives).
      html +=
        '<div class="mb-3"><label class="form-label" for="de-config-idx">' +
        _esc(t.multi_device_idx) +
        '</label>';
      html +=
        '<input type="number" min="1" step="1" class="form-control" id="de-config-idx" value="' +
        _esc(special.idx || '') +
        '">';
      html +=
        '<div class="form-text">' +
        _esc(t.multi_device_idx_help) +
        '</div></div>';
    } else if (isGroupBlock) {
      html +=
        '<div class="mb-3"><label class="form-label" for="de-config-idx">' +
        _esc(t.group_idx) +
        '</label>';
      html +=
        '<input type="number" min="1" step="1" class="form-control" id="de-config-idx" value="' +
        _esc(special.idx || '') +
        '">';
      html +=
        '<div class="form-text">' + _esc(t.group_idx_help) + '</div></div>';
    } else if (isLmsBlock) {
      // Same Server/Port/.../Player/Refresh section as the quick-add popup
      // (_showLmsPopup), so editing an already-saved LMS block re-tests the
      // connection and re-populates the Player dropdown the same way -
      // rather than exposing the raw player id as a generic custom field.
      html += _lmsFieldsHtml('de-config', {
        server: special.lmsServer,
        port: special.lmsPort,
        username: special.lmsUsername,
        password: special.lmsPassword,
        player: special.lmsPlayer,
        playerLabel: special.lmsPlayerLabel,
        refresh: special.lmsRefresh,
        hideWhenOff: special.lmsHideWhenOff,
      });
    }
    html +=
      '<div class="de-custom-fields-section"><h6 class="de-section-title mt-3">' +
      _esc(t.custom_fields) +
      '</h6>';
    html += '<p class="form-text">' + _esc(t.custom_fields_help) + '</p>';
    html += '<div class="de-custom-fields">';
    customRows.forEach(function (row) {
      html += _customFieldRowHtml(row);
    });
    html += '</div>';
    if (multiDeviceValues) {
      html +=
        '<div class="de-multidevice-values mt-3"><label class="form-label">' +
        _esc(t.multi_device_values) +
        '</label>';
      html +=
        '<div class="form-text mb-2">' +
        _esc(t.multi_device_values_help) +
        '</div>';
      html += '<div class="md-value-rows">';
      multiDeviceValues.forEach(function (row) {
        html += _multiDeviceRowHtml(row);
      });
      html += '</div></div>';
    }
    html += '</div>';
    html +=
      '<div class="de-config-message" role="status"></div></div><div class="modal-footer">';
    html +=
      '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">' +
      '<i class="fas fa-xmark me-1" aria-hidden="true"></i>' +
      _esc(t.cancel) +
      '</button>';
    html +=
      '<button type="button" class="btn btn-primary btn-save" id="de-config-ok">' +
      '<i class="fas fa-check me-1" aria-hidden="true"></i>' +
      _esc(t.ok) +
      '</button>';
    html += '</div></div></div></div>';
    $('body').append(html);

    var $popup = $('#de-config-popup');
    if (isLmsBlock) _wireLmsFields('de-config', $popup);
    function refreshCustomFieldButtons() {
      var removable = $popup.find(
        '.de-custom-field-row:not(.de-system-field-row)'
      ).length;
      $popup.find('.de-custom-field-remove').each(function () {
        var isSystem = $(this)
          .closest('.de-custom-field-row')
          .hasClass('de-system-field-row');
        $(this).prop('disabled', isSystem || removable <= 0);
      });
    }
    function selectedVisualMode() {
      return String(
        $popup
          .find('.de-visual-mode-button.active')
          .first()
          .attr('data-visual-mode') || ''
      );
    }
    function setVisualMode(mode) {
      $popup.find('.de-visual-mode-button').each(function () {
        var active = String($(this).attr('data-visual-mode')) === mode;
        $(this)
          .toggleClass('active', active)
          .attr('aria-pressed', active ? 'true' : 'false');
      });
    }
    function refreshIconFieldVisibility() {
      var enabled = $popup
        .find('.de-config-option[data-option="icon"]')
        .hasClass('active');
      $popup.find('.de-icon-field-row').toggle(enabled);
    }
    function ensureIconFieldRow() {
      if ($popup.find('.de-icon-field-row').length) return;
      var rowHtml = _customFieldRowHtml({
        field: 'icon',
        setting: effectiveIcon,
        value: effectiveIcon,
        generated: true,
      });
      var $titleRow = $popup.find('.de-custom-field-row').first();
      if ($titleRow.length) $titleRow.after(rowHtml);
      else $popup.find('.de-custom-fields').prepend(rowHtml);
    }
    function closeCustomImagePickers() {
      $popup.find('.dt-custom-image-picker').removeClass('show');
      $popup
        .find('.de-icon-field-row')
        .removeClass('dt-custom-image-picker-open');
    }
    function openCustomImagePicker($row) {
      if ($row.find('.de-icon-source').val() !== 'image') {
        closeCustomImagePickers();
        return;
      }
      var $picker = $row.find('.dt-custom-image-picker');
      var selectedPath = String(
        $row.find('.de-custom-field-setting').val() || ''
      );
      closeCustomImagePickers();
      $row.addClass('dt-custom-image-picker-open');
      $picker.addClass('show');
      $picker.find('.dt-custom-image-status').show().text(t.loading_images);
      $picker.find('.dt-custom-image-grid').empty();
      _loadCustomImages()
        .done(function (images) {
          _renderCustomImageGrid(
            $picker,
            images,
            selectedPath,
            t.no_custom_images
          );
        })
        .fail(function () {
          $picker.find('.dt-custom-image-grid').empty();
          $picker
            .find('.dt-custom-image-status')
            .show()
            .text(t.custom_images_error);
        });
    }
    function refreshDialHint() {
      var enabled = hasDial && selectedVisualMode() === 'dial';
      $popup.find('.de-dial-hint').toggleClass('d-none', !enabled);
    }
    function refreshBarStepsField() {
      $popup
        .find('.de-bar-steps-row')
        .toggleClass('d-none', !barStepsApplies(selectedVisualMode()));
    }
    function refreshInverseField() {
      $popup
        .find('.de-inverse-row')
        .toggleClass('d-none', !inverseApplies(selectedVisualMode()));
    }
    function refreshDialOptions() {
      var mode = hasDial ? selectedVisualMode() : '';
      var dialLike = mode === 'dial' || mode === 'bar';
      $popup.find('.de-hide-for-dial').toggleClass('d-none', dialLike);
      refreshIconFieldVisibility();
      refreshDialHint();
      refreshBarStepsField();
      refreshInverseField();
    }
    $popup.on('click', '.de-custom-field-add', function () {
      $(this).closest('.de-custom-field-row').after(_customFieldRowHtml());
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });
    $popup.on('click', '.de-custom-field-remove', function () {
      if ($(this).prop('disabled')) return;
      var $row = $(this).closest('.de-custom-field-row');
      var removesIcon = $row.hasClass('de-icon-field-row');
      $row.remove();
      if (removesIcon) {
        $popup
          .find('.de-config-option[data-option="icon"]')
          .removeClass('active')
          .attr('aria-pressed', 'false');
      }
      refreshCustomFieldButtons();
      refreshIconFieldVisibility();
    });
    $popup.on('click', '.de-config-option', function () {
      if ($(this).prop('disabled')) return;
      var active = !$(this).hasClass('active');
      $(this)
        .toggleClass('active', active)
        .attr('aria-pressed', active ? 'true' : 'false');
      if (String($(this).attr('data-option')) === 'icon') {
        if (active) ensureIconFieldRow();
        refreshCustomFieldButtons();
        refreshIconFieldVisibility();
      }
    });
    $popup.on('change', '.de-icon-source', function () {
      var $row = $(this).closest('.de-icon-field-row');
      var useImage = $(this).val() === 'image';
      var $setting = $row.find('.de-custom-field-setting');
      $setting
        .val(useImage ? '' : effectiveIcon)
        .attr('placeholder', useImage ? 'custom/icon.png' : t.setting);
      $row
        .attr('data-generated-icon', useImage ? 'false' : 'true')
        .attr('data-initial-setting', useImage ? '' : effectiveIcon);
      closeCustomImagePickers();
    });
    $popup.on(
      'click focus',
      '.de-icon-field-row .de-custom-field-setting',
      function () {
        openCustomImagePicker($(this).closest('.de-icon-field-row'));
      }
    );
    $popup.on('click', '.dt-custom-image-option', function () {
      var $row = $(this).closest('.de-icon-field-row');
      $row
        .find('.de-custom-field-setting')
        .val(String($(this).attr('data-image-path') || ''));
      closeCustomImagePickers();
    });
    $popup.on('click', function (event) {
      if (
        $(event.target).closest(
          '.dt-custom-image-picker, .de-custom-field-setting'
        ).length
      )
        return;
      closeCustomImagePickers();
    });
    $popup.on('click', '.de-visual-mode-button', function () {
      if ($(this).prop('disabled')) return;
      var mode = String($(this).attr('data-visual-mode') || '');
      // Clicking the selected mode again restores the historic all-off state.
      setVisualMode(selectedVisualMode() === mode ? '' : mode);
      refreshCustomFieldButtons();
      refreshDialOptions();
    });
    function refreshMdValueButtons() {
      var $rows = $popup.find('.md-value-row');
      $rows.find('.md-value-add').addClass('d-none');
      $rows.last().find('.md-value-add').removeClass('d-none');
      $rows.find('.md-value-remove').prop('disabled', $rows.length <= 1);
    }
    $popup.on('click', '.md-value-add', function () {
      $(this).closest('.md-value-row').after(_multiDeviceRowHtml());
      refreshMdValueButtons();
      $popup
        .find('.md-value-row')
        .last()
        .find('.md-value-value')
        .trigger('focus');
    });
    $popup.on('click', '.md-value-remove', function () {
      if ($(this).prop('disabled')) return;
      $(this).closest('.md-value-row').remove();
      refreshMdValueButtons();
    });
    refreshCustomFieldButtons();
    refreshDialOptions();
    if (multiDeviceValues) refreshMdValueButtons();

    $('#de-config-ok').on('click', function () {
      var updated = {};
      var pendingCustomFields = [];
      var pendingVisualMode = hasDial ? selectedVisualMode() : '';
      // 'values' is rendered as the dedicated row builder below, not as a
      // generic custom field, so a hand-typed 'values' field name in the
      // generic list must still be rejected as a duplicate.
      var customKeys = multiDeviceValues ? { values: true } : {};
      var pendingTitle = isSpecial
        ? String(special.title || '')
        : String(deviceTitles[ck] || '');
      var pendingIconValue = null;
      var hasIconField = false;
      var valid = true;
      var pendingIdx = isCustom || isGroupBlock ? special.idx : null;
      if (isCustom) {
        var rawIdx = $.trim(String($('#de-config-idx').val() || ''));
        var parsedIdx = parseInt(rawIdx, 10);
        if (!(parsedIdx > 0 && String(parsedIdx) === rawIdx)) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_idx);
          $('#de-config-idx').trigger('focus');
        } else {
          pendingIdx = parsedIdx;
        }
      } else if (isGroupBlock) {
        // Unlike Custom/Multi Device, a Group's idx is optional - it can
        // group plain device ids via its 'devices' custom field instead.
        var rawGroupIdx = $.trim(String($('#de-config-idx').val() || ''));
        if (!rawGroupIdx) {
          pendingIdx = null;
        } else {
          var parsedGroupIdx = parseInt(rawGroupIdx, 10);
          if (!(parsedGroupIdx > 0 && String(parsedGroupIdx) === rawGroupIdx)) {
            valid = false;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.invalid_idx);
            $('#de-config-idx').trigger('focus');
          } else {
            pendingIdx = parsedGroupIdx;
          }
        }
      }
      var pendingLms = null;
      if (isLmsBlock) {
        pendingLms = _readLmsFields('de-config', $popup);
        if (!pendingLms.server) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_lms_server);
          $('#de-config-lms-server').trigger('focus');
        } else if (!(pendingLms.port > 0 && pendingLms.port <= 65535)) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_lms_port);
          $('#de-config-lms-port').trigger('focus');
        } else if (!pendingLms.player) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_lms_player);
          $('#de-config-lms-player').trigger('focus');
        }
      }
      // [data-option]: excludes button.js's injected Background toggle,
      // which reuses .de-config-option purely for its click-to-toggle
      // .active styling/behavior and reads its own state independently via
      // its own custom-fields (no_background) save handler.
      $('#de-config-popup .de-config-option[data-option]').each(function () {
        var option = String($(this).attr('data-option'));
        var checked = $(this).hasClass('active');
        updated[option] = option === 'hide_data' ? !checked : checked;
      });
      if (hasDial) {
        updated.dial = pendingVisualMode === 'dial';
        updated.bar = pendingVisualMode === 'bar';
        updated.needle = pendingVisualMode === 'needle';
        var rawBarSteps = $.trim(String($('#de-config-barsteps').val() || ''));
        var parsedBarSteps = parseInt(rawBarSteps, 10);
        if (barStepsApplies(pendingVisualMode)) {
          if (!(parsedBarSteps > 0 && String(parsedBarSteps) === rawBarSteps)) {
            valid = false;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.invalid_barsteps);
            $('#de-config-barsteps').trigger('focus');
          } else {
            updated.barsteps = parsedBarSteps;
          }
        } else {
          // Field hidden in this mode: don't block saving on it - keep
          // whatever value was already stored (falling back to the input's
          // own value, then the default) for if the user switches back to a
          // mode where it applies later without reopening this popup.
          updated.barsteps =
            parsedBarSteps > 0 ? parsedBarSteps : options.barsteps || 10;
        }
        // Same preserve-when-hidden reasoning as barsteps above; unlike
        // barsteps this is a plain tri-state (see _specialFromReference()),
        // so "hidden" simply keeps whatever was already stored, including
        // still-undefined (auto-detect from the device's own SwitchType).
        updated.inverse = inverseApplies(pendingVisualMode)
          ? $('#de-config-inverse').prop('checked')
          : options.inverse;
      }

      $popup.find('.de-custom-field-row').each(function () {
        if (!valid) return;
        var rawField = $.trim(
          $(this).find('.de-custom-field-name').val() || ''
        );
        var rawSetting = $.trim(
          $(this).find('.de-custom-field-setting').val() || ''
        );
        if (!rawField && !rawSetting) return;
        var field = _normaliseCustomFieldName(rawField);
        var lowerField = field.toLowerCase();
        if (!field || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(field)) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_field);
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        if (customKeys[lowerField]) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.duplicate_field);
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        customKeys[lowerField] = true;

        if (
          lowerField === 'subtype' &&
          pendingVisualMode === 'bar' &&
          String(rawSetting).toLowerCase() === 'bar'
        ) {
          // Bar owns its legacy subtype marker; do not duplicate it as a
          // user-editable custom row. The save payload adds it canonically.
          return;
        }
        if (lowerField === 'title') {
          pendingTitle = rawSetting;
          return;
        }
        if (lowerField === 'icon' || lowerField === 'image') {
          // An existing icon row is hidden/inactive while Icon is off. A newly
          // entered visible icon/image row gets an explicit validation message instead.
          if (updated.icon !== true) {
            if ($(this).hasClass('de-icon-field-row')) return;
            valid = false;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.icon_requires_checkbox);
            $(this).find('.de-custom-field-name').trigger('focus');
            return;
          }
          if (!rawSetting) {
            valid = false;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.invalid_field);
            $(this).find('.de-custom-field-setting').trigger('focus');
            return;
          }
          if (lowerField === 'image') {
            pendingCustomFields.push({
              field: 'image',
              setting: rawSetting,
              value: rawSetting,
            });
            return;
          }
          var generatedIcon = $(this).attr('data-generated-icon') === 'true';
          var initialIcon = String($(this).attr('data-initial-setting') || '');
          if (generatedIcon && rawSetting === initialIcon && !options.iconValue)
            return;
          hasIconField = true;
          pendingIconValue = rawSetting;
          return;
        }
        if (!rawSetting || protectedCustomDeviceProperties[lowerField]) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(
              protectedCustomDeviceProperties[lowerField]
                ? t.duplicate_field
                : t.invalid_field
            );
          $(this).find('.de-custom-field-name').trigger('focus');
          return;
        }
        var parsedSetting = _parseCustomSetting(rawSetting);
        if (!parsedSetting.valid) {
          valid = false;
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_setting);
          $(this).find('.de-custom-field-setting').trigger('focus');
          return;
        }
        pendingCustomFields.push({
          field: field,
          setting: rawSetting,
          value: parsedSetting.value,
        });
      });
      if (!valid) return;

      var pendingValues = null;
      if (multiDeviceValues) {
        pendingValues = [];
        $popup.find('.md-value-row').each(function () {
          if (!valid) return;
          var rawRowIdx = $.trim(
            String($(this).find('.md-value-idx').val() || '')
          );
          var rawValue = $.trim(
            String($(this).find('.md-value-value').val() || '')
          );
          if (!rawRowIdx && !rawValue) return; // silently skip a fully empty row
          if (!rawValue) {
            valid = false;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.invalid_value_row);
            $(this).find('.md-value-value').trigger('focus');
            return;
          }
          var rowEntry = { value: rawValue };
          if (rawRowIdx) {
            var rowIdx = parseInt(rawRowIdx, 10);
            if (!(rowIdx > 0 && String(rowIdx) === rawRowIdx)) {
              valid = false;
              $popup
                .find('.de-config-message')
                .addClass('text-danger')
                .text(t.invalid_idx);
              $(this).find('.md-value-idx').trigger('focus');
              return;
            }
            rowEntry.idx = rowIdx;
          }
          pendingValues.push(rowEntry);
        });
        if (!valid) return;
        if (!pendingValues.length) {
          $popup
            .find('.de-config-message')
            .addClass('text-danger')
            .text(t.invalid_value_row);
          return;
        }
      }

      // Title visibility isn't part of `options` (see the checkbox render
      // above), so pull it out before the rest of `updated` gets merged in.
      var pendingShowTitle = updated.show_title !== false;
      delete updated.show_title;

      var storedRows = [
        {
          field: 'title',
          setting: pendingTitle,
          value: pendingTitle,
          system: true,
        },
      ];
      if (hasIconField) {
        storedRows.push({
          field: 'icon',
          setting: pendingIconValue,
          value: pendingIconValue,
        });
      }
      storedRows = storedRows.concat(pendingCustomFields);
      if (pendingValues) {
        storedRows.push({
          field: 'values',
          setting: JSON.stringify(pendingValues),
          value: pendingValues,
        });
      }

      if (isSpecial) {
        special.title = pendingTitle;
        special.customFields = storedRows;
        special.showTitle = pendingShowTitle;
        if (isCustom || isGroupBlock) special.idx = pendingIdx;
        if (isLmsBlock && pendingLms) {
          special.lmsServer = pendingLms.server;
          special.lmsPort = pendingLms.port;
          special.lmsUsername = pendingLms.username;
          special.lmsPassword = pendingLms.password;
          special.lmsPlayer = pendingLms.player;
          special.lmsPlayerLabel = pendingLms.playerLabel;
          special.lmsRefresh = pendingLms.refresh;
          special.lmsHideWhenOff = pendingLms.hideWhenOff;
        }
        if (special.specialType === 'slidebutton') {
          storedRows.forEach(function (row) {
            if (_normaliseCustomFieldName(row.field) === 'slide') {
              var parsedSlide = parseInt(row.value, 10);
              if (parsedSlide > 0) special.slideTarget = parsedSlide;
            }
          });
        }
        special.options = $.extend({}, special.options, updated);
        special.options.iconValue = hasIconField ? pendingIconValue : null;
      } else {
        deviceTitles[ck] = pendingTitle;
        deviceCustomFields[ck] = storedRows;
        deviceTitleVisible[ck] = pendingShowTitle;
        deviceOptions[ck] = $.extend({}, deviceOptions[ck], updated);
        deviceOptions[ck].iconValue = hasIconField ? pendingIconValue : null;
      }
      $(
        '#de-device-list .de-device-title[data-order-key="' + orderKey + '"]'
      ).val(pendingTitle);
      $('#de-device-list .de-device-title[data-ck="' + ck + '"]').val(
        pendingTitle
      );

      if (persistOnly) {
        // Reached via openLayoutConfig(): there is no Device Editor Save
        // button anywhere in this flow, so persist this confirmed change
        // immediately instead of leaving it stranded in memory.
        var $ok = $popup.find('#de-config-ok').prop('disabled', true);
        $popup
          .find('.de-config-message')
          .removeClass('text-danger')
          .text(t.saving);
        _saveDeviceConfigOnly()
          .done(function () {
            window.bootstrap.Modal.getInstance(
              document.getElementById('de-config-popup')
            ).hide();
          })
          .fail(function (xhr) {
            var msg =
              xhr.responseJSON && xhr.responseJSON.error
                ? xhr.responseJSON.error
                : t.save_failed;
            $popup
              .find('.de-config-message')
              .addClass('text-danger')
              .text(t.error_prefix + ' ' + msg);
            $ok.prop('disabled', false);
          });
        return;
      }
      window.bootstrap.Modal.getInstance(
        document.getElementById('de-config-popup')
      ).hide();
    });

    var popup = document.getElementById('de-config-popup');
    popup.addEventListener('hidden.bs.modal', function () {
      $(popup).remove();
      _showParentEditor(editor);
    });
    window.bootstrap.Modal.getOrCreateInstance(popup).show();
  }

  /* ── HTML for a single device-list row ─────────────────────── */
  function _deviceItemHtml(ck, allDomoticz, isNew) {
    var t = _translations();
    var p = _parseCk(ck);
    var isGroup = _isGroupCk(ck);
    var device = isGroup
      ? allDomoticz[ck]
      : allDomoticz[String(p.idx)] || allDomoticz[p.idx];
    var rawName = device ? device.Name : isGroup ? ck : 'Device ' + p.idx;
    var type = device ? _esc(device.Type) : isGroup ? 'Group' : '';
    var prefix = isGroup ? (type === 'Scene' ? 'Scene_' : 'Group_') : '';
    var name = _esc(prefix + rawName);
    var dispIdx = isGroup
      ? ck
      : p.subidx
        ? p.idx + '_' + p.subidx
        : String(p.idx);
    var cls = 'de-device-item' + (isNew ? ' de-device-item-new' : '');
    var orderKey = _deviceOrderKey(ck);
    var html =
      '<div class="' +
      cls +
      '" data-ck="' +
      _esc(ck) +
      '" data-order-key="' +
      _esc(orderKey) +
      '" draggable="true">';
    html +=
      '<span class="de-drag-handle" title="' +
      _esc(t.drag_to_reorder) +
      '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx">IDX\u00a0' + _esc(dispIdx) + '</span>';
    html +=
      '<span class="de-device-identity"><span class="de-device-name">' +
      name +
      (!isGroup && p.subidx ? '\u00a0(' + p.subidx + ')' : '') +
      '</span>';
    if (type) html += '<span class="de-device-type">' + type + '</span>';
    html += '</span>';
    html += _configButtonHtml(orderKey, t.device_config);
    html += '<span class="de-device-field de-width-wrap">';
    html +=
      '<input type="number" id="de-width-' +
      _esc(ck) +
      '" class="form-control form-control-sm de-device-width" ';
    html +=
      'data-ck="' +
      _esc(ck) +
      '" data-order-key="' +
      _esc(orderKey) +
      '" min="1" max="12" size="2" value="' +
      _parseWidth(deviceWidths[ck]) +
      '">';
    html +=
      '<label for="de-width-' + _esc(ck) + '">' + _esc(t.width) + '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html +=
      '<input type="text" id="de-title-' +
      _esc(ck) +
      '" class="form-control form-control-sm de-device-title" ';
    html +=
      'data-ck="' +
      _esc(ck) +
      '" value="' +
      _esc(deviceTitles[ck] || '') +
      '">';
    html +=
      '<label for="de-title-' + _esc(ck) + '">' + _esc(t.title) + '</label>';
    html += '</span>';
    html +=
      '<button type="button" class="btn btn-danger btn-sm de-remove-btn ms-auto" data-ck="' +
      _esc(ck) +
      '" title="' +
      _esc(t.remove) +
      '">';
    html += '<i class="fas fa-minus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function _widgetItemHtml(orderKey) {
    var widget = managedWidgets[orderKey];
    if (!widget) return '';
    var t = _translations();
    var html =
      '<div class="de-device-item de-widget-item" data-order-key="' +
      _esc(orderKey) +
      '" draggable="true">';
    html +=
      '<span class="de-drag-handle" title="' +
      _esc(t.drag_to_reorder) +
      '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html +=
      '<span class="de-device-idx"><i class="fas fa-puzzle-piece me-1" aria-hidden="true"></i>' +
      _esc(t.widget) +
      '</span>';
    html +=
      '<span class="de-device-identity"><span class="de-device-name">' +
      _esc(t.widget_prefix) +
      ' ' +
      _esc(widget.title) +
      '</span>';
    html +=
      '<span class="de-device-type">' +
      _esc(widget.definition.type || widget.id) +
      '</span>';
    html += '</span>';
    html += _configButtonHtml(orderKey, t.widget_config);
    html += '<span class="de-device-field de-width-wrap">';
    html +=
      '<input type="number" id="de-width-' +
      _esc(widget.id) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) +
      '" min="1" max="12" size="2" value="' +
      _parseWidth(widgetWidths[orderKey]) +
      '">';
    html +=
      '<label for="de-width-' +
      _esc(widget.id) +
      '">' +
      _esc(t.width) +
      '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html +=
      '<input type="text" id="de-title-' +
      _esc(widget.id) +
      '" class="form-control form-control-sm de-device-title" maxlength="100" data-order-key="' +
      _esc(orderKey) +
      '" value="' +
      _esc(widgetTitles[orderKey] || '') +
      '">';
    html +=
      '<label for="de-title-' +
      _esc(widget.id) +
      '">' +
      _esc(t.title) +
      '</label>';
    html += '</span>';
    html +=
      '<span class="de-widget-managed" title="' +
      _esc(t.managed_widget) +
      '"><i class="fas fa-lock" aria-hidden="true"></i></span>';
    html += '</div>';
    return html;
  }

  function _specialItemHtml(orderKey) {
    var special = managedSpecials[orderKey];
    if (!special) return '';
    var t = _translations();
    var isTitle = special.specialType === 'title';
    var isCustom = special.specialType === 'custom';
    var isSlideButton = special.specialType === 'slidebutton';
    var isGroupBlock = special.specialType === 'group';
    var isHtmlBlock = special.specialType === 'html';
    var isIframeBlock = special.specialType === 'iframe';
    var isCalendarBlock = special.specialType === 'calendar';
    var isPublicTransportBlock = special.specialType === 'publictransport';
    var isTimegraphBlock = special.specialType === 'timegraph';
    var isXmltvguideBlock = special.specialType === 'xmltvguide';
    var isLmsBlock = special.specialType === 'lms';
    // A Multi Device is a Custom device whose 'values' custom field was filled
    // in via the dedicated Multi Device popup (see openMultiDevice() above);
    // label it accordingly instead of the generic "Custom devices" so it's not
    // confused with a plain single-value Custom device in this list.
    var isMultiDevice =
      isCustom &&
      special.definition &&
      Array.isArray(special.definition.values) &&
      special.definition.values.length > 0;
    var label = isTitle
      ? t.title_block
      : isMultiDevice
        ? t.multi_device
        : isCustom
          ? t.custom_devices
          : isSlideButton
            ? t.slide_button
            : t.dummy_device;
    if (isGroupBlock) label = t.group_block;
    else if (isHtmlBlock) label = t.html_block;
    else if (isIframeBlock) label = t.iframe_block;
    else if (isCalendarBlock) label = t.calendar_block;
    else if (isPublicTransportBlock) label = t.publictransport_block;
    else if (isTimegraphBlock) label = t.timegraph_block;
    else if (isXmltvguideBlock) label = t.xmltvguide_block;
    else if (isLmsBlock) label = t.lms_block;
    var htmlFileRow =
      isHtmlBlock && special.customFields
        ? special.customFields.find(function (row) {
            return (
              String((row && row.field) || '').toLowerCase() === 'htmlfile'
            );
          })
        : null;
    var frameurlRow =
      isIframeBlock && special.customFields
        ? special.customFields.find(function (row) {
            return (
              String((row && row.field) || '').toLowerCase() === 'frameurl'
            );
          })
        : null;
    var icalurlRow =
      isCalendarBlock && special.customFields
        ? special.customFields.find(function (row) {
            return String((row && row.field) || '').toLowerCase() === 'icalurl';
          })
        : null;
    var stationRow =
      isPublicTransportBlock && special.customFields
        ? special.customFields.find(function (row) {
            var field = String((row && row.field) || '').toLowerCase();
            return field === 'station' || field === 'tpc';
          })
        : null;
    var xmltvurlRow =
      isXmltvguideBlock && special.customFields
        ? special.customFields.find(function (row) {
            return (
              String((row && row.field) || '').toLowerCase() === 'xmltvurl'
            );
          })
        : null;
    var detail = isTitle
      ? special.title
      : isSlideButton
        ? special.reference +
          ' · ' +
          t.slide_button_screen +
          '\u00a0' +
          String(special.slideTarget || 1)
        : isGroupBlock
          ? special.idx
            ? 'IDX\u00a0' + special.idx
            : special.reference
          : isHtmlBlock
            ? (htmlFileRow && htmlFileRow.setting) || special.reference
            : isIframeBlock
              ? (frameurlRow && frameurlRow.setting) || special.reference
              : isCalendarBlock
                ? (icalurlRow && icalurlRow.setting) || special.reference
                : isPublicTransportBlock
                  ? (stationRow && stationRow.setting) || special.reference
                  : isTimegraphBlock
                    ? 'IDX ' + special.idx
                    : isXmltvguideBlock
                      ? (xmltvurlRow && xmltvurlRow.setting) ||
                        special.reference
                      : isLmsBlock
                        ? special.lmsPlayerLabel ||
                          special.lmsPlayer ||
                          special.reference
                        : isCustom
                          ? special.reference + ' · IDX\u00a0' + special.idx
                          : 'IDX\u00a0' + special.idx;
    var specialIconClass = isTitle
      ? 'fa-divide'
      : isSlideButton
        ? 'fa-sliders-h'
        : isMultiDevice
          ? 'fa-layer-group'
          : 'fa-cube';
    if (isGroupBlock) specialIconClass = 'fa-object-group';
    else if (isHtmlBlock) specialIconClass = 'fa-code';
    else if (isIframeBlock) specialIconClass = 'fa-window-maximize';
    else if (isCalendarBlock) specialIconClass = 'fa-calendar-alt';
    else if (isPublicTransportBlock) specialIconClass = 'fa-train';
    else if (isTimegraphBlock) specialIconClass = 'fa-chart-line';
    else if (isXmltvguideBlock) specialIconClass = 'fa-tv';
    else if (isLmsBlock) specialIconClass = 'fa-music';
    var html =
      '<div class="de-device-item de-special-item" data-special-key="' +
      _esc(special.reference) +
      '" data-order-key="' +
      _esc(orderKey) +
      '" draggable="true">';
    html +=
      '<span class="de-drag-handle" title="' +
      _esc(t.drag_to_reorder) +
      '"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html +=
      '<span class="de-device-idx"><i class="fas ' +
      specialIconClass +
      ' me-1" aria-hidden="true"></i>' +
      _esc(label) +
      '</span>';
    html += '<span class="de-device-identity de-special-identity">';
    html += '<span class="de-device-name">' + _esc(detail) + '</span></span>';
    html += _configButtonHtml(orderKey, t.device_config);
    html += '<span class="de-device-field de-width-wrap">';
    html +=
      '<input type="number" id="de-width-' +
      _esc(special.reference) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) +
      '" min="1" max="12" size="2" value="' +
      special.width +
      '">';
    html +=
      '<label class="de-device-width-label" for="de-width-' +
      _esc(special.reference) +
      '">' +
      _esc(t.width) +
      '</label>';
    html += '</span>';
    html += '<span class="de-device-field de-title-field">';
    html +=
      '<input type="text" id="de-title-' +
      _esc(special.reference) +
      '" class="form-control form-control-sm de-device-title" maxlength="100" data-order-key="' +
      _esc(orderKey) +
      '" value="' +
      _esc(special.title || '') +
      '">';
    html +=
      '<label for="de-title-' +
      _esc(special.reference) +
      '">' +
      _esc(t.title) +
      '</label>';
    html += '</span>';
    html +=
      '<button type="button" class="btn btn-danger btn-sm de-remove-btn ms-auto" data-special-key="' +
      _esc(special.reference) +
      '" title="' +
      _esc(t.remove) +
      '">';
    html += '<i class="fas fa-minus" aria-hidden="true"></i></button></div>';
    return html;
  }

  /* ── HTML for one add-row (select + button) ─────────────────── */
  function _addRowHtml(deviceList) {
    var t = _translations();
    var html = '<div class="de-add-row">';
    html +=
      '<select class="form-select de-device-select" aria-label="' +
      _esc(t.select_aria) +
      '">';
    html += '<option value="">— ' + _esc(t.select_item) + ' —</option>';
    deviceList.forEach(function (d) {
      var dispIdx = d.subidx ? d.idx + '_' + d.subidx : String(d.idx);
      html +=
        '<option value="' +
        _esc(d.key) +
        '" data-type-order="' +
        _typeOrder(d.type) +
        '">' +
        _esc(d.name) +
        ' (IDX\u00a0' +
        dispIdx +
        ')</option>';
    });
    html += '</select>';
    html +=
      '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" size="2" value="3" title="' +
      _esc(t.column_width) +
      '" aria-label="' +
      _esc(t.width) +
      '">';
    html +=
      '<input type="text" class="form-control form-control-sm de-special-value d-none" aria-label="">';
    html +=
      '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="' +
      _esc(t.add_device) +
      '">';
    html += '<i class="fas fa-plus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function _specialAddRowHtml(kind) {
    var t = _translations();
    var isTitle = kind === 'title';
    var html = '<div class="de-add-row de-special-add-row">';
    html +=
      '<select class="de-device-select d-none" aria-hidden="true" tabindex="-1">';
    html +=
      '<option value="' +
      (isTitle ? '__title__' : '__dummy__') +
      '" selected></option></select>';
    html +=
      '<input ' +
      (isTitle ? 'type="text"' : 'type="number" min="1"') +
      ' class="form-control form-control-sm de-special-value" placeholder="' +
      _esc(isTitle ? t.enter_title : t.enter_idx) +
      '" aria-label="' +
      _esc(isTitle ? t.enter_title : t.enter_idx) +
      '">';
    html +=
      '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" size="2" value="' +
      (isTitle ? '12' : '3') +
      '" title="' +
      _esc(t.column_width) +
      '" aria-label="' +
      _esc(t.width) +
      '">';
    html +=
      '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="' +
      _esc(isTitle ? t.separator : t.custom_devices) +
      '"><i class="fas fa-plus" aria-hidden="true"></i></button>';
    html += '</div>';
    return html;
  }

  function _nextSpecialReference(type) {
    var prefix =
      type === 'title' ? 'Title_' : type === 'lms' ? 'lms_' : 'dummyblock_';
    var used = {};
    if (typeof blocks !== 'undefined') {
      Object.keys(blocks).forEach(function (key) {
        used[key] = true;
      });
    }
    Object.keys(managedSpecials).forEach(function (orderKey) {
      used[managedSpecials[orderKey].reference] = true;
    });
    var number = 1;
    while (used[prefix + number]) number++;
    return prefix + number;
  }

  /* ── wire up event handlers ─────────────────────────────────── */
  function _attachHandlers(available, allDomoticz) {
    $('#de-device-list').on('click', '.de-config-btn', function () {
      _openConfigPopup(String($(this).attr('data-order-key') || ''));
    });

    /* - (remove) button */
    $('#de-device-list').on('click', '.de-remove-btn', function () {
      var specialKey = String($(this).attr('data-special-key') || '');
      if (specialKey) {
        var specialOrderKey = _specialOrderKey(specialKey);
        delete managedSpecials[specialOrderKey];
        delete gridPositions[specialOrderKey];
        delete gridRefs[specialOrderKey];
        var specialPos = managedOrder.indexOf(specialOrderKey);
        if (specialPos > -1) managedOrder.splice(specialPos, 1);
        $(this).closest('.de-device-item').remove();
        if ($('#de-device-list .de-device-item').length === 0) {
          $('#de-device-list').html(
            '<div class="de-empty">' +
              _esc(_translations().empty_items) +
              '</div>'
          );
        }
        return;
      }
      var ck = String($(this).attr('data-ck'));
      var pos = managedDevices.indexOf(ck);
      if (pos > -1) managedDevices.splice(pos, 1);
      var orderPos = managedOrder.indexOf(_deviceOrderKey(ck));
      if (orderPos > -1) managedOrder.splice(orderPos, 1);
      delete deviceNames[ck];
      delete deviceWidths[ck];
      delete deviceHeights[ck];
      delete deviceTitles[ck];
      delete deviceOptions[ck];
      delete deviceRefs[ck];
      delete deviceTitleVisible[ck];
      delete deviceCustomFields[ck];
      delete devicePreservedFields[ck];
      delete gridPositions[_deviceOrderKey(ck)];
      delete gridRefs[_deviceOrderKey(ck)];

      /* remove item from device-list */
      $(this).closest('.de-device-item').remove();
      if ($('#de-device-list .de-device-item').length === 0) {
        $('#de-device-list').html(
          '<div class="de-empty">' +
            _esc(_translations().empty_items) +
            '</div>'
        );
      }

      /* restore device in add-row dropdown and in available[] */
      var p = _parseCk(ck);
      var isGroup = _isGroupCk(ck);
      var device = isGroup
        ? allDomoticz[ck]
        : allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      var rawName = device ? device.Name : isGroup ? ck : 'Device ' + p.idx;
      var type = device ? device.Type || '' : isGroup ? 'Group' : '';
      var groupPrefix = isGroup ? (type === 'Scene' ? 'Scene_' : 'Group_') : '';
      var displayName =
        groupPrefix +
        rawName +
        (!isGroup && p.subidx ? '\u00a0(' + p.subidx + ')' : '');
      var dispIdx = isGroup
        ? ck
        : p.subidx
          ? p.idx + '_' + p.subidx
          : String(p.idx);

      /* keep available[] in sync so subsequent + rows include this device */
      if (
        !available.some(function (d) {
          return d.key === ck;
        })
      ) {
        available.push({
          key: ck,
          idx: p.idx,
          subidx: p.subidx,
          name: displayName,
          plainName: isGroup ? rawName : null,
          type: type,
        });
        _sortAvailable(available);
      }
      if (editorMode !== 'devices') return;

      var newTypeOrder = _typeOrder(type);
      var newText = displayName + ' (IDX\u00a0' + dispIdx + ')';
      var optHtml =
        '<option value="' +
        _esc(ck) +
        '" data-type-order="' +
        newTypeOrder +
        '">' +
        _esc(displayName) +
        ' (IDX\u00a0' +
        dispIdx +
        ')</option>';

      var $select = $('#de-add-rows .de-device-select');
      if ($select.length) {
        /* insert in category + alphabetical order */
        var inserted = false;
        $select.find('option').each(function () {
          if (!$(this).val() || /^__/.test(String($(this).val()))) return;
          var optTypeOrder = parseInt(
            $(this).attr('data-type-order') || '2',
            10
          );
          var cmp =
            newTypeOrder !== optTypeOrder
              ? newTypeOrder - optTypeOrder
              : newText.localeCompare($(this).text());
          if (cmp < 0) {
            $(this).before(optHtml);
            inserted = true;
            return false;
          }
        });
        if (!inserted) $select.append(optHtml);
        /* remove "all devices added" message if present */
        $('#de-add-rows .de-empty').remove();
      } else {
        /* no add-row exists yet — create one with this single device */
        $('#de-add-rows').html(
          _addRowHtml([
            {
              key: ck,
              idx: p.idx,
              subidx: p.subidx,
              name: displayName,
              plainName: isGroup ? rawName : null,
              type: type,
            },
          ])
        );
      }
    });

    $('#de-device-list').on('input change', '.de-device-width', function () {
      var orderKey = String($(this).attr('data-order-key') || '');
      if (!orderKey) return;
      var width = _parseWidth($(this).val());
      if (orderKey.indexOf('widget:') === 0) {
        widgetWidths[orderKey] = width;
      } else if (orderKey.indexOf('special:') === 0) {
        managedSpecials[orderKey].width = width;
      } else {
        deviceWidths[orderKey.slice(7)] = width;
      }
      $(this).val(width);
    });

    /* Keep the editable title and display options in state for saving. */
    $('#de-device-list').on('input change', '.de-device-title', function () {
      var orderKey = String($(this).attr('data-order-key') || '');
      var value = String($(this).val() || '').trim();
      if (orderKey.indexOf('widget:') === 0) {
        widgetTitles[orderKey] = value;
        if (managedWidgets[orderKey])
          managedWidgets[orderKey].pendingTitleEdited = true;
      } else if (orderKey.indexOf('special:') === 0) {
        if (managedSpecials[orderKey]) managedSpecials[orderKey].title = value;
      } else {
        deviceTitles[String($(this).attr('data-ck') || '')] = value;
      }
    });
    $('#de-add-rows').on('change', '.de-device-select', function () {
      var $row = $(this).closest('.de-add-row');
      var $value = $row.find('.de-special-value');
      var selected = String($(this).val() || '');
      var t = _translations();
      if (selected === '__dummy__') {
        $value
          .attr({
            type: 'number',
            min: '1',
            placeholder: t.enter_idx,
            'aria-label': t.enter_idx,
          })
          .val('')
          .removeClass('d-none');
        $row.find('.de-width-input').val(3);
      } else if (selected === '__title__') {
        $value
          .removeAttr('min')
          .attr({
            type: 'text',
            placeholder: t.enter_title,
            'aria-label': t.enter_title,
          })
          .val('')
          .removeClass('d-none');
        $row.find('.de-width-input').val(12);
      } else {
        $value.val('').addClass('d-none');
        $row.find('.de-width-input').val(3);
      }
    });

    /* + button */
    $('#de-add-rows').on('click', '.de-add-btn', function () {
      var $row = $(this).closest('.de-add-row');
      var $select = $row.find('.de-device-select');
      var ck = $select.val();
      if (!ck) return;

      if (ck === '__dummy__' || ck === '__title__') {
        var specialType = ck === '__title__' ? 'title' : 'dummy';
        var rawValue = String(
          $row.find('.de-special-value').val() || ''
        ).trim();
        var t = _translations();
        var idx = specialType === 'dummy' ? parseInt(rawValue, 10) : null;
        if (specialType === 'dummy' && !(idx > 0 && String(idx) === rawValue)) {
          alert(t.invalid_idx);
          return;
        }
        if (specialType === 'title' && !rawValue) {
          alert(t.invalid_title);
          return;
        }
        var reference = _nextSpecialReference(specialType);
        var specialOrderKey = _specialOrderKey(reference);
        var numberMatch = reference.match(/(\d+)$/);
        var special = {
          kind: 'special',
          specialType: specialType,
          orderKey: specialOrderKey,
          reference: reference,
          definition: {},
          idx: idx,
          title:
            specialType === 'title'
              ? rawValue.slice(0, 100)
              : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
          width: _parseWidth($row.find('.de-width-input').val()),
          height: specialType === 'title' ? 120 : null,
          showTitle: true,
          options:
            specialType === 'dummy'
              ? {
                  icon: true,
                  iconValue: null,
                  hide_data: true,
                  last_update: false,
                  switch: false,
                }
              : {
                  icon: true,
                  iconValue: SEPARATOR_DEFAULT_ICON,
                  hide_data: false,
                  last_update: false,
                  switch: false,
                },
          customFields: [
            {
              field: 'title',
              setting:
                specialType === 'title'
                  ? rawValue.slice(0, 100)
                  : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
              value:
                specialType === 'title'
                  ? rawValue.slice(0, 100)
                  : 'Dummy_' + (numberMatch ? numberMatch[1] : '1'),
              system: true,
            },
          ],
          preservedFields: {},
        };
        managedSpecials[specialOrderKey] = special;
        managedOrder.push(specialOrderKey);
        $('#de-device-list .de-empty').remove();
        $('#de-device-list').append(_specialItemHtml(specialOrderKey));
        if (editorMode === 'devices') {
          $select.val('').trigger('change');
        } else {
          $row.find('.de-special-value').val('');
        }
        return;
      }

      if (managedDevices.indexOf(ck) < 0) managedDevices.push(ck);
      if (managedOrder.indexOf(_deviceOrderKey(ck)) < 0) {
        managedOrder.push(_deviceOrderKey(ck));
      }
      deviceWidths[ck] = _parseWidth($row.find('.de-width-input').val());
      deviceTitles[ck] = '';
      deviceRefs[ck] = _stableDeviceReference(ck);
      deviceOptions[ck] = {
        icon: true,
        iconValue: null,
        hide_data: false,
        last_update: false,
        switch: false,
        dial: false,
        bar: false,
        needle: false,
      };
      deviceTitleVisible[ck] = true;
      deviceCustomFields[ck] = [
        { field: 'title', setting: '', value: '', system: true },
      ];
      devicePreservedFields[ck] = {};

      /* record the device name for this composite key */
      /* for groups, use plainName (without Group_/Scene_ prefix) so the block title is clean */
      var addedName = _isGroupCk(ck) ? ck : 'Device ' + _parseCk(ck).idx;
      for (var di = 0; di < available.length; di++) {
        if (available[di].key === ck) {
          addedName = available[di].plainName || available[di].name;
          break;
        }
      }
      deviceNames[ck] = addedName;

      /* update device-list section */
      $('#de-device-list .de-empty').remove();
      $('#de-device-list').append(_deviceItemHtml(ck, allDomoticz, true));

      /* remove the completed row */
      $row.remove();

      /* remove added device from every remaining select */
      $('#de-add-rows .de-device-select option[value="' + ck + '"]').remove();

      /* Always add a fresh normal-device row for the next selection. */
      var remaining = available.filter(function (d) {
        return managedDevices.indexOf(d.key) < 0;
      });
      $('#de-add-rows .de-empty').remove();
      var $newRow = $(_addRowHtml(remaining));
      /* remove already-managed keys from the new select */
      managedDevices.forEach(function (mck) {
        $newRow.find('option[value="' + mck + '"]').remove();
      });
      $('#de-add-rows').append($newRow);
    });

    /* drag-and-drop reordering */
    var $list = $('#de-device-list');
    var dragSrcEl = null;

    $list.on('dragstart', '.de-device-item', function (e) {
      dragSrcEl = this;
      e.originalEvent.dataTransfer.effectAllowed = 'move';
      e.originalEvent.dataTransfer.setData(
        'text/plain',
        String($(this).attr('data-order-key'))
      );
      $(this).addClass('de-drag-dragging');
    });

    $list.on('dragend', '.de-device-item', function () {
      $(this).removeClass('de-drag-dragging');
      $list
        .find('.de-drag-over-top, .de-drag-over-bottom')
        .removeClass('de-drag-over-top de-drag-over-bottom');
    });

    $list.on('dragover', '.de-device-item', function (e) {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
      if (this === dragSrcEl) return;
      var rect = this.getBoundingClientRect();
      var above = e.originalEvent.clientY < rect.top + rect.height / 2;
      $(this)
        .toggleClass('de-drag-over-top', above)
        .toggleClass('de-drag-over-bottom', !above);
    });

    $list.on('dragleave', '.de-device-item', function (e) {
      /* only clear when leaving the item itself, not a child */
      if (!this.contains(e.originalEvent.relatedTarget)) {
        $(this).removeClass('de-drag-over-top de-drag-over-bottom');
      }
    });

    $list.on('drop', '.de-device-item', function (e) {
      e.preventDefault();
      if (!dragSrcEl || this === dragSrcEl) return;
      var rect = this.getBoundingClientRect();
      var above = e.originalEvent.clientY < rect.top + rect.height / 2;
      if (above) {
        $(this).before(dragSrcEl);
      } else {
        $(this).after(dragSrcEl);
      }
      $(this).removeClass('de-drag-over-top de-drag-over-bottom');
      /* sync the combined device/widget order from the DOM */
      managedOrder = [];
      $list.find('.de-device-item').each(function () {
        managedOrder.push(String($(this).attr('data-order-key')));
      });
    });

    /* save button */
    $('#deviceeditorpopup').on('click', '#de-save-btn', _save);

    /* cleanup on hide */
    $('#deviceeditorpopup').on('hidden.bs.modal', function () {
      if ($(this).data('de-config-transition')) return;
      $(this).remove();
    });
  }

  function _widthForOrderKey(orderKey) {
    if (orderKey.indexOf('widget:') === 0) {
      return _parseWidth(widgetWidths[orderKey]);
    }
    if (orderKey.indexOf('special:') === 0) {
      return _parseWidth(managedSpecials[orderKey].width);
    }
    return _parseWidth(deviceWidths[orderKey.slice(7)]);
  }

  function _heightForOrderKey(orderKey) {
    if (orderKey.indexOf('widget:') === 0) return widgetHeights[orderKey];
    if (orderKey.indexOf('special:') === 0) {
      return managedSpecials[orderKey].height;
    }
    return deviceHeights[orderKey.slice(7)];
  }

  /* ── save to CONFIG.js via PHP ──────────────────────────────── */
  /* Build the full devices[] payload for saveblocks.php from the current
     in-memory state. Shared by _save() (the full Device Editor save) and
     _saveDeviceConfigOnly() (the Layout Editor's blocksOnly-only save) -
     saveblocks.php replaces the whole device section for the screen, so
     both callers must submit every currently managed device, not just the
     one that changed. */
  function _buildDevicePayload() {
    var orderedBlockKeys = managedOrder.filter(function (orderKey) {
      return orderKey.indexOf('widget:') !== 0;
    });
    return orderedBlockKeys.map(function (orderKey) {
      if (orderKey.indexOf('special:') === 0) {
        var special = managedSpecials[orderKey];
        var specialEntry = {
          kind: special.specialType,
          key: special.reference,
          width: _parseWidth(special.width),
        };
        var titleOptionalKind =
          TITLE_OPTIONAL_SPECIAL_KINDS.indexOf(special.specialType) > -1;
        if (!titleOptionalKind || String(special.title || '').trim()) {
          specialEntry.title = special.title;
        }
        if (special.showTitle === false) specialEntry.hide_title = true;
        var specialCustomFields = _deviceCustomFieldsObject(
          special.customFields,
          special.preservedFields
        );
        if (Object.keys(specialCustomFields).length) {
          specialEntry.custom_fields = specialCustomFields;
        }
        if (
          special.specialType === 'dummy' ||
          special.specialType === 'custom'
        ) {
          specialEntry.idx = special.idx;
          var specialOptions = special.options || {};
          if (specialOptions.icon === false) {
            specialEntry.icon = '';
          } else if (specialOptions.iconValue) {
            specialEntry.icon = specialOptions.iconValue;
          }
          specialEntry.hide_data = specialOptions.hide_data === true;
          specialEntry.last_update = specialOptions.last_update === true;
          specialEntry.switch = specialOptions.switch === true;
          if (specialOptions.bar === true) {
            // saveblocks.php intentionally accepts only type:'dial'; keep its
            // canonical form while the runtime also accepts type:'bar'.
            specialEntry.type = 'dial';
            specialCustomFields.subtype = 'bar';
            // Only written when it differs from js/components/dial.js's own
            // default (10), keeping CONFIG.js lean for the common case.
            if (specialOptions.barsteps && specialOptions.barsteps !== 10) {
              specialCustomFields.barsteps = specialOptions.barsteps;
            }
            specialEntry.custom_fields = specialCustomFields;
          } else if (specialOptions.dial === true) {
            specialEntry.type = 'dial';
          } else if (specialOptions.needle === true) {
            // Needle stays on the classic (non-dial) rendering path -
            // js/switches.js getBlindsBlock() reads block.needle directly,
            // not block.type - saveblocks.php only recognizes a fixed set
            // of top-level props (unlike Dial/Bar's existing type:'dial'),
            // so this rides through custom_fields like barsteps already
            // does, rather than as a top-level entry property that would
            // be silently dropped on save.
            specialCustomFields.needle = true;
            if (specialOptions.barsteps && specialOptions.barsteps !== 10) {
              specialCustomFields.barsteps = specialOptions.barsteps;
            }
            if (typeof specialOptions.inverse === 'boolean') {
              specialCustomFields.inverse = specialOptions.inverse;
            }
            specialEntry.custom_fields = specialCustomFields;
          }
        } else if (
          SIMPLE_ICON_PAYLOAD_KINDS.indexOf(special.specialType) > -1
        ) {
          // Only Icon and Last update apply here (no Data/Switch/Dial - see
          // _quickOptionsHtml()); idx is optional and only meaningful for a
          // Group block (js/components/group.js can use 'devices' instead,
          // carried through specialCustomFields above like any other extra
          // field). configwriter.php writes type: 'group' unconditionally
          // for that kind only - html/iframe/calendar/xmltvguide have no
          // `type` of their own (dispatched on htmlfile/frameurl/icalurl/
          // xmltvurl instead), so it is not set here.
          var quickSaveOptions = special.options || {};
          if (quickSaveOptions.icon === false) {
            specialEntry.icon = '';
          } else if (quickSaveOptions.iconValue) {
            specialEntry.icon = quickSaveOptions.iconValue;
          }
          specialEntry.last_update = quickSaveOptions.last_update === true;
          if (special.specialType === 'group' && special.idx) {
            specialEntry.idx = special.idx;
          }
        } else if (special.specialType === 'timegraph') {
          // js/components/timegraph.js dispatches on an explicit
          // type:'timegraph' alone (like Group's own type:'group') -
          // configwriter.php writes it unconditionally for this kind, so
          // it is not set here. Unlike Group/HTML/iFrame/Calendar/Public
          // transport above, the graphed device idx is a required,
          // always-present top-level property here, not optional.
          var tgOptions = special.options || {};
          if (tgOptions.icon === false) {
            specialEntry.icon = '';
          } else if (tgOptions.iconValue) {
            specialEntry.icon = tgOptions.iconValue;
          }
          specialEntry.last_update = tgOptions.last_update === true;
          specialEntry.idx = special.idx;
        } else if (special.specialType === 'slidebutton') {
          var slideOptions = special.options || {};
          specialEntry.slide = parseInt(special.slideTarget, 10) || 1;
          specialEntry.button_key = String(
            special.buttonKey ||
              (special.definition && special.definition.key) ||
              special.title ||
              special.reference
          ).slice(0, 100);
          specialEntry.icon = slideOptions.iconValue || '';
        } else if (special.specialType === 'title') {
          var titleOptions = special.options || {};
          if (titleOptions.icon === false) {
            specialEntry.icon = '';
          } else if (titleOptions.iconValue) {
            specialEntry.icon = titleOptions.iconValue;
          } else if (!specialCustomFields.image) {
            // Separators have no Domoticz device type from which the renderer
            // can derive an icon. Give the enabled Icon option a real default
            // when nothing else supplies a leading visual - but not when the
            // user picked a custom image instead, or the renderer draws both
            // side by side (getColIcon() in dashticz.js renders an icon and
            // an image independently rather than one replacing the other).
            specialEntry.icon = SEPARATOR_DEFAULT_ICON;
          }
        } else if (special.specialType === 'lms') {
          // js/components/lms.js dispatches on type: 'lms' - configwriter.php
          // writes it unconditionally for this kind, like Group's own
          // type: 'group', so it is not set here either. Icon defaults off
          // (the cover artwork is this block's own visual), unlike Group/
          // HTML's icon defaulting from a Domoticz device/none respectively.
          var lmsOptions = special.options || {};
          if (lmsOptions.icon === false) {
            specialEntry.icon = '';
          } else if (lmsOptions.iconValue) {
            specialEntry.icon = lmsOptions.iconValue;
          }
          specialEntry.server = special.lmsServer;
          specialEntry.port = special.lmsPort;
          specialEntry.username = special.lmsUsername;
          specialEntry.password = special.lmsPassword;
          specialEntry.player = special.lmsPlayer;
          specialEntry.refresh = special.lmsRefresh;
          specialEntry.hide_when_off = special.lmsHideWhenOff === true;
        }
        if (special.height) specialEntry.height = special.height;
        return specialEntry;
      }
      var ck = orderKey.slice(7);
      var p = _parseCk(ck);
      var entry = {
        idx: p.idx,
        name: deviceNames[ck] || 'Device ' + p.idx,
        width: _parseWidth(deviceWidths[ck]),
        key: _stableDeviceReference(ck),
      };
      var title = String(deviceTitles[ck] || '').trim();
      var options = deviceOptions[ck] || {};
      if (title) entry.title = title;
      if (options.icon === false) {
        entry.icon = '';
      } else if (options.iconValue) {
        // A custom icon entered in Device Config takes precedence while Icon is enabled.
        entry.icon = options.iconValue;
      }
      entry.hide_data = options.hide_data === true;
      entry.last_update = options.last_update === true;
      entry.switch = options.switch === true;
      if (options.bar === true || options.dial === true) {
        // Dial and Bar both need the full Domoticz device. A sub-value idx
        // such as "12_1" cannot resolve that device, so save the base idx.
        // Bar uses the existing server-compatible Dial+subtype representation.
        entry.type = 'dial';
      } else if (p.subidx) {
        entry.subidx = p.subidx;
      }
      if (deviceTitleVisible[ck] === false) entry.hide_title = true;
      var customFields = _deviceCustomFieldsObject(
        deviceCustomFields[ck],
        devicePreservedFields[ck]
      );
      if (options.bar === true) {
        customFields.subtype = 'bar';
        // Only written when it differs from js/components/dial.js's own
        // default (10), keeping CONFIG.js lean for the common case.
        if (options.barsteps && options.barsteps !== 10) {
          customFields.barsteps = options.barsteps;
        }
      } else if (options.needle === true) {
        // Needle stays on the classic (non-dial) rendering path -
        // js/switches.js getBlindsBlock()/getDimmerBlock() read block.needle
        // directly, not block.type - saveblocks.php/configwriter.php only
        // recognize a
        // fixed set of top-level device props (unlike Dial/Bar's existing
        // type:'dial'), so this rides through custom_fields like barsteps
        // already does, rather than as a top-level entry property that
        // would be silently dropped on save.
        customFields.needle = true;
        // Only written when it differs from addSlider()'s own default (10).
        if (options.barsteps && options.barsteps !== 10) {
          customFields.barsteps = options.barsteps;
        }
        // Only written once explicitly set (true or false) - leaving it out
        // keeps getBlindsBlock() auto-detecting from the device's own
        // SwitchType, same reasoning as the tri-state hydration above.
        // Dimmers ignore this field entirely (getDimmerBlock() has no
        // inverted concept), inverseApplies() above hides it from them.
        if (typeof options.inverse === 'boolean') {
          customFields.inverse = options.inverse;
        }
      }
      if (Object.keys(customFields).length) entry.custom_fields = customFields;
      if (deviceHeights[ck]) entry.height = deviceHeights[ck];
      // Never retain a legacy name-based reference: Domoticz names may change.
      return entry;
    });
  }

  /* Persist only device block definitions (icon/title/custom fields) via
     saveblocks.php's blocksOnly mode, without touching widgets or the
     layout/grid position sections. Used when a device's config is edited
     from inside the Layout Editor (openLayoutConfig below), so an
     in-progress drag/resize there is never overwritten by a stale layout
     snapshot - mirrors DashticzWidgetEditor's _saveConfigOnly(). */
  function _saveDeviceConfigOnly() {
    return $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf').then(
      function (data) {
        return _postEditorData(
          'js/saveblocks.php',
          {
            devices: _buildDevicePayload(),
            screen: _activeScreenPayload(),
            blocksOnly: true,
          },
          data.token
        );
      }
    );
  }

  /* When this popup opened while the Layout Editor was already active, a
     Save that only ADDS devices/widgets/separators (nothing reordered,
     removed, or edited on existing entries) is handed off to that
     editor's own in-memory session instead of persisting immediately -
     see DashticzLayoutEditor.addPendingItems(). Returns true when
     handled: the popup is closed and the caller's normal save must not
     also run. Anything else (an existing entry touched, or a kind the
     Layout Editor's item model can't represent yet - custom/multi-
     device/group/HTML block/slide button) falls through to the normal
     persist-and-reload save, unchanged. */
  function _graftIntoLayoutEditor() {
    if (
      typeof DashticzLayoutEditor === 'undefined' ||
      !DashticzLayoutEditor.isActive ||
      !DashticzLayoutEditor.isActive() ||
      !DashticzLayoutEditor.addPendingItems
    ) {
      return false;
    }

    var unchangedExisting = managedOrder.filter(function (orderKey) {
      return layoutEditorBaseline.indexOf(orderKey) !== -1;
    });
    var existingUntouched =
      unchangedExisting.length === layoutEditorBaseline.length &&
      unchangedExisting.every(function (orderKey, index) {
        return orderKey === layoutEditorBaseline[index];
      });
    if (!existingUntouched) return false;

    var newOrderKeys = managedOrder.filter(function (orderKey) {
      return layoutEditorBaseline.indexOf(orderKey) === -1;
    });
    if (!newOrderKeys.length) return false;

    var entries = [];
    var allGraftable = newOrderKeys.every(function (orderKey) {
      if (orderKey.indexOf('device:') === 0) {
        var ck = orderKey.slice(7);
        var p = _parseCk(ck);
        entries.push({
          kind: 'device',
          idx: p.idx,
          subidx: p.subidx,
          name: deviceNames[ck] || 'Device ' + p.idx,
          width: _parseWidth(deviceWidths[ck]),
        });
        return true;
      }
      if (orderKey.indexOf('widget:') === 0) {
        var widget = managedWidgets[orderKey];
        if (!widget) return false;
        entries.push({
          kind: 'widget',
          widgetId: widget.id,
          name: widgetTitles[orderKey] || widget.title || widget.id,
          width: _parseWidth(widgetWidths[orderKey]),
        });
        return true;
      }
      if (
        orderKey.indexOf('special:') === 0 &&
        managedSpecials[orderKey] &&
        managedSpecials[orderKey].specialType === 'title'
      ) {
        var special = managedSpecials[orderKey];
        entries.push({
          kind: 'separator',
          name: special.title || _translations().separator,
          width: _parseWidth(special.width),
        });
        return true;
      }
      return false;
    });

    if (!allGraftable) return false;

    DashticzLayoutEditor.addPendingItems(entries);
    _closeModalWithoutSaving();
    return true;
  }

  function _closeModalWithoutSaving() {
    var el = document.getElementById('deviceeditorpopup');
    var instance =
      el && window.bootstrap && window.bootstrap.Modal.getInstance(el);
    if (instance) instance.hide();
  }

  function _save() {
    if (layoutEditorBaseline && _graftIntoLayoutEditor()) return;

    var t = _translations();
    var $btn = $('#de-save-btn').prop('disabled', true).text(t.saving);

    // Keep this list in _save() as well as _buildDevicePayload(): after the
    // device/widget requests complete it is needed to map the returned block
    // keys back onto managedOrder.  When payload construction was extracted
    // into _buildDevicePayload(), orderedBlockKeys accidentally became local
    // to that helper; the later mapping then threw a ReferenceError and the
    // otherwise successful save surfaced as the generic save-failed alert.
    var orderedBlockKeys = managedOrder.filter(function (orderKey) {
      return orderKey.indexOf('widget:') !== 0;
    });
    var devicePayload = _buildDevicePayload();

    var orderedWidgetKeys = managedOrder.filter(function (orderKey) {
      return orderKey.indexOf('widget:') === 0;
    });
    var widgetPayload = orderedWidgetKeys.map(function (orderKey) {
      var entry = _widgetPayload(orderKey);
      if (gridMode && gridRefs[orderKey]) entry.key = gridRefs[orderKey];
      return entry;
    });

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postEditorData(
          'js/saveblocks.php',
          {
            devices: devicePayload,
            screen: _activeScreenPayload(),
            blocksOnly: gridMode,
          },
          token
        ).then(function (deviceResult) {
          // Widget display options must also be persisted on grid screens.
          // Passing the stable grid key lets savewidgets.php rebuild only the
          // editor-owned widget blocks before savegridlayout.php rewrites order.
          var widgetSave = _postEditorData(
            'js/savewidgets.php',
            {
              widgets: widgetPayload,
              settings: pendingWidgetSettings,
              screen: _activeScreenPayload(),
              blocksOnly: gridMode,
              // Without this, savewidgets.php's $gridMode reads false and
              // falls back to each widget's classic-mode catalog height
              // (e.g. iframe 400px, camera 320px) even on a grid screen,
              // silently reintroducing a fixed height on every widget that
              // never had one - on every Device Editor save, since editing
              // any device re-submits every currently placed widget too (#100).
              gridMode: gridMode,
            },
            token
          );
          return widgetSave.then(function (widgetResult) {
            var blockRefs = {};
            var widgetRefs = {};
            orderedBlockKeys.forEach(function (orderKey, index) {
              blockRefs[orderKey] = deviceResult.blockKeys[index];
            });
            orderedWidgetKeys.forEach(function (orderKey, index) {
              widgetRefs[orderKey] = widgetResult.blockKeys[index];
            });
            // Device Editor does not modify custom.css; theme and hand-written
            // CSS remain outside this save flow.
            if (gridMode) {
              var occupied = gridExtras
                .map(function (item) {
                  return item.grid;
                })
                .concat(
                  Object.keys(gridPositions).map(function (orderKey) {
                    return gridPositions[orderKey];
                  })
                );
              var gridItems = managedOrder.map(function (orderKey) {
                var isWidget = orderKey.indexOf('widget:') === 0;
                var ref = isWidget ? widgetRefs[orderKey] : blockRefs[orderKey];
                var position = gridPositions[orderKey];
                if (!position) {
                  var width12 = _widthForOrderKey(orderKey);
                  var pixelHeight = _heightForOrderKey(orderKey);
                  var width = Math.max(
                    1,
                    Math.min(
                      gridConfig.gridColumns,
                      Math.round((width12 * gridConfig.gridColumns) / 12)
                    )
                  );
                  var isTitleBlock =
                    orderKey.indexOf('special:') === 0 &&
                    managedSpecials[orderKey].specialType === 'title';
                  var height = isTitleBlock
                    ? TITLE_GRID_HEIGHT
                    : Math.max(
                        1,
                        Math.ceil(
                          ((pixelHeight || 120) + gridConfig.gap) /
                            (gridConfig.rowHeight + gridConfig.gap)
                        )
                      );
                  position = _firstFreeGridPosition(occupied, width, height);
                  occupied.push(position);
                }
                return { ref: ref, grid: $.extend({}, position) };
              });
              gridItems = gridItems.concat(gridExtras);
              return _postEditorData(
                'js/savegridlayout.php',
                {
                  items: gridItems,
                  screen: _activeScreenPayload(),
                  gridColumns: gridConfig.gridColumns,
                  rowHeight: gridConfig.rowHeight,
                  // Only pin these explicitly on the screen when they
                  // diverge from the dashboard-wide default (see the
                  // matching comment in layouteditor.js's _buildSavePayloads).
                  pinGridColumns:
                    gridConfig.gridColumns !== _defaultGridColumns(),
                  pinRowHeight: gridConfig.rowHeight !== _defaultRowHeight(),
                  gap: gridConfig.gap,
                  mobileLayout: gridConfig.mobileLayout,
                },
                token
              );
            }
            var layoutItems = managedOrder.map(function (orderKey) {
              var isWidget = orderKey.indexOf('widget:') === 0;
              var entry = {
                ref: isWidget ? widgetRefs[orderKey] : blockRefs[orderKey],
                width: _widthForOrderKey(orderKey),
              };
              var height = _heightForOrderKey(orderKey);
              if (height) entry.height = height;
              return entry;
            });
            if (_activeScreenTarget() === 'standby') {
              layoutItems = _preserveStandbyExtraBlocks(layoutItems);
            }
            return _postEditorData(
              'js/savelayout.php',
              { items: layoutItems, screen: _activeScreenPayload() },
              token
            );
          });
        });
      })
      .done(function () {
        $btn.removeClass('btn-primary').addClass('btn-success').text(t.saved);
        setTimeout(function () {
          var el = document.getElementById('deviceeditorpopup');
          if (el && window.bootstrap) {
            window.bootstrap.Modal.getInstance(el).hide();
          }
          // eslint-disable-next-line no-self-assign
          window.location.href = window.location.href;
        }, 900);
      })
      .fail(function (xhr) {
        var msg =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : t.save_failed;
        $btn.prop('disabled', false).text(t.save);
        alert(t.error_prefix + ' ' + msg);
      });
  }

  function _preserveStandbyExtraBlocks(layoutItems) {
    var known = {};
    layoutItems.forEach(function (item) {
      if (item && item.ref) known[item.ref] = true;
    });
    var preserved = [];
    if (
      typeof columns_standby !== 'undefined' &&
      columns_standby &&
      columns_standby[1] &&
      Array.isArray(columns_standby[1].blocks)
    ) {
      columns_standby[1].blocks.forEach(function (ref) {
        if (typeof ref !== 'string' || known[ref]) return;
        // Keep simple/hand-written standby blocks (clock, weather, …).
        if (_toCompositeKey(ref) || _widgetFromReference(ref)) return;
        preserved.push({ ref: ref, width: 12 });
        known[ref] = true;
      });
    }
    return preserved.concat(layoutItems);
  }

  function _postEditorData(url, payload, token) {
    return $.ajax({
      url: configEditorUrl(url),
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(payload),
      dataType: 'json',
      headers: { 'X-Dashticz-CSRF': token },
    });
  }

  /* ── HTML-escape helper ─────────────────────────────────────── */
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _parseWidth(value) {
    var width = parseInt(value, 10);
    if (!width) width = 3;
    return Math.max(1, Math.min(12, width));
  }

  /* Find the CONFIG.js block definition associated with a composite IDX. */
  function _getConfiguredBlockForCk(ck) {
    if (typeof blocks === 'undefined') return null;
    // The same Domoticz IDX may legitimately appear on several screens with
    // different presentation settings (for example Dial on one screen and a
    // normal block on another). Prefer the exact active-screen reference;
    // falling back to the first matching IDX would reapply another block's
    // stale Dial/Icon settings during an unrelated Device Editor save.
    var reference = deviceRefs[ck];
    if (
      reference &&
      blocks[reference] &&
      _toCompositeKey(blocks[reference]) === ck
    ) {
      return blocks[reference];
    }
    var keys = Object.keys(blocks);
    for (var i = 0; i < keys.length; i++) {
      if (_toCompositeKey(blocks[keys[i]]) === ck) return blocks[keys[i]];
    }
    return null;
  }

  function _getConfiguredWidthForCk(ck) {
    if (typeof columns !== 'undefined') {
      var colKeys = Object.keys(columns);
      for (var i = 0; i < colKeys.length; i++) {
        var col = columns[colKeys[i]];
        if (!col || !Array.isArray(col.blocks)) continue;
        for (var j = 0; j < col.blocks.length; j++) {
          var ref = col.blocks[j];
          var block = null;
          var refCk = _toCompositeKey(ref);
          if (
            typeof ref === 'string' &&
            typeof blocks !== 'undefined' &&
            blocks[ref]
          ) {
            block = blocks[ref];
            if (!refCk) refCk = _toCompositeKey(block);
          } else if (typeof ref === 'object' && ref !== null) {
            block = ref;
          }
          if (refCk === ck && block && typeof block.width !== 'undefined') {
            return _parseWidth(block.width);
          }
        }
      }
    }

    if (typeof blocks !== 'undefined') {
      var blockKeys = Object.keys(blocks);
      for (var bi = 0; bi < blockKeys.length; bi++) {
        var b = blocks[blockKeys[bi]];
        if (_toCompositeKey(b) === ck && b && typeof b.width !== 'undefined') {
          return _parseWidth(b.width);
        }
      }
    }
    return 3;
  }

  function _getConfiguredHeightForCk(ck) {
    if (typeof columns !== 'undefined') {
      var colKeys = Object.keys(columns);
      for (var i = 0; i < colKeys.length; i++) {
        var col = columns[colKeys[i]];
        if (!col || !Array.isArray(col.blocks)) continue;
        for (var j = 0; j < col.blocks.length; j++) {
          var ref = col.blocks[j];
          var block = null;
          var refCk = _toCompositeKey(ref);
          if (
            typeof ref === 'string' &&
            typeof blocks !== 'undefined' &&
            blocks[ref]
          ) {
            block = blocks[ref];
            if (!refCk) refCk = _toCompositeKey(block);
          } else if (typeof ref === 'object' && ref !== null) {
            block = ref;
          }
          if (refCk === ck && block && typeof block.height !== 'undefined') {
            return _parseHeight(block.height);
          }
        }
      }
    }
    return null;
  }

  function _parseHeight(value) {
    var height = parseInt(value, 10);
    if (!(height > 0)) return null;
    return Math.max(50, Math.min(2000, Math.round(height / 10) * 10));
  }

  return {
    open: open,
    openConfig: openConfig,
    openLayoutConfig: openLayoutConfig,
    openSpecial: openSpecial,
    openCustom: openCustom,
    openMultiDevice: openMultiDevice,
    openGroup: openGroup,
    openHtmlBlock: openHtmlBlock,
    openIframe: openIframe,
    openCalendar: openCalendar,
    openPublicTransport: openPublicTransport,
    openTimegraph: openTimegraph,
    openXmltvguide: openXmltvguide,
    openLms: openLms,
    openSlideButton: openSlideButton,
    addSeparator: addSeparator,
  };
})();

//# sourceURL=js/deviceeditor.js
