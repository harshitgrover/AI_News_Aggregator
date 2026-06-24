import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Rss, Hash, Trash2, Loader2, Play } from 'lucide-react';

export default function Preferences() {
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [popularSources, setPopularSources] = useState([]);
  const [newTopicsStr, setNewTopicsStr] = useState('');
  const [newSourcesStr, setNewSourcesStr] = useState('');
  const [newSourceCategory, setNewSourceCategory] = useState('general');
  const [sourceSearch, setSourceSearch] = useState('');
  const [topicSearch, setTopicSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        fetchUserData(user.id);
      }
    });
  }, []);

  const fetchUserData = async (userId) => {
    const { data: topicsData } = await supabase.from('topics').select('*').eq('user_id', userId);
    const { data: sourcesData } = await supabase.from('user_sources').select('*').eq('user_id', userId);
    if (topicsData) setTopics(topicsData);
    if (sourcesData) setSources(sourcesData);
    
    // Fetch Community Recommendations
    const res = await fetch('http://localhost:8000/api/community/sources');
    if (res.ok) setPopularSources(await res.json());
  };

  const addBatchTopics = async (e) => {
    e.preventDefault();
    if (!newTopicsStr.trim()) return;
    
    // Parse commas or newlines for batch adding
    const items = newTopicsStr.split(/[\n,]+/).map(i => i.trim()).filter(i => i);
    const uniqueItems = items.filter(k => !topics.some(t => t.keyword.toLowerCase() === k.toLowerCase()));
    
    if (uniqueItems.length === 0) {
      alert("All these topics are already active.");
      return;
    }
    
    const inserts = uniqueItems.map(k => ({ user_id: user.id, keyword: k }));
    
    const { data } = await supabase.from('topics').insert(inserts).select();
    if (data) setTopics([...topics, ...data]);
    setNewTopicsStr('');
  };

  const deleteTopic = async (id) => {
    await supabase.from('topics').delete().eq('id', id);
    setTopics(topics.filter(t => t.id !== id));
  };

  const addBatchSources = async (e) => {
    e.preventDefault();
    if (!newSourcesStr.trim()) return;
    
    const items = newSourcesStr.split(/[\n,\s]+/).map(i => i.trim()).filter(i => i);
    const uniqueItems = items.filter(url => !sources.some(s => s.url.toLowerCase() === url.toLowerCase()));
    
    if (uniqueItems.length === 0) {
      alert("All these sources are already active.");
      return;
    }

    const inserts = uniqueItems.map(url => ({ user_id: user.id, url, name: 'Custom Source', source_type: 'rss', category: newSourceCategory }));
    
    const { data } = await supabase.from('user_sources').insert(inserts).select();
    if (data) setSources([...sources, ...data]);
    setNewSourcesStr('');
  };

  const deleteSource = async (id) => {
    await supabase.from('user_sources').delete().eq('id', id);
    setSources(sources.filter(s => s.id !== id));
  };

  const triggerAI = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('http://localhost:8000/api/generate', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) alert("Success! Your AI Newsletter is generating and will be emailed shortly.");
      else alert("Error from server. Check backend logs.");
    } catch (e) {
      alert("Network Error. Is the FastAPI server running on port 8000?");
    }
    setLoading(false);
  };

  return (
    <div className="container">
      
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ margin: '0 0 8px 0' }}>My Custom Preferences</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0 }}>Configure exactly what you want the AI to read and summarize for you.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px' }}>
        
        {/* Topics Panel */}
        <div className="glass-panel">
          <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center'}}><Hash size={18} style={{ marginRight: '8px', color: 'var(--primary)' }}/> Topics to Track</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>Paste multiple topics separated by commas or new lines to batch add.</p>
          
          <form onSubmit={addBatchTopics} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            <textarea 
              className="input-field" 
              rows="3"
              placeholder="e.g. Artificial Intelligence, Quantum Computing, Startups" 
              value={newTopicsStr} 
              onChange={(e) => setNewTopicsStr(e.target.value)} 
            />
            <button type="submit" className="btn-primary">Add Topics</button>
          </form>

          <h4 style={{borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            Active Topics
            <input type="text" placeholder="Search..." value={topicSearch} onChange={(e) => setTopicSearch(e.target.value)} style={{fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)'}} />
          </h4>
          <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
            {topics.length === 0 && <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>No topics added yet.</span>}
            {topics.filter(t => t.keyword.toLowerCase().includes(topicSearch.toLowerCase())).map(t => (
              <div key={t.id} className="crud-item">
                <span>{t.keyword}</span>
                <button onClick={() => deleteTopic(t.id)} className="btn-danger" style={{padding: '4px 8px', fontSize: '0.8rem'}}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Sources Panel */}
        <div className="glass-panel">
          <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center'}}><Rss size={18} style={{ marginRight: '8px', color: 'var(--primary)' }}/> Custom Sources</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>Paste multiple URLs separated by commas or new lines to batch add.</p>
          
          <form onSubmit={addBatchSources} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            <textarea 
              className="input-field" 
              rows="3"
              placeholder="https://techcrunch.com/rss&#10;https://reddit.com/r/MachineLearning.rss" 
              value={newSourcesStr} 
              onChange={(e) => setNewSourcesStr(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <select className="input-field" value={newSourceCategory} onChange={(e) => setNewSourceCategory(e.target.value)} style={{ flex: 1, padding: '8px' }}>
                <option value="general">General</option>
                <option value="tech">Tech</option>
                <option value="ai">AI</option>
                <option value="science">Science</option>
                <option value="business">Business</option>
                <option value="politics">Politics</option>
                <option value="geopolitics">Geopolitics</option>
                <option value="gaming">Gaming</option>
              </select>
              <button type="submit" className="btn-primary" style={{ flex: 1 }}>Add Sources</button>
            </div>
          </form>

          <h4 style={{borderBottom: '1px solid var(--border)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            Active Custom Sources
            <input type="text" placeholder="Search..." value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} style={{fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border)', width: '120px'}} />
          </h4>
          <div style={{ maxHeight: '250px', overflowY: 'auto', paddingRight: '10px' }}>
            {sources.length === 0 && <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>No custom sources added yet.</span>}
            {sources.filter(s => s.url.toLowerCase().includes(sourceSearch.toLowerCase())).map(s => (
              <div key={s.id} className="crud-item">
                <span style={{fontSize: '0.9rem', wordBreak: 'break-all'}}>{s.url}</span>
                <button onClick={() => deleteSource(s.id)} className="btn-danger" style={{padding: '4px 8px', fontSize: '0.8rem'}}><Trash2 size={14}/></button>
              </div>
            ))}
          </div>
        </div>

        {/* Popular Sources Panel */}
        <div className="glass-panel">
          <h3 style={{marginTop: 0, display: 'flex', alignItems: 'center'}}><Rss size={18} style={{ marginRight: '8px', color: 'var(--primary)' }}/> Community Favorites</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>The most popular sources picked by other users across the platform.</p>
          
          <h4 style={{borderBottom: '1px solid var(--border)', paddingBottom: '8px'}}>Trending URLs</h4>
          <div style={{display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto', paddingRight: '10px'}}>
            {popularSources.length === 0 && <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>Not enough community data yet.</span>}
            
            {Object.entries(
              popularSources.reduce((acc, p) => {
                if (!acc[p.category]) acc[p.category] = [];
                acc[p.category].push(p);
                return acc;
              }, {})
            ).map(([cat, sources]) => (
              <div key={cat} style={{ marginBottom: '15px' }}>
                <div style={{ fontWeight: 'bold', textTransform: 'capitalize', color: 'var(--primary)', marginBottom: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                  {cat} Trending
                </div>
                {sources.map(p => (
                  <div key={p.url} className="crud-item" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px', border: 'none', padding: '4px 0', alignItems: 'center'}}>
                    <a href={p.url} target="_blank" rel="noreferrer" style={{fontSize: '0.85rem', wordBreak: 'break-all', color: 'var(--primary)', textDecoration: 'underline'}}>
                      {p.url}
                    </a>
                    <span style={{fontSize: '0.75rem', background: '#e0e7ff', color: '#4f46e5', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', marginLeft: '10px'}}>
                      {p.popularity} {p.popularity === 1 ? 'User' : 'Users'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

      </div>

      <div style={{ marginTop: '40px', padding: '30px', background: 'white', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <h3 style={{marginTop: 0}}>Ready to trigger the AI Engine?</h3>
        <p style={{color: 'var(--text-muted)', marginBottom: '24px'}}>This will scrape all active sources, filter by your topics, and email you a customized newsletter.</p>
        <button onClick={triggerAI} className="btn-primary" disabled={loading} style={{ padding: '16px 40px', fontSize: '1.2rem', margin: '0 auto' }}>
          {loading ? <Loader2 className="spinner" /> : <Play />}
          {loading ? 'Synthesizing News...' : 'Generate AI Newsletter'}
        </button>
      </div>
    </div>
  );
}
