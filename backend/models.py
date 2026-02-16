from pydantic import BaseModel, EmailStr, Field


class UserBase(BaseModel):
    user_name: str
    user_email: EmailStr


class UserCreate(UserBase):
    password: str


class LoginRequest(BaseModel):
    user_email: EmailStr


class UserLogin(LoginRequest):
    password: str


class PostCreate(BaseModel):
    author_email: EmailStr
    title: str
    content: str


class PostBase(PostCreate):
    id: int
    release_time: str
    user_name: str


class CommentCreate(BaseModel):
    user_email: EmailStr
    content: str = Field(..., max_length=500)


class CommentBase(CommentCreate):
    id: int
    post_id: int
    release_time: str
    user_name: str
