import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { ShieldAlert, Trash2, Plus, BarChart2 } from 'lucide-react';

export default function AdminDashboard() {
  const [sources, setSources] = useState([]);
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState('tech');
  const [stats, setStats] = useState({ totalUpvotes: 0, totalArticles: 0 });
  const [topicStats, setTopicStats] = useState([]);
  const [sourceSearch, setSourceSearch] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSources();
    fetchStats();
    fetchTopicStats();
  }, []);

  const fetchSources = async () => {
    const { data } = await supabase.from('sources').select('*').order('id', { ascending: false });
    if (data) setSources(data);
  };

  const fetchStats = async () => {
    const { data } = await supabase.from('articles').select('upvotes');
    if (data) {
      setStats({
        totalArticles: data.length,
        totalUpvotes: data.reduce((sum, a) => sum + (a.upvotes || 0), 0)
      });
    }
  };

  const fetchTopicStats = async () => {
    const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/topics/performance`);
    if (res.ok) setTopicStats(await res.json());
  };

  const addSource = async (e) => {
    e.preventDefault();
    if (!newUrl) return;
    
    if (sources.some(s => s.url.toLowerCase() === newUrl.toLowerCase())) {
      alert("This source is already active globally.");
      return;
    }
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Send the new source directly to the Python Backend so it can save and instantly auto-scrape!
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/sources`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({ url: newUrl, category: newCategory })
      });
      
      if (res.ok) {
        const json = await res.json();
        setSources([json.source, ...sources]);
        setNewUrl('');
      } else {
        alert("Failed to add source. Ensure FastAPI is running.");
      }
    } catch(err) {
      alert("Network Error");
    }
    setLoading(false);
  };

  const deleteSource = async (id) => {
    await supabase.from('sources').delete().eq('id', id);
    setSources(sources.filter(s => s.id !== id));
  };

  const forceScrape = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/admin/scrape`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (res.ok) alert("Success! All Global Sources have been scraped and the Global Feed is updated.");
      else alert("Error triggering scraper.");
    } catch (e) {
      alert("Network Error.");
    }
    setLoading(false);
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '30px', borderBottom: '2px solid var(--primary)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert color="var(--primary)" /> Master Admin Dashboard
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>Manage the global news platform and view community statistics.</p>
        </div>
        <button onClick={forceScrape} className="btn-primary" disabled={loading}>
          {loading ? 'Scraping Web...' : 'Force Sync Global Feed'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <BarChart2 size={32} color="var(--primary)" style={{ marginBottom: '10px' }} />
            <h3 style={{ margin: 0 }}>Platform Stats</h3>
            <p style={{ fontSize: '1.2rem', margin: '5px 0' }}>Total Articles: <strong>{stats.totalArticles}</strong></p>
            <p style={{ fontSize: '1.2rem', margin: '5px 0' }}>Total Upvotes: <strong>{stats.totalUpvotes}</strong></p>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px', flex: 1 }}>
            <h4 style={{ margin: '0 0 15px 0' }}>Articles by Topic</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {topicStats.map(stat => {
                const maxCount = Math.max(...topicStats.map(s => s.count), 1);
                const percentage = (stat.count / maxCount) * 100;
                return (
                  <div key={stat.topic} style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '80px', fontWeight: 'bold', textTransform: 'capitalize', color: '#475569', fontSize: '0.85rem' }}>{stat.topic}</div>
                    <div style={{ flex: 1, background: '#e2e8f0', borderRadius: '8px', height: '18px', overflow: 'hidden' }}>
                      <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary) 0%, #3b82f6 100%)', transition: 'width 1s ease-in-out' }}></div>
                    </div>
                    <div style={{ width: '30px', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', fontSize: '0.9rem' }}>{stat.count}</div>
                  </div>
                )
              })}
              {topicStats.length === 0 && <p style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>No stats available yet.</p>}
            </div>
          </div>
        </div>
        
        <div className="glass-panel">
          <h3 style={{marginTop: 0}}>Add Global Source</h3>
          <form onSubmit={addSource} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="url" 
              className="input-field" 
              placeholder="https://techcrunch.com" 
              value={newUrl} 
              onChange={(e) => setNewUrl(e.target.value)} 
              required 
            />
            <select className="input-field" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
              <option value="tech">Tech News</option>
              <option value="ai">AI & Machine Learning</option>
              <option value="politics">Politics</option>
              <option value="geopolitics">Geopolitics</option>
              <option value="gaming">Gaming</option>
            </select>
            <button type="submit" className="btn-primary" style={{display: 'flex', justifyContent: 'center', gap: '8px'}}><Plus size={18}/> Add to Global Feed</button>
          </form>
        </div>
      </div>

      <div className="glass-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{marginTop: 0, marginBottom: 0}}>Active Global Sources</h3>
          <input type="text" placeholder="Search URLs..." value={sourceSearch} onChange={(e) => setSourceSearch(e.target.value)} className="input-field" style={{ width: '250px', padding: '6px 12px' }} />
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 1 }}>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '12px 15px' }}>URL</th>
                <th style={{ padding: '12px 15px', width: '150px' }}>Category</th>
                <th style={{ padding: '12px 15px', width: '80px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sources.length === 0 && <tr><td colSpan="3" style={{padding: '20px', textAlign: 'center', color: 'var(--text-muted)'}}>No sources found.</td></tr>}
              {sources.filter(s => s.url.toLowerCase().includes(sourceSearch.toLowerCase())).map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', background: 'white' }}>
                  <td style={{ padding: '12px 15px', wordBreak: 'break-all', fontSize: '0.9rem', color: '#475569' }}>{s.url}</td>
                  <td style={{ padding: '12px 15px', textTransform: 'capitalize', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>{s.category}</td>
                  <td style={{ padding: '12px 15px', textAlign: 'center' }}>
                    <button onClick={() => deleteSource(s.id)} className="btn-danger" style={{padding: '6px 10px'}} title="Delete Global Source"><Trash2 size={16}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
