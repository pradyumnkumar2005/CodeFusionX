
function About() {
  return (
    <div style={{ color: "var(--text-main)" }}>

      <section style={{ maxWidth: "860px", margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
        <span style={{ display: "inline-block", fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", backgroundColor: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "999px", padding: "7px 18px", marginBottom: "24px" }}>
          About Us
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: "900", lineHeight: 1.12, marginBottom: "24px", color: "var(--text-main)" }}>
          The team behind<br />
          <span style={{ color: "var(--primary)" }}>CodeFusion</span>
        </h1>
        <p style={{ fontSize: "18px", color: "var(--text-muted)", maxWidth: "580px", margin: "0 auto", lineHeight: 1.8 }}>
          We are a passionate team of creators, builders and problem solvers dedicated to delivering exceptional digital experiences.
        </p>
      </section>

      <section style={{ padding: "80px 24px", backgroundColor: "var(--bg-secondary)", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "24px" }}>Our Story</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.9, marginBottom: "16px" }}>
            CodeFusion started as a small team with a big vision — to make exceptional digital products accessible to businesses of all sizes.
          </p>
          <p style={{ color: "var(--text-faint)", lineHeight: 1.9 }}>
            Today we work with startups, scale-ups, and enterprise companies across the globe. Every project is an opportunity to do our best work.
          </p>
        </div>
      </section>

      <section style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "20px" }}>
          {[
            { value: "5+", label: "Years Experience" },
            { value: "200+", label: "Projects Delivered" },
            { value: "50+", label: "Happy Clients" },
            { value: "99%", label: "Satisfaction Rate" },
          ].map((s) => (
            <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "32px", textAlign: "center" }}>
              <div style={{ fontSize: "2.5rem", fontWeight: "900", color: "var(--primary)", marginBottom: "8px" }}>{s.value}</div>
              <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "80px 24px", backgroundColor: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "900", textAlign: "center", color: "var(--text-main)", marginBottom: "56px" }}>What we stand for</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {[
              { icon: "🚀", title: "Speed First", desc: "Every decision is optimised for getting you to results faster." },
              { icon: "🔒", title: "Security Built In", desc: "Best practices and secure defaults are never afterthoughts." },
              { icon: "🧩", title: "Modular by Design", desc: "Every feature is separate. Add what you need, skip what you don't." },
              { icon: "📖", title: "Open and Transparent", desc: "No magic. Clean code that is fully yours to modify." },
            ].map((v) => (
              <div key={v.title} style={{ display: "flex", gap: "16px", backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "24px" }}>
                <div style={{ fontSize: "24px", flexShrink: 0 }}>{v.icon}</div>
                <div>
                  <h3 style={{ fontSize: "15px", fontWeight: "700", color: "var(--text-main)", marginBottom: "8px" }}>{v.title}</h3>
                  <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.75, margin: 0 }}>{v.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export default About;
