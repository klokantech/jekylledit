from flask import render_template
from flask.ext.login import login_required

from .base import app, admin_role


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/private')
@login_required
def private():
    return render_template('private.html')


@app.route('/admin')
@login_required
@admin_role.require()
def admin():
    return render_template('admin.html')
