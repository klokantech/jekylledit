import os.path

from base64 import b64decode
from subprocess import check_call

import frontmatter

from flask import render_template, json, jsonify, request
from flask.ext.cors import cross_origin
from flask.ext.login import login_required

from .base import app


SITES_FOLDER = '/var/www/jekylledit'
TRANSLATIONS_FILE = '_data/translations.json'
JE_CONFIG_NAME = 'jekylledit.json'


def git_call(dir, args):
    cmd = [
        'git',
        '--git-dir={}'.format(os.path.join(dir, '.git')),
        '--work-tree={}'.format(dir),
    ]
    cmd.extend(args)
    check_call(cmd)


def commit(repository, filename):
    # TODO: Use '-c user.email=...' to author.
    dir = os.path.join(SITES_FOLDER, repository)
    try:
        git_call(dir, ['add', filename])
        git_call(dir, ['commit', '-m', 'File {} updated'.format(filename)])
        # git_call(dir, ['push'])
    except Exception:
        git_call(dir, ['reset', '--hard', 'HEAD'])
        return False


@app.route('/')
def index():
    return render_template('index.html')


#site config response
@app.route('/site/<site_id>/config')
@cross_origin()
def site_config(site_id):
    with open_file(site_id, JE_CONFIG_NAME, 'r') as fp:
        config = json.load(fp)
    # TODO: Validate
    return jsonify(config)


# Handle working with posts
@app.route('/site/<site_id>/<file_id>', methods=['GET', 'POST', 'PUT'])
@cross_origin()
def site_get(site_id, file_id):
    filename = b64decode(file_id).decode()

    # Save new post
    if request.method == 'POST':
        data = request.get_json()
        post = frontmatter.Post()
        if 'metadata' in data:
            post.metadata = data['metadata']
        if 'content' in data:
            post.content = data['content']
        with open_file(site_id, filename, 'r') as fp:
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
            with open_file(site_id, filename, 'r+') as fp:
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
            commited = commit(site_id, filename)
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
        with open_file(site_id, filename, 'r') as fp:
            post = frontmatter.load(fp)
        return jsonify({
            'metadata': post.metadata,
            'content': post.content
        })


#site translations
@app.route('/site/<site_id>/translations', methods=['GET', 'PUT'])
@cross_origin()
def translations(site_id):
    if request.method == 'GET':
        with open_file(site_id, TRANSLATIONS_FILE, 'r') as fp:
            translations = json.load(fp)
        # TODO: Validate
        return jsonify(translations)
    elif request.method == 'PUT':
        data = request.get_json()
        # TODO: Validate
        with open_file(site_id, TRANSLATIONS_FILE, 'w') as fp:
            json.dump(data, fp)
        # Commit changes
        commited = commit(site_id, TRANSLATIONS_FILE)
        if commited:
            status = 'ok'
        else:
            status = 'failed'
        return jsonify({
            'status': status,
            'site': site_id
        })


def open_file(site_id, filename, mode):
    # Python in Docker has ASCII as default encoding.
    path = os.path.join(SITES_FOLDER, site_id, filename)
    return open(path, mode, encoding='utf-8')
