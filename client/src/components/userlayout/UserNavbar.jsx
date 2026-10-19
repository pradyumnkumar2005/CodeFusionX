
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import API from "../../axiosConfig";

function UserNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => { API.get("/auth/me").then((r) => setUser(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    const handler = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    try { await API.post("/auth/logout"); } catch {}
    navigate("/login");
  };

  const links = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/feedback", label: "Feedback" },
    { to: "/editor", label: "Editor" },
  ];

  const isActive = (path) => location.pathname === path;
  const initials = user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <nav style={{ backgroundColor: "var(--bg-nav)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>

        <Link to="/dashboard" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
          <div style={{ width: "32px", height: "32px", backgroundColor: "var(--primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "900", fontSize: "14px" }}>
            C
          </div>
          <span style={{ fontSize: "17px", fontWeight: "800", color: "var(--text-main)" }}>CodeFusion</span>
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

          <div style={{ position: "relative", marginLeft: "8px" }} ref={dropdownRef}>
            <button onClick={() => setDropdownOpen((v) => !v)}
              style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px", borderRadius: "10px", border: "none", backgroundColor: "transparent", cursor: "pointer", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-card)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              <div style={{ width: "30px", height: "30px", backgroundColor: "var(--primary)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "11px", fontWeight: "900" }}>
                {initials}
              </div>
              <span style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-main)", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name || "Account"}</span>
              <svg style={{ width: "14px", height: "14px", color: "var(--text-faint)", transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {dropdownOpen && (
              <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: "220px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "14px", boxShadow: "var(--shadow)", zIndex: 50, overflow: "hidden" }}>
                <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name}</p>
                  <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: "3px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</p>
                </div>
                <Link to="/profile" onClick={() => setDropdownOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", textDecoration: "none", fontSize: "14px", color: "var(--text-muted)", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--bg-secondary)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  👤 Profile
                </Link>
                <button onClick={handleLogout}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "11px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "14px", color: "#ef4444", textAlign: "left", transition: "background 0.15s" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </nav>
  );
}

export default UserNavbar;
