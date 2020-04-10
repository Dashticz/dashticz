/* This file can be used to further customize Dashticz
    *   Rename this file to custom.js
    *   Customization examples can be found below
*/
 
/** afterGetDevices will be called when Dashticz receives any Domoticz device update */
function afterGetDevices(){

}

/** getExtendedBlockTypes will be called to extend the predefined blocktypes
 * As an example a blocktype for the Domoticz device with subtype 'MySubtype' has been added
 * The function MUST return blocktypes as it receives as parameter.
 * For more examples see js/blocktypes.js
 * @param {blocktypes}
 */
function getExtendedBlockTypes(blocktypes){
    blocktypes.SubType['MySubtype'] = {
        icon: 'fas fa-seedling',
        title: '<Name>',
        value: '<Data>+ <Desc>',
    };
    return blocktypes;
}

/** getStatus_<idx> will be called when Dashticz receives an update for device <idx>
 * @param {block}
 * 
 */
function getStatus_1(block) {
    var device = block.device;      //The Domoticz device
    var idx = block.idx;            //The block idx, as used in CONFIG.js
    if (device.Status==='On') {
        block.icon = 'fas fa-car';
        block.title = 'Device is on';
        block.addClass = 'myOwnCSSClass'    //The class 'myOwnCSSClass' will be applied
                                            //Define this class in custom.css

        Dashticz.setBlock('123', {          //Example how to redefine another block
            icon:'fas fa-car',
            addClass: 'myOtherCSSClass'
        })                                    
    }
    else {
        block.icon = 'fas fa-bus';
        block.title = '';
        block.addClass = '';
    }
}
