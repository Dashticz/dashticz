<div class="sec-frame{{#if decorate}} decorated{{/if}}" data-mode="{{mode}}">
    {{#if decorate}}
    <div class="screws">
        <div class="screw tl">
            <div class="indent" ></div>
        </div>
        <div class="screw tr">
            <div class="indent" ></div>
        </div>
    </div>
    <div class="keypad-header no-select"
        onClick="javascript:main.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);">
        <i class="fas fa-shield-alt"></i>
        <div class="text">{{headerText}}</div>
    </div>
    {{/if}}
    <div class="keypad-input" name="keypad-input">
        <div class="input-container">
            <input class="key-input text-strobe no-select" type="text" id="digitdisplay" value="" name="digitdisplay"
                disabled="disabled" placeholder="CONNECTING..." />
            <input type="hidden" id="password" value="" name="password" />
        </div>
        <table>
            <tbody>
                <tr>
                    <td>
                        <div class="digit key" data-id="7" data-tone="key">7</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="8" data-tone="key">8</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="9" data-tone="key">9</div>
                    </td>
                    <td>
                        <div class="status key disarm" data-id="disarm" data-tone="disarm" data-status="0"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="digit key" data-id="4" data-tone="key">4</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="5" data-tone="key">5</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="6" data-tone="key">6</div>
                    </td>
                    <td>
                        <div class="status key arm" data-id="armhome" data-tone="arm" data-status="1"></div>
                    </td>
                </tr>
                <tr>
                    <td>
                        <div class="digit key" data-id="1" data-tone="key">1</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="2" data-tone="key">2</div>
                    </td>
                    <td>
                        <div class="digit key" data-id="3" data-tone="key">3</div>
                    </td>
                    <td>
                        <div class="status key arm" data-id="armaway" data-tone="arm" data-status="2"></div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2">
                        <div class="digit key" data-id="0" data-tone="key">0</div>
                    </td>
                    <td colspan="{{mode}}">
                        <div class="key cancel" data-id="cancel" data-tone="key"></div>
                    </td>
                    <td>
                        <div class="status dashticz key disabled" data-id="dashticz" data-tone="key"></div>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
    {{#if decorate}}
    <div class="keypad-footer no-select">{{footerText}}</div>
    <div class="screws">
        <div class="screw bl">
            <div class="indent" ></div>
        </div>
        <div class="screw br">
            <div class="indent" ></div>
        </div>
    </div>
    {{/if}}
</div>