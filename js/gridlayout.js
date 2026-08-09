/* global $ Dashticz addBlock2Column blocks */
//# sourceURL=js/gridlayout.js

/**
 * Optional screen-level CSS Grid layout.
 *
 * Grid positions are validated before a block is mounted. The renderer keeps
 * the existing block/component pipeline intact and only replaces the outer
 * column container used by grid-enabled screens.
 */
var DashticzGridLayout = (function () {
  var defaults = {
    gridColumns: 24,
    rowHeight: 20,
    gap: 0,
    mobileLayout: 'stack',
  };

  function warn(message) {
    console.warn('Dashticz grid: ' + message);
  }

  function isPositiveInteger(value) {
    return Number.isInteger(Number(value)) && Number(value) > 0;
  }

  function getGridScreenConfig(screen) {
    var source = screen || {};
    var gridColumns = isPositiveInteger(source.gridColumns)
      ? Number(source.gridColumns)
      : defaults.gridColumns;
    var configuredRowHeight = isPositiveInteger(source.rowHeight)
      ? Number(source.rowHeight)
      : defaults.rowHeight;
    // Grid screens created before the 20px default stored the old 40px
    // default explicitly. Treat that value as the legacy format so existing
    // dashboards receive the finer grid without shrinking their blocks.
    var rowHeight =
      configuredRowHeight === 40 ? defaults.rowHeight : configuredRowHeight;
    var gap =
      Number.isFinite(Number(source.gap)) && Number(source.gap) >= 0
        ? Number(source.gap)
        : defaults.gap;

    if (
      typeof source.gridColumns !== 'undefined' &&
      !isPositiveInteger(source.gridColumns)
    ) {
      warn(
        'screen has invalid gridColumns "' +
          source.gridColumns +
          '"; using ' +
          defaults.gridColumns +
          '.'
      );
    }
    if (
      typeof source.rowHeight !== 'undefined' &&
      !isPositiveInteger(source.rowHeight)
    ) {
      warn(
        'screen has invalid rowHeight "' +
          source.rowHeight +
          '"; using ' +
          defaults.rowHeight +
          '.'
      );
    }
    if (
      typeof source.gap !== 'undefined' &&
      !(Number.isFinite(Number(source.gap)) && Number(source.gap) >= 0)
    ) {
      warn(
        'screen has invalid gap "' +
          source.gap +
          '"; using ' +
          defaults.gap +
          '.'
      );
    }

    return {
      gridColumns: gridColumns,
      rowHeight: rowHeight,
      gap: gap,
      mobileLayout:
        source.mobileLayout === 'stack' ? 'stack' : defaults.mobileLayout,
    };
  }

  function migrateLegacyGridPosition(grid, screen) {
    if (!grid || Number((screen || {}).rowHeight) !== 40) return grid;
    return {
      x: grid.x,
      y: (grid.y - 1) * 2 + 1,
      w: grid.w,
      h: grid.h * 2,
    };
  }

  function getBlockName(blockRef, index) {
    if (typeof blockRef === 'string' || typeof blockRef === 'number') {
      return String(blockRef);
    }
    if (blockRef && typeof blockRef === 'object') {
      return String(
        blockRef.key ||
          blockRef.title ||
          blockRef.type ||
          'block ' + (index + 1)
      );
    }
    return 'block ' + (index + 1);
  }

  function getBlockDefinition(blockRef) {
    if (blockRef && typeof blockRef === 'object') return blockRef;
    return (typeof blocks !== 'undefined' && blocks[blockRef]) || {};
  }

  function validateGridValue(blockName, property, value, fallback) {
    if (isPositiveInteger(value)) return Number(value);
    warn(
      'block "' +
        blockName +
        '" has invalid grid ' +
        property +
        ' "' +
        value +
        '"; using ' +
        fallback +
        '.'
    );
    return fallback;
  }

  function validateGridPosition(blockName, grid, screenConfig, index) {
    var columns = screenConfig.gridColumns;
    var fallback = {
      x: 1,
      y: index + 1,
      w: columns,
      h: 1,
    };
    var source = grid;

    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      warn(
        'block "' +
          blockName +
          '" has no valid grid configuration; using row ' +
          fallback.y +
          '.'
      );
      source = {};
    }

    var position = {
      x: validateGridValue(blockName, 'x', source.x, fallback.x),
      y: validateGridValue(blockName, 'y', source.y, fallback.y),
      w: validateGridValue(blockName, 'width', source.w, fallback.w),
      h: validateGridValue(blockName, 'height', source.h, fallback.h),
    };

    if (position.x > columns) {
      warn(
        'block "' +
          blockName +
          '" has invalid grid x ' +
          position.x +
          ' for a ' +
          columns +
          '-column grid; using 1.'
      );
      position.x = 1;
    }

    if (position.x + position.w - 1 > columns) {
      warn(
        'block "' +
          blockName +
          '" has invalid grid width ' +
          position.w +
          ' at x ' +
          position.x +
          ' for a ' +
          columns +
          '-column grid; using ' +
          (columns - position.x + 1) +
          '.'
      );
      position.w = columns - position.x + 1;
    }

    return position;
  }

  function applyGridPosition(element, grid) {
    element.classList.add('dt-grid-item');
    element.style.setProperty('--dt-grid-x', grid.x);
    element.style.setProperty('--dt-grid-y', grid.y);
    element.style.setProperty('--dt-grid-w', grid.w);
    element.style.setProperty('--dt-grid-h', grid.h);
  }

  function positionsOverlap(left, right) {
    return (
      left.x < right.x + right.w &&
      left.x + left.w > right.x &&
      left.y < right.y + right.h &&
      left.y + left.h > right.y
    );
  }

  function detectGridOverlaps(items) {
    var overlaps = [];
    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        if (!positionsOverlap(items[i].grid, items[j].grid)) continue;
        warn(
          'blocks "' + items[i].name + '" and "' + items[j].name + '" overlap.'
        );
        items[i].element.classList.add('dt-grid-overlap');
        items[j].element.classList.add('dt-grid-overlap');
        overlaps.push([items[i].name, items[j].name]);
      }
    }
    return overlaps;
  }

  function renderGridScreen(screen, screenSelector) {
    var config = getGridScreenConfig(screen);
    var $screen = $(screenSelector);
    var $topbar = $screen.children('.row').addClass('dt-grid-topbar');
    var $grid = $('<div class="dt-grid-layout"></div>');
    var rendered = [];

    $screen.addClass('dt-grid-screen');
    if (config.mobileLayout === 'stack') {
      $grid.addClass('dt-grid-mobile-stack');
    }
    $grid[0].style.setProperty('--dt-grid-columns', config.gridColumns);
    $grid[0].style.setProperty('--dt-grid-row-height', config.rowHeight + 'px');
    $grid[0].style.setProperty('--dt-grid-gap', config.gap + 'px');
    $topbar.after($grid);

    (Array.isArray(screen.blocks) ? screen.blocks : []).forEach(
      function (blockRef, index) {
        var name = getBlockName(blockRef, index);
        var definition = getBlockDefinition(blockRef);
        /* Per-screen grid: when blockRef is a thin {key, grid} wrapper emitted
         * by the config writer, prefer its own grid over the shared blocks[ref].grid
         * so that the same block can appear at different positions on different screens. */
        var screenGrid =
          blockRef &&
          typeof blockRef === 'object' &&
          blockRef.key != null &&
          blockRef.grid
            ? blockRef.grid
            : null;
        var grid = validateGridPosition(
          name,
          screenGrid || definition.grid,
          config,
          index
        );
        grid = migrateLegacyGridPosition(grid, screen);
        /* Unwrap thin {key, grid} wrappers: pass the key string for rendering so
         * that addBlock2Column resolves the full block definition from blocks[key]. */
        var renderRef =
          blockRef &&
          typeof blockRef === 'object' &&
          blockRef.key != null &&
          !blockRef.type &&
          !blockRef.idx &&
          !blockRef.blocks
            ? String(blockRef.key)
            : blockRef;
        var mountPoint = addBlock2Column(
          screenSelector + ' > .dt-grid-layout',
          'grid',
          renderRef,
          function (selector) {
            var element = document.querySelector(selector);
            if (!element) return;
            element.setAttribute('data-grid-block', name);
            applyGridPosition(element, grid);
            rendered.push({ name: name, grid: grid, element: element });
          }
        );
        if (!mountPoint) return;
      }
    );

    detectGridOverlaps(rendered);
    setTimeout(function () {
      Dashticz.onResize();
    }, 0);
  }

  return {
    defaults: defaults,
    getGridScreenConfig: getGridScreenConfig,
    getBlockName: getBlockName,
    getBlockDefinition: getBlockDefinition,
    migrateLegacyGridPosition: migrateLegacyGridPosition,
    validateGridPosition: validateGridPosition,
    applyGridPosition: applyGridPosition,
    detectGridOverlaps: detectGridOverlaps,
    renderGridScreen: renderGridScreen,
  };
})();
