from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from models import UserInDB, UserCreate, UserLogin, PostBase, PostCreate, CommentBase, CommentCreate, Token
from fastapi.security import OAuth2PasswordRequestForm
import backend.auth as auth

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

fake_user_db: dict[str, UserInDB] = {}
fake_post_db: list[PostBase] = []
next_post_id = 1
comments_db: list[CommentBase] = []
next_comment_id: int = 1

# 用户注册


@app.post("/register", status_code=status.HTTP_201_CREATED)
async def create_user(request: UserCreate):
    if request.user_email in fake_user_db:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = auth.get_hashed_password(request.password)
    user_indb = UserInDB(
        **request.model_dump(exclude={"password"}),
        hashed_password=hashed_password
    )
    fake_user_db[request.user_email] = user_indb
    return {"message": "User created successfully"}

# 用户登录


@app.post("/token", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = fake_user_db.get(form_data.username)
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

# 创建帖子


@app.post("/posts/")
async def create_post(request: PostCreate, current_user_email: str = Depends(auth.get_current_user)):
    global next_post_id
    
    if current_user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    
    
    post = {
        "id": next_post_id,
        "release_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user_name": fake_user_db[current_user_email].user_name,
        **request.model_dump()
    }
    
    post = PostBase(**post)
    fake_post_db.append(post)
    next_post_id += 1
    return {"message": "Post created successfully", "post_id": post.id}

# 获取帖子列表


@app.get("/posts/", response_model=list[PostBase])
async def list_posts():
    return fake_post_db

# 获取帖子详情


@app.get("/posts/{post_id}", response_model=PostBase)
async def get_post(post_id: int):
    for post in fake_post_db:
        if post.id == post_id:
            return post
    raise HTTPException(status_code=404, detail="Post not found")

# 创建评论


@app.post("/posts/{post_id}/comments")
async def create_comment(post_id: int, request: CommentCreate):
    global next_comment_id
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post == None:
        raise HTTPException(status_code=404, detail="Post not found")
    if request.user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    comment = {
        "id": next_comment_id,
        "post_id": post_id,
        "release_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user_name": fake_user_db[request.user_email].user_name,
        **request.model_dump()
    }
    comment = CommentBase(**comment)
    comments_db.append(comment)
    next_comment_id += 1
    return {"message": "Comment created successfully", "comment_id": comment.id}

# 获取评论列表


@app.get("/posts/{post_id}/comments", response_model=list[CommentBase])
async def get_comments(post_id: int):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post == None:
        raise HTTPException(status_code=404, detail="Post not found")
    post_comments = [c for c in comments_db if c.post_id == post_id]
    post_comments = sorted(post_comments, key=lambda c: c.release_time)
    return post_comments

# 测试接口


@app.get("/")
async def root():
    return {"message": "The campus forum backend is running!"}
