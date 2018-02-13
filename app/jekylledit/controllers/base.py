import os
import os.path

from functools import lru_cache, wraps
from urllib.parse import urlparse

from flask import Flask, request, url_for
from flask_babel import Babel
from ..ext.mailgun import Mailgun
from ..ext.normalizeUnicode import normalizeUnicode


app = Flask('jekylledit')
app.config.from_object('{}.settings'.format(app.import_name))


babel = Babel(app)
if not app.debug:
    mailgun = Mailgun(app)
else:
    mailgun = None


def jsonp(func):
    """Wrap JSONified response for JSONP requests."""
    @wraps(func)
    def wrapper(*args, **kwargs):
        response = func(*args, **kwargs)
        callback = request.args.get('callback')
        if callback:
            data = response.get_data()
            # Working on bytes is more efficient, but Python only supports
            # formatting on bytes since version 3.5. This will have to do.
            response.set_data(b''.join((callback.encode(), b'(', data, b')')))
            response.mimetype = 'application/javascript'
        return response
    return wrapper


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
    if app.debug:
        host = urlparse(request.url).hostname
        return 'http://%s:9810/compile?id=%s-debug' % (host, name)
    return url_for('static', filename='js/{}.js'.format(name))
