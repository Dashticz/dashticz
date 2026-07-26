import ChartJS from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(zoomPlugin);

function migrateScale(scale) {
  if (!scale) return scale;
  if (scale.scaleLabel) {
    scale.title = {
      display: scale.scaleLabel.display,
      text: scale.scaleLabel.labelString,
      color: scale.scaleLabel.fontColor,
    };
    delete scale.scaleLabel;
  }
  if (scale.gridLines) {
    scale.grid = scale.gridLines;
    delete scale.gridLines;
  }
  if (scale.ticks) {
    if (scale.ticks.fontColor) scale.ticks.color = scale.ticks.fontColor;
    if (scale.ticks.fontSize) scale.ticks.font = { size: scale.ticks.fontSize };
    ['min', 'max', 'suggestedMin', 'suggestedMax'].forEach(function (key) {
      if (scale.ticks[key] !== undefined) {
        scale[key] = scale.ticks[key];
        if (
          scale[key] &&
          typeof scale[key] !== 'string' &&
          typeof scale[key] !== 'number' &&
          !(scale[key] instanceof Date)
        ) {
          scale[key] = scale[key].valueOf();
        }
        delete scale.ticks[key];
      }
    });
  }
  return scale;
}

function migrateAxes(scales) {
  if (!scales) return scales;
  var migrated = {};
  ['x', 'y'].forEach(function (axis) {
    var legacyKey = axis + 'Axes';
    (scales[legacyKey] || []).forEach(function (scale, index) {
      var id = scale.id || (index === 0 ? axis : axis + index);
      scale.axis = axis;
      migrated[id] = migrateScale(scale);
    });
  });
  Object.keys(scales).forEach(function (key) {
    if (key !== 'xAxes' && key !== 'yAxes') migrated[key] = migrateScale(scales[key]);
  });
  return migrated;
}

function migrateTooltipCallbacks(callbacks) {
  if (!callbacks) return callbacks;
  var migrated = {};
  Object.keys(callbacks).forEach(function (key) {
    var callback = callbacks[key];
    migrated[key] = function (context) {
      if (key === 'title') return callback(context.map(toLegacyTooltipItem), context[0] && context[0].chart.data);
      return callback(toLegacyTooltipItem(context), context.chart.data);
    };
  });
  return migrated;
}

function migrateFontOptions(options) {
  if (!options) return options;
  if (options.fontColor) options.color = options.fontColor;
  if (options.fontSize || options.fontStyle || options.fontFamily) {
    options.font = {
      size: options.fontSize,
      style: options.fontStyle,
      family: options.fontFamily,
    };
  }
  return options;
}

function migrateDataset(dataset) {
  if (dataset.lineTension !== undefined) dataset.tension = dataset.lineTension;
  if (dataset.steppedLine !== undefined) dataset.stepped = dataset.steppedLine;
  return dataset;
}

function toLegacyTooltipItem(context) {
  return {
    datasetIndex: context.datasetIndex,
    index: context.dataIndex,
    xLabel: context.label,
    yLabel: context.parsed && context.parsed.y,
    label: context.label,
    value: context.formattedValue,
  };
}

export function migrateChartConfig(config) {
  var options = config.options || (config.options = {});
  options.plugins = options.plugins || {};
  if (options.legend) {
    options.plugins.legend = options.legend;
    if (options.plugins.legend.labels) migrateFontOptions(options.plugins.legend.labels);
    delete options.legend;
  }
  if (options.tooltips) {
    options.plugins.tooltip = options.tooltips;
    options.plugins.tooltip.callbacks = migrateTooltipCallbacks(options.plugins.tooltip.callbacks);
    if (options.plugins.tooltip.custom) {
      var custom = options.plugins.tooltip.custom;
      options.plugins.tooltip.external = function (context) {
        var tooltip = context.tooltip;
        var bodyFont = context.chart.options.plugins.tooltip.bodyFont || {};
        tooltip._bodyFontFamily = bodyFont.family;
        tooltip._bodyFontStyle = bodyFont.style;
        tooltip.bodyFontSize = bodyFont.size;
        (tooltip.dataPoints || []).forEach(function (dataPoint) {
          dataPoint.index = dataPoint.dataIndex;
        });
        custom.call({ _chart: context.chart }, tooltip);
      };
      delete options.plugins.tooltip.custom;
    }
    delete options.tooltips;
  }
  if (options.title) {
    options.plugins.title = options.title;
    delete options.title;
  }
  options.scales = migrateAxes(options.scales);
  var zoom = options.plugins.zoom && options.plugins.zoom.zoom;
  if (zoom && zoom.enabled !== undefined) {
    zoom.wheel = zoom.wheel || { enabled: zoom.enabled };
    if (zoom.drag) zoom.drag.enabled = zoom.enabled;
    delete zoom.enabled;
    delete zoom.speed;
  }
  ((config.data && config.data.datasets) || []).forEach(migrateDataset);
  return config;
}

function ChartCompat(context, config) {
  return new ChartJS(context, migrateChartConfig(config));
}

ChartCompat.prototype = ChartJS.prototype;
Object.setPrototypeOf(ChartCompat, ChartJS);
ChartCompat.ChartJS = ChartJS;

export default ChartCompat;
