/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Dashboard');

goog.require('goog.dom');
goog.require('klokantech.jekylledit.AbstractPage');
goog.require('klokantech.jekylledit.lang');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {string} repo
 * @param {function(string)} catStarter
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Dashboard = function(auth, config, repo, catStarter) {
  /**
   * @type {klokantech.jekylledit.Auth}
   * @private
   */
  this.auth_ = auth;

  /**
   * @type {Object}
   * @private
   */
  this.config_ = config;

  /**
   * @type {string}
   * @private
   */
  this.repo_ = repo;

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-dash');

  /**
   * @type {!Element}
   * @private
   */
  this.drafts_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-dash-drafts');

  goog.dom.appendChild(this.element_,
      goog.dom.createDom(goog.dom.TagName.H2, undefined,
      klokantech.jekylledit.lang.get('dash_create_new')));

  goog.object.forEach(this.config_['categories'], function(el, k) {
    var label = klokantech.jekylledit.lang.getFrom(
                    el['label'], this.config_['languages']);
    var symbol = el['symbol'];
    var catBtn = goog.dom.createDom(goog.dom.TagName.DIV, {
      'class': 'je-dash-new',
      'title': label
    }, label);
    if (symbol) {
      goog.dom.insertChildAt(catBtn,
          goog.dom.createDom(goog.dom.TagName.SPAN,
              'je-dash-new-symbol', symbol),
          0);
    }
    goog.dom.appendChild(this.element_, catBtn);
    goog.events.listen(catBtn, goog.events.EventType.CLICK, function(e) {
      catStarter(k);
    }, false, this);
  }, this);

  goog.dom.append(this.element_,
      goog.dom.createDom(goog.dom.TagName.H2, undefined,
      klokantech.jekylledit.lang.get('dash_drafts')),
      this.drafts_);

  this.editor_ = null;

  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Dashboard.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Dashboard.prototype.start = function() {
  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Dashboard.prototype.loadClear = function(opt_callback) {
  klokantech.jekylledit.utils.replaceWithSpinner(this.drafts_);

  this.editor_ = null;

  this.auth_.sendRequest('site/' + this.repo_ + '/drafts',
      goog.bind(function(e) {
        var xhr = e.target;
        var data = xhr.getResponseJson();

        goog.dom.removeChildren(this.drafts_);

        goog.object.forEach(data, function(draft, key) {
          var el = goog.dom.createDom(goog.dom.TagName.DIV, 'je-dash-draft',
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-dash-draft-title',
          draft['title']),
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-dash-draft-file',
          draft['filename']),
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-dash-draft-date',
          draft['date'])
          );

          goog.dom.appendChild(this.drafts_, el);

          goog.events.listen(el, goog.events.EventType.CLICK, function(e) {
            this.editor_ = new klokantech.jekylledit.Editor(
            this.auth_, this.config_, null,
            this.repo_, draft['filename'], undefined,
            goog.bind(function() {
              goog.dom.removeChildren(this.drafts_);
              goog.dom.appendChild(this.drafts_,
                                         this.editor_.getElement());
              this.editor_.start();
            }, this));
            e.preventDefault();
          }, false, this);
        }, this);

        if (!data.length) {
          goog.dom.appendChild(this.drafts_,
          goog.dom.createDom(goog.dom.TagName.DIV, 'je-dashboard-empty',
              klokantech.jekylledit.lang.get('dash_drafts_empty')));
        }

        if (opt_callback) {
          opt_callback();
        }
      }, this));
};


/** @inheritDoc */
klokantech.jekylledit.Dashboard.prototype.save = function(opt_callback) {
  if (this.editor_) {
    this.editor_.save(opt_callback);
  } else {
    if (opt_callback) {
      opt_callback(false);
    }
  }
};
