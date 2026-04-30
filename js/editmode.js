/**
 * Dashticz Edit Mode — Drag & Drop Layout Editor
 * Bestand: js/editmode.js
 *
 * Voegt een "Edit Mode" knop toe aan de topbar waarmee blokken
 * versleept en vergroot/verkleind kunnen worden, vergelijkbaar
 * met Home Assistant Lovelace.
 *
 * Gebruik:
 *   In CONFIG.js: config['editmode'] = 1;
 *
 * Opgeslagen layout wordt bewaard in localStorage als
 * 'dashticz_layout' (JSON).
 */

var DashticzEditMode = (function () {
  'use strict';

  /* ── state ────────────────────────────────────────────────── */
  var active      = false;
  var dragSrc     = null;
  var savedLayout = {};

  /* ── public init ──────────────────────────────────────────── */
  function init() {
    _injectButton();
    _loadLayout();

    // Herlaad layout na elke Dashticz refresh
    $(document).on('dashticz_refresh', function () {
      if (!active) _applyLayout();
    });
  }

  /* ── toolbar knop ─────────────────────────────────────────── */
  function _injectButton() {
    var $btn = $(
      '<button id="dz-editmode-btn" class="dz-editmode-btn" title="Edit mode">' +
      '<i class="fas fa-pencil-alt"></i> Edit' +
      '</button>'
    );
    $btn.on('click', _toggle);

    // Voeg toe aan de bestaande topbar of maak een fallback
    var $bar = $('.topbar, #topbar, .navbar, .header').first();
    if ($bar.length) {
      $bar.append($btn);
    } else {
      var $fallback = $('<div id="dz-editmode-bar"></div>').append($btn);
      $('body').prepend($fallback);
    }
  }

  /* ── toggle edit mode ─────────────────────────────────────── */
  function _toggle() {
    active = !active;
    if (active) {
      _enableEditMode();
    } else {
      _disableEditMode();
    }
  }

  function _enableEditMode() {
    active = true;
    $('#dz-editmode-btn')
      .addClass('active')
      .html('<i class="fas fa-times"></i> Sluiten');

    _getBlocks().each(function () {
      _makeBlockEditable($(this));
    });

    _showToolbar();
    _showStatusBar('Edit mode actief — sleep blokken om te herordenen, pak de hoek om te resizen.');
  }

  function _disableEditMode() {
    active = false;
    $('#dz-editmode-btn')
      .removeClass('active')
      .html('<i class="fas fa-pencil-alt"></i> Edit');

    _getBlocks().each(function () {
      _makeBlockNormal($(this));
    });

    _hideToolbar();
    _clearStatusBar();
    _saveLayout();
  }

  /* ── blok: edit ───────────────────────────────────────────── */
  function _makeBlockEditable($block) {
    $block
      .addClass('dz-editable')
      .attr('draggable', 'true')
      .off('.editmode')
      .on('dragstart.editmode', _onDragStart)
      .on('dragend.editmode',   _onDragEnd)
      .on('dragover.editmode',  _onDragOver)
      .on('dragleave.editmode', _onDragLeave)
      .on('drop.editmode',      _onDrop);

    // Resize handle
    if (!$block.find('.dz-resize-handle').length) {
      var $handle = $('<div class="dz-resize-handle" title="Sleep om te resizen"><i class="fas fa-expand-alt"></i></div>');
      $handle.on('mousedown', function (e) { _startResize(e, $block); });
      $block.append($handle);
    }

    // Verwijder-knop
    if (!$block.find('.dz-block-delete').length) {
      var $del = $('<div class="dz-block-delete" title="Verwijder blok"><i class="fas fa-times"></i></div>');
      $del.on('click', function (e) {
        e.stopPropagation();
        if (confirm('Blok verwijderen?')) {
          $block.remove();
          _saveLayout();
        }
      });
      $block.append($del);
    }

    $block.find('.dz-resize-handle, .dz-block-delete').show();
  }

  function _makeBlockNormal($block) {
    $block
      .removeClass('dz-editable dz-drag-over')
      .attr('draggable', 'false')
      .off('.editmode');
    $block.find('.dz-resize-handle, .dz-block-delete').hide();
  }

  /* ── drag & drop ──────────────────────────────────────────── */
  function _onDragStart(e) {
    dragSrc = this;
    $(this).addClass('dz-dragging');
    e.originalEvent.dataTransfer.effectAllowed = 'move';
    e.originalEvent.dataTransfer.setData('text/plain', '');
  }

  function _onDragEnd() {
    $(this).removeClass('dz-dragging');
    _getBlocks().removeClass('dz-drag-over');
  }

  function _onDragOver(e) {
    e.preventDefault();
    if (this === dragSrc) return;
    _getBlocks().removeClass('dz-drag-over');
    $(this).addClass('dz-drag-over');
    e.originalEvent.dataTransfer.dropEffect = 'move';
  }

  function _onDragLeave() {
    $(this).removeClass('dz-drag-over');
  }

  function _onDrop(e) {
    e.stopPropagation();
    $(this).removeClass('dz-drag-over');
    if (!dragSrc || dragSrc === this) return;

    var $src  = $(dragSrc);
    var $dest = $(this);
    var $container = $src.parent();

    // Bepaal positie en verwissel
    var srcIdx  = $container.children().index($src);
    var destIdx = $container.children().index($dest);

    if (srcIdx < destIdx) {
      $dest.after($src);
    } else {
      $dest.before($src);
    }

    dragSrc = null;
    _saveLayout();
  }

  /* ── resize (sleep hoek-handle) ───────────────────────────── */
  function _startResize(e, $block) {
    e.preventDefault();
    e.stopPropagation();

    var startX   = e.clientX;
    var $col     = $block.closest('[class*="col-"]');
    var colMatch = ($col.attr('class') || '').match(/col(?:-[a-z]+)?-(\d+)/);
    var startCols = colMatch ? parseInt(colMatch[1]) : 4;
    var gridW    = $block.closest('.row, .container, #maincontainer').width() || $(window).width();
    var colWidth = gridW / 12;

    $(document).on('mousemove.dzresize', function (ev) {
      var dx      = ev.clientX - startX;
      var newCols = Math.max(1, Math.min(12, Math.round(startCols + dx / colWidth)));
      // Vervang Bootstrap kolom klasse
      $col.attr('class', function (i, c) {
        return (c || '').replace(/col(?:-[a-z]+)?-\d+/g, '').trim() + ' col-sm-' + newCols;
      });
      $block.attr('data-width', newCols);
    });

    $(document).on('mouseup.dzresize', function () {
      $(document).off('mousemove.dzresize mouseup.dzresize');
      _saveLayout();
    });
  }

  /* ── toolbar (blok toevoegen) ─────────────────────────────── */
  function _showToolbar() {
    if ($('#dz-edit-toolbar').length) {
      $('#dz-edit-toolbar').show();
      return;
    }
    var $tb = $(
      '<div id="dz-edit-toolbar">' +
      '<span class="dz-tb-label">Voeg blok toe:</span>' +
      '<button class="dz-tb-btn" data-type="clock"><i class="fas fa-clock"></i> Klok</button>' +
      '<button class="dz-tb-btn" data-type="weather"><i class="fas fa-cloud-sun"></i> Weer</button>' +
      '<button class="dz-tb-btn" data-type="text"><i class="fas fa-font"></i> Tekst</button>' +
      '<button class="dz-tb-btn" data-type="iframe"><i class="fas fa-globe"></i> iFrame</button>' +
      '<button class="dz-tb-btn dz-tb-save" id="dz-save-btn"><i class="fas fa-save"></i> Opslaan</button>' +
      '</div>'
    );
    $tb.find('.dz-tb-btn[data-type]').on('click', function () {
      _addNewBlock($(this).data('type'));
    });
    $tb.find('#dz-save-btn').on('click', function () {
      _disableEditMode();
      _showToast('Layout opgeslagen ✓');
    });
    $('body').prepend($tb);
  }

  function _hideToolbar() {
    $('#dz-edit-toolbar').hide();
  }

  /* ── nieuw blok toevoegen ─────────────────────────────────── */
  function _addNewBlock(type) {
    var templates = {
      clock:   '<div class="block dz-block-new" data-blocktype="clock" data-width="3"><div class="block-content"><i class="fas fa-clock"></i> <span class="dz-clock-time">--:--</span></div></div>',
      weather: '<div class="block dz-block-new" data-blocktype="weather" data-width="4"><div class="block-content"><i class="fas fa-cloud-sun"></i> Weer blok</div></div>',
      text:    '<div class="block dz-block-new" data-blocktype="text" data-width="4"><div class="block-content" contenteditable="false">Klik om te bewerken</div></div>',
      iframe:  '<div class="block dz-block-new" data-blocktype="iframe" data-width="6"><div class="block-content"><iframe src="about:blank" style="width:100%;height:150px;border:none;"></iframe></div></div>'
    };
    var html = templates[type];
    if (!html) return;

    var $newBlock = $(
      '<div class="col-sm-' + (type === 'iframe' ? 6 : type === 'clock' ? 3 : 4) + '">' +
      html +
      '</div>'
    );

    var $container = $('.row.blocks, .blockscontainer, #maincontainer .row').first();
    if (!$container.length) $container = $('body');
    $container.append($newBlock);

    _makeBlockEditable($newBlock.find('.block'));
    _saveLayout();
    _showToast('Blok toegevoegd');
  }

  /* ── layout opslaan / laden ───────────────────────────────── */
  function _saveLayout() {
    var layout = [];
    _getBlocks().each(function () {
      var $b   = $(this);
      var $col = $b.closest('[class*="col-"]');
      var colMatch = ($col.attr('class') || '').match(/col(?:-[a-z]+)?-(\d+)/);
      layout.push({
        id:    $b.attr('id') || $b.data('idx') || $b.index(),
        cols:  colMatch ? parseInt(colMatch[1]) : 4,
        order: $b.closest('[class*="col-"]').index()
      });
    });
    savedLayout = layout;
    try {
      localStorage.setItem('dashticz_layout', JSON.stringify(layout));
    } catch (e) { /* private browsing */ }
  }

  function _loadLayout() {
    try {
      var stored = localStorage.getItem('dashticz_layout');
      if (stored) {
        savedLayout = JSON.parse(stored);
        _applyLayout();
      }
    } catch (e) { /* ignore */ }
  }

  function _applyLayout() {
    if (!savedLayout || !savedLayout.length) return;
    savedLayout.forEach(function (item) {
      var $b = $('#' + item.id + ', [data-idx="' + item.id + '"]').first();
      if (!$b.length) return;
      var $col = $b.closest('[class*="col-"]');
      $col.attr('class', function (i, c) {
        return (c || '').replace(/col(?:-[a-z]+)?-\d+/g, '').trim() + ' col-sm-' + item.cols;
      });
    });
  }

  /* ── helpers ──────────────────────────────────────────────── */
  function _getBlocks() {
    return $('.block, .domoticz-block, [data-idx]').filter(':visible');
  }

  function _showStatusBar(msg) {
    var $sb = $('#dz-statusbar');
    if (!$sb.length) {
      $sb = $('<div id="dz-statusbar"></div>');
      $('body').append($sb);
    }
    $sb.text(msg).show();
  }

  function _clearStatusBar() {
    $('#dz-statusbar').hide();
  }

  function _showToast(msg) {
    var $t = $('<div class="dz-toast">' + msg + '</div>');
    $('body').append($t);
    setTimeout(function () { $t.addClass('dz-toast-show'); }, 10);
    setTimeout(function () { $t.removeClass('dz-toast-show'); }, 2200);
    setTimeout(function () { $t.remove(); }, 2600);
  }

  /* ── public API ───────────────────────────────────────────── */
  return { init: init };

}());

/* Auto-init wanneer DOM klaar is */
$(document).ready(function () {
  // Alleen activeren als config['editmode'] = 1 gezet is
  if (typeof config !== 'undefined' && config['editmode']) {
    DashticzEditMode.init();
  }
});
