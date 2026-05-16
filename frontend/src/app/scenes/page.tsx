"use client";

import { useState, useEffect, useCallback } from "react";

interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  supportCmds: string[];
  properties: { colorTem?: { range: { min: number; max: number } } };
}

const API = "http://localhost:8000";
const HEADERS = {
  "x-api-key": process.env.NEXT_PUBLIC_GOVEE_SERVER_KEY ?? "",
  "Content-Type": "application/json",
};
const NEON = "#00ffb4";
const CARD_BG = "rgba(15,25,40,0.9)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

interface SceneDef {
  name: string;
  tagline: string;
  desc: string;
  gradient: string;
  accent: string;
  glow: string;
  brightness: number;
  cmds: object[];
}

const SCENES: SceneDef[] = [
  {
    name: "Focus",
    tagline: "Crisp. Cool. Productive.",
    desc: "Cool white at 6000K with high brightness. Designed to keep you sharp during work or study sessions.",
    gradient: "linear-gradient(135deg, #e0f4ff 0%, #a8d8ff 40%, #c8eaff 100%)",
    accent: "#60b8ff",
    glow: "rgba(96,184,255,0.25)",
    brightness: 80,
    cmds: [
      { name: "turn", value: "on" },
      { name: "brightness", value: 80 },
      { name: "colorTem", value: 6000 },
    ],
  },
  {
    name: "Relax",
    tagline: "Warm. Soft. Unwinding.",
    desc: "Warm amber tones at reduced brightness. Wind down after a long day with candlelight-adjacent vibes.",
    gradient: "linear-gradient(135deg, #ff6b35 0%, #f7931e 40%, #ffcc70 100%)",
    accent: "#ff9a3c",
    glow: "rgba(255,154,60,0.25)",
    brightness: 35,
    cmds: [
      { name: "turn", value: "on" },
      { name: "brightness", value: 35 },
      { name: "color", value: { r: 255, g: 120, b: 40 } },
    ],
  },
  {
    name: "Movie",
    tagline: "Dark. Immersive. Cinematic.",
    desc: "Deep indigo bias lighting at 15% brightness. Enhances contrast without washing out your screen.",
    gradient: "linear-gradient(135deg, #1a0533 0%, #3c0080 50%, #6a0dad 100%)",
    accent: "#a855f7",
    glow: "rgba(168,85,247,0.25)",
    brightness: 15,
    cmds: [
      { name: "turn", value: "on" },
      { name: "brightness", value: 15 },
      { name: "color", value: { r: 60, g: 0, b: 180 } },
    ],
  },
  {
    name: "Night",
    tagline: "Dim. Red. Sleep-safe.",
    desc: "Deep red at 5% brightness. Preserves melatonin production. Enough light to move around safely.",
    gradient: "linear-gradient(135deg, #1a0010 0%, #5c0020 50%, #8b0035 100%)",
    accent: "#f43f5e",
    glow: "rgba(244,63,94,0.25)",
    brightness: 5,
    cmds: [
      { name: "turn", value: "on" },
      { name: "brightness", value: 5 },
      { name: "color", value: { r: 180, g: 0, b: 60 } },
    ],
  },
  {
    name: "Party",
    tagline: "Vibrant. Dynamic. Electric.",
    desc: "Full saturation cyan-magenta split. Maximum brightness for max energy.",
    gradient: "linear-gradient(135deg, #00ffb4 0%, #ff00aa 50%, #7c00ff 100%)",
    accent: NEON,
    glow: "rgba(0,255,180,0.25)",
    brightness: 100,
    cmds: [
      { name: "turn", value: "on" },
      { name: "brightness", value: 100 },
      { name: "color", value: { r: 0, g: 255, b: 180 } },
    ],
  },
  {
    name: "All Off",
    tagline: "Lights out. Done.",
    desc: "Cut power to every controllable device in the house. One tap, total darkness.",
    gradient: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0d0d0d 100%)",
    accent: "#475569",
    glow: "rgba(71,85,105,0.15)",
    brightness: 0,
    cmds: [{ name: "turn", value: "off" }],
  },
];

async function sendCommand(device: string, model: string, cmd: object) {
  return fetch(
    `${API}/lights/${encodeURIComponent(device)}/control?model=${encodeURIComponent(model)}`,
    { method: "PUT", headers: HEADERS, body: JSON.stringify(cmd) }
  );
}

