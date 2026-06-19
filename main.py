from fastapi import FastAPI, Depends
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from scrapers.rss_scraper import scrape_all_sources
import models
from database import engine, get_db

# This line tells SQLAlchemy to look at our models.py file and actually create the physical 'news.db' file and tables!
models.Base.metadata.create_all(bind=engine)

# 1. Initialize our FastAPI app (exactly like `const app = express()`)
app = FastAPI()

# 2. Define an API route to fetch the news
@app.get("/api/news")
def get_news(db: Session = Depends(get_db)):
    # Call our scraping function and pass it the open database connection!
    news_data = scrape_all_sources(db)
    
    # Returning a dictionary in FastAPI automatically sends it as JSON to the client!
    return {"status": "success", "data": news_data}

# 3. Define a route to serve our frontend HTML page (like serving a static index.html)
@app.get("/", response_class=HTMLResponse)
def serve_frontend():
    with open("index.html", "r", encoding="utf-8") as file:
        return file.read()
