import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Home, ShieldAlert, Cpu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Login() {
  const [mode, setMode] = useState('login'); 
  const [roleType, setRoleType] = useState('owner'); // 'owner' | 'member'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [targetHouseholdId, setTargetHouseholdId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'login') {
        await login(username, password);
        navigate('/');
      } else {
        await client.post('/api/auth/register-split/', {
          username: username.trim(),
          email: email.trim(),
          password: password,
          role_type: roleType,
          household_name: roleType === 'owner' ? householdName.trim() : '',
          target_household_id: roleType === 'member' ? targetHouseholdId : null
        });
        
        if (roleType === 'owner') {
          await login(username, password);
          navigate('/');
        } else {
          setError('SUCCESS: Link request transmitted to Owner panel. Awaiting activation.');
          setMode('login');
        }
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const data = err.response.data;
        if (data.error) setError(data.error);
        else if (typeof data === 'object') {
          const firstField = Object.keys(data)[0];
          setError(`${firstField.toUpperCase()}: ${data[firstField][0]}`);
        }
      } else {
        setError('Network connectivity failure.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sn-login-wrap" style={{ background: '#12161B', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="ui-panel ui-panel-accent sn-login-card" style={{ background: '#1B2028', border: '1px solid rgba(255,255,255,0.07)', padding: 32, width: 400 }}>
        <div className="sn-login-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div className="sn-brand-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: '#C6813F' }} />
          <span className="sn-brand" style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '1.2rem', letterSpacing: '0.1em' }}>THE_NEXUS_DOME</span>
        </div>
        
        <p style={{ fontFamily: 'Manrope', color: '#8C95A3', marginBottom: 24, fontSize: '0.9rem' }}>
          {mode === 'login' ? 'Sign in to structural instrumentation matrix' : 'Provision fresh system instance'}
        </p>

        <form onSubmit={handleSubmit} className="sn-login-form">
          {mode === 'register' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => setRoleType('owner')} style={{ flex: 1, padding: 8, fontFamily: 'JetBrains Mono', fontSize: '0.75rem', background: roleType === 'owner' ? '#C6813F' : '#232A33', border: 0, color: '#EDEFF3', cursor: 'pointer' }}>
                ROOT_OWNER
              </button>
              <button type="button" onClick={() => setRoleType('member')} style={{ flex: 1, padding: 8, fontFamily: 'JetBrains Mono', fontSize: '0.75rem', background: roleType === 'member' ? '#C6813F' : '#232A33', border: 0, color: '#EDEFF3', cursor: 'pointer' }}>
                LINK_MEMBER
              </button>
            </div>
          )}

          <label className="sn-login-label" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
            <User size={12} /> OPERATOR_ID
          </label>
          <input className="sn-login-input" value={username} onChange={(e) => setUsername(e.target.value)} required style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: 10, color: '#EDEFF3', fontFamily: 'JetBrains Mono', marginBottom: 12 }} />

          {mode === 'register' && (
            <>
              <label className="sn-login-label" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>EMAIL_ADDRESS</label>
              <input className="sn-login-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: 10, color: '#EDEFF3', fontFamily: 'JetBrains Mono', marginBottom: 12 }} />
              
              {roleType === 'owner' ? (
                <>
                  <label className="sn-login-label" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}><Home size={12} /> DOME_ENVIRONMENT_NAME</label>
                  <input className="sn-login-input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. Shanti Nivas" required style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: 10, color: '#EDEFF3', fontFamily: 'JetBrains Mono', marginBottom: 12 }} />
                </>
              ) : (
                <>
                  <label className="sn-login-label" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}><Cpu size={12} /> DOME_SYSTEM_ID</label>
                  <input className="sn-login-input" value={targetHouseholdId} onChange={(e) => setTargetHouseholdId(e.target.value)} placeholder="e.g. 1" required style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: 10, color: '#EDEFF3', fontFamily: 'JetBrains Mono', marginBottom: 12 }} />
                </>
              )}
            </>
          )}

          <label className="sn-login-label" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 4 }}>
            <Lock size={12} /> SECURE_KEY
          </label>
          <input className="sn-login-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: 10, color: '#EDEFF3', fontFamily: 'JetBrains Mono', marginBottom: 16 }} />

          {error && <p style={{ color: error.startsWith('SUCCESS') ? '#4CAF7D' : '#E15554', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', marginBottom: 12 }}>{error}</p>}

          <button className="sn-unlock-btn" style={{ width: '100%', background: '#C6813F', border: 0, padding: 12, color: '#EDEFF3', fontFamily: 'JetBrains Mono', cursor: 'pointer' }} disabled={busy}>
            {busy ? 'SYNCHRONIZING...' : mode === 'login' ? 'INITIALIZE_SESSION' : 'PROVISION_PROFILE'}
          </button>
        </form>

        <button className="sn-login-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')} style={{ background: 'none', border: 0, color: '#8C95A3', width: '100%', marginTop: 16, fontFamily: 'Manrope', cursor: 'pointer', fontSize: '0.85rem' }}>
          {mode === 'login' ? "Deploy new ecosystem architecture? Register" : 'Existing key verified? Sign in'}
        </button>
      </div>
    </div>
  );
}