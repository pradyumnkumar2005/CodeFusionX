
import { useState } from "react";
import API from "../../axiosConfig";

function Contact() {
  
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      setError("Name, email and message are required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await API.post("/contact", form);
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message. Try again.");
    } finally {
      setLoading(false);
    }
  };
  

  const inputStyle = {
    width: "100%", padding: "12px 16px", borderRadius: "10px",
    border: "1px solid var(--border)", backgroundColor: "var(--bg-input)",
    color: "var(--text-main)", fontSize: "14px", outline: "none",
    boxSizing: "border-box", transition: "border-color 0.2s",
  };

  return (
    <div style={{ color: "var(--text-main)" }}>

      <section style={{ textAlign: "center", padding: "96px 24px 64px", backgroundColor: "var(--bg-main)" }}>
        <span style={{ display: "inline-block", fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", backgroundColor: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "999px", padding: "7px 18px", marginBottom: "24px" }}>
          Get In Touch
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: "900", color: "var(--text-main)", marginBottom: "20px", lineHeight: 1.12 }}>
          Let's build something<br />
          <span style={{ color: "var(--primary)" }}>great together</span>
        </h1>
        <p style={{ fontSize: "18px", color: "var(--text-muted)", maxWidth: "520px", margin: "0 auto", lineHeight: 1.8 }}>
          Have a project in mind? We would love to hear about it.
        </p>
      </section>

      <section style={{ padding: "32px 24px 96px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "56px", alignItems: "start" }}>

          {/* Contact Info — shown for both React and MERN */}
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "var(--text-main)", marginBottom: "28px" }}>Contact Information</h2>
            {[
              { icon: "📧", label: "Email", value: "hello@codefusion.com" },
              { icon: "📞", label: "Phone", value: "+1 (555) 000-0000" },
              { icon: "📍", label: "Location", value: "San Francisco, CA" },
              { icon: "🕒", label: "Hours", value: "Mon–Fri, 9am–6pm PST" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", gap: "16px", marginBottom: "28px", alignItems: "flex-start" }}>
                <div style={{ width: "46px", height: "46px", backgroundColor: "var(--primary-light)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                  {item.icon}
                </div>
                <div>
                  <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "1px", fontWeight: "600" }}>{item.label}</p>
                  <p style={{ fontSize: "15px", color: "var(--text-main)", margin: 0, fontWeight: "500" }}>{item.value}</p>
                </div>
              </div>
            ))}

            
          </div>

          
          {/* Contact Form — MERN only */}
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "36px" }}>
            {success ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <div style={{ fontSize: "52px", marginBottom: "16px" }}>✅</div>
                <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", marginBottom: "8px" }}>Message Sent!</h3>
                <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>We will get back to you within 24 hours.</p>
                <button onClick={() => setSuccess(false)} style={{ padding: "10px 24px", borderRadius: "9px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "600", fontSize: "14px" }}>
                  Send Another
                </button>
              </div>
            ) : (
              <>
                {error && (
                  <div style={{ backgroundColor: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", padding: "12px 16px", borderRadius: "10px", marginBottom: "20px", fontSize: "14px" }}>
                    ⚠️ {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Full Name *</label>
                      <input name="name" placeholder="John Doe" value={form.name} onChange={handleChange} required style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Email *</label>
                      <input name="email" type="email" placeholder="you@example.com" value={form.email} onChange={handleChange} required style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Subject</label>
                    <input name="subject" placeholder="How can we help?" value={form.subject} onChange={handleChange} style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <label style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-muted)" }}>Message *</label>
                    <textarea name="message" rows={5} placeholder="Tell us about your project..." value={form.message} onChange={handleChange} required
                      style={{ ...inputStyle, resize: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
                  </div>
                  <button type="submit" disabled={loading}
                    style={{ padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "15px", opacity: loading ? 0.6 : 1, transition: "background 0.2s" }}
                    onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
                  >
                    {loading ? "Sending..." : "Send Message →"}
                  </button>
                </form>
              </>
            )}
          </div>
          

        </div>
      </section>

    </div>
  );
}

export default Contact;
