from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from sqlalchemy.orm import Session
import auth
import database
import os
import shutil
from pathlib import Path
import uuid

router = APIRouter()

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024


def save_upload_file(upload_file: UploadFile, prefix: str = "") -> str:
    file_size_bytes = upload_file.size
    if file_size_bytes > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=403,
            detail=f"文件大小超出限制，最大文件大小{MAX_FILE_SIZE / (1024 * 1024)}MB"
        )

    file_extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{prefix}_{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)

    return f"/uploads/{unique_filename}"


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user_email: str = Depends(auth.get_current_user)
):
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(file.filename)[1].lower()

    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")

    file_url = save_upload_file(file, prefix="img")

    return {"file_url": file_url, "message": "File uploaded successfully"}
