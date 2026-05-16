import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { NavLink } from "./ui/nav-link";

export const metadata = {
  title: "Govee HUD",
  description: "Self-hosted smart light control panel",
};

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
        {/* Ambient grid */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,255,180,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,180,0.025) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Top neon glow */}
        <div
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "70vw",
            height: 1,
            background: "linear-gradient(90deg, transparent, #00ffb4, transparent)",
            boxShadow: "0 0 100px 30px rgba(0,255,180,0.08)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
        {/* Subtle corner glow bottom-right */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            right: 0,
            width: 400,
            height: 400,
            background: "radial-gradient(circle at 100% 100%, rgba(0,100,255,0.04), transparent 70%)",
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
            padding: "20px 24px 80px",
          }}
        >
          <nav
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              marginBottom: 40,
              paddingBottom: 18,
              borderBottom: "1px solid rgba(0,255,180,0.1)",
            }}
          >
            <Link
              href="/"
              style={{
                color: "#00ffb4",
                textDecoration: "none",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                textShadow: "0 0 20px rgba(0,255,180,0.5)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>⬡</span>
              Govee HUD
            </Link>
            <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/rooms">Rooms</NavLink>
              <NavLink href="/scenes">Scenes</NavLink>
              <NavLink href="/status">Status</NavLink>
              <NavLink href="/blog">Notes</NavLink>
            </div>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
