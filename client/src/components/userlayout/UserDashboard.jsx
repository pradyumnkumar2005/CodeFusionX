
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../axiosConfig";
import { acceptInvite, declineInvite, listMyInvites } from "../../api/projectApi";

function UserDashboard() {
  const [user, setUser] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([API.get("/auth/me"), API.get("/feedback/my"), listMyInvites()])
      .then(([u, f, i]) => {
        setUser(u.data);
        setFeedbacks(f.data);
        setInvites(Array.isArray(i.data) ? i.data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const onAccept = async (projectId, inviteId) => {
    try {
      await acceptInvite(projectId, inviteId);
      setInvites((prev) => prev.filter((x) => x.inviteId !== inviteId));
    } catch (err) {
      window.alert(err?.response?.data?.message || "Unable to accept invite.");
    }
  };

  const onDecline = async (projectId, inviteId) => {
    try {
      await declineInvite(projectId, inviteId);
      setInvites((prev) => prev.filter((x) => x.inviteId !== inviteId));
    } catch (err) {
      window.alert(err?.response?.data?.message || "Unable to decline invite.");
    }
  };

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
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "6px" }}>Welcome back, {user?.name} 👋</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>Here's what's happening with your account.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        {[
          { label: "Total Feedbacks", value: feedbacks.length, big: true, icon: "💬" },
          { label: "Email", value: user?.email, icon: "📧" },
          { label: "Role", value: user?.role, badge: true, icon: "🎖️" },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "14px" }}>
              <span>{s.icon}</span>
              <p style={{ fontSize: "13px", color: "var(--text-faint)", margin: 0 }}>{s.label}</p>
            </div>
            {s.badge ? (
              <span style={{ padding: "4px 12px", backgroundColor: "var(--primary-light)", color: "var(--primary)", fontSize: "12px", fontWeight: "700", borderRadius: "999px", textTransform: "capitalize" }}>{s.value}</span>
            ) : (
              <p style={{ fontSize: s.big ? "2.2rem" : "14px", fontWeight: s.big ? "900" : "600", color: "var(--text-main)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.value}</p>
            )}
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden", marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>Project Invites</h2>
            <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>Pending: {invites.length}</p>
          </div>

          {invites.map((inv, i) => (
            <div key={inv.inviteId} style={{ padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", borderBottom: i < invites.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: "14px", color: "var(--text-main)", margin: "0 0 5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.projectName}</p>
                <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>Role: <span style={{ textTransform: "capitalize" }}>{inv.role}</span></p>
              </div>
              <div style={{ display: "flex", gap: "10px", flexShrink: 0 }}>
                <button onClick={() => onAccept(inv.projectId, inv.inviteId)} style={{ padding: "8px 12px", borderRadius: "10px", border: "none", backgroundColor: "var(--primary)", color: "white", fontWeight: 700, cursor: "pointer" }}>Accept</button>
                <button onClick={() => onDecline(inv.projectId, inv.inviteId)} style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "transparent", color: "var(--text-muted)", fontWeight: 700, cursor: "pointer" }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", margin: 0 }}>Your Feedbacks</h2>
          <Link to="/feedback" style={{ fontSize: "13px", color: "var(--primary)", textDecoration: "none", fontWeight: "600" }}>+ Add Feedback</Link>
        </div>
        {feedbacks.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-faint)", fontSize: "14px", marginBottom: "16px" }}>No feedbacks yet.</p>
            <Link to="/feedback" style={{ color: "var(--primary)", fontSize: "14px", textDecoration: "none", fontWeight: "600" }}>Submit your first feedback →</Link>
          </div>
        ) : (
          feedbacks.slice(0, 5).map((fb, i) => (
            <div key={fb._id} style={{ padding: "16px 24px", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", borderBottom: i < Math.min(feedbacks.length, 5) - 1 ? "1px solid var(--border)" : "none" }}>
              <div>
                <p style={{ fontSize: "14px", color: "var(--text-main)", margin: "0 0 5px" }}>{fb.message}</p>
                <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0 }}>{new Date(fb.createdAt).toLocaleDateString()}</p>
              </div>
              <span style={{ color: "#facc15", fontSize: "13px", flexShrink: 0 }}>{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UserDashboard;
