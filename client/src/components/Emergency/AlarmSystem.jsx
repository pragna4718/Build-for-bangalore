import { useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AlarmSystem({ active, onMute }) {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);
  const gainRef = useRef(null);
  const intervalRef = useRef(null);

  const startAlarm = useCallback(() => {
    try {
      // Web Audio API siren
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = ctx;

      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);

      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();

      oscillatorRef.current = oscillator;
      gainRef.current = gain;

      // Alternate frequencies for siren effect
      let high = true;
      intervalRef.current = setInterval(() => {
        if (oscillatorRef.current) {
          oscillatorRef.current.frequency.setValueAtTime(
            high ? 1200 : 800,
            audioContextRef.current.currentTime
          );
          high = !high;
        }
      }, 400);

      // Vibrate if supported
      if (navigator.vibrate) {
        navigator.vibrate([500, 200, 500, 200, 500, 200, 500]);
      }
    } catch (err) {
      console.warn('Audio alarm failed:', err);
    }
  }, []);

  const stopAlarm = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) { /* already stopped */ }
      oscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  useEffect(() => {
    if (active) {
      startAlarm();
    } else {
      stopAlarm();
    }
    return () => stopAlarm();
  }, [active, startAlarm, stopAlarm]);

  const handleMute = () => {
    stopAlarm();
    if (onMute) onMute();
  };

  return (
    <AnimatePresence>
      {active && (
        <>
          {/* Red flash overlay */}
          <motion.div
            className="alarm-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Alarm controls */}
          <motion.div
            className="alarm-controls"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <button className="alarm-mute-btn" onClick={handleMute}>
              🔇 Mute Alarm
            </button>
            <a
              href="tel:112"
              className="alarm-mute-btn"
              style={{ borderColor: '#66bb6a', color: '#66bb6a', textDecoration: 'none' }}
            >
              📞 Call 112
            </a>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
