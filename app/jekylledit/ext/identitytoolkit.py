from flask import request, url_for, _app_ctx_stack
from identitytoolkit import gitkitclient


class Gitkit:

    def __init__(self, app=None, endpoints=None):
        if endpoints is None:
            endpoints = {}
        self.params = None
        self.endpoints = endpoints
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        app.config.setdefault('GITKIT_COOKIE_NAME', 'gtoken')
        app.config.setdefault('GITKIT_SIGN_IN_OPTIONS', 'password')
        self.api_key = app.config['GITKIT_API_KEY']
        self.sign_in_options = [s.strip() for s in app.config['GITKIT_SIGN_IN_OPTIONS'].split(',')]
        self.params = {
            'client_id': app.config['GITKIT_CLIENT_ID'],
            'service_account_email': app.config['GITKIT_SERVICE_ACCOUNT_EMAIL'],
            'service_account_key': app.config['GITKIT_SERVICE_ACCOUNT_KEY'],
            'project_id': app.config['GITKIT_PROJECT_ID'],
            'cookie_name': app.config['GITKIT_COOKIE_NAME'],
        }
        app.add_template_global(self.config, name='gitkit_config')

    def get_email_verification_link(self, email):
        return self.client.GetEmailVerificationLink(email)

    def get_account_by_id(self, id):
        return account_to_dict(self.client.GetUserById(id))

    def get_account_by_email(self, email):
        return account_to_dict(self.client.GetUserByEmail(email))

    def get_all_accounts(self):
        for account in self.client.GetAllUsers():
            yield account_to_dict(account)

    def upload_accounts(self, hash_algorithm, hash_key, accounts):
        return self.client.UploadUsers(
            hash_algorithm,
            hash_key,
            [account_from_dict(a) for a in accounts])

    def delete_account(self, id):
        return self.client.DeleteUser(id)

    def verify_token(self):
        token = self.token
        if token is None:
            return None
        return account_to_dict(self.client.VerifyGitkitToken(token))

    def delete_token(self, response):
        response.set_cookie(self.params['cookie_name'], expires=0)

    def get_oob_result(self):
        token = self.token
        if token is None:
            return None
        return self.client.GetOobResult(
            request.form, request.remote_addr, token)

    @property
    def token(self):
        return request.cookies.get(self.params['cookie_name'])

    def config(self, **options):
        config = {
            'apiKey': self.api_key,
            'widgetUrl': self.url_for('widget'),
            'signInSuccessUrl': self.url_for('sign_in_success', site_id=''),
            'signOutUrl': self.url_for('sign_out'),
            'oobActionUrl': self.url_for('oob_action'),
            'signInOptions': self.sign_in_options,
            'queryParameterForSignInSuccessUrl': 'next',
        }
        config.update(options)
        return config

    @property
    def client(self):
        ctx = _app_ctx_stack.top
        if ctx is not None:
            client = getattr(ctx, 'gitkit_client', None)
            if client is None:
                client = gitkitclient.GitkitClient(
                    widget_url=self.url_for('widget'),
                    **self.params)
                ctx.gitkit_client = client
            return client

    def url_for(self, name, **values):
        try:
            endpoint = self.endpoints[name]
        except KeyError:
            return None
        return url_for(endpoint, _external=True, **values)


def account_to_dict(account):
    providers = account.provider_info
    if not providers:
        # The Google libary gives us dict instead for some reason.
        providers = []
    return {
        'id': account.user_id,
        'email': account.email,
        'email_verified': account.email_verified,
        'name': account.name,
        'password_hash': account.password_hash,
        'salt': account.salt,
        'photo_url': account.photo_url,
        'provider': account.provider_id,
        'provider_info': [provider_to_dict(p) for p in providers]
    }


def account_from_dict(dict_):
    return {
        'localId': dict_['id'],
        'email': dict_['email'],
        'emailVerified': dict_['email_verified'],
        'displayName': dict_.get('name'),
        'passwordHash': dict_.get('password_hash'),
        'salt': dict_.get('salt'),
    }


def provider_to_dict(provider):
    return {
        'provider': provider['providerId'],
        'email': provider['email'],
        'name': provider.get('displayName'),
        'raw_id': provider['rawId'],
        'federatedId': provider['federatedId'],
    }
