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
goog.require('klokantech.jekylledit.Dashboard');
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

  /**
   * @type {!Element}
   * @private
   */
  this.saveBtn_ = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-btn je-btn-save', klokantech.jekylledit.lang.get('popup_save'));

  /**
   * @type {!Element}
   * @private
   */
  this.cancelBtn_ = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-btn je-btn-cancel', klokantech.jekylledit.lang.get('popup_cancel'));

  /**
   * @type {!Element}
   * @private
   */
  this.removeBtn_ = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-btn je-btn-remove', klokantech.jekylledit.lang.get('popup_remove'));

  /**
   * @type {!Element}
   * @private
   */
  this.specialBtn_ = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-btn je-btn-special', '');

  goog.dom.append(this.actions_, this.cancelBtn_,
                  this.removeBtn_, this.saveBtn_, this.specialBtn_);

  goog.events.listen(this.cancelBtn_, goog.events.EventType.CLICK, function(e) {
    this.setVisible(false);
    this.clearPages_();
  }, false, this);
  goog.events.listen(this.saveBtn_, goog.events.EventType.CLICK, function(e) {
    if (goog.isDef(this.activePage_)) {
      var page = this.pages_[this.activePage_];
      if (page) {
        goog.dom.classlist.add(this.element_, 'je-saving');
        page.save(goog.bind(function(success) {
          goog.dom.classlist.remove(this.element_, 'je-saving');
          if (success) {
            this.setVisible(false);
            this.doesNeedClearLoad_ = true;
          }
        }, this));
      }
    }
  }, false, this);
  goog.events.listen(this.removeBtn_, goog.events.EventType.CLICK, function(e) {
    if (goog.isDef(this.activePage_)) {
      var page = this.pages_[this.activePage_];
      if (page) {
        page.remove(goog.bind(function(success) {
          if (success) {
            this.setVisible(false);
            this.doesNeedClearLoad_ = true;
          }
        }, this));
      }
    }
  }, false, this);
  goog.events.listen(this.specialBtn_, goog.events.EventType.CLICK,
      function(e) {
        if (goog.isDef(this.activePage_)) {
          var page = this.pages_[this.activePage_];
          if (page) {
            goog.dom.classlist.add(this.element_, 'je-special-working');
            page.special(goog.bind(function(success) {
              goog.dom.classlist.remove(this.element_, 'je-special-working');
              if (success) {
                this.setVisible(false);
                this.doesNeedClearLoad_ = true;
              }
            }, this));
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

  goog.dom.append(this.element_, this.userNav_, this.nav_,
                  this.content_, this.actions_);

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
   * @type {Object.<?string, Element>}
   * @private
   */
  this.pageBtns_ = {};

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

  this.updateValidActions_();
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
    this.activePage_ = undefined;
    this.doesNeedClearLoad_ = true;
    this.config_ = null;
    this.auth_.logout(goog.bind(function() {
      this.auth_.login(goog.bind(this.onLogin_, this));
    }, this));

    this.updateValidActions_();
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

  this.auth_.sendRequest('site/' + this.repo_ + '/config',
      goog.bind(function(e) {
        var xhr = e.target;
        this.config_ = xhr.getResponseJson();

        // dashboard
        this.pages_['dash/'] = new klokantech.jekylledit.Dashboard(
            this.auth_, this.config_, this.repo_, goog.bind(function(cat) {
              this.startPage_('editor/' + (cat || ''));
            }, this), goog.bind(this.updateValidActions_, this));
        var dashBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-dash',
            klokantech.jekylledit.lang.get('popup_btn_dash'));
        this.pageBtns_['dash/'] = dashBtn;
        goog.dom.appendChild(this.nav_, dashBtn);
        goog.events.listen(dashBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('dash/');
        }, false, this);

        if (this.editSource_) {
          var id;
          id = this.initEditor_(null, goog.bind(function() {
            this.startPage_(id);
          }, this));

          var editBtn = goog.dom.createDom(goog.dom.TagName.DIV,
              'je-btn je-btn-edit',
              klokantech.jekylledit.lang.get('popup_btn_edit'));
          this.pageBtns_['editor/'] = editBtn;
          goog.dom.append(this.nav_, editBtn);
          goog.events.listen(editBtn, goog.events.EventType.CLICK, function(e) {
            this.startPage_('editor/');
          }, false, this);
        } else {
          this.startPage_('dash/');
        }

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
          this.pageBtns_[id] = catBtn;
          goog.events.listen(catBtn, goog.events.EventType.CLICK, function(e) {
            this.startPage_(id);
          }, false, this);
        }, this);

        // translations
        this.pages_['translations/'] = new klokantech.jekylledit.Translations(
            this.auth_, this.config_, this.repo_);
        var transBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-trans',
            klokantech.jekylledit.lang.get('popup_btn_trans'));
        this.pageBtns_['translations/'] = transBtn;
        goog.dom.appendChild(this.nav_, transBtn);
        goog.events.listen(transBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('translations/');
        }, false, this);

        // profile
        this.pages_['profile/'] = new klokantech.jekylledit.Profile(
            this.auth_, this.config_, this.repo_,
            goog.bind(this.updateValidActions_, this));
        var profBtn = goog.dom.createDom(goog.dom.TagName.DIV,
            'je-btn je-btn-profile',
            klokantech.jekylledit.lang.get('popup_btn_profile'));
        this.pageBtns_['profile/'] = profBtn;
        goog.dom.appendChild(this.nav_, profBtn);
        goog.events.listen(profBtn, goog.events.EventType.CLICK, function(e) {
          this.startPage_('profile/');
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
  this.doesNeedClearLoad_ = false;
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
  if (!this.saveBtn_.parentElement) {
    goog.dom.append(this.actions_, this.saveBtn_);
  }

  var page = this.pages_[id];
  if (page) {
    goog.dom.removeChildren(this.content_);
    goog.dom.appendChild(this.content_, page.getElement());
    page.start();
  }

  var activeBtn = this.root_.querySelector('.je-btn-active');
  if (activeBtn) {
    goog.dom.classlist.remove(activeBtn, 'je-btn-active');
  }
  if (this.pageBtns_[id]) {
    goog.dom.classlist.add(this.pageBtns_[id], 'je-btn-active');
  }

  this.activePage_ = id;

  this.updateValidActions_();
};


/**
 * @private
 */
klokantech.jekylledit.Popup.prototype.updateValidActions_ = function() {
  var page = this.pages_[this.activePage_ || null];
  var ops = page ? page.getValidOps() : {cancel: true};
  goog.style.setElementShown(this.cancelBtn_, !!ops.cancel);
  goog.style.setElementShown(this.saveBtn_, !!ops.save);
  goog.style.setElementShown(this.specialBtn_, !!ops.special);
  goog.style.setElementShown(this.removeBtn_, !!ops.remove);

  goog.dom.setTextContent(this.specialBtn_,
                          goog.isString(ops.special) ? ops.special : '');
};


/**
 * @param {boolean} visible
 */
klokantech.jekylledit.Popup.prototype.setVisible = function(visible) {
  if (visible) {
    if (this.doesNeedClearLoad_) {
      this.clearPages_();
    }
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
