import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Home, ShieldAlert, Cpu, Radio, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Login() {
  const [mode, setMode] = useState('login'); 
  const [roleType, setRoleType] = useState('owner'); // 'owner' | 'member'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [targetOwnerUsername, setTargetOwnerUsername] = useState('');
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
          target_owner_username: roleType === 'member' ? targetOwnerUsername.trim() : ''
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
    <div className="sn-login-wrap" style={{ 
      background: '#12161B', 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '20px'
    }}>
      {/* Embedded Instrument Styling Code Block */}
      <style>{`
        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes panelPulse {
          0% { box-shadow: 0 0 20px rgba(198,129,63,0.05); }
          50% { box-shadow: 0 0 30px rgba(198,129,63,0.15); }
          100% { box-shadow: 0 0 20px rgba(198,129,63,0.05); }
        }
        .animate-scan {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(rgba(198,129,63,0) 0%, rgba(198,129,63,0.03) 10%, rgba(198,129,63,0) 20%);
          animation: scanline 8s linear infinite;
          pointer-events: none;
        }
        .breaker-switch {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .breaker-switch:active {
          transform: scale(0.95);
        }
        .input-glow:focus {
          outline: none;
          border-color: #C6813F !important;
          box-shadow: 0 0 8px rgba(198,129,63,0.2);
        }
      `}</style>

      <div className="animate-scan" />

      {/* Main Enclosure Card */}
      <div className="ui-panel" style={{ 
        background: '#1B2028', 
        border: '1px solid rgba(255,255,255,0.07)', 
        padding: '32px', 
        width: '100%',
        maxWidth: '420px',
        borderRadius: '8px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        animation: 'panelPulse 4s ease-in-out infinite',
        position: 'relative',
        zIndex: 2
      }}>
        {/* Top Operational Header */}
        <div style={{ display: 'flex', justifyContent: 'between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Radio size={16} style={{ color: '#C6813F' }} />
              <span style={{ position: 'absolute', top: -2, right: -2, width: 6, height: 6, borderRadius: '50%', background: '#4CAF7D' }} />
            </div>
            <div>
              <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '1.1rem', letterSpacing: '0.08em', fontWeight: 'bold', display: 'block' }}>THE NEXUS DOME</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.65rem', letterSpacing: '0.05em' }}>SYS_STATUS: ONLINE // CORE_v1.2</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Mode Switch Panel */}
          {mode === 'register' && (
            <div style={{ background: '#12161B', padding: '4px', borderRadius: '4px', display: 'flex', gap: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <button 
                type="button" 
                onClick={() => setRoleType('owner')} 
                className="breaker-switch"
                style={{ 
                  flex: 1, padding: '8px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', letterSpacing: '0.05em',
                  background: roleType === 'owner' ? '#C6813F' : 'transparent', 
                  border: 0, color: '#EDEFF3', cursor: 'pointer', borderRadius: '3px', fontWeight: 600
                }}
              >
                CONFIG_ROOT_OWNER
              </button>
              <button 
                type="button" 
                onClick={() => setRoleType('member')} 
                className="breaker-switch"
                style={{ 
                  flex: 1, padding: '8px', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', letterSpacing: '0.05em',
                  background: roleType === 'member' ? '#C6813F' : 'transparent', 
                  border: 0, color: '#EDEFF3', cursor: 'pointer', borderRadius: '3px', fontWeight: 600
                }}
              >
                REQUEST_NODE_LINK
              </button>
            </div>
          )}

          {/* Form Inputs Container */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <User size={12} style={{ color: '#C6813F' }} /> OPERATOR_ID
              </label>
              <input 
                className="input-glow" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                required 
                style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', color: '#EDEFF3', fontFamily: 'JetBrains Mono', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} 
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.7rem', display: 'block', marginBottom: '6px' }}>EMAIL_IDENTITY</label>
                  <input 
                    type="email" 
                    className="input-glow" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', color: '#EDEFF3', fontFamily: 'JetBrains Mono', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} 
                  />
                </div>
                
                {roleType === 'owner' ? (
                  <div>
                    <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Home size={12} style={{ color: '#C6813F' }} /> CUSTOM_DOME_ALIAS
                    </label>
                    <input 
                      className="input-glow" 
                      value={householdName} 
                      onChange={(e) => setHouseholdName(e.target.value)} 
                      placeholder="e.g. Shanti Nivas" 
                      required 
                      style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', color: '#EDEFF3', fontFamily: 'JetBrains Mono', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} 
                    />
                  </div>
                ) : (
                  <div>
                    <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <ShieldCheck size={12} style={{ color: '#C6813F' }} /> TARGET_OWNER_ID
                    </label>
                    <input 
                      className="input-glow" 
                      value={targetOwnerUsername} 
                      onChange={(e) => setTargetOwnerUsername(e.target.value)} 
                      placeholder="Enter system owner's username" 
                      required 
                      style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', color: '#EDEFF3', fontFamily: 'JetBrains Mono', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} 
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <Lock size={12} style={{ color: '#C6813F' }} /> SECURE_ACCESS_KEY
              </label>
              <input 
                type="password" 
                className="input-glow" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', color: '#EDEFF3', fontFamily: 'JetBrains Mono', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} 
              />
            </div>
          </div>

          {error && (
            <div style={{ 
              background: 'rgba(225,85,84,0.05)', border: '1px solid rgba(225,85,84,0.2)', 
              padding: '10px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '8px' 
            }}>
              <ShieldAlert size={14} style={{ color: error.startsWith('SUCCESS') ? '#4CAF7D' : '#E15554', flexShrink: 0 }} />
              <p style={{ color: error.startsWith('SUCCESS') ? '#4CAF7D' : '#E15554', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', margin: 0, lineHeight: '1.2' }}>{error}</p>
            </div>
          )}

          <button 
            className="breaker-switch"
            style={{ 
              width: '100%', background: '#C6813F', border: 0, padding: '14px', 
              color: '#EDEFF3', fontFamily: 'JetBrains Mono', cursor: 'pointer', 
              borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '0.05em',
              boxShadow: '0 4px 12px rgba(198,129,63,0.2)', marginTop: '8px'
            }} 
            disabled={busy}
          >
            {busy ? 'SYNCHRONIZING_BUS...' : mode === 'login' ? 'INITIALIZE_SESSION' : 'COMMIT_SYSTEM_PROVISION'}
          </button>
        </form>

        <button 
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }} 
          style={{ 
            background: 'none', border: 0, color: '#8C95A3', width: '100%', 
            marginTop: '20px', fontFamily: 'Manrope', cursor: 'pointer', 
            fontSize: '0.8rem', textAlign: 'center', transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.color = '#E0A868'}
          onMouseLeave={(e) => e.target.style.color = '#8C95A3'}
        >
          {mode === 'login' ? "Deploy new ecosystem architecture? Register" : 'Existing hardware profile key verified? Sign in'}
        </button>
      </div>
    </div>
  );
}