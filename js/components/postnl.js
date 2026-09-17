/* global Dashticz Domoticz language */
//# sourceURL=js/components/postnl.js
/* PostNL: shows the "Packages Incoming" and "Packages Sent" Text devices
 * created by the domoticz_postnl plugin
 * (https://github.com/MadPatrick/domoticz_postnl) combined in one block,
 * added via the Screen Editor's "Add items" -> PostNL quick-add popup
 * (js/deviceeditor.js's _showPostnlPopup()).
 *
 * Either device is optional (block.incomingIdx/block.sentIdx), and each is
 * shown as its own row only when it actually has something to report - the
 * plugin's own Text devices never truly go empty, they hold a fixed
 * "nothing to show" placeholder string instead (plugin.py's TRANSLATIONS,
 * en/nl only, independent of Dashticz's own UI language since it is set on
 * the plugin/hardware itself). Matching those known placeholders (see
 * EMPTY_TEXTS below) instead of just checking for an empty value blanks the
 * row entirely rather than showing filler text - by design, an idx that
 * isn't configured at all behaves exactly the same as one with nothing to
 * report.
 */
var DT_postnl = (function () {
  var EMPTY_TEXTS = [
    'Nothing on the way',
    'Geen pakketten onderweg',
    'No shipments sent',
    'Geen verzonden pakketten',
  ];

  return {
    name: 'postnl',
    defaultCfg: function () {
      return {
        width: 6,
        refresh: 3600,
        containerClass: 'postnl-block',
      };
    },
    run: function (me) {
      me.incomingIdx = parseInt(me.block.incomingIdx, 10) || null;
      me.sentIdx = parseInt(me.block.sentIdx, 10) || null;
      [me.incomingIdx, me.sentIdx].forEach(function (idx) {
        if (!idx) return;
        Dashticz.subscribeDevice(me, idx, false, function () {
          return refresh(me);
        });
      });
      refresh(me);
    },
    refresh: refresh,
  };

  function rowText(idx) {
    if (!idx) return '';
    var device = Domoticz.getAllDevices()[idx];
    var text = device ? String(device.Data || '').trim() : '';
    if (!text || EMPTY_TEXTS.indexOf(text) > -1) return '';
    return text;
  }

  function rowHtml(cssClass, label, text) {
    if (!text) return '';
    return (
      '<div class="postnl-row ' +
      cssClass +
      '">' +
      '<div class="postnl-row-label">' +
      label +
      '</div>' +
      '<div class="postnl-row-text">' +
      text +
      '</div>' +
      '</div>'
    );
  }

  function refresh(me) {
    doRefresh(me);
  }

  function doRefresh(me) {
    var misc = (typeof language !== 'undefined' && language.misc) || {};
    var html =
      rowHtml(
        'postnl-row-incoming',
        misc.postnl_incoming_label || 'Incoming',
        rowText(me.incomingIdx)
      ) +
      rowHtml(
        'postnl-row-sent',
        misc.postnl_sent_label || 'Sent',
        rowText(me.sentIdx)
      );
    // Written into .dt_state - the framework's own content slot (already
    // painted with the block's configured icon/.dt_title before run()/
    // refresh() ever runs) - same convention as e.g. Cluster/OWM/Weather,
    // so replacing it here never wipes that icon/title.
    me.$mountPoint
      .find('.dt_state')
      .html('<div class="postnl-rows">' + html + '</div>');
  }
})();

Dashticz.register(DT_postnl);
