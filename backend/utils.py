from datetime import datetime
from fastapi import HTTPException
from sqlalchemy.orm import Session
import database

SENSITIVE_WORDS = ("色情", "赌博", "毒品", "暴恐", "极端主义", "政治敏感")


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


def validate_no_sensitive_words(*texts: str):
    for text in texts:
        for word in SENSITIVE_WORDS:
            if word and word in text:
                raise HTTPException(status_code=400, detail="内容包含敏感词，请修改后再提交")
