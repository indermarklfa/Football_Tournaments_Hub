import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from app.deps import get_current_user
from app.models import User
import os

router = APIRouter()

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 5 * 1024 * 1024  # 5MB

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dp6vp5jgm"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "483198757682177"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "GH0e99ZOuPtVBf3RKwm0A8bqvIU"),
    secure=True,
)

@router.post("/api/uploads/image")
async def upload_image(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, WebP and GIF images are allowed")

    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "File too large. Maximum size is 5MB")

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder="kasihub",
            resource_type="image",
        )
        return JSONResponse({"url": result["secure_url"]})
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {str(e)}")