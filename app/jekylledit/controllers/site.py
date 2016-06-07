from base64 import b64decode
from datetime import date
from hashlib import sha1
from functools import wraps

import frontmatter
import hmac
from unicodedata import normalize

from flask import abort, json, jsonify, request, render_template
from flask.ext.cors import cross_origin
from flask.ext.login import current_user, login_required
from flask.ext.principal import Permission
from pid import PidFile, PidFileAlreadyLockedError

from ..model import Repository, Roles, Sites
from .base import app, mailgun
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

def site_lock(f, tries=5, delay=0.2):
    @wraps(f)
    def decorated_function(**values):
        site_id = values['site_id']

        local_tries, local_delay = tries, delay
        while local_tries > 0:
            try:
                with PidFile(piddir='/var/www/jekylledit', pidname=site_id + '.lock'):
                    return f(**values)
            except PidFileAlreadyLockedError:
                local_tries -= 1
                local_delay *= 2
    return decorated_function

#site config response
@app.route('/site/<site_id>/config')
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
@site_lock
def site_config(site_id):
    site = Sites(site_id)
    config = site.get_config()
    return jsonify(config)


# Handle working with posts
@app.route('/site/<site_id>/<file_id>', methods=['GET', 'POST', 'PUT', 'DELETE'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
@site_lock
def site_file(site_id, file_id):
    repository = Repository(site_id)
    site = Sites(site_id)
    config = site.get_config()
    languages = config['languages']

    # Save new post
    if request.method == 'POST':
        tocommit = []
        data = request.get_json()
        # Save images
        imgpaths = site.save_media(data['media'])
        tocommit.extend(imgpaths)
        # Save post
        postData = data['post']
        postIsDraft = False
        title = postData[languages[0]]['metadata']['title']
        normtitle = normalize('NFKD', title).encode('ascii', 'ignore').decode()
        slugtitle = normtitle.replace(' ', '-').lower()
        for i, language in enumerate(languages):
            langdata = postData[language]
            if not 'permalink' in langdata['metadata']:
                permalink = '/' + slugtitle + '/'
                if 'category' in langdata['metadata']:
                    permalink = '/' + langdata['metadata']['category'] + permalink
                if i != 0:
                    # Fist language is without linkprefix
                    permalink += '/' + language + permalink
                langdata['metadata']['permalink'] = permalink
            today = date.today().strftime('%Y-%m-%d')
            lfilename = '_posts/' + today + '-' + slugtitle + '-' + language + '.md'
            site.create_post(lfilename, langdata)
            tocommit.append(lfilename)
            if langdata['metadata'].get('published') == False:
                postIsDraft = True
        # Commit changes
        commit(repository, tocommit)

        # Notify admins about new draft
        if mailgun and postIsDraft:
            roles = Roles.query.filter_by(site_id=site_id).all()
            recipients = []
            for role in roles:
                if role.email != current_user.email and \
                   'administrator' in role.roles:
                    recipients.append(role.email)

            if len(recipients) > 0:
                base_url = site.get_base_url()
                if not base_url.endswith('/'):
                    base_url += '/'

                text = render_template(
                    'new-draft.txt',
                    author=current_user.email,
                    title=title,
                    site_id=site_id,
                    signin='{}#sign-in'.format(base_url)
                )
                mailgun.send({
                    'from': 'no-reply@{}'.format(mailgun.domain),
                    'to': ','.join(recipients),
                    'subject': '[{}] New draft submitted ({})'.format(site_id, title),
                    'text': text,
                })

        return 'OK'

    # Update post
    elif request.method == 'PUT':
        filename = b64decode(file_id).decode()
        if not repository.is_path_in(filename):
            abort(403)
        filemask = filename.rsplit('-', 1)[0] + '-{}.' \
        + filename.rsplit('.', 1)[1]

        tocommit = []
        data = request.get_json()
        # Save images
        imgpaths = site.save_media(data['media'])
        tocommit.extend(imgpaths)
        # Save posts
        postData = data['post']
        for language in languages:
            langdata = postData[language]
            lfilename = filemask.format(language)
            site.edit_post(lfilename, langdata)
            tocommit.append(lfilename)
            # Commit changes
        commit(repository, tocommit)
        return 'OK'

    # Remove post
    elif request.method == 'DELETE':
        if not Permission(('administrator', site_id)):
            abort(403)
        filename = b64decode(file_id).decode()
        if not repository.is_path_in(filename):
            abort(403)
        filemask = filename.rsplit('-', 1)[0] + '-{}.' \
        + filename.rsplit('.', 1)[1]

        tocommit = []
        for language in languages:
            lfilename = filemask.format(language)
            site.remove_post(lfilename)
            tocommit.append(lfilename)
        commit(repository, tocommit)
        return 'OK'

    # Return post
    else:
        filename = b64decode(file_id).decode()
        if not repository.is_path_in(filename):
            abort(403)
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
@site_lock
def drafts(site_id):
    site = Sites(site_id)
    drafts = site.get_drafts('_posts')
    if not Permission(('administrator', site_id)):
        email = current_user.email
        drafts_filtered = []
        for draft in drafts:
            if draft['author'] == email:
                drafts_filtered.append(draft)
        drafts = drafts_filtered
    return json.dumps(drafts)


#site translations
@app.route('/site/<site_id>/translations', methods=['GET', 'PUT'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
@site_lock
def site_translation(site_id):
    repository = Repository(site_id)
    if request.method == 'GET':
        with repository.open(TRANSLATIONS_FILE, 'r') as fp:
            translations = json.load(fp)
        return jsonify(translations)
    elif request.method == 'PUT':
        data = request.get_json()
        with repository.open(TRANSLATIONS_FILE, 'w') as fp:
            json.dump(data, fp,
                      sort_keys=True, indent=2, separators=(',', ': '))
        # Commit changes
        commit(repository, [TRANSLATIONS_FILE])
        return 'OK'


#user profiles
@app.route('/site/<site_id>/users', methods=['GET'])
@cross_origin()
@login_required
@authorization_required('administrator')
@site_lock
def user_profiles(site_id):
    site = Sites(site_id)
    #  Get users list
    if Permission(('administrator', site_id)):
        usersdata = site.get_users()
        users = []
        for user in usersdata:
            data = {'id': user['id'], 'username': user['id']}
            if 'username' in user:
              data['username'] = user['username']
            users.append(data)
        return json.dumps(users)


@app.route('/site/<site_id>/user/<user_id>/profile', methods=['GET', 'PUT'])
@cross_origin()
@login_required
@authorization_required('contributor', 'administrator')
@site_lock
def user_profile(site_id, user_id):
    site = Sites(site_id)
    #  Get current user
    # JE uses emails as identificators
    if user_id == 'current':
        user = current_user.email
    else:
        if Permission(('administrator', site_id)):
            user = b64decode(user_id).decode()
        else:
            abort(403)
    if request.method == 'GET':
        userdata = site.get_user(user)
        return jsonify(userdata)
    elif request.method == 'PUT':
        data = request.get_json()
        data['id'] = user
        site.edit_user(data)
        # Commit changes
        commit(site.repository, [USERS_FILE])
        return 'OK'


@app.route('/site/<site_id>/update', methods=['POST'])
@site_lock
def update(site_id):
    secret = app.config.get('GITHUB_SECRET')
    if secret:
        header_signature = request.headers.get('X-Hub-Signature')
        if header_signature is None:
            abort(403)

        sha_name, signature = header_signature.split('=')
        if sha_name != 'sha1':
            abort(501)

        mac = hmac.new(bytes(secret, 'utf-8'), msg=request.data, digestmod=sha1)
        if not hmac.compare_digest(str(mac.hexdigest()), str(signature)):
            abort(403)
    else:
        abort(501) # not properly configured

    repository = Repository(site_id)
    with repository.transaction():
        repository.execute(['pull'])
    return 'OK'
