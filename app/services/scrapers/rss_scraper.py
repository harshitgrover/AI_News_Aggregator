import requests
import feedparser
from bs4 import BeautifulSoup
from app.models.models import Source, Article, UserSource
from urllib.parse import urljoin

def process_rss_entries(entries):
    """Helper to clean up RSS XML data into consistent dictionaries."""
    articles = []
    for entry in entries[:3]:
        raw_summary = entry.get('description', '') 
        if not raw_summary and 'media_description' in entry:
            raw_summary = entry.media_description

        soup = BeautifulSoup(raw_summary, "html.parser")
        clean_summary = soup.get_text(separator=" ").strip()
        if len(clean_summary) > 150:
            clean_summary = clean_summary[:147] + "..."
            
        articles.append({
            'title': entry.get('title', 'Unknown Title'),
            'link': entry.get('link', ''),
            'summary': clean_summary
        })
    return articles

def discover_and_parse(url, headers):
    """
    The Magic Link Processor:
    1. Tries to parse the URL directly as RSS.
    2. If it's HTML, scans the `<head>` to Auto-Discover hidden RSS links.
    3. If there is absolutely no RSS feed, it executes a generic HTML crawler to guess the news articles!
    """
    try:
        response = requests.get(url, headers=headers, timeout=10)
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return []
        
    feed = feedparser.parse(response.content)
    
    # 1. Did feedparser successfully find XML entries? It's an RSS feed!
    if feed.entries:
        return process_rss_entries(feed.entries)
        
    # 2. It's a standard HTML Website. Let's do RSS Auto-Discovery!
    soup = BeautifulSoup(response.content, 'html.parser')
    rss_link = soup.find('link', type='application/rss+xml')
    if not rss_link:
        rss_link = soup.find('link', type='application/atom+xml')
        
    if rss_link and rss_link.get('href'):
        rss_url = urljoin(url, rss_link['href'])
        print(f"MAGIC: Auto-discovered hidden RSS feed for {url} -> {rss_url}")
        try:
            rss_resp = requests.get(rss_url, headers=headers, timeout=10)
            rss_feed = feedparser.parse(rss_resp.content)
            if rss_feed.entries:
                return process_rss_entries(rss_feed.entries)
        except Exception:
            pass
            
    # 3. Generic HTML Heuristic Fallback (If no RSS exists anywhere)
    print(f"WARNING: No RSS found for {url}. Executing Generic HTML Web Crawler...")
    articles = []
    # Scan every single link on the homepage
    for a in soup.find_all('a', href=True):
        href = a['href']
        full_url = urljoin(url, href)
        
        # Heuristic: News articles usually have long paths and belong to the same domain.
        if url.split('/')[2] in full_url and len(full_url) > len(url) + 15:
            # Make sure we don't grab duplicate links
            if full_url not in [x['link'] for x in articles]:
                try:
                    # Actually visit the sub-page to extract the real title and summary!
                    art_resp = requests.get(full_url, headers=headers, timeout=5)
                    art_soup = BeautifulSoup(art_resp.content, 'html.parser')
                    
                    title = art_soup.find('title')
                    title_text = title.text.strip() if title else "Article"
                    
                    # Try standard description first, then OpenGraph
                    meta_desc = art_soup.find('meta', attrs={'name': 'description'})
                    if not meta_desc:
                        meta_desc = art_soup.find('meta', attrs={'property': 'og:description'})
                        
                    desc_text = meta_desc['content'].strip() if meta_desc and meta_desc.get('content') else "Generic article scraped from HTML."
                    
                    if len(desc_text) > 150: desc_text = desc_text[:147] + "..."
                    
                    articles.append({
                        'title': title_text,
                        'link': full_url,
                        'summary': desc_text
                    })
                    
                    # Stop after we successfully crawl 3 articles
                    if len(articles) >= 3:
                        break
                except Exception:
                    continue
                    
    return articles

def scrape_single_source(db, source_id, url):
    """Scrapes exactly ONE source instantly when added by the admin."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    print(f"Instantly Auto-Scraping New Source: {url}...")
    parsed_articles = discover_and_parse(url, headers)
    
    for art in parsed_articles:
        existing = db.query(Article).filter(Article.link == art['link']).first()
        if not existing:
            new_art = Article(
                title=art['title'],
                link=art['link'],
                summary=art['summary'],
                source_id=source_id 
            )
            db.add(new_art)
            db.commit()
    print(f"Finished Auto-Scrape for {url}")

def scrape_all_sources(db, user_id=None):
    db_sources = db.query(Source).all()
    
    user_sources = []
    if user_id:
        user_sources = db.query(UserSource).filter(UserSource.user_id == user_id).all()
        
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    # Scrape Global Sources (Save to DB)
    for source in db_sources:
        print(f"Processing Global Source: {source.name}")
        parsed_articles = discover_and_parse(source.url, headers)
        
        for art in parsed_articles:
            existing = db.query(Article).filter(Article.link == art['link']).first()
            if not existing:
                new_art = Article(
                    title=art['title'],
                    link=art['link'],
                    summary=art['summary'],
                    source_id=source.id 
                )
                db.add(new_art)
                db.commit()
                
    # Fetch ALL saved articles from DB for the global sources
    all_saved_articles = db.query(Article).order_by(Article.created_at.desc()).limit(50).all()
    results = []
    for article in all_saved_articles:
        results.append({
            "source_name": article.source.name,
            "title": article.title,
            "link": article.link,
            "summary": article.summary
        })

    # Scrape Custom User Sources (Don't save to global DB to prevent schema conflicts)
    for source in user_sources:
        print(f"Processing Private Custom Source: {source.url}")
        parsed_articles = discover_and_parse(source.url, headers)
        
        for art in parsed_articles:
            results.append({
                "source_name": "Custom Source",
                "title": art['title'],
                "link": art['link'],
                "summary": art['summary']
            })

    return results
