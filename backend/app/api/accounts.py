"""Account endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response

from ..models.schemas import (
    Account,
    AccountDetail,
    AccountFullDetail,
    AccountListResponse,
    AccountStatus,
    ConfluenceImplementationResponse,
    HealthScoreDetail,
    HealthScoreHistoryResponse,
    HealthScoreHistoryPoint,
    RenewalHealthInsightResponse,
    WeeklySummaryResponse,
    WeeklySummaryItem,
    SupportTicketsResponse,
)
from ..services.databricks import DatabricksService, get_databricks_service

logger = logging.getLogger(__name__)

# Lazy import for QBR generator to avoid startup failures if dependencies are missing
QBRGenerator = None
def get_qbr_generator():
    global QBRGenerator
    if QBRGenerator is None:
        from ..services.qbr_generator import QBRGenerator as _QBRGenerator
        QBRGenerator = _QBRGenerator
    return QBRGenerator
router = APIRouter()


@router.get("", response_model=AccountListResponse)
async def list_accounts(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, description="Items per page"),
    health: Optional[str] = Query(None, description="Filter by health score"),
    status: Optional[str] = Query(None, description="Filter by status"),
    owner: Optional[str] = Query(None, description="Filter by owner ID"),
    search: Optional[str] = Query(None, description="Search by account name"),
    sort_by: str = Query("attention_first", description="Sort order"),
    kpi_filter: Optional[str] = Query(None, description="KPI filter: at_risk, renewals, usage_decline, expansion"),
    account_type: Optional[str] = Query(None, description="Filter by account type (e.g., Customer, Prospect)"),
    db: DatabricksService = Depends(get_databricks_service),
) -> AccountListResponse:
    """Get paginated list of accounts with optional filters."""
    try:
        accounts, total, at_risk_count = db.get_accounts(
            page=page,
            page_size=page_size,
            health_filter=health,
            status_filter=status,
            owner_filter=owner,
            search=search,
            sort_by=sort_by,
            kpi_filter=kpi_filter,
            account_type=account_type,
        )

        total_pages = (total + page_size - 1) // page_size

        return AccountListResponse(
            accounts=accounts,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
            at_risk_count=at_risk_count,
        )
    except Exception as e:
        logger.error(f"list_accounts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}", response_model=AccountDetail)
async def get_account(
    account_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> AccountDetail:
    """Get detailed account information."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return account
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_account error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/full-detail", response_model=AccountFullDetail)
async def get_account_full_detail(
    account_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> AccountFullDetail:
    """Get comprehensive account detail with all use case data for the detail page."""
    try:
        account = db.get_account_full_detail(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return account
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_account_full_detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/confluence-implementation", response_model=ConfluenceImplementationResponse)
async def get_confluence_implementation(
    account_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> ConfluenceImplementationResponse:
    """Confluence client implementation KB (joined to dim_customers by account id / name)."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return db.get_confluence_implementation_context(account_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_confluence_implementation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{account_id}/status")
async def update_account_status(
    account_id: str,
    status: AccountStatus,
    db: DatabricksService = Depends(get_databricks_service),
) -> dict:
    """Update account status."""
    success = db.update_account_status(account_id, status)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update status")
    return {"message": "Status updated", "account_id": account_id, "status": status}


@router.get("/{account_id}/weekly-summary", response_model=WeeklySummaryResponse)
async def get_weekly_summary(
    account_id: str,
    weeks: int = Query(default=12, ge=1, le=52),
    offset: int = Query(default=0, ge=0),
    db: DatabricksService = Depends(get_databricks_service),
) -> WeeklySummaryResponse:
    """Get pre-computed weekly activity summaries for an account."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")

        result = db.get_weekly_summaries(account_id, limit=weeks, offset=offset)
        return WeeklySummaryResponse(
            account_id=account_id,
            account_name=account.name,
            weeks=[WeeklySummaryItem(**w) for w in result["weeks"]],
            total_weeks=result["total_weeks"],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_weekly_summary error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/health-score/history", response_model=HealthScoreHistoryResponse)
async def get_health_score_history(
    account_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> HealthScoreHistoryResponse:
    """Get health score history for trend visualization."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        history_data = db.get_health_score_history(account_id)
        logger.info(f"Health history for {account_id}: {len(history_data)} points")
        return HealthScoreHistoryResponse(
            account_id=account_id,
            account_name=account.name,
            history=[HealthScoreHistoryPoint(**h) for h in history_data],
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_health_score_history error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/health-score/renewal-insight", response_model=RenewalHealthInsightResponse)
async def get_renewal_health_insight(
    account_id: str,
    with_llm: bool = Query(False, description="Include AI narrative (slower)"),
    db: DatabricksService = Depends(get_databricks_service),
) -> RenewalHealthInsightResponse:
    """Renewal lines, materiality context, and optional LLM explanation for the health score."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        return db.get_renewal_health_insight(
            account_id=account_id,
            account_name=account.name,
            renewal_days_dim=account.renewal_days,
            with_llm=with_llm,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_renewal_health_insight error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/health-score", response_model=HealthScoreDetail)
async def get_health_score_detail(
    account_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> HealthScoreDetail:
    """
    Get detailed health score breakdown for an account.
    
    This endpoint calculates the full health score with factor breakdown.
    Use this when user clicks on health badge to see details.
    """
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        health_detail = db.get_health_score_detail_for_account(
            account.name, account.renewal_days, account_id
        )
        return health_detail
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_health_score_detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/support-tickets", response_model=SupportTicketsResponse)
async def get_support_tickets(
    account_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(25, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status: open, resolved"),
    severity: Optional[str] = Query(None, description="Filter by severity: critical, high, medium, low"),
    ticket_type: Optional[str] = Query(None, description="Filter by ticket type/theme"),
    db: DatabricksService = Depends(get_databricks_service),
) -> SupportTicketsResponse:
    """Get paginated support tickets for an account."""
    try:
        account = db.get_account_by_id(account_id)
        if not account:
            raise HTTPException(status_code=404, detail="Account not found")
        
        tickets, total = db.get_support_tickets_paginated(
            account_name=account.name,
            page=page,
            page_size=page_size,
            status_filter=status,
            severity_filter=severity,
            type_filter=ticket_type,
        )
        
        total_pages = (total + page_size - 1) // page_size
        
        return SupportTicketsResponse(
            tickets=tickets,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"get_support_tickets error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{account_id}/qbr")
async def generate_qbr(
    account_id: str,
    format: str = Query("pptx", description="Output format: pptx or pdf"),
    db: DatabricksService = Depends(get_databricks_service),
) -> Response:
    """
    Generate Quarterly Business Review document for an account.
    
    Returns a downloadable PowerPoint or PDF file containing:
    - Executive summary
    - Product usage analysis (Pendo)
    - Support analysis (Freshdesk)
    - Health score breakdown
    - Recommendations
    """
    try:
        # Validate format
        if format not in ("pptx", "pdf"):
            raise HTTPException(status_code=400, detail="Format must be 'pptx' or 'pdf'")
        
        # Get full account detail
        account_full = db.get_account_full_detail(account_id)
        if not account_full:
            raise HTTPException(status_code=404, detail="Account not found")
        
        # Get health score detail
        health_detail = db.get_health_score_detail_for_account(
            account_full.account.name,
            account_full.account.renewal_days,
            account_id,
        )
        
        # Prepare data for QBR generator
        account_data = {
            "name": account_full.account.name,
            "industry": account_full.account.industry,
            "csm_name": account_full.account.csm_name,
            "ae_name": account_full.account.ae_name,
            "renewals": [
                {
                    "contract_type": r.contract_type,
                    "renewal_days": r.renewal_days,
                    "arr": r.arr,
                }
                for r in (account_full.account.renewals or [])
            ],
        }
        
        support_data = {}
        if account_full.support_analysis:
            sa = account_full.support_analysis
            support_data = {
                "open_tickets": sa.open_tickets,
                "critical_tickets": sa.critical_tickets,
                "high_tickets": sa.high_tickets,
                "total_tickets": getattr(sa, 'total_tickets', 0),
                "avg_resolution_hours": sa.avg_resolution_hours,
                "ticket_trend": sa.ticket_trend,
                "resolution_stats": {
                    "median_days": getattr(sa.resolution_stats, 'median_days', 0) if sa.resolution_stats else 0,
                    "mean_days": getattr(sa.resolution_stats, 'mean_days', 0) if sa.resolution_stats else 0,
                } if sa.resolution_stats else {},
                "positive_ticket_count": getattr(sa, 'positive_ticket_count', 0),
                "neutral_ticket_count": getattr(sa, 'neutral_ticket_count', 0),
                "negative_ticket_count": getattr(sa, 'negative_ticket_count', 0),
            }
        
        usage_data = {}
        if account_full.usage_analysis:
            ua = account_full.usage_analysis
            usage_data = {
                "has_pendo_data": ua.has_pendo_data,
                "pendo_summary": {
                    "current_active_visitors": ua.pendo_summary.current_active_visitors if ua.pendo_summary else 0,
                    "visitors_change_pct": ua.pendo_summary.visitors_change_pct if ua.pendo_summary else 0,
                    "current_minutes": ua.pendo_summary.current_minutes if ua.pendo_summary else 0,
                    "minutes_change_pct": ua.pendo_summary.minutes_change_pct if ua.pendo_summary else 0,
                    "current_events": ua.pendo_summary.current_events if ua.pendo_summary else 0,
                    "events_change_pct": ua.pendo_summary.events_change_pct if ua.pendo_summary else 0,
                } if ua.pendo_summary else {},
                "pendo_features": {
                    "top_items": [
                        {"feature_name": f.get("name", ""), "count_clicks": f.get("clicks", 0)}
                        for f in (ua.pendo_features.top_items if ua.pendo_features else [])
                    ]
                } if ua.pendo_features else {},
            }
        
        health_data = {
            "score": health_detail.score,
            "category": health_detail.category.value if health_detail.category else "unknown",
            "factors": [
                {
                    "name": f.name,
                    "points": f.points,
                    "detail": f.detail,
                    "icon": f.icon,
                }
                for f in (health_detail.factors or [])
            ],
            "has_pendo": health_detail.has_pendo,
            "has_freshdesk": health_detail.has_freshdesk,
        }
        
        # Generate document (lazy import to avoid startup failures)
        QBRGeneratorClass = get_qbr_generator()
        generator = QBRGeneratorClass(
            account_data=account_data,
            support_data=support_data,
            usage_data=usage_data,
            health_data=health_data,
        )
        
        if format == "pptx":
            content = generator.generate_pptx()
            media_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
            filename = f"QBR_{account_full.account.name.replace(' ', '_')}.pptx"
        else:
            content = generator.generate_pdf()
            media_type = "application/pdf"
            filename = f"QBR_{account_full.account.name.replace(' ', '_')}.pdf"
        
        return Response(
            content=content,
            media_type=media_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"generate_qbr error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
