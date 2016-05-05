from .base import app
from .auth import auth, gitkit
from . import example

if not app.config['DEVELOPMENT']:
    gitkit.init_app(app)

app.register_blueprint(auth, url_prefix='/auth')
