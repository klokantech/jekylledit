/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Profile');

goog.require('goog.dom');
goog.require('klokantech.jekylledit.AbstractPage');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {string} repo
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Profile = function(auth, config, repo) {
  /**
   * @type {string}
   * @private
   */
  this.lang_ = 'en';

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
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-profile');

  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.start = function() {
  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.loadClear = function(opt_callback) {
  goog.dom.removeChildren(this.element_);

  var fields = (this.config_['profile'] || {})['fields'] || {};

  goog.object.forEach(fields, function(el, k) {
    var label = klokantech.jekylledit.utils.getLocalized(
                    el['label'], this.lang_, this.config_['languages']);
    var labelEl = goog.dom.createDom(goog.dom.TagName.LABEL, undefined,
                                     (label || k) + ':');
    goog.dom.appendChild(this.element_, labelEl);
    el['_je_getval'] = klokantech.jekylledit.utils.createField(
                           el, '', this.element_); //TODO: value
  }, this);

  if (opt_callback) {
    opt_callback();
  }
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.save = function(opt_callback) {
  var result = {
    'profile': {}
  };

  var fields = (this.config_['profile'] || {})['fields'] || {};

  goog.object.forEach(fields, function(el, k) {
    var valueGetter = el['_je_getval'];
    if (valueGetter) {
      result['profile'][k] = valueGetter();
    }
  }, this);

  this.auth_.sendRequest('site/' + this.repo_ + '/profile',
      goog.bind(function(e) {
        alert('Changes saved!');
        if (opt_callback) {
          opt_callback();
        }
      }, this), 'PUT', JSON.stringify(result), {
        'content-type': 'application/json'
      }
  );
};