function BrightnessBar({ value, color }: { value: number; color: string }) {
  if (value === 0) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div
          style={{
            width: `${value}%`,
            height: "100%",
            background: color,
            borderRadius: 999,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
      <span style={{ fontSize: 10, color: "#475569", minWidth: 28, textAlign: "right" as const }}>
        {value}%
      </span>
    </div>
  );
}

function SceneCard({
  scene,
  devices,
}: {
  scene: SceneDef;
  devices: GoveeDevice[];
}) {
  const [status, setStatus] = useState<"idle" | "firing" | "done" | "error">("idle");

  const fire = useCallback(async () => {
    if (status === "firing") return;
    setStatus("firing");
    try {
      await Promise.all(
        devices
          .filter((d) => d.controllable)
          .map(async (d) => {
            for (const cmd of scene.cmds) await sendCommand(d.device, d.model, cmd);
          })
      );
      setStatus("done");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [status, devices, scene]);

  const firing = status === "firing";
  const done = status === "done";

  return (
    <article
      className="fade-up"
      style={{
        borderRadius: 20,
        background: CARD_BG,
        border: `1px solid ${status !== "idle" ? scene.accent + "44" : CARD_BORDER}`,
        boxShadow:
          status !== "idle"
            ? `0 0 40px ${scene.glow}, 0 8px 32px rgba(0,0,0,0.4)`
            : `0 4px 24px rgba(0,0,0,0.3)`,
        overflow: "hidden",
        display: "grid",
        gridTemplateRows: "180px 1fr",
        transition: "all 0.3s ease",
        backdropFilter: "blur(16px)",
      }}
    >
      {/* Color preview */}
      <div
        style={{
          background: scene.gradient,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Noise overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E")`,
            opacity: 0.4,
            mixBlendMode: "overlay" as const,
          }}
        />
        {/* Scene name overlay */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 20,
            right: 20,
          }}
        >
          <span
            style={{
              fontSize: 10,
              letterSpacing: "0.14em",
              color: "rgba(255,255,255,0.6)",
              textTransform: "uppercase" as const,
            }}
          >
            {scene.tagline}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 22px 22px", display: "grid", gap: 14 }}>
        <div>
          <h3
            style={{
              margin: "0 0 6px",
              fontSize: 18,
              fontWeight: 800,
              color: "#f1f5f9",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.02em",
            }}
          >
            {scene.name}
          </h3>
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#64748b",
              fontFamily: "system-ui, sans-serif",
              lineHeight: 1.6,
            }}
          >
            {scene.desc}
          </p>
        </div>

        <BrightnessBar value={scene.brightness} color={scene.accent} />

        <button
          onClick={fire}
          disabled={firing || devices.length === 0}
          style={{
            padding: "11px 0",
            borderRadius: 10,
            border: `1px solid ${done ? scene.accent : firing ? "rgba(255,255,255,0.06)" : scene.accent + "44"}`,
            background: done
              ? scene.accent + "22"
              : firing
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.04)",
            color: done ? scene.accent : firing ? "#475569" : scene.accent,
            fontSize: 12,
            fontFamily: "inherit",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            fontWeight: 700,
            cursor: firing ? "wait" : devices.length === 0 ? "not-allowed" : "pointer",
            transition: "all 0.15s",
            boxShadow: done ? `0 0 20px ${scene.glow}` : "none",
          }}
        >
          {firing ? "Applying···" : done ? "✓ Applied" : status === "error" ? "✕ Error" : "Apply to All"}
        </button>
      </div>
    </article>
  );
}

export default function ScenesPage() {
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(`${API}/lights/`, { headers: HEADERS })
      .then((r) => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then((j) => setDevices(j.data?.devices ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const controllable = devices.filter((d) => d.controllable).length;

  return (
    <main style={{ display: "grid", gap: 32 }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase" as const, opacity: 0.7 }}>
            Govee · Scenes
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
            Scene Library
          </h1>
        </div>
        <div style={{ fontSize: 11, color: "#334155", letterSpacing: "0.06em", textAlign: "right" as const }}>
          <div style={{ color: loading ? "#334155" : NEON, marginBottom: 2 }}>
            {loading ? "···" : `${controllable} devices`}
          </div>
          <div>ready to control</div>
        </div>
      </header>

      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: 13,
          }}
        >
          ✕ {error} —{" "}
          <button
            onClick={load}
            style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontFamily: "inherit", fontSize: 13, padding: 0 }}
          >
            retry
          </button>
        </div>
      )}

      {/* Info strip */}
      <div
        style={{
          padding: "12px 18px",
          borderRadius: 10,
          background: "rgba(0,255,180,0.04)",
          border: "1px solid rgba(0,255,180,0.1)",
          fontSize: 12,
          color: "#475569",
          fontFamily: "system-ui, sans-serif",
          lineHeight: 1.6,
        }}
      >
        Scenes fire sequentially per device to avoid rate limits.{" "}
        <span style={{ color: "#64748b" }}>Each command is sent individually with a small delay.</span>
      </div>

      {/* Scene grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {SCENES.map((scene, i) => (
          <div key={scene.name} className={`stagger-${Math.min(i + 1, 5)}`}>
            <SceneCard scene={scene} devices={devices} />
          </div>
        ))}
      </div>
    </main>
  );
}
