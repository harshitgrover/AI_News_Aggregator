import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Radio, Settings, LogOut, ShieldAlert, User } from 'lucide-react';
import { supabase } from '../supabase';

export default function Navbar() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [avatarLetter, setAvatarLetter] = useState('?');
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        if (user.email === import.meta.env.VITE_ADMIN_EMAIL) setIsAdmin(true);
        setAvatarLetter(user.email?.[0]?.toUpperCase() || '?');
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
        <Link
          to="/profile"
          title="My Profile"
          style={{
            display: 'flex', alignItems: 'center', gap: '7px', textDecoration: 'none',
            padding: '6px 14px', borderRadius: '20px',
            background: location.pathname === '/profile' ? 'var(--primary)' : 'rgba(79,70,229,0.1)',
            color: location.pathname === '/profile' ? 'white' : '#4f46e5',
            fontWeight: '600', fontSize: '0.9rem', transition: 'all 0.2s',
            border: '1px solid rgba(79,70,229,0.2)',
          }}
        >
          <div style={{
            width: '22px', height: '22px', borderRadius: '50%',
            background: location.pathname === '/profile' ? 'rgba(255,255,255,0.25)' : 'linear-gradient(135deg,#4f46e5,#3b82f6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 'bold', color: 'white', flexShrink: 0
          }}>
            {avatarLetter}
          </div>
          Profile
        </Link>
        <button onClick={() => supabase.auth.signOut()} className="btn-danger" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </nav>
  );
}
