from flask import json, jsonify, request
from flask.ext.cors import cross_origin
from flask.ext.login import login_required
from subprocess import call

from .base import app, admin_role


SITES_FOLDER = '/var/www/jekylledit'
TRANSLATIONS_FILE = '_data/translations.json'


def commit(repository, filename):
    try:
        gitdir = SITES_FOLDER + repository + '/'
        call(['git', '--git-dir=' + gitdir + '.git', '--work-tree=' + gitdir, 'add', filename])
        call(['git', '--git-dir=' + gitdir + '.git', '--work-tree=' + gitdir, 'commit', '-m', 'File ' + filename + 'updated'])
      # call(['git', '--git-dir=' + gitdir + '.git', '--work-tree=' + gitdir, 'push'])
        return True
    except:
        return False


#site translations
@app.route('/translations/<string:site_id>', methods=['GET', 'PUT'])
@cross_origin()
def translations(site_id):

    translations_path = SITES_FOLDER + '/' + site_id + '/' + TRANSLATIONS_FILE
    if request.method == 'GET':
        f = open(translations_path, 'r', encoding='UTF-8')
        translations = json.loads(f.read())
        # TODO: Validate
        return jsonify(translations)
    elif request.method == 'PUT':
        f = open(translations_path, 'rw', encoding='UTF-8')
        f.seek(0)
        f.truncate()

        data = request.json
        # TODO: Validate
        f.write(data)

        # Commit changes
        commited = commit(site_id, TRANSLATIONS_FILE)
        if commited:
            status = 'ok'
        else:
            status = 'failed'

        resp = {'status': status, 'site': site_id}
        return jsonify(resp)

        return
