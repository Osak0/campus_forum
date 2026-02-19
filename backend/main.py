from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from datetime import datetime, timedelta
from models import (
    UserCreate, PostCreate, CommentCreate, VoteCreate, Token,
    UserProfile, UserProfileUpdate, FavoriteCreate, PostUpdate, CommentUpdate
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import auth
import database
import os
import shutil
from pathlib import Path
import uuid

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Mount the uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    database.init_db()

# Helper function to save uploaded file
def save_upload_file(upload_file: UploadFile, prefix: str = "") -> str:
    """Save uploaded file and return the URL path"""
    # Generate unique filename
    file_extension = os.path.splitext(upload_file.filename)[1]
    unique_filename = f"{prefix}_{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / unique_filename
    
    # Save file
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
    
    return f"/uploads/{unique_filename}"


def create_notification(db: Session, user_email: str, message: str, notification_type: str):
    notification = database.Notification(
        user_email=user_email,
        message=message,
        notification_type=notification_type,
        is_read=False,
        release_time=datetime.now()
    )
    db.add(notification)

# 用户注册
@app.post("/register", status_code=status.HTTP_201_CREATED)
async def create_user(request: UserCreate, db: Session = Depends(database.get_db)):
    # Check if user already exists
    existing_user = db.query(database.User).filter(database.User.user_email == request.user_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = auth.get_hashed_password(request.password)
    new_user = database.User(
        user_email=request.user_email,
        user_name=request.user_name,
        hashed_password=hashed_password,
        avatar="",
        signature=""
    )
    db.add(new_user)
    db.commit()
    
    return {"message": "User created successfully"}

# 用户登录
@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(database.get_db)):
    user = db.query(database.User).filter(database.User.user_email == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.user_email},
        expires_delta=access_token_expires
    )

    return {"access_token": access_token, "token_type": "bearer"}

# 上传文件 (用于头像和帖子图片)
@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user_email: str = Depends(auth.get_current_user)
):
    # Validate file type
    allowed_extensions = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
    file_extension = os.path.splitext(file.filename)[1].lower()
    
    if file_extension not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type. Only images are allowed.")
    
    # Save file
    file_url = save_upload_file(file, prefix="img")
    
    return {"file_url": file_url, "message": "File uploaded successfully"}

# 创建帖子
@app.post("/posts/")
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

