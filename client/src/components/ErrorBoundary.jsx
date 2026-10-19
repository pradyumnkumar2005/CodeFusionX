
import { Component } from "react";
import { Link } from "react-router-dom";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error("ErrorBoundary:", error, info); }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "48px 24px", backgroundColor: "var(--bg-main)" }}>
          <div style={{ maxWidth: "480px" }}>
            <div style={{ fontSize: "48px", marginBottom: "20px" }}>⚠️</div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "12px" }}>Something went wrong</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "14px", lineHeight: 1.8, marginBottom: "12px" }}>An unexpected error occurred and has been logged.</p>
            {this.state.error && (
              <p style={{ fontFamily: "monospace", fontSize: "12px", color: "#ef4444", backgroundColor: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", padding: "12px 16px", borderRadius: "10px", marginBottom: "24px", textAlign: "left", wordBreak: "break-all" }}>
                {this.state.error.message}
              </p>
            )}
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button onClick={() => this.setState({ hasError: false, error: null })}
                style={{ padding: "10px 24px", borderRadius: "9px", border: "none", cursor: "pointer", backgroundColor: "var(--primary)", color: "#fff", fontWeight: "600", fontSize: "14px" }}>
                Try Again
              </button>
              <Link to="/" style={{ padding: "10px 24px", borderRadius: "9px", textDecoration: "none", border: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: "600", fontSize: "14px" }}>
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
