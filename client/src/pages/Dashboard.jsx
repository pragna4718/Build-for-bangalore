import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Stars } from "@react-three/drei";
import { ReactLenis } from "@studio-freight/react-lenis";
import { analyzeHealth, getPredictions, getRecommendations, compareBaseline } from "../services/healthService";
import "./Dashboard.css";

gsap.registerPlugin(ScrollTrigger);

// ─── Mock health data ───────────────────────────────────────────────
const STATS = [
  {
    label: "Heart Rate",
    value: 72,
    unit: "bpm",
    trend: "+2%",
    trendUp: true,
    icon: "❤️",
    color: "#ef4444",
    progress: 72,
  },
  {
    label: "Daily Steps",
    value: 8420,
    unit: "steps",
    trend: "+14%",
    trendUp: true,
    icon: "👟",
    color: "#3b82f6",
    progress: 84,
  },
  {
    label: "Sleep",
    value: 7.2,
    unit: "hrs",
    trend: "-5%",
    trendUp: false,
    icon: "🌙",
    color: "#8b5cf6",
    progress: 90,
  },
  {
    label: "Calories",
    value: 1840,
    unit: "kcal",
    trend: "+8%",
    trendUp: true,
    icon: "🔥",
    color: "#f59e0b",
    progress: 76,
  },
];

function buildRiskStats(riskScores) {
  if (!riskScores) return STATS;

  const rows = [
    { key: "diabetes", label: "Diabetes Risk", icon: "🩸", color: "#ef4444" },
    { key: "cardiac", label: "Cardiac Risk", icon: "🫀", color: "#f59e0b" },
    { key: "obesity", label: "Obesity Risk", icon: "⚖️", color: "#8b5cf6" },
    { key: "stress", label: "Stress Risk", icon: "🧠", color: "#3b82f6" },
  ];

  return rows.map((row) => {
    const raw = Number(riskScores[row.key] || 0);
    const percent = Math.round(raw * 100);
    return {
      label: row.label,
      value: percent,
      unit: "%",
      trend: percent >= 60 ? "high" : percent >= 35 ? "moderate" : "low",
      trendUp: percent >= 60,
      icon: row.icon,
      color: row.color,
      progress: Math.max(6, percent),
    };
  });
}

function computeWellnessScore(riskScores) {
  if (!riskScores) return 50;
  const values = Object.values(riskScores)
    .map((v) => Number(v))
    .filter((v) => Number.isFinite(v));
  if (!values.length) return 50;
  const avgRisk = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.max(0, Math.min(100, Math.round((1 - avgRisk) * 100)));
}

