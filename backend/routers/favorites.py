from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import auth
import database

router = APIRouter()


@router.post("/posts/{post_id}/favorite")
async def toggle_favorite(
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

    if favorite:
        db.delete(favorite)
        db.commit()
        return {"message": "Removed from favorites", "is_favorited": False}
    else:
        new_favorite = database.Favorite(
            post_id=post_id,
            user_email=current_user_email
        )
        db.add(new_favorite)
        db.commit()
        return {"message": "Added to favorites", "is_favorited": True}


@router.get("/posts/{post_id}/favorite")
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
