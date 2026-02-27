from datetime import datetime
from sqlalchemy.orm import Session
import database


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
