/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Profile');

goog.require('goog.dom');
goog.require('klokantech.jekylledit.AbstractPage');
goog.require('klokantech.jekylledit.lang');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {string} repo
 * @param {function()} opsRefresher
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Profile = function(auth, config, repo, opsRefresher) {
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
   * @type {string}
   * @private
   */
  this.repo_ = repo;

  /**
   * @type {function()}
   * @private
   */
  this.opsRefresher_ = opsRefresher;

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-profile');

  /**
   * @type {!Element}
   * @private
   */
  this.usersEl_ = goog.dom.createDom(goog.dom.TagName.SELECT,
                                     'je-profile-users');

  /**
   * @type {!Element}
   * @private
   */
  this.dataEl_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-profile-data');

  goog.dom.append(this.element_, this.usersEl_, this.dataEl_);

  goog.events.listen(this.usersEl_, goog.events.EventType.CHANGE, function(e) {
    this.showProfile_(this.usersEl_.value);
  }, false, this);

  /**
   * @type {?string}
   * @private
   */
  this.activeProfile_ = null;

  /**
   * @type {boolean}
   * @private
   */
  this.editable_ = false;

  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.start = function() {
  this.loadClear();
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.getValidOps = function() {
  return {
    cancel: true,
    save: this.editable_
  };
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.loadClear = function(opt_callback) {
  goog.dom.removeChildren(this.usersEl_);
  klokantech.jekylledit.utils.replaceWithSpinner(this.dataEl_);

  var isAdmin = goog.array.contains(this.auth_.getUserRoles(), 'administrator');

  goog.style.setElementShown(this.usersEl_, isAdmin);

  this.activeProfile_ = null;

  if (isAdmin) {
    var containsMe = false;
    this.auth_.sendRequest('site/' + this.repo_ + '/users',
        goog.bind(function(e) {
          var xhr = e.target;
          var data = xhr.getResponseJson();

          goog.dom.removeChildren(this.usersEl_);

          goog.array.forEach(data, function(el) {
            var opt = goog.dom.createDom(goog.dom.TagName.OPTION, {
                        value: el['id']
                      }, el['username'] + ' <' + el['id'] + '>');
            if (el['id'] == this.auth_.getUserEmail()) {
              opt.value = 'current';
              opt.selected = 'selected';
              containsMe = true;
              goog.dom.insertChildAt(this.usersEl_, opt, 0);
            } else {
              goog.dom.appendChild(this.usersEl_, opt);
            }
          }, this);

          if (!containsMe) {
            var opt = goog.dom.createDom(goog.dom.TagName.OPTION, {
                        value: 'current',
                        selected: 'selected'
                      }, this.auth_.getUserName() || this.auth_.getUserEmail());
            goog.dom.insertChildAt(this.usersEl_, opt, 0);
          }

          this.showProfile_(undefined, opt_callback);
        }, this));
  } else {
    this.showProfile_(undefined, opt_callback);
  }
};


/**
 * @param {string=} opt_userId
 * @param {Function=} opt_callback
 * @private
 */
klokantech.jekylledit.Profile.prototype.showProfile_ =
    function(opt_userId, opt_callback) {
  if (!goog.array.contains(this.auth_.getUserRoles(), 'administrator')) {
    opt_userId = undefined;
    this.usersEl_.value = 'current';
  }
  var userId = opt_userId ? goog.crypt.base64.encodeString(opt_userId) :
                            'current';

  this.activeProfile_ = userId;

  klokantech.jekylledit.utils.replaceWithSpinner(this.dataEl_);

  this.auth_.sendRequest('site/' + this.repo_ + '/user/' + userId + '/profile',
      goog.bind(function(e) {
        var xhr = e.target;
        var data = xhr.getResponseJson();

        goog.dom.removeChildren(this.dataEl_);

        var fields = (this.config_['profile'] || {})['fields'] || {};

        var groups = [], groupCount = 0;

        if (goog.isDefAndNotNull(data['id'])) {
          var keys = goog.object.getKeys(fields);
          keys.sort(function(a, b) {
            var orderA = fields[a]['order'] || 0;
            var orderB = fields[b]['order'] || 0;
            if (orderA != orderB) {
              return a - b;
            } else {
              a.localeCompare(b);
            }
          });

          goog.array.forEach(keys, function(k) {
            var el = fields[k];
            var groupId = el['group'] || 0;
            if (!groups[groupId]) {
              groups[groupId] = goog.dom.createDom(goog.dom.TagName.DIV,
                                                   'je-profile-group');
              groupCount++;
            }
            var group = groups[groupId];

            var label = klokantech.jekylledit.lang.getFrom(
                            el['label'], this.config_['languages']);
            var labelEl = goog.dom.createDom(goog.dom.TagName.LABEL, undefined,
            (label || k) + ':');
            goog.dom.appendChild(group, labelEl);
            var value = data[k];
            el['_je_getval'] = klokantech.jekylledit.utils.createField(
                                   el, value, group);
          }, this);

          var groupI = 0;
          goog.array.forEach(groups, function(group) {
            group.style.left = Math.floor(groupI * 100 / groupCount) + '%';
            group.style.width = Math.floor(100 / groupCount - 1) + '%';
            goog.dom.appendChild(this.dataEl_, group);
            groupI++;
          }, this);
          this.editable_ = true;
        } else {
          goog.dom.appendChild(this.dataEl_,
              goog.dom.createDom(goog.dom.TagName.DIV, undefined,
                  goog.string.format(
                      klokantech.jekylledit.lang.get('profile_does_not_exist'),
                      this.auth_.getUserEmail()
                  )
              )
          );
          this.editable_ = false;
        }
        this.opsRefresher_();

        if (opt_callback) {
          opt_callback();
        }
      }, this));
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.save = function(opt_callback) {
  if (!this.activeProfile_) {
    opt_callback(false);
    return;
  }

  var result = {};

  var fields = (this.config_['profile'] || {})['fields'] || {};

  goog.object.forEach(fields, function(el, k) {
    var valueGetter = el['_je_getval'];
    if (valueGetter) {
      result[k] = valueGetter();
    }
  }, this);

  this.auth_.sendRequest(
      'site/' + this.repo_ + '/user/' + this.activeProfile_ + '/profile',
      goog.bind(function(e) {
        if (e.target.isSuccess()) {
          alert(klokantech.jekylledit.lang.get('profile_saved'));
        } else {
          alert(klokantech.jekylledit.lang.get('profile_save_error'));
        }
        if (opt_callback) {
          opt_callback(e.target.isSuccess());
        }
      }, this), 'PUT', JSON.stringify(result), {
        'content-type': 'application/json'
      }
  );
};


/** @inheritDoc */
klokantech.jekylledit.Profile.prototype.remove = goog.nullFunction;
