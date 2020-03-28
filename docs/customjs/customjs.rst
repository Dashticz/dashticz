.. _custom.js:

Functionality via custom.js
############################

There is the possibility to use your own functions in Dashticz.
For this you can edit the file ``<dashticz folder>/custom/custom.js``.

``function afterGetDevices()``
------------------------------

This predefined function will be called after every update of a Domoticz device.

You can enter code inside this function which you want to be called.

Of course, you can also use stuff like $(document).ready() etc...

The following example shows how you can change the styling of a Domoticz device based on the status::

    function afterGetDevices(){
        if (Domoticz.getAllDevices()[120].Data == 'Off') {
      		$('.block_120 .title').addClass('warningblue');
      		$('.block_120 .state').addClass('warningblue');
       	}
       	else {	 
      		$('.block_120 .title').removeClass('warningblue');
      		$('.block_120 .state').removeClass('warningblue');
       	}	
    }

In this example the CSS style 'warningblue' is applied to the title and state part of Domoticz block 120 if the state is 'Off' (as used by switches).
For this example to work you must also add the definition for ``warningblue`` to ``custom.css``. For instance as follows::

    .warningblue {
      color: blue !important;
    }




``function getExtendedBlockTypes(blocktypes)``
----------------------------------------------

Some blocktypes are filtered out by their distinct name and therefore will not produce the nice icons. Referring to ``blocktypes.Name = {}`` section in ``blocks.js``.
Add the following function to show the icons and data-layout for blocks with your own names.

::

    function getExtendedBlockTypes(blocktypes){
       blocktypes.Name['Maan op'] = { icon: 'fa-moon-o', title: '<Name>', value: '<Data>' }
       blocktypes.Name['Maan onder'] = { icon: 'fa-moon-o', title: '<Name>', value: '<Data>' }
       return blocktypes;
    }


``function getBlock_IDX(block)``
--------------------------------------

Want your block to show up differently then Dashticz generates and do you have a little bit of coding skills?
Add to ``custom.js`` one of the examples::

    function getBlock_233(block){            //change 233 to the idx of your device!
      var idx = block.idx;                   //the Dashticz id
      var device = block.device;             //The Domoticz device info
      var $mountPoint = block.$mountPoint    // The DOM entry point for this block

   	$mountPoint.find('.mh')				      //Find the correct block
	   .off('click')						         //remove any previous click handler
	   .click(function() {					      //install new click handler
	      switchDevice(block, 'toggle', false);	//switch the device on click
	   })
	   .addClass('hover');						   //and add the predefined hover css class

       var html='';
       html+='<div class="col-xs-4 col-icon">';
          if(device['Status']=='Off') html+=iconORimage(block,'fas fa-toggle-off','','off icon');
          else html+=iconORimage(block,'fas fa-toggle-on','','on icon');
       html+='</div>';
       html+='<div class="col-xs-8 col-data">';
       html+='<strong class="title">'+device['Name']+'</strong><br />';
       if(device['Status']=='Off') html+='<span class="state">AFWEZIG</span>';
       else html+='<span class="state">AANWEZIG</span>';

       if(showUpdateInformation(block)) html+='<br /><span class="lastupdate">'+moment(device['LastUpdate']).format(settings['timeformat'])+'</span>';
       html+='</div>';
       return html;
    }


``function getStatus_IDX(block, afterupdate)``
----------------------------------------------

Just like the function to take action on change of a value, now is extended functionality to do something with a block when it has a specific value.
Example, add a red background to a switch when energy usage reaches a limit.

First you'll have to find the correct IDX for the device. To find the correct IDX number, use http://domoticz_url:8080/json.htm?type=devices&filter=all&used=true , you get an overview of the devices, IDX and it's corresponding parameters.
After you have the correct IDX, you can add this device to the ``custom.js`` according to the following example::

    function getStatus_145(block, afterupdate){
    var idx = block.idx;
    var device = block.device;
       if(parseFloat(device['Data'])>23){
          block.addClass='warning';
       }
       else {
          block.addClass='';
       }
    }


And in ``custom.css`` add your css, according to this example::
 
    .warning {
       background: rgba(199,44,44,0.3) !important;
        background-clip: padding-box;
    }

Or if you like a blinking version::

    .warning {
       background: rgba(199,44,44,0.3) !important;
       background-clip: padding-box;
       border: 7px solid rgba(255,255,255,0);
       -webkit-animation: BLINK-ANIMATION 1s infinite;
       -moz-animation: BLINK-ANIMATION 1s infinite;
       -o-animation: BLINK-ANIMATION 1s infinite;
       animation: BLINK-ANIMATION 1s infinite;
    }

    @-webkit-keyframes BLINK-ANIMATION {
       0%, 49% {
          background-color: rgba(199,44,44,0.3);
          background-clip: padding-box;
          border: 7px solid rgba(255,255,255,0);
       }
       50%, 100% {
          background-color: rgba(199,44,44,0.7);
          background-clip: padding-box;
          border: 7px solid rgba(255,255,255,0);
       }
    }


The getStatus_IDX gets called twice. The first time before updating the Dashticz block. The parameter ``afterupdate`` will be set to false.
The second time after updating the Dashticz block. The parameter 'afterupdate' will be set to true. These two calls are needed,
because if you change the block definition of the device in the getStatus function then that should be done before updating the block, but applying css classes normally needs to be done after creating the block.

In most cases there is no need for testing the value of ``afterupdate``: You just can apply your changes twice.

``function getChange_IDX(block, afterupdate)``
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This function gets called when the value of a Domoticz device changes.
This function will only get called after updating the block. If you want to change the block definition as a result of the status you should use the getStatus function as described above. 

.. _setblock:

Change value of another block
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
By calling ``Dashticz.setBlock`` from the getStatus function you can change another block as well. Example:
::

    function getStatus_2(block) {
      var idx = block.idx;
      var device = block.device;
        console.log(device.Level)
        if (parseFloat(device.Level) === 0) {
            block.title='level 0';
            block.icon='fas fa-train';

            Dashticz.setBlock('mytitle', {
                title: 'also 0',
                icon: 'fas fa-train
                });
        } 
        else {
            block.title='level is not 0 but ' + device.Level;
            block.icon="fas fa-bus";

            Dashticz.setBlock('mytitle', {
                title: 'not 0, but ' + device.Level,
                icon: 'fas fa-bus
                });
        }
    }

The ``getChange_2`` function gets called when the data of device with index 2 changes.

This previous example will also change a block that is defined by ``blocks['mytitle']`` (for instance a blocktitle):
::

    blocks['mytitle'] = {
        type: 'blocktitle',
        title: 'Default',
        icon: 'fas fa-car'
    }

.. note:: Be careful with the Dashticz.setBlock function. You could end in an infinite update loop!

