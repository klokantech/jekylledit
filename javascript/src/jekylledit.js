/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.JekyllEdit');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('klokantech.jekylledit.Popup');
goog.require('klokantech.jekylledit.utils');



/**
 * @constructor
 */
klokantech.jekylledit.JekyllEdit = function() {
  this.popup_ = null;
};
goog.addSingletonGetter(klokantech.jekylledit.JekyllEdit);


/**
 */
klokantech.jekylledit.JekyllEdit.prototype.initPopup = function() {
  if (!this.popup_) {
    this.popup_ = new klokantech.jekylledit.Popup();
  }
  this.popup_.setVisible(true);
  this.popup_.setEditableContent(
      goog.dom.getElement('article') //TODO
  );
};


/**
 * @param {!Element} btn
 */
klokantech.jekylledit.JekyllEdit.prototype.setAdminBtn = function(btn) {
  goog.events.listen(btn, goog.events.EventType.CLICK, function(e) {
    this.initAdmin();
  }, false, this);
};


/**
 */
klokantech.jekylledit.JekyllEdit.prototype.initAdmin = function() {
  klokantech.jekylledit.utils.installStyle('../styles/jekylledit.css'); //TODO
  this.initPopup();
};


/**
 */
klokantech.jekylledit.JekyllEdit.decorate = function() {
  var adminBtn = goog.dom.getElement('jekylledit-admin-btn');
  if (adminBtn) {
    var instance = klokantech.jekylledit.JekyllEdit.getInstance();
    instance.setAdminBtn(adminBtn);
  }
};


goog.events.listen(window, goog.events.EventType.LOAD, function(e) {
  klokantech.jekylledit.JekyllEdit.decorate();
});
