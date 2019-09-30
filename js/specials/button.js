/* global getRandomInt createModalDialog getLog checkForceRefresh toSlide MoonPhase Dashticz*/

// eslint-disable-next-line no-unused-vars
function DT_button(block) {
    function buttonLoadFrame(button) //Displays the frame of a button after pressing is
    {
        var random = getRandomInt(1, 100000);
        $('body').append(createModalDialog('openpopup', 'button_' + random, button));
        if (button.log == true) {
            if (typeof (getLog) !== 'function') $.ajax({
                url: 'js/log.js',
                async: false,
                dataType: 'script'
            });
            $('#button_' + random + ' .modal-body').html('');
            getLog($('#button_' + random + ' .modal-body'), button.level, true);
        }
        $('#button_' + random).on('hidden.bs.modal', function () {
            $(this).data('bs.modal', null);
            $(this).remove();
        });

        $('#button_' + random).modal('show');

        if (!button.log && typeof (button.refreshiframe) !== 'undefined' && button.refreshiframe > 0) {
            setTimeout(function () {
                refreshButtonFrame(button, random);
            }, button.refreshiframe);
        }
    }

    function refreshButtonFrame(button, buttonid) {
        var mydiv = $('#button_' + buttonid).find('iframe');
        if (mydiv.length > 0) {
            mydiv.attr('src', checkForceRefresh(button, button.url));
            setTimeout(function () {
                refreshButtonFrame(button, buttonid);
            }, button.refreshiframe);
        }
    }

    function buttonOnClick(m_event)
    //button clickhandler. Assumption: button is clickable
    {
        var button = m_event.data;
        if (typeof (button.newwindow) !== 'undefined') {
            window.open(button.url);
        } else if (typeof (button.slide) !== 'undefined') {
            toSlide(button.slide - 1);
        } else {
            buttonLoadFrame(button);
        }
    }

    function buttonIsClickable(button) {
        var clickable = typeof (button.url) !== 'undefined' || button.log == true || typeof (button.slide) !== 'undefined';
        return clickable;
    }


    function getStateButton(me) {
        const button = me.block
        let html = '';
        if (button.btnimage) {
            var img = button.btnimage;
            if (img == 'moon') {
                img = getMoonInfo(button);
            }
            if (typeof (button.forceheight) !== 'undefined') {
                html += '<img src="' + img + '" style="max-width:100%;" width=100% height="' + button.forceheight + '" />';
            } else {
                html += '<img src="' + img + '" style="max-width:100%;" />';
            }
        }
        return html
    }

    function runButton(me) {
        const button = me.block;
        let html = '';
        if (buttonIsClickable(button))
            $(me.mountPoint).click(button, buttonOnClick);

        if (button.btnimage) {
            var refreshtime = 60000;
            if (typeof (button.refresh) !== 'undefined') refreshtime = button.refresh;
            if (typeof (button.refreshimage) !== 'undefined') refreshtime = button.refreshimage;
            setInterval(function () {
                reloadImage(me);
            }, refreshtime);
        } else {
            if (typeof (button.title) !== 'undefined') {
                html += '<div class="col-xs-4 col-icon">';
            } else {
                html += '<div class="col-xs-12 col-icon">';
            }

            if (typeof (button.image) !== 'undefined') html += '<img class="buttonimg" src="' + button.image + '" />';
            else html += '<em class="' + button.icon + ' fa-small"></em>';
            html += '</div>';
        }
        html += '</div>';
        return html;
    }

    function reloadImage(me) {
        let src;
        if (typeof (me.block.btnimage) !== 'undefined') {
            if (me.block.btnimage === 'moon')
                src = getMoonInfo(me.block.btnimage)
            else
                src = checkForceRefresh(me.block, me.block.btnimage);
            $(me.mountPoint + ' .dt_content img').attr('src', src);
        }
    }

    function getMoonInfo() {
        var mymoon = new MoonPhase(new Date());
        var myphase = parseInt(mymoon.phase() * 100 + 50) % 100;
        return 'img/moon/moon.' + ("0" + myphase).slice(-2) + '.png';
    }

    return {
        name: 'button',
        getState: getStateButton,
        containerClass: block && (block.slide ? 'slide slide' + block.slide : '') +
            (buttonIsClickable(block) ? ' hover ' : ' '),
        run: runButton
    }
}

Dashticz.register(DT_button);