import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';

export default function HealthAlerts({ alerts = [] }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current && alerts.length > 0) {
      const cards = listRef.current.querySelectorAll('.health-alert-card');
      gsap.fromTo(
        cards,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          stagger: 0.12,
          duration: 0.5,
          ease: 'power2.out',
        }
      );
    }
  }, [alerts]);

  const getSeverityColor = (severity) => {
    const colors = {
      low: '#4fc3f7',
      moderate: '#ffa726',
      high: '#ef5350',
      severe: '#d32f2f',
    };
    return colors[severity] || '#4fc3f7';
  };

  const getSeverityBg = (severity) => {
    const colors = {
      low: 'rgba(79, 195, 247, 0.15)',
      moderate: 'rgba(255, 167, 38, 0.15)',
      high: 'rgba(239, 83, 80, 0.15)',
      severe: 'rgba(211, 47, 47, 0.2)',
    };
    return colors[severity] || 'rgba(79, 195, 247, 0.15)';
  };

  const getAlertIcon = (type) => {
    const icons = {
      uv: '☀️',
      heat: '🌡️',
      cold: '❄️',
      aqi: '🌫️',
      pm25: '💨',
      no2: '🏭',
      o3: '⚡',
      co: '💀',
    };
    return icons[type] || '⚠️';
  };

  if (alerts.length === 0) {
    return (
      <motion.div
        className="expo-glass-card expo-no-alerts"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="expo-no-alerts-icon">✅</div>
        <p style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.25rem' }}>
          All Clear!
        </p>
        <p>No environmental health alerts at this time. Conditions are safe.</p>
      </motion.div>
    );
  }

  return (
    <div className="health-alerts-list" ref={listRef}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          className={`health-alert-card severity-${alert.severity}`}
        >
          <div className="health-alert-header">
            <span className="health-alert-title">
              {getAlertIcon(alert.type)} {alert.title}
            </span>
            <span
              className="health-alert-severity"
              style={{
                color: getSeverityColor(alert.severity),
                background: getSeverityBg(alert.severity),
              }}
            >
              {alert.severity}
            </span>
          </div>
          <p className="health-alert-message">{alert.message}</p>
          <div className="health-alert-recommendations">
            {(alert.recommendations || []).map((rec, j) => (
              <span key={j} className="health-alert-rec">
                ✓ {rec}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
