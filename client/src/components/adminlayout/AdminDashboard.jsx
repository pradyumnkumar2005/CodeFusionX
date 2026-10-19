
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../axiosConfig";

function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, feedbacks: 0 });
  const [recentFeedbacks, setRecentFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/admin/stats"), API.get("/feedback/all")])
      .then(([s, f]) => { setStats(s.data); setRecentFeedbacks(f.data.slice(0, 5)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ marginBottom: "40px" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "6px" }}>Admin Dashboard</h1>
        <p style={{ color: "var(--text-muted)" }}>Overview of your application.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {[
          { label: "Total Users", value: stats.users, icon: "👥" },
          { label: "Total Feedbacks", value: stats.feedbacks, icon: "💬" },
          { label: "Contact Messages", value: stats.contacts, icon: "📬", badge: stats.unreadContacts > 0, badgeText: `${stats.unreadContacts} unread` },
          { label: "System Status", icon: "🟢", badge: true, badgeText: "Operational", green: true },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span>{s.icon}</span>
              <p style={{ fontSize: "13px", color: "var(--text-faint)", margin: 0 }}>{s.label}</p>
            </div>
            {s.badge ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", margin: 0 }}>{s.value}</p>
                {s.badgeText && !s.green && <span style={{ padding: "2px 10px", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "999px", fontSize: "11px", fontWeight: "700" }}>{s.badgeText}</span>}
                {s.green && <span style={{ padding: "4px 12px", backgroundColor: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontSize: "12px", fontWeight: "700", borderRadius: "999px" }}>{s.badgeText}</span>}
              </div>
            ) : (
              <p style={{ fontSize: "2.2rem", fontWeight: "900", color: "var(--text-main)", margin: 0 }}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>Recent Feedbacks</h2>
          <Link to="/admin/feedbacks" style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>View all →</Link>
        </div>
        {recentFeedbacks.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-faint)", fontSize: "14px" }}>No feedbacks yet.</p>
          </div>
        ) : (
          recentFeedbacks.map((fb, i) => (
            <div key={fb._id} style={{ padding: "16px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", borderBottom: i < recentFeedbacks.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-main)", margin: "0 0 5px" }}>{fb.message}</p>
                <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>{fb.userId?.name || "Unknown"} · {new Date(fb.createdAt).toLocaleDateString()}</p>
              </div>
              <span style={{ color: "#facc15", fontSize: "13px", flexShrink: 0 }}>{"★".repeat(fb.rating)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
