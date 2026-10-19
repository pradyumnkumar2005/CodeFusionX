
import { useEffect, useState } from "react";
import API from "../../axiosConfig";

function AdminContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    API.get("/contact").then((r) => setContacts(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await API.put(`/contact/${id}/read`);
      setContacts((prev) => prev.map((c) => c._id === id ? { ...c, isRead: true } : c));
      if (selected?._id === id) setSelected((prev) => ({ ...prev, isRead: true }));
    } catch (err) {
      alert(err.response?.data?.message || "Failed.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this message?")) return;
    setDeletingId(id);
    try {
      await API.delete(`/contact/${id}`);
      setContacts((prev) => prev.filter((c) => c._id !== id));
      if (selected?._id === id) setSelected(null);
    } catch (err) {
      alert(err.response?.data?.message || "Failed.");
    } finally { setDeletingId(null); }
  };

  const filtered = contacts.filter(
    (c) => c.name?.toLowerCase().includes(search.toLowerCase()) ||
           c.email?.toLowerCase().includes(search.toLowerCase()) ||
           c.subject?.toLowerCase().includes(search.toLowerCase())
  );

  const unread = contacts.filter((c) => !c.isRead).length;

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "32px", height: "32px", border: "4px solid var(--border)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "40px 24px" }}>

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "16px", marginBottom: "32px" }}>
        <div>
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "4px" }}>Contact Messages</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>
            {contacts.length} total
            {unread > 0 && <span style={{ marginLeft: "8px", padding: "2px 10px", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "999px", fontSize: "12px", fontWeight: "700" }}>{unread} unread</span>}
          </p>
        </div>
        <input type="text" placeholder="Search messages..." value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", width: "280px" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1fr" : "1fr", gap: "24px" }}>

        {/* List */}
        <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "64px 24px", textAlign: "center" }}>
              <p style={{ color: "var(--text-faint)", fontSize: "14px" }}>No messages found.</p>
            </div>
          ) : (
            filtered.map((c, i) => (
              <div key={c._id}
                onClick={() => { setSelected(c); if (!c.isRead) handleMarkRead(c._id); }}
                style={{ padding: "18px 24px", borderBottom: i < filtered.length - 1 ? "1px solid var(--border)" : "none", cursor: "pointer", transition: "background 0.15s", backgroundColor: selected?._id === c._id ? "var(--primary-light)" : "transparent" }}
                onMouseEnter={(e) => { if (selected?._id !== c._id) e.currentTarget.style.backgroundColor = "var(--bg-secondary)"; }}
                onMouseLeave={(e) => { if (selected?._id !== c._id) e.currentTarget.style.backgroundColor = "transparent"; }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      {!c.isRead && <span style={{ width: "8px", height: "8px", backgroundColor: "var(--primary)", borderRadius: "50%", flexShrink: 0 }} />}
                      <p style={{ fontSize: "14px", fontWeight: c.isRead ? "500" : "700", color: "var(--text-main)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: 0, flexShrink: 0 }}>{new Date(c.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p style={{ fontSize: "13px", color: "var(--primary)", margin: "0 0 4px", fontWeight: "600" }}>{c.subject || "No subject"}</p>
                    <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.message}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(c._id); }} disabled={deletingId === c._id}
                    style={{ padding: "5px 10px", borderRadius: "7px", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", backgroundColor: "transparent", cursor: "pointer", fontSize: "11px", fontWeight: "600", flexShrink: 0, opacity: deletingId === c._id ? 0.5 : 1 }}>
                    {deletingId === c._id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail view */}
        {selected && (
          <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", alignSelf: "flex-start", position: "sticky", top: "80px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "800", color: "var(--text-main)", margin: 0 }}>Message Detail</h2>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: "18px", lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {[
                { label: "From", value: selected.name },
                { label: "Email", value: selected.email },
                { label: "Subject", value: selected.subject || "—" },
                { label: "Received", value: new Date(selected.createdAt).toLocaleString() },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", gap: "12px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-faint)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", width: "64px", flexShrink: 0, paddingTop: "2px" }}>{item.label}</span>
                  <span style={{ fontSize: "14px", color: "var(--text-main)", fontWeight: "500" }}>{item.value}</span>
                </div>
              ))}

              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginTop: "4px" }}>
                <p style={{ fontSize: "12px", color: "var(--text-faint)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "10px" }}>Message</p>
                <p style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>{selected.message}</p>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                <a href={`mailto:${selected.email}?subject=Re: ${selected.subject || ""}`}
                  style={{ flex: 1, padding: "10px", borderRadius: "9px", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "600", fontSize: "13px", textAlign: "center", transition: "background 0.2s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
                >
                  Reply via Email
                </a>
                <button onClick={() => handleDelete(selected._id)}
                  style={{ padding: "10px 16px", borderRadius: "9px", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", backgroundColor: "transparent", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default AdminContacts;
