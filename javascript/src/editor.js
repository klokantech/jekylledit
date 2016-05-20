/**
 *
 * @author petr.sloup@klokantech.com (Petr Sloup)
 *
 * Copyright 2016 Klokan Technologies Gmbh (www.klokantech.com)
 */
goog.provide('klokantech.jekylledit.Editor');

goog.require('goog.crypt.base64');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.events.EventType');
goog.require('goog.string.format');
goog.require('klokantech.jekylledit.AbstractPage');
goog.require('klokantech.jekylledit.lang');
goog.require('klokantech.jekylledit.utils');



/**
 * @param {klokantech.jekylledit.Auth} auth
 * @param {Object} config
 * @param {?string} category
 * @param {string} repo
 * @param {string=} opt_path
 * @param {Node=} opt_content
 * @param {Function=} opt_callback when ready
 * @constructor
 * @implements {klokantech.jekylledit.AbstractPage}
 */
klokantech.jekylledit.Editor = function(auth, config, category, repo,
                                        opt_path, opt_content, opt_callback) {
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
   * @type {?string}
   * @private
   */
  this.category_ = category;

  /**
   * @type {?Object}
   * @private
   */
  this.catConfig_ = null;

  /**
   * @type {string}
   * @private
   */
  this.repo_ = repo;

  /**
   * @type {?string}
   * @private
   */
  this.path_ = opt_path || null;

  /**
   * @type {!Element}
   * @private
   */
  this.element_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor');

  /**
   * @type {!Element}
   * @private
   */
  this.publishCheckbox_ = goog.dom.createDom(goog.dom.TagName.INPUT, {
    'type': 'checkbox'
  });

  var publishCheckboxBox = goog.dom.createDom(goog.dom.TagName.LABEL,
      'je-editor-publish',
      this.publishCheckbox_,
      klokantech.jekylledit.lang.get('editor_publish'));

  /**
   * @type {!Element}
   * @private
   */
  this.tabbtns_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-tabbtns');

  /**
   * @type {!Element}
   * @private
   */
  this.tabs_ = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-tabs');

  goog.dom.append(this.element_, publishCheckboxBox,
                  this.tabbtns_, this.tabs_);

  /**
   * @type {!Object.<string, {content: !Element, side: !Element,
   *                          tab: !Element, tabBtn: !Element, is_copy: boolean,
   *                          data: Object, editor: Object, fields: !Object}>}
   * @private
   */
  this.languages_ = {};

  var langs = this.config_['languages'];
  var interfaceLang = klokantech.jekylledit.lang.getLanguage();
  var activeLang = goog.array.contains(langs, interfaceLang) ?
                   interfaceLang : langs[0];
  var tabBtns = [], tabs = [];

  var activeTabLang = activeLang;
  var createLangBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-btn');
  var createLangDialog = goog.dom.createDom(goog.dom.TagName.DIV,
      'je-editor-create-lang',
      goog.dom.createDom(goog.dom.TagName.DIV, undefined,
      klokantech.jekylledit.lang.get('editor_create_lang')),
      createLangBtn
      );
  goog.events.listen(createLangBtn, goog.events.EventType.CLICK, function(e) {
    goog.dom.removeNode(createLangDialog);

    var lang = this.languages_[activeTabLang];
    lang.is_copy = false;
    goog.dom.classlist.remove(lang.tab, 'disabled');
    goog.dom.classlist.remove(lang.tabBtn, 'disabled');
  }, false, this);


  goog.array.forEach(langs, function(langId, i) {
    var content = goog.dom.createDom(goog.dom.TagName.DIV,
                                     'je-editor-tab-content');
    var side = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-tab-side');
    var tab = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-tab');
    var tabBtn = goog.dom.createDom(goog.dom.TagName.DIV, 'je-editor-tab-btn',
                                    langId);
    this.languages_[langId] = {
      content: content,
      side: side,
      is_copy: langId != activeLang,
      tab: tab,
      tabBtn: tabBtn,
      data: null,
      editor: null,
      fields: {}
    };
    goog.dom.append(tab, content, side);
    goog.dom.appendChild(this.tabs_, tab);
    goog.dom.appendChild(this.tabbtns_, tabBtn);
    if (langId == activeLang) {
      goog.dom.classlist.add(tabBtn, 'active');
      goog.dom.classlist.add(tab, 'active');
    }
    tabBtns.push(tabBtn);
    tabs.push(tab);

    goog.events.listen(tabBtn, goog.events.EventType.CLICK, function(e) {
      if (e.target != tabBtn) {
        return;
      }
      goog.array.forEach(tabBtns, function(tabBtn) {
        goog.dom.classlist.remove(tabBtn, 'active');
      });
      goog.array.forEach(tabs, function(tab) {
        goog.dom.classlist.remove(tab, 'active');
      });
      goog.dom.classlist.add(tabBtn, 'active');
      goog.dom.classlist.add(tab, 'active');

      activeTabLang = langId;
      if (goog.dom.classlist.contains(tab, 'disabled')) {
        goog.dom.appendChild(this.tabs_, createLangDialog);
        goog.dom.setTextContent(createLangBtn, goog.string.format(
            klokantech.jekylledit.lang.get('editor_create_lang_btn'), langId));
      } else {
        goog.dom.removeNode(createLangDialog);
      }

      e.preventDefault();
    }, false, this);
  }, this);

  /**
   * @type {!Object.<string, boolean>}
   * @private
   */
  this.inlineFields_ = {};

  /**
   * @type {Node}
   * @private
   */
  this.editSource_ = opt_content || null;

  this.loadClear(opt_callback);
};


