import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabase';
import Login from './pages/Login';
import GlobalNews from './pages/GlobalNews';
import Preferences from './pages/Preferences';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncProfile = async (session) => {
      if (session) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/profiles/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
          body: JSON.stringify({ email: session.user.email })
        });
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      syncProfile(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      syncProfile(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  return (
    <BrowserRouter>
      {session && <Navbar />}
      <Routes>
        <Route 
          path="/login" 
          element={!session ? <Login /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={session ? <GlobalNews /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/preferences" 
          element={session ? <Preferences /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={session && session.user.email === import.meta.env.VITE_ADMIN_EMAIL ? <AdminDashboard /> : <Navigate to="/" />} 
        />
        <Route 
          path="/profile" 
          element={session ? <Profile /> : <Navigate to="/login" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
