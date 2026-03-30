"""CSM management endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..models.schemas import (
    AccountWithCSMListResponse,
    CSMSupportTicketsResponse,
    CSMListResponse,
    CSMStats,
)
from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)
router = APIRouter()


class CSMTypeUpdate(BaseModel):
    csm_id: str
    csm_type: str  # "full-time" | "part-time" | "backfill"


@router.get("/types")
async def get_csm_types(
    db: DatabricksService = Depends(get_databricks_service),
):
    """Get shared CSM type tags (visible to all users)."""
    return db.get_csm_types()


@router.put("/types")
async def update_csm_type(
    body: CSMTypeUpdate,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Update a CSM's type tag (shared across all users)."""
    if body.csm_type not in ("full-time", "part-time", "backfill"):
        raise HTTPException(status_code=400, detail="Invalid type. Must be full-time, part-time, or backfill")
    ok = db.update_csm_type(body.csm_id, body.csm_type)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update CSM type")
    return {"success": True}


@router.get("/profile/{csm_id}")
async def get_csm_profile(
    csm_id: str,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Get detailed CSM profile from Salesforce."""
    profile = db.get_csm_profile(csm_id)
    if not profile:
        raise HTTPException(status_code=404, detail="CSM not found")
    return profile


@router.get("/feedback/{csm_id}")
async def get_csm_feedback(
    csm_id: str,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Aggregated NPS/CSAT (SurveyMonkey + Freshdesk) for this CSM's accounts."""
    return db.get_csm_feedback_satisfaction(csm_id)


@router.get("/support-tickets/{csm_id}", response_model=CSMSupportTicketsResponse)
async def get_csm_support_tickets(
    csm_id: str,
    limit: int = Query(40, ge=1, le=100),
    account_type: Optional[str] = Query(None, description="Filter by dim_customers.account_type; omit for all"),
    db: DatabricksService = Depends(get_databricks_service),
):
    """Recent Freshdesk tickets for accounts where this user is the assigned CSM (csm_c)."""
    tickets = db.get_csm_support_tickets_recent(csm_id, limit=limit, account_type=account_type)
    return CSMSupportTicketsResponse(tickets=tickets)


@router.get("/assignment-history/distinct-csm-names")
async def get_distinct_csm_names_from_history(
    db: DatabricksService = Depends(get_databricks_service),
):
    """Distinct CSM names appearing in csm_assignment_history (csm_name and handed_off_from)."""
    return db.get_distinct_csm_names_from_assignment_history()


@router.get("/assignment-history/{csm_id}")
async def get_csm_assignment_history(
    csm_id: str,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Get assignment history for a CSM."""
    return db.get_csm_assignment_history(csm_id)


class CSMAssignmentHistoryUpdateBody(BaseModel):
    csm_id: str
    account_name: str
    assigned_from_key: str
    handed_off_from: Optional[str] = None
    handed_off_from_id: Optional[str] = None
    assigned_from: str
    assigned_until: Optional[str] = None
    status: str


class CSMAssignmentHistoryDeleteBody(BaseModel):
    csm_id: str
    account_name: str
    assigned_from: str


class CSMAssignmentHistoryCreateBody(BaseModel):
    csm_id: str
    csm_name: str
    account_name: str
    assigned_from: str
    assigned_until: Optional[str] = None
    handed_off_from: Optional[str] = None
    handed_off_from_id: Optional[str] = None
    status: str


@router.post("/assignment-history/create")
async def create_csm_assignment_history(
    body: CSMAssignmentHistoryCreateBody,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Insert a new row into csm_assignment_history."""
    if body.status not in ("Current", "Handed Off"):
        raise HTTPException(status_code=400, detail="status must be Current or Handed Off")
    ok = db.insert_csm_assignment_history_record(
        csm_id=body.csm_id,
        csm_name=body.csm_name,
        account_name=body.account_name,
        assigned_from=body.assigned_from,
        assigned_until=body.assigned_until,
        handed_off_from=body.handed_off_from,
        handed_off_from_id=body.handed_off_from_id,
        status=body.status,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to create assignment history row")
    return {"success": True}


@router.put("/assignment-history")
async def update_csm_assignment_history(
    body: CSMAssignmentHistoryUpdateBody,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Update one row in csm_assignment_history (correct handoff, dates, status)."""
    ok = db.update_csm_assignment_history_record(
        csm_id=body.csm_id,
        account_name=body.account_name,
        assigned_from_key=body.assigned_from_key,
        handed_off_from=body.handed_off_from,
        handed_off_from_id=body.handed_off_from_id,
        assigned_from_new=body.assigned_from,
        assigned_until=body.assigned_until,
        status=body.status,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to update assignment history")
    return {"success": True}


@router.post("/assignment-history/delete")
async def delete_csm_assignment_history(
    body: CSMAssignmentHistoryDeleteBody,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Delete one row from csm_assignment_history."""
    ok = db.delete_csm_assignment_history_record(
        csm_id=body.csm_id,
        account_name=body.account_name,
        assigned_from=body.assigned_from,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to delete assignment history")
    return {"success": True}


@router.get("/stats", response_model=CSMStats)
async def get_csm_stats(
    account_type: Optional[str] = Query(None, description="Filter by account type (Customer, Prospect, etc.)"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMStats:
    """Get CSM management dashboard statistics."""
    return db.get_csm_stats(account_type=account_type)


@router.get("/list", response_model=CSMListResponse)
async def list_csms(
    status: Optional[str] = Query(None, description="Filter by CSM status: active, inactive, departed"),
    account_type: Optional[str] = Query(None, description="Filter by account type (Customer, Prospect, etc.)"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMListResponse:
    """Get list of all CSMs with their metrics."""
    return db.get_csms(status=status, account_type=account_type)


@router.get("/accounts", response_model=AccountWithCSMListResponse)
async def list_accounts_with_csm(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    csm_id: Optional[str] = Query(None, description="Filter by CSM ID"),
    unassigned_only: bool = Query(False, description="Show only unassigned accounts"),
    search: Optional[str] = Query(None, description="Search by account name"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    db: DatabricksService = Depends(get_databricks_service),
) -> AccountWithCSMListResponse:
    """Get paginated list of accounts with their CSM assignment info."""
    accounts, total = db.get_accounts_with_csm(
        page=page,
        page_size=page_size,
        csm_id=csm_id,
        unassigned_only=unassigned_only,
        search=search,
        account_type=account_type,
    )

    total_pages = (total + page_size - 1) // page_size

    return AccountWithCSMListResponse(
        accounts=accounts,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
