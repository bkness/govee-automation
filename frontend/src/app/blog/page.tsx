import { Post } from "../ui/post";

const notes = [
  {
    slug: "backend-scaffold",
    title: "Scaffolding the FastAPI backend",
    summary:
      "Moved from a single main.py script to a proper app/ package with config, dependencies, and routers split into dedicated modules. Added pydantic-settings for type-safe env validation and a shared httpx lifespan client.",
    date: "May 2025",
    tag: "backend",
  },
  {
    slug: "cors-and-auth",
    title: "CORS middleware and header auth",
    summary:
      "Wired CORSMiddleware to allow the Next.js dev server to hit the FastAPI backend. Auth uses a server key passed via x-api-key header, validated in a shared require_auth dependency.",
    date: "May 2025",
    tag: "auth",
  },
  {
    slug: "dashboard-wiring",
    title: "Wiring the dashboard to real devices",
    summary:
      "Replaced placeholder cards with real Govee device data from GET /lights/. Each card has a power toggle, brightness slider, color temp slider, RGB color picker, and white/color mode tabs. Brightness and color temp are debounced to avoid spamming the API.",
    date: "May 2025",
    tag: "frontend",
  },
  {
    slug: "scene-presets",
    title: "Scene presets and room grouping",
    summary:
      "Added a scene bar that fires command sequences across all devices simultaneously — Focus, Relax, Movie, Night, All Off. Devices are also grouped into room sections (Living room, Kitchen, Office, Hallway) based on device name matching.",
    date: "May 2025",
    tag: "frontend",
  },
  {
    slug: "docker-and-infra",
    title: "Docker and project structure cleanup",
    summary:
      "Fixed the Dockerfile Python version mismatch (3.11 → 3.14-slim), updated the entry point to app.main:app, and added Python-specific ignores to the .gitignore which was previously a Node.js template.",
    date: "May 2025",
    tag: "infra",
  },
];

const NEON = "#00ffb4";

export default function Page() {
  return (
    <main style={{ display: "grid", gap: 32 }}>
      <header style={{ display: "grid", gap: 10 }}>
        <span style={{ fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.7 }}>
          Build Notes
        </span>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
        }}>
          How this got built
        </h1>
        <p style={{
          margin: 0,
          fontSize: 15,
          lineHeight: 1.7,
          color: "#64748b",
          maxWidth: 560,
          fontFamily: "system-ui, sans-serif",
        }}>
          A running log of decisions, refactors, and implementation notes for the Govee HUD.
        </p>
      </header>

      <div style={{ display: "grid", gap: 10 }}>
        {notes.map((note) => (
          <Post key={note.slug} post={note} />
        ))}
      </div>
    </main>
  );
}
