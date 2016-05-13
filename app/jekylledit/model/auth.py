from flask.ext.login import UserMixin

from .base import JSON, db


class Site(db.Model):

    __tablename__ = 'site'

    id = db.Column(db.Text, primary_key=True)
    mtime = db.Column(db.Integer, nullable=False)
    gitkit_sign_in_options = db.Column(JSON)


class Account(UserMixin, db.Model):

    __tablename__ = 'account'

    id = db.Column(db.Text, primary_key=True)
    email = db.Column(db.Text, unique=True, nullable=False)
    email_verified = db.Column(db.Text, default=False, nullable=False)
    email_challenged = db.Column(db.DateTime)
    name = db.Column(db.Text)
    photo_url = db.Column(db.Text)

    roles = db.relationship('Roles')

    @property
    def is_active(self):
        return self.email_verified


class Roles(db.Model):

    __tablename__ = 'roles'

    email = db.Column(db.Text, db.ForeignKey('account.email'), primary_key=True)
    site_id = db.Column(db.Text, db.ForeignKey('site.id'), primary_key=True, index=True)
    roles = db.Column(JSON, nullable=False)
