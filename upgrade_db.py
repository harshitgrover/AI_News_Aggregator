import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.environ.get("SUPABASE_DATABASE_URL")
if not db_url:
    print("NO DB URL FOUND!")
    exit(1)

print("Upgrading Supabase DB...")
conn = psycopg2.connect(db_url)
conn.autocommit = True
cur = conn.cursor()

try:
    cur.execute("ALTER TABLE sources ADD COLUMN category VARCHAR DEFAULT 'tech';")
    print("Successfully added category to sources.")
except Exception as e:
    print("Notice (sources):", e)

try:
    cur.execute("ALTER TABLE articles ADD COLUMN upvotes INTEGER DEFAULT 0;")
    cur.execute("ALTER TABLE articles ADD COLUMN downvotes INTEGER DEFAULT 0;")
    print("Successfully added upvotes/downvotes to articles.")
except Exception as e:
    print("Notice (articles):", e)

cur.close()
conn.close()
print("Database upgrade script finished.")
