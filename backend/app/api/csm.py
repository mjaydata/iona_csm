"""CSM management endpoints."""

from typing import Optional

from fastapi import APIRouter, Depends, Query

from ..models.schemas import (
    AccountWithCSMListResponse,
    CSMListResponse,
    CSMStats,
)
from ..services.databricks import DatabricksService, get_databricks_service

router = APIRouter()


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
