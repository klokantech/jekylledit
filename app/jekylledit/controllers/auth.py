import json
import os
import re

from functools import wraps

from flask import Blueprint, jsonify, render_template, url_for
from flask_firebase import FirebaseAuth
from flask_login import LoginManager, current_user, login_user, logout_user
from flask_principal import Identity, Permission, PermissionDenied, Principal
from itsdangerous import URLSafeTimedSerializer

from ..model import Account, Repository, Roles, Site, db
from .base import app, jsonp


blueprint = Blueprint('auth', __name__)
firebase = FirebaseAuth(app)
login_manager = LoginManager(app)
principal = Principal(app, use_sessions=False, skip_static=True)


token_serializer = URLSafeTimedSerializer(app.secret_key, salt='access-token')
token_regex = re.compile(r'Bearer\s+([-_.0-9a-zA-Z]+)$')


@firebase.production_loader
def production_sign_in(token):
    account = Account.query.get(token['sub'])
    if account is None:
        account = Account.query.filter(Account.email == token['email']).one_or_none()
        if account is not None:
            # ID Changed when moving from Gitkit to Firebase.
            account.id = token['sub']
        else:
            account = Account(id=token['sub'])
            db.session.add(account)
    account.email = token['email']
    account.email_verified = token['email_verified']
    account.name = token['name']
    db.session.flush()
    login_user(account)
    db.session.commit()


@firebase.unloader
def sign_out():
    logout_user()


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
            # XXX
            # if not current_user.email_verified:
            #     abort(403)
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


@blueprint.route('/signed-in')
def signed_in():
    return render_template('auth/close-window.html', message='You have signed in.')


@blueprint.route('/signed-out')
def signed_out():
    return render_template('auth/close-window.html', message='You have signed out.')


@blueprint.route('/site/<site_id>/token')
@jsonp
def site_token(site_id):
    synchronize(site_id)
    response = {
        'sign_in': firebase.url_for(
            'widget',
            mode='select',
            next=url_for('auth.signed_in', _scheme='https', _external=True),
        ),
        'sign_out': firebase.url_for(
            'sign_out',
            next=url_for('auth.signed_out', _scheme='https', _external=True),
        ),
    }
    user = current_user._get_current_object()
    if not user.is_authenticated:
        response['status_code'] = 401
        return jsonify(response)
    response['account'] = {
        'email': user.email,
        'email_verified': True,  # XXX user.email_verified,
        'name': user.name,
    }
    for roles in user.roles:
        if roles.site_id == site_id:
            response['account']['roles'] = roles.roles
            break
    if 'roles' not in response['account']:  # XXX or not user.email_verified
        response['status_code'] = 403
        return jsonify(response)
    response['status_code'] = 200
    response['access_token'] = token_serializer.dumps(user.id)
    return jsonify(response)


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
