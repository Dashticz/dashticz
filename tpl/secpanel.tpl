<div class="sec-frame" data-mode="{{mode}}" style="width:{{wt}}%;height:{{ht}}%">
    <div class="screw tl" style="height:{{htScr}};">
        <div class="indent" ></div>
    </div>
    <div class="screw tr" style="height:{{htScr}};">
        <div class="indent"></div>
    </div>
    <div class="screw bl" style="height:{{htScr}};">
        <div class="indent"></div>
    </div>
    <div class="screw br" style="height:{{htScr}};">
        <div class="indent"></div>
    </div>
    <div class="keypad-header no-select"
        onClick="javascript:main.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);" style="font-size:{{fsHdr}};">
        <i class="fas fa-shield-alt"></i>
        <div class="text">Dashticz</div>
    </div>
    <form class="keypad-input" name="keypad-input">
        <div class="input-container">
            <input class="key-input text-strobe no-select" type="text" id="digitdisplay" value="" name="digitdisplay"
                disabled="disabled" style="font-size:{{fsInp}};" placeholder="CONNECTING..." />
            <input type="hidden" id="password" value="" name="password" />
        </div>
        <table>
            <tbody>
                <tr>
                    <td>
                        <div class="digit key" data-id="7" data-tone="key" style="font-size:{{fsKey}};">7</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="8" data-tone="key" style="font-size:{{fsKey}};">8</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="9" data-tone="key" style="font-size:{{fsKey}};">9</div>
                    </td>
                    <td>
                        <div class="status key disarm" data-id="disarm" data-tone="disarm" data-status="0"
                            style="font-size:{{fsKey}};"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="digit key" data-id="4" data-tone="key" style="font-size:{{fsKey}};">4</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="5" data-tone="key" style="font-size:{{fsKey}};">5</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="6" data-tone="key" style="font-size:{{fsKey}};">6</div>
                    </td>
                    <td>
                        <div class="status key arm" data-id="armhome" data-tone="arm" data-status="1"
                            style="font-size:{{fsKey}};"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="digit key" data-id="1" data-tone="key" style="font-size:{{fsKey}};">1</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="2" data-tone="key" style="font-size:{{fsKey}};">2</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="3" data-tone="key" style="font-size:{{fsKey}};">3</div>
                    </td>
                    <td>
                        <div class="status key arm" data-id="armaway" data-tone="arm" data-status="2"
                            style="font-size:{{fsKey}};"></div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <div class="digit key" data-id="0" data-tone="key" style="font-size:{{fsKey}};">0</div>
                    </td>
                    <td colspan="{{mode}}">
                        <div class="key cancel" data-id="cancel" data-tone="key" style="font-size:{{fsKey}};"></div>
                    </td>
                    <td>
                        <div class="status dashticz key disabled" data-id="dashticz" data-tone="key"
                            style="font-size:{{fsKey}};"></div>
                    </td>
                </tr>
            </tbody>
        </table>
    </form>
    <div class="keypad-footer no-select" style="font-size:{{fsFtr}};">Dashticz Security Panel, 2020</div>
</div>