# 获取帖子列表
@app.get("/posts/")
async def list_posts(
    tag: str | None = Query(default=None),
    keyword: str | None = Query(default=None),
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
    posts = query.order_by(database.Post.release_time.desc()).all()
    
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
    
    return result

# 获取帖子详情
@app.get("/posts/{post_id}")
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

# 创建评论
@app.post("/posts/{post_id}/comments")
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


@app.put("/posts/{post_id}")
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


@app.delete("/posts/{post_id}")
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

# 获取评论列表
@app.get("/posts/{post_id}/comments")
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

# 点赞/踩接口
@app.post("/posts/{post_id}/vote")
async def vote(
    post_id: int, 
    request: VoteCreate, 
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Check existing vote
    existing_vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "post",
        database.Vote.entity_id == post_id,
        database.Vote.user_email == current_user_email
    ).first()
    
    if existing_vote:
        if existing_vote.vote_type == request.vote_type:
            # Remove vote
            if existing_vote.vote_type == "upvote":
                post.upvotes -= 1
            else:
                post.downvotes -= 1
            db.delete(existing_vote)
            db.commit()
            return {"message": "Vote removed successfully", "upvotes": post.upvotes, "downvotes": post.downvotes}
        else:
            # Change vote
            if existing_vote.vote_type == "upvote":
                post.upvotes -= 1
            else:
                post.downvotes -= 1
            
            existing_vote.vote_type = request.vote_type
            
            if request.vote_type == "upvote":
                post.upvotes += 1
            else:
                post.downvotes += 1
            
            if post.user_email != current_user_email:
                create_notification(
                    db,
                    post.user_email,
                    f"{user.user_name} 对你的帖子《{post.title}》点了{'赞' if request.vote_type == 'upvote' else '反对'}",
                    "vote"
                )
            db.commit()
            return {"message": "Vote updated successfully", "upvotes": post.upvotes, "downvotes": post.downvotes}
    else:
        # New vote
        if request.vote_type == "upvote":
            post.upvotes += 1
        else:
            post.downvotes += 1
        
        new_vote = database.Vote(
            entity_type="post",
            entity_id=post_id,
            user_email=current_user_email,
            vote_type=request.vote_type
        )
        db.add(new_vote)
        if post.user_email != current_user_email:
            create_notification(
                db,
                post.user_email,
                f"{user.user_name} 对你的帖子《{post.title}》点了{'赞' if request.vote_type == 'upvote' else '反对'}",
                "vote"
            )
        db.commit()
        return {"message": "Vote recorded successfully", "upvotes": post.upvotes, "downvotes": post.downvotes}

# 评论点赞/踩接口
@app.post("/comments/{comment_id}/vote")
async def vote_comment(
    comment_id: int, 
    request: VoteCreate, 
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    
    # Check existing vote
    existing_vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "comment",
        database.Vote.entity_id == comment_id,
        database.Vote.user_email == current_user_email
    ).first()
    
    if existing_vote:
        if existing_vote.vote_type == request.vote_type:
            # Remove vote
            if existing_vote.vote_type == "upvote":
                comment.upvotes -= 1
            else:
                comment.downvotes -= 1
            db.delete(existing_vote)
            db.commit()
            return {"message": "Vote removed successfully", "upvotes": comment.upvotes, "downvotes": comment.downvotes}
        else:
            # Change vote
            if existing_vote.vote_type == "upvote":
                comment.upvotes -= 1
            else:
                comment.downvotes -= 1
            
            existing_vote.vote_type = request.vote_type
            
            if request.vote_type == "upvote":
                comment.upvotes += 1
            else:
                comment.downvotes += 1
            
            if comment.user_email != current_user_email:
                create_notification(
                    db,
                    comment.user_email,
                    f"{user.user_name} 对你的评论点了{'赞' if request.vote_type == 'upvote' else '反对'}",
                    "vote"
                )
            db.commit()
            return {"message": "Vote updated successfully", "upvotes": comment.upvotes, "downvotes": comment.downvotes}
    else:
        # New vote
        if request.vote_type == "upvote":
            comment.upvotes += 1
        else:
            comment.downvotes += 1
        
        new_vote = database.Vote(
            entity_type="comment",
            entity_id=comment_id,
            user_email=current_user_email,
            vote_type=request.vote_type
        )
        db.add(new_vote)
        if comment.user_email != current_user_email:
            create_notification(
                db,
                comment.user_email,
                f"{user.user_name} 对你的评论点了{'赞' if request.vote_type == 'upvote' else '反对'}",
                "vote"
            )
        db.commit()
        return {"message": "Vote recorded successfully", "upvotes": comment.upvotes, "downvotes": comment.downvotes}


@app.put("/comments/{comment_id}")
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


@app.delete("/comments/{comment_id}")
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

# 获取用户对帖子的投票状态
@app.get("/posts/{post_id}/vote")
async def get_vote_status(
    post_id: int, 
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "post",
        database.Vote.entity_id == post_id,
        database.Vote.user_email == current_user_email
    ).first()
    
    return {"vote_type": vote.vote_type if vote else "none"}

# 获取用户对评论的投票状态
@app.get("/posts/{post_id}/comments/vote")
async def get_comment_vote_status(
    post_id: int, 
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comments = db.query(database.Comment).filter(database.Comment.post_id == post_id).all()
    
    result = {}
    for comment in comments:
        vote = db.query(database.Vote).filter(
            database.Vote.entity_type == "comment",
            database.Vote.entity_id == comment.id,
            database.Vote.user_email == current_user_email
        ).first()
        
        if vote:
            result[str(comment.id)] = vote.vote_type
    
    return {"vote_type": result}

# 获取当前用户信息
@app.get("/users/me", response_model=UserProfile)
async def get_current_user_profile(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserProfile(
        user_name=user.user_name,
        user_email=user.user_email,
        avatar=user.avatar,
        signature=user.signature,
        preferred_tags=user.preferred_tags
    )

# 获取当前用户设置
@app.get("/users/me/settings")
async def get_current_user_settings(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "avatar": user.avatar,
        "signature": user.signature,
        "preferred_tags": user.preferred_tags
    }


# 更新当前用户设置
@app.put("/users/me/settings")
async def update_current_user_profile(
    request: UserProfileUpdate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user profile
    user.avatar = request.avatar
    user.signature = request.signature
    user.preferred_tags = request.preferred_tags
    
    db.commit()
    
    return {"message": "Profile updated successfully"}

# 获取当前用户的帖子历史
@app.get("/users/me/posts")
async def get_user_posts(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    posts = db.query(database.Post).filter(
        database.Post.user_email == current_user_email
    ).order_by(database.Post.release_time.desc()).all()
    
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
    
    return result

# 获取当前用户的收藏列表
@app.get("/users/me/favorites")
async def get_user_favorites(
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    favorites = db.query(database.Favorite).filter(
        database.Favorite.user_email == current_user_email
    ).all()
    
    result = []
    for favorite in favorites:
        post = favorite.post
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
    
    # Sort by release_time descending
    result.sort(key=lambda x: x["release_time"], reverse=True)
    
    return result

# 添加/取消收藏帖子
@app.post("/posts/{post_id}/favorite")
async def toggle_favorite(
    post_id: int,
    request: FavoriteCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    # Check if already favorited
    favorite = db.query(database.Favorite).filter(
        database.Favorite.post_id == post_id,
        database.Favorite.user_email == current_user_email
    ).first()
    
    if favorite:
        # Remove from favorites
        db.delete(favorite)
        db.commit()
        return {"message": "Removed from favorites", "is_favorited": False}
    else:
        # Add to favorites
        new_favorite = database.Favorite(
            post_id=post_id,
            user_email=current_user_email
        )
        db.add(new_favorite)
        db.commit()
        return {"message": "Added to favorites", "is_favorited": True}

# 检查帖子是否被当前用户收藏
@app.get("/posts/{post_id}/favorite")
async def check_favorite_status(
    post_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    favorite = db.query(database.Favorite).filter(
        database.Favorite.post_id == post_id,
        database.Favorite.user_email == current_user_email
    ).first()
    
    return {"is_favorited": favorite is not None}


@app.get("/tags")
async def list_tags(db: Session = Depends(database.get_db)):
    tags = db.query(database.Post.tag).distinct().all()
    return {"tags": sorted([t[0] for t in tags if t and t[0]])}


@app.get("/notifications")
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


@app.put("/notifications/{notification_id}/read")
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


@app.put("/notifications/read-all")
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

# 测试接口
@app.get("/")
async def root():
    return {"message": "The campus forum backend is running!"}
