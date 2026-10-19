
import { useEffect, useState } from "react";
import API from "../../axiosConfig";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState(null);
  const limit = 10;

  useEffect(() => {
    API.get("/admin/users").then((r) => setUsers(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this user and all their feedbacks?")) return;
    setActionId(id);
    try {
      await API.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
    finally { setActionId(null); }
  };

  const handleToggleBan = async (id) => {
    setActionId(id);
    try {
      const res = await API.put(`/admin/users/${id}/ban`);
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, isBanned: res.data.isBanned } : u));
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
    finally { setActionId(null); }
  };

  const handleRoleChange = async (id, role) => {
    setActionId(id);
    try {
      const res = await API.put(`/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => u._id === id ? { ...u, role: res.data.user.role } : u));
    } catch (err) { alert(err.response?.data?.message || "Failed."); }
    finally { setActionId(null); }
  };

  const filtered = users.filter(
    (u) => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / limit);
  const paginated = filtered.slice((page - 1) * limit, page * limit);

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
          <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "4px" }}>Users</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>{users.length} total</p>
        </div>
        <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ padding: "10px 16px", borderRadius: "10px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "14px", outline: "none", width: "280px" }}
          onFocus={(e) => (e.target.style.borderColor = "var(--primary)")} onBlur={(e) => (e.target.style.borderColor = "var(--border)")} />
      </div>

      <div style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", overflow: "hidden" }}>
        {paginated.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <p style={{ color: "var(--text-faint)", fontSize: "14px" }}>No users found.</p>
          </div>
        ) : (
          paginated.map((u, i) => {
            const initials = u.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
            const isWorking = actionId === u._id;
            return (
              <div key={u._id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "16px", padding: "16px 24px", borderBottom: i < paginated.length - 1 ? "1px solid var(--border)" : "none" }}>

                <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: "1 1 200px", minWidth: 0 }}>
                  <div style={{ width: "38px", height: "38px", backgroundColor: "var(--primary)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: "900", flexShrink: 0 }}>{initials}</div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}</p>
                    <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</p>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ padding: "3px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", textTransform: "capitalize", backgroundColor: u.role === "admin" ? "rgba(139,92,246,0.1)" : "var(--primary-light)", color: u.role === "admin" ? "#8b5cf6" : "var(--primary)", border: `1px solid ${u.role === "admin" ? "rgba(139,92,246,0.3)" : "var(--primary)"}` }}>
                    {u.role}
                  </span>

                  <span style={{ padding: "3px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: "700", backgroundColor: u.isBanned ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)", color: u.isBanned ? "#ef4444" : "#10b981", border: `1px solid ${u.isBanned ? "rgba(239,68,68,0.3)" : "rgba(16,185,129,0.3)"}` }}>
                    {u.isBanned ? "Banned" : "Active"}
                  </span>

                  <select value={u.role} onChange={(e) => handleRoleChange(u._id, e.target.value)} disabled={isWorking}
                    style={{ padding: "5px 10px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-main)", fontSize: "12px", cursor: "pointer", outline: "none" }}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>

                  <button onClick={() => handleToggleBan(u._id)} disabled={isWorking}
                    style={{ padding: "6px 14px", borderRadius: "8px", border: `1px solid ${u.isBanned ? "rgba(16,185,129,0.4)" : "rgba(234,179,8,0.4)"}`, color: u.isBanned ? "#10b981" : "#eab308", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: isWorking ? 0.5 : 1 }}>
                    {u.isBanned ? "Unban" : "Ban"}
                  </button>

                  <button onClick={() => handleDelete(u._id)} disabled={isWorking}
                    style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444", backgroundColor: "transparent", cursor: "pointer", fontSize: "12px", fontWeight: "600", opacity: isWorking ? 0.5 : 1 }}>
                    Delete
                  </button>
                </div>

              </div>
            );
          })
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderTop: "1px solid var(--border)" }}>
            <p style={{ fontSize: "13px", color: "var(--text-faint)", margin: 0 }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, filtered.length)} of {filtered.length}
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", opacity: page === 1 ? 0.4 : 1 }}>
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)}
                  style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: p === page ? "var(--primary)" : "var(--bg-input)", color: p === page ? "#fff" : "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontWeight: p === page ? "700" : "400" }}>
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 14px", borderRadius: "8px", border: "1px solid var(--border)", backgroundColor: "var(--bg-input)", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", opacity: page === totalPages ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
