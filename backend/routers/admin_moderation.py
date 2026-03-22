from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
import auth
import database
from models import SensitiveWordCreate, ReportResolve, FeedbackReply, BoardCreate
from utils import ensure_admin

router = APIRouter()


# --- Sensitive Words Management ---

@router.get("/admin/sensitive-words")
async def list_sensitive_words(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    words = db.query(database.SensitiveWord).order_by(database.SensitiveWord.created_at.desc()).all()
    return {"words": [{"id": w.id, "word": w.word} for w in words]}


@router.post("/admin/sensitive-words", status_code=201)
async def add_sensitive_word(
    request: SensitiveWordCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    existing = db.query(database.SensitiveWord).filter(database.SensitiveWord.word == request.word).first()
    if existing:
        raise HTTPException(status_code=400, detail="该敏感词已存在")
    word = database.SensitiveWord(word=request.word, created_at=datetime.now())
    db.add(word)
    db.commit()
    return {"message": "敏感词添加成功", "id": word.id}


@router.delete("/admin/sensitive-words/{word_id}")
async def delete_sensitive_word(
    word_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    word = db.query(database.SensitiveWord).filter(database.SensitiveWord.id == word_id).first()
    if not word:
        raise HTTPException(status_code=404, detail="敏感词不存在")
    db.delete(word)
    db.commit()
    return {"message": "敏感词删除成功"}


# --- Reports Management ---

@router.get("/admin/reports")
async def list_reports(
    status: str | None = Query(default="pending"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    query = db.query(database.Report)
    if status:
        query = query.filter(database.Report.status == status)
    total = query.count()
    reports = query.order_by(database.Report.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    result = []
    for r in reports:
        item = {
            "id": r.id,
            "reporter_email": r.reporter_email,
            "reporter_name": r.reporter.user_name if r.reporter else "未知",
            "target_type": r.target_type,
            "target_id": r.target_id,
            "reason": r.reason,
            "status": r.status,
            "admin_reply": r.admin_reply,
            "created_at": r.created_at.strftime("%Y-%m-%d %H:%M:%S")
        }
        if r.target_type == "post":
            post = db.query(database.Post).filter(database.Post.id == r.target_id).first()
            item["target_title"] = post.title if post else "[帖子已删除]"
        elif r.target_type == "comment":
            comment = db.query(database.Comment).filter(database.Comment.id == r.target_id).first()
            item["target_title"] = comment.content[:50] if comment else "[评论已删除]"
        result.append(item)
    return {"reports": result, "total": total}


@router.put("/admin/reports/{report_id}")
async def resolve_report(
    report_id: int,
    request: ReportResolve,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    report = db.query(database.Report).filter(database.Report.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="举报记录不存在")
    report.status = request.status
    report.admin_reply = request.admin_reply

    if request.status == "resolved" and report.target_type == "post":
        post = db.query(database.Post).filter(database.Post.id == report.target_id).first()
        if post:
            post.is_hidden = True
            create_notification_safe(db, post.user_email,
                f"你的帖子《{post.title}》因违规已被管理员屏蔽。原因：{request.admin_reply or '违反社区规定'}",
                "moderation")

    db.commit()
    return {"message": "举报处理完成"}


# --- Feedback Management ---

@router.get("/admin/feedback")
async def list_feedback(
    status: str | None = Query(default="pending"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    query = db.query(database.Feedback)
    if status:
        query = query.filter(database.Feedback.status == status)
    total = query.count()
    items = query.order_by(database.Feedback.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "feedback": [{
            "id": f.id,
            "user_email": f.user_email,
            "user_name": f.user.user_name if f.user else "未知",
            "content": f.content,
            "category": f.category,
            "status": f.status,
            "admin_reply": f.admin_reply,
            "created_at": f.created_at.strftime("%Y-%m-%d %H:%M:%S")
        } for f in items],
        "total": total
    }


@router.put("/admin/feedback/{feedback_id}")
async def reply_feedback(
    feedback_id: int,
    request: FeedbackReply,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    fb = db.query(database.Feedback).filter(database.Feedback.id == feedback_id).first()
    if not fb:
        raise HTTPException(status_code=404, detail="反馈记录不存在")
    fb.admin_reply = request.admin_reply
    fb.status = request.status
    create_notification_safe(db, fb.user_email,
        f"管理员回复了你的反馈：{request.admin_reply[:100]}",
        "moderation")
    db.commit()
    return {"message": "回复成功"}


# --- Boards Management ---

@router.get("/admin/boards")
async def list_boards_admin(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    boards = db.query(database.Board).order_by(database.Board.sort_order.asc()).all()
    return {"boards": [{"id": b.id, "name": b.name, "description": b.description, "sort_order": b.sort_order} for b in boards]}


@router.post("/admin/boards", status_code=201)
async def create_board(
    request: BoardCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    existing = db.query(database.Board).filter(database.Board.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="板块名称已存在")
    board = database.Board(name=request.name, description=request.description, sort_order=request.sort_order, created_at=datetime.now())
    db.add(board)
    db.commit()
    return {"message": "板块创建成功", "id": board.id}


@router.delete("/admin/boards/{board_id}")
async def delete_board(
    board_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    ensure_admin(user)
    board = db.query(database.Board).filter(database.Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="板块不存在")
    db.query(database.Post).filter(database.Post.board_id == board_id).update({"board_id": None})
    db.delete(board)
    db.commit()
    return {"message": "板块删除成功"}


def create_notification_safe(db, user_email, message, notification_type):
    try:
        notification = database.Notification(
            user_email=user_email,
            message=message,
            notification_type=notification_type,
            is_read=False,
            release_time=datetime.now()
        )
        db.add(notification)
    except Exception:
        pass
