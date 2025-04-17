/* global Dashticz */
//# sourceURL=js/components/group.js
var DT_group = (function () {

    return {
        name: 'group',
        defaultCfg: function (block) {
            return {
                width: 4,
                refresh: 3600,
                mixed: '',
                clickHandler: groupClickHandler,
                popup: true,
                longpress: true,
                containerClass: 'mh',
                switchMode: 'Toggle',
                mixedclass: 'on'
            };
        },
        run: function (me) {
            me.devicesPromise = $.Deferred();
            if (me.block.devices || !me.block.idx) {
                me.devices = me.block.devices || [];
                me.devicesPromise.resolve(me.devices);
            }
            else {
                var idx = me.block.idx;
                if (typeof idx === 'string' && idx.toLowerCase()[0] === 's') idx = idx.substring(1);
                Domoticz.request('getscenedevices', false, { idx: idx })
                    .then(function (res) {
                        var devices = [];
                        if (res && res.result) {
                            devices = res.result.map(function (device) {
                                return device.DevRealIdx
                            });
                            me.devices = devices;
                            me.devicesPromise.resolve(devices)    
                        }
                        else
                            throw new Error('<br>Block '+me.key+'<br>idx not valid: ' + idx);
                    })
                    .catch(function (err) {
                        me.$mountPoint.find('.dt_block').html(err);
                        me.devices = [];
                        me.devicesPromise.reject(err);
                    })
            }
            me.devicesPromise.then(function (devices) {
                devices.forEach(function (device) {
                    Dashticz.subscribeDevice(me, device, false, function () {
                        return refresh(me)
                    })
                });
            });

            if (me.block.longpress) {
                var $block = me.$mountPoint.find('.dt_block');
                $block[0].addEventListener('long-press', function (e) {
                    e.preventDefault();
                    DT_function.clickHandler(me, { popup: me.devices });
                })
                $block.addClass('longpress');
                $block.attr('data-long-press-delay', '1000');
            }

            me.delayed100 = createDelayedFunction(100);
        },
        refresh: refresh
    }

    function refresh(me) {
        me.delayed100(function() {
            doRefresh(me)
        });
    }

    function doRefresh(me) {

        var allDevices = Domoticz.getAllDevices();

        me.mixed = me.block.mixed.toLowerCase();

        me.devicesPromise.then(function (res) {

            me.groupState = me.devices.reduce(function (acc, idx) {
                if (acc === 'mixed') return 'mixed';
                var status = getIconStatusClass(allDevices[idx].Status);
                if (!acc) return status;
                return acc === status ? acc : 'mixed'
            }, '');

            if (me.groupState === 'mixed' && me.mixed) {
                me.groupState = me.mixed
            }
            var block = $.extend(me.block, {
                device: {
                    Status: me.groupState
                },
                $mountPoint: me.$mountPoint,
                width: me.block.width,
                title: me.block.title || me.key,
                showmixedas: me.block.showmixedas,
                protoBlock: {
                    iconOn: 'fas fa-lightbulb',
                    iconOff: 'far fa-lightbulb',
                }

            });
            var html = getDefaultSwitchBlock(block);
            me.$mountPoint.find('.dt_block').html(html);
        })

    }

    function groupClickHandler(me) {
        var newState;
        switch(toLower(me.block.switchMode)) {
            case 'on':
                newState='On';
                break;
            case 'off':
                newState='Off';
                break;
            case 'toggleoff':
                me.groupState==='off' ? 'On': 'Off';
                break;
            default: newState =  me.groupState === 'on' ? 'Off' : 'On'
        }
        me.devices.forEach(function (idx) {
            switchDevice({ idx: idx, type: 'group', device: Domoticz.getAllDevices()[idx] }, newState)
        })
    }
})();

Dashticz.register(DT_group);
