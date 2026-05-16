"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
  supportCmds: string[];
  properties: {
    colorTem?: { range: { min: number; max: number } };
  };
}

interface DeviceState {
  on: boolean;
  brightness: number;
  color: { r: number; g: number; b: number };
  colorTem: number;
  mode: "white" | "color";
}

interface Scene {
  name: string;
  icon: string;
  apply: (supports: (cmd: string) => boolean) => Partial<DeviceState> & { cmds: object[] };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = "http://localhost:8000";
const HEADERS = {
  "x-api-key": process.env.NEXT_PUBLIC_GOVEE_SERVER_KEY ?? "",
  "Content-Type": "application/json",
};

const NEON = "#00ffb4";
const NEON_DIM = "rgba(0,255,180,0.15)";
const CARD_BG = "rgba(15,25,40,0.85)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const SCENES: Scene[] = [
  {
    name: "Focus",
    icon: "◎",
    apply: () => ({
      on: true, brightness: 80, mode: "white" as const, colorTem: 6000,
      cmds: [{ name: "turn", value: "on" }, { name: "brightness", value: 80 }, { name: "colorTem", value: 6000 }],
    }),
  },
  {
    name: "Relax",
    icon: "◑",
    apply: () => ({
      on: true, brightness: 35, mode: "color" as const, color: { r: 255, g: 120, b: 40 },
      cmds: [{ name: "turn", value: "on" }, { name: "brightness", value: 35 }, { name: "color", value: { r: 255, g: 120, b: 40 } }],
    }),
  },
  {
    name: "Movie",
    icon: "▶",
    apply: () => ({
      on: true, brightness: 15, mode: "color" as const, color: { r: 60, g: 0, b: 180 },
      cmds: [{ name: "turn", value: "on" }, { name: "brightness", value: 15 }, { name: "color", value: { r: 60, g: 0, b: 180 } }],
    }),
  },
  {
    name: "Night",
    icon: "◐",
    apply: () => ({
      on: true, brightness: 5, mode: "color" as const, color: { r: 180, g: 0, b: 60 },
      cmds: [{ name: "turn", value: "on" }, { name: "brightness", value: 5 }, { name: "color", value: { r: 180, g: 0, b: 60 } }],
    }),
  },
  {
    name: "All Off",
    icon: "○",
    apply: () => ({
      on: false,
      cmds: [{ name: "turn", value: "off" }],
    }),
  },
];

// ─── Room grouping ────────────────────────────────────────────────────────────

const ROOM_ORDER = ["Living room", "Kitchen", "Office", "Hallway", "Other"];

function getRoomName(deviceName: string): string {
  if (deviceName.toLowerCase().includes("living room")) return "Living room";
  if (deviceName.toLowerCase().includes("kitchen")) return "Kitchen";
  if (deviceName.toLowerCase().includes("office")) return "Office";
  if (deviceName.toLowerCase().includes("hallway")) return "Hallway";
  return "Other";
}

