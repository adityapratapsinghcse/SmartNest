import { useState, useEffect } from 'react';
import { DoorOpen, DoorClosed, Radar, ScanLine, ShieldAlert, KeyRound, Fingerprint, Lock, Unlock } from 'lucide-react';
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

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);
  const { lastMessage: alertMessage } = useWebSocket('/ws/alerts/', householdId);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
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
    })();
  }, [householdId]);

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
        id: alertMessage.id, uid: '—', granted: false, method: 'rfid',
        timestamp: new Date().toISOString(),
      }, ...prev].slice(0, 20));
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

  if (loading) return <div className="sn-page-loading">Loading security data…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Security</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Security</h1>
          <p className="sn-page-subtitle">{device.name} · Access control & entry monitoring</p>
        </div>
        <div className="sn-live-indicator">
          <LiveDot color={wrongAttempts >= 3 ? 'var(--status-critical)' : 'var(--status-safe)'} />
          <span className="label-eyebrow">{wrongAttempts >= 3 ? 'Alarm Armed' : 'System Secure'}</span>
        </div>
      </div>

      <div className="sn-grid sn-grid-4">
        <PanelCard title="Front Door" icon={doorLocked ? DoorClosed : DoorOpen}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{doorLocked ? 'Locked' : 'Unlocked'}</span>
            <StatusPill status={doorLocked ? 'safe' : 'warning'} text={doorLocked ? 'SECURE' : 'OPEN'} />
          </div>
        </PanelCard>
        <PanelCard title="Window / Reed" icon={windowOpen ? DoorOpen : DoorClosed}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{windowOpen ? 'Open' : 'Closed'}</span>
            <StatusPill status={windowOpen ? 'warning' : 'safe'} text={windowOpen ? 'OPEN' : 'SECURE'} />
          </div>
        </PanelCard>
        <PanelCard title="Motion (PIR)" icon={Radar}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{motion ? 'Detected' : 'Clear'}</span>
            <StatusPill status={motion ? 'warning' : 'safe'} text={motion ? 'MOTION' : 'CLEAR'} />
          </div>
        </PanelCard>
        <PanelCard title="Failed Attempts" icon={ShieldAlert}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{wrongAttempts} / 3</span>
            <StatusPill status={wrongAttempts >= 3 ? 'critical' : wrongAttempts > 0 ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-main">
        <PanelCard title="Door Control" icon={KeyRound} accent>
          <div className="sn-door-visual">
            <div className={`sn-door-icon-wrap ${unlocking ? 'sn-door-unlocking' : ''}`}>
              {doorLocked ? <Lock size={42} /> : <Unlock size={42} />}
            </div>
            <button className="sn-unlock-btn" onClick={handleUnlock} disabled={unlocking}>
              {unlocking ? 'Unlocking…' : 'Unlock Door'}
            </button>
            <p className="sn-door-hint">
              Sends a real command to the backend queue. Firmware command-polling is a Phase 5 item,
              so the physical servo won't move until that loop is added to the ESP32 sketch.
            </p>
          </div>
        </PanelCard>

        <PanelCard title="Access Log" icon={ScanLine}>
          <div className="sn-access-log">
            {log.length === 0 && <p className="sn-page-subtitle">No access attempts recorded yet.</p>}
            {log.map((entry) => (
              <div key={entry.id} className="sn-access-item">
                <Fingerprint size={16} className={entry.granted ? 'sn-access-icon-ok' : 'sn-access-icon-fail'} />
                <div className="sn-access-details">
                  <span className="readout sn-access-uid">{entry.rfid_uid || '—'}</span>
                  <span className="sn-access-time">{entry.method?.toUpperCase()} · {new Date(entry.timestamp).toLocaleString()}</span>
                </div>
                <StatusPill status={entry.granted ? 'safe' : 'critical'} text={entry.granted ? 'GRANTED' : 'DENIED'} />
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}