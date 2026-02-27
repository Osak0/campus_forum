from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import database
from routers import users, posts, comments, votes, favorites, notifications, upload


@asynccontextmanager
async def lifespan(app: FastAPI):
    database.init_db()
    yield


app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create uploads directory if it doesn't exist
Path("uploads").mkdir(exist_ok=True)

# Mount the uploads directory to serve static files
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Register routers
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(votes.router)
app.include_router(favorites.router)
app.include_router(notifications.router)
app.include_router(upload.router)


@app.get("/")
async def root():
    return {"message": "The campus forum backend is running!"}

