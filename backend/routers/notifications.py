from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import auth
import database

router = APIRouter()


@router.get("/notifications")
async def get_notifications(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    items = db.query(database.Notification).filter(
        database.Notification.user_email == current_user_email
    ).order_by(database.Notification.release_time.desc()).all()
    unread_count = db.query(database.Notification).filter(
        database.Notification.user_email == current_user_email,
        database.Notification.is_read.is_(False)
    ).count()
    return {
        "unread_count": unread_count,
        "notifications": [{
            "id": item.id,
            "message": item.message,
            "notification_type": item.notification_type,
            "is_read": item.is_read,
            "release_time": item.release_time.strftime("%Y-%m-%d %H:%M:%S")
        } for item in items]
    }


@router.put("/notifications/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    notification = db.query(database.Notification).filter(
        database.Notification.id == notification_id,
        database.Notification.user_email == current_user_email
    ).first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    return {"message": "Notification marked as read"}


@router.put("/notifications/read-all")
async def mark_all_notifications_read(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    db.query(database.Notification).filter(
        database.Notification.user_email == current_user_email,
        database.Notification.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
