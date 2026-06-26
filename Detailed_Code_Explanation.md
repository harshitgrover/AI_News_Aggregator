# The Complete Interview Master-Guide: AI News Aggregator

This document is the ultimate, exhaustive master-guide to your **AI News Aggregator** project. It is designed specifically to be **100% beginner-friendly**. We will use simple analogies to explain complex programming concepts. If an interviewer asks you about this project, this document contains every answer.

---

## Part 1: High-Level Project Architecture (What is it & How does it work?)

### The "Elevator Pitch"
The AI News Aggregator curates personalized news. Users input "Topics" they care about (e.g., "Artificial Intelligence"). Every morning at 8:00 AM, the system automatically reads hundreds of news websites, uses an AI to mathematically filter out junk articles, passes the real news to Google's Gemini AI to write a beautiful summary, and emails it to the user. It also features a web frontend where users can upvote articles and comment.

### The "Restaurant Analogy" (How it is Integrated)
To understand how the code works together, imagine a restaurant:
1. **The Frontend (The Dining Room):** This is the React website. It's where the user sits, clicks buttons, and reads the menu. 
2. **The API (The Waiter):** When the user clicks "Save Topic", the frontend sends an API Request (a waiter taking an order) to the kitchen.
3. **The Backend (The Kitchen):** This is the Python/FastAPI code. It receives the order, processes the logic, and cooks the meal.
4. **The Database (The Pantry):** This is PostgreSQL. It's where the backend stores all the raw ingredients (users, articles, passwords).
5. **The Cron Job (The Night Shift Prep Cook):** A background timer that wakes up at 8:00 AM every day to automatically scrape the internet and prepare the daily emails.

---

## Part 2: The Absolute Beginner's Guide to RSS and Web Scraping

Since we are scraping news from the internet, you must understand exactly what an RSS feed is.

### What even is an RSS Feed?
Imagine you want to read 10 different newspapers. 
- **The Old Way (Normal HTML Websites):** You walk to 10 newsstands, buy 10 papers, flip through ads, ignore crossword puzzles, and search for the articles. Normal websites are full of visual clutter built for human eyes.
- **The RSS Way:** You subscribe to a service that mails you a plain-text summary of just the headlines, with no ads or pictures. **RSS** is a special file format (called XML) that websites provide specifically for computers to read. 

**Important Note on RSS:** An RSS feed is a "rolling window". It only contains the **last 20 articles**. If a site publishes article #21, the oldest article vanishes from the feed forever. This is why our system has to check the feeds every single day!

---

## Part 3: Users and Role-Based Access Control (RBAC)

Managing who can log in and what they can do is called **Role-Based Access Control (RBAC)**.

### How Users Are Handled
In this project, users exist in two places simultaneously:
1. **Supabase Auth (The Security Bouncer):** When a user signs up on React, their password is securely encrypted and sent to Supabase. Supabase acts as a bouncer at a club. Our Python code NEVER sees the raw password.
2. **The Postgres Database (The Club VIP List):** Supabase doesn't let us attach custom data (like "Upvotes") to their security files. So, the moment a user logs in, our code sends a silent request to our Python backend to create a row in our `Profile` database. Now we can track their comments and topics!

### What is Role-Based Access Control (RBAC)?
RBAC restricts access to features so standard users cannot break the site. 

**1. Frontend Admin Protection**
We do not want standard users clicking the Admin Dashboard.
```javascript
<Route path="/admin" element={session && session.user.email === import.meta.env.VITE_ADMIN_EMAIL ? <AdminDashboard /> : <Navigate to="/" />} />
```
- **Beginner Explanation:** React checks the user's email. It compares it to a secret variable (`VITE_ADMIN_EMAIL`). If the emails match, it opens the door. If not, it kicks them back to the homepage.

**2. Backend Admin Protection**
A smart hacker could bypass the frontend. We must protect the backend (The Kitchen).
```python
@router.delete("/api/comments/{comment_id}")
def delete_comment(comment_id: int, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
    # User owns the comment OR is Master Admin
    is_admin = user.get("email") == "atharvconsul@gmail.com"
    if db_comment.user_id != user_id and not is_admin:
        raise HTTPException(status_code=403, detail="Unauthorized")
```
- **Beginner Explanation:** When a user tries to delete a comment, the backend checks: "Did you write this comment? No? Are you the Master Admin? No? Then you get a `403 Unauthorized` error (access denied)!"

---

## Part 4: The Tech Stack & Exhaustive Library Dictionary

Why did we use these specific tools?

