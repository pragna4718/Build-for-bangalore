import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const TIMELINE_STEPS = [
  {
    icon: '⚠️',
    title: 'Anomaly Detected',
    desc: 'Wearable sensors detect abnormal vital readings — heart rate, SpO₂, blood pressure, or body temperature outside safe thresholds.',
    color: '#ffa726',
    time: 'T+0s',
  },
  {
    icon: '🔍',
    title: 'AI Classification',
    desc: 'Detection engine classifies the emergency type (heart attack, cardiac arrest, fainting, heat stroke) with confidence score.',
    color: '#ab47bc',
    time: 'T+1s',
  },
  {
    icon: '🔊',
    title: 'Alarm Triggered',
    desc: 'Loud audio siren activates via Web Audio API. Device vibration pattern starts. Full-screen alert flashes to grab attention of nearby people.',
    color: '#ef5350',
    time: 'T+2s',
  },
  {
    icon: '📞',
    title: 'Emergency Services Contacted',
    desc: 'System initiates call to 112 (India) / 911 (US). GPS location is shared along with detected emergency type and vital readings.',
    color: '#ef5350',
    time: 'T+5s',
  },
  {
    icon: '👥',
    title: 'Emergency Contacts Notified',
    desc: 'All registered emergency contacts receive an instant alert with your location, emergency type, and live vital data.',
    color: '#4fc3f7',
    time: 'T+7s',
  },
  {
    icon: '🩺',
    title: 'First-Aid Instructions Displayed',
    desc: 'Step-by-step emergency-specific instructions are shown on screen — allowing the patient or bystanders to take immediate life-saving action.',
    color: '#66bb6a',
    time: 'T+8s',
  },
  {
    icon: '🚑',
    title: 'Professional Help En Route',
    desc: 'Emergency services are on their way. System continues monitoring vitals and updating the response team with real-time data.',
    color: '#66bb6a',
    time: 'ETA varies',
  },
];

export default function EmergencyTimeline({ isActive }) {
  const timelineRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    if (!timelineRef.current) return;

    itemsRef.current.forEach((item, i) => {
      if (!item) return;
      gsap.fromTo(
        item,
        { opacity: 0, x: -30 },
        {
          opacity: 1,
          x: 0,
          duration: 0.6,
          delay: i * 0.15,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: item,
            start: 'top 85%',
            toggleActions: 'play none none none',
          },
        }
      );
    });

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  return (
    <motion.div
      className="emer-glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem' }}>
        ⚡ Emergency Response Flow
      </h3>
      <p style={{ color: '#8888a0', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
        What happens when an emergency is detected — from detection to professional help
      </p>

      <div className="timeline" ref={timelineRef}>
        {TIMELINE_STEPS.map((step, i) => (
          <div
            key={i}
            className={`timeline-item ${isActive && i <= 2 ? 'visible' : ''}`}
            ref={(el) => (itemsRef.current[i] = el)}
          >
            <div
              className={`timeline-dot ${isActive && i <= 2 ? 'active' : ''}`}
              style={{ borderColor: step.color, color: step.color }}
            />
            <div className="timeline-card">
              <h4>
                {step.icon} {step.title}
              </h4>
              <p>{step.desc}</p>
              <div className="timeline-time">{step.time}</div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
