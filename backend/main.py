from fastapi import FastAPI, HTTPException, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from models import UserInDB, UserCreate, PostBase, PostCreate, CommentBase, CommentCreate, VoteCreate, Token, UserProfile, UserProfileUpdate, FavoriteCreate
from fastapi.security import OAuth2PasswordRequestForm
import auth

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
votes_db: dict[tuple[str, int, str], str] = {}
favorites_db: dict[tuple[int, str], bool] = {}  # (post_id, user_email) -> True
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
async def create_comment(post_id: int, request: CommentCreate, current_user_email: str = Depends(auth.get_current_user)):
    global next_comment_id
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if current_user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    comment = {
        "id": next_comment_id,
        "post_id": post_id,
        "release_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "user_name": fake_user_db[current_user_email].user_name,
        "upvotes": 0,
        "downvotes": 0,
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
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    post_comments = [c for c in comments_db if c.post_id == post_id]
    post_comments = sorted(post_comments, key=lambda c: c.release_time)
    return post_comments

# 点赞/踩接口


@app.post("/posts/{post_id}/vote")
async def vote(post_id: int, request: VoteCreate, current_user_email: str = Depends(auth.get_current_user)):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if current_user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    vote_key = ("post", post_id, current_user_email)
    existing_vote = votes_db.get(vote_key)

    if existing_vote == request.vote_type:
        if existing_vote == "upvote":
            post.upvotes -= 1
        else:
            post.downvotes -= 1
        del votes_db[vote_key]
        return {"message": "Vote removed successfully","upvotes": post.upvotes, "downvotes": post.downvotes}

    if existing_vote:
        if existing_vote == "upvote":
            post.upvotes -= 1
        else:
            post.downvotes -= 1

    if request.vote_type == "upvote":
        post.upvotes += 1
    else:
        post.downvotes += 1

    votes_db[vote_key] = request.vote_type
    return {"message": "Vote recorded successfully", "upvotes": post.upvotes, "downvotes": post.downvotes}

#评论点赞/踩接口

@app.post("/comments/{comment_id}/vote")
async def vote_comment(comment_id: int, request: VoteCreate, current_user_email: str = Depends(auth.get_current_user)):
    comment = next((c for c in comments_db if c.id == comment_id), None)
    if comment is None:
        raise HTTPException(status_code=404, detail="Comment not found")
    if current_user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    vote_key = ("comment", comment_id, current_user_email)
    existing_vote = votes_db.get(vote_key)

    if existing_vote == request.vote_type:
        if existing_vote == "upvote":
            comment.upvotes -= 1
        else:
            comment.downvotes -= 1
        del votes_db[vote_key]
        return {"message": "Vote removed successfully","upvotes": comment.upvotes, "downvotes": comment.downvotes}

    if existing_vote:
        if existing_vote == "upvote":
            comment.upvotes -= 1
        else:
            comment.downvotes -= 1

    if request.vote_type == "upvote":
        comment.upvotes += 1
    else:
        comment.downvotes += 1

    votes_db[vote_key] = request.vote_type
    return {"message": "Vote recorded successfully", "upvotes": comment.upvotes, "downvotes": comment.downvotes}


#获取用户对帖子的投票状态
@app.get("/posts/{post_id}/vote")
async def get_vote_status(post_id: int, current_user_email: str = Depends(auth.get_current_user)):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    if current_user_email not in fake_user_db:
        raise HTTPException(status_code=400, detail="User not found")
    vote_key = ("post", post_id, current_user_email)
    return {"vote_type": votes_db.get(vote_key, "none")}

#获取用户对评论的投票状态
@app.get("/posts/{post_id}/comments/vote")
async def get_comment_vote_status(post_id: int, current_user_email: str = Depends(auth.get_current_user)):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    comment_list = [c for c in comments_db if c.post_id == post_id]
    result = {}
    for comment in comment_list:
        vote_key = ("comment", comment.id, current_user_email)
        vote = votes_db.get(vote_key)
        if vote:
            result[str(comment.id)] = vote
    return {"vote_type": result}


# 获取当前用户信息
@app.get("/users/me", response_model=UserProfile)
async def get_current_user_profile(current_user_email: str = Depends(auth.get_current_user)):
    user = fake_user_db.get(current_user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(
        user_name=user.user_name,
        user_email=user.user_email,
        avatar=user.avatar,
        signature=user.signature
    )


# 更新当前用户信息
@app.put("/users/me")
async def update_current_user_profile(
    request: UserProfileUpdate,
    current_user_email: str = Depends(auth.get_current_user)
):
    user = fake_user_db.get(current_user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user profile
    if request.avatar:
        user.avatar = request.avatar
    if request.signature:
        user.signature = request.signature
    
    return {"message": "Profile updated successfully"}


# 获取当前用户的帖子历史
@app.get("/users/me/posts", response_model=list[PostBase])
async def get_user_posts(current_user_email: str = Depends(auth.get_current_user)):
    user = fake_user_db.get(current_user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user_posts = [post for post in fake_post_db if post.user_name == user.user_name]
    # Sort by release_time descending (newest first)
    user_posts = sorted(user_posts, key=lambda p: p.release_time, reverse=True)
    return user_posts


# 获取当前用户的收藏列表
@app.get("/users/me/favorites", response_model=list[PostBase])
async def get_user_favorites(current_user_email: str = Depends(auth.get_current_user)):
    user = fake_user_db.get(current_user_email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get all favorite post IDs for this user
    favorite_post_ids = [post_id for (post_id, email) in favorites_db.keys() if email == current_user_email]
    
    # Get the actual posts
    favorite_posts = [post for post in fake_post_db if post.id in favorite_post_ids]
    # Sort by release_time descending (newest first)
    favorite_posts = sorted(favorite_posts, key=lambda p: p.release_time, reverse=True)
    return favorite_posts


# 添加/取消收藏帖子
@app.post("/posts/{post_id}/favorite")
async def toggle_favorite(
    post_id: int,
    request: FavoriteCreate,
    current_user_email: str = Depends(auth.get_current_user)
):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    favorite_key = (post_id, current_user_email)
    
    if favorite_key in favorites_db:
        # Remove from favorites
        del favorites_db[favorite_key]
        return {"message": "Removed from favorites", "is_favorited": False}
    else:
        # Add to favorites
        favorites_db[favorite_key] = True
        return {"message": "Added to favorites", "is_favorited": True}


# 检查帖子是否被当前用户收藏
@app.get("/posts/{post_id}/favorite")
async def check_favorite_status(
    post_id: int,
    current_user_email: str = Depends(auth.get_current_user)
):
    post = next((p for p in fake_post_db if p.id == post_id), None)
    if post is None:
        raise HTTPException(status_code=404, detail="Post not found")
    
    favorite_key = (post_id, current_user_email)
    is_favorited = favorite_key in favorites_db
    
    return {"is_favorited": is_favorited}


# 测试接口


@app.get("/")
async def root():
    return {"message": "The campus forum backend is running!"}
