from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

# 1. Source Table (Global sources available to everyone, usually added by an Admin)
class Source(Base):
    __tablename__ = "sources"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    url = Column(String, unique=True)
    source_type = Column(String)
    category = Column(String, default="tech")

    # A Source can have many Articles
    articles = relationship("Article", back_populates="source")

# 2. Article Table (Saves the scraped news globally)
class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    link = Column(String, unique=True) # Unique so we don't save the same article twice
    summary = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    # Foreign Key linking back to the Source table
    source_id = Column(Integer, ForeignKey("sources.id"))
    source = relationship("Source", back_populates="articles")

# 6. Profile Table (Stores email for daily cron jobs, and avatar for comments)
class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True)
    email = Column(String)
    username = Column(String)

# 7. Comment Table (Reddit-style community discussions)
class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, ForeignKey("profiles.user_id"))
    article_id = Column(Integer, ForeignKey("articles.id"))
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    upvotes = Column(Integer, default=0)
    downvotes = Column(Integer, default=0)
    
    profile = relationship("Profile")

# 8. Comment Vote Table (Reddit-style tracking of user comment votes)
class CommentVote(Base):
    __tablename__ = "comment_votes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # UUID string from Supabase Auth
    comment_id = Column(Integer, ForeignKey("comments.id", ondelete="CASCADE"))
    vote_value = Column(Integer) # 1 for up, -1 for down, 0 for removed
    created_at = Column(DateTime, default=datetime.utcnow)

# 3. Topic Table (User-specific keywords they want the AI to prioritize)
class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # Matches the UUID string from Supabase Auth!
    keyword = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

# 4. UserSource Table (Private custom RSS feeds submitted by individual users)
class UserSource(Base):
    __tablename__ = "user_sources"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # Matches the UUID string from Supabase Auth!
    name = Column(String)
    url = Column(String)
    source_type = Column(String, default='rss')
    category = Column(String, default="general")
    created_at = Column(DateTime, default=datetime.utcnow)

# 5. Vote Table (Reddit-style tracking of user votes)
class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True) # UUID string from Supabase Auth
    article_id = Column(Integer, ForeignKey("articles.id"))
    vote_value = Column(Integer) # 1 for up, -1 for down, 0 for removed
    created_at = Column(DateTime, default=datetime.utcnow)
