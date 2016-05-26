"""Track email challenges and their codes.

Revision ID: 2cf8288266e0
Revises: b04e0f09ebca
Create Date: 2016-05-26 10:41:15.385102

"""

# revision identifiers, used by Alembic.
revision = '2cf8288266e0'
down_revision = 'b04e0f09ebca'

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'challenge',
        sa.Column('oob_code', sa.Unicode(), nullable=False),
        sa.Column('site_id', sa.Unicode(), nullable=False),
        sa.Column('account_id', sa.Unicode(), nullable=False),
        sa.Column('moment', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('oob_code', name=op.f('challenge_pkey')),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], name=op.f('challenge_site_id_fkey')),
        sa.ForeignKeyConstraint(['account_id'], ['account.id'], name=op.f('challenge_account_id_fkey')),
    )


def downgrade():
    op.drop_table('challenge')
