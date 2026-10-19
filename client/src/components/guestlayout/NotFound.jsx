
import { Link, useLocation } from "react-router-dom";

function NotFound() {
  const location = useLocation();
  return (
    <div style={{ minHeight: "80vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", backgroundColor: "var(--bg-main)" }}>
      <p style={{ fontSize: "120px", fontWeight: "900", color: "var(--border)", lineHeight: 1, margin: 0, userSelect: "none" }}>404</p>
      <div style={{ marginTop: "-24px", position: "relative", zIndex: 1 }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "12px" }}>Page not found</h1>
        <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "8px" }}>
          The page{" "}
          <code style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", padding: "2px 8px", borderRadius: "6px", fontSize: "13px" }}>
            {location.pathname}
          </code>{" "}
          does not exist.
        </p>
        <p style={{ color: "var(--text-faint)", fontSize: "13px", marginBottom: "32px" }}>It may have been moved, deleted, or the URL is incorrect.</p>
        <Link to="/"
          style={{ display: "inline-block", padding: "12px 28px", borderRadius: "10px", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "700", fontSize: "14px", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
        >
          ← Back to Home
        </Link>
      </div>
    </div>
  );
}

export default NotFound;
