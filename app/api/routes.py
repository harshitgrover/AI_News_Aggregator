from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel
from app.models import models
from app.core.database import get_db, SessionLocal
from app.core.auth import verify_user
from app.services.scrapers.rss_scraper import scrape_all_sources, scrape_single_source
from app.services.ai_engine import filter_and_rank_by_topic, generate_newsletter_with_llm
from app.services.mailer import send_newsletter

router = APIRouter()

class SourceCreate(BaseModel):
    url: str
    category: str

@router.post("/api/admin/sources")
def add_and_scrape_global_source(source: SourceCreate, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    print(f"Admin {user.get('email')} adding new source: {source.url}")
    new_source = models.Source(
        name="Global Source",
        url=source.url,
        source_type="generic",
        category=source.category
    )
    db.add(new_source)
    db.commit()
    db.refresh(new_source)
    scrape_single_source(db, new_source.id, new_source.url)
    return {"status": "success", "source": {"id": new_source.id, "url": new_source.url, "category": new_source.category}}

@router.post("/api/admin/scrape")
def force_scrape_global(user=Depends(verify_user), db: Session = Depends(get_db)):
    print(f"Force scraping triggered by admin: {user.get('email')}")
    scrape_all_sources(db)
    return {"status": "success", "message": "Scraped all global sources"}

class VoteCreate(BaseModel):
    vote_value: int

@router.post("/api/articles/{article_id}/vote")
def cast_vote(article_id: int, vote: VoteCreate, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    article = db.query(models.Article).filter(models.Article.id == article_id).first()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
        
    existing_vote = db.query(models.Vote).filter(
        models.Vote.user_id == user_id, 
        models.Vote.article_id == article_id
    ).first()
    
    new_val = vote.vote_value
    
    if existing_vote:
        old_val = existing_vote.vote_value
        if old_val == new_val:
            return {"status": "unchanged"}
        if old_val == 1: article.upvotes = (article.upvotes or 0) - 1
        elif old_val == -1: article.downvotes = (article.downvotes or 0) - 1
            
        existing_vote.vote_value = new_val
        if new_val == 1: article.upvotes = (article.upvotes or 0) + 1
        elif new_val == -1: article.downvotes = (article.downvotes or 0) + 1
    else:
        new_vote = models.Vote(user_id=user_id, article_id=article_id, vote_value=new_val)
        db.add(new_vote)
        if new_val == 1: article.upvotes = (article.upvotes or 0) + 1
        elif new_val == -1: article.downvotes = (article.downvotes or 0) + 1
        
    db.commit()
    return {"status": "success", "upvotes": article.upvotes, "downvotes": article.downvotes}

def background_generate_and_send(user_id: str, user_email: str, topic_keywords: str):
    db = SessionLocal()
    try:
        all_articles = scrape_all_sources(db, user_id=user_id)
        ranked_clusters = filter_and_rank_by_topic(all_articles, topic_keywords)
        newsletter_html = generate_newsletter_with_llm(ranked_clusters)
        
        send_newsletter(
            recipient_email=user_email,
            subject=f"Your Personalized AI News: {topic_keywords}",
            html_content=newsletter_html
        )
    except Exception as e:
        print(f"Error generating background newsletter: {e}")
    finally:
        db.close()

@router.post("/api/generate")
def generate_newsletter(background_tasks: BackgroundTasks, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user["sub"]
    
    # Try to get email from JWT root or user_metadata
    user_email = user.get("email")
    if not user_email and "user_metadata" in user:
        user_email = user["user_metadata"].get("email")
        
    # Ultimate fallback to ensure email delivery works during testing!
    if not user_email or user_email == "unknown@example.com":
        import os
        user_email = os.environ.get("ADMIN_EMAIL", "atharvconsul45@gmail.com")
    
    user_topics = db.query(models.Topic).filter(models.Topic.user_id == user_id).all()
    topic_keywords = ", ".join([t.keyword for t in user_topics])
    if not topic_keywords:
        topic_keywords = "Artificial Intelligence"
        
    background_tasks.add_task(background_generate_and_send, user_id, user_email, topic_keywords)
    
    return {"status": "success", "message": "Started generating newsletter in background."}

@router.post("/api/newsletter/preview")
def preview_newsletter(user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    """
    Runs the full newsletter pipeline synchronously and returns the HTML content
    directly to the frontend for in-page preview. Does NOT send an email.
    """
    from app.services.scrapers.rss_scraper import scrape_all_sources
    from app.services.ai_engine import filter_and_rank_by_topic, generate_newsletter_with_llm

    user_id = user["sub"]
    user_topics = db.query(models.Topic).filter(models.Topic.user_id == user_id).all()
    topic_keywords = ", ".join([t.keyword for t in user_topics])
    if not topic_keywords:
        topic_keywords = "Artificial Intelligence"

    all_articles = scrape_all_sources(db, user_id=user_id)
    ranked_clusters = filter_and_rank_by_topic(all_articles, topic_keywords)
    newsletter_html = generate_newsletter_with_llm(ranked_clusters)

    return {"status": "success", "html": newsletter_html}

@router.get("/api/test_mail")
def test_mail_sync():
    import traceback
    import os
    from app.services.mailer import send_newsletter
    
    admin_email = os.environ.get("SENDER_EMAIL", "temporar388y@gmail.com")
    
    try:
        success = send_newsletter(
            admin_email,
            "Test Email from AI News Aggregator",
            "<h2>It Works!</h2><p>Your Brevo email integration is working perfectly.</p>"
        )
        if success:
            return {"status": "success", "message": f"Test email sent to {admin_email} via Brevo!"}
        else:
            return {"status": "error", "message": "send_newsletter returned False. Check BREVO_API_KEY and SENDER_EMAIL."}
    except Exception as e:
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}

@router.get("/api/health")
def health_check():
    return {"status": "ok"}

@router.get("/api/community/sources")
def get_popular_community_sources(db: Session = Depends(get_db)):
    popular = db.query(
        models.UserSource.url, 
        models.UserSource.category,
        func.count(models.UserSource.id).label('popularity')
    ).group_by(models.UserSource.url, models.UserSource.category).order_by(func.count(models.UserSource.id).desc()).limit(15).all()
    
    return [{"url": p.url, "category": p.category, "popularity": p.popularity} for p in popular]

@router.get("/api/topics/performance")
def get_topic_performance(db: Session = Depends(get_db)):
    stats = db.query(
        models.Source.category, 
        func.count(models.Article.id).label('article_count')
    ).join(models.Article).group_by(models.Source.category).all()
    
    return [{"topic": s.category, "count": s.article_count} for s in stats]

class ProfileSync(BaseModel):
    email: str

@router.post("/api/profiles/sync")
def sync_profile(profile: ProfileSync, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    existing = db.query(models.Profile).filter(models.Profile.user_id == user_id).first()
    if not existing:
        username = profile.email.split('@')[0]
        new_prof = models.Profile(user_id=user_id, email=profile.email, username=username)
        db.add(new_prof)
        db.commit()
    return {"status": "success"}

class CommentCreate(BaseModel):
    content: str

@router.post("/api/articles/{article_id}/comments")
def post_comment(article_id: int, comment: CommentCreate, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    new_comment = models.Comment(user_id=user_id, article_id=article_id, content=comment.content)
    db.add(new_comment)
    db.commit()
    return {"status": "success"}

@router.get("/api/articles/{article_id}/comments")
def get_comments(article_id: int, db: Session = Depends(get_db)):
    comments = db.query(models.Comment).filter(models.Comment.article_id == article_id).all()
    res = []
    for c in comments:
        res.append({
            "id": c.id,
            "user_id": c.user_id,
            "content": c.content,
            "created_at": c.created_at,
            "upvotes": c.upvotes,
            "downvotes": c.downvotes,
            "score": c.upvotes - c.downvotes,
            "username": c.profile.username if c.profile else "Unknown",
            "avatar_initial": c.profile.username[0].upper() if c.profile and c.profile.username else "?"
        })
    # Sort: Majority priority to upvote score, fallback to newest
    res.sort(key=lambda x: (x['score'], x['created_at']), reverse=True)
    return res

class CommentEdit(BaseModel):
    content: str

@router.put("/api/comments/{comment_id}")
def edit_comment(comment_id: int, comment: CommentEdit, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    if db_comment.user_id != user_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    db_comment.content = comment.content
    db.commit()
    return {"status": "success"}

@router.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    db_comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not db_comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    # User owns the comment OR is Master Admin (from our .env configuration logic, fallback to email check)
    is_admin = user.get("email") == "atharvconsul@gmail.com"
    if db_comment.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
        
    db.delete(db_comment)
    db.commit()
    return {"status": "success"}

@router.post("/api/comments/{comment_id}/vote")
def vote_comment(comment_id: int, vote: VoteCreate, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    comment = db.query(models.Comment).filter(models.Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    existing_vote = db.query(models.CommentVote).filter(
        models.CommentVote.user_id == user_id, 
        models.CommentVote.comment_id == comment_id
    ).first()
    
    new_val = vote.vote_value
    
    if existing_vote:
        old_val = existing_vote.vote_value
        if old_val == new_val:
            return {"status": "unchanged"}
            
        if old_val == 1: comment.upvotes = (comment.upvotes or 0) - 1
        elif old_val == -1: comment.downvotes = (comment.downvotes or 0) - 1
            
        existing_vote.vote_value = new_val
        if new_val == 1: comment.upvotes = (comment.upvotes or 0) + 1
        elif new_val == -1: comment.downvotes = (comment.downvotes or 0) + 1
    else:
        new_vote = models.CommentVote(user_id=user_id, comment_id=comment_id, vote_value=new_val)
        db.add(new_vote)
        if new_val == 1: comment.upvotes = (comment.upvotes or 0) + 1
        elif new_val == -1: comment.downvotes = (comment.downvotes or 0) + 1
        
    db.commit()
    return {"status": "success", "upvotes": comment.upvotes, "downvotes": comment.downvotes}

@router.get("/api/articles/{article_id}/comment_votes")
def get_comment_votes(article_id: int, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    user_id = user.get("sub")
    votes = db.query(models.CommentVote).join(models.Comment).filter(
        models.Comment.article_id == article_id,
        models.CommentVote.user_id == user_id
    ).all()
    
    return {v.comment_id: v.vote_value for v in votes}
