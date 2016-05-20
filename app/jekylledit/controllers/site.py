from base64 import b64decode

import frontmatter

from flask import json, jsonify, request, abort
from flask.ext.cors import cross_origin
from flask.ext.login import current_user, login_required
from flask.ext.principal import Permission

from ..model import Repository, Sites
from .base import app
from .auth import authorization_required


TRANSLATIONS_FILE = '_data/translations.json'


def commit(repository, filenames):
    try:
        with repository.transaction():
            repository.execute(['add'] + filenames)
            repository.execute(['commit', '-m', 'File {} updated'.format(filenames[0])])
            # repository.execute(['push'])
        return True
    except Exception:
        return False


#site config response
@app.route('/site/<site_id>/config')
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
def site_config(site_id):
    site = Sites(site_id)
    config = site.get_config()
    return jsonify(config)


# Handle working with posts
@app.route('/site/<site_id>/<file_id>', methods=['GET', 'POST', 'PUT'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
def site_file(site_id, file_id):
    repository = Repository(site_id)
    filename = b64decode(file_id).decode()
    # Filemask is independent on language
    filemask = filename.rsplit('-', 1)[0] + '-{}.' + filename.rsplit('.', 1)[1]
    site = Sites(site_id)
    config = site.get_config()
    languages = config['languages']

    # Save new post
    if request.method == 'POST':
        data = request.get_json()
        postData = data['post']
        media = data['media'] # TODO
        tocommit = []
        for language in languages:
            post = frontmatter.Post()
            langdata = postData[language]
            if 'metadata' in langdata:
                post.metadata = langdata['metadata']
            if 'content' in langdata:
                post.content = langdata['content']
            lfilename = filemask.format(language)
            with repository.open(lfilename, 'r') as fp:
                formatter.dump(post, fp)
                tocommit.append(lfilename)
        # Commit changes
        commited = commit(repository, tocommit)
        if commited:
            return 'OK'
        else:
            abort(500)

    # Save content of post to file
    elif request.method == 'PUT':
        data = request.get_json()
        postData = data['post']
        media = data['media'] # TODO
        tocommit = []
        for language in languages:
            langdata = postData[language]
            lfilename = filemask.format(language)
            # Replace post's data in file
            with repository.open(lfilename, 'r+') as fp:
                post = frontmatter.load(fp)
                if 'metadata' in langdata:
                    post.metadata = langdata['metadata']
                if 'content' in langdata:
                    post.content = langdata['content']
                fp.seek(0)
                fp.truncate()
                frontmatter.dump(post, fp)
                tocommit.append(lfilename)
            # Commit changes
        commited = commit(repository, tocommit)
        if commited:
            return 'OK'
        else:
            abort(500)

    # Return post in all languages
    else:
        postData = {}
        for language in languages:
            with repository.open(filemask.format(language), 'r') as fp:
                post = frontmatter.load(fp)
                postData[language] = {
                    'metadata': post.metadata,
                    'content': post.content
                }
        return jsonify({
            'post': postData
        })


# Response related drafts
@app.route('/site/<site_id>/drafts', methods=['GET'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
def drafts(site_id):
    site = Sites(site_id)
    drafts = site.get_drafts('_posts')
    if Permission(('administrator', site_id)):
        email = current_user.email
        for draft in drafts:
            if draft['author'] is not email:
                drafts.remove(draft)
    return json.dumps(drafts)


#site translations
@app.route('/site/<site_id>/translations', methods=['GET', 'PUT'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
def site_translation(site_id):
    repository = Repository(site_id)
    if request.method == 'GET':
        with repository.open(TRANSLATIONS_FILE, 'r') as fp:
            translations = json.load(fp)
        return jsonify(translations)
    elif request.method == 'PUT':
        data = request.get_json()
        with repository.open(TRANSLATIONS_FILE, 'w') as fp:
            json.dump(data, fp)
        # Commit changes
        commited = commit(repository, TRANSLATIONS_FILE)
        if commited:
            return 'OK'
        else:
            abort(500)


@app.route('/site/<site_id>/update', methods=['POST'])
def update(site_id):
    # TODO: Secure
    repository = Repository(site_id)
    try:
        with repository.transaction():
            repository.execute(['pull'])
            return 'OK'
    except Exception:
        abort(500)
