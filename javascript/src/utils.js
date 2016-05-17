/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.utils');

goog.require('goog.array');
goog.require('goog.dom');
goog.require('goog.net.jsloader');
goog.require('kt.MultiComplete');


/**
 * @type {string} Base path where to load other resources.
 */
klokantech.jekylledit.BASE_URL = goog.DEBUG ? 'http://localhost:8000/' :
                                 'http://jekylledit.klokantech.com/';


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


/**
 * @param {Object.<string, *>} field
 * @param {?*} currentValue
 * @param {Node} parent
 * @return {function(): *} Value getter
 */
klokantech.jekylledit.utils.createField =
    function(field, currentValue, parent) {
  var type = field['type'];
  var value = currentValue || field['value'];
  if (type == 'datetime') {
    var dataInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      type: 'datetime-local',
      value: value.split('-').slice(0, 3).join('-')
    });
    goog.dom.appendChild(parent, dataInput);
    return function() { return dataInput.value; };
  } else if (type == 'boolean') {
    var dataInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      type: 'checkbox',
      checked: value
    });
    goog.dom.appendChild(parent, dataInput);
    return function() { return dataInput.checked; };
  } else if (type == 'select') {
    var select = goog.dom.createDom(goog.dom.TagName.SELECT);
    goog.array.forEach(
        /** @type {Array} */(field['values']) || [], function(opt) {
          goog.dom.appendChild(select,
          goog.dom.createDom(goog.dom.TagName.OPTION, {
            value: opt
          }, opt));
        });
    select.value = value;
    goog.dom.appendChild(parent, select);
    return function() { return select.value; };
  } else if (type == 'multichoice') {
    var span = goog.dom.createDom(goog.dom.TagName.SPAN, 'je-multichoice');
    var mc = new kt.MultiComplete(
        span, /** @type {Array} */(field['values']) || [], undefined, true);
    goog.array.forEach(/** @type {Array} */(value) || [], function(opt) {
      mc.addValue(opt);
    });
    goog.dom.appendChild(parent, span);
    return function() { return mc.getValues(); };
  } else {
    var dataInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      type: 'text',
      value: value.toString()
    });
    goog.dom.appendChild(parent, dataInput);
    return function() { return dataInput.value; };
  }
};


/**
 * Gets localized label value based on language preference and available langs.
 * @param {string|Object.<string, string>} label
 * @param {string} lang
 * @param {Array.<string>} langs
 * @return {string}
 */
klokantech.jekylledit.utils.getLocalized = function(label, lang, langs) {
  if (goog.isString(label)) {
    return label;
  } else {
    if (label[lang]) {
      return label[lang];
    } else {
      return goog.array.find(langs, function(el) {
        return !!label[el];
      }) || '';
    }
  }
};
