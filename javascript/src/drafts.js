/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Drafts');

goog.require('goog.dom');
goog.require('klokantech.jekylledit.AbstractPage');
goog.require('klokantech.jekylledit.lang');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {string} repo
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Drafts = function(auth, config, repo) {
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
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-drafts');

  this.editor_ = null;

  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Drafts.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Drafts.prototype.start = function() {
  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Drafts.prototype.loadClear = function(opt_callback) {
  klokantech.jekylledit.utils.replaceWithSpinner(this.element_);

  this.editor_ = null;

  this.auth_.sendRequest('site/' + this.repo_ + '/drafts',
      goog.bind(function(e) {
        var xhr = e.target;
        var data = xhr.getResponseJson();

        goog.dom.removeChildren(this.element_);

        goog.object.forEach(data, function(draft, key) {
          var el = goog.dom.createDom(goog.dom.TagName.DIV, 'je-drafts-draft',
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-drafts-draft-title',
          draft['title']),
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-drafts-draft-file',
          draft['filename']),
          goog.dom.createDom(goog.dom.TagName.SPAN, 'je-drafts-draft-date',
          draft['date'])
          );

          goog.dom.appendChild(this.element_, el);

          goog.events.listen(el, goog.events.EventType.CLICK, function(e) {
            this.editor_ = new klokantech.jekylledit.Editor(
            this.auth_, this.config_, null,
            this.repo_, draft['filename'], undefined,
            goog.bind(function() {
              goog.dom.removeChildren(this.element_);
              goog.dom.appendChild(this.element_,
                                         this.editor_.getElement());
              this.editor_.start();
            }, this));
            e.preventDefault();
          }, false, this);
        }, this);

        if (!data.length) {
          goog.dom.appendChild(this.element_,
          goog.dom.createDom(goog.dom.TagName.DIV, 'je-drafts-empty',
              klokantech.jekylledit.lang.get('drafts_empty')));
        }

        if (opt_callback) {
          opt_callback();
        }
      }, this));
};


/** @inheritDoc */
klokantech.jekylledit.Drafts.prototype.save = function(opt_callback) {
  if (this.editor_) {
    this.editor_.save();
  }
};
