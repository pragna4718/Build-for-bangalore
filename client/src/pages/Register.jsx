import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", gender: "male", dob: "" });
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Registration failed");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "400px", margin: "0 auto" }}>
      <h2>Register</h2>
      {error && <p style={{ color: "#ef4444" }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
        <input name="name" placeholder="Full Name" value={form.name} onChange={handleChange} required style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #333", background: "#1a1a1a", color: "#fff" }} />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #333", background: "#1a1a1a", color: "#fff" }} />
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #333", background: "#1a1a1a", color: "#fff" }} />
        <select name="gender" value={form.gender} onChange={handleChange} style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #333", background: "#1a1a1a", color: "#fff" }}>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </select>
        <input name="dob" type="date" value={form.dob} onChange={handleChange} required style={{ padding: "0.5rem", borderRadius: "4px", border: "1px solid #333", background: "#1a1a1a", color: "#fff" }} />
        <button type="submit" style={{ padding: "0.75rem", background: "#16a34a", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Register</button>
      </form>
      <p style={{ marginTop: "1rem" }}>Already have an account? <Link to="/login" style={{ color: "#2563eb" }}>Login</Link></p>
    </div>
  );
}
