# 🧠 AI News Aggregator

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)
![React](https://img.shields.io/badge/react-18.x-cyan.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green.svg)

A fully automated, full-stack AI News Aggregator that curates, filters, and summarizes the internet for you. 

Instead of manually checking multiple websites, users input "Topics" they care about. Every morning, the system autonomously scrapes hundreds of global news sources, uses a local Machine Learning model to mathematically filter out irrelevant articles, passes the verified news to Google's Gemini LLM to write a cohesive summary, and emails it to the user. It also features a Reddit-style web frontend where users can read global news, upvote/downvote articles, and comment.

---

## 🔗 Live Demo

**Frontend URL:** https://ainewsaggregator-production-3ff3.up.railway.app
*(Note: Replace with your actual live Railway URL)*

---
## ✨ Key Features

- **🤖 AI-Powered Filtering:** Uses local HuggingFace `sentence-transformers` (`all-MiniLM-L6-v2`) to calculate Cosine Similarity between user topics and scraped articles, ensuring extreme relevance without keyword-matching flaws.
- **📰 Autonomous Web Scraper:** Highly resilient 3-tier fallback scraper (Direct RSS -> Hidden Link Auto-Discovery -> HTML Heuristic Web Crawler).
- **✍️ LLM Summarization:** Integrates with Google Gemini (`gemini-3.1-flash-lite`) to digest hundreds of articles and write professional, structured newsletter summaries.
- **✉️ Automated Delivery:** Background `asyncio` cron jobs wake up daily at 8:00 AM to process news and dispatch HTML emails via SMTP.
- **🌐 Reddit-Style Frontend:** A beautiful React/Vite single-page application allowing users to read the global feed, upvote/downvote articles, and comment.
- **🔒 Secure Authentication:** Powered by Supabase Auth with custom JWT validation middleware and Role-Based Access Control (RBAC).

---

## 🛠️ Tech Stack

### Backend (The Kitchen)
* **Framework:** [FastAPI](https://fastapi.tiangolo.com/) + Uvicorn
* **Database & ORM:** PostgreSQL + SQLAlchemy + Psycopg2
* **Scraping:** Requests, BeautifulSoup4, Feedparser
* **AI Models:** Sentence-Transformers, Numpy, Google GenAI SDK
* **Security:** PyJWT

### Frontend (The Dining Room)
* **Framework:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
* **Routing:** React Router v6
* **Authentication:** Supabase JS SDK
* **Icons:** Lucide React

---

## 📂 Project Structure

```text
AI_News/
├── app/                  # Backend Python Code
│   ├── api/              # FastAPI Routes (endpoints)
│   ├── core/             # Database connection & JWT Security
│   ├── models/           # SQLAlchemy Database Models
│   └── services/         # Scrapers, AI Engine, and Mailer logic
├── frontend/             # Frontend React Code
│   ├── src/              # React Components & Pages
│   └── package.json      # NPM dependencies
├── main.py               # Backend Entrypoint & Cron Job
└── requirements.txt      # Python dependencies
```

---

## 🚀 Setup & Installation

### Prerequisites
* Python 3.10+
* Node.js v18+
* A Supabase Project (for Auth and PostgreSQL)
* A Google Gemini API Key

### 1. Environment Variables
You need to set up your `.env` file in the root directory. Use `.env.template` as a guide:
```env
SUPABASE_DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
SUPABASE_JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
SENDER_EMAIL=your_email@gmail.com
SENDER_PASSWORD=your_app_password
```

*(Note: For the frontend, create a separate `.env` inside the `/frontend` folder containing your `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_ADMIN_EMAIL`).*

### 2. Backend Setup
Open a terminal in the root directory:
```bash
# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate  # On Mac/Linux
venv\Scripts\activate     # On Windows

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server (Runs on http://localhost:8000)
uvicorn app.main:app --reload
```
*(Note: SQLAlchemy will automatically create all required PostgreSQL tables on the first run).*

### 3. Frontend Setup
Open a second terminal and navigate to the `frontend` folder:
```bash
cd frontend

# Install dependencies
npm install

# Start the React development server (Runs on http://localhost:5173)
npm run dev
```

---

## 📖 Complete Documentation
For an exhaustive, beginner-friendly deep dive into exactly how the code works, the architecture, and the specific purpose of every library used, please read the included [Detailed_Code_Explanation.md](./Detailed_Code_Explanation.md). This file serves as the ultimate master-guide and interview prep document for the project!

---
