import json
import os
import re

from datetime import datetime
from functools import wraps
from urllib.parse import urlparse, parse_qs

from flask import Blueprint, _request_ctx_stack, abort, jsonify, make_response, \
    redirect, render_template, request, url_for
from flask.ext.login import LoginManager, current_user, login_user, logout_user
from flask.ext.principal import Identity, Permission, PermissionDenied, Principal
from ..ext.identitytoolkit import Gitkit
from itsdangerous import URLSafeTimedSerializer

from ..model import Account, Challenge, Repository, Roles, Site, Sites, db
from .base import app, mailgun, jsonp


blueprint = Blueprint('auth', __name__)
login_manager = LoginManager(app)
principal = Principal(app, use_sessions=False, skip_static=True)
if not app.config['DEVELOPMENT']:
    gitkit = Gitkit(app, {
        'widget': 'auth.widget',
        'sign_in_success': 'auth.sign_in_success',
        'sign_out': 'auth.sign_out',
        'oob_action': 'auth.oob_action',
    })
else:
    gitkit = None


GITKIT_OPTIONS = {'accountChooserEnabled', 'displayMode', 'signInOptions'}


token_serializer = URLSafeTimedSerializer(app.secret_key, salt='access-token')
token_regex = re.compile(r'Bearer\s+([-_.0-9a-zA-Z]+)$')


@login_manager.user_loader
def load_user(id):
    return Account.query.get(id)


@login_manager.request_loader
def load_user_from_request(request):
    header = request.headers.get('Authorization')
    if header is None:
        return None
    match = token_regex.match(header)
    if match is None:
        return None
    account_id = token_serializer.loads(match.group(1), max_age=86400)
    return Account.query.get(account_id)


@principal.identity_loader
def load_identity():
    user = current_user._get_current_object()
    identity = Identity(user.get_id())
    if user.is_authenticated:
        for roles in user.roles:
            for role in roles.roles:
                identity.provides.add((role, roles.site_id))
    return identity


def authorization_required(*roles):
    def decorator(func):
        @wraps(func)
        def wrapper(**values):
            if not current_user.email_verified:
                abort(403)
            site_id = values['site_id']
            synchronize(site_id)
            needs = [(role, site_id) for role in roles]
            with Permission(*needs).require():
                return func(**values)
        return wrapper
    return decorator


@app.errorhandler(PermissionDenied)
def permission_denied(exc):
    return 'Forbidden', 403


@blueprint.route('/widget', methods={'GET', 'POST'})
def widget():
    if app.config['DEVELOPMENT']:
        if request.method == 'GET':
            return render_template('auth/widget.html')
        email = request.form['email']
        account = Account.query.filter_by(email=email).one_or_none()
        if account is None:
            account = Account(
                id=email,
                email=email,
                email_verified=True)
            db.session.add(account)
            db.session.flush()
        login_user(account)
        db.session.commit()
        return render_template('auth/close-window.html', message='You have signed in.')
    if request.args.get('mode') != 'select':
        return render_template('auth/widget.html', options={})
    url_adapter = _request_ctx_stack.top.url_adapter
    next = request.args.get('next')
    if next:
        url = urlparse(next)
        if url.netloc != request.host:
            abort(400)
        endpoint, values = url_adapter.match(url.path, 'GET')
        if endpoint != 'auth.sign_in_success':
            abort(400)
        site_id = values['site_id']
        site = synchronize(site_id)
        return render_template('auth/widget.html', options=site.gitkit_options)
    url = urlparse(request.referrer)
    if url.netloc != request.host:
        abort(400)
    endpoint, __ = url_adapter.match(url.path, 'GET')
    if endpoint != request.endpoint:
        abort(400)
    oob_code = parse_qs(url.query).get('oobCode')
    if not oob_code or len(oob_code) != 1:
        abort(400)
    challenge = Challenge.query.get(oob_code[0])
    if challenge is None:
        abort(400)
    base_url = Sites(challenge.site_id).get_base_url()
    return redirect('{}#sign-in'.format(base_url))


