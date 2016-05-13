import json
import os
import re

from datetime import datetime
from functools import wraps
from urllib.parse import urlparse, parse_qs

from flask import Blueprint, _request_ctx_stack, abort, jsonify, \
    redirect, render_template, request, url_for
from flask.ext.login import LoginManager, current_user, login_user, logout_user
from flask.ext.principal import Identity, Permission, PermissionDenied, Principal
from ..ext.identitytoolkit import Gitkit
from itsdangerous import URLSafeTimedSerializer

from ..model import Account, Repository, Roles, Site, db
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


@login_manager.unauthorized_handler
def authentication_required():
    return redirect(auth_url_for('widget', mode='select'))


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


@app.template_global()
def auth_url_for(endpoint, **values):
    if endpoint == 'widget':
        if app.config['DEVELOPMENT']:
            values.setdefault('next', request.url)
            return url_for('auth.widget', **values)
        next = values.pop('next', request.url)
        values['next'] = url_for(
            'auth.sign_in_success',
            next=next,
            _external=True)
        return url_for('auth.widget', **values)
    if endpoint == 'sign_out':
        return url_for('auth.sign_out', **values)
    raise Exception('Invalid enpoint: {}'.format(endpoint))


@blueprint.route('/widget', methods={'GET', 'POST'})
def widget():
    if app.config['DEVELOPMENT'] and request.method == 'POST':
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
        return redirect(request.args.get('next', request.url_root))
    if not app.config['DEVELOPMENT']:
        url_adapter = _request_ctx_stack.top.url_adapter
        next = request.args.get('next')
        if next is not None:
            url = urlparse(next)
            if url.netloc != request.host:
                abort(400)
            endpoint, __ = url_adapter.match(url.path, 'GET')
            if endpoint != 'auth.sign_in_success':
                abort(400)
            query = parse_qs(url.query)
            next = query.get('next')
            if next is None:
                abort(400)
            url = urlparse(next[0])
            if url.netloc != request.host:
                abort(400)
            endpoint, values = url_adapter.match(url.path, 'GET')
            if endpoint != 'auth.site_authenticated':
                abort(400)
            site_id = values['site_id']
            site = synchronize(site_id)
            sign_in_options = site.gitkit_sign_in_options or gitkit.sign_in_options
        elif request.args.get('mode') == 'select':
            abort(400)
        else:
            sign_in_options = gitkit.sign_in_options
        config = gitkit.config(
            siteName='Jekyll Edit',
            accountChooserEnabled=False,
            signInOptions=sign_in_options,
            displayMode='providerFirst')
    else:
        config=None
    return render_template('auth/widget.html', config_=config)


@blueprint.route('/sign-in-success')
def sign_in_success():
    token = gitkit.verify_token()
    if token is None:
        abort(400)
    gitkit_account = gitkit.get_account_by_id(token['id'])
    account = Account.query.get(token['id'])
    if account is None:
        account = Account(id=token['id'])
        db.session.add(account)
    account.email = gitkit_account['email']
    account.email_verified = gitkit_account['email_verified']
    account.name = gitkit_account['name']
    account.photo_url = gitkit_account['photo_url']
    if not account.email_verified:
        if account.email_challenged is None:
            send_email_challenge(account)
        db.session.flush()
        response = redirect(url_for('.verify_email', id=account.id))
        db.session.commit()
        return response
    db.session.flush()
    login_user(account)
    db.session.commit()
    return redirect(request.args.get('next', request.url_root))


@blueprint.route('/sign-out')
def sign_out():
    logout_user()
    response = redirect(request.url_root)
    if not app.config['DEVELOPMENT']:
        gitkit.delete_token(response)
    return response


@blueprint.route('/account/<id>/verify-email', methods={'GET', 'POST'})
def verify_email(id):
    account = Account.query.get_or_404(id)
    if request.method == 'POST' and not account.email_verified:
        send_email_challenge(account)
        db.session.commit()
    return render_template('auth/verify-email.html', account=account)


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
    if not current_user.is_authenticated:
        next = url_for('.site_authenticated', site_id=site_id, _external=True)
        location = auth_url_for('widget', mode='select', next=next, _external=True)
        return jsonify({
            'status_code': 401,
            'location': location,
        })
    if not any(roles.site_id == site_id for roles in current_user.roles):
        return jsonify({
            'status_code': 403,
        })
    return jsonify({
        'status_code': 200,
        'access_token': token_serializer.dumps(current_user.id),
    })


@blueprint.route('/site/<site_id>/authenticated')
def site_authenticated(site_id):
    return render_template('auth/site-authenticated.html')


def send_email_challenge(account):
    text = render_template(
        'auth/verify-email.txt',
        oob_link=gitkit.get_email_verification_link(account.email))
    send(account.email, 'Verify email address', text)
    account.email_challenged = datetime.utcnow()


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
        site.gitkit_sign_in_options = data.get('gitkit_sign_in_options') or None
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
