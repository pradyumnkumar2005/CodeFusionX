
import { useState } from "react";
import API from "../../axiosConfig";

function FeedbackForm() {
  const [form, setForm] = useState({ message: "", rating: 0 });
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const ratingLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.rating === 0) { setError("Please select a rating."); return; }
    setError(""); setLoading(true);
    try {
      await API.post("/feedback", form);
      setSuccess(true);
      setForm({ message: "", rating: 0 });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit.");
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: "680px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "8px" }}>Submit Feedback</h1>
        <p style={{ color: "var(--text-muted)" }}>Share your experience and help us improve.</p>
      </div>
      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "36px" }}>
        {success && <div style={{ backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "14px" }}>✅ Feedback submitted! Thank you.</div>}
        {error && <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", fontSize: "14px" }}>⚠️ {error}</div>}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "12px" }}>Rate your experience</label>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} type="button"
                  onClick={() => setForm({ ...form, rating: star })}
                  onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(0)}
                  style={{ fontSize: "32px", background: "none", border: "none", cursor: "pointer", color: star <= (hover || form.rating) ? "#facc15" : "var(--border)", transition: "color 0.15s" }}
                >★</button>
              ))}
              {form.rating > 0 && <span style={{ fontSize: "13px", color: "var(--text-muted)", marginLeft: "8px" }}>{ratingLabels[form.rating]}</span>}
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px" }}>Your feedback</label>
            <textarea rows={5} placeholder="Tell us about your experience..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required
              style={{ width: "100%", padding: "12px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", resize: "none", boxSizing: "border-box" }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <button type="submit" disabled={loading}
            style={{ alignSelf: "flex-start", padding: "12px 32px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "15px", opacity: loading ? 0.6 : 1 }}
            onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
          >
            {loading ? "Submitting..." : "Submit Feedback →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FeedbackForm;
