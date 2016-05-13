import json

from flask.ext.migrate import Migrate
from flask.ext.sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.types import TypeDecorator


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


class JSON(TypeDecorator):

    impl = db.Text

    def process_bind_param(self, value, dialect):
        if value is not None:
            return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is not None:
            return json.loads(value)
