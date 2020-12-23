/* global toSlide getRandomInt settings infoMessage language*/
// eslint-disable-next-line no-unused-vars
var DT_function = (function () {
  /**Clickhandler for Dashticz block
   * @param {object} me Block definition of Dashticz block
   * @param {object} cfg Additional block configuration settings which will be merged (optional).
   */
  function clickHandler(me, cfg) {
    var block = { key: me.key };
    $.extend(block, me.block, cfg);
    var hasPassword = block.password;
    if (!promptPassword(hasPassword)) return;

    if (typeof block.newwindow !== 'undefined') {
      if (block.newwindow == '0') {
        window.open(block.url, '_self');
      } else if (block.newwindow == '1') {
        window.open(block.url);
      } else if (block.newwindow == '2') {
        blockLoadFrame(block);
      } else if (block.newwindow == '3') {
        $.ajax(checkForceRefresh(block.url, block.forcerefresh));
      } else if (block.newwindow == '4') {
        $.post(block.url);
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
    var id = 'popup_' + (block.key || getRandomInt(1, 100000));
    $('body').append(createModalDialog('openpopup', id, block));
    $('#' + id).on('hidden.bs.modal', function () {
      $(this).data('bs.modal', null);
      $(this).remove();
    });

    $('#' + id).modal('show');
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
  function loadFont(fontName, fontURL, fontFormat) {
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
    $('head').append(
      '<link rel="stylesheet" type="text/css" href="' + filename + '">'
    );
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
      dialogClass +
      '" id="' +
      dialogId +
      '" tabindex="-1" role="dialog" aria-labelledby="myModalLabel" aria-hidden="true">';

    html += '<div class="modal-dialog modal-dialog-custom" style="';
    html += setWidth ? 'width: ' + mywidth + '; ' : '';
    html += setHeight ? 'height: ' + myheight + '; ' : '';
    html += '" >';

    html += '<div class="modal-content">';
    html += '<div class="modal-header frameclose">';
    html +=
      '<button type="button" class="close" data-dismiss="modal" aria-hidden="true">&times;</button>';
    html += '</div>';
    html += '<div class="modal-body modalframe">';
    if (dialogClass === 'openpopup') {
      mySetUrl = 'src';
    }
    html += '<div id="loadingMessage">' + language.misc.loading + '</div>';
    var htmlel = myFrame.newwindow==5 ? 'img' : 'iframe';
    html +=
      '<' +
      htmlel +
      ' class="popupheight" ' +
      mySetUrl +
      '="' +
      url +
      '" width="100%" height="100%" frameborder="0" allowtransparency="true" style="';
//    html += setHeight ? 'height: ' + myheight + '; ' : '';
    html += '" onload="removeLoading()"';
    html += '></' + htmlel + '> ';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    console.log(html);
    return html;
  }

  return {
    clickHandler: clickHandler,
    promptPassword: promptPassword,
    loadFont: loadFont,
    loadCSS: loadCSS,
    blockLoadFrame: blockLoadFrame,
    checkForceRefresh: checkForceRefresh,
    createModalDialog: createModalDialog,
  };
})();

//# sourceURL=js/dt_function.js
