# The Complete Interview Master-Guide: AI News Aggregator

This document is the definitive, beginner-friendly technical guide to the **AI News Aggregator** project. It explains every architectural decision, every library, and every piece of logic in plain language. If an interviewer asks about this project, this document has your answer.

---

## Part 1: High-Level Architecture

### The Elevator Pitch
The AI News Aggregator is a full-stack web application that delivers personalized AI-curated news newsletters. Users define topics they care about. Every night at 11:30 PM IST, the system automatically scrapes hundreds of global news sources, uses Google's Gemini API to mathematically find relevant articles, synthesizes them into a newsletter using an LLM, and emails it to every user. It also provides a live Reddit-style web community where users can read, vote, and discuss news.

### The Restaurant Analogy
1. **The Frontend (The Dining Room):** The React website. Users sit here, click buttons, read news.
2. **The API (The Waiter):** FastAPI routes. They carry requests between the dining room and kitchen.
3. **The Backend (The Kitchen):** Python logic. It processes scraping, AI, and email.
4. **The Database (The Pantry):** PostgreSQL via Supabase. Stores all articles, users, votes, and comments.
5. **The Cron Job (The Night Shift Chef):** An `asyncio` background task that wakes up at 11:30 PM IST every day and runs the entire pipeline automatically.

---

## Part 2: RSS Feeds & the 3-Tier Scraper (`rss_scraper.py`)

### What is an RSS Feed?
RSS (Really Simple Syndication) is a special XML file that websites publish specifically for machines to read. Instead of loading full HTML with ads and images, an RSS feed gives you a clean list of recent articles: title, link, and a short description. It's like a newspaper mailing you only the headlines.

**Important:** RSS is a "rolling window" — it only shows the last ~20 articles. When article #21 is published, article #1 disappears. This is why the system re-scrapes every day.

### The 3-Tier Fallback Strategy
Not all websites have a clean RSS link. Our scraper handles all cases:

**Tier 1 — Direct RSS Parsing:**
```python
feed = feedparser.parse(response.content)
if feed.entries:
    return process_rss_entries(feed.entries)
```
`feedparser` reads the XML directly and extracts clean article data.

**Tier 2 — RSS Auto-Discovery:**
```python
rss_link = soup.find('link', type='application/rss+xml')
```
Most websites hide their RSS link inside the invisible `<head>` tag. `BeautifulSoup` scans for it. If found, we use it.

**Tier 3 — Heuristic HTML Crawler (Last Resort):**
If no RSS exists anywhere, we pretend to be a human:
- Scan every `<a href>` link on the homepage
- News articles have long URLs (`/apple-releases-m4-chip`) vs short ones (`/about`)
- Visit the long URLs and scrape the invisible `<meta name="description">` tag to construct a fake RSS entry

### Gemini Summary Expansion
After scraping, RSS descriptions are often very short (1-2 sentences). If a summary is under 50 words, we call Gemini to expand it:
```python
def expand_summary(title, short_summary):
    if len(short_summary.split()) >= 50:
        return short_summary
    # Call gemini-3.1-flash-lite to generate a 60-word factual summary
```
This ensures every article card in the frontend feed shows a meaningful, readable description.

---

## Part 3: The AI Engine (`ai_engine.py`)

### Why Gemini API Instead of Local Models?
The original design used `sentence-transformers` (a local PyTorch model) to generate text embeddings. While accurate, loading PyTorch requires ~500MB of memory at startup — far exceeding the free tier RAM limit on Railway, causing "OOMKilled" crashes.

**The fix:** Replace the local model with the Gemini Embeddings API (`gemini-embedding-001`). Instead of loading a model into memory, we make a lightweight HTTPS API call:
```python
def get_embedding(text):
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    response = client.models.embed_content(
        model='gemini-embedding-001',
        contents=text,
    )
    return np.array(response.embeddings[0].values)
```
This reduced backend memory usage by over 80%, eliminated startup crashes, and made the backend boot instantly.

### What are Embeddings?
An embedding is a list of numbers that represents the "meaning" of a piece of text. Words or sentences with similar meaning will produce number arrays that point in the same mathematical direction.

Imagine plotting words on a 3D map:
- "Dog" and "Puppy" → dots very close together
- "Dog" and "Rocket" → dots very far apart

Gemini embedding-001 produces 3072-dimensional vectors for this.

### Cosine Similarity
```python
def calculate_cosine_similarity(vector_a, vector_b):
    dot_product = np.dot(vector_a, vector_b)
    norm_a = np.linalg.norm(vector_a)
    norm_b = np.linalg.norm(vector_b)
    return dot_product / (norm_a * norm_b)
```
This measures the angle between two vectors. A score of 1.0 = identical meaning. A score of 0.0 = completely unrelated. We keep articles with a score > 0.2 as "relevant" to the user's topics.

### Article Clustering (Confidence Scoring)
Similar articles are grouped together. If 3 sources all report the same story, that cluster gets a confidence score of 3 — meaning it's a verified, important story, not a one-off rumor.

