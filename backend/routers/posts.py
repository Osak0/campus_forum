from fastapi import APIRouter, HTTPException, Depends, Query
from datetime import datetime
from sqlalchemy.orm import Session
import math
import auth
import database
from models import PostCreate, PostUpdate

router = APIRouter()


@router.post("/posts/")
async def create_post(
    request: PostCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")

    new_post = database.Post(
        title=request.title,
        content=request.content,
        image_url=request.image_url,
        tag=request.tag,
        user_email=current_user_email,
        release_time=datetime.now(),
        upvotes=0,
        downvotes=0
    )

    db.add(new_post)
    db.commit()
    db.refresh(new_post)

    return {"message": "Post created successfully", "post_id": new_post.id}


@router.get("/posts/")
async def list_posts(
    tag: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(database.get_db)
):
    query = db.query(database.Post)
    if tag and tag != "全部":
        query = query.filter(database.Post.tag == tag)
    if keyword:
        like_keyword = f"%{keyword}%"
        query = query.filter(
            (database.Post.title.ilike(like_keyword)) | (database.Post.content.ilike(like_keyword))
        )

    total = query.count()
    posts = query.order_by(database.Post.release_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for post in posts:
        result.append({
            "id": post.id,
            "title": post.title,
            "content": post.content,
            "image_url": post.image_url,
            "tag": post.tag,
            "release_time": post.release_time.strftime("%Y-%m-%d %H:%M:%S"),
            "user_name": post.author.user_name,
            "upvotes": post.upvotes,
            "downvotes": post.downvotes
        })

    total_pages = math.ceil(total / page_size) if total > 0 else 1

    return {
        "posts": result,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/posts/{post_id}")
async def get_post(post_id: int, db: Session = Depends(database.get_db)):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    return {
        "id": post.id,
        "title": post.title,
        "content": post.content,
        "image_url": post.image_url,
        "tag": post.tag,
        "user_email": post.user_email,
        "release_time": post.release_time.strftime("%Y-%m-%d %H:%M:%S"),
        "user_name": post.author.user_name,
        "upvotes": post.upvotes,
        "downvotes": post.downvotes
    }


@router.put("/posts/{post_id}")
async def update_post(
    post_id: int,
    request: PostUpdate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="No permission to edit this post")

    post.title = request.title
    post.content = request.content
    post.image_url = request.image_url
    post.tag = request.tag
    db.commit()
    return {"message": "Post updated successfully"}


@router.delete("/posts/{post_id}")
async def delete_post(
    post_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.user_email != current_user_email:
        raise HTTPException(status_code=403, detail="No permission to delete this post")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted successfully"}


@router.get("/tags")
async def list_tags(db: Session = Depends(database.get_db)):
    tags = db.query(database.Post.tag).distinct().all()
    return {"tags": sorted([t[0] for t in tags if t and t[0]])}
