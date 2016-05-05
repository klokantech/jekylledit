from flask import Blueprint, abort, current_app, redirect, render_template, request
from flask.ext.login import login_user, logout_user
from ..ext.identitytoolkit import Gitkit

from ..model import Account, db


auth = Blueprint('auth', __name__)
gitkit = Gitkit(widget_endpoint='auth.sign_in')


@auth.route('/sign-in', methods={'GET', 'POST'})
def sign_in():
    if current_app.config.get('DEVELOPMENT', False) and request.method == 'POST':
        login_user(Account.query.filter_by(email=request.form['email']).one())
        return redirect(request.args.get('next', request.url_root))
    return render_template('auth/sign-in.html')


@auth.route('/signed-in')
def signed_in():
    token = gitkit.verify_token()
    if token is None:
        abort(400)
    gitkit_account = gitkit.get_account_by_id(token['id'])
    account = Account.query.filter_by(gitkit_id=token['id']).one_or_none()
    if account is None:
        account = Account.query.filter_by(email=token['email']).one_or_none()
    if account is None:
        account = Account(id=token['id'])
        db.session.add(account)
    account.email = gitkit_account['email']
    account.email_verified = gitkit_account['email_verified']
    account.name = gitkit_account['name']
    account.photo_url = gitkit_account['photo_url']
    db.session.flush()
    login_user(account)
    db.session.commit()
    return redirect(request.args.get('next', request.url_root))


@auth.route('/sign-out')
def sign_out():
    logout_user()
    response = redirect(request.url_root)
    if not current_app.config.get('DEVELOPMENT', False):
        gitkit.delete_token(response)
    return response