### Ranking Formula
```python
# Relevance (0.0–1.0) + (number of sources reporting it × 0.1)
clusters.sort(key=lambda c: c['relevance_score'] + (c['confidence_score'] * 0.1), reverse=True)
```
Top 5 clusters are returned for newsletter generation.

### LLM Newsletter Generation
The top 5 clusters are sent to `gemini-3.1-flash-lite` with strict instructions to return structured JSON:
```json
{
  "overall_summary": "HTML-formatted 2-3 paragraph overview of all news",
  "articles": [
    { "cluster_id": 0, "engaging_summary": "3-4 paragraph HTML deep-dive" }
  ]
}
```
The Python code then assembles this into a polished HTML email template with article links, source names, and confidence scores.

---

## Part 4: The Automation Engine (`main.py`)

### The Daily Cron Job
```python
async def run_daily_cron():
    while True:
        now = datetime.utcnow()
        target = now.replace(hour=18, minute=0, second=0)  # 18:00 UTC = 11:30 PM IST
        if now >= target:
            target += timedelta(days=1)
        await asyncio.sleep((target - now).total_seconds())
        # --- RUNS AT 11:30 PM IST ---
        # For every user with topics: scrape → rank → generate → email
```
`await asyncio.sleep()` is non-blocking. While the timer counts down, the main server stays fully awake and handles all user requests. The sleeping does not freeze the app.

### What the Cron Job Does Each Night
1. Deletes articles older than 3 days to keep the DB fresh
2. Fetches every user profile that has topics
3. For each user: runs the full pipeline (scrape → embed → rank → LLM → email)

---

## Part 5: The Email Service (`mailer.py`)

The mailer uses the **Brevo Transactional Email API** (not SMTP) via the official `sib-api-v3-sdk`. This means all emails go through HTTPS (port 443), making it compatible with Railway and all cloud hosts.

```python
api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
    sib_api_v3_sdk.ApiClient(configuration)
)
email = sib_api_v3_sdk.SendSmtpEmail(
    to=[{"email": recipient_email}],
    sender={"name": "AI News Aggregator", "email": sender_email},
    subject=subject,
    html_content=html_content
)
api_instance.send_transac_email(email)
```

> **Note:** Brevo requires SMTP account activation for new accounts. If you receive a `permission_denied` error, contact Brevo support and request SMTP activation for your account.

---

## Part 6: The Newsletter Preview Feature (`routes.py`)

A key UX feature: when a user clicks "Generate Newsletter", they see the result immediately on the page — they don't have to wait for an email.

**How it works:**
1. The frontend calls `POST /api/newsletter/preview` (synchronous endpoint)
2. The backend runs the full scrape → embed → rank → LLM pipeline
3. Returns the HTML directly in the JSON response
4. The frontend renders it with `dangerouslySetInnerHTML`
5. Simultaneously, `POST /api/generate` is fired in the background to also send the email

```python
@router.post("/api/newsletter/preview")
def preview_newsletter(user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    all_articles = scrape_all_sources(db, user_id=user["sub"])
    ranked_clusters = filter_and_rank_by_topic(all_articles, topic_keywords)
    newsletter_html = generate_newsletter_with_llm(ranked_clusters)
    return {"status": "success", "html": newsletter_html}
```

---

## Part 7: Security & Auth (`auth.py`)

### How JWT Authentication Works
When a user logs in via Supabase on the frontend, Supabase issues a **JWT (JSON Web Token)** — a digitally signed string that proves their identity. Every subsequent API request from the frontend includes this token in the `Authorization` header.

```python
def verify_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = jwt.decode(token, SUPABASE_JWT_SECRET, algorithms=["HS256"])
    return payload
```
Think of the JWT as a VIP concert wristband. The backend checks the wristband is authentic before executing any sensitive operation. Fake or expired tokens are immediately rejected with a `401 Unauthorized` error.

### Role-Based Access Control (RBAC)
RBAC restricts what different users can do.

**Frontend protection:** React Router checks the user's email before rendering the Admin page:
```jsx
<Route path="/admin" element={
  session?.user.email === import.meta.env.VITE_ADMIN_EMAIL
    ? <AdminDashboard />
    : <Navigate to="/" />
} />
```

**Backend protection:** Even if a hacker bypasses the frontend, the Python backend re-validates:
```python
is_admin = user.get("email") == "atharvconsul@gmail.com"
if db_comment.user_id != user_id and not is_admin:
    raise HTTPException(status_code=403, detail="Unauthorized")
```

---

## Part 8: The Frontend Pages

### GlobalNews.jsx — Reddit-Style Community Feed
- Fetches articles from Supabase with live Realtime subscription
- Sorts using the **HackerNews ranking formula**: `score / (age_hours + 2)^1.5`
  - Balances upvote score vs. recency — a 1-hour-old article with 5 votes beats a 10-hour-old article with 6 votes
