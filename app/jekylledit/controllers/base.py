import os
import os.path

from functools import lru_cache
from urllib.parse import urlparse

from flask import Flask, redirect, request, url_for
from flask.ext.babel import Babel
from flask.ext.login import LoginManager, current_user
from flask.ext.principal import Identity, Permission, PermissionDenied, Principal
from ..model import Account, db


app = Flask('jekylledit')
app.config.from_object('{}.settings'.format(app.import_name))

babel = Babel(app)
login_manager = LoginManager(app)
principal = Principal(app, use_sessions=False, skip_static=True)

admin_role = Permission('admin')


@app.template_global()
def sign_in_url():
    if app.config['DEVELOPMENT']:
        return url_for('auth.sign_in', next=request.url)
    return url_for(
        'auth.sign_in',
        mode='select',
        next=url_for('auth.signed_in', next=request.url))


@login_manager.user_loader
def load_user(id):
    return Account.query.get(id)


@login_manager.unauthorized_handler
def authentication_required():
    return redirect(sign_in_url())


@principal.identity_loader
def load_identity():
    user = current_user._get_current_object()
    identity = Identity(user.get_id())
    if user.is_authenticated and user.is_admin:
        identity.provides.add('admin')
    return identity


@app.errorhandler(PermissionDenied)
def permission_denied(exc):
    return 'Forbidden', 403


@app.url_defaults
def add_mtime(endpoint, values):
    if endpoint == 'static' and not app.debug:
        values['t'] = mtime('static', values['filename'])


@lru_cache(maxsize=1024)
def mtime(dir, path):
    with app.open_resource(os.path.join(dir, path)) as fp:
        return int(os.fstat(fp.fileno()).st_mtime)


@app.template_global()
def url_for_js(name):
    if app.config['DEVELOPMENT']:
        host = urlparse(request.url).hostname
        return 'http://%s:9810/compile?id=%s-debug' % (host, name)
    return url_for('static', filename='js/{}.js'.format(name))
