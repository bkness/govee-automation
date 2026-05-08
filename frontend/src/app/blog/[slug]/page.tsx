const noteContent: Record<string, { title: string; body: string }> = {
  "frontend-direction": {
    title: "Frontend direction",
    body: "Start with a dashboard that lists devices and provides a few safe control actions.",
  },
  "api-wiring": {
    title: "API wiring",
    body: "Connect the Next frontend to the FastAPI backend rather than calling Govee directly.",
  },
  "auth-handling": {
    title: "Auth handling",
    body: "Keep the internal API key on the server side and avoid exposing it in browser code.",
  },
};

export function generateStaticParams() {
  return Object.keys(noteContent).map((slug) => ({ slug }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const note = noteContent[slug];

  if (!note) {
    return (
      <article style={{ display: "grid", gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 36 }}>Note not found</h1>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          This placeholder route only has a few scaffold entries right now.
        </p>
      </article>
    );
  }

  return (
    <article style={{ display: "grid", gap: 12 }}>
      <p
        style={{
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
        }}
      >
        Note
      </p>
      <h1 style={{ margin: 0, fontSize: 36 }}>{note.title}</h1>
      <p style={{ margin: 0, lineHeight: 1.7, maxWidth: 720 }}>{note.body}</p>
    </article>
  );
}
