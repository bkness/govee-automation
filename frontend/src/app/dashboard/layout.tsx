import type { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <section style={{ display: "grid", gap: 20 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: 12,
          }}
        >
          Dashboard scaffold
        </p>
        <h1 style={{ margin: 0, fontSize: 40 }}>Light control workspace</h1>
      </header>
      {children}
    </section>
  );
}
