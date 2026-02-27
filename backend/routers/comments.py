from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from sqlalchemy.orm import Session
import auth
import database
from models import CommentCreate, CommentUpdate
from utils import create_notification

router = APIRouter()


@router.post("/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    request: CommentCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    new_comment = database.Comment(
        post_id=post_id,
        content=request.content,
        image_url=request.image_url,
        user_email=current_user_email,
        release_time=datetime.now(),
        upvotes=0,
        downvotes=0
    )

    db.add(new_comment)
    if post.user_email != current_user_email:
        create_notification(
            db,
            post.user_email,
            f"{user.user_name} 回复了你的帖子《{post.title}》",
            "reply"
        )
    db.commit()
    db.refresh(new_comment)

    return {"message": "Comment created successfully", "comment_id": new_comment.id}


@router.get("/posts/{post_id}/comments")
async def get_comments(post_id: int, db: Session = Depends(database.get_db)):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = db.query(database.Comment).filter(
        database.Comment.post_id == post_id
    ).order_by(database.Comment.release_time.asc()).all()

    result = []
    for comment in comments:
        result.append({
            "id": comment.id,
            "post_id": comment.post_id,
            "content": comment.content,
            "image_url": comment.image_url,
            "user_email": comment.user_email,
            "release_time": comment.release_time.strftime("%Y-%m-%d %H:%M:%S"),
            "user_name": comment.author.user_name,
            "upvotes": comment.upvotes,
            "downvotes": comment.downvotes
        })

    return result


@router.put("/comments/{comment_id}")
async def update_comment(
    comment_id: int,
    request: CommentUpdate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="No permission to edit this comment")
    comment.content = request.content
    comment.image_url = request.image_url
    db.commit()
    return {"message": "Comment updated successfully"}


@router.delete("/comments/{comment_id}")
async def delete_comment(
    comment_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    if comment.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="No permission to delete this comment")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted successfully"}
