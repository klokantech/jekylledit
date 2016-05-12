/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Translations');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('klokantech.jekylledit.AbstractPage');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {string} repo
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Translations = function(auth, config, repo) {
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
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-translations');

  /**
   * @type {!Element}
   * @private
   */
  this.table_ = goog.dom.createDom(goog.dom.TagName.TABLE,
                                   'je-translations-table');

  goog.dom.appendChild(this.element_, this.table_);

  /**
   * @type {!Object.<string, !Object.<string, !HTMLInputElement>>}
   * @private
   */
  this.inputs_ = {};

  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Translations.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Translations.prototype.start = function() {};


/** @inheritDoc */
klokantech.jekylledit.Translations.prototype.loadClear =
    function(opt_callback) {
  goog.dom.removeChildren(this.table_);

  var langs = this.config_['languages'] || [];

  var header = goog.dom.createDom(goog.dom.TagName.TR, undefined,
      goog.dom.createDom(goog.dom.TagName.TH, undefined, ''));
  goog.array.forEach(langs, function(lang) {
    goog.dom.appendChild(header,
        goog.dom.createDom(goog.dom.TagName.TH, undefined, lang));
  });
  goog.dom.appendChild(this.table_, header);

  this.auth_.sendRequest('site/' + this.repo_ + '/translations',
      goog.bind(function(e) {
        var xhr = e.target;
        var data = xhr.getResponseJson();
        goog.object.forEach(data, function(el, key) {
          this.inputs_[key] = {};
          var row = goog.dom.createDom(goog.dom.TagName.TR, undefined,
          goog.dom.createDom(goog.dom.TagName.TH, undefined, key));
          goog.array.forEach(langs, function(lang) {
            var input = goog.dom.createDom(goog.dom.TagName.INPUT, {
              type: 'text',
              value: el[lang] || ''
            });
            this.inputs_[key][lang] = /** @type {!HTMLInputElement} */(input);
            goog.dom.appendChild(row,
                goog.dom.createDom(goog.dom.TagName.TD, undefined, input));
          }, this);
          goog.dom.appendChild(this.table_, row);
        }, this);

        if (opt_callback) {
          opt_callback();
        }
      }, this));
};


/** @inheritDoc */
klokantech.jekylledit.Translations.prototype.save = function(opt_callback) {
  var result = {};

  goog.object.forEach(this.inputs_, function(row, key) {
    result[key] = {};
    goog.object.forEach(row, function(input, lang) {
      result[key][lang] = input.value || '';
    });
  }, this);

  this.auth_.sendRequest('site/' + this.repo_ + '/translations',
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
