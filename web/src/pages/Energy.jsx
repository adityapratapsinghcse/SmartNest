import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, IndianRupee, TrendingUp, Sparkles } from 'lucide-react';
import PanelCard from '../components/ui/PanelCard';
import DialGauge from '../components/ui/DialGauge';
import StatusPill from '../components/ui/StatusPill';
import client from '../api/client';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAuth } from '../context/AuthContext';

const RATE_PER_KWH = 7.5; // Adjust to your local electricity tariff

export default function Energy() {
  const { householdId } = useAuth();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentDraw, setCurrentDraw] = useState(0);
  const [summary, setSummary] = useState({ today_kwh: 0, week_total_kwh: 0, daily_breakdown: [], has_data: false });

  const { lastMessage } = useWebSocket('/ws/sensors/', householdId);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      try {
        const devicesRes = await client.get('/api/devices/');
        if (devicesRes.data.length === 0) { setLoading(false); return; }
        const primaryDevice = devicesRes.data[0];
        setDevice(primaryDevice);

        const [latestRes, summaryRes] = await Promise.all([
          client.get(`/api/sensors/latest/?device_id=${primaryDevice.id}`),
          client.get(`/api/energy/summary/?device_id=${primaryDevice.id}`),
        ]);
        const currentReading = latestRes.data.find((r) => r.sensor_type === 'current');
        if (currentReading) setCurrentDraw(currentReading.value);
        setSummary(summaryRes.data);
      } catch (err) {
        console.error('Failed to load energy data:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [householdId]);

  useEffect(() => {
    if (lastMessage?.current_amps !== undefined) setCurrentDraw(lastMessage.current_amps);
  }, [lastMessage]);

  const currentWatts = currentDraw * 230;
  const monthEstimate = summary.today_kwh * 30;
  const monthCost = monthEstimate * RATE_PER_KWH;

  if (loading) return <div className="sn-page-loading">Loading energy data…</div>;

  if (!device) {
    return (
      <div className="sn-page">
        <h1 className="sn-page-title">Energy</h1>
        <p className="sn-page-subtitle">No devices found yet. Add an ESP32 board under Devices to get started.</p>
      </div>
    );
  }

  return (
    <div className="sn-page">
      <div className="sn-page-header">
        <div>
          <h1 className="sn-page-title">Energy</h1>
          <p className="sn-page-subtitle">{device.name} · Power consumption & cost tracking</p>
        </div>
        <StatusPill status="safe" text="ACS712 ACTIVE" />
      </div>

      {!summary.has_data && (
        <PanelCard className="sn-ml-placeholder" style={{ marginBottom: 20 }}>
          <p className="sn-page-subtitle">
            No current-sensor history yet — kWh figures below will populate automatically as the ESP32 reports data over time.
          </p>
        </PanelCard>
      )}

      <div className="sn-grid sn-grid-4">
        <PanelCard title="Live Draw" icon={Zap}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{currentDraw.toFixed(2)}<span className="sn-stat-unit">A</span></span>
            <StatusPill status={currentDraw > 3 ? 'critical' : currentDraw > 2 ? 'warning' : 'safe'} />
          </div>
        </PanelCard>
        <PanelCard title="Est. Wattage" icon={Zap}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{Math.round(currentWatts)}<span className="sn-stat-unit">W</span></span>
            <StatusPill status="safe" />
          </div>
        </PanelCard>
        <PanelCard title="Today" icon={TrendingUp}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">{summary.today_kwh.toFixed(2)}<span className="sn-stat-unit">kWh</span></span>
            <StatusPill status="safe" />
          </div>
        </PanelCard>
        <PanelCard title="Est. Monthly Cost" icon={IndianRupee}>
          <div className="sn-stat-row">
            <span className="readout sn-stat-value">₹{Math.round(monthCost)}</span>
            <StatusPill status="safe" text="PROJECTED" />
          </div>
        </PanelCard>
      </div>

      <div className="sn-dashboard-main">
        <PanelCard title="Current Draw Monitor" icon={Zap} accent>
          <div className="sn-gauge-row" style={{ justifyContent: 'center' }}>
            <DialGauge value={currentDraw} max={5} unit="A" label="ACS712 Reading" size={150} thresholds={{ warning: 2.5, critical: 3.2 }} />
          </div>
          <p className="sn-page-subtitle" style={{ marginTop: 16 }}>
            Per-device breakdown (fan vs lights vs standby) isn't measurable with a single whole-circuit ACS712 sensor —
            this is planned for Phase 8 hardware expansion if per-device current sensing is added.
          </p>
        </PanelCard>

        <PanelCard title="7-Day Usage Trend" icon={TrendingUp}>
          {summary.daily_breakdown.some((d) => d.kwh > 0) ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.daily_breakdown}>
                  <CartesianGrid stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-panel-raised)', border: '1px solid var(--border-subtle)', borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)' }}
                    formatter={(value) => [`${value} kWh`, 'Usage']}
                  />
                  <Bar dataKey="kwh" fill="var(--accent-copper-bright)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="sn-week-total">
                <span>Week Total</span>
                <span className="readout">{summary.week_total_kwh.toFixed(2)} kWh</span>
              </div>
            </>
          ) : (
            <p className="sn-page-subtitle">Not enough history yet to chart a weekly trend.</p>
          )}
        </PanelCard>
      </div>

      <PanelCard title="AI Energy Forecaster" icon={Sparkles} className="sn-ml-placeholder">
        <div className="sn-ml-placeholder-content">
          <Sparkles size={28} className="sn-ml-placeholder-icon" />
          <div>
            <p className="sn-ml-placeholder-title">Predictive forecasting arrives in Phase 6</p>
            <p className="sn-ml-placeholder-desc">
              Once the Linear Regression model is trained on 2 weeks of real usage data, this panel will show
              next-month cost predictions and flag unusual consumption patterns automatically.
            </p>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}