import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 28 }}>
      <header style={{ display: "grid", gap: 6 }}>
        <p
          style={{
            margin: 0,
            fontSize: 11,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#00ffb4",
            opacity: 0.7,
          }}
        >
          Govee ·{" "}
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "#f1f5f9",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Light Control
        </h1>
      </header>
      {children}
    </section>
  );
}
