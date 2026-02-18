from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os

# Database URL - can be configured via environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:password@localhost:3306/campus_forum")

# Create engine
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
    
    posts = relationship("Post", back_populates="author", cascade="all, delete-orphan")
    comments = relationship("Comment", back_populates="author", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    image_url = Column(Text, default="")
    release_time = Column(DateTime, default=datetime.now)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    author = relationship("User", back_populates="posts")
    comments = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    votes = relationship("Vote", back_populates="post", cascade="all, delete-orphan")
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
    votes = relationship("Vote", back_populates="comment", cascade="all, delete-orphan")


class Vote(Base):
    __tablename__ = "votes"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String(20), nullable=False)  # "post" or "comment"
    entity_id = Column(Integer, nullable=False)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    vote_type = Column(String(20), nullable=False)  # "upvote" or "downvote"
    
    user = relationship("User", back_populates="votes")
    post = relationship("Post", back_populates="votes", foreign_keys=[entity_id], 
                       primaryjoin="and_(Vote.entity_type=='post', Vote.entity_id==Post.id)")
    comment = relationship("Comment", back_populates="votes", foreign_keys=[entity_id],
                          primaryjoin="and_(Vote.entity_type=='comment', Vote.entity_id==Comment.id)")


class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    user_email = Column(String(255), ForeignKey("users.user_email"), nullable=False)
    
    user = relationship("User", back_populates="favorites")
    post = relationship("Post", back_populates="favorites")


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
    print("Database tables created successfully!")


if __name__ == "__main__":
    # Run this script to create tables
    init_db()
