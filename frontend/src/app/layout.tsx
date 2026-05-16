import Link from "next/link";
import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          background: "#080c14",
          color: "#e2e8f0",
          minHeight: "100vh",
        }}
      >
        {/* Ambient background grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,255,180,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,180,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Neon top glow */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "60vw",
            height: 1,
            background: "linear-gradient(90deg, transparent, #00ffb4, transparent)",
            boxShadow: "0 0 80px 20px rgba(0,255,180,0.12)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 1200,
            margin: "0 auto",
            padding: "24px 24px 64px",
          }}
        >
          <nav
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 40,
              paddingBottom: 20,
              borderBottom: "1px solid rgba(0,255,180,0.12)",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#00ffb4",
                textDecoration: "none",
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(0,255,180,0.5)",
              }}
            >
              ⬡ Govee HUD
            </Link>
            <div style={{ display: "flex", gap: 24, fontSize: 13, letterSpacing: "0.06em" }}>
              <Link
                href="/dashboard"
                style={{ color: "#94a3b8", textDecoration: "none", textTransform: "uppercase" }}
              >
                Dashboard
              </Link>
              <Link
                href="/blog"
                style={{ color: "#94a3b8", textDecoration: "none", textTransform: "uppercase" }}
              >
                Notes
              </Link>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
