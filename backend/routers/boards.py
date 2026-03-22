from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
import auth
import database

router = APIRouter()


@router.get("/boards")
async def list_boards(db: Session = Depends(database.get_db)):
    boards = db.query(database.Board).order_by(database.Board.sort_order.asc()).all()
    result = []
    for board in boards:
        post_count = db.query(database.Post).filter(
            database.Post.board_id == board.id,
            database.Post.is_hidden.is_(False)
        ).count()
        result.append({
            "id": board.id,
            "name": board.name,
            "description": board.description,
            "post_count": post_count
        })
    return {"boards": result}
