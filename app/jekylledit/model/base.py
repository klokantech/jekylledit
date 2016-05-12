from flask.ext.migrate import Migrate
from flask.ext.sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData


# Necessary for proper migrations.
metadata = MetaData(naming_convention={
    'pk': '%(table_name)s_pkey',
    'uq': '%(table_name)s_%(column_0_name)s_key',
    'fk': '%(table_name)s_%(column_0_name)s_fkey',
    'ix': '%(table_name)s_%(column_0_name)s_idx',
    'ck': '%(table_name)s_%(column_0_name)s_check',
})


db = SQLAlchemy(metadata=metadata)
migrate = Migrate(db=db)
