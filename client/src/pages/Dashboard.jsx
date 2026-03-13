import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Environment, Stars } from "@react-three/drei";
import { ReactLenis } from "@studio-freight/react-lenis";
import { Swiper, SwiperSlide } from "swiper/react";
import { EffectCards, Pagination } from "swiper/modules";

// Import styles
import "swiper/css";
import "swiper/css/effect-cards";
import "swiper/css/pagination";
import "./Dashboard.css";

gsap.registerPlugin(ScrollTrigger);

// ─── Mock health data ───────────────────────────────────────────────
const STATS = [
  { label: "Heart Rate", value: 72, unit: "bpm", trend: "+2%", trendUp: true },
  { label: "Daily Steps", value: 8420, unit: "steps", trend: "+14%", trendUp: true },
  { label: "Sleep", value: 7.2, unit: "hrs", trend: "-5%", trendUp: false },
  { label: "Calories", value: 1840, unit: "kcal", trend: "+8%", trendUp: true },
];

const FEATURE_CARDS = [
  { to: "/glass-body", label: "Digital Twin", desc: "Interact with a real-time responsive 3D model of your biological systems. Identify risk areas visually.", icon: "🫀", bg: "linear-gradient(135deg, #0f172a 0%, #0891b2 100%)" },
  { to: "/exposome", label: "Exposome Radar", desc: "Analyze environmental factors like UV, AQI, and local hazards affecting your long-term health.", icon: "🌍", bg: "linear-gradient(135deg, #022c22 0%, #059669 100%)" },
  { to: "/appointments", label: "Appointments", desc: "Seamlessly schedule, reschedule, and manage your tele-health and in-person doctor visits.", icon: "🏥", bg: "linear-gradient(135deg, #312e81 0%, #4f46e5 100%)" },
  { to: "/grocery", label: "Grocery Scanner", desc: "Scan nutritional labels and barcodes to get AI-powered insights on ingredient health scores.", icon: "🥗", bg: "linear-gradient(135deg, #451a03 0%, #d97706 100%)" },
  { to: "/goals", label: "Goal Planner", desc: "Set dynamically adjusting health routines tailored to your metabolism and fitness history.", icon: "🎯", bg: "linear-gradient(135deg, #831843 0%, #db2777 100%)" },
  { to: "/wearable", label: "Wearables", desc: "Sync vital data directly from Apple Watch, Garmin, and Fitbit to fuel AI diagnostics.", icon: "⌚", bg: "linear-gradient(135deg, #2e1065 0%, #7c3aed 100%)" },
  { to: "/emergency", label: "Life Saver", desc: "One-tap emergency dispatches sharing your precise coordinates and full medical file.", icon: "🚨", bg: "linear-gradient(135deg, #450a0a 0%, #dc2626 100%)" },
];

function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = Number(value);
    if (start === end) return;
    const dur = 1500;
    const step = Math.ceil(dur / (end - start));
    const timer = setInterval(() => {
      start += Math.ceil(end / 60);
      if (start >= end) { setDisplay(end); clearInterval(timer); }
      else setDisplay(start);
    }, step);
    return () => clearInterval(timer);
  }, [value]);
  return <span>{display.toLocaleString()}</span>;
}

// ─── 3D Hero Sphere ─────────────────────────────────────────────────────────────
function HeroSphere() {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.2;
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3;
    }
  });

  return (
    <Float speed={2} rotationIntensity={1} floatIntensity={2}>
      <Sphere ref={meshRef} args={[1.5, 64, 64]} scale={1.2}>
        <MeshDistortMaterial
          color="#4f46e5"
          envMapIntensity={1}
          clearcoat={1}
          clearcoatRoughness={0}
          metalness={0.8}
          roughness={0.2}
          distort={0.4}
          speed={2}
        />
      </Sphere>
      <Environment preset="city" />
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} />
    </Float>
  );
}

