"""FastAPI application entry point."""

import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from .api import api_router
from .config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Customer Success Management Dashboard API",
    version="1.0.0",
    docs_url="/api/docs" if settings.is_development else None,
    redoc_url="/api/redoc" if settings.is_development else None,
)

# CORS middleware for local development
if settings.is_development:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include API routes FIRST - these take priority
app.include_router(api_router)

# Health check endpoint
@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "environment": settings.environment}

# Static files setup for production (React build)
static_dir = Path(__file__).parent.parent / "static"
if static_dir.exists():
    # Serve static assets (JS, CSS)
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="assets")

    @app.get("/")
    async def serve_spa():
        """Serve the React SPA index.html."""
        return FileResponse(static_dir / "index.html")

    @app.get("/logo.png")
    async def serve_logo():
        """Serve the logo."""
        return FileResponse(static_dir / "logo.png", media_type="image/png")

    @app.get("/vite.svg")
    async def serve_vite_svg():
        """Serve vite.svg (fallback)."""
        return FileResponse(static_dir / "vite.svg", media_type="image/svg+xml")

    # Custom 404 handler - serves SPA for non-API routes, proper 404 for API routes
    @app.exception_handler(StarletteHTTPException)
    async def custom_404_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            path = request.url.path
            # API routes should return JSON 404
            if path.startswith("/api/"):
                return JSONResponse(
                    status_code=404,
                    content={"detail": "Not found"}
                )
            # Non-API routes: serve SPA for client-side routing
            return FileResponse(static_dir / "index.html")
        # Re-raise other HTTP exceptions
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.detail}
        )
