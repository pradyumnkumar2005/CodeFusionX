
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../../axiosConfig";

function AdminNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    navigate("/login");
  };

  const links = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
    { to: "/admin/feedbacks", label: "Feedbacks" },
     { to: "/admin/contacts", label: "Messages" },  
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{ backgroundColor: "var(--bg-nav)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>

        <Link to="/admin" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: "var(--primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "900", fontSize: "14px" }}>
            C
          </div>
          <span style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)" }}>CodeFusion Admin</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          {links.map((link) => (
            <Link key={link.to} to={link.to} style={{
              padding: "8px 16px", borderRadius: "8px", fontSize: "14px", textDecoration: "none", transition: "all 0.2s",
              color: isActive(link.to) ? "var(--primary)" : "var(--text-muted)",
              backgroundColor: isActive(link.to) ? "var(--primary-light)" : "transparent",
              fontWeight: isActive(link.to) ? "600" : "400",
            }}>
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            style={{ marginLeft: "8px", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px", fontWeight: "600", color: "#ef4444", backgroundColor: "transparent", transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Logout
          </button>
        </div>

      </div>
    </nav>
  );
}

export default AdminNavbar;
