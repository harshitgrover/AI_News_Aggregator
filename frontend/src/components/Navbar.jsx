import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, Settings, LogOut, ShieldAlert } from 'lucide-react';
import { supabase } from '../supabase';

export default function Navbar() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user && user.email === import.meta.env.VITE_ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    });
  }, []);
  
  return (
    <nav className="navbar">
      <h2 style={{ margin: 0, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Radio /> AI News Community
      </h2>
      <div className="nav-links">
        <Link to="/" className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}>Global Feed</Link>
        <Link to="/preferences" className={`nav-link ${location.pathname === '/preferences' ? 'active' : ''}`}>
          <Settings size={18} style={{verticalAlign: 'middle', marginRight: '4px'}}/> Preferences
        </Link>
        {isAdmin && (
          <Link to="/admin" className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`} style={{color: 'var(--primary)', fontWeight: 'bold'}}>
            <ShieldAlert size={18} style={{verticalAlign: 'middle', marginRight: '4px'}}/> Admin
          </Link>
        )}
        <button onClick={() => supabase.auth.signOut()} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
