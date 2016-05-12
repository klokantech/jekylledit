import requests


class Mailgun:

    def __init__(self, app=None):
        self.key = None
        self.domain = None
        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        self.key = app.config['MAILGUN_KEY']
        self.domain = app.config['MAILGUN_DOMAIN']

    def send(self, data):
        url = 'https://api.mailgun.net/v3/{}/messages'.format(self.domain)
        requests.post(url, auth=('api', self.key), data=data)
