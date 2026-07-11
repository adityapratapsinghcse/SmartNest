import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import {
  Thermometer, Droplets, Wind, Zap, DoorOpen, Car, Flame, Radio,
  Lightbulb, Fan, Power, ShieldAlert, Fingerprint, Activity,
} from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import DialGauge from '../components/ui/DialGauge';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import StatusPill from '../components/ui/StatusPill';
import LiveDot from '../components/ui/LiveDot';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

// How stale the last sensor post has to be before we call the hardware "offline"
const OFFLINE_THRESHOLD_MS = 60 * 1000;

export default function Dashboard() {
  const { householdId, householdName } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const [readings, setReadings] = useState({
    temperature: null, humidity: null, gas: null, current: null, light: null,
    water_level: null, flame: null, motion: null, window: null, vibration: null,
    car_presence: null, light_relay: null, fan_relay: null, cutoff_relay: null,
  });

  const [history, setHistory] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [energyToday, setEnergyToday] = useState(null);

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);
  const { lastMessage: alertMessage } = useWebSocket('/ws/alerts/', householdId);

  // Tick every 5s so the "online/offline" badge stays accurate without a refresh
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      try {
        const devicesRes = await client.get('/api/devices/');
        if (devicesRes.data.length === 0) { setLoading(false); return; }
        const primaryDevice = devicesRes.data[0];
        setDevice(primaryDevice);

        const [latestRes, histRes, accessRes, alertsRes, energyRes] = await Promise.all([
          client.get(`/api/sensors/latest/?device_id=${primaryDevice.id}`),
          client.get(`/api/sensors/history/?device_id=${primaryDevice.id}&sensor_type=temperature&limit=24`),
          client.get(`/api/access/log/?device_id=${primaryDevice.id}`),
          client.get('/api/alerts/?is_read=false'),
          client.get(`/api/energy/summary/?device_id=${primaryDevice.id}`).catch(() => null),
        ]);

        const merged = {};
        latestRes.data.forEach((r) => { merged[r.sensor_type] = r.value; });
        setReadings((prev) => ({ ...prev, ...merged }));
        if (latestRes.data.length > 0) {
          const newest = latestRes.data.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b));
          setLastSeenAt(new Date(newest.timestamp).getTime());
        }

        setHistory(histRes.data.slice().reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: r.value,
        })));

        setAccessLog(accessRes.data.slice(0, 5));
        setAlerts(alertsRes.data.slice(0, 6));
        if (energyRes?.data) setEnergyToday(energyRes.data.today_kwh);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  // Live sensor push
  useEffect(() => {
    if (!lastMessage) return;
    setLastSeenAt(Date.now());
    setReadings((prev) => ({
      ...prev,
      temperature: lastMessage.temperature ?? prev.temperature,
      humidity: lastMessage.humidity ?? prev.humidity,
      gas: lastMessage.gas_percent ?? prev.gas,
      current: lastMessage.current_amps ?? prev.current,
      light: lastMessage.light_percent ?? prev.light,
      water_level: lastMessage.water_level_percent ?? prev.water_level,
      flame: lastMessage.flame_detected !== undefined ? (lastMessage.flame_detected ? 1 : 0) : prev.flame,
      motion: lastMessage.motion !== undefined ? (lastMessage.motion ? 1 : 0) : prev.motion,
      window: lastMessage.window_open !== undefined ? (lastMessage.window_open ? 1 : 0) : prev.window,
      vibration: lastMessage.vibration_detected !== undefined ? (lastMessage.vibration_detected ? 1 : 0) : prev.vibration,
      car_presence: lastMessage.car_detected !== undefined ? (lastMessage.car_detected ? 1 : 0) : prev.car_presence,
      light_relay: lastMessage.light_on !== undefined ? (lastMessage.light_on ? 1 : 0) : prev.light_relay,
      fan_relay: lastMessage.fan_on !== undefined ? (lastMessage.fan_on ? 1 : 0) : prev.fan_relay,
      cutoff_relay: lastMessage.cutoff_on !== undefined ? (lastMessage.cutoff_on ? 1 : 0) : prev.cutoff_relay,
    }));
    if (lastMessage.temperature !== undefined) {
      setHistory((prev) => [...prev.slice(-23), {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: lastMessage.temperature,
      }]);
    }
  }, [lastMessage]);

  // Live alert push
  useEffect(() => {
    if (!alertMessage) return;
    setAlerts((prev) => [alertMessage, ...prev].slice(0, 6));
  }, [alertMessage]);

  const sendCommand = async (action) => {
    if (!device) return;
    try {
      await client.post('/api/commands/send/', { device: device.id, action });
    } catch (err) {
      console.error('Command failed to send:', err);
    }
  };

  const toggleLight = (on) => {
    setReadings((prev) => ({ ...prev, light_relay: on ? 1 : 0 }));
    sendCommand(on ? 'light_on' : 'light_off');
  };
  const toggleFan = (on) => {
    setReadings((prev) => ({ ...prev, fan_relay: on ? 1 : 0 }));
    sendCommand(on ? 'fan_on' : 'fan_off');
  };
  const unlockGate = () => sendCommand('unlock_door');

  const isOnline = lastSeenAt !== null && (now - lastSeenAt) < OFFLINE_THRESHOLD_MS;

  const currentStatus = readings.current >= 3 ? 'critical' : readings.current >= 2 ? 'warning' : 'safe';

  // Matches the backend's TANK_CRITICAL_PERCENT / TANK_LOW_PERCENT thresholds
  const waterLevel = readings.water_level;
  const waterStatus = waterLevel === null ? 'safe' : waterLevel <= 10 ? 'critical' : waterLevel <= 25 ? 'warning' : 'safe';
  const waterStatusText = waterLevel === null ? 'NO DATA'
    : waterStatus === 'critical' ? 'REFILL NOW'
    : waterStatus === 'warning' ? 'GETTING LOW'
    : 'GOOD';

  if (loading) return <div className="sn-page-loading">Loading dashboard…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Dashboard</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Dashboard</h1>
          <p className="sn-page-subtitle">{householdName} — live from {device.name}</p>
        </div>
        <div className="sn-live-indicator">
          <LiveDot color={isOnline ? 'var(--status-safe)' : 'var(--status-critical)'} />
          <span className="label-eyebrow">{isOnline ? 'Hardware Online' : 'Hardware Offline'}</span>
        </div>
      </div>

      {!isOnline && (
        <div className="sn-alert-item" style={{ background: 'rgba(225,85,84,0.08)', border: '1px solid rgba(225,85,84,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
          <ShieldAlert size={16} style={{ color: 'var(--status-critical)' }} />
          <span style={{ fontSize: 13.5 }}>
            No data from {device.name} in the last minute. Readings below are the last known values, not live.
          </span>
        </div>
      )}

      {/* Hero gauges */}
      <PanelCard title="Core Telemetry" icon={Activity}>
        <div className="sn-gauge-row">
          <DialGauge value={readings.temperature ?? 0} max={50} unit="°C" label="Temperature" thresholds={{ warning: 28, critical: 35 }} />
          <DialGauge value={readings.humidity ?? 0} max={100} unit="%" label="Humidity" thresholds={{ warning: 70, critical: 90 }} />
          <DialGauge value={readings.gas ?? 0} max={100} unit="%" label="Gas (MQ-2)" thresholds={{ warning: 25, critical: 50 }} />
          <DialGauge value={readings.current ?? 0} max={5} unit="A" label="Current Draw" thresholds={{ warning: 2, critical: 3 }} />
        </div>
      </PanelCard>

      {/* Zone status strip */}
      <div className="sn-grid sn-grid-4" style={{ marginTop: 20 }}>
        <PanelCard title="Gate" icon={DoorOpen}>
          <div className="sn-security-item">
            <Fingerprint size={16} className="sn-security-icon" />
            <span>Last scan</span>
            <StatusPill status={accessLog[0]?.granted ? 'safe' : accessLog[0] ? 'critical' : 'safe'} text={accessLog[0] ? (accessLog[0].granted ? 'GRANTED' : 'DENIED') : 'NO SCANS YET'} />
          </div>
        </PanelCard>

        <PanelCard title="Garage" icon={Car}>
          <div className="sn-security-item">
            <Car size={16} className="sn-security-icon" />
            <span>Vehicle bay</span>
            <StatusPill status={readings.car_presence ? 'warning' : 'safe'} text={readings.car_presence ? 'OCCUPIED' : 'CLEAR'} />
          </div>
        </PanelCard>

        <PanelCard title="Kitchen" icon={Flame}>
          <div className="sn-security-item">
            <Flame size={16} className="sn-security-icon" />
            <span>Flame sensor</span>
            <StatusPill status={readings.flame ? 'critical' : 'safe'} text={readings.flame ? 'FIRE' : 'SAFE'} />
          </div>
        </PanelCard>

        <PanelCard title="Room" icon={Radio}>
          <div className="sn-security-item">
            <Radio size={16} className="sn-security-icon" />
            <span>Motion (PIR)</span>
            <StatusPill status={readings.motion ? 'warning' : 'safe'} text={readings.motion ? 'DETECTED' : 'IDLE'} />
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-main">
        {/* Temperature trend chart */}
        <PanelCard title="Temperature — Last 24 Readings" icon={Thermometer} className="sn-chart-panel">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-copper-bright)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--accent-copper-bright)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} />
              <YAxis stroke="var(--text-secondary)" fontSize={11} domain={['auto', 'auto']} />
              <Tooltip contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="temp" stroke="var(--accent-copper-bright)" fill="url(#tempGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </PanelCard>

        {/* Quick actuator controls */}
        <PanelCard title="Quick Controls" icon={Power}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ToggleSwitch label="Room Lighting" icon={Lightbulb} checked={!!readings.light_relay} onChange={toggleLight} />
            <ToggleSwitch label="Cooling Fan" icon={Fan} checked={!!readings.fan_relay} onChange={toggleFan} />
            <button className="sn-unlock-btn" onClick={unlockGate} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <DoorOpen size={16} /> Unlock Gate
            </button>
            {energyToday !== null && (
              <div className="sn-stat-row" style={{ marginTop: 8 }}>
                <span className="label-eyebrow">Today's usage</span>
                <span><span className="sn-stat-value">{energyToday}</span><span className="sn-stat-unit">kWh</span></span>
              </div>
            )}
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-lower">
        <PanelCard title="Water Tank" icon={Droplets}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 32, height: 60, borderRadius: 6, position: 'relative',
              background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)',
              overflow: 'hidden', flexShrink: 0,
            }}>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: `${Math.max(0, Math.min(100, waterLevel ?? 0))}%`,
                background: waterStatus === 'critical' ? 'var(--status-critical)' : waterStatus === 'warning' ? 'var(--status-warning)' : 'var(--status-safe)',
                transition: 'height 0.6s ease',
              }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="sn-stat-row">
                <span><span className="sn-stat-value">{waterLevel ?? '--'}</span><span className="sn-stat-unit">%</span></span>
              </div>
              <div style={{ marginTop: 8 }}>
                <StatusPill status={waterStatus} text={waterStatusText} />
              </div>
            </div>
          </div>
        </PanelCard>

        <PanelCard title="Structural Vibration" icon={Wind}>
          <StatusPill status={readings.vibration ? 'warning' : 'safe'} text={readings.vibration ? 'VIBRATION DETECTED' : 'STABLE'} />
        </PanelCard>

        <PanelCard title="Power Overload" icon={Zap}>
          <StatusPill status={currentStatus} text={currentStatus === 'safe' ? 'NORMAL LOAD' : currentStatus === 'warning' ? 'ELEVATED' : 'OVERLOAD'} />
        </PanelCard>
      </div>

      {/* Recent events */}
      <PanelCard title="Recent Events" icon={ShieldAlert} className="sn-chart-panel" style={{ marginTop: 20 }}>
        <div className="sn-history-feed">
          {alerts.length === 0 && (
            <p className="label-eyebrow" style={{ padding: '8px 0' }}>No unread alerts — system nominal.</p>
          )}
          {alerts.map((a) => (
            <div key={a.id} className="sn-history-item">
              <ShieldAlert size={16} className={`sn-history-icon sn-history-${a.severity}`} />
              <div className="sn-history-text">
                <div className="sn-history-top">
                  <span className="sn-history-type">{a.type}</span>
                </div>
                <span className="sn-history-message">{a.message}</span>
                <span className="sn-history-time">{new Date(a.timestamp || a.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}