- Optimistic UI for votes: colors change immediately before the server confirms
- Comment threads toggle per-article

### Preferences.jsx — User Control Center
- Batch-add topics (comma or newline separated)
- Add custom RSS sources with category tagging
- "Generate AI Newsletter" runs the preview pipeline and renders the HTML inline
- Shows community trending sources grouped by category

### Profile.jsx — User Profile Page
- **Avatar card:** Initials avatar, username, email, join date
- **Karma score:** Sum of (upvotes − downvotes) received on all your comments
- **4 stat cards:** Total comments, upvotes given, downvotes given, topics tracked
- **Recent comments:** Last 5 comments with their article context and vote counts
- **Recent votes:** Last 5 articles voted on with up/down indicator
- **Topics:** All tracked topics as pill badges

### Navbar.jsx — Navigation
- Profile button shows the user's avatar initial
- Highlights active page
- Admin link conditionally rendered for admin users

---

## Part 9: The Database Models (`models.py`)

Think of a database as a collection of Excel spreadsheets, linked by ID columns:

| Table | Key Columns | Purpose |
|---|---|---|
| `sources` | `id`, `url`, `category` | Global news sources (admin-managed) |
| `articles` | `id`, `title`, `link`, `summary`, `source_id`, `upvotes`, `downvotes` | Scraped articles |
| `profiles` | `user_id`, `email`, `username` | User profile data |
| `topics` | `user_id`, `keyword` | User's tracked topics |
| `user_sources` | `user_id`, `url`, `category` | User's custom RSS sources |
| `votes` | `user_id`, `article_id`, `vote_value` | Article votes (+1/−1) |
| `comments` | `user_id`, `article_id`, `content`, `upvotes`, `downvotes` | Article comments |
| `comment_votes` | `user_id`, `comment_id`, `vote_value` | Comment votes |

---

## Part 10: FAQs

**Q: "Why did you switch from `sentence-transformers` to the Gemini Embeddings API?"**
> "The original local model (`all-MiniLM-L6-v2`) required loading PyTorch, which consumed over 500MB of RAM at startup. Our Railway deployment has a 512MB limit, so the backend was crashing with an OOMKilled error. I replaced it with the Gemini Embeddings API, which offloads the computation to Google's servers via a simple HTTPS call. This reduced our startup memory by over 80%, eliminated crashes, and actually produces higher-quality 3072-dimensional embeddings."

**Q: "How does your AI filter match articles to topics?"**
> "I avoided simple keyword matching because it's brittle. Instead I use the Gemini Embeddings API to convert both the user's topic string and each article's text into 3072-dimensional floating-point vectors. I then compute the Cosine Similarity — a geometric measure of how closely the vectors point in the same direction — between the topic vector and each article vector. Articles scoring above 0.2 are considered semantically relevant and kept; the rest are discarded. This means a user who types 'electric vehicles' will match articles that say 'EVs' or 'battery-powered cars' even if the exact phrase never appears."

**Q: "How does your newsletter preview work without blocking the server?"**
> "When the user clicks 'Generate Newsletter', the frontend makes a synchronous `POST /api/newsletter/preview` request and waits for the response. The backend runs the full pipeline — scraping, embedding, ranking, and LLM generation — and returns the finished HTML in the JSON response body. The frontend renders this directly on the page using React's `dangerouslySetInnerHTML`. Simultaneously, the frontend fires a separate `POST /api/generate` request which runs in a FastAPI `BackgroundTask` to also send the email asynchronously. The user gets immediate visual feedback while the email goes out in parallel."

**Q: "How are you handling security?"**
> "The frontend uses Supabase Auth for password management — our backend never sees raw passwords. When the React app communicates with FastAPI, it attaches a JWT token in the Authorization header. Our Python `verify_user` middleware intercepts every protected request, decodes the token using our Supabase JWT secret, and extracts the user's identity from the payload. If the token is invalid or expired, a 401 error is returned immediately. For admin operations, I implement RBAC on both the frontend (React Router guards) and the backend (explicit email checks in the endpoint logic)."

**Q: "How does the daily cron job work without blocking the web server?"**
> "I use Python's `asyncio` coroutines. The `run_daily_cron()` function runs as a background task launched on server startup via `asyncio.create_task()`. Inside the loop, `await asyncio.sleep(wait_seconds)` tells the event loop to pause this specific coroutine until the target time, but the event loop itself remains free to handle all incoming HTTP requests. It's like a chef who puts something in the oven and goes back to serving customers — they're not standing frozen watching the oven."

**Q: "How does your voting system prevent double-voting?"**
> "Each vote is stored in a `votes` table with a unique combination of `user_id` and `article_id`. When a vote is cast, the backend first queries for an existing vote. If one exists, it adjusts the old value before applying the new one — so changing from upvote to downvote correctly decrements upvotes and increments downvotes. If the user re-clicks the same vote, the vote_value is set to 0 (removed). The UI uses optimistic updates — the arrow color and score change instantly on click, then the server confirms asynchronously."
