/* global checkForceRefresh Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_frame = {
    name: "frame",

    canHandle: function (block) {
        return block && block.frameurl
    },

    default: {
        containerClass: function () {
            return 'swiper-no-swiping imgblock'
        }
    },
    get: function (me) {
        var scrolling = me.block.scrollbars === false ? ' scrolling="no"' : '';
        var html = '';
        var height = me.block && me.block.height ? ';height:' + (me.block.height) + 'px' : '';
        html += '<iframe src="' + me.block.frameurl + '"' + scrolling + ' style="border:0px' + height + ';"></iframe>';
        return html;
    },
    run: function (me) {
        var refreshtime = 60000;
        if (typeof (me.block.refreshiframe) !== 'undefined') refreshtime = me.block.refreshiframe;
        setInterval(function () {
            DT_frame.reloadFrame(me);
        }, refreshtime);
    },
    reloadFrame: function (me) {
        if (typeof (me.block.frameurl) !== 'undefined') {
            $(me.containerId).find('iframe').attr('src', checkForceRefresh(me.block, me.block.frameurl));
        }
    }
}

Dashticz.register(DT_frame);