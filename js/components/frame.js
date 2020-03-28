/* global checkForceRefresh Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_frame = {
    name: "frame",

    canHandle: function (block) {
        return block && block.frameurl
    },

    defaultCfg: function () {
        var ios = navigator.userAgent.match(/(iPod|iPhone|iPad)/) ? ' ios' : '';

        var cfg = {
            containerClass: 'swiper-no-swiping imgblock' + ios,
            refresh: 300 
        }
        return cfg;
    },
    defaultContent: function (me) {
        var scrolling = ((me.block.scrollbars === false) || navigator.userAgent.match(/(iPod|iPhone|iPad)/)) ? ' scrolling="no"' : '';
        var html = '';
        var height = me.block.height ? ';height:' + (me.block.height) + 'px' : '';
        html += '<iframe src="' + me.block.frameurl + '"' + scrolling + ' style="border:0px' + height + ';"></iframe>';
        return html;
    },
    refresh: function (me) {
        if (typeof (me.block.frameurl) !== 'undefined') {
            $(me.containerId).find('iframe').attr('src', checkForceRefresh(me.block, me.block.frameurl));
        }
    }
}

Dashticz.register(DT_frame);