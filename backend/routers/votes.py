from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import auth
import database
from models import VoteCreate
from utils import create_notification, ensure_not_banned

router = APIRouter()


@router.post("/posts/{post_id}/vote")
async def vote(
    post_id: int,
    request: VoteCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post or post.is_hidden:
        raise HTTPException(status_code=404, detail="Post not found")

    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    ensure_not_banned(user)

    existing_vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "post",
        database.Vote.entity_id == post_id,
        database.Vote.user_email == current_user_email
    ).first()

    if existing_vote:
        if existing_vote.vote_type == request.vote_type:
            if existing_vote.vote_type == "upvote":
                post.upvotes -= 1
            else:
                post.downvotes -= 1
            db.delete(existing_vote)
            db.commit()
            return {"message": "Vote removed successfully", "upvotes": post.upvotes, "downvotes": post.downvotes}
        else:
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


@router.get("/posts/{post_id}/vote")
async def get_vote_status(
    post_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post or post.is_hidden:
        raise HTTPException(status_code=404, detail="Post not found")

    vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "post",
        database.Vote.entity_id == post_id,
        database.Vote.user_email == current_user_email
    ).first()

    return {"vote_type": vote.vote_type if vote else "none"}


@router.post("/comments/{comment_id}/vote")
async def vote_comment(
    comment_id: int,
    request: VoteCreate,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    comment = db.query(database.Comment).filter(database.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    post = db.query(database.Post).filter(database.Post.id == comment.post_id).first()
    if not post or post.is_hidden:
        raise HTTPException(status_code=404, detail="Post not found")

    user = db.query(database.User).filter(database.User.user_email == current_user_email).first()
    if not user:
        raise HTTPException(status_code=400, detail="User not found")
    ensure_not_banned(user)

    existing_vote = db.query(database.Vote).filter(
        database.Vote.entity_type == "comment",
        database.Vote.entity_id == comment_id,
        database.Vote.user_email == current_user_email
    ).first()

    if existing_vote:
        if existing_vote.vote_type == request.vote_type:
            if existing_vote.vote_type == "upvote":
                comment.upvotes -= 1
            else:
                comment.downvotes -= 1
            db.delete(existing_vote)
            db.commit()
            return {"message": "Vote removed successfully", "upvotes": comment.upvotes, "downvotes": comment.downvotes}
        else:
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


@router.get("/posts/{post_id}/comments/vote")
async def get_comment_vote_status(
    post_id: int,
    current_user_email: str = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    post = db.query(database.Post).filter(database.Post.id == post_id).first()
    if not post or post.is_hidden:
        raise HTTPException(status_code=404, detail="Post not found")

    comments = db.query(database.Comment).filter(database.Comment.post_id == post_id).all()
    comment_ids = [c.id for c in comments]

    votes = db.query(database.Vote).filter(
        database.Vote.entity_type == "comment",
        database.Vote.entity_id.in_(comment_ids),
        database.Vote.user_email == current_user_email
    ).all()
    result = {str(v.entity_id): v.vote_type for v in votes}

    return {"vote_type": result}
