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
goog.require('klokantech.jekylledit.utils');



/**
 * @constructor
 */
klokantech.jekylledit.Popup = function() {
  /**
   * @type {!Element}
   * @private
   */
  this.content_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-content');

  /**
   * @type {?Element}
   * @private
   */
  this.actions_ = null;

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup');

  goog.dom.appendChild(this.element_, this.content_);

  /**
   * @type {!Element}
   * @private
   */
  this.root_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-popup-bg',
                                  this.element_);


  var saveBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Save');
  var cancelBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn', 'Cancel');
  this.appendActions(cancelBtn, saveBtn);
  goog.events.listen(cancelBtn, goog.events.EventType.CLICK, function(e) {
    this.setVisible(false);
  }, false, this);
  goog.events.listen(saveBtn, goog.events.EventType.CLICK, function(e) {
    this.save();
  }, false, this);

  /**
   * @type {Object}
   * @private
   */
  this.editor_ = null;

  /**
   * @type {Node}
   * @private
   */
  this.editSource_ = null;
};


/**
 * @param {boolean} visible
 */
klokantech.jekylledit.Popup.prototype.setVisible = function(visible) {
  if (visible) {
    goog.dom.appendChild(document.body, this.root_);
    document.body.style.overflow = 'hidden';
  } else {
    goog.dom.removeNode(this.root_);
    document.body.style.overflow = '';
  }
};


/**
 * @param {...goog.dom.Appendable} var_args The things to append to the content.
 */
klokantech.jekylledit.Popup.prototype.append = function(var_args) {
  goog.dom.append(this.content_, arguments);
};


/**
 * @param {...goog.dom.Appendable} var_args The things to append to the actions.
 */
klokantech.jekylledit.Popup.prototype.appendActions = function(var_args) {
  if (!this.actions_) {
    this.actions_ = goog.dom.createDom(goog.dom.TagName.DIV,
                                       'je-popup-actions');
    goog.dom.appendChild(this.element_, this.actions_);
  }
  goog.dom.append(this.actions_, arguments);
};


/**
 * @param {Node} content
 */
klokantech.jekylledit.Popup.prototype.setEditableContent = function(content) {
  this.editSource_ = content;
  klokantech.jekylledit.utils.cloneNodes(this.editSource_, this.content_);
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
        goog.dom.getElementsByTagNameAndClass(
        undefined, 'editable', this.content_),
        {
          'toolbar': {
            'buttons': [
              'bold', 'italic', 'underline', 'orderedlist', 'unorderedlist',
              'anchor', 'h2', 'h3', 'removeFormat'
            ]
          }
        });
      }, this));
};


/**
 */
klokantech.jekylledit.Popup.prototype.save = function() {
  var editables = goog.dom.getElementsByTagNameAndClass(
                      undefined, 'editable', this.content_);

  goog.array.forEach(editables, function(el) {
    var md = goog.global['toMarkdown'](el.innerHTML);
    console.log(el.getAttribute('data-jekylledit-source'), md);
    klokantech.jekylledit.utils.cloneNodes(this.content_, this.editSource_);
    this.setVisible(false);
  }, this);
};
