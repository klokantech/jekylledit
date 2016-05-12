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
goog.require('klokantech.jekylledit.Translations');
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
    if (goog.isDef(this.activePage_)) {
      var page = this.pages_[this.activePage_];
      if (page) {
        page.save();
        this.setVisible(false);
        this.clearPages_();
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
   * @type {Object.<?string, klokantech.jekylledit.AbstractPage>}
   * @private
   */
  this.pages_ = {};

  /**
   * @type {string|null|undefined}
   * @private
   */
  this.activePage_ = undefined;

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
  this.auth_ = new klokantech.jekylledit.Auth(this.repo_, this.content_);
  this.auth_.login(goog.bind(this.onLogin_, this));
};


/**
 * @private
 */
klokantech.jekylledit.Popup.prototype.onLogin_ = function() {
  var editBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Edit');
  goog.dom.append(this.nav_, editBtn);
  goog.events.listen(editBtn, goog.events.EventType.CLICK, function(e) {
    this.startPage_('editor/');
  }, false, this);

  this.auth_.sendRequest('site/' + this.repo_ + '/config',
      goog.bind(function(e) {
        var xhr = e.target;
        this.config_ = xhr.getResponseJson();

        goog.object.forEach(this.config_['metadata'], function(el, k) {
          var catBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
          'New: ' + k);
          goog.dom.appendChild(this.nav_, catBtn);
          var id = this.initEditor_(k);
          goog.events.listen(catBtn, goog.events.EventType.CLICK, function(e) {
            this.startPage_(id);
          }, false, this);
        }, this);

        if (this.editSource_) {
          var id;
          id = this.initEditor_(null, goog.bind(function() {
            this.startPage_(id);
          }, this));
        }

        // translations
        this.pages_['translations/'] = new klokantech.jekylledit.Translations(
            this.auth_, this.config_, this.repo_);
        var transBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
                                          'Trans');
        goog.dom.appendChild(this.nav_, transBtn);
        goog.events.listen(transBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('translations/');
        }, false, this);
      }, this));
};


/**
 * @private
 */
klokantech.jekylledit.Popup.prototype.clearPages_ = function() {
  goog.object.forEach(this.pages_, function(page, k) {
    page.loadClear();
  });
};


/**
 * @param {?string} category
 * @param {Function=} opt_cb
 * @return {string} id
 * @private
 */
klokantech.jekylledit.Popup.prototype.initEditor_ = function(category, opt_cb) {
  var id = 'editor/' + (category || '');
  var editor = this.pages_[id];
  if (!editor) {
    editor = new klokantech.jekylledit.Editor(
        this.auth_, this.config_, category,
        this.repo_, category == null ? this.path_ : undefined,
        category == null ? this.editSource_ : undefined,
        opt_cb);
    this.pages_[id] = editor;
  }
  return id;
};


/**
 * @param {string} id
 * @private
 */
klokantech.jekylledit.Popup.prototype.startPage_ = function(id) {
  if (!this.actions_.parentElement) {
    goog.dom.append(this.element_, this.actions_);
  }

  var page = this.pages_[id];
  if (page) {
    goog.dom.removeChildren(this.content_);
    goog.dom.appendChild(this.content_, page.getElement());
    page.start();
  }

  this.activePage_ = id;
};


/**
 * @param {boolean} visible
 */
klokantech.jekylledit.Popup.prototype.setVisible = function(visible) {
  if (visible) {
    if (this.editSource_) {
      this.startPage_('editor/');
    }
    goog.dom.appendChild(document.body, this.root_);
    document.body.style.overflow = 'hidden';
  } else {
    goog.dom.removeNode(this.root_);
    document.body.style.overflow = '';
  }
};
