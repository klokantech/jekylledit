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
 * @param {string} repo
 * @param {string} path
 */
klokantech.jekylledit.JekyllEdit.prototype.initPopup = function(repo, path) {
  if (!this.popup_) {
    this.popup_ = new klokantech.jekylledit.Popup(
        repo, path, document.querySelector('[data-jekylledit-root]'));
  }
  this.popup_.setVisible(true);
};


/**
 * @param {!Element} btn
 */
klokantech.jekylledit.JekyllEdit.prototype.setAdminBtn = function(btn) {
  var repo = btn.getAttribute('data-jekylledit-repo');
  var path = btn.getAttribute('data-jekylledit-path');
  goog.events.listen(btn, goog.events.EventType.CLICK, function(e) {
    klokantech.jekylledit.utils.installStyle(
        klokantech.jekylledit.BASE_URL + 'styles/jekylledit.css');
    this.initPopup(repo, path);
  }, false, this);
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
