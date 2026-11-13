"""create adaptive assessments table

Revision ID: 8c4f92d1a3b5
Revises: 7ed2dc590916
Create Date: 2026-11-13 16:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8c4f92d1a3b5'
down_revision: Union[str, Sequence[str], None] = '7ed2dc590916'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'adaptive_assessments',
        sa.Column('candidate_id', sa.String(length=36), nullable=False),
        sa.Column('job_category', sa.String(length=100), nullable=False),
        sa.Column('interview_level', sa.String(length=50), nullable=False),
        sa.Column('cv_filename', sa.String(length=255), nullable=True),
        sa.Column('cv_text_summary', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=30), nullable=False),
        sa.Column('total_questions_asked', sa.Integer(), nullable=False),
        sa.Column('total_correct', sa.Integer(), nullable=False),
        sa.Column('current_round', sa.Integer(), nullable=False),
        sa.Column('current_question_index', sa.Integer(), nullable=False),
        sa.Column('rounds_data', sa.JSON(), nullable=False),
        sa.Column('summary_report', sa.JSON(), nullable=True),
        sa.Column('termination_reason', sa.String(length=255), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.String(length=36), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_adaptive_assessments_candidate_id'), 'adaptive_assessments', ['candidate_id'], unique=False)
    op.create_index(op.f('ix_adaptive_assessments_id'), 'adaptive_assessments', ['id'], unique=False)
    op.create_index(op.f('ix_adaptive_assessments_job_category'), 'adaptive_assessments', ['job_category'], unique=False)
    op.create_index(op.f('ix_adaptive_assessments_status'), 'adaptive_assessments', ['status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_adaptive_assessments_status'), table_name='adaptive_assessments')
    op.drop_index(op.f('ix_adaptive_assessments_job_category'), table_name='adaptive_assessments')
    op.drop_index(op.f('ix_adaptive_assessments_id'), table_name='adaptive_assessments')
    op.drop_index(op.f('ix_adaptive_assessments_candidate_id'), table_name='adaptive_assessments')
    op.drop_table('adaptive_assessments')

