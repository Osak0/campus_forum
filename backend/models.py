from pydantic import BaseModel, EmailStr, Field, field_validator


class UserBase(BaseModel):
    user_name: str
    user_email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="密码至少6位")
    @field_validator('password')
    def validate_password(cls, value: str) -> str:
        if len(value) < 6:
            raise ValueError("密码至少6位")
        if not any(char.isdigit() for char in value):
            raise ValueError("密码必须包含至少一个数字")
        if not any(char.isalpha() for char in value):
            raise ValueError("密码必须包含至少一个字母")
        return value

class UserInDB(UserBase):
    hashed_password: str

class UserLogin(BaseModel):
    user_email: EmailStr
    password: str


class PostCreate(BaseModel):
    title: str
    content: str


class PostBase(PostCreate):
    id: int
    release_time: str
    user_name: str
    upvotes: int = 0
    downvotes: int = 0


class CommentCreate(BaseModel):
    user_email: EmailStr
    content: str = Field(..., max_length=500)


class CommentBase(CommentCreate):
    id: int
    post_id: int
    release_time: str
    user_name: str
    upvotes: int = 0
    downvotes: int = 0

class VoteCreate(BaseModel):
    user_email: EmailStr
    vote_type: str = Field(..., pattern="^(upvote|downvote)$") 


class Token(BaseModel):
    access_token: str
    token_type: str