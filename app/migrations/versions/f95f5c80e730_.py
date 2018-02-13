"""Replace challenge with oob_action.

Revision ID: f95f5c80e730
Revises: 2cf8288266e0
Create Date: 2016-06-15 15:07:04.644101

"""

# revision identifiers, used by Alembic.
revision = 'f95f5c80e730'
down_revision = '2cf8288266e0'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'oob_action',
        sa.Column('oob_code', sa.Unicode(), nullable=False),
        sa.Column('site_id', sa.Unicode(), nullable=False),
        sa.Column('moment', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('oob_code', name=op.f('oob_action_pkey')),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], name=op.f('oob_action_site_id_fkey')),
    )
    op.execute("""\
        INSERT INTO oob_action (oob_code, site_id, moment)
        SELECT oob_code, site_id, moment
        FROM challenge
    """)
    op.drop_table('challenge')


def downgrade():
    pass
