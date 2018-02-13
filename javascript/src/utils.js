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
goog.require('kt.DateInput');
goog.require('kt.MultiComplete');


/**
 * @type {string} Base path where to load other resources.
 */
klokantech.jekylledit.BASE_URL = goog.DEBUG ? 'http://localhost:8000/' :
                                 '//jekylledit.klokantech.com/';


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
 * @param {!Node} parent
 * @return {function(): *} Value getter
 */
klokantech.jekylledit.utils.createField =
    function(field, currentValue, parent) {
  var type = field['type'];
  var value = goog.isDefAndNotNull(currentValue) ?
              currentValue : field['value'];
  if (type == 'datetime') {
    var pattern = 'yyyy-MM-ddTHH:mm';
    var dateValue;
    if (value == 'now') {
      dateValue = new Date();
    } else if (value && value.length > 9) {
      dateValue = new Date(0);
      var parser = new goog.i18n.DateTimeParse(pattern);
      parser.parse(/** @type {string} */(value), dateValue);

      var timezoneValue = value.substr(-6) || '+00:00';
      var timezoneOffset = parseInt(timezoneValue.substr(4, 2), 10);
      timezoneOffset += 60 * parseInt(timezoneValue.substr(1, 2), 10);
      timezoneOffset *= timezoneValue[0] == '-' ? -1 : 1;

      var hereOffset = (new Date).getTimezoneOffset();

      dateValue = new Date(dateValue.getTime() +
          60000 * (timezoneOffset - hereOffset));
    }
    var dateInputEl = goog.dom.createDom(goog.dom.TagName.INPUT, {
      'class': 'je-datetime-date',
      type: 'text'
    });
    var dateInput = new kt.DateInput(dateInputEl,
        goog.i18n.DateTimeFormat.Format.MEDIUM_DATE);
    if (dateValue) {
      dateInput.setDate(dateValue);
    }

    var hourInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      'class': 'je-datetime-hours',
      type: 'number',
      min: 0,
      max: 24,
      step: 1,
      value: dateValue ? dateValue.getHours() : ''
    });
    var minInput = goog.dom.createDom(goog.dom.TagName.INPUT, {
      'class': 'je-datetime-mins',
      type: 'number',
      min: 0,
      max: 59,
      step: 1,
      value: dateValue ? dateValue.getMinutes() : ''
    });
    var timeSep = goog.dom.createDom(goog.dom.TagName.SPAN, {
      'class': 'je-datetime-sep'
    }, ':');

    goog.dom.append(parent, dateInputEl, ' ', hourInput, timeSep, minInput);
    return function() {
      var date = dateInput.getDate();
      if (!date) {
        return '';
      }
      var value = new Date(date.getTime());
      value.setHours(hourInput.value || 0);
      value.setMinutes(minInput.value || 0);

      var formatter = new goog.i18n.DateTimeFormat(pattern);
      var result = formatter.format(value);

      var timezoneOffset = value.getTimezoneOffset();
      result += (timezoneOffset < 0 ? '-' : '+') +
          goog.string.format('%02f:%02f',
              Math.floor(Math.abs(timezoneOffset) / 60),
              Math.floor(Math.abs(timezoneOffset) % 60));
      return result;
    };
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
    var values = field['values'];
    var mc;
    var span = goog.dom.createDom(goog.dom.TagName.SPAN, 'je-multichoice');
    goog.dom.appendChild(parent, span);

    var initMC = function() {
      var showAll = values.length < 10; // show all values if less than 10
      mc = new kt.MultiComplete(
          span, /** @type {Array} */(values) || [], true,
          showAll, !!field['allow_custom']);
      goog.array.forEach(/** @type {Array} */(value) || [], function(opt) {
        mc.addValue(opt);
      });
    };

    if (goog.isString(values)) {
      var getter_ = null;
      goog.net.XhrIo.send(/** @type {string} */(values), function(e) {
        var xhr = e.target;
        try {
          values = xhr.getResponseJson();
        } catch (e) {
          values = [];
        }
        initMC();
      });
    } else {
      initMC();
    }
    return function() { return mc ? mc.getValues() : []; };
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
