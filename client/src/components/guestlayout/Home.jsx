
import { Link } from "react-router-dom";

function Home() {
  return (
    <div style={{ color: "var(--text-main)" }}>

      <section style={{ position: "relative", padding: "128px 24px", textAlign: "center", overflow: "hidden", backgroundColor: "var(--bg-main)" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "700px", backgroundColor: "var(--primary)", borderRadius: "50%", filter: "blur(130px)", opacity: 0.07, pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: "860px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", backgroundColor: "var(--primary-light)", border: "1px solid var(--primary)", borderRadius: "999px", padding: "7px 18px", marginBottom: "32px" }}>
            ⚡ Welcome to CodeFusion
          </span>
          <h1 style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)", fontWeight: "900", lineHeight: 1.08, marginBottom: "24px", color: "var(--text-main)" }}>
            Build something<br />
            <span style={{ color: "var(--primary)" }}>extraordinary.</span>
          </h1>
          <p style={{ fontSize: "19px", color: "var(--text-muted)", maxWidth: "540px", lineHeight: 1.75, marginBottom: "44px" }}>
            CodeFusion delivers exceptional digital experiences. We combine design,
            technology, and strategy to create products that matter.
          </p>
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link to="/services"
              style={{ padding: "15px 36px", borderRadius: "11px", fontSize: "15px", fontWeight: "700", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", transition: "background 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
            >
              Our Services
            </Link>
            <Link to="/contact"
              style={{ padding: "15px 36px", borderRadius: "11px", fontSize: "15px", fontWeight: "600", textDecoration: "none", color: "var(--text-main)", border: "1px solid var(--border)", transition: "border-color 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              Get In Touch
            </Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "96px 24px", backgroundColor: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "64px", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", marginBottom: "12px" }}>About Us</p>
            <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "900", color: "var(--text-main)", marginBottom: "20px", lineHeight: 1.2 }}>
              We are CodeFusion.<br />Nice to meet you.
            </h2>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.85, marginBottom: "14px" }}>
              Founded with a passion for great software, CodeFusion is a team of
              developers, designers, and strategists who care deeply about the
              products they build.
            </p>
            <p style={{ color: "var(--text-faint)", lineHeight: 1.85, marginBottom: "32px" }}>
              Great products come from understanding people — their needs, frustrations,
              and goals. That belief drives everything we do.
            </p>
            <Link to="/about" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}>
              Learn more about us →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            {[
              { value: "5+", label: "Years Experience" },
              { value: "200+", label: "Projects Delivered" },
              { value: "50+", label: "Happy Clients" },
              { value: "99%", label: "Satisfaction Rate" },
            ].map((s) => (
              <div key={s.label} style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", textAlign: "center" }}>
                <div style={{ fontSize: "2rem", fontWeight: "900", color: "var(--primary)", marginBottom: "6px" }}>{s.value}</div>
                <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ padding: "96px 24px", backgroundColor: "var(--bg-main)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", textAlign: "center", marginBottom: "12px" }}>What We Do</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "900", textAlign: "center", color: "var(--text-main)", marginBottom: "64px" }}>Our Services</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {[
              { icon: "🎨", title: "UI/UX Design", desc: "Beautiful, intuitive interfaces that users love." },
              { icon: "💻", title: "Web Development", desc: "Fast, scalable web applications built with modern technologies." },
              { icon: "📱", title: "Mobile Apps", desc: "Native and cross-platform mobile apps that deliver exceptional experiences." },
              { icon: "☁️", title: "Cloud Solutions", desc: "Secure, reliable cloud infrastructure that scales with your business." },
              { icon: "🔍", title: "SEO & Marketing", desc: "Data-driven strategies to grow your online presence." },
              { icon: "🛠️", title: "Maintenance", desc: "Ongoing support to keep your digital products running smoothly." },
            ].map((s) => (
              <div key={s.title}
                style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "16px", padding: "28px", transition: "all 0.2s", cursor: "default" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "var(--shadow)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ fontSize: "28px", marginBottom: "16px" }}>{s.icon}</div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "var(--text-main)", marginBottom: "8px" }}>{s.title}</h3>
                <p style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.75, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "48px" }}>
            <Link to="/services" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "14px", fontWeight: "700" }}>View all services →</Link>
          </div>
        </div>
      </section>

      <section style={{ padding: "96px 24px", backgroundColor: "var(--bg-secondary)", borderTop: "1px solid var(--border)" }}>
        <div style={{ maxWidth: "660px", margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase", color: "var(--primary)", marginBottom: "12px" }}>Get In Touch</p>
          <h2 style={{ fontSize: "clamp(1.8rem, 3vw, 2.8rem)", fontWeight: "900", color: "var(--text-main)", marginBottom: "20px" }}>Ready to work together?</h2>
          <p style={{ color: "var(--text-muted)", lineHeight: 1.85, marginBottom: "40px" }}>
            Have a project in mind? Drop us a message and we will get back to you as soon as possible.
          </p>
          <Link to="/contact"
            style={{ display: "inline-block", padding: "15px 44px", borderRadius: "11px", fontSize: "15px", fontWeight: "700", textDecoration: "none", backgroundColor: "var(--primary)", color: "#fff", transition: "background 0.2s" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-hover)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--primary)")}
          >
            Start a Conversation →
          </Link>
        </div>
      </section>

    </div>
  );
}

export default Home;
