/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Popup');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('klokantech.jekylledit.Auth');
goog.require('klokantech.jekylledit.Editor');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {string} repo
 * @param {string} path
 * @param {Node} editableContent
 * @constructor
 */
klokantech.jekylledit.Popup = function(repo, path, editableContent) {
  /**
   * @type {string}
   * @private
   */
  this.repo_ = repo;

  /**
   * @type {string}
   * @private
   */
  this.path_ = path;

  /**
   * @type {!Element}
   * @private
   */
  this.content_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-content');

  /**
   * @type {!Element}
   * @private
   */
  this.actions_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-actions');

  var saveBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Save');
  var cancelBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Cancel');
  goog.dom.append(this.actions_, cancelBtn, saveBtn);
  goog.events.listen(cancelBtn, goog.events.EventType.CLICK, function(e) {
    this.setVisible(false);
  }, false, this);
  goog.events.listen(saveBtn, goog.events.EventType.CLICK, function(e) {
    if (goog.isDef(this.activeType_)) {
      var editor = this.editorTypes_[this.activeType_];
      if (editor) {
        editor.save();
        this.setVisible(false);
        this.clearEditors_();
      }
    }
  }, false, this);

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup');

  /**
   * @type {!Element}
   * @private
   */
  this.nav_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-nav');

  goog.dom.append(this.element_, this.nav_, this.content_);

  /**
   * @type {!Element}
   * @private
   */
  this.root_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-bg',
                                  this.element_);

  /**
   * @type {Object.<?string, klokantech.jekylledit.Editor>}
   * @private
   */
  this.editorTypes_ = {};

  /**
   * @type {string|null|undefined}
   * @private
   */
  this.activeType_ = undefined;

  /**
   * @type {Node}
   * @private
   */
  this.editSource_ = editableContent;

  /**
   * @type {Object}
   * @private
   */
  this.config_ = null;

  /**
   * @type {klokantech.jekylledit.Auth}
   * @private
   */
  this.auth_ = new klokantech.jekylledit.Auth(this.content_);
  this.auth_.login(goog.bind(this.onLogin_, this));
};


/**
 * @private
 */
klokantech.jekylledit.Popup.prototype.onLogin_ = function() {
  var editBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Edit');
  goog.dom.append(this.nav_, editBtn);
  goog.events.listen(editBtn, goog.events.EventType.CLICK, function(e) {
    this.startEditor_(null);
  }, false, this);

  this.auth_.sendRequest(
      this.repo_ + '/config.json',
      goog.bind(function(e) {
        var xhr = e.target;
        this.config_ = xhr.getResponseJson();

        goog.object.forEach(this.config_['metadata'], function(el, k) {
          var catBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
          'New: ' + k);
          goog.dom.appendChild(this.nav_, catBtn);
          this.initEditor_(k);
          goog.events.listen(catBtn, goog.events.EventType.CLICK, function(e) {
            this.startEditor_(k);
          }, false, this);
        }, this);

        if (this.editSource_) {
          this.initEditor_(null, goog.bind(function() {
            this.startEditor_(null);
          }, this));
        }
      }, this));
};


/**
 * @private
 */
klokantech.jekylledit.Popup.prototype.clearEditors_ = function() {
  goog.object.forEach(this.editorTypes_, function(editor, k) {
    editor.loadClearData();
  });
};


/**
 * @param {?string} type
 * @param {Function=} opt_cb
 * @private
 */
klokantech.jekylledit.Popup.prototype.initEditor_ = function(type, opt_cb) {
  var editor = this.editorTypes_[type];
  if (!editor) {
    editor = new klokantech.jekylledit.Editor(
        this.auth_, this.config_, type,
        this.repo_, type == null ? this.path_ : undefined,
        type == null ? this.editSource_ : undefined,
        opt_cb);
    this.editorTypes_[type] = editor;
  }
};


/**
 * @param {?string} type
 * @private
 */
klokantech.jekylledit.Popup.prototype.startEditor_ = function(type) {
  if (!this.actions_.parentElement) {
    goog.dom.append(this.element_, this.actions_);
  }

  var editor = this.editorTypes_[type];
  if (editor) {
    goog.dom.removeChildren(this.content_);
    goog.dom.appendChild(this.content_, editor.getElement());
    editor.start();
  }

  this.activeType_ = type;
};


/**
 * @param {boolean} visible
 */
klokantech.jekylledit.Popup.prototype.setVisible = function(visible) {
  if (visible) {
    if (this.editSource_) {
      this.startEditor_(null);
    }
    goog.dom.appendChild(document.body, this.root_);
    document.body.style.overflow = 'hidden';
  } else {
    goog.dom.removeNode(this.root_);
    document.body.style.overflow = '';
  }
};
