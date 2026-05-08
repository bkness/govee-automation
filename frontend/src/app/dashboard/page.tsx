const placeholderLights = [
  {
    name: "Living Room Lamp",
    status: "Offline placeholder",
    action: "Wire to GET /lights",
  },
  {
    name: "Desk Strip",
    status: "Offline placeholder",
    action: "Wire to PUT /lights/{device_id}/control",
  },
];

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 16 }}>
      <p style={{ margin: 0, maxWidth: 760, lineHeight: 1.6 }}>
        This route is ready for the real device list later. For now it gives you
        a stable place to add fetch logic, status cards, and command controls
        without fighting starter-template errors.
      </p>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 16,
        }}
      >
        {placeholderLights.map((light) => (
          <article
            key={light.name}
            style={{
              padding: 18,
              borderRadius: 18,
              background: "rgba(255, 248, 239, 0.72)",
              border: "1px solid rgba(31, 20, 8, 0.12)",
            }}
          >
            <h2 style={{ margin: "0 0 10px", fontSize: 22 }}>{light.name}</h2>
            <p style={{ margin: "0 0 8px", lineHeight: 1.5 }}>{light.status}</p>
            <p style={{ margin: 0, opacity: 0.8 }}>{light.action}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
