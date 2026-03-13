import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';

// Generate ECG-like waveform data point
function generateECGPoint(index, heartRate) {
  const cycleLen = Math.round(120 / (heartRate / 60));
  const pos = index % cycleLen;
  const phase = pos / cycleLen;

  if (phase < 0.1) return 0; // baseline
  if (phase < 0.15) return 0.15; // P wave
  if (phase < 0.2) return 0;
  if (phase < 0.22) return -0.1; // Q
  if (phase < 0.28) return 1.0; // R peak
  if (phase < 0.32) return -0.25; // S
  if (phase < 0.5) return 0; // ST segment
  if (phase < 0.6) return 0.2; // T wave
  return 0; // baseline
}

export default function VitalsMonitor({ vitals, onVitalsChange }) {
  const [ecgData, setEcgData] = useState([]);
  const ecgIndex = useRef(0);

  // Generate ECG data stream
  useEffect(() => {
    const interval = setInterval(() => {
      setEcgData(prev => {
        const newData = [...prev];
        for (let i = 0; i < 3; i++) {
          ecgIndex.current += 1;
          newData.push({
            idx: ecgIndex.current,
            val: generateECGPoint(ecgIndex.current, vitals.heartRate || 72),
          });
        }
        // Keep last 200 points
        return newData.slice(-200);
      });
    }, 50);

    return () => clearInterval(interval);
  }, [vitals.heartRate]);

  const getVitalStatus = (type, value) => {
    switch (type) {
      case 'hr':
        if (value > 150 || value < 40) return 'critical';
        if (value > 120 || value < 50) return 'warning';
        return 'normal';
      case 'spo2':
        if (value < 88) return 'critical';
        if (value < 92) return 'warning';
        return 'normal';
      case 'bp-sys':
        if (value > 180 || value < 80) return 'critical';
        if (value > 140 || value < 90) return 'warning';
        return 'normal';
      case 'temp':
        if (value > 40 || value < 35) return 'critical';
        if (value > 38 || value < 36) return 'warning';
        return 'normal';
      default:
        return 'normal';
    }
  };

  const hrStatus = getVitalStatus('hr', vitals.heartRate);
  const spo2Status = getVitalStatus('spo2', vitals.spo2);
  const bpStatus = getVitalStatus('bp-sys', vitals.bloodPressure?.systolic);
  const tempStatus = getVitalStatus('temp', vitals.temperature);

  const vitalCards = [
    {
      icon: '❤️',
      label: 'Heart Rate',
      value: vitals.heartRate || '--',
      unit: 'bpm',
      status: hrStatus,
    },
    {
      icon: '🫁',
      label: 'SpO₂',
      value: vitals.spo2 || '--',
      unit: '%',
      status: spo2Status,
    },
    {
      icon: '🩸',
      label: 'Blood Pressure',
      value: vitals.bloodPressure ? `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}` : '--',
      unit: 'mmHg',
      status: bpStatus,
    },
    {
      icon: '🌡️',
      label: 'Body Temp',
      value: vitals.temperature ? vitals.temperature.toFixed(1) : '--',
      unit: '°C',
      status: tempStatus,
    },
  ];

  return (
    <motion.div
      className="emer-glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem', fontWeight: 700 }}>
        📡 Real-Time Vitals Monitor
      </h3>
      <p style={{ color: '#8888a0', fontSize: '0.8rem', marginBottom: '1.25rem' }}>
        Continuous wearable data stream — anomalies trigger automatic emergency detection
      </p>

      {/* Vital Cards Grid */}
      <div className="vitals-grid">
        {vitalCards.map((vital, i) => (
          <motion.div
            key={vital.label}
            className={`vital-card ${vital.status}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="vital-card-header">
              <span className="vital-card-icon">{vital.icon}</span>
              <span className={`vital-card-badge vital-badge-${vital.status}`}>
                {vital.status}
              </span>
            </div>
            <div className="vital-card-value">
              {vital.value}
              <span className="vital-card-unit"> {vital.unit}</span>
            </div>
            <div className="vital-card-label">{vital.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ECG Waveform */}
      <div className="ecg-container" style={{
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '10px',
        padding: '0.5rem',
        border: '1px solid rgba(239, 83, 80, 0.1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', marginBottom: '0.25rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#ef5350', fontWeight: 600, letterSpacing: '0.05em' }}>
            ECG WAVEFORM
          </span>
          <span style={{ fontSize: '0.7rem', color: '#8888a0' }}>
            {vitals.heartRate || 72} bpm
          </span>
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={ecgData}>
            <YAxis domain={[-0.5, 1.2]} hide />
            <Line
              type="monotone"
              dataKey="val"
              stroke={hrStatus === 'critical' ? '#ef5350' : hrStatus === 'warning' ? '#ffa726' : '#66bb6a'}
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
