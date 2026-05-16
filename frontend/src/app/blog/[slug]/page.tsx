import Link from "next/link";

const NEON = "#00ffb4";
const CARD_BG = "rgba(15,25,40,0.85)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const TAG_COLORS: Record<string, string> = {
  backend: "#00ffb4",
  frontend: "#00b4ff",
  infra: "#b47fff",
  auth: "#ff9a3c",
};

type Note = {
  title: string;
  date: string;
  tag: string;
  body: { heading?: string; text: string }[];
};

const noteContent: Record<string, Note> = {
  "backend-scaffold": {
    title: "Scaffolding the FastAPI backend",
    date: "May 2025",
    tag: "backend",
    body: [
      {
        text: "The project started as a single main.py with everything in one file — routes, config, auth, and the httpx client all living together. That's fine for a prototype, but not for something you're going to keep building on.",
      },
      {
        heading: "New structure",
        text: "Moved everything into an app/ package. config.py uses pydantic-settings to validate env vars at startup — if GOVEE_API_KEY or GOVEE_SERVER_KEY are missing, the server refuses to start with a clear error instead of silently running broken. dependencies.py holds require_auth so it's importable from any router. All the /lights routes live in app/routers/lights.py.",
      },
      {
        heading: "Shared httpx client",
        text: "The original code created a new httpx.AsyncClient() on every request. That means a new connection pool, new TLS handshake, new overhead — every time. The fix is a lifespan context manager that creates one client when the app starts, attaches it to app.state, and closes it cleanly on shutdown. Routes access it via request.app.state.http_client.",
      },
      {
        heading: "Why pydantic-settings over python-dotenv",
        text: "python-dotenv just loads vars into os.environ. pydantic-settings does that plus type coercion, validation, and a clean Settings object you can import anywhere. One less os.getenv() call scattered around the codebase.",
      },
    ],
  },
  "cors-and-auth": {
    title: "CORS middleware and header auth",
    date: "May 2025",
    tag: "auth",
    body: [
      {
        text: "Two separate problems that both needed solving before the frontend could talk to the backend.",
      },
      {
        heading: "CORS",
        text: "Browsers block cross-origin requests by default. The Next.js dev server runs on :3000, FastAPI on :8000 — different ports means different origin. Adding CORSMiddleware with allow_origins=[\"http://localhost:3000\"] tells the browser it's safe. Methods are locked to GET and PUT, and only the x-api-key and Content-Type headers are allowed through.",
      },
      {
        heading: "Header auth",
        text: "The API uses a server key passed as an x-api-key header. The require_auth dependency compares it against the GOVEE_SERVER_KEY env var and raises a 401 if they don't match. It's applied via Depends() on each protected route rather than in middleware, so the root health check stays public.",
      },
      {
        heading: "The zsh gotcha",
        text: "The server key contains a ! character. In zsh, double-quoted strings expand ! as a history event — so curl -H \"x-api-key: ...!...\" explodes. Single quotes are literal in zsh. Always use single quotes for header values with special characters.",
      },
    ],
  },
  "dashboard-wiring": {
    title: "Wiring the dashboard to real devices",
    date: "May 2025",
    tag: "frontend",
    body: [
      {
        text: "The dashboard started with two hardcoded placeholder cards. The fetch logic was there but nothing was rendering the response. Time to make it real.",
      },
      {
        heading: "Device cards",
        text: "Each GoveeDevice from the API becomes a DeviceCard component with its own local state — power, brightness, color, colorTem, and mode. State updates optimistically so the UI responds instantly while the API call happens in the background.",
      },
      {
        heading: "Debouncing sliders",
        text: "Brightness and color temperature are range inputs. Without debouncing, dragging the slider fires a PUT request on every pixel of movement — potentially hundreds of requests per second. A 300ms setTimeout on each change means only the final resting value gets sent.",
      },
      {
        heading: "White vs Color mode",
        text: "Govee devices support both colorTem (white balance in Kelvin) and color (RGB). They're mutually exclusive — setting one overrides the other on the device. The UI has a WHITE / COLOR tab switcher per card so it's clear which mode you're in.",
      },
      {
        heading: "Color temp gradient track",
        text: "The colorTem slider has a visual gradient behind it going from warm orange through neutral white to cool blue — matching what the light actually looks like at each end of the range. The range comes from the device's own properties.colorTem.range in the API response.",
      },
    ],
  },
  "scene-presets": {
    title: "Scene presets and room grouping",
    date: "May 2025",
    tag: "frontend",
    body: [
      {
        text: "Two quality-of-life features that make the dashboard feel like a real control panel instead of a list of sliders.",
      },
      {
        heading: "Scenes",
        text: "Each scene is a named preset that fires a sequence of commands across every controllable device in parallel using Promise.all. Focus sets cool white at 80% brightness. Relax goes warm amber at 35%. Movie drops to deep purple at 15%. Night sets a dim red. All Off just turns everything off. New scenes are just objects in an array — easy to extend.",
      },
      {
        heading: "Room grouping",
        text: "The Govee API returns a flat list of devices. Room grouping is inferred from device names using simple string matching — anything with 'living room' goes in Living room, 'kitchen' goes in Kitchen, and so on. Rooms render in a fixed order (Living room, Kitchen, Office, Hallway) with a neon divider line and device count.",
      },
      {
        heading: "Why not fetch device state",
        text: "The Govee v1 API doesn't reliably return current device state for all models. Rather than showing stale or missing data, the UI starts with sane defaults (off, 100% brightness) and treats every interaction as the source of truth from that point forward. Good enough for a personal HUD.",
      },
    ],
  },
  "docker-and-infra": {
    title: "Docker and project structure cleanup",
    date: "May 2025",
    tag: "infra",
    body: [
      {
        text: "A few small things that would've caused real headaches left alone.",
      },
      {
        heading: "Python version mismatch",
        text: "pyproject.toml declared requires-python >= 3.14 but the Dockerfile was pulling python:3.11-slim. The app would build and run fine locally but fail or behave unexpectedly in a container. Fixed to python:3.14-slim.",
      },
      {
        heading: "Entry point",
        text: "After moving to the app/ package structure, the Dockerfile CMD still pointed at the old main:app. Updated to app.main:app to match the new module path.",
      },
      {
        heading: ".gitignore",
        text: "The .gitignore was a Node.js template — no Python-specific entries at all. .venv, __pycache__, *.pyc, .pytest_cache, .mypy_cache, .ruff_cache were all missing. Added them. The uv.lock file is also excluded since it's machine-generated.",
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(noteContent).map((slug) => ({ slug }));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const note = noteContent[slug];
  const tagColor = note ? (TAG_COLORS[note.tag] ?? NEON) : NEON;

  if (!note) {
    return (
      <article style={{ display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
          Note not found
        </h1>
        <Link href="/blog" style={{ fontSize: 12, color: NEON, textDecoration: "none", letterSpacing: "0.08em" }}>
          ← Back to notes
        </Link>
      </article>
    );
  }

  return (
    <article style={{ display: "grid", gap: 32, maxWidth: 720 }}>
      {/* Back */}
      <Link href="/blog" style={{ fontSize: 11, color: "#475569", textDecoration: "none", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        ← Notes
      </Link>

      {/* Header */}
      <header style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontSize: 10, padding: "3px 8px", borderRadius: 6,
            border: `1px solid ${tagColor}44`, background: `${tagColor}11`,
            color: tagColor, letterSpacing: "0.1em", textTransform: "uppercase",
          }}>
            {note.tag}
          </span>
          <span style={{ fontSize: 11, color: "#334155" }}>{note.date}</span>
        </div>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          color: "#f1f5f9",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.1,
        }}>
          {note.title}
        </h1>
      </header>

      {/* Body */}
      <div style={{ display: "grid", gap: 20 }}>
        {note.body.map((block, i) => (
          <div
            key={i}
            style={{
              padding: "20px 24px",
              borderRadius: 12,
              background: CARD_BG,
              border: `1px solid ${CARD_BORDER}`,
              backdropFilter: "blur(12px)",
              display: "grid",
              gap: 8,
            }}
          >
            {block.heading && (
              <h2 style={{
                margin: 0, fontSize: 12, fontWeight: 600,
                color: NEON, letterSpacing: "0.12em",
                textTransform: "uppercase", fontFamily: "inherit",
                opacity: 0.8,
              }}>
                {block.heading}
              </h2>
            )}
            <p style={{
              margin: 0, fontSize: 14, lineHeight: 1.75,
              color: "#94a3b8",
              fontFamily: "system-ui, sans-serif",
            }}>
              {block.text}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}