const FEATURE_CARDS = [
  {
    to: "/glass-body",
    label: "Digital Twin",
    tagline: "Your body, visualized",
    desc: "Interact with a responsive 3D model of your body and visually spot stress zones before they become issues. Powered by real-time biometric data.",
    icon: "🫀",
    img: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=1200&q=80",
    accent: "#0891b2",
  },
  {
    to: "/exposome",
    label: "Exposome Radar",
    tagline: "Know your environment",
    desc: "Track air quality, UV index, pollen counts, and city-level exposure so your routines adapt to the world around you in real time.",
    icon: "🌍",
    img: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&q=80",
    accent: "#059669",
  },
  {
    to: "/appointments",
    label: "Appointments",
    tagline: "Healthcare, simplified",
    desc: "Plan and manage in-person and virtual visits with all of your metrics, lab work, and reports already attached and ready to share.",
    icon: "🏥",
    img: "https://images.unsplash.com/photo-1666214280557-f1b5022eb634?w=1200&q=80",
    accent: "#4f46e5",
  },
  {
    to: "/grocery",
    label: "Grocery Scanner",
    tagline: "Scan. Learn. Eat better.",
    desc: "Point at any product and instantly see ingredient grades, glycemic impact, allergen flags, and healthier alternatives nearby.",
    icon: "🥗",
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80",
    accent: "#d97706",
  },
  {
    to: "/goals",
    label: "Goal Planner",
    tagline: "Micro-habits, macro results",
    desc: "Design micro-habits around sleep, movement and nutrition that intelligently adjust based on your real-world progress data.",
    icon: "🎯",
    img: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1200&q=80",
    accent: "#db2777",
  },
  {
    to: "/wearable",
    label: "Wearables Hub",
    tagline: "All devices, one view",
    desc: "Pull continuous data streams from your watch, ring, or band to keep this dashboard alive with real-time health insights.",
    icon: "⌚",
    img: "https://images.unsplash.com/photo-1617043786394-f977fa12eddf?w=1200&q=80",
    accent: "#7c3aed",
  },
  {
    to: "/emergency",
    label: "Life Saver",
    tagline: "When seconds matter",
    desc: "Trigger an intelligent SOS that shares only what first responders need — vitals, location, medical history — in the moments that matter most.",
    icon: "🚨",
    img: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=1200&q=80",
    accent: "#dc2626",
  },
];

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(value);
    if (start === end) return;
    const dur = 1800;
    const step = Math.ceil(dur / (end - start));
    const timer = setInterval(() => {
      start += Math.ceil(end / 80);
      if (start >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
}

// ─── Orbiting Dot ───────────────────────────────────────────────────
function OrbitingDot({ radius, speed, color, offset, tilt }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.getElapsedTime() * speed + offset;
    ref.current.position.x = Math.cos(t) * radius;
    ref.current.position.z = Math.sin(t) * radius;
    ref.current.position.y = Math.sin(t * 1.5 + tilt) * 0.4;
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.055, 16, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={6}
        toneMapped={false}
      />
    </mesh>
  );
}

// ─── 3D Hero Scene — Orbital Rings + Wireframe Core ─────────────────
function HeroScene() {
  const groupRef = useRef();
  const ring1Ref = useRef();
  const ring2Ref = useRef();
  const ring3Ref = useRef();
  const coreRef = useRef();
  const icoRef = useRef();

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Whole group slow rotation
    groupRef.current.rotation.y = t * 0.08;

    // Each ring on its own axis
    ring1Ref.current.rotation.x = t * 0.3;
    ring1Ref.current.rotation.z = t * 0.08;

    ring2Ref.current.rotation.y = t * 0.22;
    ring2Ref.current.rotation.x = Math.PI / 3 + t * 0.05;

    ring3Ref.current.rotation.z = t * 0.18;
    ring3Ref.current.rotation.x = -Math.PI / 4 + t * 0.04;

    // Wireframe rotates independently
    icoRef.current.rotation.x = t * 0.12;
    icoRef.current.rotation.z = t * 0.08;

    // Core pulses
    const pulse = 1 + Math.sin(t * 2) * 0.1;
    coreRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group ref={groupRef}>
      {/* Glowing inner core */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#818cf8"
          emissive="#6366f1"
          emissiveIntensity={2.5}
          transparent
          opacity={0.85}
          toneMapped={false}
        />
      </mesh>

      {/* Wireframe icosahedron */}
      <mesh ref={icoRef}>
        <icosahedronGeometry args={[1.6, 1]} />
        <meshStandardMaterial
          color="#a5b4fc"
          wireframe
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Orbital ring 1 — cyan */}
      <mesh ref={ring1Ref}>
        <torusGeometry args={[2.2, 0.008, 16, 120]} />
        <meshStandardMaterial
          color="#06b6d4"
          emissive="#06b6d4"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* Orbital ring 2 — violet */}
      <mesh ref={ring2Ref}>
        <torusGeometry args={[2.7, 0.008, 16, 120]} />
        <meshStandardMaterial
          color="#8b5cf6"
          emissive="#8b5cf6"
          emissiveIntensity={4}
          toneMapped={false}
        />
      </mesh>

      {/* Orbital ring 3 — green */}
      <mesh ref={ring3Ref}>
        <torusGeometry args={[3.2, 0.006, 16, 120]} />
        <meshStandardMaterial
          color="#4ade80"
          emissive="#4ade80"
          emissiveIntensity={3}
          toneMapped={false}
        />
      </mesh>

      {/* Orbiting dots on each ring path */}
      <OrbitingDot radius={2.2} speed={0.7} color="#06b6d4" offset={0} tilt={0} />
      <OrbitingDot radius={2.2} speed={0.7} color="#06b6d4" offset={Math.PI} tilt={0.5} />
      <OrbitingDot radius={2.7} speed={0.5} color="#8b5cf6" offset={Math.PI / 2} tilt={1} />
      <OrbitingDot radius={2.7} speed={0.5} color="#8b5cf6" offset={Math.PI * 1.5} tilt={1.5} />
      <OrbitingDot radius={3.2} speed={0.35} color="#4ade80" offset={Math.PI / 3} tilt={2} />

      {/* Lighting */}
      <Environment preset="city" />
      <ambientLight intensity={0.25} />
      <pointLight position={[0, 0, 0]} intensity={3} color="#6366f1" distance={8} />
      <pointLight position={[4, 2, 3]} intensity={1} color="#06b6d4" distance={10} />
    </group>
  );
}

