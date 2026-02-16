from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from .models import UserBase, UserCreate, UserLogin, LoginRequest, PostBase, PostCreate, CommentBase, CommentCreate

app = FastAPI()


fake_user_db: dict[str, UserCreate] = {}
fake_post_db: list[PostBase] = []
next_post_id = 1
comments_db: list[CommentBase] = []
next_comment_id: int = 1

#用户注册
@app.post("/create_user/")
async def create_user(request: UserCreate):
    if request.user_email in fake_user_db:
        return {"error": "User already exists"}
    fake_user_db[request.user_email] = request
    return {"message": "User created successfully"}

#用户登录
@app.post("/login/")
async def login(request: UserLogin):
    user = fake_user_db.get(request.user_email)
    if not user or user.password != request.password:
        return {"error": "Invalid credentials"}
    return {"message": "Login successful"}

#创建帖子
@app.post("/posts/")
async def create_post(request: PostCreate):
    global next_post_id
    if request.author_email not in fake_user_db:
        return {"error": "Author not found"}
    post = {
        "id": next_post_id,
        "author_email": request.author_email,
        "title": request.title,
        "content": request.content,
        "release_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user_name": fake_user_db[request.author_email].user_name
    }
    post = PostBase(**post)
    fake_post_db.append(post)
    next_post_id += 1
    return {"message": "Post created successfully", "post_id": next_post_id - 1}

#获取帖子列表
@app.get("/posts/", response_model=list[PostBase])
async def list_posts():
    return fake_post_db

#获取帖子详情
@app.get("/posts/{post_id}")
async def get_post(post_id: int):
    for post in fake_post_db:
        if post.id == post_id:
            return post
    raise HTTPException(status_code=404, detail="Post not found")

#创建评论
@app.post("/posts/{post_id}/comments")
async def create_comment(request: CommentCreate):
    global next_comment_id
    post = next((p for p in fake_post_db if p.id == request.post_id), None)
    if post == None:
        raise HTTPException(status_code=404, detail="Post not found")
    comment = {
        "id": next_comment_id,
        "content": request.content,
        "release_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user_email": request.user_email,
        "user_name": fake_user_db[request.user_email].user_name
    }
    comment = CommentBase(**comment)
    comments_db.append(comment)
    next_comment_id += 1
    return {"message": "Comment created successfully", "comment_id": next_comment_id - 1}

#获取评论列表
@app.get("/posts/{post_id}/comments", response_model=list[CommentBase])
async def get_comments(post_id: int):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post == None:
        raise HTTPException(status_code=404, detail="Post not found")
    post_comments = [c for c in comments_db if c.post_id == post_id]
    post_comments = sorted(post_comments, key=lambda c: c.release_time)
    return post_comments

#测试接口
@app.get("/")
async def root():
    return {"message": "OK"}
