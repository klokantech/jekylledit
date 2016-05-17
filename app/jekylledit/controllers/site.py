from base64 import b64decode

import frontmatter

from flask import json, jsonify, request
from flask.ext.cors import cross_origin

from ..model import Repository
from .base import app
from .auth import authorization_required


TRANSLATIONS_FILE = '_data/translations.json'


def commit(repository, filenames):
    try:
        with repository.transaction():
            for filename in filenames:
                repository.execute(['add', filename])
            repository.execute(['commit', '-m', 'File {} updated'.format(filename)])
            # repository.execute(['push'])
    except Exception:
        app.logger.exception('Commit failed')
        return False


def get_config(site_id):
    repository = Repository(site_id)
    with repository.open('jekylledit.json', 'r') as fp:
        config = json.load(fp)
        if not 'languages' in config:
            config.update({'languages': ['en']})
        return config


#site config response
@app.route('/site/<site_id>/config')
@cross_origin()
@authorization_required('contributor', 'administrator')
def site_config(site_id):
    config = get_config(site_id)
    return jsonify(config)


# Handle working with posts
@app.route('/site/<site_id>/<file_id>', methods=['GET', 'POST', 'PUT'])
@cross_origin()
@authorization_required('contributor', 'administrator')
def site_file(site_id, file_id):
    repository = Repository(site_id)
    filename = b64decode(file_id).decode()
    # Filemask is independent on language
    filemask = filename.rsplit('-', 1)[0] + '-{}.' + filename.rsplit('.', 1)[1]
    config = get_config(site_id)
    languages = config['languages']

    # Save new post
    if request.method == 'POST':
        data = request.get_json()
        tocommit = []
        for language in languages:
            post = frontmatter.Post()
            langdata = data[language]
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
            status = 'ok'
        else:
            status = 'failed'
        return jsonify({
            'status': status,
            'site': site_id,
            'file': filename
        })

    # Save content of post to file
    elif request.method == 'PUT':
        data = request.get_json()
        tocommit = []
        for language in languages:
            post = frontmatter.Post()
            langdata = data[language]
            lfilename = filemask.format(language)
            # Replace post's data in file
            with repository.open(lfilename, 'r+') as fp:
                post = frontmatter.load(fp)
                post.metadata = data['metadata']
                post.content = data['content']
                fp.seek(0)
                fp.truncate()
                frontmatter.dump(post, fp)
                tocommit.append(lfilename)
            # Commit changes
            commited = commit(repository, tocommit)
            if commited:
                status = 'ok'
            else:
                status = 'failed'
        return jsonify({
            'status': status,
            'site': site_id,
            'file': filename
        })

    # Return post in all languages
    else:
        resp = {}
        for language in languages:
            with repository.open(filemask.format(language), 'r') as fp:
                post = frontmatter.load(fp)
                resp[language] = {
                    'metadata': post.metadata,
                    'content': post.content
                }
        return jsonify(resp)


#site translations
@app.route('/site/<site_id>/translations', methods=['GET', 'PUT'])
@cross_origin()
@authorization_required('contributor', 'administrator')
def site_translation(site_id):
    repository = Repository(site_id)
    if request.method == 'GET':
        with repository.open(TRANSLATIONS_FILE, 'r') as fp:
            translations = json.load(fp)
        # TODO: Validate
        return jsonify(translations)
    elif request.method == 'PUT':
        data = request.get_json()
        # TODO: Validate
        with repository.open(TRANSLATIONS_FILE, 'w') as fp:
            json.dump(data, fp)
        # Commit changes
        commited = commit(repository, TRANSLATIONS_FILE)
        if commited:
            status = 'ok'
        else:
            status = 'failed'
        return jsonify({
            'status': status,
            'site': site_id
        })
