$.ajax({
  url: 'https://cdn.jsdelivr.net/npm/@jaames/iro/dist/iro.min.js',
  dataType: 'script',
  async: false,
});

/*!
 * jQuery UI Widget-factory plugin boilerplate (for 1.8/9+)
 * Author: @addyosmani
 * Further changes: @peolanha
 * Licensed under the MIT license
 */

(function ($, window, document, undefined) {
  // define your widget under a namespace of your choice
  //  with additional parameters e.g.
  // $.widget( "namespace.widgetname", (optional) - an
  // existing widget prototype to inherit from, an object
  // literal to become the widget's prototype );

  $.widget('dt.colorpicker', {
    //Options to be used as defaults
    options: {
      someValue: null,
    },

    //Setup widget (eg. element creation, apply theming
    // , bind events etc.)
    _create: function () {
      // _create will automatically run the first time
      // this widget is called. Put the initial widget
      // setup code here, then you can access the element
      // on which the widget was called via this.element.
      // The options defined above can be accessed
      // via this.options this.element.addStuff();
    },

    // Destroy an instantiated plugin and clean up
    // modifications the widget has made to the DOM
    destroy: function () {
      // this.element.removeStuff();
      // For UI 1.8, destroy must be invoked from the
      // base widget
      $.Widget.prototype.destroy.call(this);
      // For UI 1.9, define _destroy instead and don't
      // worry about
      // calling the base widget
    },

    methodB: function (event) {
      //_trigger dispatches callbacks the plugin user
      // can subscribe to
      // signature: _trigger( "callbackName" , [eventObject],
      // [uiObject] )
      // eg. this._trigger( "hover", e /*where e.type ==
      // "mouseenter"*/, { hovered: $(e.target)});
      console.log('methodB called');
    },

    methodA: function (event) {
      this._trigger('dataChanged', event, {
        key: 'someValue',
      });
    },

    // Respond to any changes the user makes to the
    // option method
    _setOption: function (key, value) {
      switch (key) {
        case 'someValue':
          //this.options.someValue = doSomethingWith( value );
          break;
        default:
          //this.options[ key ] = value;
          break;
      }

      // For UI 1.8, _setOption must be manually invoked
      // from the base widget
      $.Widget.prototype._setOption.apply(this, arguments);
      // For UI 1.9 the _super method can be used instead
      // this._super( "_setOption", key, value );
    },
  });
})(jQuery, window, document);

function Colorpicker(options) {
  this.options = options;
  this.container = options.container ? options.container : 'body';
  this.index = Colorpicker.prototype.count++;
  this.block = options.block;
  var html = '';
  this.ref = 'colorpicker' + this.index;
  //    $(this.container).attr('data-toggle','modal');
  //    $(this.container).attr('data-target', '#'+this.ref);

  $(this.container).on('click', this, this.clickHandler);
  /*
    $('#'+this.ref).on('show.bs.modal', function (event) {
        //return false;
        ev.stopPropagation
    });*/
}

Colorpicker.prototype.show = function () {
  console.log('Show ', this.idx);
};

Colorpicker.prototype.count = 0;

Colorpicker.prototype.clickHandler = function (ev) {
  console.log('on click');
  var device = ev.data.block.device;
  console.log(device);
  var hasRGB = false;
  hasWW = false;
  hasL = false;
  switch (device.SubType) {
    case 'RGB':
      var hasRGB = true;
      break;
    case 'RGBWWZ':
      hasRGB = true;
      hasWW = true;
      hasL = true;
      break;
  }

  html = `
                <div class="modal" id="${ev.data.ref}" tabindex="-1" role="dialog">
            <div class="modal-dialog" role="document">
                <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${ev.data.block.title}</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                    <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p></p>
                    <div class="iro"></div>
                    <div id="cp-slider-1" class="cp-slider-container"></div>
                    <div id="cp-slider-2" class="cp-slider-container"></div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
                    <button type="button" class="btn btn-primary">Save changes</button>
                </div>
                </div>
            </div>
            </div>
    `;
  $('body').append(html);
  var el = $('#' + ev.data.ref);
  //    el.find('.modal-body').html(ev.data.idx);
  el.on('hidden.bs.modal', function () {
    $(this).data('bs.modal', null);
    el.remove();
    console.log('destroyed modal color picker');
  });

  el.modal();
  var self = this;
  this.iro = new window.iro.ColorPicker('#' + ev.data.ref + ' .iro', {
    layout: [
      {
        component: iro.ui.Wheel,
        options: {},
      },
    ],
  });
  this.iro.on('input:end', function () {
    onChange(self);
  });
  this.slider1 = Colorpicker.prototype.addSlider({
    ref: $('#' + ev.data.ref).find('#cp-slider-1'),
    value: 33,
    step: 1,
    min: 0,
    max: 100,
    disabled: false,
    left: 'l1',
    right: 'r1',
    onChange: function () {
      onChange(self);
    },
  });
  this.slider2 = Colorpicker.prototype.addSlider({
    ref: $('#' + ev.data.ref).find('#cp-slider-2'),
    value: 66,
    step: 1,
    min: 0,
    max: 100,
    disabled: false,
    left: 'l2',
    right: 'r2',
    onChange: function () {
      onChange(self);
    },
  });
  console.log('end');

  //    var cp =$(this).find('.colorpicker-body');
  //    $(cp).css('visibility','visible');
  ev.stopPropagation();
  //        ev.preventDefault();
  //    return false;
};

function onChange(self) {
  console.log(self);
  var rgb = self.iro.color.rgb;
  var s1 = self.slider1.slider('value');
  var s2 = self.slider2.slider('value');
  /*
    Domoticz.syncRequest(
        block.idx,
        'type=command&param=switchlight&idx=' +
          block.idx +
          '&switchcmd=Set%20Level&level=' +
          status
      )*/
  console.log(rgb, s1, s2);
}

Colorpicker.prototype.addSlider = function cpAddSlider(cfg) {
  //    var idx = cfg.idx;
  var html =
    '<div id="cp-si-left" class="cp-slider-image"></div><div class="cp-slider"></div><div id="cp-si-right" class="cp-slider-image"></div>';
  $(cfg.ref).html(html);
  $(cfg.ref).find('#cp-si-left').html(cfg.left);
  $(cfg.ref).find('#cp-si-right').html(cfg.right);

  //    debugger;
  var mycomp = $(cfg.ref).find('.cp-slider');
  var res = mycomp.slider({
    value: cfg.value,
    step: cfg.step,
    min: cfg.min,
    max: cfg.max,
    disabled: cfg.disabled,
    start: function () {
      //            Domoticz.hold(idx); //hold message queue
      //sliding = idx;
      //            slideDeviceExt($(this).data('light'), ui.value, 0);
    },
    //        slide: function (event, ui) {
    //            slideDeviceExt($(this).data('light'), ui.value, 1);
    //},
    change: cfg.onChange,
    stop: function () {
      //stop is called before change
      //sliding = false;
      //            Domoticz.release(idx); //release message queue
    },
  });
  return res;
};

Colorpicker.prototype.onChange = function cpOnChange(ev) {
  console.log('changed');
};

//# sourceURL=js/colorpicker.js
