from sentence_transformers import SentenceTransformer
import numpy as np
import os


# 1. Load the free, open-source AI Model into memory for embeddings.
print("Loading Embedding Model...")
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text):
    return model.encode(text)

def calculate_cosine_similarity(vector_a, vector_b):
    dot_product = np.dot(vector_a, vector_b)
    norm_a = np.linalg.norm(vector_a)
    norm_b = np.linalg.norm(vector_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)

def cluster_similar_articles(articles, similarity_threshold=0.55):
    """Groups similar articles together for Verification (Confidence Score). Lowered threshold to group more items."""
    clusters = []
    for article in articles:
        added_to_cluster = False
        for cluster in clusters:
            leader = cluster['articles'][0]
            if calculate_cosine_similarity(article['embedding'], leader['embedding']) >= similarity_threshold:
                cluster['articles'].append(article)
                added_to_cluster = True
                break
                
        if not added_to_cluster:
            clusters.append({
                "articles": [article],
                "confidence_score": 1,
                "relevance_score": article.get('relevance_score', 0) # Carry over the topic relevance
            })
            
    for cluster in clusters:
        cluster['confidence_score'] = len(cluster['articles'])
        
    return clusters

def filter_and_rank_by_topic(articles, user_topics):
    """
    1. Embeds the user topics.
    2. Calculates relevance for all articles.
    3. Clusters them for confidence.
    4. Ranks them by Priority!
    """
    if not articles: return []
    
    topic_embedding = get_embedding(user_topics)
    
    relevant_articles = []
    for article in articles:
        full_text = f"{article['title']}. {article['summary']}"
        article['embedding'] = get_embedding(full_text)
        
        # Calculate Relevance to User Topics!
        relevance = calculate_cosine_similarity(topic_embedding, article['embedding'])
        
        # Only keep articles that are at least somewhat relevant to the topic (> 0.2 threshold)
        if relevance > 0.2:
            article['relevance_score'] = float(relevance)
            relevant_articles.append(article)
            
    # Cluster the relevant ones to find the highly verified news
    clusters = cluster_similar_articles(relevant_articles)
    
    # RANKING FORMULA: Relevance (0.0 to 1.0) + (Confidence * 0.1)
    # This means a highly relevant article gets a boost if it is reported by multiple sources!
    clusters.sort(key=lambda c: c['relevance_score'] + (c['confidence_score'] * 0.1), reverse=True)
    
    # Return the top 5 most important news events
    return clusters[:5]

def generate_newsletter_with_llm(ranked_clusters):
    """
    Passes the ranked clusters to Groq to write a beautiful, multi-faceted HTML summary.
    """
    if not ranked_clusters:
        return """
        <div style="background: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #ef4444;">
            <h3 style="color: #ef4444; margin-top: 0;">No Relevant News Found</h3>
            <p style="color: #94a3b8; margin-bottom: 0;">We scraped your sources, but couldn't find any articles currently matching your specific topics. Please try broader topics or add more sources!</p>
        </div>
        """
        
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key or gemini_api_key == "your_gemini_api_key_here":
        return "<h3>Error: Gemini API Key is missing! Please add it to your .env file.</h3>"
        
    from google import genai
    from google.genai import types
    
    client = genai.Client(api_key=gemini_api_key)
    
    # Prepare the context for the LLM
    context = "Here are the top prioritized news events. Return a JSON object based on the schema.\n\n"
    
    for i, cluster in enumerate(ranked_clusters):
        lead_article = cluster['articles'][0]
        context += f"Cluster ID: {i}\n"
        context += f"Title: {lead_article['title']}\n"
        context += f"Original Summary: {lead_article['summary']}\n"
        context += "-" * 50 + "\n"
        
    system_prompt = """You are an elite AI tech journalist. Your job is to read the provided news clusters and synthesize them.
    You MUST return a raw JSON object with the exact following schema:
    {
       "overall_summary": "A comprehensive 2-3 paragraph HTML-formatted string summarizing all the relevant news.",
       "articles": [
          {
             "cluster_id": 0,
             "engaging_summary": "A comprehensive, highly detailed 3-4 paragraph HTML-formatted deep dive explaining the context, history, and importance of this specific news item."
          }
       ]
    }
    """
    
    print("Querying Gemini LLM for Structured JSON...")
    response = client.models.generate_content(
        model='gemini-3.1-flash-lite',
        contents=context,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            temperature=0.7,
            response_mime_type="application/json",
        ),
    )
    
    import json
    try:
        data = json.loads(response.text)
    except Exception as e:
        print("Failed to parse JSON from LLM:", e)
        data = {"overall_summary": "Could not generate summary.", "articles": []}
        
    # Python HTML Templating (100% Deterministic!)
    html = f"""
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 650px; margin: 0 auto; color: #0f172a;">
        <h2 style="color: #2563eb; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">Your Custom AI Newsletter</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; margin-bottom: 40px; line-height: 1.6;">
            {data.get('overall_summary', '')}
        </div>
    """
    
    # Loop over the DB clusters to guarantee exact URLs and Scores
    for i, cluster in enumerate(ranked_clusters):
        lead_article = cluster['articles'][0]
        sources = ", ".join(list(set([a['source_name'] for a in cluster['articles']])))
        
        # Grab the engaging summary from the LLM's JSON output
        article_summary = "Summary not generated."
        for item in data.get('articles', []):
            if item.get('cluster_id') == i:
                article_summary = item.get('engaging_summary', '')
                break
                
        html += f"""
        <div style="margin-bottom: 35px; padding-bottom: 25px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0 0 8px 0; font-size: 1.3rem;">{lead_article['title']}</h3>
            <div style="font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; letter-spacing: 0.5px;">
                Sources: {sources}
            </div>
            <div style="line-height: 1.6; color: #334155; margin-bottom: 16px;">{article_summary}</div>
            <a href="{lead_article['link']}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 0.9rem;">
                Read Full Story
            </a>
        </div>
        """
        
    html += """
        <p style="color: #94a3b8; font-size: 0.8rem; text-align: center; margin-top: 40px;">
            Generated by The AI News Aggregator Team
        </p>
    </div>
    """
    
    return html
