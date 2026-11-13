import sqlite3
import os

db_path = os.path.abspath("ai_recruitment_hub.db")
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(jobs)")
    cols = [row[1] for row in cursor.fetchall()]
    if "custom_interview_questions" not in cols:
        cursor.execute("ALTER TABLE jobs ADD COLUMN custom_interview_questions JSON DEFAULT '[]'")
        conn.commit()
        print("Successfully added custom_interview_questions to jobs table.")
    else:
        print("Column custom_interview_questions already exists.")
    conn.close()
else:
    print("Database file not found at", db_path)

