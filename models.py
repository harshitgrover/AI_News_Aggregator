from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

# 1. Source Table (Replaces our hardcoded Python Array)
class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    url = Column(String, unique=True, index=True)
    source_type = Column(String) # e.g., 'rss', 'youtube', 'reddit'

    # A Source can have many Articles
    articles = relationship("Article", back_populates="source")

# 2. Article Table (Saves the scraped news)
class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    link = Column(String, unique=True) # Unique so we don't save the same article twice
    summary = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Foreign Key linking back to the Source table
    source_id = Column(Integer, ForeignKey("sources.id"))
    source = relationship("Source", back_populates="articles")

# 3. User Table (For the Admin Dashboard)
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    is_admin = Column(Boolean, default=False)