/**
 * @define {string} Selector to find editable fields.
 */
klokantech.jekylledit.Editor.EDITABLES_SELECTOR =
    '.je-editor [data-jekylledit-source]';


/**
 * @define {string} Default empty content.
 */
klokantech.jekylledit.Editor.DEFAULT_EMPTY_CONTENT =
    '<h1 data-jekylledit-source="title">Title</h1>' +
    '<div data-jekylledit-source="content">Content</div>';


/** @inheritDoc */
klokantech.jekylledit.Editor.prototype.getElement = function() {
  return this.element_;
};


/** @inheritDoc */
klokantech.jekylledit.Editor.prototype.loadClear = function(opt_callback) {
  this.publishCheckbox_.disabled =
      !goog.array.contains(this.auth_.getUserRoles(), 'administrator');

  if (this.path_) {
    this.auth_.sendRequest(
        'site/' + this.repo_ + '/' + goog.crypt.base64.encodeString(this.path_),
        goog.bind(function(e) {
          var xhr = e.target;
          var data = xhr.getResponseJson();
          data = data['post'] || {};

          var anyPublished = false;

          goog.object.forEach(data, function(post, langId) {
            if (!this.languages_[langId]) {
              return;
            }
            var lang = this.languages_[langId];
            lang.data = post;
            lang.is_copy = !!lang.data['metadata']['jekylledit_copyof'];
            goog.dom.classlist.enable(lang.tab, 'disabled', lang.is_copy);
            goog.dom.classlist.enable(lang.tabBtn, 'disabled', lang.is_copy);

            anyPublished = lang.data['metadata']['published'] != false;

            if (!this.category_) {
              var meta = post['metadata'];
              var cat = (meta['category'] || meta['categories']);
              if (goog.isArray(cat)) {
                this.category_ = null;
                goog.array.forEach(cat, function(cat_) {
                  if (!this.category_ && this.config_['categories'][cat_]) {
                    this.category_ = cat_;
                  }
                }, this);
                if (!this.category_) {
                  this.category_ = cat[0];
                }
              } else {
                this.category_ = cat;
              }
            }

            var catCfg = (this.config_['categories'][this.category_] || {});
            lang.fields = /** @type {Object} */
                          (goog.object.unsafeClone(catCfg['fields'])) || {};

            lang.content.innerHTML = catCfg['empty_content'] ||
                klokantech.jekylledit.Editor.DEFAULT_EMPTY_CONTENT;
          }, this);

          this.publishCheckbox_.checked = anyPublished;

          if (opt_callback) {
            opt_callback();
          }
        }, this));
  } else {
    var uniquePostId = goog.string.getRandomString();

    this.publishCheckbox_.checked = false;

    goog.object.forEach(this.languages_, function(lang, langId) {
      lang.data = {
        'metadata': {
          'author': this.auth_.getUserEmail(),
          'post_id': uniquePostId,
          'lang': langId
        },
        'content': ''
      };
      goog.dom.classlist.enable(lang.tab, 'disabled', lang.is_copy);
      goog.dom.classlist.enable(lang.tabBtn, 'disabled', lang.is_copy);

      var catCfg = (this.config_['categories'][this.category_] || {});
      lang.fields = /** @type {Object} */
                    (goog.object.unsafeClone(catCfg['fields'])) || {};

      lang.content.innerHTML = catCfg['empty_content'] ||
          klokantech.jekylledit.Editor.DEFAULT_EMPTY_CONTENT;
    }, this);

    if (opt_callback) {
      opt_callback();
    }
  }
};