// ─── Feature Row Component (alternating left/right) ─────────────────
function FeatureRow({ card, index }) {
  const isReversed = index % 2 === 1;

  return (
    <motion.div
      className={`feature-row ${isReversed ? "feature-row--reversed" : ""}`}
      initial={{ opacity: 0, x: isReversed ? 60 : -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Image Side */}
      <div className="feature-row-visual">
        <div
          className="feature-row-image"
          style={{ backgroundImage: `url(${card.img})` }}
        />
        <div className="feature-row-image-overlay" style={{ "--accent": card.accent }} />
        <div className="feature-row-icon-badge">
          <span>{card.icon}</span>
        </div>
        <div className="feature-row-number">
          {String(index + 1).padStart(2, "0")}
        </div>
      </div>

      {/* Detail Side */}
      <div className="feature-row-detail">
        <span className="feature-row-tagline" style={{ color: card.accent }}>
          {card.tagline}
        </span>
        <h3 className="feature-row-title">{card.label}</h3>
        <p className="feature-row-desc">{card.desc}</p>
        <Link to={card.to} className="feature-row-cta" style={{ "--accent": card.accent }}>
          <span>Explore {card.label}</span>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </motion.div>
  );
}

// ─── Dashboard Component ─────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const statsRef = useRef(null);
  const heroRef = useRef(null);
  const [theme, setTheme] = useState("light");
  const [displayStats, setDisplayStats] = useState(STATS);
  const [riskScores, setRiskScores] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [baselineData, setBaselineData] = useState(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);

  useEffect(() => {
    const cards = gsap.utils.toArray(".stat-card");
    gsap.fromTo(
      cards,
      { y: 80, opacity: 0, scale: 0.95 },
      {
        y: 0,
        opacity: 1,
        scale: 1,
        duration: 0.7,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".stats-section",
          start: "top 80%",
        },
      }
    );

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  const fetchRecommendations = async (scores) => {
    try {
      const recRes = await getRecommendations({
        userId: user?._id || "demo-user",
        riskScores: scores,
        metrics: {},
      });
      setRecommendations(recRes?.data?.recommendations || []);
    } catch {
      setRecommendations([]);
    }
  };

  const loadLatestPrediction = async () => {
    try {
      const response = await getPredictions();
      const predictionList = Array.isArray(response?.data) ? response.data : [];
      const latest = predictionList[0] || null;
      const scores = latest?.riskScores;
      if (scores) {
        setRiskScores(scores);
        setDisplayStats(buildRiskStats(scores));
        await fetchRecommendations(scores);

        const previous = predictionList[1]?.riskScores;
        if (previous) {
          try {
            const baselineRes = await compareBaseline({
              userId: user?._id || "demo-user",
              previousScore: computeWellnessScore(previous),
              currentScore: computeWellnessScore(scores),
              previousCredits: baselineData?.totalCredits || 0,
            });
            setBaselineData(baselineRes?.data || null);
          } catch {
            setBaselineData(null);
          }
        }
      }
    } catch {
      // Keep visual fallback stats if prediction history is unavailable.
    }
  };

  const runAiAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError("");
    try {
      const response = await analyzeHealth();
      const scores = response?.data?.riskScores || response?.data?.prediction?.riskScores;
      if (!scores) {
        throw new Error("No risk scores returned");
      }
      setRiskScores(scores);
      setDisplayStats(buildRiskStats(scores));
      await fetchRecommendations(scores);

      if (scores) {
        try {
          const baselineRes = await compareBaseline({
            userId: user?._id || "demo-user",
            previousScore: computeWellnessScore(riskScores),
            currentScore: computeWellnessScore(scores),
            previousCredits: baselineData?.totalCredits || 0,
          });
          setBaselineData(baselineRes?.data || null);
        } catch {
          setBaselineData(null);
        }
      }
    } catch (err) {
      setAnalysisError(err?.response?.data?.message || "Unable to run AI analysis right now.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  useEffect(() => {
    loadLatestPrediction();
  }, []);

  return (
    <ReactLenis root options={{ lerp: 0.07, smoothWheel: true }}>
      <div className={`dashboard-container ${theme}`}>
        {/* ── Sticky Nav ── */}
        <nav className="nav-header">
          <div className="nav-inner">
            <div className="user-badge">
              <div className="user-avatar">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="user-info">
                <span className="user-greeting">{greeting()}</span>
                <span className="user-name">{user?.name || "User"}</span>
              </div>
            </div>
            <div className="nav-actions">
              <button
                type="button"
                className="theme-toggle"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                <span className="theme-toggle-icon">
                  {theme === "dark" ? "☀️" : "🌙"}
                </span>
                <span className="theme-toggle-label">
                  {theme === "dark" ? "Light" : "Dark"}
                </span>
              </button>
              <button onClick={logout} className="logout-btn">
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        {/* ── Hero Banner ── */}
        <section className="hero-section" ref={heroRef}>
          {/* Animated EKG pulse line */}
          <div className="hero-pulse-line">
            <svg viewBox="0 0 1200 60" preserveAspectRatio="none">
              <path
                className="pulse-path"
                d="M0,30 L300,30 L330,30 L345,5 L360,55 L375,10 L390,45 L405,25 L420,30 L900,30 L930,30 L945,5 L960,55 L975,10 L990,45 L1005,25 L1020,30 L1200,30"
                fill="none"
                stroke="url(#pulseGrad)"
                strokeWidth="1.5"
              />
              <defs>
                <linearGradient id="pulseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0" />
                  <stop offset="20%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6" />
                  <stop offset="80%" stopColor="#06b6d4" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Floating particles (CSS) */}
          <div className="hero-particles">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="hero-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 6}s`,
                  animationDuration: `${4 + Math.random() * 6}s`,
                  width: `${2 + Math.random() * 3}px`,
                  height: `${2 + Math.random() * 3}px`,
                  opacity: 0.15 + Math.random() * 0.25,
                }}
              />
            ))}
          </div>

          <div className="hero-canvas-container">
            <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
              <Stars
                radius={80}
                depth={60}
                count={2500}
                factor={3}
                saturation={0}
                fade
                speed={0.5}
              />
              <HeroScene />
            </Canvas>
          </div>

          <motion.div
            className="hero-content"
            style={{ opacity: heroOpacity, y: heroY, scale: heroScale }}
          >
            <motion.div
              className="hero-badge"
              initial={{ opacity: 0, scale: 0.8, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.1 }}
            >
              <span className="hero-badge-dot" />
              Live Dashboard
            </motion.div>

            <h1 className="hero-title">
              {"Your Health.".split(" ").map((word, i) => (
                <motion.span
                  key={i}
                  className="hero-word"
                  initial={{ opacity: 0, y: 60, rotateX: -70 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  transition={{
                    duration: 0.9,
                    delay: 0.25 + i * 0.1,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word}{" "}
                </motion.span>
              ))}
              <br />
              <motion.span
                className="hero-title-accent hero-word"
                initial={{ opacity: 0, y: 60, rotateX: -70 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  duration: 0.9,
                  delay: 0.55,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                Redefined.
              </motion.span>
            </h1>

            <motion.p
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.8, delay: 0.75 }}
            >
              Next-generation proactive wellness powered by AI, real-time
              biometrics, and deeply integrated health modules.
            </motion.p>

            <motion.div
              className="hero-cta-group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.95 }}
            >
              <a href="#features" className="hero-cta-primary">
                Explore Features
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </a>
            </motion.div>
          </motion.div>

          <div className="hero-scroll-indicator">
            <motion.div
              className="scroll-line"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </section>

        {/* ── Stats Overview ── */}
        <section className="stats-section" ref={statsRef}>
          <div className="stats-header">
            <h2 className="section-title">Vitals Pulse</h2>
            <p className="section-subtitle">
              AI-backed risk view from your latest health history.
            </p>
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={analysisLoading}
              style={{
                border: "none",
                borderRadius: "999px",
                padding: "0.55rem 0.95rem",
                background: analysisLoading ? "#374151" : "#0ea5e9",
                color: "#fff",
                fontWeight: 700,
                cursor: analysisLoading ? "not-allowed" : "pointer",
                marginTop: "0.5rem",
              }}
            >
              {analysisLoading ? "Analyzing..." : "Run AI Analysis"}
            </button>
          </div>
          {analysisLoading && !riskScores ? (
            <div style={{ color: "#93c5fd", marginBottom: "0.75rem" }}>
              Fetching your latest AI predictions...
            </div>
          ) : null}
          {analysisError ? (
            <div
              style={{
                color: "#fecaca",
                background: "rgba(127, 29, 29, 0.35)",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                borderRadius: "10px",
                padding: "0.6rem 0.75rem",
                marginBottom: "0.75rem",
              }}
            >
              {analysisError}
              <button
                type="button"
                onClick={runAiAnalysis}
                style={{
                  marginLeft: "0.75rem",
                  border: "1px solid rgba(248,113,113,0.55)",
                  background: "transparent",
                  color: "#fecaca",
                  borderRadius: "999px",
                  padding: "0.2rem 0.55rem",
                  cursor: "pointer",
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
          <div className="stats-grid">
            {displayStats.map((s) => (
              <motion.div
                key={s.label}
                className="stat-card"
                style={{ "--stat-color": s.color }}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <div className="stat-card-glow" style={{ background: s.color }} />
                <div className="stat-card-inner">
                  <div className="stat-card-top">
                    <span className="stat-label">{s.label}</span>
                    <div
                      className="stat-icon-pill"
                      style={{
                        backgroundColor: `${s.color}18`,
                        color: s.color,
                      }}
                    >
                      {s.icon}
                    </div>
                  </div>
                  <div className="stat-value">
                    <AnimatedNumber value={s.value} />
                    <span className="stat-unit">{s.unit}</span>
                  </div>
                  <div className="stat-progress-track">
                    <motion.div
                      className="stat-progress-bar"
                      style={{ backgroundColor: s.color }}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                  <div
                    className={`stat-trend ${s.trendUp ? "trend-up" : "trend-down"}`}
                  >
                    <span className="trend-arrow">{s.trendUp ? "↑" : "↓"}</span>
                    {riskScores ? `${s.trend} risk level` : `${s.trend} from yesterday`}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {riskScores ? (
            <div
              style={{
                marginTop: "1rem",
                border: "1px solid rgba(148, 163, 184, 0.22)",
                borderRadius: "14px",
                padding: "1rem",
                background: "rgba(15, 23, 42, 0.45)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "0.75rem", fontSize: "1rem" }}>AI Recommendations</h3>
              {recommendations.length > 0 ? (
                <div style={{ display: "grid", gap: "0.55rem" }}>
                  {recommendations.slice(0, 5).map((rec, idx) => (
                    <div
                      key={`${rec.condition || "condition"}-${idx}`}
                      style={{
                        border: "1px solid rgba(148, 163, 184, 0.18)",
                        borderRadius: "10px",
                        padding: "0.6rem 0.75rem",
                        background: "rgba(2, 6, 23, 0.35)",
                      }}
                    >
                      <strong>{(rec.condition || "General").toUpperCase()}</strong>
                      <span style={{ marginLeft: "0.5rem", opacity: 0.8 }}>
                        Priority: {rec.priority || "medium"}
                      </span>
                      <div style={{ marginTop: "0.25rem", opacity: 0.92 }}>{rec.action || "Maintain healthy routines."}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, opacity: 0.8 }}>Run analysis to generate personalized actions.</p>
              )}
            </div>
          ) : null}

          {baselineData ? (
            <div
              style={{
                marginTop: "1rem",
                border: "1px solid rgba(74, 222, 128, 0.25)",
                borderRadius: "14px",
                padding: "1rem",
                background: "rgba(20, 83, 45, 0.18)",
              }}
            >
              <h3 style={{ margin: 0, marginBottom: "0.6rem", fontSize: "1rem" }}>Baseline Progress</h3>
              <p style={{ margin: 0 }}>
                Improvement: <strong>{baselineData.improvementPercent ?? 0}%</strong> | Credits Earned: <strong>{baselineData.creditsEarned ?? 0}</strong> | Total Credits: <strong>{baselineData.totalCredits ?? 0}</strong>
              </p>
              <p style={{ marginTop: "0.4rem", marginBottom: 0, opacity: 0.92 }}>
                Next Goal: {baselineData.adaptiveGoal || "Keep consistency and review weekly."}
              </p>
            </div>
          ) : null}
        </section>

        {/* ── Feature Showcase ── */}
        <section className="features-section" id="features">
          <div className="features-header">
            <motion.h2
              className="section-title"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              Ecosystem
            </motion.h2>
            <motion.p
              className="features-subtitle"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15 }}
            >
              Seven powerful modules, seamlessly connected. Each one focuses on a
              different dimension of your health story.
            </motion.p>
          </div>

          <div className="features-list">
            {FEATURE_CARDS.map((card, index) => (
              <FeatureRow key={card.to} card={card} index={index} />
            ))}
          </div>
        </section>

        {/* ── Footer CTA ── */}
        <section className="footer-section">
          <motion.div
            className="footer-content"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="footer-headline">
              Ready to optimize
              <br />
              your biology?
            </h2>
            <p className="footer-sub">
              All interconnected. All intelligent. All available at a single tap.
            </p>
            <button className="footer-btn">
              <span>Run Complete Diagnostics</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </motion.div>
        </section>
      </div>
    </ReactLenis>
  );
}
