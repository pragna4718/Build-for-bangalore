import React, { useState, useEffect, useRef } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, EffectCards } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-cards";

import { ReactLenis } from "@studio-freight/react-lenis";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import axios from "axios";

/* ================================================================
   FALLBACK DOCTORS  (used when backend is offline)
   ================================================================ */
const FALLBACK_DOCTORS = [
  {
    _id: "f1",
    name: "Dr. Sarah Jenkins",
    specialty: "Cardiologist",
    experience: "15 Years",
    fees: "$150",
    image: "https://i.pravatar.cc/300?img=1",
    availableTimes: ["09:00 AM", "10:30 AM", "01:00 PM", "03:30 PM"],
    bio: "Expert in complex heart conditions with over a decade of experience in interventional cardiology.",
  },
  {
    _id: "f2",
    name: "Dr. Michael Chen",
    specialty: "Dermatologist",
    experience: "8 Years",
    fees: "$100",
    image: "https://i.pravatar.cc/300?img=11",
    availableTimes: ["10:00 AM", "11:30 AM", "02:00 PM", "04:00 PM"],
    bio: "Specializing in cosmetic dermatology, skin rejuvenation, and advanced skin cancer treatments.",
  },
  {
    _id: "f3",
    name: "Dr. Emily Rodriguez",
    specialty: "General Physician",
    experience: "12 Years",
    fees: "$80",
    image: "https://i.pravatar.cc/300?img=5",
    availableTimes: ["08:00 AM", "09:30 AM", "11:00 AM", "05:00 PM"],
    bio: "Compassionate primary care for all your general health and wellness needs.",
  },
  {
    _id: "f4",
    name: "Dr. James Wilson",
    specialty: "Neurologist",
    experience: "20 Years",
    fees: "$200",
    image: "https://i.pravatar.cc/300?img=8",
    availableTimes: ["09:00 AM", "11:00 AM", "03:00 PM", "06:00 PM"],
    bio: "Leading expert in neurological disorders, cognitive therapies, and brain health.",
  },
  {
    _id: "f5",
    name: "Dr. Olivia Martinez",
    specialty: "Pediatrician",
    experience: "10 Years",
    fees: "$120",
    image: "https://i.pravatar.cc/300?img=9",
    availableTimes: ["08:30 AM", "10:00 AM", "01:30 PM", "04:30 PM"],
    bio: "Dedicated to the health and well-being of infants, children, and adolescents.",
  },
];

const DEFAULT_TIMES = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];

/* ================================================================
   INLINE STYLES  (scoped to this component — no Tailwind dependency)
   ================================================================ */
