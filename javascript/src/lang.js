/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.lang');

goog.require('goog.array');


/**
 * @type {!Array.<string>}
 * @private
 */
klokantech.jekylledit.lang.languages_ = ['en', 'de', 'fr', 'it'];


/**
 * @type {string}
 * @private
 */
klokantech.jekylledit.lang.selected_ = 'en';


/**
 * @param {string} langId
 */
klokantech.jekylledit.lang.setLanguage = function(langId) {
  if (klokantech.jekylledit.lang.selected_ == langId) {
    return;
  }
  if (goog.array.contains(klokantech.jekylledit.lang.languages_, langId)) {
    klokantech.jekylledit.lang.selected_ = langId;
  } else {
    klokantech.jekylledit.lang.selected_ =
        klokantech.jekylledit.lang.languages_[0];
  }
};


/**
 * @return {string}
 */
klokantech.jekylledit.lang.getLanguage = function() {
  return klokantech.jekylledit.lang.selected_;
};


/**
 * Gets localized label value based on language preference and available langs.
 * @param {string|Object.<string, string>} label
 * @param {Array.<string>=} opt_langs
 * @param {string=} opt_lang
 * @return {string}
 */
klokantech.jekylledit.lang.getFrom = function(label, opt_langs, opt_lang) {
  if (!label) {
    return '';
  } else if (goog.isString(label)) {
    return label;
  } else {
    var lang = opt_lang || klokantech.jekylledit.lang.selected_;
    var langs = opt_langs || klokantech.jekylledit.lang.languages_;
    if (label[lang]) {
      return label[lang];
    } else {
      var bestLang = goog.array.find(langs, function(el) {
        return !!label[el];
      });
      return bestLang ? label[bestLang] : '';
    }
  }
};


/**
 * @param {string} id
 * @return {string}
 */
klokantech.jekylledit.lang.get = function(id) {
  var label = klokantech.jekylledit.lang.data_[id];
  if (goog.DEBUG && !label) {
    console.error('String "' + id + '" not found!');
  }
  return klokantech.jekylledit.lang.getFrom(label || id);
};


/**
 * @type {!Object.<string, !Object.<string, string>>}
 * @private
 */
klokantech.jekylledit.lang.data_ = {
  'popup_logout': {
    'en': 'Log out'
  },
  'popup_save': {
    'en': 'Save'
  },
  'popup_cancel': {
    'en': 'Cancel',
    'de': 'Stornieren',
    'it': 'Annulla',
    'fr': 'Annuler'
  },
  'popup_btn_edit': {
    'en': 'Edit'
  },
  'popup_btn_newx': {
    'en': 'New: '
  },
  'popup_btn_profile': {
    'en': 'Profile'
  },
  'popup_btn_trans': {
    'en': 'Translations'
  },
  'popup_btn_dash': {
    'en': 'Dashboard'
  },
  'editor_publish': {
    'en': 'Publish this post'
  },
  'editor_create_lang': {
    'en': 'This post does not exist in this language yet. ' +
        'Do you want to create it now?'
  },
  'editor_create_lang_btn': {
    'en': 'Create "%s" variant of this post'
  },
  'editor_required_missing': {
    'en': 'These fields are required and need to be filled in all languages: %s'
  },
  'editor_saved': {
    'en': 'Changes saved!'
  },
  'editor_created': {
    'en': 'New post created !'
  },
  'editor_save_error': {
    'en': 'There was an error saving the post!'
  },
  'login': {
    'en': 'Log in'
  },
  'login_failed': {
    'en': 'Log in failed!'
  },
  'login_retry': {
    'en': 'Retry'
  },
  'login_not_authorized': {
    'en': 'You are not authorized to modify this site!'
  },
  'profile_saved': {
    'en': 'Changes saved!'
  },
  'profile_save_error': {
    'en': 'There was an error saving the changes!'
  },
  'trans_saved': {
    'en': 'Changes saved!'
  },
  'trans_save_error': {
    'en': 'There was an error saving the changes!'
  },
  'dash_create_new': {
    'en': 'Create new post'
  },
  'dash_drafts': {
    'en': 'Drafts'
  },
  'dash_drafts_empty': {
    'en': 'There are currently no drafts waiting to be published.'
  }
};
