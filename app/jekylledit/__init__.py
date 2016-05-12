from .model import db, migrate
from .controllers import app

db.init_app(app)
migrate.init_app(app, db)
