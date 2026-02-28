from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, Boolean, UniqueConstraint, inspect, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database URL - can be configured via environment variable
# Supports both MySQL and SQLite
# MySQL: mysql+pymysql://root:password@localhost:3306/campus_forum
# SQLite: sqlite:///./campus_forum.db
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./campus_forum.db")

# Create engine with appropriate settings
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, echo=False, connect_args={"check_same_thread": False})
else:
    engine = create_engine(DATABASE_URL, echo=False, pool_pre_ping=True)

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Database Models
class User(Base):
    __tablename__ = "users"
    
    user_email = Column(String(255), primary_key=True, index=True)
    user_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar = Column(Text, default="")
    signature = Column(Text, default="")
    preferred_tags = Column(Text, default="")
    is_admin = Column(Boolean, default=False)
    is_banned = Column(Boolean, default=False)
    
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text, default="")
    tag = Column(String(50), default="全部")
    release_time = Column(DateTime, default=datetime.now)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    is_hidden = Column(Boolean, default=False)
    
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="post", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text, default="")
    release_time = Column(DateTime, default=datetime.now)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    post = relationship("Post", back_populates="comments")
    author = relationship("User", back_populates="comments")


class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(20), nullable=False)  # "post" or "comment"
    entity_id = Column(Integer, nullable=False)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    vote_type = Column(String(20), nullable=False)  # "upvote" or "downvote"
    
    user = relationship("User", back_populates="votes")
    __table_args__ = (
        UniqueConstraint('entity_type', 'entity_id', 'user_email', name='uq_vote'),
    )


class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    
    user = relationship("User", back_populates="favorites")
    post = relationship("Post", back_populates="favorites")
    __table_args__ = (
        UniqueConstraint('post_id', 'user_email', name='uq_favorite'),
    )


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    message = Column(Text, nullable=False)
    notification_type = Column(String(20), nullable=False)  # "reply" / "vote"
    is_read = Column(Boolean, default=False)
    release_time = Column(DateTime, default=datetime.now)

    user = relationship("User", back_populates="notifications")


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Function to initialize database
def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        columns = {col["name"] for col in inspect(conn).get_columns("users")}
        if "is_admin" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
        if "is_banned" not in columns:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0"))
        post_columns = {col["name"] for col in inspect(conn).get_columns("posts")}
        if "is_hidden" not in post_columns:
            conn.execute(text("ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN DEFAULT 0"))
    print("Database tables created successfully!")


if __name__ == "__main__":
    # Run this script to create tables
    init_db()
