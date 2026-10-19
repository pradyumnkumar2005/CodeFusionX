
function Services() {
  const services = [
    { icon: "🎨", title: "UI/UX Design", desc: "Beautiful, intuitive interfaces that users love.", features: ["User Research", "Wireframing", "Prototyping", "Design Systems"] },
    { icon: "💻", title: "Web Development", desc: "Fast, scalable web applications built with modern technologies.", features: ["React / Next.js", "Node.js APIs", "REST & GraphQL", "Performance Optimization"] },
    { icon: "📱", title: "Mobile Apps", desc: "Native and cross-platform mobile apps that deliver exceptional experiences.", features: ["React Native", "iOS & Android", "Push Notifications", "Offline Support"] },
    { icon: "☁️", title: "Cloud Solutions", desc: "Secure, reliable cloud infrastructure that scales with your business.", features: ["AWS / GCP / Azure", "CI/CD Pipelines", "Auto-scaling", "Monitoring"] },
    { icon: "🔍", title: "SEO & Marketing", desc: "Data-driven strategies to grow your online presence.", features: ["Technical SEO", "Content Strategy", "Analytics", "Conversion Optimization"] },
    { icon: "🛠️", title: "Maintenance & Support", desc: "Ongoing support to keep your digital products running smoothly.", features: ["24/7 Monitoring", "Security Updates", "Performance Reports", "Priority Support"] },
  ];

  return (
    <div style={{ color: "var(--text-main)" }}>

      <section style={{ textAlign: "center", padding: "96px 24px 64px", backgroundColor: "var(--bg-main)" }}>
        <span style={{ display: "inline-block", fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", backgroundColor: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "999px", padding: "7px 18px", marginBottom: "24px" }}>
          What We Offer
        </span>
        <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: "900", color: "var(--text-main)", marginBottom: "20px", lineHeight: 1.12 }}>
          Services built for<br />
          <span style={{ color: "var(--primary)" }}>modern businesses</span>
        </h1>
        <p style={{ fontSize: "18px", color: "var(--text-muted)", maxWidth: "540px", margin: "0 auto", lineHeight: 1.8 }}>
          From design to deployment, we cover every aspect of digital product development.
        </p>
      </section>

      <section style={{ padding: "32px 24px 96px", backgroundColor: "var(--bg-main)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
          {services.map((s) => (
            <div key={s.title}
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "20px", padding: "32px", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
            >
              <div style={{ fontSize: "36px", marginBottom: "20px" }}>{s.icon}</div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-main)", marginBottom: "12px" }}>{s.title}</h3>
              <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.8, marginBottom: "24px" }}>{s.desc}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {s.features.map((f) => (
                  <li key={f} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-muted)" }}>
                    <span style={{ width: "20px", height: "20px", backgroundColor: "var(--primary-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "var(--primary)", flexShrink: 0, fontWeight: "700" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section style={{ padding: "80px 24px", backgroundColor: "var(--bg-secondary)", borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <h2 style={{ fontSize: "2rem", fontWeight: "900", color: "var(--text-main)", marginBottom: "16px" }}>Ready to get started?</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "32px", lineHeight: 1.8 }}>Tell us about your project and we will get back to you within 24 hours.</p>
        <a href="/contact"
          style={{ display: "inline-block", padding: "14px 40px", borderRadius: "11px", fontSize: "15px", fontWeight: "700", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", transition: "background 0.2s" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
        >
          Contact Us →
        </a>
      </section>

    </div>
  );
}

export default Services;
