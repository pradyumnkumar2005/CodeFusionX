
import { Link } from "react-router-dom";

function GuestFooter() {
  const links = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/services", label: "Services" },
    { to: "/contact", label: "Contact" },
    { to: "/login", label: "Login" },
  ];

  return (
    <footer style={{ backgroundColor: "var(--bg-secondary)", borderTop: "1px solid var(--border)", padding: "48px 24px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", backgroundColor: "var(--primary)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "900", fontSize: "13px" }}>
              C
            </div>
            <span style={{ fontWeight: "700", color: "var(--text-main)", fontSize: "15px" }}>CodeFusion</span>
          </div>
          <p style={{ color: "var(--text-faint)", fontSize: "12px", margin: 0, textAlign: "center" }}>
            © {new Date().getFullYear()} CodeFusion. All rights reserved.
          </p>
          <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
            {links.map((link) => (
              <Link key={link.to} to={link.to}
                style={{ color: "var(--text-faint)", fontSize: "13px", textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={(e) => (e.target.style.color = "var(--primary)")}
                onMouseLeave={(e) => (e.target.style.color = "var(--text-faint)")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default GuestFooter;