/** @inheritDoc */
klokantech.jekylledit.Editor.prototype.start = function() {
  this.startEditor_();
  this.initSidebar_();
};


/**
 * @private
 */
klokantech.jekylledit.Editor.prototype.initSidebar_ = function() {
  var skipFields = [];//'lang', 'post_id', 'jekylledit_copyof'];
  goog.object.forEach(this.languages_, function(lang, langId) {
    goog.dom.removeChildren(lang.side);

    var editable = goog.dom.createDom(goog.dom.TagName.DIV,
                                      'je-editor-side-editable');
    var readonly = goog.dom.createDom(goog.dom.TagName.DIV,
                                      'je-editor-side-readonly');
    var extra = goog.dom.createDom(goog.dom.TagName.DIV,
                                   'je-editor-side-extra');

    goog.dom.append(lang.side, editable, readonly, extra);

    var meta = lang.data['metadata'];

    goog.object.forEach(lang.fields, function(el, k) {
      var label = klokantech.jekylledit.lang.getFrom(
                      el['label'], this.config_['languages']);
      var labelEl = goog.dom.createDom(goog.dom.TagName.LABEL, undefined,
                                       (label || k) + ':');
      var inputValue = (meta[k] || el['value']).toString();
      if (this.inlineFields_[k]) {
        var value = goog.dom.createDom(goog.dom.TagName.SPAN,
                                       'je-editor-editableinline', inputValue);
        goog.dom.append(editable, labelEl, value);
      } else if (el['readonly']) {
        var value = goog.dom.createDom(goog.dom.TagName.SPAN,
                                       'je-editor-readonly', inputValue);
        goog.dom.append(readonly, labelEl, value);
      } else {
        goog.dom.appendChild(editable, labelEl);
        el['_je_getval'] = klokantech.jekylledit.utils.createField(
                               el, meta[k], editable);
      }
    }, this);

    goog.object.forEach(meta, function(el, k) {
      if (!lang.fields[k] && !goog.array.contains(skipFields, k)) {
        var label = goog.dom.createDom(goog.dom.TagName.LABEL, {}, k + ':');
        var dataInput = goog.dom.createDom(goog.dom.TagName.DIV, {},
            meta[k].toString());
        goog.dom.append(extra, label, dataInput);
      }
    }, this);
  }, this);
};


/**
 * @private
 */
