from base64 import b64decode
from datetime import date

import frontmatter

from flask import json, jsonify, request
from flask.ext.cors import cross_origin
from flask.ext.login import current_user, login_required
from flask.ext.principal import Permission

from ..model import Repository, Sites
from .base import app
from .auth import authorization_required


TRANSLATIONS_FILE = '_data/translations.json'
USERS_FILE = '_data/users.json'


def commit(repository, filenames):
    with repository.transaction():
        repository.execute(['add'] + filenames)
        repository.execute([
            '-c', 'user.name=JekyllEdit',
            '-c', 'user.email={}'.format(current_user.email),
            'commit',
            '-m', 'File {} updated'.format(filenames[0]),
        ])
        if not app.config['DEVELOPMENT']:
            repository.execute(['push'])


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
    site = Sites(site_id)
    config = site.get_config()
    languages = config['languages']

    # Save new post
    if request.method == 'POST':
        data = request.get_json()
        postData = data['post']
        media = data['media'] # TODO
        title = postData[languages[0]]['metadata']['title'].replace(' ', '-').lower()

        tocommit = []
        for language in languages:
            langdata = postData[language]
            today = date.today().strftime('%Y-%m-%d')
            lfilename = '_posts/' + today + '-' + title + '-' + language + '.md'
            site.create_post(lfilename, langdata)
            tocommit.append(lfilename)
        # Commit changes
        commit(repository, tocommit)
        return 'OK'

    # Save content of post to file
    elif request.method == 'PUT':
        filename = b64decode(file_id).decode()
        filemask = filename.rsplit('-', 1)[0] + '-{}.' \
        + filename.rsplit('.', 1)[1]

        data = request.get_json()
        postData = data['post']
        media = data['media'] # TODO
        tocommit = []
        for language in languages:
            langdata = postData[language]
            lfilename = filemask.format(language)
            site.edit_post(lfilename, langdata)
            tocommit.append(lfilename)
            # Commit changes
        commit(repository, tocommit)
        return 'OK'

    # Return post in all languages
    else:
        filename = b64decode(file_id).decode()
        filemask = filename.rsplit('-', 1)[0] + '-{}.' \
        + filename.rsplit('.', 1)[1]

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
        commit(repository, [TRANSLATIONS_FILE])
        return 'OK'


#user proflies
@app.route('/site/<site_id>/user/<user_id>/profile', methods=['GET', 'PUT'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
def user_profile(site_id, user_id):
    site = Sites(site_id)
    #  Get current user
    # JE uses emails as identificators
    if user_id == 'current':
        user_id = current_user.email
    if request.method == 'GET':
        user = site.get_user(user_id)
        return jsonify(user)
    elif request.method == 'PUT':
        data = request.get_json()
        data['id'] = user_id
        site.edit_user(data)
        # Commit changes
        commit(site.repository, [USERS_FILE])
        return 'OK'


@app.route('/site/<site_id>/update', methods=['POST'])
def update(site_id):
    # TODO: Secure
    repository = Repository(site_id)
    with repository.transaction():
        repository.execute(['pull'])
    return 'OK'
