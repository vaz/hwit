//= require_self

$(function () {

  //
  // models

  var Text = Backbone.Model.extend({
    defaults: { x: 0, y: 0, body: '' },
  });

  //
  // collections

  var Texts = Backbone.Collection.extend({
    model: Text,
    url: '/texts',
  }), texts = new Texts;

  //
  // views

  var TextView = Backbone.View.extend({
    tagName: 'div',
    className: 'tb',
    attributes: { spellcheck: 'false', contenteditable: true },

    events: {
      'keydown': 'keydown',
      'blur': 'save'
    },

    initialize: function () {
      Backbone.View.prototype.initialize.apply(this, arguments);
      this.listenTo(this.model, 'change', this.render);
      this.listenTo(this.model, 'destroy', this.remove);
    },

    render: function () {
      this.setPosition();
      this.setBody();
      return this;
    },

    setPosition: function () {
      this.$el.css({
        'left': this.model.get('x') + 'px',
        'top': this.model.get('y') + 'px',
      });
    },

    setBody: function () {
      this.$el.html(this.model.get('body'));
    },

    keydown: function (e) {
      // escape
      if (e.which === 27) {
        this.$el.blur();
      }
      // cmd-return or ctrl-enter
      else if ((e.metaKey || e.ctrlKey) && e.which === 13) {
        this.$el.blur();
        e.preventDefault();
      }
    },

    isEmpty: function () {
      return $.trim(this.el.textContent) === '';
    },

    save: function () {
      if (this.isEmpty()) { this.model.destroy(); }
      else {
        body = this.$el.html();
        if (this.model.get('body') != body) {
          this.model.save({ body: body }, { patch: true });
          this.glow('saved');
        }
        window.getSelection().removeAllRanges();
        $('html, body').animate({ scrollTop: 0, scrollLeft: 0 }, 100);
      }
    },

    glow: function (className) {
      this.$el.addClass(className);
      _.defer(_.bind(this.$el.removeClass, this.$el), className);
    }
  });

  var AppView = Backbone.View.extend({
    el: '#app',

    events: {
      'dblclick': 'dblclick'
    },

    initialize: function () {
      this.listenTo(texts, 'add', this.add);
      this.listenTo(texts, 'reset', this.addAll);
      this.listenTo(texts, 'all', this.render);

      texts.fetch({
        success: function () {
          $('.tb:focus').blur();
          window.getSelection().removeAllRanges();
        }
      });
    },

    add: function (text) {
      var view = new TextView({ model: text });
      this.$el.append(view.render().el);
      view.$el.focus();
    },

    addAll: function () {
      Texts.each(this.add, this);
    },

    dblclick: function (e) {
      var x = e.pageX;
      var y = e.pageY;
      var text = new Text({ x: x, y: y });
      texts.add(text);
    }
  }), app = new AppView;

  // modals

  var ModalView = Backbone.View.extend({
    showing: false,

    initialize: function () {
      Backbone.View.prototype.initialize.apply(this, arguments);

      var $triggers = $('[data-modal=' + this.id() + ']');

      $triggers.on('click', _.bind(function (e) {
        this.toggle();
        e.stopPropagation();
      }, this));
    },

    id: function () {
      return this.$el.attr('id');
    },

    show: function () {
      this.showing = true;
      this.$el.show();
      _.defer(_.bind(function () {
        if (this.showing) {
          this.$el.addClass('in');
          app.$el.addClass('dialog-showing');
        }
      }, this));
    },

    hide: function () {
      this.showing = false;
      this.$el.removeClass('in');
      app.$el.removeClass('dialog-showing');
      _.defer(_.bind(function () {
        if (!this.showing) { this.$el.hide(); }
      }, this));
    },

    toggle: function () {
      if (this.showing) { this.hide(); } else { this.show(); }
    }
  }), modalHelp = new ModalView({ el: $('#modal-help') });

  $('#app, .close').on('click', function (e) {
    modalHelp.hide();
  });

  $(window).on('keydown', function (e) {
    if ($(e.target).is('.tb')) { return; }

    // ? -- help
    if (e.which === 191) {
      modalHelp.toggle();
      e.preventDefault();
    }
    // esc
    else if (e.which === 27) {
      modalHelp.hide();
      e.preventDefault();
    }
  });

  // debug
  window.app = app;
  window.texts = texts;
  window.modalHelp = modalHelp;

});
