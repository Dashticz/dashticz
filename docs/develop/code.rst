Code
====

All on Github.

Development environment
-----------------------

I prefer to use Visuals Studio Code.

Source code
-----------

ES5 format, checked with eslint

Dependencies
-------------

Most external libraries are managed via npm and bundled with Webpack. If you need to update the bundle, follow the following steps.

1. Install node
2. Install the dependencies ::

    npm install

3. Build the bundle ::

    npm run build

The sources for the bundle can be found in ``src/``
These files will be transpiled with Babel to ES5.

The Swiper library is in ES6 format, and will be transpiled to ES5 as well. See ``babel.config.js`` for the configuration.

The regular Dashticz files will NOT be transpiled: They should be in ES5 format.

jQuery 3.4.1
~~~~~~~~~~~~
In December 2019 Dashticz was upgraded from jQuery 2.2.4 to jQuery 3.4.1, because of a reported security vulnerability in jQuery 2.2.4.
Migration is checked via jquery-migrate plugin, which can be enabled in ``src/index.js``.

The spectrum-colorpicker is not fully compatible with jQuery 3. The jquery-migrate plugin generates warnings in the console if the ``jquery-migrate`` plugin is enabled.


Design
-------

Since v3.2.0 a standard component will be used for most special blocks. All blocks are loaded by ``js/dashticz.js``.
The source code for each block can be found in the ``js/components`` folder.

If you want to add a new block with the name 'myblock', then follow the following steps:

Create the file ``js/components/myblock.js``. A minimal implementation should contain the following::

    var DT_myblock = {
        name: "myblock",
        run: function (me) {
            //this function will be called after the component has been initialized and has been mounted into the DOM.
            //me.mountPoint: Mountpoint of the container (dt_block)
            //For basic usage you will add additional code to $(me.mountPoint + ' .dt_state')
            //me.block: Reference to the block definition in CONFIG.js
        }
    }

    Dashticz.register(DT_myblock); //Don't forget to register the block

Add ``'myblock'`` to the components variable at the start of ``js/dashticz.js``

An example of a more extensive implementation::

    var DT_myblock = {
        name: "myblock",
        canHandle: function (block) {
            //returns a boolean to indicate whether the block can be handled by this component
        },
        init: function () {
            //Will be called for initialization
            //returns a jquery deferred (similar to a Promise)
        },
        default: { //All optional
            icon: 'fas fa-newspaper', // string to define the default icon
            containerClass: function (block) { //function returning a string containing class names that will be added to the block 
                return 'hover'
            },
            containerExtra: function (block) { //function returning additional settings for the container HTML element (dt_block)
                return (block && block.maxheight) ? ' style="max-height:' + block.maxheight + 'px;overflow:hidden;"' : ''
            }
        },
        get: function () { //Optional. function returning the static content of dt_state
            return '<ul id="newsTicker"></div>'
        },
        run: function (me) {
            //this function will be called after the component has been initialized and has been mounted into the DOM.
            //me.mountPoint: Mountpoint of the container (dt_block)
            //For basic usage you will add additional code to $(me.mountPoint + ' .dt_state')
            //me.block: Reference to the block definition in CONFIG.js
        }
    }

    Dashticz.register(DT_myblock); //Don't forget to register the block

Add ``'myblock'`` to the components variable at the start of ``js/dashticz.js``




