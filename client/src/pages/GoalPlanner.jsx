import { useMemo, useState } from "react";
import { getGoalPlan } from "../services/healthService";

export default function GoalPlanner() {
  const [form, setForm] = useState({
    goalDescription: "Lose 5 kg in 12 weeks",
    currentWeightKg: 78,
    targetWeightKg: 73,
    targetWeeks: 12,
    currentSteps: 6500,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState(null);

  const progress = useMemo(() => {
    const current = Number(form.currentWeightKg) || 0;
    const target = Number(form.targetWeightKg) || 0;
    if (current <= 0 || target <= 0 || current <= target) return 0;
    const delta = current - target;
    return Math.round((delta / current) * 100);
  }, [form.currentWeightKg, form.targetWeightKg]);

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await getGoalPlan({
        userId: "demo-user",
        goalDescription: form.goalDescription,
        currentWeightKg: Number(form.currentWeightKg),
        targetWeightKg: Number(form.targetWeightKg),
        targetWeeks: Number(form.targetWeeks),
        currentSteps: Number(form.currentSteps),
      });
      setPlan(response.data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Unable to generate AI plan right now.");
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "1000px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Goal Planner &amp; What-If Simulator</h2>
      <p style={{ color: "#9ca3af", marginBottom: "1.5rem" }}>
        Build a personalized plan from your current baseline and target timeline.
      </p>

      <form
        onSubmit={submitPlan}
        style={{
          display: "grid",
          gap: "0.8rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          padding: "1rem",
          border: "1px solid #2a2a2a",
          borderRadius: "12px",
          background: "#0f1116",
        }}
      >
        <label>
          Goal Description
          <input
            value={form.goalDescription}
            onChange={(e) => setField("goalDescription", e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label>
          Current Weight (kg)
          <input
            type="number"
            value={form.currentWeightKg}
            onChange={(e) => setField("currentWeightKg", e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          Target Weight (kg)
          <input
            type="number"
            value={form.targetWeightKg}
            onChange={(e) => setField("targetWeightKg", e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          Target Weeks
          <input
            type="number"
            min="1"
            max="52"
            value={form.targetWeeks}
            onChange={(e) => setField("targetWeeks", e.target.value)}
            style={inputStyle}
          />
        </label>

        <label>
          Current Daily Steps
          <input
            type="number"
            value={form.currentSteps}
            onChange={(e) => setField("currentSteps", e.target.value)}
            style={inputStyle}
          />
        </label>

        <div style={{ display: "flex", alignItems: "end" }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              border: "none",
              borderRadius: "10px",
              padding: "0.75rem 1rem",
              background: loading ? "#374151" : "#16a34a",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {loading ? "Generating..." : "Generate AI Plan"}
          </button>
        </div>
      </form>

      <div style={{ marginTop: "1rem", color: "#9ca3af" }}>
        Estimated target shift: <strong style={{ color: "#86efac" }}>{progress}% body-weight reduction</strong>
      </div>

      {error && (
        <div style={{ marginTop: "1rem", color: "#fda4af", background: "#3f1d2e", padding: "0.75rem", borderRadius: "8px" }}>
          {error}
        </div>
      )}

      {plan && (
        <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }}>
          <div style={cardStyle}>
            <h3 style={{ marginTop: 0 }}>AI Summary</h3>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Confidence:</strong> {plan.confidence != null ? `${(plan.confidence * 100).toFixed(0)}%` : "N/A"}
            </p>
            <p style={{ marginBottom: "0.5rem" }}>
              <strong>Tip:</strong> {plan.weeklyTip || plan.tip || "Stay consistent and review weekly."}
            </p>
            <p style={{ margin: 0 }}>
              <strong>Total Weeks:</strong> {plan.totalWeeks || "N/A"}
            </p>
          </div>

          {Array.isArray(plan.milestones) && plan.milestones.length > 0 ? (
            <div style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>Weekly Milestones</h3>
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {plan.milestones.map((m, i) => (
                  <div key={i} style={{ border: "1px solid #2f3646", borderRadius: "8px", padding: "0.65rem" }}>
                    <strong>Week {m.week || i + 1}</strong>
                    <div style={{ color: "#a5b4fc" }}>{m.focus || "Progress checkpoint"}</div>
                    <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "0.25rem" }}>
                      {m.targetWeightKg != null && <span>Weight: {m.targetWeightKg} kg · </span>}
                      {m.stepsTarget != null && <span>Steps: {m.stepsTarget} · </span>}
                      {m.caloriesToBurn != null && <span>Burn: {m.caloriesToBurn} kcal/day</span>}
                      {m.sleepTarget != null && <span>Sleep: {m.sleepTarget}h</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <pre
            style={{
              ...cardStyle,
              margin: 0,
              whiteSpace: "pre-wrap",
              fontSize: "0.84rem",
              color: "#94a3b8",
              overflowX: "auto",
            }}
          >
            {JSON.stringify(plan, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  marginTop: "0.25rem",
  padding: "0.55rem 0.65rem",
  borderRadius: "8px",
  border: "1px solid #2f3646",
  background: "#131826",
  color: "#e5e7eb",
};

const cardStyle = {
  border: "1px solid #2a2a2a",
  borderRadius: "12px",
  padding: "1rem",
  background: "#0f1116",
  color: "#e5e7eb",
};
