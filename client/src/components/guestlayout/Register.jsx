
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../axiosConfig";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) { setError("All fields are required."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setError(""); setLoading(true);
    try {
      await API.post("/auth/register", form);
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally { setLoading(false); }
  };

  const inputStyle = { width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", backgroundColor: "var(--bg-main)" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "8px" }}>Create account</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "14px" }}>Get started for free today</p>
        </div>
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "40px" }}>
          {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "14px" }}>⚠️ {error}</div>}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { name: "name", type: "text", placeholder: "John Doe", label: "Full name" },
              { name: "email", type: "email", placeholder: "you@example.com", label: "Email address" },
              { name: "password", type: "password", placeholder: "••••••••", label: "Password" },
            ].map((field) => (
              <div key={field.name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>{field.label}</label>
                <input name={field.name} type={field.type} placeholder={field.placeholder} value={form[field.name]} onChange={handleChange} required style={inputStyle}
                  onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
              </div>
            ))}
            <button type="submit" disabled={loading}
              style={{ padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "15px", opacity: loading ? 0.6 : 1, transition: "background 0.2s" }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
            >
              {loading ? "Creating account..." : "Create Account →"}
            </button>
          </form>
          <p style={{ fontSize: "13px", color: "var(--text-faint)", textAlign: "center", marginTop: "24px" }}>
            Already have an account?{" "}
            <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
