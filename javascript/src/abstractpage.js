/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.AbstractPage');



/**
 * @interface
 */
klokantech.jekylledit.AbstractPage = function() {};


/**
 * @return {Element}
 */
klokantech.jekylledit.AbstractPage.prototype.getElement = goog.abstractMethod;


/**
 * @param {Function=} opt_callback when ready
 */
klokantech.jekylledit.AbstractPage.prototype.loadClear = goog.abstractMethod;


/**
 */
klokantech.jekylledit.AbstractPage.prototype.start = goog.abstractMethod;


/**
 * @param {function(boolean)=} opt_callback when done
 */
klokantech.jekylledit.AbstractPage.prototype.save = goog.abstractMethod;