@blueprint.route('/site/<site_id>/sign-in-success')
def sign_in_success(site_id):
    token = gitkit.verify_token()
    if token is None:
        abort(400)
    gitkit_account = gitkit.get_account_by_id(token['id'])
    account = Account.query.get(token['id'])
    if account is None:
        account = Account(id=token['id'])
        db.session.add(account)
    email = gitkit_account['email']
    account.email = email
    account.email_verified = gitkit_account['email_verified']
    account.name = gitkit_account['name']
    account.photo_url = gitkit_account['photo_url']
    db.session.flush()
    if account.email_verified:
        login_user(account)
        db.session.commit()
        return render_template('auth/close-window.html', message='You have signed in.')
    oob_link = gitkit.get_email_verification_link(email)
    challenge = Challenge(
        oob_code=parse_qs(urlparse(oob_link).query)['oobCode'][0],
        site_id=site_id,
        account_id=account.id,
        moment=datetime.utcnow())
    db.session.add(challenge)
    db.session.commit()
    text = render_template('auth/verify-email.txt', oob_link=oob_link)
    send(email, 'Verify email address', text)
    return render_template('auth/close-window.html', message='Email verification link sent.')


@blueprint.route('/sign-out')
def sign_out():
    logout_user()
    text = render_template('auth/close-window.html', message='You have signed out.')
    response = make_response(text)
    if not app.config['DEVELOPMENT']:
        gitkit.delete_token(response)
    return response


@blueprint.route('/oob-action')
def oob_action():
    result = gitkit.get_oob_result()
    if result['action'] == 'changeEmail':
        text = render_template(
            'auth/change-email.txt',
            email=result['email'],
            new_email=result['new_email'],
            oob_link=result['oob_link'])
        send(result['new_email'], 'Change of email address', text)
        return result['response_body']
    if result['action'] == 'resetPassword':
        text = render_template(
            'auth/reset-password.txt',
            oob_link=result['oob_link'])
        send(result['email'], 'Password reset', text)
        return result['response_body']
    raise Exception('Invalid action {}'.format(result['action']))


@blueprint.route('/site/<site_id>/token')
@jsonp
def site_token(site_id):
    synchronize(site_id)
    next = url_for('.sign_in_success', site_id=site_id, _external=True)
    response = {
        'sign_in': url_for('.widget', mode='select', next=next, _external=True),
        'sign_out': url_for('.sign_out', _external=True),
    }
    user = current_user._get_current_object()
    if not user.is_authenticated:
        response['status_code'] = 401
        return jsonify(response)
    response['account'] = {
        'email': user.email,
        'email_verified': user.email_verified,
        'name': user.name,
    }
    for roles in user.roles:
        if roles.site_id == site_id:
            response['account']['roles'] = roles.roles
            break
    if not user.email_verified or 'roles' not in response['account']:
        response['status_code'] = 403
        return jsonify(response)
    response['status_code'] = 200
    response['access_token'] = token_serializer.dumps(user.id)
    return jsonify(response)


def send(recipient, subject, text):
    mailgun.send({
        'from': 'no-reply@{}'.format(mailgun.domain),
        'to': recipient,
        'subject': subject,
        'text': text,
    })


def synchronize(site_id):
    repository = Repository(site_id)
    site = Site.query.get(site_id)
    try:
        mtime = os.stat(repository.path('jekylledit-access.json')).st_mtime
    except FileNotFoundError:
        mtime = None
    if site is None and mtime is None:
        return site
    if site is not None and site.mtime == mtime:
        return site
    db.session.execute(Roles.__table__.delete(Roles.site_id == site_id))
    if mtime is not None:
        with repository.open('jekylledit-access.json', 'r') as fp:
            data = json.load(fp)
        if site is None:
            site = Site(id=site_id)
            db.session.add(site)
        site.mtime = mtime
        gitkit_options = data.get('gitkit_options') or None
        if gitkit_options is not None:
            if not set(gitkit_options).issubset(GITKIT_OPTIONS):
                raise Exception
        site.gitkit_options = gitkit_options
        roles = []
        default_roles = data.get('default_roles', ['visitor'])
        for account in data.get('accounts', []):
            roles.append({
                'email': account['email'],
                'site_id': site_id,
                'roles': account.get('roles', default_roles) or None,
            })
        db.session.bulk_insert_mappings(Roles, roles)
    else:
        db.session.delete(site)
    db.session.commit()
    login_manager.reload_user()
    principal.set_identity(load_identity())
    return site
