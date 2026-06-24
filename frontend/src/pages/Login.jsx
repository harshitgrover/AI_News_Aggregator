import { useState } from 'react';
import { supabase } from '../supabase';
import { Mail, Lock, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else alert('Success! Check your email for the confirmation link. If email confirmations are disabled, you can just log in now!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
      // App.jsx will automatically route us to /dashboard when the session changes!
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="glass-panel login-card">
        <div className="login-header">
          <h2>AI News Aggregator</h2>
          <p>{isSignUp ? 'Create a new account' : 'Welcome back, please log in'}</p>
        </div>
        
        {error && (
          <div className="error-box">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="login-form">
          <div className="input-group">
            <Mail className="input-icon" size={18} />
            <input 
              type="email" 
              className="input-field with-icon" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="input-group">
            <Lock className="input-icon" size={18} />
            <input 
              type="password" 
              className="input-field with-icon" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>

          <button type="submit" className="btn-primary full-width" disabled={loading}>
            {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Log In')}
          </button>
        </form>

        <p className="toggle-auth">
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <span onClick={() => setIsSignUp(!isSignUp)} className="toggle-link">
            {isSignUp ? 'Log In' : 'Sign Up'}
          </span>
        </p>
      </div>
    </div>
  );
}