function groupByRoom(devices: GoveeDevice[]): Record<string, GoveeDevice[]> {
  return devices.reduce<Record<string, GoveeDevice[]>>((acc, d) => {
    const room = getRoomName(d.deviceName);
    if (!acc[room]) acc[room] = [];
    acc[room].push(d);
    return acc;
  }, {});
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function sendCommand(device: string, model: string, cmd: object) {
  return fetch(
    `${API}/lights/${encodeURIComponent(device)}/control?model=${encodeURIComponent(model)}`,
    { method: "PUT", headers: HEADERS, body: JSON.stringify(cmd) }
  );
}

// ─── Color utils ──────────────────────────────────────────────────────────────

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function colorTemToGradient(min: number, max: number) {
  return `linear-gradient(90deg, #ff9a3c 0%, #fff5e0 40%, #d0eaff 70%, #a8d4ff ${100}%)`;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: on ? `1px solid ${NEON}` : "1px solid rgba(255,255,255,0.15)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "rgba(0,255,180,0.2)" : "rgba(255,255,255,0.05)",
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
        boxShadow: on ? `0 0 12px rgba(0,255,180,0.3)` : "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: on ? 21 : 3,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: on ? NEON : "rgba(255,255,255,0.3)",
          transition: "all 0.2s ease",
          boxShadow: on ? `0 0 8px ${NEON}` : "none",
        }}
      />
    </button>
  );
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device }: { device: GoveeDevice }) {
  const [state, setState] = useState<DeviceState>({
    on: false,
    brightness: 100,
    color: { r: 255, g: 255, b: 255 },
    colorTem: device.properties.colorTem?.range.min ?? 2700,
    mode: "white",
  });
  const [pending, setPending] = useState(false);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTemTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const supports = useCallback((cmd: string) => device.supportCmds.includes(cmd), [device]);

  const send = useCallback(
    async (cmd: object, optimistic?: Partial<DeviceState>) => {
      if (optimistic) setState((s) => ({ ...s, ...optimistic }));
      setPending(true);
      try { await sendCommand(device.device, device.model, cmd); }
      finally { setPending(false); }
    },
    [device]
  );

  const applyScene = useCallback(
    async (cmds: object[], optimistic: Partial<DeviceState>) => {
      setState((s) => ({ ...s, ...optimistic }));
      setPending(true);
      try {
        for (const cmd of cmds) await sendCommand(device.device, device.model, cmd);
      } finally { setPending(false); }
    },
    [device]
  );

  const colorHex = rgbToHex(state.color);
  const temRange = device.properties.colorTem?.range ?? { min: 2700, max: 6500 };
  const glowColor = state.mode === "color"
    ? `rgba(${state.color.r},${state.color.g},${state.color.b},0.25)`
    : "rgba(0,255,180,0.1)";

  return (
    <article
      style={{
        padding: 20,
        borderRadius: 16,
        background: CARD_BG,
        border: state.on
          ? `1px solid rgba(0,255,180,0.25)`
          : `1px solid ${CARD_BORDER}`,
        boxShadow: state.on
          ? `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)`
          : `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`,
        transition: "all 0.3s ease",
        display: "grid",
        gap: 16,
        opacity: pending ? 0.75 : 1,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ margin: "0 0 3px", fontSize: 15, fontWeight: 700, color: "#f1f5f9", fontFamily: "system-ui, sans-serif" }}>
            {device.deviceName}
          </h3>
          <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em" }}>
            {device.model}
          </span>
        </div>
        <Toggle
          on={state.on}
          disabled={!device.controllable || pending}
          onChange={() => send({ name: "turn", value: state.on ? "off" : "on" }, { on: !state.on })}
        />
      </div>

      {/* Brightness */}
      {supports("brightness") && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", letterSpacing: "0.06em" }}>
            <span>BRIGHTNESS</span>
            <span style={{ color: state.on ? NEON : "#475569" }}>{state.brightness}%</span>
          </div>
          <input
            type="range" min={1} max={100} value={state.brightness}
            disabled={!state.on || pending}
            onChange={(e) => {
              const v = Number(e.target.value);
              setState((s) => ({ ...s, brightness: v }));
              if (brightnessTimer.current) clearTimeout(brightnessTimer.current);
              brightnessTimer.current = setTimeout(() => send({ name: "brightness", value: v }), 300);
            }}
            style={{ width: "100%", accentColor: NEON, cursor: state.on ? "pointer" : "not-allowed", height: 4 }}
          />
        </div>
      )}

      {/* Mode tabs */}
      {(supports("color") || supports("colorTem")) && (
        <div style={{ display: "flex", gap: 4 }}>
          {supports("colorTem") && (
            <button
              onClick={() => setState((s) => ({ ...s, mode: "white" }))}
              style={{
                flex: 1, padding: "5px 0", fontSize: 10, letterSpacing: "0.08em",
                borderRadius: 6, border: "1px solid",
                borderColor: state.mode === "white" ? NEON : "rgba(255,255,255,0.08)",
                background: state.mode === "white" ? NEON_DIM : "transparent",
                color: state.mode === "white" ? NEON : "#475569",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              WHITE
            </button>
          )}
          {supports("color") && (
            <button
              onClick={() => setState((s) => ({ ...s, mode: "color" }))}
              style={{
                flex: 1, padding: "5px 0", fontSize: 10, letterSpacing: "0.08em",
                borderRadius: 6, border: "1px solid",
                borderColor: state.mode === "color" ? NEON : "rgba(255,255,255,0.08)",
                background: state.mode === "color" ? NEON_DIM : "transparent",
                color: state.mode === "color" ? NEON : "#475569",
                cursor: "pointer", transition: "all 0.15s",
              }}
            >
              COLOR
            </button>
          )}
        </div>
      )}

      {/* Color temp slider */}
      {supports("colorTem") && state.mode === "white" && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748b", letterSpacing: "0.06em" }}>
            <span>COLOR TEMP</span>
            <span style={{ color: state.on ? "#cbd5e1" : "#475569" }}>{state.colorTem}K</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 4,
              background: colorTemToGradient(temRange.min, temRange.max),
              pointerEvents: "none", opacity: state.on ? 0.6 : 0.2,
            }} />
            <input
              type="range" min={temRange.min} max={temRange.max} step={100} value={state.colorTem}
              disabled={!state.on || pending}
              onChange={(e) => {
                const v = Number(e.target.value);
                setState((s) => ({ ...s, colorTem: v }));
                if (colorTemTimer.current) clearTimeout(colorTemTimer.current);
                colorTemTimer.current = setTimeout(() => send({ name: "colorTem", value: v }), 300);
              }}
              style={{
                width: "100%", cursor: state.on ? "pointer" : "not-allowed",
                position: "relative", background: "transparent",
                accentColor: "#fff", height: 4,
              }}
            />
          </div>
        </div>
      )}

      {/* Color picker */}
      {supports("color") && state.mode === "color" && (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.06em" }}>COLOR</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color" value={colorHex}
              disabled={!state.on || pending}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                setState((s) => ({ ...s, color: rgb }));
                send({ name: "color", value: rgb });
              }}
              style={{
                width: 36, height: 36, borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)",
                background: "none", cursor: state.on ? "pointer" : "not-allowed", padding: 2,
              }}
            />
            <div style={{
              flex: 1, height: 36, borderRadius: 8,
              background: state.on ? colorHex : "rgba(255,255,255,0.05)",
              boxShadow: state.on ? `0 0 20px ${colorHex}55` : "none",
              transition: "all 0.2s",
              border: "1px solid rgba(255,255,255,0.06)",
            }} />
            <span style={{ fontSize: 11, color: "#475569", fontFamily: "monospace" }}>{colorHex.toUpperCase()}</span>
          </div>
        </div>
      )}
    </article>
  );
}

