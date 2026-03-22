from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from datetime import datetime
import auth
import database
from models import FeedbackCreate
from utils import ensure_not_banned

router = APIRouter()


@router.post("/feedback", status_code=201)
async def create_feedback(
    request: FeedbackCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    ensure_not_banned(user)

    fb = database.Feedback(
        user_email=current_user_email,
        content=request.content,
        category=request.category,
        status="pending",
        created_at=datetime.now()
    )
    db.add(fb)
    db.commit()
    return {"message": "反馈已提交，感谢你的意见！"}


@router.get("/feedback/my")
async def get_my_feedback(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    items = db.query(database.Feedback).filter(
        database.Feedback.user_email == current_user_email
    ).order_by(database.Feedback.created_at.desc()).all()
    return {
        "feedback": [{
            "id": f.id,
            "content": f.content,
            "category": f.category,
            "status": f.status,
            "admin_reply": f.admin_reply,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S")
        } for f in items]
    }
