import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Rss, Hash, Play, LogOut, Radio, Loader2, Mail, Eye } from 'lucide-react';

export default function Dashboard() {
  const [topics, setTopics] = useState([]);
  const [sources, setSources] = useState([]);
  const [topicStats, setTopicStats] = useState([]);
  const [newTopic, setNewTopic] = useState('');
  const [newSource, setNewSource] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [newsletterHtml, setNewsletterHtml] = useState('');
  const [loadingStep, setLoadingStep] = useState('');

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
    
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/topics/performance`);
    if (res.ok) setTopicStats(await res.json());
  };

  const addTopic = async (e) => {
    e.preventDefault();
    if (!newTopic) return;
    const { data, error } = await supabase.from('topics').insert([
      { user_id: user.id, keyword: newTopic }
    ]).select();
    
    if (!error && data) setTopics([...topics, data[0]]);
    setNewTopic('');
  };

  const addSource = async (e) => {
    e.preventDefault();
    if (!newSource) return;
    const { data, error } = await supabase.from('user_sources').insert([
      { user_id: user.id, url: newSource, name: 'Custom Source', source_type: 'rss' }
    ]).select();
    
    if (!error && data) setSources([...sources, data[0]]);
    setNewSource('');
  };

  const triggerAI = async () => {
    setLoading(true);
    setNewsletterHtml('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not logged in");

      // Step 1: Show what we're doing
      setLoadingStep('🔍 Scraping your news sources...');
      await new Promise(r => setTimeout(r, 1000));
      setLoadingStep('🧠 Ranking articles by your topics with AI...');
      await new Promise(r => setTimeout(r, 1000));
      setLoadingStep('✍️ Writing your personalized newsletter...');

      // Call the preview endpoint — runs the full pipeline and returns HTML
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/newsletter/preview`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setNewsletterHtml(data.html);
        setLoadingStep('');

        // Also trigger the background email send
        fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/generate`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
      } else {
        const err = await res.json();
        alert("Error: " + JSON.stringify(err));
      }
    } catch (e) {
      console.error(e);
      alert("Network Error. Is the FastAPI server running?");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Radio /> AI News Control Center
        </h1>
        <button onClick={() => supabase.auth.signOut()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--text-muted)' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* Topics Panel */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3><Hash size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }}/> My Topics</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>What subjects should the AI prioritize for you?</p>
          
          <form onSubmit={addTopic} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="e.g. Artificial Intelligence" 
              value={newTopic} 
              onChange={(e) => setNewTopic(e.target.value)} 
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {topics.map(t => (
              <li key={t.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.5)', marginBottom: '8px', borderRadius: '6px' }}>
                {t.keyword}
              </li>
            ))}
          </ul>
        </div>

        {/* Sources Panel */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <h3><Rss size={20} style={{ verticalAlign: 'middle', marginRight: '8px', color: 'var(--primary)' }}/> Custom RSS Sources</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Add direct links to blogs or subreddits you want scraped.</p>
          
          <form onSubmit={addSource} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://reddit.com/r/MachineLearning.rss" 
              value={newSource} 
              onChange={(e) => setNewSource(e.target.value)} 
            />
            <button type="submit" className="btn-primary">Add</button>
          </form>

          <ul style={{ listStyle: 'none', padding: 0 }}>
            {sources.map(s => (
              <li key={s.id} style={{ padding: '10px', background: 'rgba(255,255,255,0.5)', marginBottom: '8px', borderRadius: '6px' }}>
                {s.url}
              </li>
            ))}
          </ul>
        </div>

      </div>

      {/* Generate Button */}
      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <button 
          onClick={triggerAI} 
          className="btn-primary" 
          disabled={loading}
          style={{ padding: '15px 40px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto', background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', opacity: loading ? 0.8 : 1 }}
        >
          {loading ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Play />}
          {loading ? 'Generating Newsletter...' : 'Generate My Newsletter Now'}
        </button>

        {/* Loading Steps */}
        {loading && loadingStep && (
          <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.95rem', animation: 'fadeIn 0.4s ease' }}>
            {loadingStep}
          </p>
        )}
      </div>

      {/* Newsletter Preview */}
      {newsletterHtml && (
        <div style={{ marginTop: '50px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', borderBottom: '2px solid var(--border)', paddingBottom: '12px' }}>
            <Eye size={22} color="var(--primary)" />
            <h2 style={{ margin: 0, color: 'var(--primary)' }}>Your Newsletter Preview</h2>
            <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(37,99,235,0.1)', padding: '4px 10px', borderRadius: '20px' }}>
              <Mail size={12} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
              Also sent to your email
            </span>
          </div>
          <div
            className="glass-panel"
            style={{ padding: '30px', background: 'white', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}
            dangerouslySetInnerHTML={{ __html: newsletterHtml }}
          />
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
