import Link from "next/link";

const NEON = "#00ffb4";
const CARD_BG = "rgba(15,25,40,0.85)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const STATS = [
  { label: "Devices", value: "9" },
  { label: "Rooms", value: "4" },
  { label: "Scenes", value: "6" },
  { label: "API", value: "Live" },
];

const FEATURES = [
  {
    icon: "⬡",
    title: "Room Control",
    desc: "Devices grouped by room. Living room, Kitchen, Office, Hallway — master toggle per zone.",
    href: "/rooms",
    accent: "#ff9a3c",
  },
  {
    icon: "◎",
    title: "Scene Presets",
    desc: "Focus, Relax, Movie, Night, Party — one-click moods fire across every device simultaneously.",
    href: "/scenes",
    accent: NEON,
  },
  {
    icon: "◑",
    title: "Full Control",
    desc: "Per-device brightness, color temperature, and RGB color picker. White and color modes.",
    href: "/dashboard",
    accent: "#60b8ff",
  },
  {
    icon: "▸",
    title: "System Status",
    desc: "Live API health, device inventory table, and a terminal-style session log.",
    href: "/status",
    accent: "#a78bfa",
  },
];

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 72, paddingTop: 16 }}>

      {/* Hero */}
      <section style={{ display: "grid", gap: 32, maxWidth: 760 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="pulse-dot"
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: NEON,
              display: "inline-block",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase" as const, opacity: 0.8 }}>
            System Online
          </span>
        </div>

        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.8rem, 7vw, 5.2rem)",
            lineHeight: 0.95,
            letterSpacing: "-0.03em",
            fontFamily: "system-ui, sans-serif",
            fontWeight: 800,
            color: "#f1f5f9",
          }}
        >
          Home lighting,
          <br />
          <span
            style={{
              color: "transparent",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              backgroundImage: `linear-gradient(90deg, ${NEON} 0%, #00b4ff 100%)`,
            }}
          >
            under control.
          </span>
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: 17,
            lineHeight: 1.75,
            color: "#64748b",
            maxWidth: 520,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          A self-hosted Govee control panel. FastAPI backend, Next.js frontend,
          real-time device commands — no cloud dashboard required.
        </p>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" as const }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 24px",
              background: NEON,
              color: "#080c14",
              textDecoration: "none",
              borderRadius: 10,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              fontFamily: "monospace",
              boxShadow: `0 0 28px rgba(0,255,180,0.35)`,
            }}
          >
            Open Dashboard ›
          </Link>
          <Link
            href="/scenes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "13px 24px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.03)",
              color: "#94a3b8",
              textDecoration: "none",
              borderRadius: 10,
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
              fontFamily: "monospace",
            }}
          >
            Browse Scenes
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          background: "rgba(255,255,255,0.04)",
          borderRadius: 16,
          overflow: "hidden",
          border: `1px solid ${CARD_BORDER}`,
        }}
      >
        {STATS.map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: "22px 24px",
              background: CARD_BG,
              display: "grid",
              gap: 5,
              backdropFilter: "blur(12px)",
            }}
          >
            <span
              style={{
                fontSize: "clamp(1.8rem, 3vw, 2.4rem)",
                fontWeight: 800,
                color: NEON,
                fontFamily: "system-ui, sans-serif",
                textShadow: `0 0 24px rgba(0,255,180,0.4)`,
                lineHeight: 1,
              }}
            >
              {stat.value}
            </span>
            <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
              {stat.label}
            </span>
          </div>
        ))}
      </section>

      {/* Feature grid — links to pages */}
      <section style={{ display: "grid", gap: 20 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            color: "#334155",
            letterSpacing: "0.16em",
            textTransform: "uppercase" as const,
            fontFamily: "inherit",
            fontWeight: 400,
          }}
        >
          Explore
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {FEATURES.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              style={{ textDecoration: "none" }}
            >
              <article
                style={{
                  padding: "24px 24px 20px",
                  borderRadius: 16,
                  background: CARD_BG,
                  border: `1px solid ${CARD_BORDER}`,
                  backdropFilter: "blur(12px)",
                  display: "grid",
                  gap: 12,
                  boxShadow: "0 4px 24px rgba(0,0,0,0.3)",
                  cursor: "pointer",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  height: "100%",
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1, color: f.accent }}>
                  {f.icon}
                </span>
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px",
                      fontSize: 15,
                      fontWeight: 700,
                      color: "#e2e8f0",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {f.title}
                  </h3>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      lineHeight: 1.65,
                      color: "#64748b",
                      fontFamily: "system-ui, sans-serif",
                    }}
                  >
                    {f.desc}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: f.accent,
                    letterSpacing: "0.08em",
                    opacity: 0.7,
                    alignSelf: "end",
                  }}
                >
                  Open →
                </span>
              </article>
            </Link>
          ))}
        </div>
      </section>

      {/* Stack footer */}
      <section
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap" as const,
          paddingTop: 8,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {[
          "Python 3.14",
          "FastAPI",
          "httpx",
          "pydantic-settings",
          "Next.js 16",
          "React 19",
          "TypeScript",
          "uv",
        ].map((tech) => (
          <span
            key={tech}
            style={{
              fontSize: 10,
              padding: "4px 10px",
              borderRadius: 6,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#334155",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
            }}
          >
            {tech}
          </span>
        ))}
      </section>
    </main>
  );
}