klokantech.jekylledit.Editor.prototype.startEditor_ = function() {
  var editables = document.querySelectorAll(
      klokantech.jekylledit.Editor.EDITABLES_SELECTOR);
  goog.object.forEach(this.languages_, function(lang, langId) {
    goog.array.forEach(editables, function(editable) {
      if (!goog.dom.contains(lang.content, editable)) {
        return;
      }

      var sourceType = editable.getAttribute('data-jekylledit-source');
      // wysiwyg for content, simple contentEditable for the rest
      if (sourceType == 'content') {
        klokantech.jekylledit.utils.installStyle(
            'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
            '5.16.1/css/medium-editor.min.css');
        klokantech.jekylledit.utils.installStyle(
            'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
            '5.16.1/css/themes/default.min.css');
        klokantech.jekylledit.utils.installScript(
            'https://cdnjs.cloudflare.com/ajax/libs/to-markdown/' +
            '3.0.0/to-markdown.min.js');
        klokantech.jekylledit.utils.installScript(
            'https://cdnjs.cloudflare.com/ajax/libs/showdown/' +
            '1.3.0/showdown.min.js', goog.bind(function() {
              var showdown = new goog.global['showdown']['Converter']();
              editable.innerHTML = showdown['makeHtml'](lang.data['content']);
            }, this));
        klokantech.jekylledit.utils.installScript(
            'https://cdnjs.cloudflare.com/ajax/libs/medium-editor/' +
            '5.16.1/js/medium-editor.min.js', goog.bind(function() {
              if (lang.editor) {
                lang.editor['destroy']();
              }
              lang.editor = new goog.global['MediumEditor'](
              editable,
              {
                'toolbar': {
                  'buttons': [
                    'bold', 'italic', 'underline',
                    'orderedlist', 'unorderedlist',
                    'anchor', 'h2', 'h3', 'removeFormat'
                  ]
                }
              });
            }, this));
      } else {
        var metaValue = lang.data['metadata'][sourceType];
        if (metaValue) {
          goog.dom.setTextContent(editable, metaValue);
        }
        var fieldDescription = lang.fields[sourceType];
        if (fieldDescription) {
          editable.contentEditable = true;

          // HOOK to allow only simple text (no newlines, no pasting)
          goog.events.listen(editable, goog.events.EventType.INPUT,
              function(e) {
                if (goog.dom.getChildren(editable).length > 0) {
                  var textContent = editable.textContent;
                  editable.innerHTML = '';
                  editable.textContent = textContent;
                }
              });
        } else {
          editable.removeAttribute('data-jekylledit-source');
        }
      }
      this.inlineFields_[sourceType] = true;
    }, this);
  }, this);
};


/** @inheritDoc */
klokantech.jekylledit.Editor.prototype.save = function(opt_callback) {
  var postData = {};

  var editables = document.querySelectorAll(
      klokantech.jekylledit.Editor.EDITABLES_SELECTOR);
  goog.object.forEach(this.languages_, function(lang, langId) {
    var langData = {
      'metadata': goog.object.clone(lang.data['metadata']),
      'content': lang.data['content']
    };
    postData[langId] = langData;

    goog.object.forEach(lang.fields, function(el, k) {
      var valueGetter = el['_je_getval'];
      langData['metadata'][k] = valueGetter ? valueGetter() : el['value'];
    }, this);

    goog.array.forEach(editables, function(editable) {
      if (!goog.dom.contains(lang.content, editable)) {
        return;
      }

      var sourceType = editable.getAttribute('data-jekylledit-source');
      if (sourceType == 'content') {
        langData['content'] = goog.global['toMarkdown'](editable.innerHTML);
      } else {
        langData['metadata'][sourceType] = editable.textContent;
      }
    }, this);
  }, this);

  var firstFilledLanguage = goog.array.find(this.config_['languages'],
      function(langId) {
        return !this.languages_[langId].is_copy;
      }, this);

  goog.object.forEach(this.languages_, function(lang, langId) {
    if (!lang.is_copy) {
      delete postData[langId]['metadata']['jekylledit_copyof'];
    } else {
      var copyof = lang.data['metadata']['jekylledit_copyof'] ||
                   firstFilledLanguage;
      postData[langId] = goog.object.unsafeClone(postData[copyof]);

      // fix special fields
      postData[langId]['metadata']['lang'] = langId;
      postData[langId]['metadata']['jekylledit_copyof'] = copyof;
    }
    postData[langId]['metadata']['published'] = this.publishCheckbox_.checked;
  }, this);

  if (this.editSource_) {
    var lang = this.languages_[klokantech.jekylledit.lang.getLanguage()];
    if (lang) {
      klokantech.jekylledit.utils.cloneNodes(lang.content, this.editSource_);
    }
  }

  // deduplicate images
  var extracted = {};
  postData = klokantech.jekylledit.utils.extractImages(postData, extracted);
  var result = {
    'post': postData,
    'media': extracted
  };
  console.log(result);

  var path = this.path_ ? goog.crypt.base64.encodeString(this.path_) : 'new';
  this.auth_.sendRequest('site/' + this.repo_ + '/' + path,
      goog.bind(function(e) {
        alert(klokantech.jekylledit.lang.get(
                  this.path_ ? 'editor_saved' : 'editor_created'));
        if (opt_callback) {
          opt_callback();
        }
      }, this), this.path_ ? 'PUT' : 'POST', JSON.stringify(result), {
        'content-type': 'application/json'
      }
  );
};
