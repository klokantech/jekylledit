"""Create schema.

Revision ID: b04e0f09ebca
Revises: None
Create Date: 2016-05-13 11:36:41.293473

"""

# revision identifiers, used by Alembic.
revision = 'b04e0f09ebca'
down_revision = None

from alembic import op
import sqlalchemy as sa

from jekylledit.model.base import JSON


def upgrade():
    op.create_table(
        'account',
        sa.Column('id', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('email_verified', sa.Text(), nullable=False),
        sa.Column('email_challenged', sa.DateTime(), nullable=True),
        sa.Column('name', sa.Text(), nullable=True),
        sa.Column('photo_url', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('account_pkey')),
        sa.UniqueConstraint('email', name=op.f('account_email_key')),
    )
    op.create_table(
        'site',
        sa.Column('id', sa.Text(), nullable=False),
        sa.Column('mtime', sa.Integer(), nullable=False),
        sa.Column('gitkit_sign_in_options', JSON(), nullable=True),
        sa.PrimaryKeyConstraint('id', name=op.f('site_pkey')),
    )
    op.create_table(
        'roles',
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('site_id', sa.Text(), nullable=False),
        sa.Column('roles', JSON(), nullable=False),
        sa.ForeignKeyConstraint(['email'], ['account.email'], name=op.f('roles_email_fkey')),
        sa.ForeignKeyConstraint(['site_id'], ['site.id'], name=op.f('roles_site_id_fkey')),
        sa.PrimaryKeyConstraint('email', 'site_id', name=op.f('roles_pkey')),
    )
    op.create_index(op.f('roles_site_id_idx'), 'roles', ['site_id'], unique=False)


def downgrade():
    op.drop_index(op.f('roles_site_id_idx'), table_name='roles')
    op.drop_table('roles')
    op.drop_table('site')
    op.drop_table('account')
