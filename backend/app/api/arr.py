"""ARR Analysis API endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..models import (
    ARRAnalysisResponse,
    ARRCustomerSummary,
)
from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)
arr_router = APIRouter(tags=["arr"])


@arr_router.get("/analysis", response_model=ARRAnalysisResponse)
async def get_arr_analysis(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    revenue_type: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    currency: str = Query("CAD", description="Display currency (CAD or native)"),
    renewal_period: int = Query(90, description="Renewal window in days (e.g., 30, 60, 90, 180, 365)"),
    account_type: Optional[str] = Query(None, description="Filter by account type (e.g., Customer, Partner)"),
    db: DatabricksService = Depends(get_databricks_service),
):
    """
    Get renewal ARR analysis data.
    
    Returns portfolio summary, breakdown by revenue type and region,
    and customer-level ARR data with pagination.
    """
    try:
        result = db.get_arr_analysis(
            page=page,
            page_size=page_size,
            revenue_type=revenue_type,
            region=region,
            search=search,
            currency=currency,
            renewal_period=renewal_period,
            account_type=account_type,
        )
        logger.info(f"ARR analysis returned {len(result.customers)} customers")
        return result
    except Exception as e:
        logger.error(f"Error in get_arr_analysis: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Raise the error so we can debug - NO mock data
        raise HTTPException(status_code=500, detail=f"Failed to fetch ARR data: {str(e)}")


@arr_router.get("/customer/{account}", response_model=ARRCustomerSummary)
async def get_arr_customer_detail(
    account: str,
    db: DatabricksService = Depends(get_databricks_service),
):
    """
    Get detailed ARR data for a specific customer.
    
    Returns contract groups with revenue schedule breakdown.
    """
    try:
        return db.get_arr_customer_detail(account=account)
    except Exception as e:
        logger.error(f"Error in get_arr_customer_detail: {e}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        # Raise the error - NO mock data
        raise HTTPException(status_code=500, detail=f"Failed to fetch customer ARR data: {str(e)}")
