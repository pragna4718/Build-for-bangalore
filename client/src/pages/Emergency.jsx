import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import EmergencyHero from '../components/Emergency/EmergencyHero';
import VitalsMonitor from '../components/Emergency/VitalsMonitor';
import { detectEmergency, FIRST_AID_GUIDES } from '../components/Emergency/EmergencyDetector';
import SOSButton from '../components/Emergency/SOSButton';
import AlarmSystem from '../components/Emergency/AlarmSystem';
import EmergencyContacts from '../components/Emergency/EmergencyContacts';
import FirstAidGuide from '../components/Emergency/FirstAidGuide';
import EmergencyTimeline from '../components/Emergency/EmergencyTimeline';
import { useVitals } from '../context/VitalsContext';
import { detectEmergencyAI } from '../services/healthService';
import '../components/Emergency/Emergency.css';

gsap.registerPlugin(ScrollTrigger);

export default function Emergency() {
  const navigate = useNavigate();

  // Use shared vitals from context
  const { vitals, scenario, isWearableConnected, simulateScenario } = useVitals();

  const [detection, setDetection] = useState(null);
  const [alarmActive, setAlarmActive] = useState(false);
  const [emergencyActive, setEmergencyActive] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [firstAidSteps, setFirstAidSteps] = useState([]);
  const [emergencyTypeName, setEmergencyTypeName] = useState('');
  const [aiDetectionMeta, setAiDetectionMeta] = useState({ source: 'local', synced: false });

  const sectionsRef = useRef([]);
  const lenisRef = useRef(null);
  const aiRequestInFlightRef = useRef(false);
  const lastAiCallAtRef = useRef(0);

  const EMERGENCY_TYPE_MAP = {
    cardiac_arrest: 'Cardiac Arrest',
    heart_attack: 'Heart Attack',
    tachycardia: 'Heart Attack',
    hypertensive_crisis: 'Heart Attack',
    bradycardia: 'Severe Bradycardia',
    hypoxia: 'Respiratory Distress',
    fainting: 'Fainting / Syncope',
    syncope: 'Fainting / Syncope',
    heat_stroke: 'Heat Stroke',
    severe_hypotension: 'Severe Hypotension',
    respiratory_distress: 'Respiratory Distress',
  };

  // ── Run detection whenever vitals change ─────────────────────
  useEffect(() => {
    if (!vitals || !vitals.heartRate) return;

    const result = detectEmergency(vitals);
    setDetection(result);
    setAiDetectionMeta((prev) => ({ ...prev, source: 'local' }));

    // Auto-trigger if emergency severity
    if (result && result.severity === 'emergency' && !emergencyActive) {
      setEmergencyActive(true);
      setAlarmActive(true);
    }
  }, [vitals, emergencyActive]);

  // ── AI emergency detection with local fallback ─────────────────────
  useEffect(() => {
    if (!vitals || !vitals.heartRate) return;

    const now = Date.now();
    // Avoid spamming API while vitals stream every 2s.
    if (aiRequestInFlightRef.current || now - lastAiCallAtRef.current < 8000) return;

    const runAiDetection = async () => {
      aiRequestInFlightRef.current = true;
      try {
        const response = await detectEmergencyAI({
          userId: 'demo-user',
          heartRate: Math.round(vitals.heartRate),
          bloodPressureSystolic: Math.round(vitals.bloodPressure?.systolic || 120),
          oxygenSaturation: Math.round(vitals.spo2 || 98),
          lossOfConsciousness: scenario === 'cardiac-arrest',
        });

        const ai = response?.data;
        if (!ai) return;

        if (!ai.emergency) {
          setDetection(null);
          setAiDetectionMeta({ source: 'ai', synced: true });
          return;
        }

        const mappedType = EMERGENCY_TYPE_MAP[(ai.emergencyType || '').toLowerCase()] || 'Heart Attack';
        const severity = ai.callEmergencyServices ? 'emergency' : 'pre-emergency';

        setDetection({
          type: mappedType,
          icon: severity === 'emergency' ? '🚨' : '⚠️',
          severity,
          color: severity === 'emergency' ? '#ef5350' : '#ffa726',
          confidence: ai.confidence || 85,
          details: ai.instructions?.[0] || `AI detected ${mappedType}.`,
        });
        setAiDetectionMeta({ source: 'ai', synced: true });

        if (ai.callEmergencyServices && !emergencyActive) {
          setEmergencyActive(true);
          setAlarmActive(true);
        }
      } catch {
        setAiDetectionMeta({ source: 'local', synced: false });
      } finally {
        lastAiCallAtRef.current = Date.now();
        aiRequestInFlightRef.current = false;
      }
    };

    runAiDetection();
  }, [vitals, scenario, emergencyActive]);

  // ── Update first-aid when detection changes ──
  useEffect(() => {
    if (detection) {
      const guide = FIRST_AID_GUIDES[detection.type];
      setFirstAidSteps(guide || []);
      setEmergencyTypeName(detection.type);
    } else {
      setFirstAidSteps([]);
      setEmergencyTypeName('');
    }
  }, [detection]);

  // ── SOS trigger handler ─────────────────────
  const handleSOSTrigger = useCallback(() => {
    setEmergencyActive(true);
    setAlarmActive(true);
  }, []);

  const handleSOSCancel = useCallback(() => {
    setEmergencyActive(false);
    setAlarmActive(false);
    simulateScenario('normal');
  }, [simulateScenario]);

  const handleAlarmMute = useCallback(() => {
    setAlarmActive(false);
  }, []);

  // ── Demo scenario control (uses shared context) ─────────────────
  const handleDemoChange = (newScenario) => {
    if (newScenario === 'normal') {
      setEmergencyActive(false);
      setAlarmActive(false);
    }
    simulateScenario(newScenario);
  };

  // ── Lenis Smooth Scrolling ─────────────────
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => lenis.destroy();
  }, []);

  // ── GSAP Scroll Animations ─────────────────
  useEffect(() => {
    sectionsRef.current.forEach((section) => {
      if (!section) return;
      gsap.fromTo(
        section,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 85%',
            end: 'top 50%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  // Get overall severity for hero
  const getSeverity = () => {
    if (emergencyActive) return 'emergency';
    if (detection?.severity === 'emergency') return 'emergency';
    if (detection?.severity === 'pre-emergency') return 'warning';
    return 'safe';
  };

  const severity = getSeverity();

  return (
    <div className="emergency-page">
      {/* Alarm Overlay */}
      <AlarmSystem active={alarmActive} onMute={handleAlarmMute} />

      {/* Nav */}
      <nav className="emergency-nav">
        <button className="emergency-nav-back" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <span className="emergency-nav-title">Emergency Life Saver</span>
        <span className="emergency-nav-status">
          <span className={`status-dot ${severity}`} />
          {severity === 'safe' ? 'Monitoring' : severity === 'warning' ? 'Alert' : 'EMERGENCY'}
        </span>
      </nav>

      <div className="emergency-content">
        {/* Wearable Connection Status */}
        <div className="wearable-sync-banner">
          <span className={`sync-dot ${isWearableConnected ? 'connected' : ''}`} />
          {isWearableConnected ? (
            <span>
              📡 Receiving live data from Wearable — <strong>HR: {Math.round(vitals.heartRate || 72)} bpm</strong>, <strong>SpO₂: {Math.round(vitals.spo2 || 97)}%</strong>
              {' '}| {aiDetectionMeta.source === 'ai' ? 'AI+Local detection active' : 'Local fallback active'}
            </span>
          ) : (
            <span>⚠️ Wearable not connected — <button onClick={() => navigate('/wearable')} className="sync-link">Go to Wearable</button></span>
          )}
        </div>

        {/* Demo Controls */}
        <div className="demo-controls">
          <span className="demo-label">🧪 Demo Mode — Simulate Emergency Scenarios:</span>
          {[
            { key: 'normal', label: '✅ Normal' },
            { key: 'heart-attack', label: '💔 Heart Attack' },
            { key: 'cardiac-arrest', label: '🫀 Cardiac Arrest' },
            { key: 'fainting', label: '😵 Fainting' },
            { key: 'heat-stroke', label: '🔥 Heat Stroke' },
            { key: 'hypotension', label: '📉 Hypotension' },
          ].map((s) => (
            <button
              key={s.key}
              className={`demo-btn ${scenario === s.key ? 'active' : ''}`}
              onClick={() => handleDemoChange(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* 1. Hero */}
        <EmergencyHero
          severity={severity}
          heartRate={vitals.heartRate}
          spo2={vitals.spo2}
        />

        {/* 2. Detection Status */}
        <AnimatePresence mode="wait">
          {detection ? (
            <motion.div
              key="detected"
              className={`detection-banner ${detection.severity}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="detection-icon">{detection.icon}</span>
              <div className="detection-info">
                <h3 style={{ color: detection.color }}>
                  {detection.severity === 'emergency' ? '🚨 ' : '⚠️ '}
                  {detection.type}
                  <span style={{ fontSize: '0.75rem', marginLeft: '0.5rem', opacity: 0.7 }}>
                    ({detection.confidence}% confidence)
                  </span>
                </h3>
                <p>{detection.details}</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="safe"
              className="detection-banner safe"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <span className="detection-icon">✅</span>
              <div className="detection-info">
                <h3 style={{ color: '#66bb6a' }}>All Vitals Normal</h3>
                <p>Continuous monitoring active — system will alert automatically if anomaly detected.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3. Vitals Monitor */}
        <div ref={(el) => (sectionsRef.current[0] = el)}>
          <div className="emer-section-header">
            <span className="section-icon">📡</span>
            <h2>Live Vital Signs</h2>
          </div>
          <p className="emer-section-subtitle">
            Real-time wearable data stream with continuous anomaly detection
          </p>
          <VitalsMonitor vitals={vitals} />
        </div>

        {/* 4. SOS Button */}
        <div ref={(el) => (sectionsRef.current[1] = el)}>
          <div className="emer-section-header">
            <span className="section-icon">🆘</span>
            <h2>Emergency SOS</h2>
          </div>
          <p className="emer-section-subtitle">
            Hold the button for 2 seconds to manually trigger emergency response
          </p>
          <SOSButton
            onTrigger={handleSOSTrigger}
            onCancel={handleSOSCancel}
            isActive={emergencyActive}
            emergencyType={emergencyTypeName}
          />
        </div>

        {/* 5. First Aid Guide */}
        <div ref={(el) => (sectionsRef.current[2] = el)}>
          <div className="emer-section-header">
            <span className="section-icon">🩺</span>
            <h2>First-Aid Instructions</h2>
          </div>
          <p className="emer-section-subtitle">
            Context-aware, step-by-step guidance for bystanders and patients
          </p>
          <FirstAidGuide
            emergencyType={emergencyTypeName}
            steps={firstAidSteps}
          />
        </div>

        {/* 6. Emergency Timeline */}
        <div ref={(el) => (sectionsRef.current[3] = el)}>
          <div className="emer-section-header">
            <span className="section-icon">⚡</span>
            <h2>Response Flow</h2>
          </div>
          <p className="emer-section-subtitle">
            From anomaly detection to professional medical help — every second counts
          </p>
          <EmergencyTimeline isActive={emergencyActive} />
        </div>

        {/* 7. Emergency Contacts */}
        <div ref={(el) => (sectionsRef.current[4] = el)}>
          <div className="emer-section-header">
            <span className="section-icon">👥</span>
            <h2>Emergency Contacts</h2>
          </div>
          <p className="emer-section-subtitle">
            People who will be automatically notified when SOS is triggered
          </p>
          <EmergencyContacts
            contacts={contacts}
            isEmergencyActive={emergencyActive}
            onUpdateContacts={setContacts}
          />
        </div>
      </div>
    </div>
  );
}
