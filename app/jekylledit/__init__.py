from .model import db
from .controllers import app

db.init_app(app)
