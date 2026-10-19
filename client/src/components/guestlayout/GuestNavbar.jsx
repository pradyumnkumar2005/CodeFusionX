
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "../ThemeToggle";

function GuestNavbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/about", label: "About" },
    { to: "/services", label: "Services" },
    { to: "/contact", label: "Contact" },
    { to: "/login", label: "Login" },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <style>{`
        .gnav-desktop { display: flex; align-items: center; gap: 4px; }
        .gnav-hamburger { display: none; }
        .gnav-mobile { display: none; padding-bottom: 16px; padding-top: 12px; flex-direction: column; gap: 4px; border-top: 1px solid var(--border); }
        .gnav-mobile.open { display: flex; }
        @media (max-width: 768px) {
          .gnav-desktop { display: none; }
          .gnav-hamburger { display: flex; }
        }
      `}</style>

      <nav style={{ position: "sticky", top: 0, zIndex: 50, backgroundColor: "var(--bg-nav)", backdropFilter: "blur(10px)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: "64px" }}>

            <Link to="/" style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none" }}>
              <div style={{ width: "34px", height: "34px", backgroundColor: "var(--primary)", borderRadius: "9px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "900", fontSize: "15px" }}>
                C
              </div>
              <span style={{ fontSize: "18px", fontWeight: "800", color: "var(--text-main)" }}>CodeFusion</span>
            </Link>

            {/* Desktop nav */}
            <div className="gnav-desktop">
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
              
              <Link to="/register"
                style={{ marginLeft: "8px", padding: "9px 20px", borderRadius: "9px", fontSize: "14px", fontWeight: "700", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", transition: "background 0.2s" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
              >
                Get Started →
              </Link>
              
              <ThemeToggle />
            </div>

            {/* Hamburger */}
            <div className="gnav-hamburger" style={{ alignItems: "center", gap: "8px" }}>
              <ThemeToggle />
              <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px", display: "flex" }}>
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {open
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  }
                </svg>
              </button>
            </div>

          </div>

          {/* Mobile menu */}
          <div className={`gnav-mobile ${open ? "open" : ""}`}>
            {[...links, { to: "/register", label: "Get Started →" }].map((link) => (
              <Link key={link.to} to={link.to} onClick={() => setOpen(false)} style={{
                padding: "11px 16px", borderRadius: "9px", fontSize: "14px", textDecoration: "none",
                color: isActive(link.to) ? "var(--primary)" : "var(--text-muted)",
                backgroundColor: isActive(link.to) ? "var(--primary-light)" : "transparent",
              }}>
                {link.label}
              </Link>
            ))}
          </div>

        </div>
      </nav>
    </>
  );
}

export default GuestNavbar;
