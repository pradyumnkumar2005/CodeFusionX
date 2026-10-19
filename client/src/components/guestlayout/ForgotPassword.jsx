
import { useState } from "react";
import { Link } from "react-router-dom";
import API from "../../axiosConfig";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required."); return; }
    setError(""); setLoading(true);
    try {
      await API.post("/auth/forgot-password", { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", backgroundColor: "var(--bg-main)" }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>

        {submitted ? (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "48px 40px", textAlign: "center" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>📬</div>
            <h2 style={{ fontSize: "1.6rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "12px" }}>Check your inbox</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.8, marginBottom: "32px" }}>
              If <strong style={{ color: "var(--text-main)" }}>{email}</strong> is registered,
              we have sent a new temporary password to that address.
              Please check your inbox and login with the new password.
            </p>
            <Link to="/login"
              style={{ display: "inline-block", padding: "12px 28px", borderRadius: "10px", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "14px", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
            >
              Go to Login →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <h2 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "8px" }}>Forgot password?</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.7 }}>
                Enter your email address and we will send you a new temporary password.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "40px" }}>
              {error && (
                <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "14px" }}>
                  ⚠️ {error}
                </div>
              )}
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Email address</label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", boxSizing: "border-box", transition: "border-color 0.2s" }}
                    onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
                    onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                  />
                </div>
                <button type="submit" disabled={loading}
                  style={{ padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "15px", opacity: loading ? 0.6 : 1, transition: "background 0.2s" }}
                  onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
                >
                  {loading ? "Sending..." : "Send New Password →"}
                </button>
              </form>
              <p style={{ fontSize: "13px", color: "var(--text-faint)", textAlign: "center", marginTop: "24px" }}>
                Remembered it?{" "}
                <Link to="/login" style={{ color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>Back to Login</Link>
              </p>
            </div>
          </>
        )}

      </div>
    </div>
  );
}

export default ForgotPassword;
