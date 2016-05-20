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
goog.require('klokantech.jekylledit.Drafts');
goog.require('klokantech.jekylledit.Editor');
goog.require('klokantech.jekylledit.Profile');
goog.require('klokantech.jekylledit.Translations');
goog.require('klokantech.jekylledit.lang');



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

  var saveBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
      klokantech.jekylledit.lang.get('popup_save'));
  var cancelBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
      klokantech.jekylledit.lang.get('popup_cancel'));
  goog.dom.append(this.actions_, cancelBtn, saveBtn);
  goog.events.listen(cancelBtn, goog.events.EventType.CLICK, function(e) {
    this.setVisible(false);
    this.clearPages_();
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

  /**
   * @type {!Element}
   * @private
   */
  this.userNav_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-user');

  goog.dom.append(this.element_, this.userNav_, this.nav_, this.content_);

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

  /**
   * @type {boolean}
   * @private
   */
  this.doesNeedClearLoad_ = false;
};


/**
 * @param {boolean} authorized
 * @private
 */
klokantech.jekylledit.Popup.prototype.onLogin_ = function(authorized) {
  var logoutBtn = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-btn je-btn-logout',
      klokantech.jekylledit.lang.get('popup_logout'));
  goog.events.listen(logoutBtn, goog.events.EventType.CLICK, function(e) {
    goog.dom.removeChildren(this.userNav_);
    goog.dom.removeChildren(this.nav_);
    goog.dom.removeChildren(this.content_);
    goog.dom.removeNode(this.actions_);
    this.doesNeedClearLoad_ = true;
    this.auth_.logout(goog.bind(function() {
      this.auth_.login(goog.bind(this.onLogin_, this));
    }, this));
  }, false, this);
  var userString = this.auth_.getUserEmail();
  if (this.auth_.getUserName().length) {
    userString = this.auth_.getUserName() + ' <' + userString + '>';
  }
  if (this.auth_.getUserRoles().length > 0) {
    userString += ' [' + this.auth_.getUserRoles().join(', ') + ']';
  }
  goog.dom.append(this.userNav_, userString, logoutBtn);

  if (!authorized) {
    return;
  }

  var editBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn je-btn-edit',
      klokantech.jekylledit.lang.get('popup_btn_edit'));
  goog.dom.append(this.nav_, editBtn);
  goog.events.listen(editBtn, goog.events.EventType.CLICK, function(e) {
    this.startPage_('editor/');
  }, false, this);

  this.auth_.sendRequest('site/' + this.repo_ + '/config',
      goog.bind(function(e) {
        var xhr = e.target;
        this.config_ = xhr.getResponseJson();

        goog.object.forEach(this.config_['categories'], function(el, k) {
          var label = klokantech.jekylledit.lang.get('popup_btn_newx') +
                      klokantech.jekylledit.lang.getFrom(
                          el['label'], this.config_['languages']);
          var content = el['symbol'] || label;
          var catBtn = goog.dom.createDom(goog.dom.TagName.DIV, {
            'class': 'je-btn je-btn-newx',
            'title': label
          });
          catBtn.innerHTML = content;
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
        var transBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-trans',
            klokantech.jekylledit.lang.get('popup_btn_trans'));
        goog.dom.appendChild(this.nav_, transBtn);
        goog.events.listen(transBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('translations/');
        }, false, this);

        // profile
        this.pages_['profile/'] = new klokantech.jekylledit.Profile(
            this.auth_, this.config_, this.repo_);
        var profBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-profile',
            klokantech.jekylledit.lang.get('popup_btn_profile'));
        goog.dom.appendChild(this.nav_, profBtn);
        goog.events.listen(profBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('profile/');
        }, false, this);

        // drafts
        this.pages_['drafts/'] = new klokantech.jekylledit.Drafts(
            this.auth_, this.config_, this.repo_);
        var draftBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-drafts',
            klokantech.jekylledit.lang.get('popup_btn_drafts'));
        goog.dom.appendChild(this.nav_, draftBtn);
        goog.events.listen(draftBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('drafts/');
        }, false, this);

        if (this.doesNeedClearLoad_) {
          this.clearPages_();
        }
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
  } else {
    if (opt_cb) {
      setTimeout(opt_cb, 0);
    }
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
    if (this.editSource_ && this.config_) {
      this.startPage_('editor/');
    }
    goog.dom.appendChild(document.body, this.root_);
    document.body.style.overflow = 'hidden';
  } else {
    goog.dom.removeNode(this.root_);
    document.body.style.overflow = '';
  }
};
