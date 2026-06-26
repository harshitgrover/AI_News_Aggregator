import uuid
import random
from datetime import datetime, timedelta
from dotenv import load_dotenv
load_dotenv(override=True)

from app.core.database import SessionLocal, engine
from app.models import models

def seed_massive_data():
    db = SessionLocal()

    print("Checking if tables exist...")
    models.Base.metadata.create_all(bind=engine)

    print("Generating 50 realistic users...")
    users = []
    first_names = ["Alex", "Jordan", "Taylor", "Casey", "Morgan", "Sam", "Jamie", "Riley", "Avery", "Quinn"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]
    
    for i in range(1, 51):
        uid = str(uuid.uuid4())
        username = f"{random.choice(first_names)}{random.choice(last_names)}{random.randint(10, 99)}"
        email = f"{username.lower()}@example.com"
        
        if not db.query(models.Profile).filter(models.Profile.email == email).first():
            prof = models.Profile(
                user_id=uid,
                email=email,
                username=username
            )
            db.add(prof)
            users.append(uid)
    db.commit()

    if not users:
        print("Fetching existing users...")
        users = [p.user_id for p in db.query(models.Profile).all()]

    print("Creating Sources and User Sources...")
    tech_urls = ["https://techcrunch.com/feed/", "https://www.theverge.com/rss/index.xml", "https://wired.com/feed/rss"]
    ai_urls = ["https://venturebeat.com/category/ai/feed/", "https://news.ycombinator.com/rss"]
    politics_urls = ["https://www.politico.com/rss/politics08.xml", "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml"]

    for uid in users:
        if db.query(models.UserSource).filter(models.UserSource.user_id == uid).count() == 0:
            for url in random.sample(tech_urls, k=random.randint(1, 2)):
                db.add(models.UserSource(user_id=uid, name="Tech News", url=url, category="tech"))
            for url in random.sample(ai_urls, k=random.randint(1, 2)):
                db.add(models.UserSource(user_id=uid, name="AI News", url=url, category="ai"))

    print("Creating Realistic Articles...")
    article_titles = [
        "OpenAI Announces New GPT-4.5 Architecture with Reduced Latency",
        "The Future of React: What to Expect in React 19",
        "Google Unveils Gemini Pro 1.5, Expanding Context Window to 1M Tokens",
        "Why Rust is Replacing C++ in Core System Infrastructure",
        "Nvidia's Next-Gen AI Chips Delayed by Supply Chain Issues",
        "How Agents Are Changing the Landscape of Autonomous Software",
        "Apple's Secret Generative AI Strategy Leaked",
        "Supabase Launches New Connection Pooler System for Edge Functions",
        "Vite 6 is Here: Faster HMR and Better Dependency Pre-bundling",
        "A Deep Dive into Anthropic's Claude 3 Opus Benchmarks",
        "Federal Regulators Eye Antitrust Action Against Leading AI Labs",
        "The Impact of AI on Junior Developer Roles",
        "SpaceX Successfully Catches Super Heavy Booster",
        "New Breakthrough in Quantum Error Correction Achieved",
        "GitHub Copilot Enterprise Rolls Out Custom Context Capabilities"
    ]
    
    source = db.query(models.Source).first()
    if not source:
        source = models.Source(name="TechDaily", url="https://techdaily.com/rss", source_type="rss", category="tech")
        db.add(source)
        db.commit()
        db.refresh(source)

    articles = []
    for title in article_titles:
        link = f"https://example.com/article/{title.replace(' ', '-').lower()}"
        article = db.query(models.Article).filter(models.Article.link == link).first()
        if not article:
            article = models.Article(
                title=title,
                link=link,
                summary=f"This is a detailed summary discussing {title.lower()} and its broad implications on the technology industry.",
                created_at=datetime.utcnow() - timedelta(hours=random.randint(1, 48)),
                upvotes=random.randint(50, 450),
                downvotes=random.randint(2, 25),
                source_id=source.id
            )
            db.add(article)
            db.commit()
            db.refresh(article)
        articles.append(article)

    print("Adding Realistic Discussions and Votes...")
    mock_comments = [
        "This completely changes everything. I didn't expect this so soon.",
        "To be honest, the benchmarks seem a bit cherry-picked.",
        "Can anyone explain how this affects existing production systems?",
        "I've been using the beta for 3 weeks and it's absolutely mind-blowing.",
        "Looks promising, but I'll wait until the documentation is better.",
        "This article misses the core point about security implications.",
        "Does this support backward compatibility?",
        "Finally! We've been waiting for this feature for years.",
        "I still prefer the open-source alternative. Much more flexible.",
        "Has anyone tested this at scale yet?",
        "This is exactly why I love this industry. Constantly evolving.",
        "Overhyped. The actual performance gains are negligible.",
        "Great write-up. Very clear and concise.",
        "I ran some tests and the latency is actually higher in edge cases.",
        "RIP to all the startups that just built wrappers around the old version."
    ]

    for article in articles:
        if db.query(models.Comment).filter(models.Comment.article_id == article.id).count() < 3:
            for _ in range(random.randint(5, 15)):
                uid = random.choice(users)
                comment = models.Comment(
                    user_id=uid,
                    article_id=article.id,
                    content=random.choice(mock_comments),
                    created_at=article.created_at + timedelta(minutes=random.randint(10, 300)),
                    upvotes=random.randint(5, 120),
                    downvotes=random.randint(0, 10)
                )
                db.add(comment)
    db.commit()

    print("Adding Topic Preferences...")
    keywords = ["AI", "React", "Python", "Space", "Crypto", "LLMs", "Startups", "Venture Capital"]
    for uid in users:
        if db.query(models.Topic).filter(models.Topic.user_id == uid).count() == 0:
            for kw in random.sample(keywords, k=random.randint(1, 4)):
                db.add(models.Topic(user_id=uid, keyword=kw))
    db.commit()

    print("✅ Successfully seeded MASSIVE realistic data!")

if __name__ == "__main__":
    seed_massive_data()
