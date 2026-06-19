from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# 1. Define where our database is saved.
# In SQLite, "sqlite:///news.db" tells it to create a file called "news.db" right here in our folder.
# (If we were using PostgreSQL for production, we would just change this one string to "postgresql://user:pass@localhost/news")
SQLALCHEMY_DATABASE_URL = "sqlite:///news.db"

# 2. Create the "Engine" (This handles the actual connection to the database file)
# The `check_same_thread=False` is just a special requirement for SQLite in FastAPI.
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 3. Create a SessionLocal class (This is what we use to actually talk to the database and run queries)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Create the Base class

# All our models (Tables) will inherit from this Base class so SQLAlchemy knows about them.
Base = declarative_base()

# 5. Dependency helper for FastAPI
# Every time someone hits an API route, this gives them a temporary connection to the database and closes it when they are done.
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
