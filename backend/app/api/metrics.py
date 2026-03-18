"""Metrics/dashboard endpoints."""

import logging
from typing import Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, Query

from ..models.schemas import CustomerGrowthResponse, CustomerGrowthBreakdownResponse, HealthChangesResponse, HealthChangeDay, AccountMovement, MetricsSummary
from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/summary", response_model=MetricsSummary)
async def get_metrics_summary(
    account_type: Optional[str] = Query(None, description="Filter by account type (e.g., Customer, Prospect)"),
    renewal_period: int = Query(90, description="Renewal window in days (e.g., 30, 60, 90, 180, 365)"),
    db: DatabricksService = Depends(get_databricks_service),
) -> MetricsSummary:
    """Get dashboard KPI summary metrics."""
    return db.get_metrics_summary(account_type=account_type, renewal_period=renewal_period)


@router.get("/account-type-counts")
async def get_account_type_counts(
    db: DatabricksService = Depends(get_databricks_service),
) -> Dict[str, int]:
    """Get count of accounts per account type."""
    return db.get_account_type_counts()


@router.get("/customer-growth", response_model=CustomerGrowthResponse)
async def get_customer_growth(
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CustomerGrowthResponse:
    """Get customer growth data: YoY summary, monthly series, and events."""
    try:
        return db.get_customer_growth(account_type=account_type)
    except Exception as e:
        logger.error(f"customer-growth endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/customer-growth-breakdown", response_model=CustomerGrowthBreakdownResponse)
async def get_customer_growth_breakdown(
    dimension: str = Query("industry", description="Dimension to break down by: industry or region"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CustomerGrowthBreakdownResponse:
    """Get customer growth broken down by industry or region."""
    if dimension not in ("industry", "region"):
        raise HTTPException(status_code=400, detail="dimension must be 'industry' or 'region'")
    try:
        return db.get_customer_growth_breakdown(dimension=dimension, account_type=account_type)
    except Exception as e:
        logger.error(f"customer-growth-breakdown endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health-changes", response_model=HealthChangesResponse)
async def get_health_changes(
    days: int = Query(30, ge=1, le=365, description="Number of days of history"),
    account_type: Optional[str] = Query(None, description="Filter by account type"),
    db: DatabricksService = Depends(get_databricks_service),
) -> HealthChangesResponse:
    """Get health distribution history with daily account category movements."""
    try:
        result = db.get_health_distribution_changes(days=days, account_type=account_type)
        return HealthChangesResponse(
            days=[HealthChangeDay(
                **{**d, "improved": [AccountMovement(**m) for m in d["improved"]],
                   "worsened": [AccountMovement(**m) for m in d["worsened"]]}
            ) for d in result["days"]],
            today_delta=result["today_delta"],
        )
    except Exception as e:
        logger.error(f"health-changes endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
