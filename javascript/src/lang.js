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
    'en': 'Log out',
    'de': 'Ausloggen',
    'it': 'Disconnettersi',
    'fr': 'Se déconnecter'
  },
  'popup_save': {
    'en': 'Save',
    'de': 'Speichern',
    'it': 'Salva',
    'fr': 'Enregistrer'
  },
  'popup_cancel': {
    'en': 'Cancel',
    'de': 'Stornieren',
    'it': 'Annulla',
    'fr': 'Annuler'
  },
  'popup_btn_edit': {
    'en': 'Edit',
    'de': 'Bearbeiten',
    'it': 'Modifica',
    'fr': 'Modifier'
  },
  'popup_btn_newx': {
    'en': 'New: ',
    'de': 'Neue: ',
    'it': 'Nuovo: ',
    'fr': 'Nouveau: '
  },
  'popup_btn_profile': {
    'en': 'Profile',
    'de': 'Profil',
    'it': 'Profilo',
    'fr': 'Profil'
  },
  'popup_btn_trans': {
    'en': 'Translations',
    'de': 'Übersetzungen',
    'it': 'Traduzioni',
    'fr': 'Traductions'
  },
  'popup_btn_dash': {
    'en': 'Dashboard',
    'de': 'Dashboard',
    'it': 'Dashboard',
    'fr': 'Dashboard'
  },
  'editor_publish': {
    'en': 'Publish this post',
    'de': 'Veröffentlichen diesen Beitrag',
    'it': 'Pubblicare questo post',
    'fr': 'Publier ce post'
  },
  'editor_create_lang': {
    'en': 'This post does not exist in this language yet. ' +
        'Do you want to create it now?',
    'de': 'Dieser Beitrag existiert noch nicht in dieser Sprache. ' +
        'Wollen Sie es jetzt erstellen?',
    'it': 'Questo post non esiste in questa lingua ancora. Vuoi creare ora?',
    'fr': 'Ce poste n\'existe pas dans cette langue encore. ' +
        'Voulez-vous le créer maintenant?'
  },
  'editor_create_lang_btn': {
    'en': 'Create "%s" variant of this post',
    'de': 'Erstellen Sie "%s" Variante dieser Beitrag',
    'it': 'Creare "%s" variante di questo post',
    'fr': 'Créer variante "%s" de ce post'
  },
  'editor_required_missing': {
    'en': 'These fields are required and need to be ' +
        'filled in all languages: %s',
    'de': 'Diese Felder sind Pflichtfelder und müssen ' +
        'in allen Sprachen ausgefüllt werden: %s',
    'it': 'Questi campi sono obbligatori e devono essere ' +
        'compilati in tutte le lingue: %s',
    'fr': 'Ces champs sont obligatoires et doivent être ' +
        'remplis dans toutes les langues: %s'
  },
  'editor_saved': {
    'en': 'Changes saved!',
    'de': 'Änderungen gespeichert!',
    'it': 'Modifiche salvate!',
    'fr': 'Changements sauvegardés!'
  },
  'editor_created': {
    'en': 'New post created!',
    'de': 'Neuer Beitrag erstellt!',
    'it': 'Nuovo messaggio creato!',
    'fr': 'Nouveau poste créé!'
  },
  'editor_save_error': {
    'en': 'There was an error saving the post!',
    'de': 'Es gab einen Fehler bei der Post zu speichern!',
    'it': 'Si è verificato un errore durante il salvataggio del post!',
    'fr': 'Il y avait une économie post erreur!'
  },
  'login': {
    'en': 'Log in',
    'de': 'Einloggen',
    'it': 'Accesso',
    'fr': 'S\'identifier'
  },
  'login_failed': {
    'en': 'Log in failed!',
    'de': 'Anmeldung fehlgeschlagen!',
    'it': 'Accesso fallito!',
    'fr': 'Échec de la connexion!'
  },
  'login_retry': {
    'en': 'Retry',
    'de': 'Wiederholen',
    'it': 'Riprova',
    'fr': 'Recommencez'
  },
  'login_not_authorized': {
    'en': 'You are not authorized to modify this site!',
    'de': 'Sie sind nicht zu ändern berechtigt diese Seite!',
    'it': 'Non sei autorizzato a modificare questo sito!',
    'fr': 'Vous n\'êtes pas autorisé à modifier ce site!'
  },
  'profile_saved': {
    'en': 'Changes saved!',
    'de': 'Änderungen gespeichert!',
    'it': 'Modifiche salvate!',
    'fr': 'Changements sauvegardés!'
  },
  'profile_save_error': {
    'en': 'There was an error saving the changes!',
    'de': 'Es gab einen Fehler, die Änderungen zu speichern!',
    'it': 'Si è verificato un errore durante il salvataggio delle modifiche!',
    'fr': 'Il y avait une erreur enregistrer les modifications!'
  },
  'trans_saved': {
    'en': 'Changes saved!',
    'de': 'Änderungen gespeichert!',
    'it': 'Modifiche salvate!',
    'fr': 'Changements sauvegardés!'
  },
  'trans_save_error': {
    'en': 'There was an error saving the changes!',
    'de': 'Es gab einen Fehler, die Änderungen zu speichern!',
    'it': 'Si è verificato un errore durante il salvataggio delle modifiche!',
    'fr': 'Il y avait une erreur enregistrer les modifications!'
  },
  'dash_create_new': {
    'en': 'Create new post',
    'de': 'Erstellen Sie einen neuen Beitrag',
    'it': 'Crea nuovo post',
    'fr': 'Créer un nouveau message'
  },
  'dash_drafts': {
    'en': 'Drafts',
    'de': 'Entwürfe',
    'it': 'Bozze',
    'fr': 'Brouillons'
  },
  'dash_drafts_empty': {
    'en': 'There are currently no drafts waiting to be published.',
    'de': 'Es gibt zur Zeit wartet keine Zugluft veröffentlicht werden.',
    'it': 'Attualmente non ci sono correnti d\'aria in attesa di ' +
        'essere pubblicato.',
    'fr': 'Il n\'y a pas de courants qui attendent d\'être publié.'
  }
};
