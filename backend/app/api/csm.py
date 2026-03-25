"""CSM management endpoints."""

import json
import logging
import os
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from ..models.schemas import (
    AccountWithCSMListResponse,
    CSMListResponse,
    CSMStats,
)
from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)
router = APIRouter()

# --- Shared CSM type tagging (JSON file) ---

_DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
_CSM_TYPES_FILE = _DATA_DIR / "csm_types.json"


def _read_csm_types() -> dict:
    try:
        if _CSM_TYPES_FILE.exists():
            return json.loads(_CSM_TYPES_FILE.read_text(encoding="utf-8"))
    except Exception as e:
        logger.error(f"Error reading csm_types.json: {e}")
    return {}


def _write_csm_types(data: dict) -> None:
    try:
        _DATA_DIR.mkdir(parents=True, exist_ok=True)
        _CSM_TYPES_FILE.write_text(
            json.dumps(data, indent=2), encoding="utf-8"
        )
    except Exception as e:
        logger.error(f"Error writing csm_types.json: {e}")
        raise


class CSMTypeUpdate(BaseModel):
    csm_id: str
    csm_type: str  # "full-time" | "part-time" | "backfill"


@router.get("/types")
async def get_csm_types():
    """Get shared CSM type tags (visible to all users)."""
    return _read_csm_types()


@router.put("/types")
async def update_csm_type(body: CSMTypeUpdate):
    """Update a CSM's type tag (shared across all users)."""
    if body.csm_type not in ("full-time", "part-time", "backfill"):
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Invalid type. Must be full-time, part-time, or backfill")
    data = _read_csm_types()
    data[body.csm_id] = body.csm_type
    _write_csm_types(data)
    return {"success": True}


@router.get("/stats", response_model=CSMStats)
async def get_csm_stats(
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMStats:
    """Get CSM management dashboard statistics."""
    return db.get_csm_stats()


@router.get("/list", response_model=CSMListResponse)
async def list_csms(
    status: Optional[str] = Query(None, description="Filter by CSM status: active, inactive, departed"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMListResponse:
    """Get list of all CSMs with their metrics."""
    return db.get_csms(status=status)


@router.get("/accounts", response_model=AccountWithCSMListResponse)
async def list_accounts_with_csm(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    csm_id: Optional[str] = Query(None, description="Filter by CSM ID"),
    unassigned_only: bool = Query(False, description="Show only unassigned accounts"),
    search: Optional[str] = Query(None, description="Search by account name"),
    db: DatabricksService = Depends(get_databricks_service),
) -> AccountWithCSMListResponse:
    """Get paginated list of accounts with their CSM assignment info."""
    accounts, total = db.get_accounts_with_csm(
        page=page,
        page_size=page_size,
        csm_id=csm_id,
        unassigned_only=unassigned_only,
        search=search,
    )

    total_pages = (total + page_size - 1) // page_size

    return AccountWithCSMListResponse(
        accounts=accounts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
