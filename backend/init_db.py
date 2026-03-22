#!/usr/bin/env python3
"""
Database initialization script for Campus Forum
This script creates all necessary database tables
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, engine, Base, inspect, text

if __name__ == "__main__":
    print("Initializing database...")
    print("Creating tables...")
    
    try:
        # Create all tables (including new ones)
        Base.metadata.create_all(bind=engine)
        
        # Handle schema migrations for existing tables
        with engine.begin() as conn:
            # Users table migrations
            user_columns = {col["name"] for col in inspect(conn).get_columns("users")}
            if "is_admin" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0"))
            if "is_banned" not in user_columns:
                conn.execute(text("ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT 0"))
            
            # Posts table migrations
            post_columns = {col["name"] for col in inspect(conn).get_columns("posts")}
            if "is_hidden" not in post_columns:
                conn.execute(text("ALTER TABLE posts ADD COLUMN is_hidden BOOLEAN DEFAULT 0"))
            if "board_id" not in post_columns:
                conn.execute(text("ALTER TABLE posts ADD COLUMN board_id INTEGER REFERENCES boards(id)"))
        
        print("Database tables created successfully!")
        print("\n✅ Database initialization completed successfully!")
        print("\nTables created:")
        print("  - users")
        print("  - posts")
        print("  - comments")
        print("  - votes")
        print("  - favorites")
        print("  - notifications")
        print("  - search_history")
        print("  - sensitive_words")
        print("  - reports")
        print("  - feedback")
        print("  - boards")
        print("\nYou can now start the server with: uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        print("\nPlease check your database configuration in .env file")
        sys.exit(1)
