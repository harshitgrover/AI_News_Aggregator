from database import SessionLocal
from models import Source

# This is our old hardcoded array!
SOURCES_DATA = [
    {"name": "Times of India", "url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms", "source_type": "rss"},
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/rss.xml", "source_type": "rss"},
    {"name": "Aaj Tak (YouTube)", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCt4t-jeY85JegMlZ-E5UWtA", "source_type": "youtube"},
    {"name": "Zee News (YouTube)", "url": "https://www.youtube.com/feeds/videos.xml?channel_id=UC1A3PjAALqEq1gU41hP5jng", "source_type": "youtube"},
    {"name": "r/MachineLearning", "url": "https://www.reddit.com/r/MachineLearning/.rss", "source_type": "reddit"},
    {"name": "r/LocalLLaMA", "url": "https://www.reddit.com/r/LocalLLaMA/.rss", "source_type": "reddit"},
    {"name": "r/singularity", "url": "https://www.reddit.com/r/singularity/.rss", "source_type": "reddit"}
]

def seed_database():
    # 1. Open a temporary database session
    db = SessionLocal()
    
    try:
        print("Starting the database seed process...")
        for source in SOURCES_DATA:
            # 2. Check if the source already exists in the database
            existing_source = db.query(Source).filter(Source.url == source["url"]).first()
            
            if not existing_source:
                # 3. If it doesn't exist, create a new Mongoose/SQLAlchemy object
                new_source = Source(
                    name=source["name"],
                    url=source["url"],
                    source_type=source["source_type"]
                )
                
                # 4. Add it to our session (like preparing to save in MongoDB)
                db.add(new_source)
                print(f"Added new source: {source['name']}")
            else:
                print(f"Skipping {source['name']} (Already exists)")
                
        # 5. Commit all the changes to save them permanently! (like .save() in mongoose)
        db.commit()
        print("Database successfully seeded!")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        # 6. Always close the connection
        db.close()

if __name__ == "__main__":
    seed_database()
