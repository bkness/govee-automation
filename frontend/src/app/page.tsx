import Link from "next/link";

const NEON = "#00ffb4";
const CARD_BG = "rgba(15,25,40,0.85)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const STATS = [
  { label: "Devices", value: "9" },
  { label: "Rooms", value: "4" },
  { label: "Scenes", value: "5" },
  { label: "API", value: "Live" },
];

const FEATURES = [
  {
    icon: "⬡",
    title: "Room Control",
    desc: "Devices grouped by room. Living room, Kitchen, Office, Hallway — control each zone independently.",
  },
  {
    icon: "◎",
    title: "Scene Presets",
    desc: "One-click scenes fire across every device simultaneously. Focus, Relax, Movie, Night, All Off.",
  },
  {
    icon: "◑",
    title: "Full Spectrum",
    desc: "Per-device brightness, color temperature, and RGB color picker. White and color modes.",
  },
  {
    icon: "▸",
    title: "FastAPI Backend",
    desc: "Python backend proxies the Govee API with header auth, a shared httpx client, and clean error handling.",
  },
];

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 64, paddingTop: 20 }}>

      {/* Hero */}
      <section style={{ display: "grid", gap: 28, maxWidth: 760 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: "50%",
            background: NEON,
            boxShadow: `0 0 8px ${NEON}`,
            display: "inline-block",
          }} />
          <span style={{ fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.8 }}>
            System Online
          </span>
        </div>

        <h1 style={{
          margin: 0,
          fontSize: "clamp(2.8rem, 7vw, 5rem)",
          lineHeight: 0.95,
          letterSpacing: "-0.03em",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 800,
          color: "#f1f5f9",
        }}>
          Home lighting,<br />
          <span style={{
            color: "transparent",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            backgroundImage: `linear-gradient(90deg, ${NEON}, #00b4ff)`,
          }}>
            under control.
          </span>
        </h1>

        <p style={{
          margin: 0,
          fontSize: 17,
          lineHeight: 1.7,
          color: "#64748b",
          maxWidth: 560,
          fontFamily: "system-ui, sans-serif",
        }}>
          A self-hosted Govee control panel. FastAPI backend, Next.js frontend,
          real-time device commands — no cloud dashboard required.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              background: NEON,
              color: "#080c14",
              textDecoration: "none",
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              boxShadow: `0 0 24px rgba(0,255,180,0.3)`,
              transition: "all 0.15s",
            }}
          >
            Open Dashboard ›
          </Link>
          <Link
            href="/blog"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 22px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              color: "#94a3b8",
              textDecoration: "none",
              borderRadius: 10,
              fontSize: 13,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontFamily: "inherit",
              transition: "all 0.15s",
            }}
          >
            Build Notes
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 1,
        background: "rgba(255,255,255,0.04)",
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${CARD_BORDER}`,
      }}>
        {STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "20px 24px",
              background: CARD_BG,
              display: "grid",
              gap: 4,
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{
              fontSize: "clamp(1.6rem, 3vw, 2.2rem)",
              fontWeight: 800,
              color: NEON,
              fontFamily: "system-ui, sans-serif",
              textShadow: `0 0 20px rgba(0,255,180,0.4)`,
              lineHeight: 1,
            }}>
              {stat.value}
            </span>
            <span style={{ fontSize: 11, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {stat.label}
            </span>
          </div>
        ))}
      </section>

      {/* Feature grid */}
      <section style={{ display: "grid", gap: 20 }}>
        <h2 style={{
          margin: 0,
          fontSize: 11,
          color: "#475569",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontFamily: "inherit",
          fontWeight: 400,
        }}>
          What's inside
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: 12,
        }}>
          {FEATURES.map((f) => (
            <article
              key={f.title}
              style={{
                padding: "22px 24px",
                borderRadius: 14,
                background: CARD_BG,
                border: `1px solid ${CARD_BORDER}`,
                backdropFilter: "blur(12px)",
                display: "grid",
                gap: 10,
                boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
              }}
            >
              <span style={{ fontSize: 22, lineHeight: 1 }}>{f.icon}</span>
              <h3 style={{
                margin: 0,
                fontSize: 15,
                fontWeight: 700,
                color: "#e2e8f0",
                fontFamily: "system-ui, sans-serif",
              }}>
                {f.title}
              </h3>
              <p style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.65,
                color: "#64748b",
                fontFamily: "system-ui, sans-serif",
              }}>
                {f.desc}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* Stack footer */}
      <section style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        paddingTop: 8,
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}>
        {["Python 3.14", "FastAPI", "httpx", "pydantic-settings", "Next.js 16", "React 19", "TypeScript"].map((tech) => (
          <span
            key={tech}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.07)",
              color: "#475569",
              fontFamily: "inherit",
              letterSpacing: "0.04em",
            }}
          >
            {tech}
          </span>
        ))}
      </section>

    </main>
  );
}
