
import { useEffect, useState } from "react";
import API from "../../axiosConfig";

function UserFeedbacks() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    API.get("/feedback/all").then((r) => setFeedbacks(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this feedback?")) return;
    setDeletingId(id);
    try {
      await API.delete(`/admin/feedback/${id}`);
      setFeedbacks((prev) => prev.filter((fb) => fb._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Failed.");
    } finally { setDeletingId(null); }
  };

  const filtered = feedbacks.filter(
    (fb) => fb.message?.toLowerCase().includes(search.toLowerCase()) || fb.userId?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "4px" }}>Feedbacks</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>{feedbacks.length} total</p>
        </div>
        <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", width: "280px" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
      </div>

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-faint)", fontSize: "14px" }}>No feedbacks found.</p>
          </div>
        ) : (
          filtered.map((fb, i) => (
            <div key={fb._id} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", padding: "18px 24px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>{fb.userId?.name || "Unknown"}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{fb.userId?.email}</span>
                </div>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", margin: "0 0 6px", lineHeight: 1.7 }}>{fb.message}</p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ color: "#facc15", fontSize: "13px" }}>{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</span>
                  <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>{new Date(fb.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <button onClick={() => handleDelete(fb._id)} disabled={deletingId === fb._id}
                style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", fontWeight: "600", flexShrink: 0, opacity: deletingId === fb._id ? 0.5 : 1, transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                {deletingId === fb._id ? "..." : "Delete"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default UserFeedbacks;