### Backend Python Libraries
1. **`fastapi`:** The main framework. We use it instead of Django because it is built for "asynchronous" programming, meaning it can do 10 things at once without freezing.
2. **`uvicorn`:** The actual web server engine that runs the FastAPI code.
3. **`sqlalchemy`:** A tool that lets us write Python code instead of raw SQL database code. It protects us from hackers trying to inject malicious database commands.
4. **`psycopg2-binary`:** The "driver" that allows Python to physically connect to the PostgreSQL database.
5. **`beautifulsoup4`:** A magic tool that can read messy, chaotic website code (HTML) and extract just the clean text and links.
6. **`requests`:** Allows our Python code to act like a web browser and visit URLs to download data.
7. **`feedparser`:** Specially designed to read the messy XML format of RSS feeds.
8. **`sentence-transformers`:** A local AI model that converts English text into math (used for filtering news).
9. **`numpy`:** The ultimate math library. It calculates the similarity between the math generated by the AI.
10. **`google-genai`:** The official tool to send data to Google's Gemini AI.
11. **`PyJWT`:** Decodes digital security tokens (JSON Web Tokens) to prove a user is logged in.
12. **`python-dotenv`:** Hides our secret passwords in a `.env` file so they aren't uploaded to GitHub.

### Frontend Javascript Libraries
1. **`react` & `react-dom`:** Allows us to build the website using reusable Lego blocks called "Components" (like an `<ArticleCard />`), rather than writing thousands of lines of HTML.
2. **`vite`:** A tool that bundles and builds the React code instantly.
3. **`react-router-dom`:** Allows the user to click links (like `/login`) and change pages instantly without the browser refreshing.
4. **`@supabase/supabase-js`:** Securely handles user signup and login.
5. **`lucide-react`:** Provides the beautiful UI icons (like the upvote arrows).

---

## Part 5: The Database Architecture (The Data Model)

Think of a Database as a massive Excel Spreadsheet, and Tables are the different sheets.

1. **`Source` Table:** Holds the global news websites (e.g., The Verge).
2. **`Article` Table:** Holds every single news story.
   - **Beginner Concept: Foreign Keys:** This table has a column called `source_id`. Think of this as an "ID Badge". It points exactly to the `Source` table. This links the article to the newspaper that wrote it!
3. **`Profile` Table:** Stores the user's `user_id` and `email`.
4. **`Topic` Table:** Links a keyword (e.g., "AI") to a specific user.
5. **`Comment` Table:** Holds the text a user typed on an article.

---

## Part 6: Security Code Deep-Dive (`auth.py`)

How does the backend know who is making a request?

```python
def verify_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
```
- **Beginner Explanation:** When you go to a concert, you wear a VIP wristband. When the React frontend talks to the backend, it wears a digital wristband called a **JWT Token**. This function is the security guard checking the wristband. If the wristband is fake or expired, it rejects the request.

---

## Part 7: The Backend API Integration (`routes.py`)

This is where the frontend "Waiters" drop off their orders to the "Kitchen".

```python
@router.post("/api/articles/{article_id}/vote")
def cast_vote(article_id: int, vote: VoteCreate, user: dict = Depends(verify_user), db: Session = Depends(get_db)):
```
- **Beginner Explanation:** The `@router.post` acts like a specific mailbox slot. When the frontend sends a message to `/api/articles/5/vote`, FastAPI knows exactly which Python function to run. The `Depends(verify_user)` forces the security guard (from Part 6) to check their wristband before the code is allowed to run!

---

## Part 8: The Web Scraper Engine (`rss_scraper.py`)

Our scraper uses a 3-tier fallback strategy. If plan A fails, it tries plan B.

**Tier 1: Direct RSS Parsing**
If the admin gives us a perfect RSS link, `feedparser` reads the clean XML file and extracts the news. Easy!

**Tier 2: RSS Auto-Discovery (The Fallback)**
What if the admin gives us the normal URL `https://theverge.com`?
Our code uses `BeautifulSoup` to scan the invisible `<head>` section of the website. Web developers usually hide a secret link to their true RSS feed here. If we find it, we use it!

**Tier 3: The HTML Heuristic Crawler (The Last Resort)**
What if there is absolutely no RSS feed? Our code pretends to be a human!
It uses `BeautifulSoup` to find every single hyperlink (`<a>`) on the homepage. 
- A link like `site.com/about` is short. 
- A link like `site.com/apple-releases-new-phone` is very long. News articles always have long links!
It throws away the short links, clicks the long links, and scrapes the invisible `<meta>` tags to artificially fake an RSS entry.

---

## Part 9: The AI Engine (`ai_engine.py`)

