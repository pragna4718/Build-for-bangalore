import { useState } from "react";
import { motion } from "framer-motion";
import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── Mock weekly data ────────────────────────────────────────────────────────
const WEEKLY_STEPS = [
  { day: "Mon", steps: 6200, goal: 8000 },
  { day: "Tue", steps: 8750, goal: 8000 },
  { day: "Wed", steps: 7100, goal: 8000 },
  { day: "Thu", steps: 9300, goal: 8000 },
  { day: "Fri", steps: 5400, goal: 8000 },
  { day: "Sat", steps: 11200, goal: 8000 },
  { day: "Sun", steps: 8420, goal: 8000 },
];

const WEEKLY_HEART = [
  { day: "Mon", resting: 68, active: 142 },
  { day: "Tue", resting: 71, active: 156 },
  { day: "Wed", resting: 69, active: 138 },
  { day: "Thu", resting: 72, active: 162 },
  { day: "Fri", resting: 70, active: 148 },
  { day: "Sat", resting: 67, active: 175 },
  { day: "Sun", resting: 72, active: 144 },
];

const WEEKLY_SLEEP = [
  { day: "Mon", deep: 1.8, rem: 1.6, light: 3.2 },
  { day: "Tue", deep: 2.1, rem: 1.9, light: 3.5 },
  { day: "Wed", deep: 1.5, rem: 1.4, light: 2.8 },
  { day: "Thu", deep: 2.3, rem: 2.0, light: 3.8 },
  { day: "Fri", deep: 1.2, rem: 1.1, light: 2.5 },
  { day: "Sat", deep: 2.5, rem: 2.2, light: 4.0 },
  { day: "Sun", deep: 2.0, rem: 1.8, light: 3.4 },
];

const WEEKLY_CALORIES = [
  { day: "Mon", intake: 2100, burned: 2350 },
  { day: "Tue", intake: 1950, burned: 2600 },
  { day: "Wed", intake: 2200, burned: 2280 },
  { day: "Thu", intake: 1800, burned: 2700 },
  { day: "Fri", intake: 2050, burned: 2200 },
  { day: "Sat", intake: 2400, burned: 2900 },
  { day: "Sun", intake: 1840, burned: 2450 },
];

const MONTHLY_STEPS = [
  { week: "W1", avg: 7200 }, { week: "W2", avg: 8100 }, { week: "W3", avg: 6800 }, { week: "W4", avg: 9200 },
];

const MONTHLY_HEART = [
  { week: "W1", avg: 70 }, { week: "W2", avg: 68 }, { week: "W3", avg: 72 }, { week: "W4", avg: 69 },
];

const MONTHLY_SLEEP = [
  { week: "W1", avg: 6.8 }, { week: "W2", avg: 7.2 }, { week: "W3", avg: 6.5 }, { week: "W4", avg: 7.5 },
];

const MONTHLY_CALORIES = [
  { week: "W1", intake: 2050, burned: 2300 }, { week: "W2", intake: 1980, burned: 2500 },
  { week: "W3", intake: 2200, burned: 2100 }, { week: "W4", intake: 1900, burned: 2600 },
];

// ─── Chart Card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, children, icon, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      style={{
        background: "#0f0f1a",
        border: "1px solid #1e1e2e",
        borderRadius: "16px",
        padding: "1.25rem 1.5rem",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
        <span style={{ fontSize: "1.1rem" }}>{icon}</span>
        <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#ccc" }}>{title}</h4>
        <div style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: `0 0 8px ${color}` }} />
      </div>
      {children}
    </motion.div>
  );
}

