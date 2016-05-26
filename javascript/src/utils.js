/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.utils');

goog.require('goog.array');
goog.require('goog.crypt.Md5');
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
 * @param {Node} element
 */
klokantech.jekylledit.utils.replaceWithSpinner = function(element) {
  goog.dom.removeChildren(element);
  goog.dom.appendChild(element,
                       goog.dom.createDom(goog.dom.TagName.DIV, 'je-spinner'));
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
  var value = goog.isDefAndNotNull(currentValue) ?
              currentValue : field['value'];
  if (type == 'datetime') {
    if (value == 'now') {
      var now = new Date();
      value = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
          .toISOString().substring(0, 16);
    } else {
      value = value.split('-').slice(0, 3).join('-');
    }
    var dataInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      type: 'datetime-local',
      value: value
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
  } else if (type == 'media') {
    var file = goog.dom.createDom(goog.dom.TagName.INPUT, {
      'type': 'file',
      'accept': 'image/*',
      'class': 'je-mediaupload'
    });
    var fieldValue = value;
    var preview = goog.dom.createDom(goog.dom.TagName.IMG, {
                    'class': 'je-mediaupload-preview',
                    'src': value,
                    'alt': value
                  });
    var filereader = new FileReader();
    filereader.onload = function(e) {
      preview.src = fieldValue = filereader.result;
      preview.alt = '';
    };

    goog.events.listen(file, goog.events.EventType.CHANGE, function(e) {
      if (file.files && file.files[0]) {
        var f = file.files[0];
        if (f.size > 5 * 1024 * 1024) {
          alert('Maximum file size is 5 MB!');
          e.preventDefault();
        } else {
          filereader.readAsDataURL(file.files[0]);
        }
      }
    });
    if (parent) {
      goog.dom.append(parent, file, preview);
    }
    return function() { return fieldValue; };
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
 * @type {RegExp}
 */
klokantech.jekylledit.utils.BASE64_IMAGE_REGEXP =
    /([\'\"]?)(data:image\/(\w+);base64,([A-Za-z0-9+\/=\s]+))\1/g;


/**
 * @typedef {string|Object.<string, klokantech.jekylledit.utils.Extractable>}
 */
klokantech.jekylledit.utils.Extractable;


/**
 * Deduplicates inline base64 images.
 * @param {klokantech.jekylledit.utils.Extractable} lookIn
 * @param {Object} extracted
 * @param {string} mediaPath
 * @param {goog.crypt.Hash=} opt_hasher
 * @return {klokantech.jekylledit.utils.Extractable} Modified lookIn
 */
klokantech.jekylledit.utils.extractImages =
    function(lookIn, extracted, mediaPath, opt_hasher) {
  var hasher = opt_hasher || new goog.crypt.Md5();
  if (goog.isString(lookIn)) {
    return lookIn.replace(klokantech.jekylledit.utils.BASE64_IMAGE_REGEXP,
        function(match, p1, p2, p3, p4) {
          var base64stripped = p4.replace(/\s/g, ''); // without whitespace
          hasher.reset();
          hasher.update(base64stripped); // the bytes
          var identifier = goog.crypt.byteArrayToHex(hasher.digest());
          identifier += '.' + p3; // image/xxx

          if (goog.DEBUG && extracted[identifier]) {
            console.log('Deduplicated', identifier);
          }

          extracted[identifier] = {
            'data': base64stripped
          };

          return '/' + mediaPath + '/' + identifier;
        });
  } else {
    goog.object.forEach(lookIn, function(value, key) {
      lookIn[key] =
          klokantech.jekylledit.utils.extractImages(
              value, extracted, mediaPath, hasher);
    });
    return lookIn;
  }
};
