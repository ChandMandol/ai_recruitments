import hashlib
import logging
import os
import time
import uuid
from typing import Any, Dict, Optional
import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_upload_dir, settings
from app.models.analysis import SystemSetting

logger = logging.getLogger("ai_recruitment_hub.storage")

UPLOAD_DIR = get_upload_dir()


async def get_cloudinary_config_from_db_or_env(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """Retrieve Cloudinary configuration from database SystemSetting with env fallback."""
    config = {
        "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", ""),
        "api_key": os.getenv("CLOUDINARY_API_KEY", ""),
        "api_secret": os.getenv("CLOUDINARY_API_SECRET", ""),
        "is_enabled": os.getenv("CLOUDINARY_ENABLED", "false").lower() in ("true", "1", "yes"),
        "source": "ENVIRONMENT",
    }

    if db is not None:
        try:
            stmt = select(SystemSetting).where(
                SystemSetting.key.in_([
                    "CLOUDINARY_CLOUD_NAME",
                    "CLOUDINARY_API_KEY",
                    "CLOUDINARY_API_SECRET",
                    "CLOUDINARY_ENABLED",
                ])
            )
            res = await db.execute(stmt)
            settings_map = {s.key: s.value for s in res.scalars().all()}

            if "CLOUDINARY_CLOUD_NAME" in settings_map:
                config["cloud_name"] = settings_map["CLOUDINARY_CLOUD_NAME"]
                config["source"] = "DATABASE"
            if "CLOUDINARY_API_KEY" in settings_map:
                config["api_key"] = settings_map["CLOUDINARY_API_KEY"]
                config["source"] = "DATABASE"
            if "CLOUDINARY_API_SECRET" in settings_map:
                config["api_secret"] = settings_map["CLOUDINARY_API_SECRET"]
            if "CLOUDINARY_ENABLED" in settings_map:
                config["is_enabled"] = settings_map["CLOUDINARY_ENABLED"].lower() in ("true", "1", "yes")
        except Exception as e:
            logger.warning(f"Could not load Cloudinary config from DB: {e}")

    return config


async def test_cloudinary_connection(db: Optional[AsyncSession] = None) -> Dict[str, Any]:
    """Tests connection and credentials against Cloudinary Ping API."""
    cfg = await get_cloudinary_config_from_db_or_env(db)
    cloud_name = cfg["cloud_name"].strip()
    api_key = cfg["api_key"].strip()
    api_secret = cfg["api_secret"].strip()

    if not cloud_name or not api_key or not api_secret:
        return {
            "success": False,
            "message": "Cloudinary credentials missing: Cloud Name, API Key, and API Secret must all be configured.",
        }

    ping_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/ping"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(ping_url, auth=(api_key, api_secret))
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "ok":
                    return {
                        "success": True,
                        "message": f"Successfully connected to Cloudinary! Cloud account '{cloud_name}' is verified and ready for cloud resume storage.",
                    }
            return {
                "success": False,
                "message": f"Cloudinary verification failed with status {resp.status_code}: {resp.text}",
            }
    except Exception as exc:
        return {
            "success": False,
            "message": f"Cloudinary network request failed: {str(exc)}",
        }


async def upload_resume_file(
    contents: bytes,
    original_filename: str,
    content_type: str,
    candidate_id: str,
    db: Optional[AsyncSession] = None,
) -> Dict[str, Any]:
    """
    Uploads resume to Cloudinary if configured and enabled;
    otherwise saves to local persistent directory (/uploads/resumes/).
    Returns dict: { url, storage_type, public_id, file_size }
    """
    cfg = await get_cloudinary_config_from_db_or_env(db)
    cloud_name = cfg["cloud_name"].strip()
    api_key = cfg["api_key"].strip()
    api_secret = cfg["api_secret"].strip()
    is_enabled = cfg["is_enabled"]

    ext = os.path.splitext(original_filename)[1].lower() or ".pdf"
    safe_filename = f"{uuid.uuid4().hex}_{candidate_id[:8]}{ext}"

    # Always ensure a local copy exists for fast offline text extraction and AI parsing
    local_path = os.path.join(UPLOAD_DIR, safe_filename)
    try:
        with open(local_path, "wb") as f:
            f.write(contents)
    except Exception as e:
        logger.warning(f"Could not write local cache: {e}")

    # 1. Check if Cloudinary is active and configured
    if is_enabled and cloud_name and api_key and api_secret:
        try:
            timestamp = int(time.time())
            folder = "ai_recruitment_resumes"
            public_id = f"{folder}/{uuid.uuid4().hex}_{candidate_id[:8]}"

            # Generate Cloudinary SHA-1 signature
            to_sign = f"folder={folder}&public_id={public_id}&timestamp={timestamp}{api_secret}"
            signature = hashlib.sha1(to_sign.encode("utf-8")).hexdigest()

            upload_url = f"https://api.cloudinary.com/v1_1/{cloud_name}/raw/upload"
            files = {
                "file": (original_filename, contents, content_type or "application/octet-stream")
            }
            data = {
                "api_key": api_key,
                "timestamp": str(timestamp),
                "folder": folder,
                "public_id": public_id,
                "signature": signature,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(upload_url, data=data, files=files)
                if res.status_code == 200:
                    resp_json = res.json()
                    secure_url = resp_json.get("secure_url") or resp_json.get("url")
                    logger.info(f"Resume uploaded to Cloudinary: {secure_url}")
                    return {
                        "url": secure_url,
                        "storage_type": "CLOUDINARY",
                        "public_id": resp_json.get("public_id"),
                        "file_size": len(contents),
                        "local_path": local_path,
                    }
                else:
                    logger.warning(f"Cloudinary upload returned {res.status_code}: {res.text}. Falling back to local storage.")
        except Exception as exc:
            logger.error(f"Cloudinary upload exception: {exc}. Falling back to local storage.", exc_info=True)

    # 2. Local Storage Fallback
    local_url = f"/api/v1/candidate/resume/file?t={int(time.time())}"
    logger.info(f"Resume saved to local storage: {local_path}")
    return {
        "url": local_url,
        "storage_type": "LOCAL",
        "public_id": safe_filename,
        "file_size": len(contents),
        "local_path": local_path,
    }

