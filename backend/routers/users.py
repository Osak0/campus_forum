from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
import auth
import database
from models import UserCreate, Token, UserProfile, UserProfileUpdate

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def create_user(request: UserCreate, db: Session = Depends(database.get_db)):
    existing_user = db.query(database.User).filter(database.User.user_email == request.user_email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

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


@router.post("/token", response_model=Token)
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


@router.get("/users/me", response_model=UserProfile)
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


@router.get("/users/me/settings")
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


@router.put("/users/me/settings")
async def update_current_user_profile(
    request: UserProfileUpdate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.avatar = request.avatar
    user.signature = request.signature
    user.preferred_tags = request.preferred_tags

    db.commit()

    return {"message": "Profile updated successfully"}


@router.get("/users/me/posts")
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


@router.get("/users/me/favorites")
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

    result.sort(key=lambda x: x["release_time"], reverse=True)

    return result