// ─── Dashboard Component ──────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, logout } = useAuth();
  const statsRef = useRef(null);
  const heroRef = useRef(null);
  const [theme, setTheme] = useState("dark");
  
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  useEffect(() => {
    // GSAP Stat Cards Stagger Animation
    const cards = gsap.utils.toArray(".stat-card");
    gsap.fromTo(
      cards,
      { y: 100, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ".stats-section",
          start: "top 80%",
        },
      }
    );

    gsap.fromTo(
      ".features-section",
       { opacity: 0 },
       { opacity: 1, duration: 1, scrollTrigger: { trigger: ".features-section", start: "top 70%" } }
    );

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <ReactLenis root options={{ lerp: 0.05, smoothWheel: true }}>
      <div className={`dashboard-container ${theme}`}>
        
        {/* Nav Header */}
        <nav className="nav-header">
          <div className="user-badge">
            <div className="user-avatar">{user?.name?.[0]?.toUpperCase() || "U"}</div>
            <span style={{fontWeight: 600, color: "#fff"}}>{user?.name || "User"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <span className="theme-toggle-icon">
                {theme === "dark" ? "☀️" : "🌙"}
              </span>
              <span className="theme-toggle-label">
                {theme === "dark" ? "Light mode" : "Dark mode"}
              </span>
            </button>
            <button onClick={logout} className="logout-btn">Logout</button>
          </div>
        </nav>

        {/* ── Hero Banner ── */}
        <section className="hero-section" ref={heroRef}>
          <div className="hero-canvas-container">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
              <HeroSphere />
            </Canvas>
          </div>
          
          <motion.div 
            className="hero-content"
            style={{ opacity: heroOpacity, y: heroY }}
          >
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              style={{ color: "#a5b4fc", fontSize: "1.2rem", fontWeight: 600, marginBottom: "1rem", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              {greeting()}, {user?.name || "User"}
            </motion.h2>
            <motion.h1 
              className="hero-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              Your Health.<br/>Redefined.
            </motion.h1>
            <motion.p 
              className="hero-subtitle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              Experience the next generation of proactive wellness. Scroll to explore
              your vitals, deeply integrated digital twins, and AI-powered insights.
            </motion.p>
          </motion.div>
        </section>

        {/* ── Stats Overview ── */}
        <section className="stats-section" ref={statsRef}>
          <h2 className="section-title">Vitals Pulse</h2>
          <div className="stats-grid">
            {STATS.map((s) => (
              <div key={s.label} className="stat-card">
                <span className="stat-label">{s.label}</span>
                <div className="stat-value">
                  <AnimatedNumber value={s.value} />
                  <span className="stat-unit">{s.unit}</span>
                </div>
                <div className={`stat-trend ${s.trendUp ? "trend-up" : "trend-down"}`}>
                  {s.trend} from yesterday
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Swiper ── */}
        <section className="features-section">
          <h2 className="section-title" style={{marginBottom: "1rem"}}>Ecosystem</h2>
          <p style={{textAlign: "center", color: "#94a3b8", marginBottom: "4rem", maxWidth: "600px", margin: "0 auto 4rem auto"}}>
            Swipe through our interconnected modules designed to provide 360-degree coverage over your life.
          </p>

          <Swiper
            effect={'cards'}
            grabCursor={true}
            modules={[EffectCards, Pagination]}
            className="swiper-container-custom"
            pagination={{ clickable: true, dynamicBullets: true }}
          >
            {FEATURE_CARDS.map((card) => (
              <SwiperSlide key={card.to} className="swiper-slide-custom">
                <Link to={card.to} className="flashcard" style={{ background: card.bg }}>
                  <div className="flashcard-content">
                    <div className="flashcard-icon-wrapper">{card.icon}</div>
                    
                    <div>
                      <h3 className="flashcard-title">{card.label}</h3>
                      <p className="flashcard-desc">{card.desc}</p>
                      
                      <div className="flashcard-btn">
                        Launch <span style={{fontSize: "1.2rem"}}>→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>

        {/* Footer CTA */}
        <section className="footer-section">
          <h2 style={{ fontSize: "2.5rem", fontWeight: 800, marginBottom: "1.5rem" }}>Ready to optimize your biology?</h2>
          <p style={{ color: "#94a3b8", marginBottom: "3rem", fontSize: "1.1rem" }}>All interconnected. All available at a single tap.</p>
          <button className="footer-btn">Run Complete Diagnostics</button>
        </section>

      </div>
    </ReactLenis>
  );
}
