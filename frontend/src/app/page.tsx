import Link from "next/link";

const plannedFeatures = [
  "Fetch registered Govee devices from the FastAPI backend",
  "Toggle power and apply scene commands per light",
  "Show room groupings and last-known device state",
];

export default function Page() {
  return (
    <main>
      <section
        style={{
          display: "grid",
          gap: 20,
          padding: "28px 0 36px",
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Frontend scaffold
        </p>
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(2.5rem, 7vw, 5.5rem)",
            lineHeight: 0.95,
          }}
        >
          A clean shell for your Govee control panel.
        </h1>
        <p style={{ margin: 0, maxWidth: 700, fontSize: 18, lineHeight: 1.6 }}>
          This Next app is intentionally thin right now. It gives me a stable
          starting point to wire device lists, room views, and command forms
          into the FastAPI service when I have time.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link
            href="/dashboard"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              background: "#1f1408",
              color: "#f7efe4",
              textDecoration: "none",
              borderRadius: 999,
            }}
          >
            Open dashboard scaffold
          </Link>
          <Link
            href="/blog"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              border: "1px solid rgba(31, 20, 8, 0.25)",
              color: "#1f1408",
              textDecoration: "none",
              borderRadius: 999,
            }}
          >
            View build notes
          </Link>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {plannedFeatures.map((feature) => (
          <article
            key={feature}
            style={{
              padding: 20,
              borderRadius: 20,
              background: "rgba(255, 248, 239, 0.7)",
              border: "1px solid rgba(31, 20, 8, 0.12)",
              boxShadow: "0 12px 30px rgba(31, 20, 8, 0.08)",
            }}
          >
            <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
              {feature}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
