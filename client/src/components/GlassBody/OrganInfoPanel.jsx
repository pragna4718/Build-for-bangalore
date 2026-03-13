import { motion, AnimatePresence } from "framer-motion";

const ORGAN_DATA = {
  heart: {
    name: "Heart",
    icon: "❤️",
    metrics: [
      { label: "Resting Heart Rate", value: "78 bpm", status: "normal" },
      { label: "Blood Pressure", value: "128/82 mmHg", status: "warning" },
      { label: "Cardiovascular Risk", value: "Moderate", status: "warning" },
    ],
    recommendations: [
      "Increase aerobic activity to 150 min/week",
      "Reduce sodium intake below 2,300 mg/day",
      "Monitor blood pressure weekly",
    ],
  },
  lungs: {
    name: "Lungs",
    icon: "🫁",
    metrics: [
      { label: "SpO2", value: "97%", status: "normal" },
      { label: "Respiratory Rate", value: "16/min", status: "normal" },
      { label: "Lung Capacity", value: "Good", status: "normal" },
    ],
    recommendations: [
      "Continue regular breathing exercises",
      "Avoid prolonged exposure to pollutants",
    ],
  },
  liver: {
    name: "Liver",
    icon: "🫘",
    metrics: [
      { label: "ALT Level", value: "42 U/L", status: "warning" },
      { label: "AST Level", value: "38 U/L", status: "normal" },
      { label: "Liver Health", value: "Monitor", status: "warning" },
    ],
    recommendations: [
      "Reduce alcohol consumption",
      "Increase antioxidant-rich foods",
      "Schedule liver function test in 3 months",
    ],
  },
  kidneyL: {
    name: "Left Kidney",
    icon: "🫘",
    metrics: [
      { label: "Creatinine", value: "1.0 mg/dL", status: "normal" },
      { label: "GFR", value: "92 mL/min", status: "normal" },
      { label: "Kidney Function", value: "Good", status: "normal" },
    ],
    recommendations: ["Stay hydrated — aim for 2.5L water/day", "Limit processed food intake"],
  },
  kidneyR: {
    name: "Right Kidney",
    icon: "🫘",
    metrics: [
      { label: "Creatinine", value: "1.0 mg/dL", status: "normal" },
      { label: "GFR", value: "92 mL/min", status: "normal" },
      { label: "Kidney Function", value: "Good", status: "normal" },
    ],
    recommendations: ["Stay hydrated — aim for 2.5L water/day", "Limit processed food intake"],
  },
  stomach: {
    name: "Digestive System",
    icon: "🫄",
    metrics: [
      { label: "Gut Health Score", value: "7.2/10", status: "normal" },
      { label: "Metabolic Rate", value: "1,820 kcal", status: "normal" },
      { label: "Glycemic Control", value: "Good", status: "normal" },
    ],
    recommendations: [
      "Increase fiber intake to 25g/day",
      "Add probiotic-rich foods",
    ],
  },
  brain: {
    name: "Brain",
    icon: "🧠",
    metrics: [
      { label: "Sleep Quality", value: "6.8/10", status: "warning" },
      { label: "Stress Level", value: "Moderate", status: "warning" },
      { label: "Cognitive Score", value: "85/100", status: "normal" },
    ],
    recommendations: [
      "Aim for 7-8 hours of sleep",
      "Practice mindfulness 10 min/day",
      "Reduce screen time before bed",
    ],
  },
  eyes: {
    name: "Eyes",
    icon: "👁️",
    metrics: [
      { label: "Vision Score", value: "Good", status: "normal" },
      { label: "Screen Time", value: "8.2 hrs/day", status: "warning" },
      { label: "Eye Strain", value: "Moderate", status: "warning" },
    ],
    recommendations: [
      "Follow 20-20-20 rule (every 20 min, look 20ft away for 20s)",
      "Use blue light filter after 8 PM",
    ],
  },
};

const statusColors = {
  normal: "#44ff88",
  warning: "#ffaa00",
  critical: "#ff2244",
};

const panelStyle = {
  position: "absolute",
  top: "50%",
  right: "20px",
  transform: "translateY(-50%)",
  width: "340px",
  background: "rgba(10, 10, 20, 0.95)",
  backdropFilter: "blur(20px)",
  border: "1px solid rgba(68, 136, 255, 0.3)",
  borderRadius: "16px",
  padding: "24px",
  color: "#e0e0e0",
  zIndex: 50,
  boxShadow: "0 0 40px rgba(68, 136, 255, 0.15)",
};

const metricRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid rgba(255,255,255,0.06)",
};

export default function OrganInfoPanel({ selectedOrgan, onClose, riskScores = {} }) {
  const data = ORGAN_DATA[selectedOrgan];
  if (!data) return null;

  const riskScore = riskScores[selectedOrgan] || 0.3;
  const riskLabel = riskScore > 0.7 ? "High Risk" : riskScore > 0.4 ? "Moderate Risk" : "Low Risk";
  const riskColor = riskScore > 0.7 ? "#ff2244" : riskScore > 0.4 ? "#ffaa00" : "#44ff88";

  return (
    <AnimatePresence>
      {selectedOrgan && (
        <motion.div
          style={panelStyle}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "1.8rem" }}>{data.icon}</span>
              <div>
                <h3 style={{ margin: 0, fontSize: "1.1rem", color: "#fff" }}>{data.name}</h3>
                <span style={{ fontSize: "0.75rem", color: riskColor, fontWeight: 600 }}>
                  ● {riskLabel}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "1px solid #333",
                color: "#888",
                borderRadius: "8px",
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: "0.8rem",
              }}
            >
              ✕
            </button>
          </div>

          {/* Risk bar */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ height: "4px", background: "#1a1a2e", borderRadius: "2px", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${riskScore * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                style={{ height: "100%", background: riskColor, borderRadius: "2px" }}
              />
            </div>
          </div>

          {/* Metrics */}
          <div style={{ marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
              Health Metrics
            </h4>
            {data.metrics.map((m, i) => (
              <div key={i} style={metricRowStyle}>
                <span style={{ fontSize: "0.85rem", color: "#aaa" }}>{m.label}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: statusColors[m.status] }}>
                  {m.value}
                </span>
              </div>
            ))}
          </div>

          {/* Recommendations */}
          <div>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "#888", textTransform: "uppercase", letterSpacing: "1px" }}>
              Recommendations
            </h4>
            {data.recommendations.map((rec, i) => (
              <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "6px", fontSize: "0.8rem", color: "#bbb" }}>
                <span style={{ color: "#4488ff" }}>→</span>
                <span>{rec}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
