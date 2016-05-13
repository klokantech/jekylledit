from base64 import b64decode

import frontmatter

from flask import json, jsonify, request
from flask.ext.cors import cross_origin

from ..model import Repository
from .base import app
from .auth import authorization_required


TRANSLATIONS_FILE = '_data/translations.json'


def commit(repository, filename):
    try:
        with repository.transaction():
            repository.execute(['add', filename])
            repository.execute(['commit', '-m', 'File {} updated'.format(filename)])
            # repository.execute(['push'])
    except Exception:
        app.logger.exception('Commit failed')
        return False


#site config response
@app.route('/site/<site_id>/config')
@cross_origin()
@authorization_required('contributor', 'administrator')
def site_config(site_id):
    repository = Repository(site_id)
    with repository.open('jekylledit.json', 'r') as fp:
        config = json.load(fp)
    # TODO: Validate
    return jsonify(config)


# Handle working with posts
@app.route('/site/<site_id>/<file_id>', methods=['GET', 'POST', 'PUT'])
@cross_origin()
@authorization_required('contributor', 'administrator')
def site_file(site_id, file_id):
    repository = Repository(site_id)
    filename = b64decode(file_id).decode()

    # Save new post
    if request.method == 'POST':
        data = request.get_json()
        post = frontmatter.Post()
        if 'metadata' in data:
            post.metadata = data['metadata']
        if 'content' in data:
            post.content = data['content']
        with repository.open(filename, 'r') as fp:
            formatter.dump(post, fp)
        return jsonify({
            'status': status,
            'site': site_id,
            'file': filename
        })

    # Save content of post to file
    elif request.method == 'PUT':
        data = request.get_json()
        if data is not None:
            # Save post data to file
            with repository.open(filename, 'r+') as fp:
                # XXX
                # This is not PUT semantics. It should just
                # overwrite anything that was in the file.
                post = frontmatter.load(fp)
                if 'metadata' in data:
                    post.metadata = data['metadata']
                if 'content' in data:
                    post.content = data['content']
                fp.seek(0)
                fp.truncate()
                frontmatter.dump(post, fp)
            # Commit changes
            commited = commit(repository, filename)
            if commited:
                status = 'ok'
            else:
                status = 'failed'
        else:
            status = 'failed'
        return jsonify({
            'status': status,
            'site': site_id,
            'file': filename
        })

    # Return post's attributes
    else:
        with repository.open(filename, 'r') as fp:
            post = frontmatter.load(fp)
        return jsonify({
            'metadata': post.metadata,
            'content': post.content
        })


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
