from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
import auth
import database
from models import ReportCreate
from utils import ensure_not_banned

router = APIRouter()


@router.post("/reports", status_code=201)
async def create_report(
    request: ReportCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    ensure_not_banned(user)

    if request.target_type == "post":
        target = db.query(database.Post).filter(database.Post.id == request.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="帖子不存在")
    elif request.target_type == "comment":
        target = db.query(database.Comment).filter(database.Comment.id == request.target_id).first()
        if not target:
            raise HTTPException(status_code=404, detail="评论不存在")

    existing = db.query(database.Report).filter(
        database.Report.reporter_email == current_user_email,
        database.Report.target_type == request.target_type,
        database.Report.target_id == request.target_id,
        database.Report.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="你已经举报过该内容，请等待管理员处理")

    report = database.Report(
        reporter_email=current_user_email,
        target_type=request.target_type,
        target_id=request.target_id,
        reason=request.reason,
        status="pending",
        created_at=datetime.now()
    )
    db.add(report)
    db.commit()
    return {"message": "举报已提交，管理员会尽快处理"}


@router.get("/reports/my")
async def get_my_reports(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    reports = db.query(database.Report).filter(
        database.Report.reporter_email == current_user_email
    ).order_by(database.Report.created_at.desc()).all()
    return {
        "reports": [{
            "id": r.id,
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "status": r.status,
            "admin_reply": r.admin_reply,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S")
        } for r in reports]
    }
