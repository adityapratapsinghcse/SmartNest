import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';

export default function Login() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, email, password, householdName);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Check your details and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sn-login-wrap">
      <div className="ui-panel ui-panel-accent sn-login-card">
        <div className="sn-login-brand">
          <div className="sn-brand-dot" />
          <span className="sn-brand">SMARTNEST</span>
        </div>
        <p className="sn-page-subtitle" style={{ marginBottom: 24 }}>
          {mode === 'login' ? 'Sign in to your control panel' : 'Create your household'}
        </p>

        <form onSubmit={handleSubmit} className="sn-login-form">
          <label className="sn-login-label">
            <User size={15} /> Username
          </label>
          <input className="sn-login-input" value={username} onChange={(e) => setUsername(e.target.value)} required />

          {mode === 'register' && (
            <>
              <label className="sn-login-label">Email</label>
              <input className="sn-login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <label className="sn-login-label"><Home size={15} /> Household Name</label>
              <input className="sn-login-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. My Home" required />
            </>
          )}

          <label className="sn-login-label">
            <Lock size={15} /> Password
          </label>
          <input className="sn-login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          {error && <p className="sn-login-error">{error}</p>}

          <button className="sn-unlock-btn" style={{ width: '100%', marginTop: 8 }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <button className="sn-login-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}