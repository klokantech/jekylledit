/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.utils');

goog.require('goog.dom');
goog.require('goog.net.jsloader');


/**
 * @type {!Object.<string, *>}
 * @private
 */
klokantech.jekylledit.utils.installed_ = {};


/**
 * @param {string} url
 */
klokantech.jekylledit.utils.installStyle = function(url) {
  if (klokantech.jekylledit.utils.installed_[url]) return;

  goog.dom.append(/** @type {!Node} */(document.head),
      goog.dom.createDom('link', {
        href: url,
        rel: 'stylesheet'
      }));

  klokantech.jekylledit.utils.installed_[url] = true;
};


/**
 * @param {string} url
 * @param {Function=} opt_callback
 */
klokantech.jekylledit.utils.installScript = function(url, opt_callback) {
  var olderDef = klokantech.jekylledit.utils.installed_[url];
  if (olderDef) {
    if (opt_callback) {
      if (olderDef.hasFired()) {
        opt_callback();
      } else {
        olderDef.addBoth(opt_callback);
      }
    }
    return;
  }

  var deferred = goog.net.jsloader.load(url);
  klokantech.jekylledit.utils.installed_[url] = deferred;
  if (opt_callback) {
    deferred.addBoth(opt_callback);
  }
};


/**
 * Clone all child nodes from origin to destination.
 * @param {Node} origin
 * @param {Node} destination
 */
klokantech.jekylledit.utils.cloneNodes = function(origin, destination) {
  if (origin && destination) {
    goog.dom.removeChildren(destination);
    goog.array.forEach(goog.dom.getChildren(/** @type {Element} */(origin)),
        function(el) {
          if (destination) {
            goog.dom.append(destination, el.cloneNode(true));
          }
        });
  }
};
