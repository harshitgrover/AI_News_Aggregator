from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.models import models
from app.core.database import engine, SessionLocal
from dotenv import load_dotenv
import asyncio
from datetime import datetime, timedelta
from app.api.routes import router

load_dotenv(override=True)
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

async def run_daily_cron():
    while True:
        now = datetime.now()
        target = now.replace(hour=8, minute=0, second=0, microsecond=0)
        if now >= target:
            target += timedelta(days=1)
            
        wait_seconds = (target - now).total_seconds()
        print(f"Daily cron waiting {wait_seconds} seconds until 8:00 AM...")
        await asyncio.sleep(wait_seconds)
        
        # Execute Daily Emails
        db = SessionLocal()
        try:
            print("RUNNING AUTOMATED DAILY CRON JOB!")
            profiles = db.query(models.Profile).all()
            from app.services.scrapers.rss_scraper import scrape_all_sources
            from app.services.ai_engine import filter_and_rank_by_topic, generate_newsletter_with_llm
            from app.services.mailer import send_newsletter
            
            for profile in profiles:
                topics_db = db.query(models.Topic).filter(models.Topic.user_id == profile.user_id).all()
                if not topics_db: continue
                
                topics_str = ", ".join([t.keyword for t in topics_db])
                print(f"Cron Generating for: {profile.email}")
                
                articles = scrape_all_sources(db, user_id=profile.user_id)
                ranked_clusters = filter_and_rank_by_topic(articles, topics_str)
                html_content = generate_newsletter_with_llm(ranked_clusters)
                
                send_newsletter(profile.email, "Your Automated Daily AI News", html_content)
        except Exception as e:
            print("Cron error:", e)
        finally:
            db.close()

@app.on_event("startup")
def startup_event():
    asyncio.create_task(run_daily_cron())
    db = SessionLocal()
    print("Executing Automatic Database Upgrade...")
    try:
        db.execute(text("ALTER TABLE sources ADD COLUMN category VARCHAR DEFAULT 'tech';"))
        db.commit()
    except Exception:
        db.rollback()
    
    try:
        db.execute(text("ALTER TABLE articles ADD COLUMN upvotes INTEGER DEFAULT 0;"))
        db.commit()
        db.execute(text("ALTER TABLE articles ADD COLUMN downvotes INTEGER DEFAULT 0;"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE comments ADD COLUMN upvotes INTEGER DEFAULT 0;"))
        db.commit()
        db.execute(text("ALTER TABLE comments ADD COLUMN downvotes INTEGER DEFAULT 0;"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        db.execute(text("ALTER TABLE user_sources ADD COLUMN category VARCHAR DEFAULT 'general';"))
        db.commit()
    except Exception:
        db.rollback()
        
    try:
        from seed_mock_data import seed_data
        seed_data()
        with open("seed_log.txt", "w") as f:
            f.write("Seeding successful!")
    except Exception as e:
        with open("seed_log.txt", "w") as f:
            f.write(f"Seeding failed: {str(e)}")
        
    db.close()

app.include_router(router)
