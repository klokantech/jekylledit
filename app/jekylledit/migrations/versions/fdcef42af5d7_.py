"""Create schema.

Revision ID: fdcef42af5d7
Revises: None
Create Date: 2016-05-12 13:21:22.866335

"""

# revision identifiers, used by Alembic.
revision = 'fdcef42af5d7'
down_revision = None

from alembic import op
import sqlalchemy as sa


def upgrade():
    op.create_table(
        'account',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('gitkit_id', sa.Text(), nullable=True),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('email_verified', sa.Text(), nullable=False),
        sa.Column('email_challenged', sa.DateTime(), nullable=True),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.Column('is_admin', sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint('id', name=op.f('account_pkey')),
        sa.UniqueConstraint('email', name=op.f('account_email_key')),
        sa.UniqueConstraint('gitkit_id', name=op.f('account_gitkit_id_key')),
    )


def downgrade():
    op.drop_table('account')
