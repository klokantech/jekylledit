from datetime import datetime

from flask import Blueprint, abort, jsonify, redirect, render_template, request, url_for
from flask.ext.cors import cross_origin
from flask.ext.login import LoginManager, current_user, login_user, logout_user
from flask.ext.principal import Identity, Permission, PermissionDenied, Principal
from ..ext.identitytoolkit import Gitkit

from ..model import Account, db
from .base import app, mailgun


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


admin_permission = Permission('admin')


@login_manager.user_loader
def load_user(id):
    return Account.query.get(id)


@login_manager.unauthorized_handler
def authentication_required():
    return redirect(auth_url_for('sign_in'))


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


@app.template_global()
def auth_url_for(endpoint, **values):
    if endpoint == 'widget':
        if app.config['DEVELOPMENT']:
            values.setdefault('next', request.url)
            return url_for('auth.widget', **values)
        next = values.pop('next', request.url)
        values['next'] = url_for('auth.sign_in_success', next=next, _external=True)
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
            account = Account(email=email, email_verified=True)
            db.session.add(account)
            db.session.flush()
        login_user(account)
        db.session.commit()
        return redirect(request.args.get('next', request.url_root))
    return render_template('auth/widget.html')


@blueprint.route('/sign-in-success')
def sign_in_success():
    token = gitkit.verify_token()
    if token is None:
        abort(400)
    gitkit_account = gitkit.get_account_by_id(token['id'])
    account = Account.query.filter_by(gitkit_id=token['id']).one_or_none()
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
    account = Account.get_or_404(id)
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


@blueprint.route('/token')
@cross_origin()
def token():
    return jsonify({
      "accessToken": "TOKEN_HERE" # XXX
    })