const S = {
  /* ── Global wrapper ── */
  page: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0c0a1d 0%, #110e2a 40%, #0d1b2a 100%)",
    fontFamily: "'Inter', sans-serif",
    color: "#e4e2f0",
    padding: "2rem 1rem",
    overflowX: "hidden",
  },

  /* ── Header ── */
  headerWrap: {
    maxWidth: 960,
    margin: "0 auto 3rem",
    textAlign: "center",
  },
  badge: {
    display: "inline-block",
    fontFamily: "'Outfit', sans-serif",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 3,
    textTransform: "uppercase",
    color: "#a78bfa",
    background: "rgba(167,139,250,0.1)",
    border: "1px solid rgba(167,139,250,0.25)",
    borderRadius: 999,
    padding: "6px 20px",
    marginBottom: 16,
  },
  h1: {
    fontFamily: "'Playfair Display', serif",
    fontSize: "clamp(2rem, 5vw, 3.4rem)",
    fontWeight: 700,
    lineHeight: 1.15,
    background: "linear-gradient(135deg, #c4b5fd 0%, #818cf8 40%, #38bdf8 100%)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 16,
    color: "#8b8a9e",
    maxWidth: 520,
    margin: "0 auto",
    lineHeight: 1.6,
  },

  /* ── Card container ── */
  mainCard: {
    maxWidth: 1080,
    margin: "0 auto",
    background: "rgba(17,14,42,0.6)",
    backdropFilter: "blur(40px) saturate(1.3)",
    WebkitBackdropFilter: "blur(40px) saturate(1.3)",
    borderRadius: 28,
    border: "1px solid rgba(139,92,246,0.15)",
    boxShadow: "0 30px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    overflow: "hidden",
  },

  /* ── Stepper ── */
  stepperBar: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: "28px 32px",
    borderBottom: "1px solid rgba(139,92,246,0.1)",
    background: "rgba(15,12,35,0.5)",
  },
  stepDot: (active, done) => ({
    width: 38,
    height: 38,
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    border: done
      ? "2px solid #818cf8"
      : active
      ? "2px solid #a78bfa"
      : "2px solid rgba(139,92,246,0.2)",
    background: done
      ? "linear-gradient(135deg, #7c3aed, #6366f1)"
      : active
      ? "rgba(167,139,250,0.15)"
      : "transparent",
    color: done ? "#fff" : active ? "#c4b5fd" : "#4c4a6a",
    transition: "all 0.4s cubic-bezier(.4,0,.2,1)",
    cursor: "default",
  }),
  stepLine: (done) => ({
    width: 60,
    height: 2,
    borderRadius: 2,
    background: done
      ? "linear-gradient(90deg, #818cf8, #a78bfa)"
      : "rgba(139,92,246,0.15)",
    transition: "background 0.4s ease",
  }),
  stepLabel: (active) => ({
    fontFamily: "'Outfit', sans-serif",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: active ? "#c4b5fd" : "#4c4a6a",
    marginTop: 6,
    textAlign: "center",
    transition: "color 0.3s ease",
  }),

  /* ── Content area ── */
  content: { padding: "36px 40px 48px" },

  /* ── Doctor card ── */
  docGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 24,
    marginTop: 28,
  },
  docCard: {
    background: "rgba(22,18,50,0.7)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(139,92,246,0.12)",
    borderRadius: 22,
    padding: "28px 24px 24px",
    textAlign: "center",
    cursor: "pointer",
    transition: "all 0.35s cubic-bezier(.4,0,.2,1)",
    position: "relative",
    overflow: "hidden",
  },
  docCardHover: {
    border: "1px solid rgba(139,92,246,0.4)",
    transform: "translateY(-6px)",
    boxShadow: "0 20px 50px rgba(99,102,241,0.15)",
  },
  docAvatar: {
    width: 90,
    height: 90,
    borderRadius: 20,
    objectFit: "cover",
    border: "3px solid rgba(167,139,250,0.3)",
    margin: "0 auto 16px",
    display: "block",
    boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  },
  docName: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 19,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },
  docSpec: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#a78bfa",
    marginBottom: 12,
  },
  docBio: {
    fontSize: 13,
    color: "#7a7893",
    lineHeight: 1.6,
    marginBottom: 16,
    minHeight: 48,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  docMeta: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    marginBottom: 18,
    fontSize: 13,
  },
  docMetaLabel: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 9,
    fontWeight: 600,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "#5a5874",
    marginBottom: 2,
  },
  docMetaVal: {
    fontWeight: 700,
    color: "#c4b5fd",
    fontSize: 14,
  },

  /* ── Buttons ── */
  btnPrimary: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    fontSize: 14,
    letterSpacing: 0.6,
    border: "none",
    borderRadius: 14,
    padding: "14px 32px",
    cursor: "pointer",
    background: "linear-gradient(135deg, #7c3aed 0%, #6366f1 50%, #818cf8 100%)",
    color: "#fff",
    boxShadow: "0 8px 30px rgba(124,58,237,0.35)",
    transition: "all 0.3s ease",
  },
  btnPrimaryHover: {
    transform: "translateY(-2px)",
    boxShadow: "0 12px 40px rgba(124,58,237,0.5)",
  },
  btnGhost: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 14,
    padding: "12px 28px",
    cursor: "pointer",
    background: "transparent",
    color: "#a78bfa",
    transition: "all 0.3s ease",
  },
  btnPill: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 700,
    fontSize: 13,
    border: "none",
    borderRadius: 999,
    padding: "12px 28px",
    cursor: "pointer",
    background: "linear-gradient(135deg, #7c3aed, #6366f1)",
    color: "#fff",
    boxShadow: "0 6px 24px rgba(124,58,237,0.3)",
    transition: "all 0.3s ease",
  },
  btnBack: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: "#6d6b85",
    background: "none",
    border: "none",
    cursor: "pointer",
    marginBottom: 24,
    transition: "color 0.2s",
    padding: 0,
  },

  /* ── Search bar ── */
  searchWrap: {
    maxWidth: 600,
    margin: "0 auto 4px",
    display: "flex",
    alignItems: "center",
    background: "rgba(22,18,50,0.8)",
    border: "1px solid rgba(139,92,246,0.2)",
    borderRadius: 16,
    padding: "4px 6px 4px 18px",
    gap: 10,
    transition: "border-color 0.3s",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    outline: "none",
    color: "#e4e2f0",
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    padding: "12px 0",
  },

  /* ── Time slot ── */
  timeSlot: (active) => ({
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    padding: "12px 20px",
    borderRadius: 14,
    border: active
      ? "2px solid #818cf8"
      : "1px solid rgba(139,92,246,0.15)",
    background: active
      ? "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))"
      : "rgba(22,18,50,0.5)",
    color: active ? "#c4b5fd" : "#7a7893",
    cursor: "pointer",
    transition: "all 0.25s ease",
  }),

  /* ── Info row (confirmation) ── */
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    padding: "18px 20px",
    background: "rgba(22,18,50,0.5)",
    borderRadius: 16,
    border: "1px solid rgba(139,92,246,0.1)",
    marginBottom: 14,
  },
  infoIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
    background: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.15)",
    flexShrink: 0,
  },

  /* ── Toast ── */
  toast: {
    position: "fixed",
    top: 24,
    right: 24,
    background: "rgba(17,14,42,0.95)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(139,92,246,0.3)",
    borderRadius: 18,
    padding: "20px 24px",
    maxWidth: 380,
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },

  /* ── History card ── */
  historyCard: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    padding: "22px 24px",
    background: "rgba(22,18,50,0.5)",
    border: "1px solid rgba(139,92,246,0.1)",
    borderRadius: 18,
    marginBottom: 14,
    transition: "all 0.3s ease",
  },

  /* ── Section headings ── */
  sectionTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 700,
    color: "#fff",
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: 14,
    color: "#6d6b85",
    marginBottom: 0,
  },

  /* ── Appointment page top btn ── */
  viewApptBtn: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: 600,
    fontSize: 13,
    border: "1px solid rgba(139,92,246,0.25)",
    borderRadius: 999,
    padding: "10px 24px",
    cursor: "pointer",
    background: "rgba(139,92,246,0.08)",
    color: "#a78bfa",
    transition: "all 0.3s ease",
    marginTop: 20,
  },
};

