import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Thermometer, Droplets, Wind, Sun, Lightbulb, Fan, DoorClosed, Flame, ShieldCheck, Zap, Activity, TriangleAlert } from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import DialGauge from '../components/ui/DialGauge';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import StatusPill from '../components/ui/StatusPill';
import LiveDot from '../components/ui/LiveDot';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

function mapLatestReadings(readings) {
  const out = {};
  readings.forEach((r) => {
    if (r.sensor_type === 'temperature') out.temperature = r.value;
    if (r.sensor_type === 'humidity') out.humidity = r.value;
    if (r.sensor_type === 'gas') out.gas = r.value;
    if (r.sensor_type === 'light') out.light = r.value;
    if (r.sensor_type === 'current') out.current = r.value;
    if (r.sensor_type === 'window') out.windowOpen = r.value === 1;
    if (r.sensor_type === 'motion') out.motion = r.value === 1;
    if (r.sensor_type === 'light_relay') out.lightOn = r.value === 1;
    if (r.sensor_type === 'fan_relay') out.fanOn = r.value === 1;
    if (r.sensor_type === 'cutoff_relay') out.cutoffOn = r.value === 1;
  });
  return out;
}

function mapWsMessage(msg) {
  const out = {};
  if (msg.temperature !== undefined) out.temperature = msg.temperature;
  if (msg.humidity !== undefined) out.humidity = msg.humidity;
  if (msg.gas_percent !== undefined) out.gas = msg.gas_percent;
  if (msg.light_percent !== undefined) out.light = msg.light_percent;
  if (msg.current_amps !== undefined) out.current = msg.current_amps;
  if (msg.window_open !== undefined) out.windowOpen = msg.window_open;
  if (msg.motion !== undefined) out.motion = msg.motion;
  if (msg.light_on !== undefined) out.lightOn = msg.light_on;
  if (msg.fan_on !== undefined) out.fanOn = msg.fan_on;
  if (msg.cutoff_on !== undefined) out.cutoffOn = msg.cutoff_on;
  return out;
}

