import { useState, useEffect, useCallback } from 'react';
import { 
  Thermometer, Droplets, Wind, Flame, ShieldAlert, Car, Power, Lightbulb, 
  Fan, Unlock, Activity, Zap, Download, BrainCircuit, Cpu, Sun, Waves, 
  Radio, Fingerprint, History, Gauge
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import client from '../api/client';

export default function Dashboard() {
  const { householdName } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sysStatus, setSysStatus] = useState('Online');
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Expanded Metrics to cover ALL your physical hardware
  const [metrics, setMetrics] = useState({
    temperature: 24.5, humidity: 45.2,
    gas_percent: 12, flame_detected: false,
    car_detected: false, garage_distance_cm: 250,
    water_leak: false, motion: false, 
    is_dark: false, ambient_light_pct: 68, // From LDR
    current_amps: 1.2, power_watts: 276, // From ACS712
    water_tank_pct: 75, // From Ultrasonic #2
    seismic_vibration: 0.02, // From MPU6050
    last_rfid_user: 'OPERATOR_ALPHA',
    last_rfid_time: '10:42 AM'
  });

  const [controls, setControls] = useState({
    light_on: false,
    fan_on: false,
    door_unlocked: false
  });

  const fetchTelemetry = useCallback(async () => {
    try {
      const res = await client.get('/api/sensors/latest/');
      if (res.data && res.data.length > 0) {
        setMetrics(prev => ({ ...prev, ...res.data[0] })); 
        setSysStatus('Online');
      }
    } catch (err) {
      setSysStatus('Offline');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, [fetchTelemetry]);

  const dispatchCommand = async (actuator, actionName) => {
    setControls(prev => ({ ...prev, [actuator]: !prev[actuator] }));
    try {
      await client.post('/api/commands/send/', { device_id: 1, action: actionName });
    } catch (err) {
      setControls(prev => ({ ...prev, [actuator]: !prev[actuator] }));
    }
  };

  const handleDownloadReport = () => {
    setIsDownloading(true);
    setTimeout(() => { setIsDownloading(false); }, 2000);
  };

  // UI Components
  const renderDial = (value, max, label, unit, icon, color) => {
    const safeValue = Number(value) || 0;
    const percentage = Math.min(Math.max(safeValue / max, 0), 1) * 100;
    return (
      <div className="telemetry-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8C95A3', marginBottom: '12px' }}>
          {icon} <span style={{ fontFamily: 'Manrope', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</span>
        </div>
        <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '50%', background: `conic-gradient(${color} ${percentage}%, rgba(255,255,255,0.03) ${percentage}%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', boxShadow: `0 0 15px ${color}15` }}>
          <div style={{ width: '74px', height: '74px', borderRadius: '50%', background: '#161B22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 4px 10px rgba(0,0,0,0.4)' }}>
            <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '1.2rem', fontWeight: 'bold' }}>{safeValue.toFixed(1)}</span>
            <span style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.65rem', fontWeight: 600 }}>{unit}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderBar = (value, label, icon, color) => {
    const safeValue = Number(value) || 0;
    return (
      <div className="telemetry-box" style={{ flexGrow: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8C95A3' }}>
            {icon} <span style={{ fontFamily: 'Manrope', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{label}</span>
          </div>
          <span style={{ fontFamily: 'JetBrains Mono', color: color, fontSize: '0.9rem', fontWeight: 'bold' }}>{safeValue.toFixed(0)}%</span>
        </div>
        <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(Math.max(safeValue, 0), 100)}%`, height: '100%', background: color, borderRadius: '4px', boxShadow: `0 0 10px ${color}` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="sn-page" style={{ paddingBottom: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <style>{`
        .glass-panel {
          background: rgba(22, 27, 34, 0.7); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 16px; padding: 24px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.2); display: flex; flex-direction: column;
        }
        .telemetry-box {
          background: rgba(13, 17, 23, 0.5); border: 1px solid rgba(255,255,255,0.03);
          border-radius: 12px; padding: 16px; transition: transform 0.2s, background 0.2s;
        }
        .telemetry-box:hover { transform: translateY(-2px); background: rgba(13, 17, 23, 0.8); border-color: rgba(255,255,255,0.08); }
        .smart-toggle { appearance: none; width: 44px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 12px; position: relative; cursor: pointer; outline: none; transition: 0.3s; }
        .smart-toggle::after { content: ''; position: absolute; top: 2px; left: 2px; width: 20px; height: 20px; background: #8C95A3; border-radius: 50%; transition: 0.3s cubic-bezier(0.4, 0.0, 0.2, 1); box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .smart-toggle:checked { background: #C6813F; }
        .smart-toggle:checked::after { transform: translateX(20px); background: #ffffff; }
        .live-dot { width: 6px; height: 6px; border-radius: 50%; background: #E15554; box-shadow: 0 0 8px #E15554; animation: blink 1.5s infinite; }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
        .hazard-card { display: flex; align-items: center; gap: 16px; background: rgba(13, 17, 23, 0.5); padding: 16px; border-radius: 12px; transition: 0.2s; border: 1px solid rgba(255,255,255,0.02); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '2.2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>NEXUS COMMAND</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: sysStatus === 'Online' ? 'rgba(76, 175, 125, 0.1)' : 'rgba(225, 85, 84, 0.1)', padding: '4px 10px', borderRadius: '100px', border: sysStatus === 'Online' ? '1px solid rgba(76, 175, 125, 0.2)' : '1px solid rgba(225, 85, 84, 0.2)' }}>
              <Activity size={12} style={{ color: sysStatus === 'Online' ? '#4CAF7D' : '#E15554' }} />
              <span style={{ fontFamily: 'JetBrains Mono', color: sysStatus === 'Online' ? '#4CAF7D' : '#E15554', fontSize: '0.7rem', fontWeight: 700 }}>{sysStatus.toUpperCase()}</span>
            </div>
          </div>
          <p style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', margin: 0, fontSize: '0.85rem', letterSpacing: '0.05em' }}>
            ID: {householdName?.toUpperCase() || 'DOME_ALPHA'} // MULTI_NODE_ARCHITECTURE_ACTIVE
          </p>
        </div>
      </div>

      {/* ROW 1: Environmental & Resource Core (Massive Data Density) */}
      <div className="glass-panel" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <Gauge size={18} style={{ color: '#3B82F6' }} />
          <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1.1rem', fontWeight: 700 }}>Core Telemetry Matrix</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          {renderDial(metrics.temperature, 50, 'Core Temp', '°C', <Thermometer size={14} />, '#E0A868')}
          {renderDial(metrics.humidity, 100, 'Humidity', '%', <Droplets size={14} />, '#4CAF7D')}
          {renderDial(metrics.gas_percent, 100, 'Air Quality', 'AQI', <Wind size={14} />, metrics.gas_percent > 40 ? '#E15554' : '#C6813F')}
          {renderDial(metrics.current_amps, 5, 'Power Draw', 'AMP', <Power size={14} />, '#3B82F6')}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', gridColumn: 'span 2' }}>
            {renderBar(metrics.water_tank_pct, 'Reservoir Tank Level (Ultrasonic 2)', <Waves size={14} />, '#3B82F6')}
            {renderBar(metrics.ambient_light_pct, 'Ambient Light Index (LDR)', <Sun size={14} />, '#E0A868')}
          </div>
        </div>
      </div>

      {/* ROW 2: 3-Column Advanced Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px', marginBottom: '24px' }}>
        
        {/* COLUMN 1: AI, Power, & Structural (MPU6050 & ACS712) */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <BrainCircuit size={18} style={{ color: '#C6813F' }} />
            <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1rem', fontWeight: 700 }}>AI & Structural Health</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Structural Vibration (MPU6050) */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Activity size={14} /> Seismic / Vibration
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '1.4rem', fontWeight: 'bold' }}>{metrics.seismic_vibration.toFixed(3)} <span style={{ fontSize: '0.8rem', color: '#8C95A3' }}>G-FORCE</span></span>
              </div>
              <div className="live-dot" />
            </div>

            {/* Power Calc */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                  <Zap size={14} /> Est. Load Wattage
                </span>
                <span style={{ fontFamily: 'JetBrains Mono', color: '#3B82F6', fontSize: '1.4rem', fontWeight: 'bold' }}>{metrics.power_watts} <span style={{ fontSize: '0.8rem', color: '#8C95A3' }}>W</span></span>
              </div>
            </div>

            <button onClick={handleDownloadReport} disabled={isDownloading} style={{ width: '100%', background: 'linear-gradient(135deg, rgba(198, 129, 63, 0.2) 0%, rgba(198, 129, 63, 0.05) 100%)', border: '1px solid rgba(198, 129, 63, 0.4)', color: '#EDEFF3', padding: '14px', borderRadius: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: isDownloading ? 'wait' : 'pointer', fontFamily: 'JetBrains Mono', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s', marginTop: 'auto' }}>
              {isDownloading ? <Activity size={16} className="lucide-spin" /> : <Download size={16} />}
              {isDownloading ? 'COMPILING_DATA...' : 'GENERATE_AI_REPORT'}
            </button>
          </div>
        </div>

        {/* COLUMN 2: Access & Perimeter (RFID, Servo, Ultrasonic 1) */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Unlock size={18} style={{ color: '#4CAF7D' }} />
            <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1rem', fontWeight: 700 }}>Perimeter & Access</span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Gate Control */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ display: 'block', fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.9rem', fontWeight: 600 }}>Front Gate Lock (Servo)</span>
                <span style={{ fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.75rem' }}>Remote GUI Override</span>
              </div>
              <button onClick={() => dispatchCommand('door_unlocked', 'unlock_door')} style={{ background: controls.door_unlocked ? '#4CAF7D' : 'rgba(255,255,255,0.05)', color: controls.door_unlocked ? '#12161B' : '#EDEFF3', border: controls.door_unlocked ? 'none' : '1px solid rgba(255,255,255,0.1)', padding: '8px 20px', borderRadius: '100px', fontFamily: 'JetBrains Mono', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}>
                {controls.door_unlocked ? 'UNLOCKED' : 'LOCKED'}
              </button>
            </div>

            {/* Garage Sonar */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Car size={24} style={{ color: metrics.car_detected ? '#C6813F' : '#8C95A3' }} />
                <div>
                  <span style={{ display: 'block', fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.9rem', fontWeight: 600 }}>Garage Bay (Ultrasonic 1)</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: metrics.car_detected ? '#C6813F' : '#8C95A3', fontSize: '0.75rem', fontWeight: 700 }}>
                    {metrics.car_detected ? `OCCUPIED // ${metrics.garage_distance_cm}cm` : `CLEAR // ${metrics.garage_distance_cm}cm`}
                  </span>
                </div>
              </div>
            </div>

            {/* RFID Log */}
            <div className="telemetry-box" style={{ marginTop: 'auto' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'Manrope', color: '#8C95A3', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                <History size={14} /> Last RFID Scan (RC522)
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: 'JetBrains Mono', color: '#EDEFF3', fontSize: '0.9rem' }}>{metrics.last_rfid_user}</span>
                <span style={{ fontFamily: 'JetBrains Mono', color: '#8C95A3', fontSize: '0.75rem' }}>{metrics.last_rfid_time}</span>
              </div>
            </div>

          </div>
        </div>

        {/* COLUMN 3: Internal Environment (Relays & PIR) */}
        <div className="glass-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Zap size={18} style={{ color: '#E0A868' }} />
            <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1rem', fontWeight: 700 }}>Internal Actors</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Actuators */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Lightbulb size={20} style={{ color: controls.light_on ? '#E0A868' : '#8C95A3' }} />
                <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.95rem', fontWeight: 600 }}>Primary Lighting (Relay)</span>
              </div>
              <input type="checkbox" className="smart-toggle" checked={controls.light_on} onChange={(e) => dispatchCommand('light_on', e.target.checked ? 'light_on' : 'light_off')} />
            </div>

            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Fan size={20} style={{ color: controls.fan_on ? '#3B82F6' : '#8C95A3' }} />
                <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.95rem', fontWeight: 600 }}>Cooling Fan (L298N)</span>
              </div>
              <input type="checkbox" className="smart-toggle" checked={controls.fan_on} onChange={(e) => dispatchCommand('fan_on', e.target.checked ? 'fan_on' : 'fan_off')} />
            </div>

            {/* PIR Status */}
            <div className="telemetry-box" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', border: metrics.motion ? '1px solid rgba(198, 129, 63, 0.4)' : '' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Radio size={20} style={{ color: metrics.motion ? '#C6813F' : '#8C95A3' }} />
                <div>
                  <span style={{ display: 'block', fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.9rem', fontWeight: 600 }}>Room Presence (PIR)</span>
                  <span style={{ fontFamily: 'JetBrains Mono', color: metrics.motion ? '#C6813F' : '#8C95A3', fontSize: '0.75rem', fontWeight: 700 }}>
                    {metrics.motion ? 'MOTION_DETECTED' : 'ZONE_IDLE'}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ROW 3: Hazard & Emergency Subsystems */}
      <div className="glass-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <ShieldAlert size={18} style={{ color: '#E15554' }} />
          <span style={{ fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '1rem', fontWeight: 700 }}>Emergency Hazard Bus</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          
          <div className="hazard-card" style={{ background: metrics.flame_detected ? 'rgba(225,85,84,0.1)' : 'rgba(13, 17, 23, 0.5)', borderColor: metrics.flame_detected ? '#E15554' : 'rgba(255,255,255,0.02)' }}>
            <div style={{ background: metrics.flame_detected ? '#E15554' : 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '50%' }}>
              <Flame size={24} style={{ color: metrics.flame_detected ? '#fff' : '#8C95A3' }} />
            </div>
            <div>
              <span style={{ display: 'block', fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.95rem', fontWeight: 600 }}>Kitchen Fire Array</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: metrics.flame_detected ? '#E15554' : '#4CAF7D', fontSize: '0.8rem', fontWeight: 700 }}>{metrics.flame_detected ? 'CRITICAL_FIRE' : 'SAFE'}</span>
            </div>
          </div>

          <div className="hazard-card" style={{ background: metrics.water_leak ? 'rgba(225,85,84,0.1)' : 'rgba(13, 17, 23, 0.5)', borderColor: metrics.water_leak ? '#E15554' : 'rgba(255,255,255,0.02)' }}>
            <div style={{ background: metrics.water_leak ? '#3B82F6' : 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '50%' }}>
              <Droplets size={24} style={{ color: metrics.water_leak ? '#fff' : '#8C95A3' }} />
            </div>
            <div>
              <span style={{ display: 'block', fontFamily: 'Manrope', color: '#EDEFF3', fontSize: '0.95rem', fontWeight: 600 }}>Plumbing Integrity</span>
              <span style={{ fontFamily: 'JetBrains Mono', color: metrics.water_leak ? '#E15554' : '#4CAF7D', fontSize: '0.8rem', fontWeight: 700 }}>{metrics.water_leak ? 'LEAK_DETECTED' : 'DRY'}</span>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
} 