// ─── Custom tooltip ──────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1a1a2e", border: "1px solid #2a2a4e", borderRadius: "8px", padding: "0.6rem 0.9rem", fontSize: "0.78rem" }}>
      <p style={{ margin: "0 0 0.4rem", color: "#888", fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ margin: "0.15rem 0", color: p.color }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Main component ──────────────────────────────────────────────────────────
export default function HealthCharts({ fullView = false }) {
  const [view, setView] = useState("weekly");
  const isWeekly = view === "weekly";

  const steps = isWeekly ? WEEKLY_STEPS : MONTHLY_STEPS;
  const heart = isWeekly ? WEEKLY_HEART : MONTHLY_HEART;
  const sleep = isWeekly ? WEEKLY_SLEEP : MONTHLY_SLEEP;
  const calories = isWeekly ? WEEKLY_CALORIES : MONTHLY_CALORIES;
  const xKey = isWeekly ? "day" : "week";

  const toggleStyle = (active) => ({
    padding: "0.35rem 0.9rem",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
    fontSize: "0.78rem",
    fontWeight: 600,
    background: active ? "#6366f1" : "#1a1a2e",
    color: active ? "#fff" : "#666",
    transition: "all 0.2s",
  });

  return (
    <div>
      {/* View toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#ccc" }}>
          {fullView ? "Health Analytics" : "Weekly Overview"}
        </h3>
        <div style={{ display: "flex", gap: "0.4rem", background: "#111", padding: "0.25rem", borderRadius: "8px", border: "1px solid #222" }}>
          <button style={toggleStyle(view === "weekly")} onClick={() => setView("weekly")}>Weekly</button>
          <button style={toggleStyle(view === "monthly")} onClick={() => setView("monthly")}>Monthly</button>
        </div>
      </div>

      {/* Charts grid */}
      <div style={{ display: "grid", gridTemplateColumns: fullView ? "repeat(auto-fill, minmax(420px, 1fr))" : "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>

        {/* Steps */}
        <ChartCard title="Daily Steps" icon="👟" color="#3b82f6">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={steps} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
              {isWeekly && <Bar dataKey="goal" fill="#1e2a4a" radius={[4,4,0,0]} name="Goal" />}
              <Bar dataKey={isWeekly ? "steps" : "avg"} fill="#3b82f6" radius={[4,4,0,0]} name="Steps" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Heart rate */}
        <ChartCard title="Heart Rate" icon="❤️" color="#ef4444">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={heart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
              <Tooltip content={<CustomTooltip />} />
              {isWeekly ? (
                <>
                  <Line type="monotone" dataKey="resting" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} name="Resting (bpm)" />
                  <Line type="monotone" dataKey="active" stroke="#f97316" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2, fill: "#f97316" }} name="Active (bpm)" />
                </>
              ) : (
                <Line type="monotone" dataKey="avg" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: "#ef4444" }} name="Avg (bpm)" />
              )}
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Sleep */}
        <ChartCard title="Sleep Stages" icon="🌙" color="#8b5cf6">
          <ResponsiveContainer width="100%" height={180}>
            {isWeekly ? (
              <BarChart data={sleep} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(139,92,246,0.06)" }} />
                <Legend wrapperStyle={{ fontSize: "0.72rem", color: "#666" }} />
                <Bar dataKey="deep" stackId="s" fill="#6d28d9" name="Deep (hr)" />
                <Bar dataKey="rem" stackId="s" fill="#8b5cf6" name="REM (hr)" />
                <Bar dataKey="light" stackId="s" fill="#c4b5fd" name="Light (hr)" radius={[4,4,0,0]} />
              </BarChart>
            ) : (
              <AreaChart data={sleep}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
                <XAxis dataKey={xKey} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="avg" stroke="#8b5cf6" fill="rgba(139,92,246,0.18)" strokeWidth={2.5} name="Avg (hr)" />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </ChartCard>

        {/* Calories */}
        <ChartCard title="Calories" icon="🔥" color="#f59e0b">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={calories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e2e" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="burned" stroke="#f59e0b" fill="rgba(245,158,11,0.12)" strokeWidth={2.5} name="Burned (kcal)" />
              <Area type="monotone" dataKey="intake" stroke="#10b981" fill="rgba(16,185,129,0.12)" strokeWidth={2} name="Intake (kcal)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>
    </div>
  );
}
