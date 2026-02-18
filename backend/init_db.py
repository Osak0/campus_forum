#!/usr/bin/env python3
"""
Database initialization script for Campus Forum
This script creates all necessary database tables
"""

import sys
import os

# Add the backend directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db

if __name__ == "__main__":
    print("Initializing database...")
    print("Creating tables...")
    
    try:
        init_db()
        print("\n✅ Database initialization completed successfully!")
        print("\nTables created:")
        print("  - users")
        print("  - posts")
        print("  - comments")
        print("  - votes")
        print("  - favorites")
        print("\nYou can now start the server with: uvicorn main:app --reload")
    except Exception as e:
        print(f"\n❌ Error initializing database: {e}")
        print("\nPlease check your database configuration in .env file")
        sys.exit(1)