/* ================================================================
   COMPONENT
   ================================================================ */
export default function AppointmentBooking() {
  const [step, setStep] = useState(1);
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [aiSymptoms, setAiSymptoms] = useState("");
  const [isMatching, setIsMatching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hoveredDoc, setHoveredDoc] = useState(null);

  const [appointments, setAppointments] = useState([]);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState("");

  const headerRef = useRef(null);
  const API_URL = "http://localhost:5000/api";

  /* ── Fetch doctors ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await axios.get(`${API_URL}/doctors`, { timeout: 3000 });
        setDoctors(res.data?.length ? res.data : FALLBACK_DOCTORS);
      } catch {
        setDoctors(FALLBACK_DOCTORS);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── GSAP header entrance ── */
  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out" });
    }
  }, []);

  /* ── Notification permission ── */
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission();
  }, []);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split("T")[0];

  const getAvailableTimes = (d) => d?.availableTimes?.length ? d.availableTimes : DEFAULT_TIMES;

  /* ── AI match ── */
  const handleAiMatch = async (e) => {
    e.preventDefault();
    if (!aiSymptoms) return;
    setIsMatching(true);
    try {
      const res = await axios.post(`${API_URL}/doctors/match`, { symptoms: aiSymptoms }, { timeout: 5000 });
      const rec = res.data?.recommended_doctors;
      if (rec?.length) setDoctors(rec);
    } catch {
      const kw = aiSymptoms.toLowerCase();
      const f = FALLBACK_DOCTORS.filter((d) => d.specialty.toLowerCase().includes(kw) || d.bio.toLowerCase().includes(kw));
      setDoctors(f.length ? f : FALLBACK_DOCTORS);
    } finally {
      setIsMatching(false);
    }
  };

  const handleResetMatch = async () => {
    setAiSymptoms("");
    setIsMatching(true);
    try {
      const res = await axios.get(`${API_URL}/doctors`, { timeout: 3000 });
      setDoctors(res.data?.length ? res.data : FALLBACK_DOCTORS);
    } catch {
      setDoctors(FALLBACK_DOCTORS);
    } finally {
      setIsMatching(false);
    }
  };

  const handleSelectDoctor = (doc) => { setSelectedDoctor(doc); setStep(2); };

  const handleBookSlot = (e) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime) { alert("Please select a date and time"); return; }
    setStep(3);
  };

  const handleConfirmBooking = () => {
    const appt = {
      id: Date.now().toString(),
      doctor: selectedDoctor,
      date: selectedDate,
      time: selectedTime,
      notes: patientNotes,
      status: "Confirmed",
    };
    setAppointments((p) => [...p, appt]);
    setStep(4);
    scheduleReminder(appt);
  };

  const scheduleReminder = (appt) => {
    const msg = `Reminder: Appointment with ${appt.doctor.name} on ${appt.date} at ${appt.time}.`;
    setTimeout(() => {
      setNotificationMsg(msg);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 8000);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Appointment Reminder", { body: msg, icon: appt.doctor.image });
      }
    }, 4000);
  };

  const resetForm = () => { setStep(1); setSelectedDoctor(null); setSelectedDate(""); setSelectedTime(""); setPatientNotes(""); };

  /* ── Framer variants ── */
  const fadeSlide = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -20 },
  };
  const springPop = { type: "spring", stiffness: 300, damping: 24 };

  /* ── Step labels ── */
  const steps = ["Select", "Schedule", "Confirm"];

  /* ════════════════════════════════════════════
     R E N D E R
     ════════════════════════════════════════════ */
  return (
    <ReactLenis root>
      <div style={S.page}>
        {/* ── Header ── */}
        <div ref={headerRef} style={S.headerWrap}>
          <span style={S.badge}>✦ AI-Powered Booking</span>
          <h1 style={S.h1}>Find Your Perfect Specialist</h1>
          <p style={S.subtitle}>
            Book appointments with top-rated doctors effortlessly. Describe your symptoms and let our AI find the right match.
          </p>
          {appointments.length > 0 && step !== 0 && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep(0)}
              style={S.viewApptBtn}
            >
              📋 View My Appointments ({appointments.length})
            </motion.button>
          )}
        </div>

        {/* ── Notification toast ── */}
        <AnimatePresence>
          {showNotification && (
            <motion.div
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              style={S.toast}
            >
              <div style={{ ...S.infoIcon, background: "rgba(139,92,246,0.15)", fontSize: 18 }}>🔔</div>
              <div>
                <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#a78bfa", marginBottom: 4 }}>
                  AI Reminder
                </div>
                <div style={{ fontSize: 13, color: "#b0adc4", lineHeight: 1.5 }}>{notificationMsg}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main card ── */}
        <div style={S.mainCard}>
          {/* Stepper */}
          {step > 0 && step < 4 && (
            <div style={S.stepperBar}>
              {steps.map((label, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <div style={S.stepLine(step > i)} />}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={S.stepDot(step === i + 1, step > i + 1)}>
                      {step > i + 1 ? "✓" : i + 1}
                    </div>
                    <span style={S.stepLabel(step >= i + 1)}>{label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}

          <div style={S.content}>
            <AnimatePresence mode="wait">

              {/* ═══ STEP 0 — History ═══ */}
              {step === 0 && (
                <motion.div key="s0" initial="initial" animate="in" exit="out" variants={fadeSlide} transition={springPop}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <h3 style={S.sectionTitle}>Your Appointments</h3>
                      <p style={S.sectionSub}>Manage and review your upcoming visits</p>
                    </div>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={resetForm} style={S.btnPill}>
                      + Book New
                    </motion.button>
                  </div>

                  {appointments.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "60px 20px", borderRadius: 20, border: "1px dashed rgba(139,92,246,0.2)", color: "#4c4a6a" }}>
                      No appointments yet — book your first one!
                    </div>
                  ) : (
                    appointments.map((appt) => (
                      <motion.div whileHover={{ y: -3, borderColor: "rgba(139,92,246,0.3)" }} key={appt.id} style={S.historyCard}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <img src={appt.doctor.image} alt="" style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", border: "2px solid rgba(139,92,246,0.2)" }} />
                          <div>
                            <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{appt.doctor.name}</div>
                            <div style={{ fontSize: 12, color: "#7a7893" }}>{appt.doctor.specialty}</div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                          <div style={{ fontSize: 13, color: "#a78bfa", fontWeight: 600 }}>📅 {appt.date} · {appt.time}</div>
                          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", padding: "5px 14px", borderRadius: 999, background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                            {appt.status}
                          </span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}

              {/* ═══ STEP 1 — Select Doctor ═══ */}
              {step === 1 && (
                <motion.div key="s1" initial="initial" animate="in" exit="out" variants={fadeSlide} transition={springPop}>
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <h3 style={S.sectionTitle}>Choose Your Specialist</h3>
                    <p style={S.sectionSub}>Browse our curated roster of top-rated physicians</p>
                  </div>

                  {/* AI search */}
                  <form onSubmit={handleAiMatch} style={{ marginTop: 24, marginBottom: 8 }}>
                    <div style={S.searchWrap}>
                      <span style={{ color: "#6d6b85", fontSize: 18, flexShrink: 0 }}>🔍</span>
                      <input
                        type="text"
                        value={aiSymptoms}
                        onChange={(e) => setAiSymptoms(e.target.value)}
                        placeholder="Describe symptoms for AI matching…"
                        style={S.searchInput}
                      />
                      {aiSymptoms && (
                        <button type="button" onClick={handleResetMatch} style={{ background: "none", border: "none", color: "#6d6b85", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>
                      )}
                      <button
                        type="submit"
                        disabled={isMatching || !aiSymptoms}
                        style={{
                          ...S.btnPill,
                          padding: "10px 22px",
                          fontSize: 12,
                          opacity: !aiSymptoms ? 0.4 : 1,
                        }}
                      >
                        {isMatching ? "Matching…" : "✦ AI Match"}
                      </button>
                    </div>
                  </form>

                  {/* Doctor grid */}
                  {loading ? (
                    <div style={{ textAlign: "center", padding: 80, color: "#6d6b85" }}>
                      <div style={{ width: 40, height: 40, border: "3px solid #7c3aed", borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 16px", animation: "spin 0.8s linear infinite" }} />
                      Loading specialists…
                      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </div>
                  ) : (
                    <div style={S.docGrid}>
                      {doctors.map((doc) => {
                        const id = doc._id || doc.id;
                        const isHov = hoveredDoc === id;
                        return (
                          <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                            style={{ ...S.docCard, ...(isHov ? S.docCardHover : {}) }}
                            onMouseEnter={() => setHoveredDoc(id)}
                            onMouseLeave={() => setHoveredDoc(null)}
                            onClick={() => handleSelectDoctor(doc)}
                          >
                            {/* Glow effect on hover */}
                            {isHov && (
                              <div style={{ position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)", pointerEvents: "none" }} />
                            )}
                            <img src={doc.image} alt={doc.name} style={S.docAvatar} />
                            <div style={S.docName}>{doc.name}</div>
                            <div style={S.docSpec}>{doc.specialty}</div>
                            <div style={S.docBio}>{doc.bio}</div>
                            <div style={S.docMeta}>
                              <div>
                                <div style={S.docMetaLabel}>Experience</div>
                                <div style={S.docMetaVal}>{doc.experience}</div>
                              </div>
                              <div style={{ width: 1, background: "rgba(139,92,246,0.15)", alignSelf: "stretch" }} />
                              <div>
                                <div style={S.docMetaLabel}>Fee</div>
                                <div style={S.docMetaVal}>{doc.fees}</div>
                              </div>
                            </div>
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                              style={{ ...S.btnPrimary, width: "100%", borderRadius: 14 }}
                              onClick={(e) => { e.stopPropagation(); handleSelectDoctor(doc); }}
                            >
                              Select &amp; Continue →
                            </motion.button>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* ═══ STEP 2 — Date & Time ═══ */}
              {step === 2 && selectedDoctor && (
                <motion.div key="s2" initial="initial" animate="in" exit="out" variants={fadeSlide} transition={springPop}>
                  <button style={S.btnBack} onClick={() => setStep(1)} onMouseEnter={(e) => (e.target.style.color = "#a78bfa")} onMouseLeave={(e) => (e.target.style.color = "#6d6b85")}>
                    ← BACK TO DOCTORS
                  </button>

                  {/* Selected doctor banner */}
                  <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "22px 26px", background: "rgba(22,18,50,0.6)", borderRadius: 18, border: "1px solid rgba(139,92,246,0.12)", marginBottom: 32 }}>
                    <img src={selectedDoctor.image} alt="" style={{ width: 64, height: 64, borderRadius: 18, objectFit: "cover", border: "2px solid rgba(167,139,250,0.3)" }} />
                    <div>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#818cf8", marginBottom: 4 }}>Scheduling with</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 22, color: "#fff" }}>{selectedDoctor.name}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                    {/* Date picker */}
                    <div style={{ background: "rgba(22,18,50,0.4)", padding: 26, borderRadius: 18, border: "1px solid rgba(139,92,246,0.1)" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: "#c4b5fd", marginBottom: 14 }}>① Choose Date</div>
                      <input
                        type="date"
                        min={minDate}
                        value={selectedDate}
                        onChange={(e) => { setSelectedDate(e.target.value); setSelectedTime(""); }}
                        style={{ width: "100%", padding: "14px 16px", background: "rgba(15,12,35,0.8)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 14, color: "#e4e2f0", fontFamily: "'Inter',sans-serif", fontSize: 14, outline: "none", cursor: "pointer" }}
                        required
                      />
                    </div>

                    {/* Time slots */}
                    <div style={{ background: "rgba(22,18,50,0.4)", padding: 26, borderRadius: 18, border: "1px solid rgba(139,92,246,0.1)" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 14, color: "#c4b5fd", marginBottom: 14 }}>② Pick a Time</div>
                      {selectedDate ? (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          {getAvailableTimes(selectedDoctor).map((t) => (
                            <motion.button
                              key={t}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setSelectedTime(t)}
                              style={S.timeSlot(selectedTime === t)}
                            >
                              {t}
                            </motion.button>
                          ))}
                        </div>
                      ) : (
                        <div style={{ padding: "32px 16px", textAlign: "center", borderRadius: 14, border: "1px dashed rgba(139,92,246,0.15)", color: "#4c4a6a", fontSize: 13 }}>
                          Select a date first to view slots
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
                    <motion.button
                      whileHover={selectedDate && selectedTime ? { scale: 1.03 } : {}}
                      whileTap={selectedDate && selectedTime ? { scale: 0.97 } : {}}
                      disabled={!selectedDate || !selectedTime}
                      onClick={handleBookSlot}
                      style={{ ...S.btnPrimary, opacity: !selectedDate || !selectedTime ? 0.35 : 1, padding: "16px 44px", fontSize: 15, borderRadius: 16 }}
                    >
                      Review Booking →
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 3 — Confirm ═══ */}
              {step === 3 && selectedDoctor && (
                <motion.div key="s3" initial="initial" animate="in" exit="out" variants={fadeSlide} transition={springPop}>
                  <button style={S.btnBack} onClick={() => setStep(2)} onMouseEnter={(e) => (e.target.style.color = "#a78bfa")} onMouseLeave={(e) => (e.target.style.color = "#6d6b85")}>
                    ← BACK TO SCHEDULE
                  </button>

                  <h3 style={{ ...S.sectionTitle, marginBottom: 24 }}>Confirm Your Appointment</h3>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                    <div>
                      <div style={S.infoRow}>
                        <div style={S.infoIcon}>👨‍⚕️</div>
                        <div>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#5a5874", marginBottom: 2 }}>Provider</div>
                          <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 17, color: "#fff" }}>{selectedDoctor.name}</div>
                        </div>
                      </div>
                      <div style={S.infoRow}>
                        <div style={S.infoIcon}>🗓️</div>
                        <div>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#5a5874", marginBottom: 2 }}>Date & Time</div>
                          <div style={{ fontWeight: 600, fontSize: 16, color: "#c4b5fd" }}>{selectedDate} <span style={{ color: "#6d6b85", margin: "0 6px" }}>at</span> {selectedTime}</div>
                        </div>
                      </div>
                      <div style={S.infoRow}>
                        <div style={S.infoIcon}>💳</div>
                        <div>
                          <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#5a5874", marginBottom: 2 }}>Consultation Fee</div>
                          <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>{selectedDoctor.fees}</div>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#5a5874", marginBottom: 10 }}>Symptom Notes (Optional)</div>
                      <textarea
                        value={patientNotes}
                        onChange={(e) => setPatientNotes(e.target.value)}
                        placeholder="Describe your symptoms to help the doctor prepare…"
                        style={{ flex: 1, minHeight: 120, padding: 18, background: "rgba(15,12,35,0.8)", border: "1px solid rgba(139,92,246,0.12)", borderRadius: 16, color: "#e4e2f0", fontFamily: "'Inter',sans-serif", fontSize: 14, outline: "none", resize: "none", lineHeight: 1.6 }}
                      />
                    </div>
                  </div>

                  {/* Reminder notice */}
                  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px", marginTop: 28, borderRadius: 16, background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}>
                    <span style={{ fontSize: 20 }}>🔔</span>
                    <span style={{ fontSize: 13, color: "#8b8a9e", lineHeight: 1.5 }}>
                      <strong style={{ color: "#a78bfa" }}>AI Reminder:</strong> You'll receive an automated notification 24 hours before your visit.
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 14, marginTop: 32, flexWrap: "wrap" }}>
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(2)} style={S.btnGhost}>
                      Cancel
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.03, ...S.btnPrimaryHover }} whileTap={{ scale: 0.97 }} onClick={handleConfirmBooking} style={{ ...S.btnPrimary, padding: "16px 44px", fontSize: 15, borderRadius: 16 }}>
                      Confirm Appointment ✓
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ═══ STEP 4 — Success ═══ */}
              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.45 }} style={{ textAlign: "center", padding: "56px 20px" }}>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1, rotate: 360 }}
                    transition={{ type: "spring", stiffness: 200, damping: 18, delay: 0.15 }}
                    style={{
                      width: 100, height: 100, borderRadius: 28,
                      background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.1))",
                      border: "2px solid rgba(139,92,246,0.3)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      margin: "0 auto 28px",
                      boxShadow: "0 0 60px rgba(124,58,237,0.2)",
                    }}
                  >
                    <svg width="48" height="48" fill="none" stroke="#a78bfa" strokeWidth="3" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </motion.div>

                  <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 34, fontWeight: 700, background: "linear-gradient(135deg, #c4b5fd, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 8 }}>
                    Booking Confirmed
                  </h2>

                  {selectedDoctor && (
                    <div style={{ background: "rgba(22,18,50,0.6)", border: "1px solid rgba(139,92,246,0.15)", borderRadius: 22, padding: "28px 32px", maxWidth: 420, margin: "20px auto 32px", textAlign: "left", position: "relative", overflow: "hidden" }}>
                      <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />
                      <div style={{ fontSize: 13, color: "#6d6b85", marginBottom: 6 }}>Scheduled with</div>
                      <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{selectedDoctor.name}</div>
                      <div style={{ fontSize: 15, color: "#a78bfa", fontWeight: 600, marginBottom: 20 }}>{selectedDate} · {selectedTime}</div>
                      <div style={{ height: 1, background: "rgba(139,92,246,0.1)", marginBottom: 14 }} />
                      <div style={{ fontFamily: "'Outfit',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "#4c4a6a", textAlign: "center" }}>
                        Confirmation #{Date.now().toString().slice(-6)}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={() => setStep(0)} style={S.btnGhost}>
                      View Calendar
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }} onClick={resetForm} style={S.btnPill}>
                      Book Another
                    </motion.button>
                  </div>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>

        {/* Ambient glow */}
        <div style={{ position: "fixed", bottom: -200, left: "50%", transform: "translateX(-50%)", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", pointerEvents: "none", zIndex: -1 }} />
      </div>
    </ReactLenis>
  );
}
