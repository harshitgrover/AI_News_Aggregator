from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models import models
import uuid
import random
from datetime import datetime, timedelta

def seed_data():
    db = SessionLocal()

    # 1. Create 5 Mock Users
    users = []
    print("Creating mock users...")
    for i in range(1, 6):
        uid = str(uuid.uuid4())
        # Check if already exists
        if not db.query(models.Profile).filter(models.Profile.email == f"mockuser{i}@example.com").first():
            prof = models.Profile(
                user_id=uid,
                email=f"mockuser{i}@example.com",
                username=f"CommunityUser{i}"
            )
            db.add(prof)
            users.append(uid)
    db.commit()

    if not users:
        print("Mock users already exist. Fetching them...")
        users = [p.user_id for p in db.query(models.Profile).filter(models.Profile.username.like("CommunityUser%")).all()]

    # 2. Add Mock User Sources to trigger Community Favorites (Overlap = Popularity)
    print("Adding mock user sources for community trending...")
    tech_urls = ["https://techcrunch.com/feed/", "https://www.theverge.com/rss/index.xml", "https://wired.com/feed/rss"]
    ai_urls = ["https://venturebeat.com/category/ai/feed/", "https://news.ycombinator.com/rss"]
    politics_urls = ["https://www.politico.com/rss/politics08.xml", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"]

    for uid in users:
        # Check if they already have sources
        if db.query(models.UserSource).filter(models.UserSource.user_id == uid).first():
            continue
            
        for url in random.sample(tech_urls, k=random.randint(1, 3)):
            db.add(models.UserSource(user_id=uid, name="Mock Source", url=url, category="tech"))
            
        for url in random.sample(ai_urls, k=random.randint(1, 2)):
            db.add(models.UserSource(user_id=uid, name="Mock Source", url=url, category="ai"))
            
        for url in random.sample(politics_urls, k=random.randint(1, 2)):
            db.add(models.UserSource(user_id=uid, name="Mock Source", url=url, category="politics"))
    db.commit()

    # 3. Add Mock Comments to Articles
    print("Adding mock comments to articles...")
    articles = db.query(models.Article).order_by(models.Article.created_at.desc()).limit(10).all()

    mock_comments = [
        "This is an incredibly insightful article! Thanks for sharing.",
        "I completely disagree with the author's premise here.",
        "Does anyone have more context on this? Seems like a big deal.",
        "This is going to change the entire industry in the next 5 years.",
        "Very well written, though the conclusion is a bit weak.",
        "I've been saying this for years!",
        "Wow, I didn't see this coming at all.",
        "This feels a bit sensationalized to me. Need more data to back this up.",
        "Excellent reporting. Straight to the point."
    ]

    for article in articles:
        # Check if article already has mock comments
        if db.query(models.Comment).filter(models.Comment.article_id == article.id).count() > 0:
            continue
            
        for i in range(random.randint(2, 6)):
            uid = random.choice(users)
            
            # Create the comment with a random vote score
            up = random.randint(1, 15)
            down = random.randint(0, 4)
            
            comment = models.Comment(
                user_id=uid,
                article_id=article.id,
                content=random.choice(mock_comments),
                created_at=datetime.utcnow() - timedelta(minutes=random.randint(5, 120)),
                upvotes=up,
                downvotes=down
            )
            db.add(comment)
    db.commit()

    print("✅ Database successfully seeded with Mock Profiles, Trending Sources, and Comments!")

if __name__ == "__main__":
    seed_data()
