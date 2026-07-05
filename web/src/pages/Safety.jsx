import { useState, useEffect } from 'react';
import { Flame, Wind, Droplet, Activity, Siren, Power, ShieldAlert } from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import DialGauge from '../components/ui/DialGauge';
import StatusPill from '../components/ui/StatusPill';
import LiveDot from '../components/ui/LiveDot';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

export default function Safety() {
  const { householdId } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gas, setGas] = useState(0);
  const [flame, setFlame] = useState(false);
  const [waterLeak, setWaterLeak] = useState(false);
  const [current, setCurrent] = useState(0);
  const [vibration, setVibration] = useState(false);
  const [waveform, setWaveform] = useState(Array(40).fill(0));
  const [history, setHistory] = useState([]);
  const [cutoffOn, setCutoffOn] = useState(false);

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

        const [latestRes, alertsRes] = await Promise.all([
          client.get(`/api/sensors/latest/?device_id=${primaryDevice.id}`),
          client.get(`/api/alerts/?device_id=${primaryDevice.id}`),
        ]);
        latestRes.data.forEach((r) => {
          if (r.sensor_type === 'gas') setGas(r.value);
          if (r.sensor_type === 'flame') setFlame(r.value === 1);
          if (r.sensor_type === 'water') setWaterLeak(r.value === 1);
          if (r.sensor_type === 'current') setCurrent(r.value);
          if (r.sensor_type === 'vibration') setVibration(r.value === 1);
          if (r.sensor_type === 'cutoff_relay') setCutoffOn(r.value === 1);
        });
        setHistory(alertsRes.data.slice(0, 10));
      } catch (err) {
        console.error('Failed to load safety data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.gas_percent !== undefined) setGas(lastMessage.gas_percent);
    if (lastMessage.flame_detected !== undefined) setFlame(lastMessage.flame_detected);
    if (lastMessage.water_leak !== undefined) setWaterLeak(lastMessage.water_leak);
    if (lastMessage.current_amps !== undefined) setCurrent(lastMessage.current_amps);
    if (lastMessage.vibration_detected !== undefined) setVibration(lastMessage.vibration_detected);
    if (lastMessage.cutoff_on !== undefined) setCutoffOn(lastMessage.cutoff_on);
    if (lastMessage.vibration_deviation !== undefined) {
      setWaveform((prev) => [...prev.slice(1), 9.8 + lastMessage.vibration_deviation]);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!alertMessage) return;
    setHistory((h) => [{
      id: alertMessage.id, type: alertMessage.type, severity: alertMessage.severity,
      message: alertMessage.message, timestamp: new Date().toISOString(),
    }, ...h].slice(0, 10));
  }, [alertMessage]);

  const emergencyCutoff = cutoffOn;
  const waveformPath = waveform.map((v, i) => `${(i / (waveform.length - 1)) * 300},${60 - (v - 9.8) * 15}`).join(' L ');

  if (loading) return <div className="sn-page-loading">Loading safety data…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Safety & Alerts</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Safety & Alerts</h1>
          <p className="sn-page-subtitle">{device.name} · Gas, fire, water & seismic monitoring</p>
        </div>
        <div className="sn-live-indicator">
          <LiveDot color={emergencyCutoff ? 'var(--status-critical)' : 'var(--status-safe)'} />
          <span className="label-eyebrow">{emergencyCutoff ? 'Cutoff Active' : 'All Systems Nominal'}</span>
        </div>
      </div>

      <div className="sn-grid sn-grid-4">
        <PanelCard title="Gas (MQ-2)" icon={Wind}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{Math.round(gas)}<span className="sn-stat-unit">%</span></span>
            <StatusPill status={gas > 50 ? 'critical' : gas > 30 ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
        <PanelCard title="Flame Sensor" icon={Flame}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{flame ? 'Detected' : 'Clear'}</span>
            <StatusPill status={flame ? 'critical' : 'safe'} text={flame ? 'FIRE' : 'CLEAR'} />
          </div>
        </PanelCard>
        <PanelCard title="Water Leak" icon={Droplet}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{waterLeak ? 'Leak' : 'Dry'}</span>
            <StatusPill status={waterLeak ? 'critical' : 'safe'} text={waterLeak ? 'LEAK' : 'DRY'} />
          </div>
        </PanelCard>
        <PanelCard title="Vibration (MPU6050)" icon={Activity}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value" style={{ fontSize: 18 }}>{vibration ? 'Active' : 'Stable'}</span>
            <StatusPill status={vibration ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-main">
        <PanelCard title="Emergency Power Cutoff" icon={Power} accent className={emergencyCutoff ? 'sn-cutoff-active' : ''}>
          <div className="sn-cutoff-visual">
            <div className={`sn-cutoff-ring ${emergencyCutoff ? 'sn-cutoff-ring-active' : ''}`}>
              <Power size={38} />
            </div>
            <span className="sn-cutoff-status">{emergencyCutoff ? 'POWER CUT' : 'Power Normal'}</span>
            <p className="sn-cutoff-hint">
              Auto-triggers when gas &gt; 55%, flame detected, or current draw &gt; 3.2A — mirrors firmware thresholds exactly
            </p>
          </div>
          <div className="sn-gauge-row">
            <DialGauge value={gas} max={100} unit="%" label="Gas Level" thresholds={{ warning: 30, critical: 55 }} size={110} />
            <DialGauge value={current} max={5} unit="A" label="Current" thresholds={{ warning: 2.5, critical: 3.2 }} size={110} />
          </div>
        </PanelCard>

        <PanelCard title="Live Vibration Signal" icon={Activity}>
          <svg viewBox="0 0 300 80" className="sn-waveform-svg">
            <line x1="0" y1="40" x2="300" y2="40" stroke="var(--border-subtle)" strokeDasharray="4 4" />
            <polyline
              points={waveformPath}
              fill="none"
              stroke={vibration ? 'var(--status-critical)' : 'var(--accent-copper-bright)'}
              strokeWidth="2"
              style={{ transition: 'stroke 0.3s ease' }}
            />
          </svg>
          <p className="sn-waveform-caption">Real accelerometer magnitude deviation from gravity (9.8 m/s²), streamed from the MPU6050</p>
        </PanelCard>
      </div>

      <PanelCard title="Alarm History" icon={Siren}>
        <div className="sn-history-feed">
          {history.length === 0 && <p className="sn-page-subtitle">No alerts recorded yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="sn-history-item">
              <ShieldAlert size={16} className={`sn-history-icon sn-history-${h.severity}`} />
              <div className="sn-history-text">
                <div className="sn-history-top">
                  <span className="sn-history-type">{h.type}</span>
                  <StatusPill status={h.severity === 'info' ? 'safe' : h.severity} text={h.severity.toUpperCase()} />
                </div>
                <span className="sn-history-message">{h.message}</span>
                <span className="sn-history-time">{new Date(h.timestamp).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}