export default function Dashboard() {
  const { householdId } = useAuth();
  const [stats, setStats] = useState({ temperature: null, humidity: null, gas: null, light: null, current: null, windowOpen: false, motion: false });
  const [history, setHistory] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  const { lastMessage, status } = useWebSocket('/ws/sensors/', householdId);
  const { lastMessage: alertMessage } = useWebSocket('/ws/alerts/', householdId);

  // Initial load: pick the first device in the household, load its latest readings + alerts
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
        setStats((s) => ({ ...s, ...mapLatestReadings(latestRes.data) }));
        setAlerts(alertsRes.data.slice(0, 5));
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  // Live updates via WebSocket
  useEffect(() => {
    if (!lastMessage) return;
    const mapped = mapWsMessage(lastMessage);
    setStats((s) => ({ ...s, ...mapped }));
    if (mapped.temperature !== undefined) {
      setHistory((prev) => [...prev.slice(-11), {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: mapped.temperature,
      }]);
    }
  }, [lastMessage]);

  useEffect(() => {
    if (!alertMessage) return;
    setAlerts((prev) => [{ id: alertMessage.id, severity: alertMessage.severity, message: alertMessage.message, time: 'Just now' }, ...prev].slice(0, 5));
  }, [alertMessage]);

  const sendCommand = async (action, payload) => {
    if (!device) return;
    try {
      await client.post('/api/commands/send/', { device: device.id, action, payload });
    } catch (err) {
      console.error('Command failed to send:', err);
    }
  };

  if (loading) return <div className="sn-page-loading">Loading dashboard…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Home Overview</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Home Overview</h1>
          <p className="sn-page-subtitle">{device.name} · {device.location}</p>
        </div>
        <div className="sn-live-indicator">
          <LiveDot color={status === 'open' ? 'var(--status-safe)' : 'var(--status-warning)'} />
          <span className="label-eyebrow">{status === 'open' ? 'Live' : 'Reconnecting'}</span>
        </div>
      </div>

      <div className="sn-grid sn-grid-4">
        <PanelCard title="Temperature" icon={Thermometer}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{stats.temperature ?? '—'}<span className="sn-stat-unit">°C</span></span>
            <StatusPill status={stats.temperature > 28 ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
        <PanelCard title="Humidity" icon={Droplets}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{stats.humidity !== null ? Math.round(stats.humidity) : '—'}<span className="sn-stat-unit">%</span></span>
            <StatusPill status="safe" />
          </div>
        </PanelCard>
        <PanelCard title="Air Quality" icon={Wind}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{stats.gas !== null ? Math.round(stats.gas) : '—'}<span className="sn-stat-unit">%</span></span>
            <StatusPill status={stats.gas > 50 ? 'critical' : stats.gas > 30 ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
        <PanelCard title="Light Level" icon={Sun}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{stats.light !== null ? Math.round(stats.light) : '—'}<span className="sn-stat-unit">%</span></span>
            <StatusPill status="safe" text={stats.light < 30 ? 'DARK' : 'BRIGHT'} />
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-main">
        <PanelCard title="Temperature — Live" icon={Activity} className="sn-chart-panel">
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={history}>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} labelStyle={{ color: 'var(--text-secondary)' }} />
                <Line type="monotone" dataKey="temp" stroke="var(--accent-copper-bright)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="sn-page-subtitle">Waiting for live readings to build up a trend…</p>
          )}
        </PanelCard>

        <PanelCard title="Security Summary" icon={ShieldCheck}>
          <div className="sn-security-summary">
            <div className="sn-security-item">
              <DoorClosed size={20} className="sn-security-icon" />
              <span>Window / Door</span>
              <StatusPill status={stats.windowOpen ? 'warning' : 'safe'} text={stats.windowOpen ? 'OPEN' : 'CLOSED'} />
            </div>
            <div className="sn-security-item">
              <ShieldCheck size={20} className="sn-security-icon" />
              <span>Motion</span>
              <StatusPill status={stats.motion ? 'warning' : 'safe'} text={stats.motion ? 'DETECTED' : 'CLEAR'} />
            </div>
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-lower">
        <PanelCard title="Live Instruments" icon={Zap}>
          <div className="sn-gauge-row">
            <DialGauge value={stats.current ?? 0} max={5} unit="A" label="Current Draw" thresholds={{ warning: 2.5, critical: 3.5 }} />
            <DialGauge value={stats.gas ?? 0} max={100} unit="%" label="Gas Level" thresholds={{ warning: 30, critical: 50 }} />
          </div>
        </PanelCard>

        <PanelCard title="Actuator Control" icon={Zap} accent>
        <ToggleSwitch
          label="Living Room Light"
          icon={Lightbulb}
          checked={stats.lightOn ?? false}
          onChange={(v) => sendCommand(v ? 'light_on' : 'light_off')}
        />
        <ToggleSwitch
          label="Ventilation Fan"
          icon={Fan}
          checked={stats.fanOn ?? false}
          onChange={(v) => sendCommand(v ? 'fan_on' : 'fan_off')}
        />
        <ToggleSwitch
          label="Emergency Cutoff"
          icon={Flame}
          checked={stats.cutoffOn ?? false}
          onChange={() => {}}
          disabled
          />
          <p className="sn-auto-note">
            These reflect the ESP32's own real-time relay state, driven by its onboard safety logic
            (motion+dark → light, temp threshold → fan). Manual toggle commands are queued to the backend,
            but won't override the relay until firmware command-polling is added in Phase 5 —
            so what you see here is always the true, current physical state, not a guess.
          </p>
        </PanelCard>
        <PanelCard title="Recent Alerts" icon={TriangleAlert}>
          <div className="sn-alert-feed">
            {alerts.length === 0 && <p className="sn-page-subtitle">No alerts yet</p>}
            {alerts.map((a) => (
              <div key={a.id} className="sn-alert-item">
                <span className={`sn-alert-dot sn-alert-${a.severity}`} />
                <div className="sn-alert-text">
                  <span>{a.message}</span>
                  <span className="sn-alert-time">{a.time || new Date(a.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}