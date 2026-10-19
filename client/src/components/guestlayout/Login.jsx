
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../axiosConfig";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password.trim()) { setError("Email and password are required."); return; }
    setError(""); setLoading(true);
    try {
      const res = await API.post("/auth/login", form);
      navigate(res.data.user.role === "admin" ? "/admin" : "/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", backgroundColor: "var(--bg-main)" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "8px" }}>Welcome back</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Login to your account to continue</p>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "40px" }}>
          {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "14px" }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Email address</label>
              <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Password</label>
              <input name="password" type="password" placeholder="••••••••" value={form.password} onChange={handleChange} required style={inputStyle}
                onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <button type="submit" disabled={loading}
              style={{ padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "15px", opacity: loading ? 0.6 : 1, transition: "background 0.2s" }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
            >
              {loading ? "Logging in..." : "Login →"}
            </button>
          </form>
          <p style={{ fontSize: "13px", color: "var(--text-faint)", textAlign: "center", marginTop: "24px" }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>Create one</Link>
          </p>
          <div style={{ display: "flex", justifyContent: "center",marginTop:"10px" }}>
            <Link to="/forgot-password" style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
