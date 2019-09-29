
/* global checkForceRefresh*/
// eslint-disable-next-line no-unused-vars
function DT_frame(block) {
    return  {
        name: 'frame',
        containerClass: 'swiper-no-swiping imgblock',
        containerExtra: (block && block.height) ? 'style="height:' + block.height + 'px;"': '',
        getContent: renderFrame,
        run: runFrame
    }
}

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
    var scrolling = me.block.scrollbars === false ? ' scrolling="no"' : '';
    var html = '';
    html += '<iframe class="dt_content" src="' + me.block.frameurl + '"' + scrolling + ' style="border:0px;height:' + (me.block.height - 30) + 'px;"></iframe>';
    return html
}
