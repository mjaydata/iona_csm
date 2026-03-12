"""Task management endpoints."""

from fastapi import APIRouter, Depends, Request

from ..models.schemas import Task, TaskCreate
from ..services.databricks import DatabricksService, get_databricks_service

router = APIRouter()


@router.post("", response_model=Task)
async def create_task(
    task: TaskCreate,
    request: Request,
    db: DatabricksService = Depends(get_databricks_service),
) -> Task:
    """Create a new task for an account."""
    # In production, get user from Databricks Apps headers
    # For local dev, use a mock user
    user_id = request.headers.get("X-Forwarded-User", "dev-user")

    return db.create_task(task, user_id)
