from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import database

FALLBACK_SENSITIVE_WORDS = ("色情", "赌博", "毒品", "暴恐", "极端主义", "政治敏感")


def create_notification(db: Session, user_email: str, message: str, notification_type: str):
    """
    Add a notification record to the session for the given user.
    The caller is responsible for committing the transaction.
    """
    notification = database.Notification(
        user_email=user_email,
        message=message,
        notification_type=notification_type,
        is_read=False,
        release_time=datetime.now()
    )
    db.add(notification)


def ensure_not_banned(user: database.User):
    if user.is_banned:
        raise HTTPException(status_code=403, detail="User is banned")


def ensure_admin(user: database.User):
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin permission required")


def get_sensitive_words(db: Session) -> list[str]:
    """Fetch sensitive words from database, fallback to hardcoded list."""
    try:
        words = db.query(database.SensitiveWord.word).all()
        if words:
            return [w[0] for w in words]
    except Exception:
        pass
    return list(FALLBACK_SENSITIVE_WORDS)


def validate_no_sensitive_words(db: Session, *texts: str):
    """Check texts against sensitive words from database."""
    words = get_sensitive_words(db)
    for text_content in texts:
        if not text_content:
            continue
        for word in words:
            if word and word in text_content:
                raise HTTPException(
                    status_code=400,
                    detail=f"内容包含敏感词「{word}」，请修改后再提交"
                )
