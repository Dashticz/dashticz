
/* global checkForceRefresh Dashticz*/
// eslint-disable-next-line no-unused-vars
function DT_frame(block) {
    return  {
        name: 'frame',
        containerClass: 'swiper-no-swiping imgblock',
        containerExtra: (block && block.height) ? 'style="height:' + block.height + 'px;"': '',
        getState: renderFrame,
        run: runFrame
    }
}

Dashticz.register(DT_frame);

function runFrame(me) {
    var refreshtime = 60000;
    if (typeof (me.block.refreshiframe) !== 'undefined') refreshtime = me.block.refreshiframe;
    setInterval(function () {
        reloadFrame(me);
    }, refreshtime);
}

function reloadFrame(me) {
    if (typeof (me.block.frameurl) !== 'undefined') {
        $(me.containerId).find('iframe').attr('src', checkForceRefresh(me.block, me.block.frameurl));
    }
}

function renderFrame(me) {
    const scrolling = me.block.scrollbars === false ? ' scrolling="no"' : '';
    let html = '';
    const height = me.block && me.block.height ? ';height:' + (me.block.height - 30) + 'px' : '';
    html += '<iframe src="' + me.block.frameurl + '"' + scrolling + ' style="border:0px' + height +';"></iframe>';
    return html
}
