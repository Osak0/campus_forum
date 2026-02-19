# Campus Forum - 校园论坛

This is a private forum for XJTUers!
Hope you will like it.
Thanks a lot for your support.

## Features / 功能特点

- 用户注册和登录 (User registration and login)
- 发布帖子和评论 (Create posts and comments)
- 帖子和评论支持图片 (Posts and comments support images)
- 点赞和踩 (Upvote and downvote)
- 收藏帖子 (Favorite posts)
- 个人主页 (Personal profile page)
- 本地头像上传 (Local avatar upload)
- MySQL 数据库支持 (MySQL database support)

## Tech Stack / 技术栈

**Backend:**
- FastAPI (Python web framework)
- SQLAlchemy (ORM for MySQL)
- PyMySQL (MySQL driver)
- JWT authentication
- Pillow (Image processing)

**Frontend:**
- HTML5, CSS3, JavaScript
- Vanilla JS (no framework)

**Database:**
- MySQL 5.7+

## Prerequisites / 前置要求

1. Python 3.8+
2. MySQL 5.7+ (or MariaDB)
3. pip (Python package manager)

## Setup Instructions / 安装说明

### 1. Install MySQL

Make sure you have MySQL installed and running. Create a database for the forum:

```sql
CREATE DATABASE campus_forum CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Clone the repository

```bash
git clone <repository-url>
cd campus_forum
```

### 3. Setup Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Create .env file from example
cp .env.example .env

# Edit .env file with your database credentials
# DATABASE_URL=mysql+pymysql://username:password@localhost:3306/campus_forum
```

### 4. Initialize Database

```bash
# Run database initialization script
python init_db.py
```

This will create all necessary tables (users, posts, comments, votes, favorites).

### 5. Start Backend Server

```bash
# Start the FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`

### 6. Setup Frontend

```bash
cd ../frontend

# Update API_BASE_URL in js/auth.js if needed
# Default is http://localhost:8000
```

Serve the frontend using any static file server:

```bash
# Option 1: Using Python's built-in server
python3 -m http.server 3000

# Option 2: Using Node.js http-server
npx http-server -p 3000

# Option 3: Using VS Code Live Server extension
# Just open index.html and click "Go Live"
```

The frontend will be available at `http://localhost:3000`

## Usage / 使用说明

1. Open `http://localhost:3000` in your browser
2. Register a new account
3. Login with your credentials
4. Create posts with text and images
5. Comment on posts with text and images
6. Upload your avatar from local files
7. Upvote/downvote posts and comments
8. Favorite posts to save them
9. View your profile page with your posts and favorites

## File Upload Support / 文件上传支持

- **Avatar Upload**: Users can upload avatar images from local files
- **Post Images**: Posts can include images
- **Comment Images**: Comments can include images
- **Supported Formats**: JPG, JPEG, PNG, GIF, WEBP
- **Storage**: Images are stored in `backend/uploads/` directory

## Database Schema / 数据库结构

- **users**: User accounts (email, name, password, avatar, signature)
- **posts**: Forum posts (title, content, image, upvotes, downvotes)
- **comments**: Post comments (content, image, upvotes, downvotes)
- **votes**: User votes on posts and comments
- **favorites**: User favorite posts

## API Endpoints / API接口

- `POST /register` - Register new user
- `POST /token` - Login and get JWT token
- `POST /upload` - Upload image file
- `GET /posts/` - Get all posts
- `POST /posts/` - Create new post
- `GET /posts/{id}` - Get post details
- `POST /posts/{id}/comments` - Add comment to post
- `GET /posts/{id}/comments` - Get post comments
- `POST /posts/{id}/vote` - Vote on post
- `POST /comments/{id}/vote` - Vote on comment
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update user profile
- `GET /users/me/posts` - Get user's posts
- `GET /users/me/favorites` - Get user's favorites
- `POST /posts/{id}/favorite` - Toggle favorite

## Development / 开发

Backend is running with `--reload` flag for auto-reload on code changes.

To run tests:
```bash
cd backend
pytest
```

## Production Deployment / 生产部署

1. Update `.env` with production database credentials
2. Set a strong SECRET_KEY in `.env`
3. Use a production-grade WSGI server like Gunicorn:
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app
   ```
4. Use Nginx as reverse proxy
5. Enable HTTPS with SSL certificates
6. Update CORS settings in `main.py` to restrict origins

## Security / 安全

- Passwords are hashed using bcrypt
- JWT tokens for authentication
- SQL injection protection via SQLAlchemy ORM
- File upload validation (image types only)
- XSS protection in frontend

## License / 许可

This project is for educational purposes.
