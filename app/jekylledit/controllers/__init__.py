from .base import app
from . import auth
from . import site
app.register_blueprint(auth.blueprint, url_prefix='/auth')
app.register_blueprint(auth.firebase.blueprint, url_prefix='/auth')
