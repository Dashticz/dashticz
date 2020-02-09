Code
====

All on Github.

Development environment
-----------------------

I prefer to use Visuals Studio Code.

Source code
-----------

In general the 'rules' are:

* ES5 compliant
* Styling if possible via creative.css
* Server code PHP 5 compliant
* use 'prettier' for code formatting
* eslint should give no warnings

Some users still have a ES5 browser, like old Android tablets. In the past I used the ' const' keyword a few times.
This resulted in complaints.

For ES5 vs ES6 see for instance: http://es6-features.org

We could switch to ES6, but then probably we have to start using Babel as well, to transpile back to ES5.
This is something I would like to prevent, because it makes the develop/build environment a bit more demanding.

Guidelines:

* No ES6 syntax, like 'const', 'let', arrow functions, class keyword, object spread, Promise.
* No synchronous AJAX calls.
* jQuery promises may be used.


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
        canHandle: function (block, key) {
            //returns a boolean to indicate whether the block can be handled by this component
            //key is the identifier (string) that is used in the column definition to select a block.
            //In case an object is provided in the column definitions (like buttons, frames) then key is undefined
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

Github workflow
---------------

We use a PR (Pull Request) based workflow, with preferably one new/changing feature per branch.
All work is derived from the beta branch.
If the beta branch is stable, a master branch will be derived from the beta branch.

For big changes a temporary branch will be created to test the new functionality by a bigger audience.

Basic workflow
~~~~~~~~~~~~~~~

1. Create an account on Github.com  
2. Fork the Dashticz repository on github.com
3. Clone your own repository locally::

    cd <working directory of choice>
    git clone https://github.com/<username>/dashticz
    cd dashticz

4. Add the dashticz upstream remote::

    git remote add upstream https://github.com/Dashticz/dashticz

5. Get the latest changes::

    git checkout beta
    git fetch upstream
    git merge upstream/beta

6. Create a new branch for your changes::

    git checkout -b mynewfeature

7. Make the changes

8. Add the new files (if any)::

    git add .

9. Commit the changes::

    git commit -am "My new feature"

10. Push the changes to your own Dashticz repository::

      git push mynewfeature

11. On github.com create a Pull Request with the request to merge your own branch into beta

12. Have some patience, and lokonli will merge your PR

After your PR has been merged, you should cleanup your repository.

13. Delete your mynewfeature branch from your Dashticz repository on github.

14. Switch back to the beta branch::

      git checkout beta

15. get the new beta::

      git fetch upstream
      git merge upstream/beta

16. Delete your local mynewfeature branch. It's not needed anymore, because it has been merged::

      git branch -d mynewfeature

If you want to make additional changes, go back to step 6

Test branch
~~~~~~~~~~~
If additional testing is required then lokonli will not merge directly into beta (step 12), but will create a test branch. To continue working on this testbranch::

    git fetch upstream
    git checkout testbranch
    git merge upstream/testbranch
    git checkout -b mynewfeature

Then you have a new branch 'mynewfeature' derived from testbranch. Continue with step 7-10 to make your changes.

On github create a PR with the request to merge your new branch into testbranch.


Updating documentation
~~~~~~~~~~~~~~~~~~~~~~~

If possible update the documentation together with your code changes in the same PR.


