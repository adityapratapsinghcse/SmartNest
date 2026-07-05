import { useState, useEffect, useRef, useCallback } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Thermometer, Droplets, Fan, Wind, Sun, Minus, Plus } from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import DialGauge from '../components/ui/DialGauge';
import ToggleSwitch from '../components/ui/ToggleSwitch';
import StatusPill from '../components/ui/StatusPill';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

export default function Climate() {
  const { householdId } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTemp, setCurrentTemp] = useState(null);
  const [humidity, setHumidity] = useState(null);
  const [targetTemp, setTargetTemp] = useState(24);
  const [fanOn, setFanOn] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [history, setHistory] = useState([]);
  const dialRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      try {
        const devicesRes = await client.get('/api/devices/');
        if (devicesRes.data.length === 0) { setLoading(false); return; }
        const primaryDevice = devicesRes.data[0];
        setDevice(primaryDevice);

        const [tempHistRes, latestRes] = await Promise.all([
          client.get(`/api/sensors/history/?device_id=${primaryDevice.id}&sensor_type=temperature&limit=24`),
          client.get(`/api/sensors/latest/?device_id=${primaryDevice.id}`),
        ]);
        const chartData = tempHistRes.data.slice().reverse().map((r) => ({
          time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          temp: r.value,
        }));
        setHistory(chartData);

        latestRes.data.forEach((r) => {
          if (r.sensor_type === 'temperature') setCurrentTemp(r.value);
          if (r.sensor_type === 'humidity') setHumidity(r.value);
          if (r.sensor_type === 'fan_relay') setFanOn(r.value === 1);
        });
      } catch (err) {
        console.error('Failed to load climate data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.temperature !== undefined) {
      setCurrentTemp(lastMessage.temperature);
      setHistory((prev) => [...prev.slice(-23), {
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temp: lastMessage.temperature,
      }]);
    }
    if (lastMessage.humidity !== undefined) setHumidity(lastMessage.humidity);
    if (lastMessage.fan_on !== undefined) setFanOn(lastMessage.fan_on);
  }, [lastMessage]);


  const sendCommand = async (action, payload = {}) => {
    if (!device) return;
    try {
      await client.post('/api/commands/send/', { device: device.id, action, payload });
    } catch (err) {
      console.error('Command failed to send:', err);
    }
  };

  const angleFromTemp = (temp) => -135 + ((temp - 16) / 16) * 270;
  const tempFromAngle = (angle) => Math.round((16 + ((angle + 135) / 270) * 16) * 2) / 2;

  const handleDialInteraction = useCallback((clientX, clientY) => {
    if (!dialRef.current) return;
    const rect = dialRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
    if (angle > 180) angle -= 360;
    const clamped = Math.max(-135, Math.min(135, angle));
    const newTemp = tempFromAngle(clamped);
    if (newTemp >= 16 && newTemp <= 32) {
      setTargetTemp(newTemp);
      setAutoMode(false);
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      handleDialInteraction(point.clientX, point.clientY);
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, handleDialInteraction]);

  const comfortIndex = currentTemp !== null
    ? Math.max(0, 100 - Math.abs(currentTemp - 23) * 8 - Math.abs((humidity ?? 50) - 50) * 0.6)
    : 0;

  if (loading) return <div className="sn-page-loading">Loading climate data…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Climate</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Climate</h1>
          <p className="sn-page-subtitle">{device.name} · Temperature, humidity & ventilation</p>
        </div>
        <StatusPill status={autoMode ? 'safe' : 'warning'} text={autoMode ? 'AUTO MODE' : 'MANUAL MODE'} />
      </div>

      <div className="sn-climate-main">
        <PanelCard title="Thermostat" icon={Thermometer} accent className="sn-thermostat-panel">
          <div
            className="sn-thermostat"
            ref={dialRef}
            onMouseDown={(e) => { setDragging(true); handleDialInteraction(e.clientX, e.clientY); }}
            onTouchStart={(e) => { setDragging(true); const t = e.touches[0]; handleDialInteraction(t.clientX, t.clientY); }}
          >
            <svg viewBox="0 0 240 240" className="sn-thermostat-svg">
              <circle cx="120" cy="120" r="100" fill="none" stroke="var(--bg-panel-raised)" strokeWidth="14"
                strokeDasharray={`${2 * Math.PI * 100 * 0.75} ${2 * Math.PI * 100}`}
                transform="rotate(135 120 120)" strokeLinecap="round" />
              <circle cx="120" cy="120" r="100" fill="none" stroke="var(--accent-copper)" strokeWidth="14"
                strokeDasharray={`${2 * Math.PI * 100 * 0.75 * ((targetTemp - 16) / 16)} ${2 * Math.PI * 100}`}
                transform="rotate(135 120 120)" strokeLinecap="round"
                style={{ transition: dragging ? 'none' : 'stroke-dasharray 0.3s ease' }} />
              <circle
                cx={120 + 100 * Math.cos((angleFromTemp(targetTemp) - 90) * Math.PI / 180)}
                cy={120 + 100 * Math.sin((angleFromTemp(targetTemp) - 90) * Math.PI / 180)}
                r="10" fill="var(--accent-copper-bright)" stroke="#12161B" strokeWidth="3"
                style={{ cursor: 'grab', transition: dragging ? 'none' : 'all 0.3s ease' }}
              />
            </svg>
            <div className="sn-thermostat-center">
              <span className="readout sn-thermostat-target">{targetTemp}°</span>
              <span className="label-eyebrow">Target</span>
              <span className="sn-thermostat-current">Current: {currentTemp ?? '—'}°C</span>
            </div>
          </div>
          <div className="sn-thermostat-controls">
            <button className="sn-temp-btn" onClick={() => { setTargetTemp((t) => Math.max(16, t - 0.5)); setAutoMode(false); }}><Minus size={16} /></button>
            <span className="sn-drag-hint">Drag the dial to set target</span>
            <button className="sn-temp-btn" onClick={() => { setTargetTemp((t) => Math.min(32, t + 0.5)); setAutoMode(false); }}><Plus size={16} /></button>
          </div>
          <button className="sn-auto-btn" onClick={() => setAutoMode(true)}>Reset to Auto</button>
        </PanelCard>

        <div className="sn-climate-side">
          <PanelCard title="Humidity" icon={Droplets}>
            <div className="sn-stat-row">
              <span className="readout sn-stat-value">{humidity !== null ? Math.round(humidity) : '—'}<span className="sn-stat-unit">%</span></span>
              <StatusPill status={humidity > 70 ? 'warning' : 'safe'} />
            </div>
          </PanelCard>
          <PanelCard title="Comfort Index" icon={Sun}>
            <div className="sn-gauge-row" style={{ justifyContent: 'center' }}>
              <DialGauge value={comfortIndex} max={100} unit="" label="Comfort" size={110} thresholds={{ warning: 101, critical: 101 }} />
            </div>
          </PanelCard>
        </div>
      </div>

      <div className="sn-dashboard-lower" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <PanelCard title="Ventilation Control" icon={Fan}>
          <ToggleSwitch
            label="Ventilation Fan"
            icon={Fan}
            checked={fanOn}
            onChange={(v) => { setAutoMode(false); sendCommand(v ? 'fan_on' : 'fan_off'); }}/>
          <p className="sn-auto-note">Reflects the ESP32's real relay state — the firmware's own temperature-threshold logic controls this automatically; manual override needs Phase 5 command polling to take physical effect.</p>
        </PanelCard>

        <PanelCard title="Temperature — Live History" icon={Thermometer}>
          {history.length > 1 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-copper-bright)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--accent-copper-bright)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} labelStyle={{ color: 'var(--text-secondary)' }} />
                <Area type="monotone" dataKey="temp" stroke="var(--accent-copper-bright)" strokeWidth={2} fill="url(#tempGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="sn-page-subtitle">Waiting for enough readings to build a trend…</p>
          )}
        </PanelCard>
      </div>
    </div>
  );
}