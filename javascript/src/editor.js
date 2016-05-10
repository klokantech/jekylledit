/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Editor');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('klokantech.jekylledit.Auth');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {?string} type
 * @param {string} repo
 * @param {string=} opt_path
 * @param {Node=} opt_content
 * @param {Function=} opt_callback when ready
 * @constructor
 */
klokantech.jekylledit.Editor = function(auth, config, type, repo,
                                        opt_path, opt_content, opt_callback) {
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
   * @type {?string}
   * @private
   */
  this.type_ = type;

  /**
   * @type {string}
   * @private
   */
  this.repo_ = repo;

  /**
   * @type {?string}
   * @private
   */
  this.path_ = opt_path || null;

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor');

  /**
   * @type {!Element}
   * @private
   */
  this.content_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-content');

  /**
   * @type {!Element}
   * @private
   */
  this.side_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-side');

  goog.dom.append(this.element_, this.content_, this.side_);

  /**
   * @type {Object}
   * @private
   */
  this.editor_ = null;

  /**
   * @type {!Object.<string, boolean>}
   * @private
   */
  this.inlineFields_ = {};

  /**
   * @type {Node}
   * @private
   */
  this.editSource_ = opt_content || null;

  /**
   * @type {Object}
   * @private
   */
  this.postData_ = null;

  this.loadClearData(opt_callback);
};


/**
 * @define {string} Selector to find editable fields.
 */
klokantech.jekylledit.Editor.EDITABLES_SELECTOR =
    '.je-editor [data-jekylledit-source]';


/**
 * @define {string} Default empty content.
 */
klokantech.jekylledit.Editor.DEFAULT_EMPTY_CONTENT =
    '<h1 data-jekylledit-source="title">Title</h1>' +
    '<div data-jekylledit-source="content">Content</div>';


/**
 * @return {Element}
 */
klokantech.jekylledit.Editor.prototype.getElement = function() {
  return this.element_;
};


/**
 * @param {Function=} opt_callback when ready
 */
klokantech.jekylledit.Editor.prototype.loadClearData = function(opt_callback) {
  if (this.path_) {
    if (this.editSource_) {
      klokantech.jekylledit.utils.cloneNodes(this.editSource_, this.content_);
    }
    this.auth_.sendRequest(
        this.repo_ + '/edit/' + this.path_,
        goog.bind(function(e) {
          var xhr = e.target;
          var data = xhr.getResponseJson();
          this.postData_ = data;

          this.type_ = data['type'];

          if (opt_callback) {
            opt_callback();
          }
        }, this));
  } else {
    this.content_.innerHTML =
        (this.config_['metadata'][this.type_] || {})['empty_content'] ||
        klokantech.jekylledit.Editor.DEFAULT_EMPTY_CONTENT;
    this.postData_ = {};
    if (opt_callback) {
      opt_callback();
    }
  }
};


/**
 */
klokantech.jekylledit.Editor.prototype.start = function() {
  this.startEditor_();
  this.initSidebar_();
};


/**
 * @private
 */
klokantech.jekylledit.Editor.prototype.initSidebar_ = function() {
  goog.dom.removeChildren(this.side_);

  var fields = (this.config_['metadata'][this.type_] || {})['fields'] || {};

  goog.object.forEach(fields, function(el, k) {
    var label = goog.dom.createDom(goog.dom.TagName.LABEL, {}, k + ':');
    var inputValue = (this.postData_[k] || el['value']).toString();
    if (this.inlineFields_[k]) {
      var value = goog.dom.createDom(goog.dom.TagName.SPAN,
                                     'je-editor-editableinline', inputValue);
      goog.dom.append(this.side_, label, value);
    } else {
      var inputType = 'text';
      if (el['type'] == 'datetime') {
        inputType = 'datetime-local';
        inputValue = inputValue.split('-').slice(0, 3).join('-');
      }
      var dataInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
        type: inputType,
        value: inputValue
      });
      el['_je_input'] = dataInput;
      goog.dom.append(this.side_, label, dataInput);
    }
  }, this);

  goog.object.forEach(this.postData_, function(el, k) {
    if (!fields[k]) {
      var label = goog.dom.createDom(goog.dom.TagName.LABEL, {}, k + ':');
      var dataInput = goog.dom.createDom(goog.dom.TagName.DIV, {},
          this.postData_[k].toString());
      goog.dom.append(this.side_, label, dataInput);
    }
  }, this);
};


/**
 * @private
 */
klokantech.jekylledit.Editor.prototype.startEditor_ = function() {
  var fields = (this.config_['metadata'][this.type_] || {})['fields'] || {};

  var editables = document.querySelectorAll(
      klokantech.jekylledit.Editor.EDITABLES_SELECTOR);
  goog.array.forEach(editables, function(editable) {
    var sourceType = editable.getAttribute('data-jekylledit-source');
    // wysiwyg for content, simple contentEditable for the rest
    if (sourceType == 'content') {
      klokantech.jekylledit.utils.installStyle(
          'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
          '5.16.1/css/medium-editor.min.css');
      klokantech.jekylledit.utils.installStyle(
          'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
          '5.16.1/css/themes/default.min.css');
      klokantech.jekylledit.utils.installScript(
          'https://cdnjs.cloudflare.com/ajax/libs/to-markdown/' +
          '3.0.0/to-markdown.min.js');
      klokantech.jekylledit.utils.installScript(
          'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
          '5.16.1/js/medium-editor.min.js', goog.bind(function() {
            if (this.editor_) {
              this.editor_['destroy']();
            }
            this.editor_ = new goog.global['MediumEditor'](
            '.je-editor [data-jekylledit-source="content"]',
            {
              'toolbar': {
                'buttons': [
                  'bold', 'italic', 'underline', 'orderedlist', 'unorderedlist',
                  'anchor', 'h2', 'h3', 'removeFormat'
                ]
              }
            });
          }, this));
    } else {
      var fieldDescription = fields[sourceType];
      if (fieldDescription) {
        editable.contentEditable = true;

        // HOOK to allow only simple text (no newlines, no pasting)
        goog.events.listen(editable, goog.events.EventType.INPUT, function(e) {
          if (goog.dom.getChildren(editable).length > 0) {
            var textContent = editable.textContent;
            editable.innerHTML = '';
            editable.textContent = textContent;
          }
        });
      } else {
        editable.removeAttribute('data-jekylledit-source');
      }
    }
    this.inlineFields_[sourceType] = true;
  }, this);
};


/**
 */
klokantech.jekylledit.Editor.prototype.save = function() {
  var result = {};

  var fields = (this.config_['metadata'][this.type_] || {})['fields'] || {};

  goog.object.forEach(fields, function(el, k) {
    var dataInput = el['_je_input'];
    if (dataInput) {
      result[k] = dataInput.value;
    }
  }, this);

  var editables = document.querySelectorAll(
      klokantech.jekylledit.Editor.EDITABLES_SELECTOR);

  goog.array.forEach(editables, function(editable) {
    var valueToBeSaved = '';
    var sourceType = editable.getAttribute('data-jekylledit-source');
    if (sourceType == 'content') {
      valueToBeSaved = goog.global['toMarkdown'](editable.innerHTML);
    } else {
      valueToBeSaved = editable.textContent;
    }
    if (this.editSource_) {
      klokantech.jekylledit.utils.cloneNodes(this.content_, this.editSource_);
    }
    result[sourceType] = valueToBeSaved;
  }, this);

  console.log(this.path_ || ('new ' + this.type_), result);
};
