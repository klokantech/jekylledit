/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Auth');

goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.net.Jsonp');
goog.require('goog.net.XhrIo');
goog.require('klokantech.jekylledit.lang');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {string} repo
 * @param {Element} parentElement
 * @constructor
 */
klokantech.jekylledit.Auth = function(repo, parentElement) {
  /**
   * @type {?string}
   * @private
   */
  this.accessToken_ = null;

  /**
   * @type {?string}
   * @private
   */
  this.signInUrl_ = null;

  /**
   * @type {goog.net.Jsonp}
   * @private
   */
  this.tokenJsonp_ = new goog.net.Jsonp(
      klokantech.jekylledit.BASE_URL + 'auth/site/' + repo + '/token');

  /**
   * @type {Element}
   * @private
   */
  this.parentElement_ = parentElement;

  /**
   * @type {Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-auth');
};


/**
 * @return {Element}
 */
klokantech.jekylledit.Auth.prototype.getElement = function() {
  return this.element_;
};


/**
 * @param {Function} callback Called when the user authorizes.
 *                            May not be called at all.
 */
klokantech.jekylledit.Auth.prototype.login = function(callback) {
  klokantech.jekylledit.utils.replaceWithSpinner(this.element_);
  goog.dom.appendChild(this.parentElement_, this.element_);

  this.checkLogin_(callback);
};


/**
 * @param {Function} callback
 * @param {boolean=} opt_retry
 * @private
 */
klokantech.jekylledit.Auth.prototype.showLoginBtn_ =
    function(callback, opt_retry) {
  goog.dom.removeChildren(this.element_);
  if (opt_retry) {
    goog.dom.appendChild(this.element_,
        goog.dom.createDom(goog.dom.TagName.DIV, undefined,
            klokantech.jekylledit.lang.get('login_failed')));
  }
  var loginBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn',
      klokantech.jekylledit.lang.get(opt_retry ? 'login_retry' : 'login'));
  goog.dom.appendChild(this.element_, loginBtn);
  goog.events.listen(loginBtn, goog.events.EventType.CLICK, function(e) {
    klokantech.jekylledit.utils.replaceWithSpinner(this.element_);
    var loginWindow = window.open(
        this.signInUrl_,
        '_blank',
        'width=600,height=400'
        );
    var intervalId = setInterval(goog.bind(function() {
      try {
        if (loginWindow == null || loginWindow.closed) {
          clearInterval(intervalId);
          this.checkLogin_(callback, true);
        }
      } catch (e) {}
    }, this), 500);
  }, false, this);
};


/**
 * @private
 */
klokantech.jekylledit.Auth.prototype.showNotAuthorized_ = function() {
  goog.dom.removeChildren(this.element_);
  goog.dom.appendChild(this.element_,
      goog.dom.createDom(goog.dom.TagName.DIV, undefined,
          klokantech.jekylledit.lang.get('login_not_authorized')));
};


/**
 * @param {Function} callback
 * @param {boolean=} opt_retry
 * @private
 */
klokantech.jekylledit.Auth.prototype.checkLogin_ =
    function(callback, opt_retry) {
  this.tokenJsonp_.send(undefined, goog.bind(function(data) {
        var statusCode = data['status_code'];
        if (statusCode == 200) {
          this.accessToken_ = data['access_token'];
          goog.dom.removeNode(this.element_);
          callback();
        } else if (statusCode == 401) {
          this.signInUrl_ = data['location'];
          this.showLoginBtn_(callback, opt_retry);
        } else if (statusCode == 403) {
          this.showNotAuthorized_();
        }
      }, this));
};


/**
 * @param {string} url Uri to make request to.
 * @param {Function=} opt_callback Callback function for when request is
 *     complete.
 * @param {string=} opt_method Send method, default: GET.
 * @param {ArrayBuffer|ArrayBufferView|Blob|Document|FormData|string=}
 *     opt_content Body data.
 * @param {Object=} opt_headers Map of headers to add to the request.
 */
klokantech.jekylledit.Auth.prototype.sendRequest =
    function(url, opt_callback, opt_method, opt_content, opt_headers) {
  if (!goog.isString(this.accessToken_)) {
    throw Error('Not authorized!');
  }
  var headers = goog.object.clone(opt_headers || {});
  headers['Authorization'] = 'Bearer ' + this.accessToken_;
  goog.net.XhrIo.send(klokantech.jekylledit.BASE_URL + url,
                      opt_callback, opt_method, opt_content, headers);
};
