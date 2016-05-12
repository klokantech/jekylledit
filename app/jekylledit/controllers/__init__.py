from .base import app
from . import auth
from . import site
from . import translations
app.register_blueprint(auth.blueprint, url_prefix='/auth')