// ─── Room Section ─────────────────────────────────────────────────────────────

function RoomSection({ name, devices }: { name: string; devices: GoveeDevice[] }) {
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, color: NEON, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.8 }}>
          {name}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(0,255,180,0.1)" }} />
        <span style={{ fontSize: 10, color: "#334155" }}>{devices.length} device{devices.length !== 1 ? "s" : ""}</span>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: 12,
      }}>
        {devices.map((d) => <DeviceCard key={d.device} device={d} />)}
      </div>
    </div>
  );
}

// ─── Scene Bar ────────────────────────────────────────────────────────────────

function SceneBar({ devices }: { devices: GoveeDevice[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);

  const fireScene = async (scene: Scene) => {
    if (firing) return;
    setFiring(true);
    setActive(scene.name);
    const results = scene.apply(() => true);
    const cmds = results.cmds as object[];
    try {
      await Promise.all(
        devices.filter((d) => d.controllable).map(async (d) => {
          for (const cmd of cmds) await sendCommand(d.device, d.model, cmd);
        })
      );
    } finally {
      setFiring(false);
    }
  };

  return (
    <div style={{
      padding: "16px 20px",
      borderRadius: 14,
      background: CARD_BG,
      border: `1px solid ${CARD_BORDER}`,
      backdropFilter: "blur(12px)",
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
    }}>
      <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.12em", marginRight: 4 }}>SCENES</span>
      {SCENES.map((scene) => (
        <button
          key={scene.name}
          onClick={() => fireScene(scene)}
          disabled={firing}
          style={{
            padding: "7px 14px",
            borderRadius: 8,
            border: `1px solid ${active === scene.name ? NEON : "rgba(255,255,255,0.08)"}`,
            background: active === scene.name ? NEON_DIM : "rgba(255,255,255,0.03)",
            color: active === scene.name ? NEON : "#94a3b8",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: firing ? "wait" : "pointer",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
            letterSpacing: "0.04em",
            boxShadow: active === scene.name ? `0 0 12px rgba(0,255,180,0.2)` : "none",
          }}
        >
          <span>{scene.icon}</span>
          {scene.name}
        </button>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoveeHud() {
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/lights/`, { headers: HEADERS })
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((json) => setDevices(json.data?.devices ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <p style={{ margin: 0, color: NEON, fontSize: 13, letterSpacing: "0.1em", opacity: 0.6 }}>
      ◌ INITIALIZING DEVICES...
    </p>
  );
  if (error) return (
    <p style={{ margin: 0, color: "#f87171", fontSize: 13 }}>✕ {error}</p>
  );
  if (!devices.length) return (
    <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>No devices found.</p>
  );

  const grouped = groupByRoom(devices);
  const roomsInOrder = ROOM_ORDER.filter((r) => grouped[r]);

  return (
    <div style={{ display: "grid", gap: 28 }}>
      <SceneBar devices={devices} />
      {roomsInOrder.map((room) => (
        <RoomSection key={room} name={room} devices={grouped[room]} />
      ))}
    </div>
  );
}
