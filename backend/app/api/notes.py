"""CSM Notes API endpoints."""

import os
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import FileResponse

from ..models.schemas import (
    CSMNote,
    CSMNoteAttachment,
    CSMNoteCreate,
    CSMNotesResponse,
    CSMNoteUpdate,
)
from ..services.databricks import (
    DatabricksService,
    get_databricks_service,
    CSM_NOTES_VOLUME_PATH,
)

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_FILE_TYPES = {
    "text/plain",
    "text/csv",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
    "application/msword",
    "image/png",
    "image/jpeg",
    "image/gif",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.get("/{account_id}/notes", response_model=CSMNotesResponse)
async def list_notes(
    account_id: str,
    search: Optional[str] = Query(None, description="Search in note content"),
    note_type: Optional[str] = Query(None, description="Filter by note type"),
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMNotesResponse:
    """List CSM notes for an account."""
    try:
        db.ensure_csm_notes_tables()
        return db.get_csm_notes(account_id, search=search, note_type=note_type)
    except Exception as e:
        logger.error(f"list_notes error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch notes")


@router.post("/{account_id}/notes", response_model=CSMNote)
async def create_note(
    account_id: str,
    note: CSMNoteCreate,
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMNote:
    """Create a new CSM note."""
    try:
        db.ensure_csm_notes_tables()
        result = db.create_csm_note(
            account_id=account_id,
            author="CSM User",
            author_email="csm@ifs.com",
            note=note,
        )
        if not result:
            raise HTTPException(status_code=500, detail="Failed to create note")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"create_note error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to create note")


@router.patch("/{account_id}/notes/{note_id}", response_model=dict)
async def update_note(
    account_id: str,
    note_id: str,
    update: CSMNoteUpdate,
    db: DatabricksService = Depends(get_databricks_service),
) -> dict:
    """Update a CSM note."""
    try:
        ok = db.update_csm_note(note_id, author_email="csm@ifs.com", update=update)
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to update note")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"update_note error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to update note")


@router.delete("/{account_id}/notes/{note_id}", response_model=dict)
async def delete_note(
    account_id: str,
    note_id: str,
    db: DatabricksService = Depends(get_databricks_service),
) -> dict:
    """Delete a CSM note and its attachments."""
    try:
        ok = db.delete_csm_note(note_id)
        if not ok:
            raise HTTPException(status_code=500, detail="Failed to delete note")
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"delete_note error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to delete note")


@router.post("/{account_id}/notes/{note_id}/attachments", response_model=CSMNoteAttachment)
async def upload_attachment(
    account_id: str,
    note_id: str,
    file: UploadFile = File(...),
    db: DatabricksService = Depends(get_databricks_service),
) -> CSMNoteAttachment:
    """Upload a file attachment to a note."""
    if file.content_type and file.content_type not in ALLOWED_FILE_TYPES:
        raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    safe_name = f"{uuid.uuid4().hex[:8]}_{file.filename or 'file'}"
    dir_path = os.path.join(CSM_NOTES_VOLUME_PATH, account_id, note_id)
    vol_path = os.path.join(dir_path, safe_name)

    try:
        os.makedirs(dir_path, exist_ok=True)
        with open(vol_path, "wb") as f:
            f.write(content)
    except Exception as e:
        logger.error(f"Failed to write file to volume: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to store file")

    att = db.save_note_attachment(
        note_id=note_id,
        file_name=file.filename or "file",
        file_type=file.content_type or "application/octet-stream",
        file_size=len(content),
        volume_path=vol_path,
    )
    if not att:
        raise HTTPException(status_code=500, detail="Failed to save attachment record")
    return att


@router.get("/{account_id}/notes/attachments/{attachment_id}/download")
async def download_attachment(
    account_id: str,
    attachment_id: str,
    db: DatabricksService = Depends(get_databricks_service),
):
    """Download a file attachment."""
    att = db.get_note_attachment(attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Attachment not found")
    if not os.path.exists(att.volume_path):
        raise HTTPException(status_code=404, detail="File not found on volume")
    return FileResponse(
        path=att.volume_path,
        filename=att.file_name,
        media_type=att.file_type,
    )
