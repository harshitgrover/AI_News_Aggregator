# 🧠 AI News Aggregator

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)
![React](https://img.shields.io/badge/react-18.x-cyan.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)
![Deployed on Railway](https://img.shields.io/badge/deployed-Railway-blueviolet.svg)

A fully automated, full-stack AI News Aggregator that curates, filters, summarizes, and delivers personalized news — right to your inbox and directly on the web.

Users input **Topics** they care about (e.g., "Artificial Intelligence", "Geopolitics"). Every night at **11:30 PM IST**, the system autonomously scrapes hundreds of global news sources, uses the **Gemini Embeddings API** to mathematically filter irrelevant articles via Cosine Similarity, passes the top 5 verified news clusters to **Google Gemini** to write a cohesive HTML newsletter, and emails it to every user. It also features a **Reddit-style web community** where users can read global news, vote, comment, and preview their newsletter live on the page.

---

## 🔗 Live Demo

**Frontend:** https://ainewsaggregator-production-3ff3.up.railway.app

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **AI-Powered Filtering** | Uses Gemini `gemini-embedding-001` to convert article text into vector embeddings and calculates Cosine Similarity against user topics — mathematically guarantees relevance |
| 📰 **Autonomous 3-Tier Scraper** | Direct RSS → Hidden RSS Auto-Discovery → Heuristic HTML Crawler fallback chain |
| ✍️ **Gemini Summary Expansion** | Short RSS descriptions (< 50 words) are automatically expanded to full 60-word summaries using `gemini-3.1-flash-lite` |
| 📧 **Automated Daily Delivery** | `asyncio` cron job fires at 11:30 PM IST every day, generating and emailing personalized newsletters to all users |
| 🖥️ **In-Page Newsletter Preview** | Clicking "Generate Newsletter" runs the full pipeline synchronously and renders the result directly on the page — no need to check email |
| 🌐 **Reddit-Style Community Feed** | React/Vite SPA with live article feed, upvote/downvote with HackerNews ranking formula, and comment threads |
| 👤 **User Profile Page** | Shows username, email, karma score, total comments/votes, recent comment history, and tracked topics |
| 🔒 **Secure Auth + RBAC** | Supabase Auth with custom JWT validation; Admin-only routes protected on both frontend and backend |
| ♻️ **Realtime Feed** | Supabase Realtime auto-refreshes the global feed when new articles are scraped |

---

## 🛠️ Tech Stack

### Backend
| Library | Purpose |
|---|---|
| `fastapi` + `uvicorn` | Web framework & ASGI server |
| `sqlalchemy` + `psycopg2-binary` | ORM & PostgreSQL driver |
| `requests`, `beautifulsoup4`, `feedparser` | 3-tier web scraper |
| `google-genai` | Gemini embeddings, summarization & newsletter LLM |
| `numpy` | Cosine Similarity vector math |
| `PyJWT` | JWT token decoding & verification |
| `sib-api-v3-sdk` | Brevo transactional email API |
| `python-dotenv` | Secure environment variable loading |

### Frontend
| Library | Purpose |
|---|---|
| `react` + `vite` | Component-based UI & fast build tool |
| `react-router-dom` | Client-side routing (SPA navigation) |
| `@supabase/supabase-js` | Auth, Realtime, and direct DB queries |
| `lucide-react` | UI icon set |

---

## 📂 Project Structure

```text
AI_News/
├── app/
│   ├── api/
│   │   └── routes.py          # All FastAPI endpoints
│   ├── core/
│   │   ├── auth.py            # JWT verification middleware
│   │   └── database.py        # SQLAlchemy engine & session
│   ├── models/
│   │   └── models.py          # DB table definitions (Article, Topic, Vote, Comment...)
│   └── services/
│       ├── ai_engine.py       # Gemini embeddings, cosine similarity, LLM newsletter
│       ├── mailer.py          # Brevo email delivery
│       └── scrapers/
│           └── rss_scraper.py # 3-tier scraper + Gemini summary expansion
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── GlobalNews.jsx   # Reddit-style community feed
│       │   ├── Preferences.jsx  # Topics, sources, newsletter generator
│       │   ├── Profile.jsx      # User profile, stats, karma
│       │   └── AdminDashboard.jsx
│       └── components/
│           ├── Navbar.jsx       # Navigation with profile avatar
│           └── Comments.jsx     # Comment threads
├── main.py                    # App entrypoint, CORS, daily cron job
└── requirements.txt
```

---

## 🚀 Setup & Local Development

### Prerequisites
- Python 3.10+
- Node.js v18+
- A [Supabase](https://supabase.com) Project (for Auth + PostgreSQL)
- A [Google Gemini](https://aistudio.google.com/app/apikey) API Key
- A [Brevo](https://brevo.com) account (for email delivery)

### 1. Clone & Configure
```bash
git clone https://github.com/harshitgrover/AI_News_Aggregator.git
cd AI_News_Aggregator
```

Copy `.env.template` to `.env` and fill in your keys:
```env
GEMINI_API_KEY=your_gemini_api_key
BREVO_API_KEY=your_brevo_api_key
SENDER_EMAIL=your_sender@email.com
SUPABASE_DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
```

For the frontend, create `frontend/.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8000
VITE_ADMIN_EMAIL=your_admin@email.com
```

### 2. Backend Setup
```bash
python3 -m venv venv
source venv/bin/activate       # Mac/Linux
# venv\Scripts\activate        # Windows

pip install -r requirements.txt

# Start FastAPI server at http://localhost:8000
uvicorn app.main:app --reload
```
> SQLAlchemy auto-creates all DB tables on the first run.

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev                    # Starts at http://localhost:5173
```

---

## 🔄 How the Newsletter Pipeline Works

```
[User clicks "Generate Newsletter"]
        ↓
1. scrape_all_sources()
   → Scrapes all global RSS feeds (3-tier fallback)
   → Expands short summaries using Gemini

2. filter_and_rank_by_topic()
   → Embeds user topics via gemini-embedding-001
   → Embeds every article via gemini-embedding-001
   → Calculates Cosine Similarity for each article
   → Clusters similar articles (confidence scoring)
   → Returns top 5 ranked clusters

3. generate_newsletter_with_llm()
   → Sends clusters to gemini-3.1-flash-lite
   → Gets back structured JSON with overall_summary + per-article summaries
   → Assembles final HTML newsletter

4. Response: HTML rendered on-page + email sent in background
```

---

## 📖 Full Code Explanation

For a comprehensive, beginner-friendly deep-dive into every file, design decision, and interview question, see [Detailed_Code_Explanation.md](./Detailed_Code_Explanation.md).

---
