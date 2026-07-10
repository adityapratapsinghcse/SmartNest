import { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, Crown, User as UserIcon, Check, X, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Household() {
  const { householdId, householdName } = useAuth();
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [myRole, setMyRole] = useState(null);
  
  // Live autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!householdId) return;
    try {
      const res = await client.get('/api/auth/household-members/', {
        params: { household_id: householdId },
      });
      // Filter members vs pending link requests
      setMembers(res.data.filter(m => m.is_active || m.role === 'owner'));
      setRequests(res.data.filter(m => !m.is_active && m.role !== 'owner'));
      
      const me = res.data.find((m) => m.username === localStorage.getItem('smartnest_username'));
      setMyRole(me?.role ?? null);
    } catch {
      setMsg({ type: 'error', text: 'CRITICAL: Failed to query household infrastructure.' });
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Autocomplete Effect
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        try {
          const res = await client.get(`/api/auth/search-users/?q=${searchQuery}`);
          setSearchResults(res.data);
          setShowDropdown(true);
        } catch (err) {
          console.error("Autocomplete search error", err);
        }
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 300); // 300ms debounce buffer

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectUser = (username) => {
    setSearchQuery(username);
    setShowDropdown(false);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      await client.post('/api/auth/invite/', {
        household_id: householdId,
        username: searchQuery.trim(),
      });
      setMsg({ type: 'ok', text: `TRANSACTION_SUCCESS: Access granted to ${searchQuery}.` });
      setSearchQuery('');
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || 'Action rejected.' });
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (membershipId, action) => {
    try {
      await client.post('/api/auth/handle-request/', { membership_id: membershipId, action });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const isOwner = myRole === 'owner';

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title" style={{ fontFamily: 'Manrope' }}>Household Access</h1>
          <p className="sn-page-subtitle" style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3' }}>
            PANEL: {householdName?.toUpperCase()} // MATRIX DOME ID: {householdId}
          </p>
        </div>
      </div>

      <div className="sn-grid sn-grid-4" style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        
        {/* Active Operators */}
        <div className="ui-panel" style={{ gridColumn: 'span 2', background: '#1B2028', border: '1px solid rgba(255,255,255,0.07)', padding: 20 }}>
          <div className="ui-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 12, marginBottom: 16 }}>
            <Users size={16} style={{ color: '#C6813F' }} />
            <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '0.85rem' }}>ACTIVE_OPERATORS</span>
          </div>

          {loading ? (
            <p style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3' }}>QUERYING...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {members.map((m) => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#232A33', borderRadius: 4 }}>
                  {m.role === 'owner' ? <Crown size={16} style={{ color: '#E0A868' }} /> : <UserIcon size={16} style={{ color: '#8C95A3' }} />}
                  <div>
                    <div style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3' }}>{m.username}</div>
                    <div style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.75rem' }}>ROLE: {m.role.toUpperCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Access Provisioning */}
        <div className="ui-panel" style={{ gridColumn: 'span 2', background: '#1B2028', border: '1px solid rgba(255,255,255,0.07)', padding: 20 }}>
          <div className="ui-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 12, marginBottom: 16 }}>
            <UserPlus size={16} style={{ color: '#C6813F' }} />
            <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '0.85rem' }}>PROVISION_ACCESS</span>
          </div>

          {isOwner ? (
            <form onSubmit={handleInvite} style={{ position: 'relative' }}>
              <label style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem', display: 'block', marginBottom: 6 }}>LOOKUP_OPERATOR_USERNAME</label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#12161B', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '2px 10px' }}>
                <Search size={14} style={{ color: '#8C95A3', marginRight: 8 }} />
                <input
                  className="sn-login-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type to search users..."
                  required
                  style={{ width: '100%', background: 'none', border: 0, padding: 8, color: '#EDEFF3', fontFamily: 'JetBrains Mono' }}
                />
              </div>

              {/* Autocomplete Dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#232A33', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, zIndex: 10, marginTop: 4 }}>
                  {searchResults.map(u => (
                    <div key={u.id} onClick={() => selectUser(u.username)} style={{ padding: '10px 14px', fontFamily: 'JetBrains Mono', color: '#EDEFF3', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {u.username}
                    </div>
                  ))}
                </div>
              )}

              <button className="sn-unlock-btn" style={{ width: '100%', marginTop: 12, background: '#C6813F', color: '#EDEFF3', border: 0, padding: 10, fontFamily: 'JetBrains Mono', cursor: 'pointer' }} disabled={busy}>
                {busy ? 'SYNCHRONIZING...' : 'AUTHORIZE_NODE'}
              </button>
            </form>
          ) : (
            <p style={{ fontFamily: 'Manrope', color: '#E8A33D', fontSize: '0.85rem' }}>Read-only peripheral terminal view.</p>
          )}

          {msg && <p style={{ marginTop: 12, fontFamily: 'JetBrains Mono', fontSize: '0.8rem', color: msg.type === 'ok' ? '#4CAF7D' : '#E15554' }}>{msg.text}</p>}
        </div>

        {/* Requests Authorization Breaker Box */}
        {isOwner && (
          <div className="ui-panel" style={{ gridColumn: 'span 4', background: '#1B2028', border: '1px solid rgba(255,255,255,0.07)', padding: 20, marginTop: 20 }}>
            <div className="ui-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 12, marginBottom: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: requests.length > 0 ? '#E15554' : '#4CAF7D', display: 'inline-block' }} />
              <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '0.85rem' }}>PENDING_BUS_LINK_REQUESTS</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {requests.map(r => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#232A33', padding: 12, borderRadius: 4 }}>
                  <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3' }}>{r.username} // REQ_LINK</span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleAction(r.id, 'approve')} style={{ background: '#4CAF7D', color: '#EDEFF3', border: 0, padding: 6, borderRadius: 4, cursor: 'pointer' }}><Check size={16} /></button>
                    <button onClick={() => handleAction(r.id, 'deny')} style={{ background: '#E15554', color: '#EDEFF3', border: 0, padding: 6, borderRadius: 4, cursor: 'pointer' }}><X size={16} /></button>
                  </div>
                </div>
              ))}
              {requests.length === 0 && <p style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.8rem', margin: 0 }}>NO_PENDING_REQUESTS_DETECTED</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}