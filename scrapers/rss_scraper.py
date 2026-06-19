import requests
import feedparser
from bs4 import BeautifulSoup
from models import Source, Article

# We deleted the hardcoded SOURCES array! The database controls this now.

def scrape_all_sources(db):
    """
    Notice that this function now accepts a `db` variable. 
    This is the database connection we pass from our API route!
    """
    
    # 1. Fetch all our active sources from the SQLite Database!
    # MERN Analogy: const sources = await Source.find()
    db_sources = db.query(Source).all()
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    
    # 2. Loop through the sources we got from the database
    for source in db_sources:
        try:
            print(f"Scraping: {source.name}...")
            response = requests.get(source.url, headers=headers, timeout=10)
            feed = feedparser.parse(response.content)
            
            for entry in feed.entries[:3]:
                # We need a fallback because YouTube uses `media_description`
                raw_summary = entry.get('description', '') 
                if not raw_summary and 'media_description' in entry:
                    raw_summary = entry.media_description

                soup = BeautifulSoup(raw_summary, "html.parser")
                clean_summary = soup.get_text(separator=" ").strip()
                if len(clean_summary) > 150:
                    clean_summary = clean_summary[:147] + "..."
                    
                # 3. DATABASE CHECK: Does this article already exist?
                # MERN Analogy: const existing = await Article.findOne({ link: entry.link })
                existing_article = db.query(Article).filter(Article.link == entry.link).first()
                
                # 4. If it doesn't exist, save it to the database!
                if not existing_article:
                    new_article = Article(
                        title=entry.title,
                        link=entry.link,
                        summary=clean_summary,
                        source_id=source.id # This is the Foreign Key linking to the Source table
                    )
                    db.add(new_article)
                    db.commit() # Save to DB instantly!
                    
        except Exception as e:
            print(f"Failed to scrape {source.name}: {e}")
            
    # 5. Finally, return ALL the articles we currently have saved in the database!
    # We join it with the Source table so we can get the `source.name` to show on the frontend.
    all_saved_articles = db.query(Article).order_by(Article.created_at.desc()).limit(50).all()
    
    # Convert them into a list of dictionaries for the frontend
    results = []
    for article in all_saved_articles:
        results.append({
            "source_name": article.source.name, # Accessing the relationship!
            "title": article.title,
            "link": article.link,
            "summary": article.summary
        })
        
    return results
