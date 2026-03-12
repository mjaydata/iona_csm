"""User preferences API endpoints."""

import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional

from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)

router = APIRouter()


class PreferenceValue(BaseModel):
    value: str


class PreferenceResponse(BaseModel):
    preference_key: str
    value: Optional[str] = None
    updated_at: Optional[str] = None


def _get_user_email(request: Request) -> str:
    """Extract user email from Databricks Apps auth headers."""
    email = request.headers.get("X-Forwarded-Email",
            request.headers.get("X-Forwarded-User", "anonymous"))
    logger.info(f"_get_user_email: resolved to '{email}'")
    return email


@router.get("/{preference_key:path}", response_model=PreferenceResponse)
async def get_preference(
    preference_key: str,
    request: Request,
    db: DatabricksService = Depends(get_databricks_service),
) -> PreferenceResponse:
    """Get a user preference by key. Returns null value for first-time users."""
    user_email = _get_user_email(request)
    logger.info(f"GET preference: user={user_email}, key={preference_key}")

    result = db.get_user_preference(user_email, preference_key)
    if result:
        return PreferenceResponse(
            preference_key=preference_key,
            value=result["value"],
            updated_at=result["updated_at"],
        )
    # First-time user or no preference saved yet — return empty (not an error)
    return PreferenceResponse(preference_key=preference_key)


@router.put("/{preference_key:path}")
async def save_preference(
    preference_key: str,
    body: PreferenceValue,
    request: Request,
    db: DatabricksService = Depends(get_databricks_service),
) -> dict:
    """Save a user preference (insert for first-time, update for existing)."""
    user_email = _get_user_email(request)
    logger.info(f"PUT preference: user={user_email}, key={preference_key}, value_len={len(body.value)}")

    success = db.save_user_preference(user_email, preference_key, body.value)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to save preference to database")
    return {"success": True}
