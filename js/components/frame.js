
/* global checkForceRefresh Dashticz*/
// eslint-disable-next-line no-unused-vars
var DT_frame = {
    name: "frame",

    canHandle(block){
        return block && block.frameurl
    },

    default: {
            containerClass: () => 'swiper-no-swiping imgblock',
            containerExtra: (block) => (block && block.height) ? 'style="height:' + block.height + 'px;"': ''
    },
    get(me) {
        const scrolling = me.block.scrollbars === false ? ' scrolling="no"' : '';
        let html = '';
        const height = me.block && me.block.height ? ';height:' + (me.block.height - 30) + 'px' : '';
        html += '<iframe src="' + me.block.frameurl + '"' + scrolling + ' style="border:0px' + height +';"></iframe>';
        return html;
    },
    run(me) {
        var refreshtime = 60000;
        if (typeof (me.block.refreshiframe) !== 'undefined') refreshtime = me.block.refreshiframe;
        setInterval(function () {
            DT_frame.reloadFrame(me);
        }, refreshtime);
    },
    reloadFrame(me) {
        if (typeof (me.block.frameurl) !== 'undefined') {
            $(me.containerId).find('iframe').attr('src', checkForceRefresh(me.block, me.block.frameurl));
        }
    }
}

Dashticz.register(DT_frame);

