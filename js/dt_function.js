/* global toSlide getRandomInt settings infoMessage _DASHTICZ_VERSION Dashticz */
/* from blocks.js */
/* global convertBlock addBlock2Column*/
/* from graph.js */
/* global DT_graph */
/* exported capitalizeFirstLetter addStyleAttribute choose createDelayedFunction*/

// eslint-disable-next-line no-unused-vars
var DT_function = (function () {
  /**Clickhandler for Dashticz block
   * @param {object} me Block definition of Dashticz block
   * @param {object} cfg Additional block configuration settings which will be merged (optional).
   */
  function clickHandler(me, cfg) {
    var block = { key: me.key };
    $.extend(
      block,
      me.block,
      me.block && {
        forcerefresh:
          me.name == 'button'
            ? me.block.forcerefreshiframe
            : me.block.forcerefresh,
      },
      cfg,
      {isPopup: true}
    );
    block.zindex = (block.zindex || 2500) + 1;
    var hasPassword = block.password;
    if (!promptPassword(hasPassword)) return;

    if (typeof block.newwindow !== 'undefined') {
      if (block.newwindow == '0') {
        //open in same window
        blockNewWindow(block, '_self');
      } else if (block.newwindow == '1') {
        //open in new tab
        blockNewWindow(block, block.title);
      } else if (block.newwindow == '2') {
        //open in modal iframe
        blockLoadFrame(block);
      } else if (block.newwindow == '3') {
        //Ajax get request
        $.ajax(checkForceRefresh(block.url, block.forcerefresh));
      } else if (block.newwindow == '4') {
        //Ajax post request
        $.post(block.url);
      } else if (block.newwindow == '5') {
        //open in new window
        blockNewWindow(
          block,
          block.title,
          'toolbar=yes,menubar=yes,titlebar=yes,statusbar=yes'
        );
      } else {
        blockLoadFrame(block);
      }
    } else if (typeof block.slide !== 'undefined') {
      toSlide(block.slide - 1);
    } else {
      blockLoadFrame(block);
    }
  }

  function blockLoadFrame(block) {
    //Displays the frame of a block after pressing it
    var id = 'popup_' + ((''+block.key).replace(' ','_') || getRandomInt(1, 100000));
    $('body').append(createModalDialog('openpopup', id, block));
    $('#' + id).modal('show');
    var popupBlock = 0;
    if(!block.url) {
      if (typeof block.popup !== 'undefined') {
        popupBlock = typeof block.popup === 'string' ? convertBlock(block.popup): block.popup;
      }
      else if(block.idx) {
        //It's a Domoticz device. We create a graph block
        popupBlock = {
          devices: [block.idx],
          key: block.key + '_popup'
        }
      }
    }
    
    if(popupBlock) {
      var container = '#' + id + ' .modal-content';
      setTimeout(function() {
        addBlock2Column(container, 'popup', popupBlock);
      }, 200);  //after 200ms the modal is visible and has a width.

    }
    $('#' + id).on('hidden.bs.modal', function () {
      $(this).data('bs.modal', null);
      if(container) Dashticz.removeBlock(container);
      $(this).remove();
    });

    if (typeof block['auto_close'] !== 'undefined') {
      setTimeout(function () {
        $('.modal.openpopup,.modal-backdrop').remove();
      }, parseFloat(block['auto_close']) * 1000);
    }

    var $modal = $('#' +id + ' .modal-content');
    if (block.url) $modal.addClass('modal-url');
    if (popupBlock) {
      $modal.addClass( DT_graph.canHandle(popupBlock) ? 'modal-graph':'modal-popup');
    }
  }

  function blockNewWindow(block, title, params) {
    var newWindow = window.open(block.url, title, params);
    if (title !== '_self' && block.auto_close && newWindow) {
      setTimeout(function () {
        newWindow.close();
      }, parseFloat(block['auto_close']) * 1000);
    }
  }

  // eslint-disable-next-line no-unused-vars
  function checkForceRefresh(url, forcerefresh) {
    //forcerefresh is set to 1 or true:
    //   adds current time to an url as second parameter (for webcams)
    //   adds the timestamp as first parameter if there are no parameters yet
    //forcerefresh:2
    //   calls nocache.php and prevent caching by setting headers in php.
    //forcerefresh:3
    //   adds timestamp parameter to the end of the url
    // If forcerefresh is undefined then m_instance.forcerefresh will be used
    if (typeof forcerefresh !== 'undefined') {
      var str = '' + new Date().getTime();
      var mytimestamp = 't=' + str.substr(str.length - 8, 5);
      switch (forcerefresh) {
        case true:
        case 1:
          //try to add the timestamp as second parameter
          //it there are no parameters the timestamp will be added.
          //behavior changed to support cheap webcams
          if (url.indexOf('?') == -1)
            //no parameters. We will add the timestamp
            url += '?' + mytimestamp;
          else {
            //we have at least one parameters
            var pos = url.indexOf('&');
            if (pos > 0) {
              //we have more than one parameter
              //insert the timestamp as second
              /* url = url.substr(0, pos + 1) + '&' + mytimestamp + url.substr(pos); */
              url = url.substr(0, pos + 1) + mytimestamp + url.substr(pos);
            } else {
              //there is only one parameter so we add it to the end
              url += '&' + mytimestamp;
            }
          }
          break;
        case 2:
          url = settings['dashticz_php_path'] + 'nocache.php?' + url;
          break;
        case 3: //add timestamp to the end
          var sep = '&';
          if (url.indexOf('?') == -1) {
            //there is no parameter yet
            sep = '?';
          }
          url += sep + mytimestamp;
          break;
      }
    }
    return url;
  }

  var loadedResources = {};

  function loadFont(fontName, fontURL, fontFormat) {
    var id = fontName + fontFormat;
    if (loadedResources[id])
      return;
    loadedResources[id] = true;
    var newStyle = document.createElement('style');
    newStyle.appendChild(
      document.createTextNode(
        '\
            @font-face {\
                font-family: ' +
          fontName +
          ";\
                src: url('" +
          fontURL +
          "') format('" +
          fontFormat +
          "');\
            }\
        "
      )
    );

    document.head.appendChild(newStyle);
  }

  function loadCSS(filename) {
    var id = filename;
    if (loadedResources[id])
      return;
    loadedResources[id] = true;

    $('head').append(
      '<link rel="stylesheet" type="text/css" href="' + filename + '?v=' + _DASHTICZ_VERSION + '">'
    );
  }

  function loadScript(filename) {
    if (!loadedResources[filename]) {
      loadedResources[filename] = $.ajax({
        url: filename,
        dataType: 'script',
        cache: settings.cached_scripts
      });
    }
    return loadedResources[filename];
  }

  function loadDTScript(filename) {
    return loadScript(filename + '?v='+_DASHTICZ_VERSION)
  }

  /** Prompt for password
   * @function
   * @param {string} password Password
   * @returns {boolean} True: password is correct, or no password required
   */
  function promptPassword(password) {
    if (password) {
      var checkpassword = prompt('Enter password');
      if (!checkpassword) return false;
      if (checkpassword !== password) {
        //password incorrect
        infoMessage('Incorrect password', '', 3000);
        return false;
      }
    }
    return true;
  }

  function createModalDialog(dialogClass, dialogId, myFrame) {
    var setWidth = false;
    var setHeight = false;
    var mySetUrl = 'data-popup';
    var mywidth = '';
    var myheight = '';
    var url = checkForceRefresh(myFrame.url, myFrame.forcerefresh);
    if (typeof myFrame.framewidth !== 'undefined') {
      mywidth = myFrame.framewidth;
      setWidth = true;
      if (typeof mywidth === 'number') mywidth = mywidth + 'px';
    }
    if (typeof myFrame.frameheight !== 'undefined') {
      myheight = myFrame.frameheight;
      setHeight = true;
      if (typeof myheight === 'number') myheight = myheight + 'px';
    }
    var html =
      '<div class="modal fade ' +
      dialogClass;
      html+= '" id="' +
      dialogId +
      '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';

    html += '<div class="modal-dialog modal-dialog-custom';
    html += '" style="';
    html += setWidth ? 'width: ' + mywidth + '; ' : '';
    html += setHeight ? 'height: ' + myheight + '; ' : '';
    html += 'z-index: ' + myFrame.zindex + '; ';
    html += '" >';

    html += '<div class="modal-content">';
    html += '<div class="modal-header frameclose">';
    html +=
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';

    if (myFrame.url) {
      //block should have url parameter.
      html += '<div class="modal-body modalframe">';
      if (dialogClass === 'openpopup') {
        mySetUrl = 'src';
      }
      //    html += '<div id="loadingMessage">' + language.misc.loading + '</div>';
      var htmlel = myFrame.log
        ? 'div'
        : myFrame.newwindow == 5
        ? 'img'
        : 'iframe';
      html +=
        '<' +
        htmlel +
        ' class="popupheight" ' +
        mySetUrl +
        '="' +
        url +
        '" width="100%" height="100%" frameborder="0" allowtransparency="true"';

      //    html += ' style="'+setHeight ? 'height: ' + myheight + '; ' : '';
      //    html += '" onload="removeLoading()"';
      html += '></' + htmlel + '> ';
    }
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  /** Attach callback which will be called when element gets removed from the DOM
   * @param {object} element - DOM element
   * @param {function} callback - Callback function
   *
   * @example
   *
   * onRemove(element, function() {
   *  releaseAResource(element)
   * });
   *
   */
  function onRemove(element, callback) {
    var parent = element.parentNode;
    if (!parent) throw new Error('The node must already be attached');

    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.removedNodes.forEach(function (el) {
          if (el === element) {
            obs.disconnect();
            callback();
          }
        });
      });
    });
    obs.observe(document.body, {
      //      attributes: true,
      childList: true,
      subtree: true,
      //      characterData: true
    });
  }

  return {
    clickHandler: clickHandler,
    promptPassword: promptPassword,
    loadFont: loadFont,
    loadCSS: loadCSS,
    loadScript: loadScript,
    loadDTScript: loadDTScript,
    blockLoadFrame: blockLoadFrame,
    checkForceRefresh: checkForceRefresh,
    createModalDialog: createModalDialog,
    onRemove: onRemove,
  };
})();

//# sourceURL=js/dt_function.js
function capitalizeFirstLetter(string) {
  if(!string) return '';
  if(string.length===1) return string.toUpperCase;
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

function addStyleAttribute($element, styleAttribute) {
  var currentStyle = $element.attr('style');
  $element.attr('style', currentStyle ? currentStyle + '; ' + styleAttribute : styleAttribute);
}


function choose(a, b) {
  return typeof a === 'undefined' ? b : a;
}

function createDelayedFunction(timeout) {
  var m_setTimeout=timeout;
  var m_timeout=0;

  if (timeout)
  return function delayedFunction(callback) {
    if(m_timeout) 
      clearTimeout(m_timeout);
    m_timeout = setTimeout(callback, m_setTimeout);
  }
  else
  return function notDelayedFunction(callback) {
    return callback();
  }

}
