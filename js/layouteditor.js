/* global Domoticz settings columns blocks myswiper */
// eslint-disable-next-line no-unused-vars
var DashticzLayoutEditor = (function () {
  'use strict';

  var HEIGHT_STEP = 10;
  var MIN_HEIGHT = 50;
  var MAX_HEIGHT = 2000;
  var active = false;
  var items = [];
  var itemById = {};
  var originalColumns = [];
  var $canvas = null;
  var $toolbar = null;
  var pointerState = null;
  var swiperTouchMove = null;

  function open() {
    if (active) return;

    var $screen = $('.screen.swiper-slide-active');
    if (!$screen.length) $screen = $('.screen:visible').first();

    var $managedColumns = $screen.find('[data-colindex]').filter(function () {
      return /^de_col\d+$/.test(String($(this).data('colindex')));
    });

    if (!$managedColumns.length) {
      alert(
        'No Device Editor blocks are available on this screen. Open screen 1 or add devices with the Device Editor first.'
      );
      return;
    }

    _collectItems($managedColumns);
    if (!items.length) {
      alert('No editable Device Editor blocks were found on this screen.');
      return;
    }

    active = true;
    $('body').addClass('dle-active');
    _prepareCanvas($managedColumns);
    _decorateItems();
    _buildToolbar();
    _attachHandlers();

    if (typeof myswiper !== 'undefined' && myswiper) {
      swiperTouchMove = myswiper.allowTouchMove;
      myswiper.allowTouchMove = false;
    }
  }

  function _collectItems($managedColumns) {
    items = [];
    itemById = {};
    originalColumns = [];

    $managedColumns.each(function () {
      var $column = $(this);
      var columnKey = String($column.data('colindex'));
      var refs =
        typeof columns !== 'undefined' &&
        columns[columnKey] &&
        Array.isArray(columns[columnKey].blocks)
          ? columns[columnKey].blocks
          : [];
      var wrappers = $column.children('div[id^="block_"]').toArray();

      originalColumns.push({
        element: this,
        display: this.style.display,
        wrappers: wrappers.slice(),
      });

      wrappers.forEach(function (wrapper, index) {
        if (typeof refs[index] === 'undefined') return;
        var resolved = _resolveBlock(refs[index]);
        if (!resolved) return;

        var visibleBlocks = $(wrapper)
          .children()
          .filter('.mh, .dt_block')
          .toArray();
        if (!visibleBlocks.length) return;

        var item = {
          id: 'dle-' + items.length,
          wrapper: wrapper,
          visibleBlocks: visibleBlocks,
          idx: resolved.idx,
          subidx: resolved.subidx,
          name: resolved.name,
          width: _configuredWidth(resolved.definition, visibleBlocks[0]),
          height: _configuredHeight(resolved.definition),
          originalBlocks: visibleBlocks.map(function (block) {
            return {
              block: block,
              widthClass: _widthClass(block),
              height: block.style.getPropertyValue('height'),
              heightPriority: block.style.getPropertyPriority('height'),
              fixedHeight: block.classList.contains('fixedheight'),
            };
          }),
        };

        items.push(item);
        itemById[item.id] = item;
      });
    });
  }

  function _resolveBlock(ref) {
    var definition = null;
    var key = '';

    if (
      typeof ref === 'string' &&
      typeof blocks !== 'undefined' &&
      blocks[ref]
    ) {
      definition = blocks[ref];
      key = ref;
    } else if (typeof ref === 'object' && ref !== null) {
      definition = ref;
    } else {
      definition = { idx: ref };
    }

    var rawIdx = typeof definition.idx !== 'undefined' ? definition.idx : ref;
    var match = String(rawIdx).match(/^(\d+)(?:_(\d+))?$/);
    if (!match || parseInt(match[1], 10) < 1) return null;

    var idx = parseInt(match[1], 10);
    var subidx = match[2] ? parseInt(match[2], 10) : 0;
    var name = definition.title || '';
    if (!name && typeof Domoticz !== 'undefined') {
      var allDevices = Domoticz.getAllDevices();
      var device = allDevices[String(idx)] || allDevices[idx];
      if (device) name = device.Name || '';
    }
    if (!name) name = key || 'Device ' + idx;
    if (subidx && name.indexOf('(' + subidx + ')') < 0) {
      name += ' (' + subidx + ')';
    }

    return {
      definition: definition,
      idx: idx,
      subidx: subidx,
      name: name,
    };
  }

  function _configuredWidth(definition, block) {
    var width = parseInt(definition.width, 10);
    if (!(width > 0)) {
      var widthClass = _widthClass(block);
      width = widthClass ? parseInt(widthClass.replace('col-xs-', ''), 10) : 2;
    }
    return Math.max(1, Math.min(12, width));
  }

  function _configuredHeight(definition) {
    if (
      typeof definition.height === 'undefined' ||
      definition.height === null ||
      definition.height === ''
    ) {
      return null;
    }
    return _snapHeight(definition.height);
  }

  function _widthClass(block) {
    var match = String(block.className).match(/(?:^|\s)(col-xs-\d+)(?:\s|$)/);
    return match ? match[1] : '';
  }

  function _prepareCanvas($managedColumns) {
    $canvas = $managedColumns.first().addClass('dle-canvas');

    items.forEach(function (item) {
      $canvas.append(item.wrapper);
    });

    $managedColumns.each(function (index) {
      if (index > 0) this.style.display = 'none';
    });
  }

  function _decorateItems() {
    items.forEach(function (item) {
      if (item.height !== null) _applyHeight(item, item.height);

      item.visibleBlocks.forEach(function (block, index) {
        var $block = $(block).addClass('dle-block');
        var resizeHandle =
          index === item.visibleBlocks.length - 1
            ? '<span class="dle-resize-handle" title="Resize width and height" aria-hidden="true"></span>'
            : '';
        var overlay =
          '<div class="dle-overlay" data-dle-id="' +
          item.id +
          '">' +
          '<span class="dle-drag-icon" aria-hidden="true"><i class="fas fa-arrows-alt"></i></span>' +
          '<span class="dle-size-label"></span>' +
          resizeHandle +
          '</div>';
        $block.append(overlay);
      });

      _updateSizeLabel(item);
    });
  }

  function _buildToolbar() {
    $toolbar = $(
      '<div class="dle-toolbar" role="toolbar" aria-label="Visual layout editor">' +
        '<span class="dle-toolbar-title"><i class="fas fa-arrows-alt" aria-hidden="true"></i> Layout Editor</span>' +
        '<span class="dle-toolbar-help">Drag blocks. Resize from the bottom-right corner. Height snaps to 10 px.</span>' +
        '<button type="button" class="btn btn-secondary btn-sm dle-cancel">Cancel</button>' +
        '<button type="button" class="btn btn-primary btn-sm dle-save">Save</button>' +
        '</div>'
    );
    $('body').append($toolbar);
  }

  function _attachHandlers() {
    $('.dle-overlay')
      .off('.layouteditor')
      .on('click.layouteditor', function (event) {
        event.preventDefault();
        event.stopPropagation();
      })
      .on('pointerdown.layouteditor', function (event) {
        event.preventDefault();
        event.stopPropagation();
        var item = itemById[String($(this).data('dle-id'))];
        if (!item) return;
        if ($(event.target).closest('.dle-resize-handle').length) {
          _startResize(event, item, this);
        } else {
          _startDrag(event, item, this);
        }
      });

    $(document)
      .off('.layouteditor')
      .on('pointermove.layouteditor', _pointerMove)
      .on('pointerup.layouteditor pointercancel.layouteditor', _pointerEnd)
      .on('keydown.layouteditor', function (event) {
        if (event.key === 'Escape') _cancel();
      });

    $toolbar
      .on('click.layouteditor', '.dle-cancel', _cancel)
      .on('click.layouteditor', '.dle-save', _save);
  }

  function _startDrag(event, item, captureElement) {
    pointerState = {
      mode: 'drag',
      pointerId: event.originalEvent.pointerId,
      item: item,
      target: null,
      before: false,
      captureElement: captureElement,
    };

    if (captureElement.setPointerCapture) {
      captureElement.setPointerCapture(pointerState.pointerId);
    }

    item.visibleBlocks.forEach(function (block) {
      block.classList.add('dle-dragging');
    });

    $('body').append(
      '<div class="dle-drag-ghost">' + _escapeHtml(item.name) + '</div>'
    );
    _positionGhost(event.originalEvent.clientX, event.originalEvent.clientY);
  }

  function _startResize(event, item, captureElement) {
    var rect = item.visibleBlocks[0].getBoundingClientRect();
    pointerState = {
      mode: 'resize',
      pointerId: event.originalEvent.pointerId,
      item: item,
      startX: event.originalEvent.clientX,
      startY: event.originalEvent.clientY,
      startWidth: item.width,
      startHeight: item.height !== null ? item.height : rect.height,
      captureElement: captureElement,
    };

    if (captureElement.setPointerCapture) {
      captureElement.setPointerCapture(pointerState.pointerId);
    }
  }

  function _pointerMove(event) {
    if (
      !pointerState ||
      event.originalEvent.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    event.preventDefault();
    var clientX = event.originalEvent.clientX;
    var clientY = event.originalEvent.clientY;

    if (pointerState.mode === 'resize') {
      var unitWidth = Math.max(1, $canvas.innerWidth() / 12);
      var deltaWidth = Math.round((clientX - pointerState.startX) / unitWidth);
      var width = Math.max(
        1,
        Math.min(12, pointerState.startWidth + deltaWidth)
      );
      var height = _snapHeight(
        pointerState.startHeight + clientY - pointerState.startY
      );

      _applyWidth(pointerState.item, width);
      _applyHeight(pointerState.item, height);
      _updateSizeLabel(pointerState.item);
      return;
    }

    _positionGhost(clientX, clientY);
    _clearDropTarget();

    var element = document.elementFromPoint(clientX, clientY);
    var overlay = element ? $(element).closest('.dle-overlay')[0] : null;
    if (!overlay) {
      pointerState.target = null;
      return;
    }

    var target = itemById[String($(overlay).data('dle-id'))];
    if (!target || target === pointerState.item) {
      pointerState.target = null;
      return;
    }

    var rect = overlay.getBoundingClientRect();
    var sameRow =
      Math.abs(
        rect.top +
          rect.height / 2 -
          (pointerState.item.visibleBlocks[0].getBoundingClientRect().top +
            pointerState.item.visibleBlocks[0].getBoundingClientRect().height /
              2)
      ) <
      Math.min(rect.height, pointerState.item.visibleBlocks[0].offsetHeight) /
        2;
    var before = sameRow
      ? clientX < rect.left + rect.width / 2
      : clientY < rect.top + rect.height / 2;

    pointerState.target = target;
    pointerState.before = before;
    target.visibleBlocks[0].classList.add(
      before ? 'dle-drop-before' : 'dle-drop-after'
    );
  }

  function _pointerEnd(event) {
    if (
      !pointerState ||
      event.originalEvent.pointerId !== pointerState.pointerId
    ) {
      return;
    }

    if (
      event.type !== 'pointercancel' &&
      pointerState.mode === 'drag' &&
      pointerState.target
    ) {
      var itemWrapper = pointerState.item.wrapper;
      var targetWrapper = pointerState.target.wrapper;
      if (pointerState.before) {
        targetWrapper.parentNode.insertBefore(itemWrapper, targetWrapper);
      } else {
        targetWrapper.parentNode.insertBefore(
          itemWrapper,
          targetWrapper.nextSibling
        );
      }
    }

    _finishPointerAction();
  }

  function _finishPointerAction() {
    if (!pointerState) return;
    if (
      pointerState.captureElement &&
      pointerState.captureElement.releasePointerCapture
    ) {
      try {
        pointerState.captureElement.releasePointerCapture(
          pointerState.pointerId
        );
      } catch (error) {
        // The browser already released capture.
      }
    }

    pointerState.item.visibleBlocks.forEach(function (block) {
      block.classList.remove('dle-dragging');
    });
    $('.dle-drag-ghost').remove();
    _clearDropTarget();
    pointerState = null;
  }

  function _clearDropTarget() {
    $('.dle-drop-before, .dle-drop-after').removeClass(
      'dle-drop-before dle-drop-after'
    );
  }

  function _positionGhost(x, y) {
    $('.dle-drag-ghost').css({
      left: x + 14,
      top: y + 14,
    });
  }

  function _applyWidth(item, width) {
    item.width = Math.max(1, Math.min(12, parseInt(width, 10) || 1));
    item.visibleBlocks.forEach(function (block) {
      Array.prototype.slice.call(block.classList).forEach(function (className) {
        if (/^col-xs-\d+$/.test(className)) block.classList.remove(className);
      });
      block.classList.add('col-xs-' + item.width);
    });
  }

  function _applyHeight(item, height) {
    item.height = _snapHeight(height);
    item.visibleBlocks.forEach(function (block) {
      block.classList.add('fixedheight');
      block.style.setProperty('height', item.height + 'px', 'important');
    });
  }

  function _snapHeight(height) {
    var parsed = parseFloat(height);
    if (!isFinite(parsed)) parsed = MIN_HEIGHT;
    return Math.max(
      MIN_HEIGHT,
      Math.min(MAX_HEIGHT, Math.round(parsed / HEIGHT_STEP) * HEIGHT_STEP)
    );
  }

  function _updateSizeLabel(item) {
    var measuredHeight = Math.round(
      item.visibleBlocks[0].getBoundingClientRect().height
    );
    var heightLabel =
      item.height === null
        ? 'auto (' + measuredHeight + 'px)'
        : item.height + 'px';
    item.visibleBlocks.forEach(function (block) {
      $(block)
        .children('.dle-overlay')
        .find('.dle-size-label')
        .text(item.width + '/12 × ' + heightLabel);
    });
  }

  function _orderedItems() {
    var byWrapper = {};
    items.forEach(function (item) {
      byWrapper[item.wrapper.id] = item;
    });

    return $canvas
      .children('div[id^="block_"]')
      .toArray()
      .map(function (wrapper) {
        return byWrapper[wrapper.id];
      })
      .filter(function (item) {
        return !!item;
      });
  }

  function _save() {
    var $save = $toolbar.find('.dle-save').prop('disabled', true);
    $toolbar.find('.dle-cancel').prop('disabled', true);
    $toolbar.find('.dle-toolbar-help').text('Saving layout…');

    var payload = _orderedItems().map(function (item) {
      var entry = {
        idx: item.idx,
        name: item.name,
        width: item.width,
      };
      if (item.subidx) entry.subidx = item.subidx;
      if (item.height !== null) entry.height = item.height;
      return entry;
    });

    $.getJSON(settings['dashticz_php_path'] + 'info.php?get=csrf')
      .then(function (data) {
        return $.ajax({
          url: 'js/saveblocks.php',
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ devices: payload }),
          dataType: 'json',
          headers: { 'X-Dashticz-CSRF': data.token },
        });
      })
      .done(function () {
        $toolbar.find('.dle-toolbar-help').text('Saved. Reloading dashboard…');
        $save.removeClass('btn-primary').addClass('btn-success').text('Saved');
        setTimeout(function () {
          window.location.reload();
        }, 700);
      })
      .fail(function (xhr) {
        var message =
          xhr.responseJSON && xhr.responseJSON.error
            ? xhr.responseJSON.error
            : 'The layout could not be saved.';
        $toolbar.find('.dle-toolbar-help').text(message);
        $save.prop('disabled', false);
        $toolbar.find('.dle-cancel').prop('disabled', false);
      });
  }

  function _cancel() {
    if (!active) return;
    _finishPointerAction();

    $(document).off('.layouteditor');
    $('.dle-overlay').off('.layouteditor').remove();

    items.forEach(function (item) {
      item.originalBlocks.forEach(function (original) {
        var block = original.block;
        block.classList.remove(
          'dle-block',
          'dle-dragging',
          'dle-drop-before',
          'dle-drop-after'
        );
        Array.prototype.slice
          .call(block.classList)
          .forEach(function (className) {
            if (/^col-xs-\d+$/.test(className))
              block.classList.remove(className);
          });
        if (original.widthClass) block.classList.add(original.widthClass);

        if (original.height) {
          block.style.setProperty(
            'height',
            original.height,
            original.heightPriority
          );
        } else {
          block.style.removeProperty('height');
        }
        if (!original.fixedHeight) block.classList.remove('fixedheight');
      });
    });

    originalColumns.forEach(function (column) {
      column.wrappers.forEach(function (wrapper) {
        column.element.appendChild(wrapper);
      });
      column.element.style.display = column.display;
    });

    if ($canvas) $canvas.removeClass('dle-canvas');
    if ($toolbar) $toolbar.remove();
    $('.dle-drag-ghost').remove();
    $('body').removeClass('dle-active');

    if (
      typeof myswiper !== 'undefined' &&
      myswiper &&
      swiperTouchMove !== null
    ) {
      myswiper.allowTouchMove = swiperTouchMove;
    }

    active = false;
    items = [];
    itemById = {};
    originalColumns = [];
    $canvas = null;
    $toolbar = null;
    pointerState = null;
    swiperTouchMove = null;
  }

  function _escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  return {
    open: open,
  };
})();

//# sourceURL=js/layouteditor.js
