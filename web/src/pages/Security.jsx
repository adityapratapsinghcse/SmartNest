import { useState, useEffect, useRef } from 'react';
import { DoorOpen, DoorClosed, Radar, ScanLine, ShieldAlert, KeyRound, Fingerprint, Lock, Unlock, ShieldCheck, RefreshCw, Terminal, Eye } from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import StatusPill from '../components/ui/StatusPill';
import LiveDot from '../components/ui/LiveDot';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

export default function Security() {
  const { householdId } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [doorLocked, setDoorLocked] = useState(true);
  const [unlocking, setUnlocking] = useState(false);
  const [windowOpen, setWindowOpen] = useState(false);
  const [motion, setMotion] = useState(false);
  const [log, setLog] = useState([]);
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Interactive security features
  const [enteredPin, setEnteredPin] = useState('');
  const [pinMessage, setPinMessage] = useState('READY'); // 'READY' | 'SUCCESS' | 'DENIED'
  const [masterPin, setMasterPin] = useState('1234'); // Custom pin code setup
  const [pinChangeMode, setPinChangeMode] = useState(false);
  const [newMasterPin, setNewMasterPin] = useState('');

  // Scanning wireframe effect
  const [laserPosition, setLaserPosition] = useState(0);
  const animationRef = useRef(null);

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);
  const { lastMessage: alertMessage } = useWebSocket('/ws/alerts/', householdId);

  const fetchSecurityData = async () => {
    if (!householdId) return;
    try {
      const devicesRes = await client.get('/api/devices/');
      if (devicesRes.data.length === 0) { setLoading(false); return; }
      const primaryDevice = devicesRes.data[0];
      setDevice(primaryDevice);
      
      const logRes = await client.get(`/api/access/log/?device_id=${primaryDevice.id}`);
      setLog(logRes.data);
      const failedRecently = logRes.data.filter((l) => !l.granted).length;
      setWrongAttempts(Math.min(failedRecently, 3));
    } catch (err) {
      console.error('Failed to load security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, [householdId]);

  // Laser scanner animation loop
  useEffect(() => {
    let direction = 1;
    let currentPos = 0;
    const animateLaser = () => {
      currentPos += 0.8 * direction;
      if (currentPos >= 100 || currentPos <= 0) direction *= -1;
      setLaserPosition(currentPos);
      animationRef.current = requestAnimationFrame(animateLaser);
    };
    animationRef.current = requestAnimationFrame(animateLaser);
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.window_open !== undefined) setWindowOpen(lastMessage.window_open);
    if (lastMessage.motion !== undefined) setMotion(lastMessage.motion);
  }, [lastMessage]);

  useEffect(() => {
    if (!alertMessage) return;
    if (alertMessage.type === 'rfid_denied') {
      setWrongAttempts((n) => Math.min(n + 1, 3));
      setLog((prev) => [{
        id: alertMessage.id || Date.now(),
        rfid_uid: alertMessage.rfid_uid || 'UNKNOWN_CARD',
        granted: false,
        method: 'rfid',
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
    } else if (alertMessage.type === 'rfid_granted') {
      setWrongAttempts(0);
      setDoorLocked(false);
      setLog((prev) => [{
        id: alertMessage.id || Date.now(),
        rfid_uid: alertMessage.rfid_uid || 'AUTHORIZED_CARD',
        granted: true,
        method: 'rfid',
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
      setTimeout(() => setDoorLocked(true), 3000);
    }
  }, [alertMessage]);

  const sendCommand = async (action, payload = {}) => {
    if (!device) return;
    try {
      await client.post('/api/commands/send/', { device: device.id, action, payload });
    } catch (err) {
      console.error('Command failed to send:', err);
    }
  };

  const handleUnlock = () => {
    if (unlocking) return;
    setUnlocking(true);
    sendCommand('unlock_door');
    setDoorLocked(false);
    setTimeout(() => {
      setDoorLocked(true);
      setUnlocking(false);
    }, 3000);
  };

  const handleKeypadPress = (val) => {
    if (wrongAttempts >= 3) return; // Locked out
    if (enteredPin.length >= 4) return;
    setEnteredPin(prev => prev + val);
  };

  const clearEnteredPin = () => {
    setEnteredPin('');
    setPinMessage('READY');
  };

  const submitPin = () => {
    if (enteredPin === masterPin) {
      setPinMessage('GRANTED');
      handleUnlock();
      setWrongAttempts(0);
      setTimeout(() => {
        clearEnteredPin();
      }, 3000);
    } else {
      setPinMessage('DENIED');
      setWrongAttempts(prev => Math.min(prev + 1, 3));
      setTimeout(() => {
        setEnteredPin('');
        setPinMessage('READY');
      }, 1500);
    }
  };

  const changeMasterPin = (e) => {
    e.preventDefault();
    if (newMasterPin.length === 4 && /^\d+$/.test(newMasterPin)) {
      setMasterPin(newMasterPin);
      setNewMasterPin('');
      setPinChangeMode(false);
      alert(`PIN code successfully updated to: ${newMasterPin}`);
    } else {
      alert('Error: PIN must be exactly 4 digits.');
    }
  };

  if (loading) return <div className="sn-page-loading">Syncing security nodes...</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Security</h1>
        <p className="sn-page-subtitle">No operational nodes discovered. Connect your ESP32 gateway module to load perimeter watch.</p>
      </div>
    );
  }

  const isLockedOut = wrongAttempts >= 3;

  return (
    <div className="sn-page security-page">
      <style>{`
        .security-page {
          padding: 20px;
        }

        .glass-panel {
          background: rgba(27, 32, 40, 0.7); 
          backdrop-filter: blur(25px); 
          -webkit-backdrop-filter: blur(25px);
          border: 1px solid rgba(255, 255, 255, 0.06); 
          border-radius: 16px; 
          padding: 24px;
          box-shadow: 0 16px 36px rgba(0,0,0,0.35); 
          display: flex; 
          flex-direction: column;
        }

        .stat-grid-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .stat-grid-row {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .telemetry-stat-card {
          background: rgba(18, 22, 27, 0.55);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px;
          padding: 16px;
        }
        .stat-row-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 10px;
        }
        .stat-value {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .security-main-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 20px;
        }
        @media (max-width: 900px) {
          .security-main-layout {
            grid-template-columns: 1fr;
          }
        }

        /* 3D Gate Lock Visual */
        .interactive-lock-widget {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px 0;
          gap: 20px;
        }
        .gate-status-ring {
          width: 130px;
          height: 130px;
          border-radius: 50%;
          background: var(--bg-deep);
          border: 3px solid var(--accent-copper);
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: inset 0 4px 15px rgba(0,0,0,0.6), 0 0 20px rgba(198,129,63,0.15);
          transition: border-color 0.4s;
        }
        .gate-status-ring.unlocked {
          border-color: var(--status-safe);
          box-shadow: inset 0 4px 15px rgba(0,0,0,0.6), 0 0 25px rgba(76,175,125,0.25);
        }
        .lock-icon-svg {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .gate-status-ring.unlocked .lock-icon-svg {
          transform: rotateY(180deg);
          color: var(--status-safe);
        }

        .btn-gate-override {
          background: var(--bg-deep);
          border: 1px solid rgba(255,255,255,0.06);
          color: var(--text-primary);
          padding: 10px 24px;
          border-radius: 8px;
          font-family: var(--font-mono);
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-gate-override:hover:not(:disabled) {
          border-color: var(--accent-copper-bright);
        }
        .btn-gate-override.unlocked {
          background: var(--status-safe);
          color: var(--bg-deep);
          border-color: var(--status-safe);
          box-shadow: 0 0 12px rgba(76, 175, 125, 0.35);
        }

        /* Thermal Camera Scan Simulation Box */
        .camera-panel-box {
          background: #080d12;
          border: 1px solid rgba(198,129,63,0.15);
          border-radius: 12px;
          padding: 16px;
          height: 100%;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
        }
        .camera-viewfinder {
          flex: 1;
          background: #030507;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 6px;
          height: 140px;
          position: relative;
          overflow: hidden;
        }
        .camera-radar-grid {
          position: absolute;
          inset: 0;
          background-size: 15px 15px;
          background-image: 
            linear-gradient(to right, rgba(255,255,255,0.01) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.01) 1px, transparent 1px);
        }
        .camera-laser-bar {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: rgba(225, 85, 84, 0.8);
          box-shadow: 0 0 8px rgba(225, 85, 84, 0.8);
          transition: top 0.05s linear;
        }
        .radar-sweep-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border: 1px dashed rgba(198,129,63,0.15);
          border-radius: 50%;
        }
        .camera-timestamp-stamp {
          position: absolute;
          top: 8px;
          left: 8px;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: rgba(255, 255, 255, 0.45);
        }
        .camera-status-overlay {
          position: absolute;
          bottom: 8px;
          right: 8px;
          font-family: var(--font-mono);
          font-size: 0.65rem;
          color: var(--status-safe);
          font-weight: 700;
        }

        /* Access challenge lockout screen overlay */
        .lockout-danger-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(225, 85, 84, 0.1);
          border: 1px solid var(--status-critical);
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          color: var(--status-critical);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          font-weight: 600;
          animation: sn-pulse 2s infinite;
        }

        /* Access Log layout */
        .log-scroller-box {
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 480px;
          overflow-y: auto;
        }
        .log-item-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: var(--bg-deep);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 8px;
          padding: 10px 14px;
        }
        .log-left-meta {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .log-indicator-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6px;
          border-radius: 50%;
        }
        .log-indicator-badge.ok {
          background: rgba(76, 175, 125, 0.1);
          color: var(--status-safe);
        }
        .log-indicator-badge.fail {
          background: rgba(225, 85, 84, 0.1);
          color: var(--status-critical);
        }
        .log-meta-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .log-user-tag {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--text-primary);
        }
        .log-time-tag {
          font-size: 0.7rem;
          color: var(--text-secondary);
        }

        /* Pin Change Calibration Box */
        .pin-settings-block {
          background: var(--bg-deep);
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 8px;
          padding: 12px;
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .input-pin-custom {
          background: var(--bg-panel-raised);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 4px;
          padding: 6px 10px;
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          outline: none;
        }
        .input-pin-custom:focus {
          border-color: var(--accent-copper);
        }
        .btn-pin-confirm {
          background: var(--accent-copper);
          color: var(--bg-deep);
          border: none;
          padding: 6px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          font-weight: 700;
          border-radius: 4px;
          cursor: pointer;
        }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div className="sn-page-header">
            <h1 className="sn-page-title">Access Control Terminal</h1>
            <div className="sn-live-indicator">
              <LiveDot color={isLockedOut ? 'var(--status-critical)' : 'var(--status-safe)'} />
              <span className="label-eyebrow" style={{ color: isLockedOut ? 'var(--status-critical)' : 'var(--status-safe)' }}>
                {isLockedOut ? 'PERIMETER ARMED / LOCKOUT ACTIVE' : 'SECURE MONITOR ACTIVE'}
              </span>
            </div>
          </div>
          <p className="sn-page-subtitle readout">{device.name} // SECURE_RFID_GATEWAY_RESOLVED</p>
        </div>
        <button className="sn-icon-btn" onClick={fetchSecurityData} title="Sync Security Log">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Arming Alarm banner */}
      {isLockedOut && (
        <div className="lockout-danger-banner">
          <ShieldAlert size={16} />
          <span>SECURITY THREAT: 3 successive failed keycode/RFID scans. Mechanical gate lockout active. Recalibrate key code inside dashboard to clear.</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="stat-grid-row">
        <div className="telemetry-stat-card">
          <span className="label-eyebrow">Front Gate</span>
          <div className="stat-row-inner">
            <span className="stat-value readout">{doorLocked ? 'Locked' : 'Unlocked'}</span>
            <StatusPill status={doorLocked ? 'safe' : 'warning'} text={doorLocked ? 'SECURE' : 'OPEN'} />
          </div>
        </div>

        <div className="telemetry-stat-card">
          <span className="label-eyebrow">Window / Reed</span>
          <div className="stat-row-inner">
            <span className="stat-value readout">{windowOpen ? 'Breached' : 'Closed'}</span>
            <StatusPill status={windowOpen ? 'warning' : 'safe'} text={windowOpen ? 'OPEN' : 'SECURE'} />
          </div>
        </div>

        <div className="telemetry-stat-card">
          <span className="label-eyebrow">Motion (PIR)</span>
          <div className="stat-row-inner">
            <span className="stat-value readout">{motion ? 'Active' : 'Stable'}</span>
            <StatusPill status={motion ? 'warning' : 'safe'} text={motion ? 'MOTION' : 'CLEAR'} />
          </div>
        </div>

        <div className="telemetry-stat-card">
          <span className="label-eyebrow">Alarm Bus Tally</span>
          <div className="stat-row-inner">
            <span className="stat-value readout">{wrongAttempts} / 3</span>
            <StatusPill status={wrongAttempts >= 3 ? 'critical' : wrongAttempts > 0 ? 'warning' : 'safe'} text={wrongAttempts >= 3 ? 'ALERT' : 'OK'} />
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="security-main-layout">
        
        {/* Left Hand: Controls & Mech PIN Pad */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <PanelCard title="Front Gate Override" icon={KeyRound} accent>
            <div className="interactive-lock-widget">
              <div className={`gate-status-ring ${doorLocked ? '' : 'unlocked'}`}>
                {doorLocked ? (
                  <Lock size={36} className="lock-icon-svg" />
                ) : (
                  <Unlock size={36} className="lock-icon-svg" style={{ color: 'var(--status-safe)' }} />
                )}
              </div>
              <button 
                onClick={handleUnlock} 
                disabled={unlocking || isLockedOut}
                className={`btn-gate-override ${doorLocked ? '' : 'unlocked'}`}
              >
                {unlocking ? 'Opening Gate...' : doorLocked ? 'Pulse Gate Override' : 'Gate Unlocked'}
              </button>
            </div>
          </PanelCard>

          {/* Secure mechanical Keypad card */}
          <PanelCard title="Entry Pad Console" icon={ShieldCheck}>
            <div className="sn-keypad-wrap">
              <div className="sn-pin-dots">
                {[1, 2, 3, 4].map((dotIndex) => (
                  <div 
                    key={dotIndex} 
                    className={`sn-pin-dot ${enteredPin.length >= dotIndex ? 'sn-pin-dot-filled' : ''}`}
                  />
                ))}
              </div>
              
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 'bold', color: pinMessage === 'GRANTED' ? 'var(--status-safe)' : pinMessage === 'DENIED' ? 'var(--status-critical)' : 'var(--text-secondary)' }}>
                GATE STATE: {pinMessage}
              </div>

              <div className="sn-keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button 
                    key={num} 
                    className="sn-keypad-btn" 
                    onClick={() => handleKeypadPress(String(num))}
                    disabled={isLockedOut}
                  >
                    {num}
                  </button>
                ))}
                <button className="sn-keypad-clear" onClick={clearEnteredPin} disabled={isLockedOut}>CLEAR</button>
                <button className="sn-keypad-btn" onClick={() => handleKeypadPress('0')} disabled={isLockedOut}>0</button>
                <button 
                  className="sn-keypad-btn" 
                  onClick={submitPin} 
                  disabled={isLockedOut || enteredPin.length < 4}
                  style={{ color: 'var(--accent-copper-bright)', fontWeight: 700 }}
                >
                  ENTER
                </button>
              </div>

              {/* Advanced custom gatecode calibration */}
              <div style={{ width: '100%' }}>
                <button 
                  onClick={() => setPinChangeMode(!pinChangeMode)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textDecoration: 'underline', cursor: 'pointer', width: '100%', textAlign: 'center', marginTop: '6px' }}
                >
                  {pinChangeMode ? 'Hide Code Calibration' : 'Calibrate PIN Key'}
                </button>

                {pinChangeMode && (
                  <form onSubmit={changeMasterPin} className="pin-settings-block">
                    <span className="label-eyebrow" style={{ fontSize: '0.65rem' }}>Set Gate PIN</span>
                    <input 
                      type="password" 
                      maxLength={4}
                      value={newMasterPin}
                      onChange={(e) => setNewMasterPin(e.target.value)}
                      placeholder="4 digits" 
                      className="input-pin-custom"
                    />
                    <button type="submit" className="btn-pin-confirm">UPDATE_KEY_REGISTER</button>
                  </form>
                )}
              </div>

            </div>
          </PanelCard>

        </div>

        {/* Right Hand: Radar Video Wireframe & Access history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Thermal Scanning radar wireframe */}
          <section className="camera-panel-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Eye size={16} style={{ color: 'var(--accent-copper-bright)' }} />
              <span className="label-eyebrow" style={{ color: 'var(--text-primary)' }}>Entrance Cam // Vector Scan</span>
            </div>

            <div className="camera-viewfinder">
              <div className="camera-radar-grid" />
              <div className="camera-laser-bar" style={{ top: `${laserPosition}%` }} />
              <div className="radar-sweep-center" />
              
              {/* Virtual vector targets */}
              {motion && (
                <div style={{ 
                  position: 'absolute', top: '40%', left: '30%', 
                  width: '12px', height: '12px', background: 'rgba(225,85,84,0.3)', 
                  border: '1px solid var(--status-critical)', borderRadius: '50%',
                  animation: 'sn-pulse 1s infinite'
                }} />
              )}
              
              <span className="camera-timestamp-stamp readout">
                CAM_01 · LIVE · {new Date().toLocaleTimeString()}
              </span>
              <span className="camera-status-overlay">
                {motion ? 'TARGET_DETECTED' : 'PERIMETER_SECURE'}
              </span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
              Live vector sweep indicating motion tracking telemetry. Updates locally from room motion registers (PIR).
            </p>
          </section>

          {/* Access history lists */}
          <PanelCard title="Access Verification Registry" icon={ScanLine}>
            <div className="log-scroller-box">
              {log.length === 0 ? (
                <p className="sn-page-subtitle" style={{ textAlign: 'center', padding: '20px 0' }}>
                  No authorization logs recorded.
                </p>
              ) : (
                log.map((entry) => (
                  <div key={entry.id} className="log-item-row">
                    <div className="log-left-meta">
                      <div className={`log-indicator-badge ${entry.granted ? 'ok' : 'fail'}`}>
                        <Fingerprint size={16} />
                      </div>
                      <div className="log-meta-titles">
                        <span className="log-user-tag">{entry.rfid_uid || '—'}</span>
                        <span className="log-time-tag">
                          {entry.method?.toUpperCase()} · {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <StatusPill status={entry.granted ? 'safe' : 'critical'} text={entry.granted ? 'GRANTED' : 'DENIED'} />
                  </div>
                ))
              )}
            </div>
          </PanelCard>

        </div>

      </div>

    </div>
  );
}