/* global Domoticz settings columns blocks blocktypes screens */
// eslint-disable-next-line no-unused-vars
var DashticzDeviceEditor = (function () {
  'use strict';

  /* ── state ──────────────────────────────────────────────────── */
  /* Composite keys: '493' for plain devices, '1298_1' for sub-devices */
  var managedDevices = [];   // composite keys managed by the device editor
  var managedOrder   = [];   // device:<ck> and widget:<id> in screen order
  var managedWidgets = {};   // order key -> widget metadata
  var deviceNames    = {};   // composite key -> device name
  var deviceWidths   = {};   // composite key -> block width (1..12)
  var deviceHeights  = {};   // composite key -> optional block height
  var widgetWidths   = {};   // widget order key -> block width (1..12)
  var widgetHeights  = {};   // widget order key -> optional block height

  /* ── public API ─────────────────────────────────────────────── */
  function open() {
    _init();
    _buildAndShowModal();
  }

  /* ── initialise managed-device list from ALL current Dashticz devices ── */
  function _init() {
    managedDevices = [];
    managedOrder   = [];
    managedWidgets = {};
    deviceNames    = {};
    deviceWidths   = {};
    deviceHeights  = {};
    widgetWidths   = {};
    widgetHeights  = {};

    _getAllManagedItems().forEach(function (item) {
      managedOrder.push(item.orderKey);
      if (item.kind === 'widget') {
        managedWidgets[item.orderKey] = item;
        widgetWidths[item.orderKey] = _parseWidth(item.definition.width);
        widgetHeights[item.orderKey] = _parseHeight(item.definition.height);
      } else {
        managedDevices.push(item.ck);
      }
    });
  }

  /* ── composite key helpers ──────────────────────────────────── */
  /* Build a composite key from a base idx and optional sub-index  */
  function _ck(idx, subidx) {
    return subidx ? (idx + '_' + subidx) : String(idx);
  }

  /* Parse a composite key back into {idx, subidx} */
  function _parseCk(ck) {
    var parts = String(ck).split('_');
    return {
      idx:    parseInt(parts[0], 10),
      subidx: parts.length === 2 ? parseInt(parts[1], 10) : 0,
    };
  }

  /* Convert a block reference (number / string / object) to a composite key */
  function _toCompositeKey(b) {
    if (typeof b === 'number' && b > 0) return String(b);
    if (typeof b === 'string') {
      var n = parseInt(b, 10);
      /* pure numeric string e.g. '493' */
      if (n > 0 && String(n) === b) return b;
      /* compound string e.g. '1298_1' */
      var parts = b.split('_');
      if (parts.length === 2) {
        var base = parseInt(parts[0], 10);
        var sub  = parseInt(parts[1], 10);
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
        var subidx = (typeof b.subidx === 'number' && b.subidx > 0) ? b.subidx : 0;
        return _ck(idx, subidx);
      }
    }
    return null;
  }

  /* ── collect every managed device from all columns ─────────── */
  function _deviceOrderKey(ck) {
    return 'device:' + ck;
  }

  function _widgetOrderKey(id) {
    return 'widget:' + id;
  }

  function _widgetFromReference(reference) {
    var catalog = {
      widget_weather: { id: 'weather', title: 'Weer' },
      widget_garbage: { id: 'garbage', title: 'Afval' },
      widget_spotify: { id: 'spotify', title: 'Spotify' },
      widget_sonarr: { id: 'sonarr', title: 'Sonarr' },
      widget_clock: { id: 'clock', title: 'Klok' },
      widget_calendar: { id: 'calendar', title: 'Kalender' },
    };
    var catalogItem = catalog[String(reference)];
    if (
      !catalogItem ||
      typeof blocks === 'undefined' ||
      !blocks[reference]
    ) {
      return null;
    }
    var definition = blocks[reference];
    return {
      kind: 'widget',
      id: catalogItem.id,
      orderKey: _widgetOrderKey(catalogItem.id),
      reference: String(reference),
      title: definition.title || catalogItem.title,
      definition: definition,
    };
  }

  function _getAllManagedItems() {
    var seen = {};
    var ordered = [];
    if (typeof columns !== 'undefined') {
      var columnKeys = [];
      var $activeScreen = $('.screen.swiper-slide-active');
      if (!$activeScreen.length) $activeScreen = $('.screen:visible').first();
      $activeScreen.find('[data-colindex]').each(function () {
        var columnKey = String($(this).attr('data-colindex'));
        if (columnKeys.indexOf(columnKey) < 0) {
          columnKeys.push(columnKey);
        }
      });
      if (
        typeof screens !== 'undefined' &&
        screens[1] &&
        Array.isArray(screens[1].columns)
      ) {
        screens[1].columns.forEach(function (columnKey) {
          columnKey = String(columnKey);
          if (columnKeys.indexOf(columnKey) < 0) {
            columnKeys.push(columnKey);
          }
        });
      }
      Object.keys(columns).forEach(function (colKey) {
        if (columnKeys.indexOf(String(colKey)) < 0) {
          columnKeys.push(String(colKey));
        }
      });
      columnKeys.forEach(function (colKey) {
        var col = columns[colKey];
        if (col && Array.isArray(col.blocks)) {
          col.blocks.forEach(function (b) {
            var ck = _toCompositeKey(b);
            /* non-numeric string block keys → look up in global blocks object */
            if (!ck && typeof b === 'string' &&
                typeof blocks !== 'undefined' && blocks[b]) {
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
    }
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
    if (Array.isArray(bt.values))    return bt.values.length;
    return 0;
  }

  /* ── build available device list (Domoticz minus Dashticz) ─── */
  function _getAvailableDevices(managedKeys) {
    var all = Domoticz.getAllDevices();

    /* build fast lookup sets */
    var managedSet       = {};   /* all composite keys currently managed */
    var managedFullIdx   = {};   /* base idx that is managed WITHOUT a sub-index */
    managedKeys.forEach(function (ck) {
      managedSet[ck] = true;
      var p = _parseCk(ck);
      if (!p.subidx) managedFullIdx[p.idx] = true;
    });

    var available = [];
    Object.keys(all).forEach(function (key) {
      if (!key || key[0] === '_') return;   /* internal entries */
      var idx = parseInt(key, 10);
      if (!(idx > 0 && String(idx) === String(key))) return;
      if (managedFullIdx[idx]) return;      /* whole base device is already managed */

      var d        = all[key];
      var name     = d.Name || ('Device ' + key);
      var type     = d.Type  || '';
      var subCount = _getSubValueCount(d);

      if (subCount > 1) {
        /* expand into individual sub-device entries */
        for (var s = 1; s <= subCount; s++) {
          var ck = _ck(idx, s);
          if (!managedSet[ck]) {
            available.push({ key: ck, idx: idx, subidx: s,
                             name: name + '\u00a0(' + s + ')', type: type });
          }
        }
      } else {
        var ck = _ck(idx, 0);
        if (!managedSet[ck]) {
          available.push({ key: ck, idx: idx, subidx: 0, name: name, type: type });
        }
      }
    });

    available.sort(function (a, b) { return a.name.localeCompare(b.name); });
    return available;
  }

  /* ── build and display the modal ───────────────────────────── */
  function _buildAndShowModal() {
    $('#deviceeditorpopup').remove();

    var managedKeys = managedDevices.slice();
    var allDomoticz = Domoticz.getAllDevices();
    var available   = _getAvailableDevices(managedKeys);

    /* populate deviceNames / deviceWidths for all managed devices */
    managedKeys.forEach(function (ck) {
      var p = _parseCk(ck);
      var d = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      deviceNames[ck]  = d ? (d.Name || ('Device ' + p.idx)) : ('Device ' + p.idx);
      deviceWidths[ck] = _getConfiguredWidthForCk(ck);
      deviceHeights[ck] = _getConfiguredHeightForCk(ck);
    });

    $('body').append(_buildModalHtml(available, allDomoticz));
    _attachHandlers(available, allDomoticz);

    var el = document.getElementById('deviceeditorpopup');
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(el).show();
    }
  }

  /* ── build the full modal HTML string ──────────────────────── */
  function _buildModalHtml(available, allDomoticz) {
    var html = '';
    html += '<div class="modal fade" id="deviceeditorpopup" tabindex="-1"';
    html += ' aria-labelledby="de-title" aria-hidden="true">';
    html += '<div class="modal-dialog modal-lg modal-dialog-scrollable">';
    html += '<div class="modal-content">';

    /* header */
    html += '<div class="modal-header">';
    html += '<h5 class="modal-title" id="de-title">';
    html += '<i class="fas fa-pencil-alt me-2" aria-hidden="true"></i>Device Editor';
    html += '</h5>';
    html += '<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>';
    html += '</div>';

    /* body */
    html += '<div class="modal-body">';

    /* section 1 – current devices */
    html += '<h6 class="de-section-title">Devices and widgets in Dashticz</h6>';
    html += '<div id="de-device-list" class="de-device-list">';
    if (managedOrder.length === 0) {
      html += '<div class="de-empty">No devices or widgets configured in Dashticz.</div>';
    } else {
      managedOrder.forEach(function (orderKey) {
        if (orderKey.indexOf('widget:') === 0) {
          html += _widgetItemHtml(orderKey);
        } else {
          html += _deviceItemHtml(orderKey.slice(7), allDomoticz, false);
        }
      });
    }
    html += '</div>';

    /* section 2 – add devices */
    html += '<h6 class="de-section-title mt-3">Add device from Domoticz</h6>';
    html += '<div id="de-add-rows">';
    html += _addRowHtml(available);
    html += '</div>';

    html += '</div>'; /* modal-body */

    /* footer */
    html += '<div class="modal-footer">';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += '<span class="text-danger me-auto de-nophp">';
      html += '<i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>';
      html += 'PHP not available — saving is disabled.';
      html += '</span>';
    }
    html += '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>';
    html += '<button type="button" class="btn btn-primary" id="de-save-btn"';
    if (typeof _PHP_INSTALLED !== 'undefined' && !_PHP_INSTALLED) {
      html += ' disabled';
    }
    html += '>Save</button>';
    html += '</div>';

    html += '</div></div></div>'; /* content, dialog, modal */
    return html;
  }

  /* ── HTML for a single device-list row ─────────────────────── */
  function _deviceItemHtml(ck, allDomoticz, isNew) {
    var p      = _parseCk(ck);
    var device = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
    var name   = device ? _esc(device.Name)  : 'Unknown device';
    var type   = device ? _esc(device.Type)  : '';
    var dispIdx = p.subidx ? (p.idx + '_' + p.subidx) : String(p.idx);
    var cls    = 'de-device-item' + (isNew ? ' de-device-item-new' : '');
    var orderKey = _deviceOrderKey(ck);
    var html   = '<div class="' + cls + '" data-ck="' + _esc(ck) +
      '" data-order-key="' + _esc(orderKey) + '" draggable="true">';
    html += '<span class="de-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx">IDX\u00a0' + dispIdx + '</span>';
    html += '<span class="de-device-name">' + name + (p.subidx ? '\u00a0(' + p.subidx + ')' : '') + '</span>';
    if (type) html += '<span class="de-device-type">' + type + '</span>';
    html += '<span class="de-device-width-wrap">';
    html += '<label class="de-device-width-label" for="de-width-' + _esc(ck) + '">Width</label>';
    html += '<input type="number" id="de-width-' + _esc(ck) + '" class="form-control form-control-sm de-device-width" ';
    html += 'data-ck="' + _esc(ck) + '" data-order-key="' + _esc(orderKey) +
      '" min="1" max="12" value="' + _parseWidth(deviceWidths[ck]) + '">';
    html += '</span>';
    html += '<button type="button" class="btn btn-danger btn-sm de-remove-btn ms-auto" data-ck="' + _esc(ck) + '" title="Remove device">';
    html += '<i class="fas fa-minus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  function _widgetItemHtml(orderKey) {
    var widget = managedWidgets[orderKey];
    if (!widget) return '';
    var html = '<div class="de-device-item de-widget-item" data-order-key="' +
      _esc(orderKey) + '" draggable="true">';
    html += '<span class="de-drag-handle" title="Drag to reorder"><i class="fas fa-grip-vertical" aria-hidden="true"></i></span>';
    html += '<span class="de-device-idx"><i class="fas fa-puzzle-piece me-1" aria-hidden="true"></i>Widget</span>';
    html += '<span class="de-device-name">Widget - ' + _esc(widget.title) + '</span>';
    html += '<span class="de-device-type">' +
      _esc(widget.definition.type || widget.id) + '</span>';
    html += '<span class="de-device-width-wrap">';
    html += '<label class="de-device-width-label" for="de-width-' +
      _esc(widget.id) + '">Width</label>';
    html += '<input type="number" id="de-width-' + _esc(widget.id) +
      '" class="form-control form-control-sm de-device-width" data-order-key="' +
      _esc(orderKey) + '" min="1" max="12" value="' +
      _parseWidth(widgetWidths[orderKey]) + '">';
    html += '</span>';
    html += '<span class="de-widget-managed" title="Remove this widget from the Widgets menu"><i class="fas fa-lock" aria-hidden="true"></i></span>';
    html += '</div>';
    return html;
  }

  /* ── HTML for one add-row (select + button) ─────────────────── */
  function _addRowHtml(deviceList) {
    if (deviceList.length === 0) {
      return '<div class="de-empty">All Domoticz devices are already in Dashticz.</div>';
    }
    var html = '<div class="de-add-row">';
    html += '<select class="form-select de-device-select" aria-label="Select device to add">';
    html += '<option value="">— Select a device —</option>';
    deviceList.forEach(function (d) {
      var dispIdx = d.subidx ? (d.idx + '_' + d.subidx) : String(d.idx);
      html += '<option value="' + _esc(d.key) + '">' + _esc(d.name) + ' (IDX\u00a0' + dispIdx + ')</option>';
    });
    html += '</select>';
    html += '<input type="number" class="form-control form-control-sm de-width-input" min="1" max="12" value="2" title="Column width (1-12)" aria-label="Column width">';
    html += '<button type="button" class="btn btn-success btn-sm de-add-btn ms-2" title="Add device">';
    html += '<i class="fas fa-plus" aria-hidden="true"></i>';
    html += '</button>';
    html += '</div>';
    return html;
  }

  /* ── wire up event handlers ─────────────────────────────────── */
  function _attachHandlers(available, allDomoticz) {
    /* - (remove) button */
    $('#de-device-list').on('click', '.de-remove-btn', function () {
      var ck  = String($(this).attr('data-ck'));
      var pos = managedDevices.indexOf(ck);
      if (pos > -1) managedDevices.splice(pos, 1);
      var orderPos = managedOrder.indexOf(_deviceOrderKey(ck));
      if (orderPos > -1) managedOrder.splice(orderPos, 1);
      delete deviceNames[ck];
      delete deviceWidths[ck];
      delete deviceHeights[ck];

      /* remove item from device-list */
      $(this).closest('.de-device-item').remove();
      if ($('#de-device-list .de-device-item').length === 0) {
        $('#de-device-list').html('<div class="de-empty">No devices or widgets configured in Dashticz.</div>');
      }

      /* restore device in add-row dropdown and in available[] */
      var p      = _parseCk(ck);
      var device = allDomoticz[String(p.idx)] || allDomoticz[p.idx];
      var name   = device ? device.Name : ('Device ' + p.idx);
      var type   = device ? (device.Type || '') : '';
      var displayName = name + (p.subidx ? '\u00a0(' + p.subidx + ')' : '');
      var dispIdx     = p.subidx ? (p.idx + '_' + p.subidx) : String(p.idx);

      /* keep available[] in sync so subsequent + rows include this device */
      if (!available.some(function (d) { return d.key === ck; })) {
        available.push({ key: ck, idx: p.idx, subidx: p.subidx,
                         name: displayName, type: type });
        available.sort(function (a, b) { return a.name.localeCompare(b.name); });
      }

      var optHtml = '<option value="' + _esc(ck) + '">' + _esc(displayName) +
                    ' (IDX\u00a0' + dispIdx + ')</option>';

      var $select = $('#de-add-rows .de-device-select');
      if ($select.length) {
        /* insert in alphabetical order */
        var inserted = false;
        $select.find('option').each(function () {
          if ($(this).val() && $(this).text().localeCompare(displayName + ' (IDX\u00a0' + dispIdx + ')') > 0) {
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
        $('#de-add-rows').html(_addRowHtml([{ key: ck, idx: p.idx, subidx: p.subidx,
                                              name: displayName, type: type }]));
      }
    });

    $('#de-device-list').on('input change', '.de-device-width', function () {
      var orderKey = String($(this).attr('data-order-key') || '');
      if (!orderKey) return;
      var width = _parseWidth($(this).val());
      if (orderKey.indexOf('widget:') === 0) {
        widgetWidths[orderKey] = width;
      } else {
        deviceWidths[orderKey.slice(7)] = width;
      }
      $(this).val(width);
    });

    /* + button */
    $('#de-add-rows').on('click', '.de-add-btn', function () {
      var $row    = $(this).closest('.de-add-row');
      var $select = $row.find('.de-device-select');
      var ck      = $select.val();
      if (!ck) return;

      if (managedDevices.indexOf(ck) < 0) managedDevices.push(ck);
      if (managedOrder.indexOf(_deviceOrderKey(ck)) < 0) {
        managedOrder.push(_deviceOrderKey(ck));
      }
      deviceWidths[ck] = _parseWidth($row.find('.de-width-input').val());

      /* record the device name for this composite key */
      var addedName = 'Device ' + _parseCk(ck).idx;
      for (var di = 0; di < available.length; di++) {
        if (available[di].key === ck) {
          addedName = available[di].name;
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

      /* add a fresh row only when there are still options left */
      var remaining = available.filter(function (d) {
        return managedDevices.indexOf(d.key) < 0;
      });
      if (remaining.length > 0) {
        $('#de-add-rows .de-empty').remove();
        var $newRow = $(_addRowHtml(remaining));
        /* remove already-managed keys from the new select */
        managedDevices.forEach(function (mck) {
          $newRow.find('option[value="' + mck + '"]').remove();
        });
        $('#de-add-rows').append($newRow);
      } else if ($('#de-add-rows .de-add-row').length === 0) {
        $('#de-add-rows').html('<div class="de-empty">All Domoticz devices are already in Dashticz.</div>');
      }
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
      $list.find('.de-drag-over-top, .de-drag-over-bottom')
        .removeClass('de-drag-over-top de-drag-over-bottom');
    });

    $list.on('dragover', '.de-device-item', function (e) {
      e.preventDefault();
      e.originalEvent.dataTransfer.dropEffect = 'move';
      if (this === dragSrcEl) return;
      var rect  = this.getBoundingClientRect();
      var above = e.originalEvent.clientY < rect.top + rect.height / 2;
      $(this).toggleClass('de-drag-over-top', above)
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
      var rect  = this.getBoundingClientRect();
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
    $('#deviceeditorpopup').one('hidden.bs.modal', function () {
      $('#deviceeditorpopup').remove();
    });
  }

  /* ── save to CONFIG.js via PHP ──────────────────────────────── */
  function _save() {
    var $btn = $('#de-save-btn').prop('disabled', true).text('Saving\u2026');

    var orderedDeviceKeys = managedOrder
      .filter(function (orderKey) {
        return orderKey.indexOf('device:') === 0;
      })
      .map(function (orderKey) {
        return orderKey.slice(7);
      });
    var devicePayload = orderedDeviceKeys.map(function (ck) {
      var p   = _parseCk(ck);
      var entry = {
        idx:   p.idx,
        name:  deviceNames[ck] || ('Device ' + p.idx),
        width: _parseWidth(deviceWidths[ck]),
      };
      if (p.subidx) entry.subidx = p.subidx;
      if (deviceHeights[ck]) entry.height = deviceHeights[ck];
      return entry;
    });

    var orderedWidgetKeys = managedOrder.filter(function (orderKey) {
      return orderKey.indexOf('widget:') === 0;
    });
    var widgetPayload = orderedWidgetKeys.map(function (orderKey) {
      var widget = managedWidgets[orderKey];
      var entry = {
        id: widget.id,
        width: _parseWidth(widgetWidths[orderKey]),
      };
      if (widgetHeights[orderKey]) entry.height = widgetHeights[orderKey];
      if (widget.id === 'weather') {
        entry.provider =
          widget.definition.widget_provider ||
          (widget.definition.type === 'wunderground'
            ? 'wunderground'
            : 'openweather');
      } else if (widget.id === 'calendar') {
        entry.icalurl = widget.definition.icalurl || '';
      } else if (widget.id === 'clock') {
        entry.clockType = widget.definition.type || 'basicclock';
      }
      return entry;
    });

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        var token = data.token;
        return _postEditorData(
          'js/saveblocks.php',
          { devices: devicePayload },
          token
        ).then(function (deviceResult) {
          return _postEditorData(
            'js/savewidgets.php',
            { widgets: widgetPayload },
            token
          ).then(function (widgetResult) {
            var deviceRefs = {};
            var widgetRefs = {};
            orderedDeviceKeys.forEach(function (ck, index) {
              deviceRefs[_deviceOrderKey(ck)] = deviceResult.blockKeys[index];
            });
            orderedWidgetKeys.forEach(function (orderKey, index) {
              widgetRefs[orderKey] = widgetResult.blockKeys[index];
            });
            var layoutItems = managedOrder.map(function (orderKey) {
              return {
                ref:
                  orderKey.indexOf('widget:') === 0
                    ? widgetRefs[orderKey]
                    : deviceRefs[orderKey],
                width:
                  orderKey.indexOf('widget:') === 0
                    ? _parseWidth(widgetWidths[orderKey])
                    : _parseWidth(deviceWidths[orderKey.slice(7)]),
              };
            });
            return _postEditorData(
              'js/savelayout.php',
              { items: layoutItems },
              token
            );
          });
        });
      })
      .done(function () {
        $btn.removeClass('btn-primary').addClass('btn-success').text('Saved!');
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
        var msg = xhr.responseJSON && xhr.responseJSON.error
          ? xhr.responseJSON.error
          : 'Devices could not be saved automatically.';
        $btn.prop('disabled', false).text('Save');
        alert('Error: ' + msg);
      });
  }

  function _postEditorData(url, payload, token) {
    return $.ajax({
      url: url,
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
    if (!width) width = 2;
    return Math.max(1, Math.min(12, width));
  }

  function _getConfiguredWidthForCk(ck) {
    if (typeof columns !== 'undefined') {
      var colKeys = Object.keys(columns);
      for (var i = 0; i < colKeys.length; i++) {
        var col = columns[colKeys[i]];
        if (!col || !Array.isArray(col.blocks)) continue;
        for (var j = 0; j < col.blocks.length; j++) {
          var ref   = col.blocks[j];
          var block = null;
          var refCk = _toCompositeKey(ref);
          if (!refCk && typeof ref === 'string' &&
              typeof blocks !== 'undefined' && blocks[ref]) {
            block = blocks[ref];
            refCk = _toCompositeKey(block);
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
    return 2;
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
          if (!refCk && typeof ref === 'string' &&
              typeof blocks !== 'undefined' && blocks[ref]) {
            block = blocks[ref];
            refCk = _toCompositeKey(block);
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

  return { open: open };
}());

//# sourceURL=js/deviceeditor.js
