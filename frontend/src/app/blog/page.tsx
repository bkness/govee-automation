import { Post } from "../ui/post";

const notes = [
  {
    slug: "frontend-direction",
    title: "Frontend direction",
    summary:
      "Define the dashboard shape and decide which lighting actions need first-class UI.",
  },
  {
    slug: "api-wiring",
    title: "API wiring",
    summary:
      "Add a lightweight fetch layer for device listings and control commands.",
  },
  {
    slug: "auth-handling",
    title: "Auth handling",
    summary:
      "Pick where the server key lives for local development and internal deployment.",
  },
];

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 18 }}>
      <header style={{ display: "grid", gap: 8 }}>
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            fontSize: 12,
          }}
        >
          Build notes
        </p>
        <h1 style={{ margin: 0, fontSize: 40 }}>What still needs wiring</h1>
        <p style={{ margin: 0, maxWidth: 720, lineHeight: 1.6 }}>
          These are placeholder notes so the route stays useful while the real
          control flow is still being built.
        </p>
      </header>
      <div style={{ display: "grid", gap: 14 }}>
        {notes.map((post) => (
          <Post key={post.slug} post={post} />
        ))}
      </div>
    </main>
  );
}
