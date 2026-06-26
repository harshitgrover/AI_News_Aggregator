import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ArrowUp, ArrowDown, MessageSquare } from 'lucide-react';
import Comments from '../components/Comments';

export default function GlobalNews() {
  const [articles, setArticles] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [userVotes, setUserVotes] = useState({});
  const [userId, setUserId] = useState(null);
  const [expandedComments, setExpandedComments] = useState({});

  const toggleComments = (id) => {
    setExpandedComments(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchUserVotes(user.id);
      }
    });

    fetchArticles(activeCategory);
    
    // Set up Supabase Realtime for Auto-Reloading!
    const channel = supabase
      .channel('public:articles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'articles' }, payload => {
        fetchArticles(activeCategory); 
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCategory]);

  const fetchUserVotes = async (uid) => {
    // Fetch the user's specific vote history to colorize the arrows!
    const { data } = await supabase.from('votes').select('*').eq('user_id', uid);
    if (data) {
      const voteMap = {};
      data.forEach(v => {
        if (v.vote_value !== 0) voteMap[v.article_id] = v.vote_value;
      });
      setUserVotes(voteMap);
    }
  };

  const fetchArticles = async (category) => {
    let query = supabase.from('articles').select(`*, sources!inner(category, name)`).order('created_at', { ascending: false }).limit(100);
    
    if (category !== 'all') {
      query = query.eq('sources.category', category);
    }
    
    const { data } = await query;
    if (data) {
      const sortedData = [...data].sort((a, b) => {
        const scoreA = (a.upvotes || 0) - (a.downvotes || 0);
        const scoreB = (b.upvotes || 0) - (b.downvotes || 0);
        
        // Age in hours
        const ageHoursA = (new Date() - new Date(a.created_at)) / (1000 * 60 * 60);
        const ageHoursB = (new Date() - new Date(b.created_at)) / (1000 * 60 * 60);
        
        // HackerNews ranking formula: Score / (Age + 2)^1.5
        const rankA = scoreA / Math.pow((ageHoursA + 2), 1.5);
        const rankB = scoreB / Math.pow((ageHoursB + 2), 1.5);
        
        return rankB - rankA; // Sort descending (highest rank first)
      });
      
      setArticles(sortedData);
    }
  };

  const handleVote = async (id, targetVote) => {
    if (!userId) {
      alert("Please log in to vote.");
      return;
    }

    const currentVote = userVotes[id] || 0;
    let newVote = targetVote;
    if (currentVote === targetVote) newVote = 0; // Clicking an active vote toggles it off!
    
    // Optimistic UI Update instantly changes the colors
    setUserVotes({ ...userVotes, [id]: newVote });
    
    // Also update the score so the number changes immediately!
    setArticles(articles.map(a => {
        if (a.id === id) {
            let newUp = a.upvotes || 0;
            let newDown = a.downvotes || 0;
            if (currentVote === 1) newUp -= 1;
            if (currentVote === -1) newDown -= 1;
            
            if (newVote === 1) newUp += 1;
            if (newVote === -1) newDown += 1;
            
            return { ...a, upvotes: newUp, downvotes: newDown };
        }
        return a;
    }));
    
    // Send to FastAPI to handle the complex aggregation logic
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/articles/${id}/vote`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}` 
      },
      body: JSON.stringify({ vote_value: newVote })
    });
  };

  return (
    <div className="container" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '30px', alignItems: 'start', maxWidth: '1200px' }}>
      
      {/* Sidebar Navigation */}
      <div className="glass-panel" style={{ position: 'sticky', top: '20px' }}>
        <h3 style={{marginTop: 0, marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '10px'}}>Browse Topics</h3>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['all', 'tech', 'ai', 'politics', 'geopolitics', 'gaming'].map(cat => (
            <li key={cat}>
              <button 
                onClick={() => setActiveCategory(cat)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 15px', borderRadius: '8px',
                  background: activeCategory === cat ? 'var(--primary)' : 'transparent',
                  color: activeCategory === cat ? 'white' : 'var(--text)',
                  border: 'none', cursor: 'pointer', textTransform: 'capitalize',
                  fontWeight: activeCategory === cat ? 'bold' : 'normal',
                  transition: 'all 0.2s'
                }}
              >
                {cat === 'all' ? 'All Global News' : cat}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* Main Global Feed */}
      <div>
        <div style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 8px 0', textTransform: 'capitalize' }}>{activeCategory === 'all' ? 'Latest Global News' : `${activeCategory} News`}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Auto-reloading live community feed from global sources.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {articles.map(article => (
            <div key={article.id} className="glass-panel" style={{ display: 'flex', gap: '20px', padding: '20px', transition: 'transform 0.2s' }}>
              
              {/* Reddit-Style Voting Column */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '40px' }}>
                <button 
                  onClick={() => handleVote(article.id, 1)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: userVotes[article.id] === 1 ? '#f97316' : '#94a3b8', transition: 'color 0.2s' }}>
                  <ArrowUp size={28} strokeWidth={userVotes[article.id] === 1 ? 3 : 2} />
                </button>
                <span style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#0f172a' }}>
                  {(article.upvotes || 0) - (article.downvotes || 0)}
                </span>
                <button 
                  onClick={() => handleVote(article.id, -1)} 
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: userVotes[article.id] === -1 ? '#3b82f6' : '#94a3b8', transition: 'color 0.2s' }}>
                  <ArrowDown size={28} strokeWidth={userVotes[article.id] === -1 ? 3 : 2} />
                </button>
              </div>

              {/* Article Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '8px', display: 'flex', gap: '10px' }}>
                  <span>{article.sources?.name || 'News Source'}</span>
                  <span style={{ color: 'var(--primary)' }}>&bull; {article.sources?.category}</span>
                </div>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', lineHeight: '1.4' }}>
                  <a href={article.link} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', color: '#0f172a' }}>{article.title}</a>
                </h3>
                <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, marginBottom: '15px' }}>{article.summary}</p>
                
                <button 
                  onClick={() => toggleComments(article.id)}
                  style={{ background: 'transparent', border: 'none', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0, fontWeight: 'bold', fontSize: '0.9rem' }}>
                  <MessageSquare size={16} /> {expandedComments[article.id] ? 'Hide Discussion' : 'View Discussion'}
                </button>
                
                {expandedComments[article.id] && <Comments articleId={article.id} />}
              </div>
            </div>
          ))}
          {articles.length === 0 && <p style={{color: 'var(--text-muted)'}}>No articles found for this topic yet. Ensure the Admin has added sources!</p>}
        </div>
      </div>

    </div>
  );
}