This is the brain of the aggregator.

### Converting Words to Math (Embeddings)
```python
model = SentenceTransformer('all-MiniLM-L6-v2')
def get_embedding(text):
    return model.encode(text)
```
- **Beginner Explanation:** AI cannot read English. This code passes text into a neural network, which outputs an array of 384 numbers. Imagine drawing dots on a map. The word "Dog" will be drawn very close to "Puppy", but very far from "Car".

### Cosine Similarity
```python
def filter_and_rank_by_topic(articles, user_topics):
```
- **Beginner Explanation:** We turn the user's topic ("AI") into dots on the map. We turn every news article into dots on the map. We use a math formula called **Cosine Similarity** to measure the distance between them. If the dots are close together (score > 0.2), we guarantee the article is about AI. If they are far apart, we delete the article.

### Synthesis
We send the surviving articles to Google Gemini. We give Gemini strict instructions to act like a journalist and return the summary in a strict format called JSON, which allows our code to easily inject the text into a beautiful email.

---

## Part 10: The Email Service (`mailer.py`)

```python
    msg = EmailMessage()
    msg.add_alternative(html_content, subtype='html')
```
- **Beginner Explanation:** We create a digital envelope. By setting `subtype='html'`, we tell Gmail, "Do not show this as boring black-and-white text. Render the beautiful colors and bold fonts." We then use `smtplib` to connect to Google's post office servers and blast the email out.

---

## Part 11: The Automation Engine (Cron Job in `main.py`)

How does the app run by itself?

```python
async def run_daily_cron():
    while True:
        # Calculate time until 8:00 AM
        await asyncio.sleep(wait_seconds)
        # --- AT 8:00 AM, IT WAKES UP ---
        # Scrape news, run AI, send emails...
```
- **Beginner Explanation:** Imagine a chef cooking 5 meals at once. If he puts a turkey in the oven for 4 hours, he doesn't stand completely still staring at the oven (freezing the kitchen). He does other things while waiting. This is what `await asyncio.sleep()` does. It tells the background timer to pause and wait for 8:00 AM, but keeps the main web server completely awake to serve users.

---

## Part 12: The Frontend Integration (React & Vite)

How does the visual website actually get the data?

```javascript
function App() {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(...)
```
- **Beginner Explanation:** 
  - **`useState`:** This is the memory of the website. It remembers if the user is logged in.
  - **`useEffect`:** This is an automatic reflex. The exact second the user opens the website, `useEffect` fires automatically. It asks Supabase, "Is this person logged in?". If yes, it updates the memory (`session`), which causes the screen to instantly change and show the dashboard!

---

## Part 13: Potential Interview Questions & Answers

If an interviewer asks you about this project, here is how you answer professionally but simply:

**Q: "Why did you choose FastAPI over a framework like Node.js?"**
A: "I chose FastAPI because it natively supports modern asynchronous Python. Because my app does a lot of waiting—like waiting for websites to be scraped or waiting for Gemini to write a summary—FastAPI can pause those tasks and handle thousands of other users simultaneously without the server crashing."

**Q: "How are you matching news articles to user topics?"**
A: "I avoided simple keyword matching because it's flawed (an article might say 'automobile' but the user searched 'cars'). Instead, I used `sentence-transformers` to generate mathematical vector embeddings for both the user's topic and the articles. I then calculate the Cosine Similarity to mathematically guarantee they mean the same thing."

**Q: "How are you handling security and users?"**
A: "The frontend uses Supabase Auth to handle passwords securely. However, the backend is 'stateless'. When the React app asks the backend for data, it attaches a JWT token. My Python backend intercepts the request, dynamically fetches Supabase's public cryptographic keys, and verifies the digital signature of the token to guarantee the user's identity."

**Q: "How did you implement Role Based Access Control (RBAC)?"**
A: "I implemented RBAC on both sides. On the frontend, React Router protects the `/admin` path by checking if the user's email matches my master admin email. On the backend, my delete endpoints extract the user's email from the JWT token and explicitly verify they are either the original author or the master admin before executing the SQL delete command."

**Q: "How does your scraper handle websites that don't have an RSS feed?"**
A: "I built a 3-tier fallback system. First, it tries to read direct XML. If that fails, it uses `BeautifulSoup` to scan the hidden HTML `<head>` to auto-discover secret RSS links. If that also fails, it executes a heuristic HTML crawler. It finds all hyperlinks on the page, filters for long URLs (which usually indicate news articles), visits them, and artificially scrapes the invisible HTML Meta Description tags to construct a fake RSS entry."
