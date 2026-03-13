import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import ExposomeHero from '../components/Exposome/ExposomeHero';
import WeatherCard from '../components/Exposome/WeatherCard';
import AQIPanel from '../components/Exposome/AQIPanel';
import ExposomeRadar from '../components/Exposome/ExposomeRadar';
import HealthAlerts from '../components/Exposome/HealthAlerts';
import CalendarSuggestions from '../components/Exposome/CalendarSuggestions';
import '../components/Exposome/Exposome.css';

import { getCurrentExposome } from '../services/healthService';
import api from '../services/api';

gsap.registerPlugin(ScrollTrigger);

export default function Exposome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const [exposomeData, setExposomeData] = useState({
    weather: {},
    aqi: 2,
    aqiCategory: 'Fair',
    uvIndex: 0,
    sunlightIntensity: 'low',
    pollutants: {},
    alerts: [],
    location: {},
  });
  const [suggestions, setSuggestions] = useState([]);

  const sectionsRef = useRef([]);
  const lenisRef = useRef(null);

  // ── Fetch Exposome Data ─────────────────────────────────
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get user location
      let lat = 12.97;
      let lon = 77.59;

      try {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            enableHighAccuracy: false,
          });
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        // Default to Bangalore
      }

      const response = await getCurrentExposome(lat, lon);
      const data = response.data;

      setExposomeData(data);
      setIsMock(!!data._mock);
    } catch (err) {
      console.warn('Failed to fetch exposome data, using defaults:', err.message);
      // Use embedded fallback data so the UI always renders
      setExposomeData({
        weather: {
          temp: 28, feelsLike: 31, humidity: 65,
          description: 'Partly cloudy', icon: '02d',
          windSpeed: 3.5, pressure: 1012, visibility: 8000,
          clouds: 40,
        },
        aqi: 2,
        aqiCategory: 'Fair',
        uvIndex: 6,
        sunlightIntensity: 'high',
        pollutants: { pm25: 22.5, pm10: 38.4, co: 320.4, no2: 18.7, o3: 68.2 },
        alerts: [
          {
            type: 'uv', severity: 'moderate',
            title: 'Moderate UV Exposure',
            message: 'UV index is 6 — some protection recommended.',
            recommendations: ['Apply SPF 30+ sunscreen', 'Wear sunglasses outdoors', 'Seek shade during peak hours'],
          },
        ],
        location: { lat: 12.97, lon: 77.59, city: 'Bangalore', country: 'IN' },
        _mock: true,
      });
      setIsMock(true);
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch Calendar Suggestions ──────────────────────────
  const fetchSuggestions = async (schedule) => {
    try {
      let lat = exposomeData.location?.lat || 12.97;
      let lon = exposomeData.location?.lon || 77.59;

      const response = await api.post('/exposome/suggestions', {
        schedule,
        lat,
        lon,
      });
      setSuggestions(response.data.suggestions || []);
    } catch {
      // Generate client-side suggestions as fallback
      const fallback = generateFallbackSuggestions(schedule, exposomeData);
      setSuggestions(fallback);
    }
  };

  // ── Lenis Smooth Scrolling ──────────────────────────────
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

    // Sync Lenis with GSAP ScrollTrigger
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    return () => {
      lenis.destroy();
    };
  }, []);

  // ── GSAP Scroll Animations ─────────────────────────────
  useEffect(() => {
    if (loading) return;

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

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, [loading]);

  // ── Loading State ───────────────────────────────────────
  if (loading) {
    return (
      <div className="exposome-page">
        <div className="exposome-content">
          <div className="expo-loading">
            <div className="expo-spinner" />
            <span className="expo-loading-text">Loading environmental data...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="exposome-page">
      {/* Nav */}
      <nav className="exposome-nav">
        <button className="exposome-nav-back" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <span className="exposome-nav-title">Exposome Radar</span>
        <span className="exposome-nav-location">
          📍 {exposomeData.location?.city || 'Unknown'}, {exposomeData.location?.country || ''}
        </span>
      </nav>

      <div className="exposome-content">
        {/* Mock Data Banner */}
        {isMock && (
          <motion.div
            className="expo-mock-banner"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            ⚠️ Showing demo data. Add your <code>OPENWEATHER_API_KEY</code> in <code>server/.env</code> for live data.
          </motion.div>
        )}

        {/* 1. Hero */}
        <ExposomeHero
          aqi={exposomeData.aqi}
          weather={exposomeData.weather}
          uvIndex={exposomeData.uvIndex}
        />

        {/* 2. Weather + AQI */}
        <div
          ref={(el) => (sectionsRef.current[0] = el)}
          className="expo-section-header"
        >
          <span className="section-icon">🌤️</span>
          <h2>Current Conditions</h2>
        </div>
        <p className="expo-section-subtitle">
          Real-time weather and air quality for your location
        </p>
        <div className="expo-grid-2" style={{ alignItems: 'start' }}>
          <div>
            <WeatherCard weather={exposomeData.weather} />
            {/* Calendar Suggestions — below weather in left column */}
            <div style={{ marginTop: '1.5rem' }}>
              <div className="expo-section-header" style={{ marginTop: '0' }}>
                <span className="section-icon">📅</span>
                <h2>Smart Health Windows</h2>
              </div>
              <p className="expo-section-subtitle">
                Schedule-aware suggestions for micro health activities in your free time
              </p>
              <CalendarSuggestions
                suggestions={suggestions}
                onFetchSuggestions={fetchSuggestions}
              />
            </div>
          </div>
          <AQIPanel
            aqi={exposomeData.aqi}
            aqiCategory={exposomeData.aqiCategory}
            pollutants={exposomeData.pollutants}
          />
        </div>

        {/* 3. Radar Chart */}
        <div
          ref={(el) => (sectionsRef.current[1] = el)}
        >
          <div className="expo-section-header">
            <span className="section-icon">📊</span>
            <h2>Risk Overview</h2>
          </div>
          <p className="expo-section-subtitle">
            Normalized environmental metrics — higher values indicate higher exposure risk
          </p>
          <ExposomeRadar
            weather={exposomeData.weather}
            pollutants={exposomeData.pollutants}
            aqi={exposomeData.aqi}
            uvIndex={exposomeData.uvIndex}
          />
        </div>

        {/* 4. Health Alerts */}
        <div
          ref={(el) => (sectionsRef.current[2] = el)}
        >
          <div className="expo-section-header">
            <span className="section-icon">🛡️</span>
            <h2>Health Alerts & Protection</h2>
          </div>
          <p className="expo-section-subtitle">
            Actionable warnings based on current environmental conditions
          </p>
          <HealthAlerts alerts={exposomeData.alerts} />
        </div>
      </div>
    </div>
  );
}

// ── Client-side fallback suggestions ─────────────────────
function generateFallbackSuggestions(schedule, data) {
  const suggestions = [];
  const weather = data.weather || {};
  const aqi = data.aqi || 2;
  const nice = (weather.temp >= 15 && weather.temp <= 32 && aqi <= 2);
  const hour = new Date().getHours();

  if (!schedule || schedule.length === 0) {
    suggestions.push({
      timeSlot: hour < 12 ? 'Morning' : 'Evening',
      activity: nice ? 'Go for a walk outside' : 'Indoor stretching session',
      reason: nice
        ? `Weather is pleasant (${weather.temp || 28}°C) and air quality is good.`
        : 'Indoor activity recommended given current conditions.',
      duration: '15-20 mins',
      icon: nice ? '🚶' : '🧘',
    });
    suggestions.push({
      timeSlot: 'Anytime',
      activity: 'Hydration reminder',
      reason: `Temperature: ${weather.temp || 28}°C. Aim for 8 glasses of water today.`,
      duration: '1 min',
      icon: '💧',
    });
    return suggestions;
  }

  const sorted = [...schedule].sort((a, b) => a.start.localeCompare(b.start));

  for (let i = 0; i < sorted.length - 1; i++) {
    const endMins = parseInt(sorted[i].end.split(':')[0]) * 60 + parseInt(sorted[i].end.split(':')[1]);
    const startMins = parseInt(sorted[i + 1].start.split(':')[0]) * 60 + parseInt(sorted[i + 1].start.split(':')[1]);
    const gap = startMins - endMins;

    if (gap >= 10 && gap <= 30 && nice && /breakfast|lunch|dinner|meal/i.test(sorted[i].title)) {
      suggestions.push({
        timeSlot: `${sorted[i].end} – ${sorted[i + 1].start}`,
        activity: 'Take a post-meal walk',
        reason: `Pleasant weather (${weather.temp}°C) after ${sorted[i].title.toLowerCase()} — walking aids digestion.`,
        duration: `${Math.min(gap, 20)} mins`,
        icon: '🚶',
      });
    } else if (gap >= 15) {
      suggestions.push({
        timeSlot: `${sorted[i].end} – ${sorted[i + 1].start}`,
        activity: 'Quick stretching break',
        reason: 'Short break to stretch reduces muscle tension and boosts energy.',
        duration: '10 mins',
        icon: '🧘',
      });
    } else if (gap >= 5) {
      suggestions.push({
        timeSlot: `${sorted[i].end} – ${sorted[i + 1].start}`,
        activity: 'Deep breathing exercise',
        reason: 'Box breathing reduces stress and sharpens focus.',
        duration: '5 mins',
        icon: '🌬️',
      });
    }
  }

  suggestions.push({
    timeSlot: 'Anytime',
    activity: 'Stay hydrated',
    reason: `Temperature: ${weather.temp || 28}°C. Drink water regularly.`,
    duration: '1 min',
    icon: '💧',
  });

  return suggestions.slice(0, 5);
}
