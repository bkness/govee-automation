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
  accent: string;
  apply: () => { cmds: object[]; state: Partial<DeviceState> };
}

import { loadStored, persistDevice, persistMany } from "../lib/device-store";
import { getCached, setCached, bust } from "../lib/api-cache";

type RealStates = Record<string, Partial<DeviceState>>;
type Tab = "white" | "color" | "vibe";

function persistScene(devices: GoveeDevice[], partial: Partial<DeviceState>) {
  persistMany(devices.map((d) => d.device), partial);
}

async function fetchRealStates(headers: Record<string, string>): Promise<RealStates> {
  const res = await fetch(`${API}/lights/states`, { headers });
  if (!res.ok) return {};
  const json = await res.json();
  return json.states ?? {};
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API = process.env.NEXT_PUBLIC_GOVEE_API_URL ?? "http://localhost:8000";
const HEADERS = {
  "x-api-key": process.env.NEXT_PUBLIC_GOVEE_SERVER_KEY ?? "",
  "Content-Type": "application/json",
};

const NEON = "#00ffb4";
const NEON_DIM = "rgba(0,255,180,0.12)";
const CARD_BG = "rgba(15,25,40,0.88)";
const CARD_BORDER = "rgba(255,255,255,0.06)";

const SCENES: Scene[] = [
  {
    name: "Focus",
    icon: "◎",
    accent: "#60b8ff",
    apply: () => ({
      state: { on: true, brightness: 80, mode: "white" as const, colorTem: 6000 },
      cmds: [
        { name: "turn", value: "on" },
        { name: "brightness", value: 80 },
        { name: "colorTem", value: 6000 },
      ],
    }),
  },
  {
    name: "Relax",
    icon: "◑",
    accent: "#ff9a3c",
    apply: () => ({
      state: { on: true, brightness: 35, mode: "color" as const, color: { r: 255, g: 120, b: 40 } },
      cmds: [
        { name: "turn", value: "on" },
        { name: "brightness", value: 35 },
        { name: "color", value: { r: 255, g: 120, b: 40 } },
      ],
    }),
  },
  {
    name: "Movie",
    icon: "▶",
    accent: "#a855f7",
    apply: () => ({
      state: { on: true, brightness: 15, mode: "color" as const, color: { r: 60, g: 0, b: 180 } },
      cmds: [
        { name: "turn", value: "on" },
        { name: "brightness", value: 15 },
        { name: "color", value: { r: 60, g: 0, b: 180 } },
      ],
    }),
  },
  {
    name: "Night",
    icon: "◐",
    accent: "#f43f5e",
    apply: () => ({
      state: { on: true, brightness: 5, mode: "color" as const, color: { r: 180, g: 0, b: 60 } },
      cmds: [
        { name: "turn", value: "on" },
        { name: "brightness", value: 5 },
        { name: "color", value: { r: 180, g: 0, b: 60 } },
      ],
    }),
  },
  {
    name: "Party",
    icon: "◈",
    accent: NEON,
    apply: () => ({
      state: { on: true, brightness: 100, mode: "color" as const, color: { r: 0, g: 255, b: 180 } },
      cmds: [
        { name: "turn", value: "on" },
        { name: "brightness", value: 100 },
        { name: "color", value: { r: 0, g: 255, b: 180 } },
      ],
    }),
  },
  {
    name: "Off",
    icon: "○",
    accent: "#475569",
    apply: () => ({
      state: { on: false },
      cmds: [{ name: "turn", value: "off" }],
    }),
  },
];

// 20 curated swatches — 4 rows × 5 cols
const SWATCHES: Array<{ r: number; g: number; b: number }> = [
  { r: 255, g: 30,  b: 60  }, { r: 255, g: 80,  b: 0   }, { r: 255, g: 160, b: 0   }, { r: 255, g: 220, b: 0   }, { r: 180, g: 255, b: 0   },
  { r: 0,   g: 255, b: 100 }, { r: 0,   g: 255, b: 180 }, { r: 0,   g: 240, b: 255 }, { r: 0,   g: 160, b: 255 }, { r: 0,   g: 80,  b: 255 },
  { r: 100, g: 0,   b: 255 }, { r: 180, g: 0,   b: 255 }, { r: 255, g: 0,   b: 180 }, { r: 255, g: 0,   b: 90  }, { r: 255, g: 120, b: 160 },
  { r: 255, g: 190, b: 215 }, { r: 200, g: 160, b: 255 }, { r: 140, g: 240, b: 210 }, { r: 255, g: 220, b: 150 }, { r: 255, g: 255, b: 255 },
];

const VIBE_PALETTE: Array<{ r: number; g: number; b: number }> = [
  { r: 0,   g: 255, b: 180 }, { r: 255, g: 0,   b: 170 }, { r: 0,   g: 170, b: 255 },
  { r: 255, g: 85,  b: 0   }, { r: 170, g: 0,   b: 255 }, { r: 255, g: 215, b: 0   },
  { r: 0,   g: 255, b: 85  }, { r: 255, g: 0,   b: 85  }, { r: 0,   g: 200, b: 255 },
  { r: 255, g: 140, b: 0   },
];

const ROOM_ORDER = ["Living room", "Kitchen", "Office", "Hallway", "Other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRoomName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("living room")) return "Living room";
  if (n.includes("kitchen")) return "Kitchen";
  if (n.includes("office")) return "Office";
  if (n.includes("hallway")) return "Hallway";
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

async function sendCommand(device: string, model: string, cmd: object) {
  return fetch(
    `${API}/lights/${encodeURIComponent(device)}/control?model=${encodeURIComponent(model)}`,
    { method: "PUT", headers: HEADERS, body: JSON.stringify(cmd) }
  );
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ borderRadius: 16, overflow: "hidden", border: `1px solid ${CARD_BORDER}` }}>
      <div className="skeleton" style={{ height: 260 }} />
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ on, disabled, onChange }: { on: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 46, height: 25, borderRadius: 999,
        border: on ? `1px solid ${NEON}` : "1px solid rgba(255,255,255,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "rgba(0,255,180,0.18)" : "rgba(255,255,255,0.04)",
        position: "relative", transition: "all 0.2s ease", flexShrink: 0,
        boxShadow: on ? `0 0 14px rgba(0,255,180,0.3)` : "none", outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute", top: 4, left: on ? 22 : 4,
          width: 15, height: 15, borderRadius: "50%",
          background: on ? NEON : "rgba(255,255,255,0.25)",
          transition: "all 0.2s ease", boxShadow: on ? `0 0 8px ${NEON}` : "none",
        }}
      />
    </button>
  );
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device, realState }: { device: GoveeDevice; realState?: Partial<DeviceState> }) {
  const hasColor = device.supportCmds.includes("color");
  const hasWhite = device.supportCmds.includes("colorTem");

  const [state, setState] = useState<DeviceState>(() => {
    const stored = loadStored()[device.device];
    return {
      on: false, brightness: 100,
      color: { r: 255, g: 255, b: 255 },
      colorTem: device.properties.colorTem?.range.min ?? 2700,
      mode: "white",
      ...stored,
    };
  });

  const [tab, setTab] = useState<Tab>(() => {
    const stored = loadStored()[device.device];
    if (stored?.mode === "color" && hasColor) return "color";
    if (hasWhite) return "white";
    return hasColor ? "color" : "white";
  });

  const [pending, setPending] = useState(false);
  const [vibing, setVibing] = useState(false);
  const [sceneFiring, setSceneFiring] = useState<string | null>(null);
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null);

  const brightnessTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTemTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTimer       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorRollback    = useRef<DeviceState | null>(null);

  useEffect(() => {
    if (!realState || Object.keys(realState).length === 0) return;
    setState((s) => {
      const next = { ...s, ...realState };
      persistDevice(device.device, next);
      return next;
    });
    if (realState.mode === "color" && hasColor) setTab("color");
    else if (realState.mode === "white" && hasWhite) setTab("white");
  }, [realState, device.device, hasColor, hasWhite]);

  const supports = useCallback((cmd: string) => device.supportCmds.includes(cmd), [device]);

  const send = useCallback(
    async (cmd: object, optimistic?: Partial<DeviceState>) => {
      let snapshot: DeviceState | undefined;
      if (optimistic) {
        setState((s) => {
          snapshot = s;
          const next = { ...s, ...optimistic };
          persistDevice(device.device, next);
          return next;
        });
      }
      setPending(true);
      try {
        const res = await sendCommand(device.device, device.model, cmd);
        if (!res.ok && snapshot) {
          setState(snapshot);
          persistDevice(device.device, snapshot);
        }
      } catch {
        if (snapshot) {
          setState(snapshot);
          persistDevice(device.device, snapshot);
        }
      } finally {
        setPending(false);
      }
    },
    [device]
  );

  const applyColor = useCallback((rgb: { r: number; g: number; b: number }) => {
    setState((s) => {
      if (!colorRollback.current) colorRollback.current = s;
      const next = { ...s, color: rgb, mode: "color" as const };
      persistDevice(device.device, next);
      return next;
    });
    if (colorTimer.current) clearTimeout(colorTimer.current);
    colorTimer.current = setTimeout(async () => {
      const rollback = colorRollback.current;
      colorRollback.current = null;
      const res = await sendCommand(device.device, device.model, { name: "color", value: rgb });
      if (!res.ok && rollback) {
        setState(rollback);
        persistDevice(device.device, rollback);
      }
    }, 300);
  }, [device.device]);

  const fireDeviceScene = useCallback(async (scene: Scene) => {
    if (sceneFiring) return;
    setSceneFiring(scene.name);
    const { cmds, state: sceneState } = scene.apply();
    setState((s) => {
      const next = { ...s, ...sceneState };
      persistDevice(device.device, next);
      return next;
    });
    if (sceneState.mode) setTab(sceneState.mode as Tab);
    try {
      for (const cmd of cmds) await sendCommand(device.device, device.model, cmd);
    } finally {
      setTimeout(() => setSceneFiring(null), 1000);
    }
  }, [sceneFiring, device]);

  const fireVibe = useCallback(async () => {
    if (vibing || !state.on) return;
    setVibing(true);
    const rgb = VIBE_PALETTE[Math.floor(Math.random() * VIBE_PALETTE.length)];
    setState((s) => {
      const next = { ...s, color: rgb, mode: "color" as const };
      persistDevice(device.device, next);
      return next;
    });
    try { await sendCommand(device.device, device.model, { name: "color", value: rgb }); }
    finally { setTimeout(() => setVibing(false), 600); }
  }, [vibing, state.on, device]);

  const colorHex = rgbToHex(state.color);
  const temRange = device.properties.colorTem?.range ?? { min: 2700, max: 6500 };

  const activeGlow =
    state.on && state.mode === "color"
      ? `rgba(${state.color.r},${state.color.g},${state.color.b},0.22)`
      : state.on ? "rgba(0,255,180,0.1)" : "transparent";

  const borderColor =
    state.on && state.mode === "color"
      ? `rgba(${state.color.r},${state.color.g},${state.color.b},0.38)`
      : state.on ? "rgba(0,255,180,0.22)" : CARD_BORDER;

  const tabs = [
    ...(hasWhite ? [{ id: "white" as Tab, label: "White", icon: "○", accent: NEON }] : []),
    ...(hasColor ? [{ id: "color" as Tab, label: "Color", icon: "◉", accent: NEON }] : []),
    ...(hasColor ? [{ id: "vibe"  as Tab, label: "Vibe",  icon: "⚡", accent: "#ff9a3c" }] : []),
  ];

  return (
    <article
      className="fade-up"
      style={{
        padding: "20px 20px 18px",
        borderRadius: 18,
        background: CARD_BG,
        border: `1px solid ${borderColor}`,
        boxShadow: state.on
          ? `0 0 40px ${activeGlow}, 0 4px 28px rgba(0,0,0,0.45)`
          : `0 4px 20px rgba(0,0,0,0.35)`,
        transition: "border-color 0.45s ease, box-shadow 0.45s ease",
        display: "grid",
        gap: 16,
        opacity: pending ? 0.74 : 1,
        backdropFilter: "blur(16px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Dynamic ambient fill */}
      {state.on && state.mode === "color" && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: `radial-gradient(ellipse at 10% 0%, rgba(${state.color.r},${state.color.g},${state.color.b},0.1), transparent 60%)`,
            pointerEvents: "none",
            transition: "background 0.5s ease",
          }}
        />
      )}

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{
            margin: "0 0 3px", fontSize: 14, fontWeight: 700,
            color: "#f1f5f9", fontFamily: "system-ui, sans-serif", letterSpacing: "-0.01em",
          }}>
            {device.deviceName}
          </h3>
          <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" as const }}>
            {device.model}
          </span>
        </div>
        <Toggle
          on={state.on}
          disabled={!device.controllable || pending}
          onChange={() => send({ name: "turn", value: state.on ? "off" : "on" }, { on: !state.on })}
        />
      </div>

      {/* ── Brightness ── */}
      {supports("brightness") && (
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 10, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" as const,
          }}>
            <span>Brightness</span>
            <span style={{ color: state.on ? NEON : "#334155" }}>{state.brightness}%</span>
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
            style={{ width: "100%", cursor: state.on ? "pointer" : "not-allowed" }}
          />
        </div>
      )}

      {/* ── Mode tabs ── */}
      {tabs.length > 0 && (
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map((t) => {
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setTab(t.id);
                  if (t.id === "white") setState((s) => ({ ...s, mode: "white" }));
                  if (t.id === "color") setState((s) => ({ ...s, mode: "color" }));
                }}
                style={{
                  flex: 1, padding: "6px 0", fontSize: 10,
                  letterSpacing: "0.06em", textTransform: "uppercase" as const,
                  borderRadius: 7,
                  border: `1px solid ${isActive ? t.accent : "rgba(255,255,255,0.07)"}`,
                  background: isActive ? `${t.accent}18` : "transparent",
                  color: isActive ? t.accent : "#334155",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  boxShadow: isActive ? `0 0 12px ${t.accent}20` : "none",
                }}
              >
                <span style={{ fontSize: 12 }}>{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Scene strip (always visible) ── */}
      {(hasColor || hasWhite) && (
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ fontSize: 9, color: "#1e2d40", letterSpacing: "0.13em", textTransform: "uppercase" as const }}>
            Scenes
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 5 }}>
            {SCENES.map((scene, i) => {
              const isFiring = sceneFiring === scene.name;
              return (
                <button
                  key={scene.name}
                  disabled={!!sceneFiring || !device.controllable}
                  onClick={() => fireDeviceScene(scene)}
                  style={{
                    padding: "8px 2px",
                    borderRadius: 8,
                    border: `1px solid ${isFiring ? scene.accent : "rgba(255,255,255,0.06)"}`,
                    background: isFiring ? `${scene.accent}16` : "rgba(255,255,255,0.025)",
                    color: isFiring ? scene.accent : "#3d5068",
                    fontSize: 9, fontFamily: "inherit",
                    cursor: !sceneFiring && device.controllable ? "pointer" : "not-allowed",
                    transition: "all 0.18s ease",
                    display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 3,
                    boxShadow: isFiring ? `0 0 14px ${scene.accent}30` : "none",
                    animation: `fade-up 0.3s ${i * 30}ms ease both`,
                  }}
                  onMouseEnter={(e) => {
                    if (sceneFiring || !device.controllable) return;
                    const el = e.currentTarget;
                    el.style.border = `1px solid ${scene.accent}80`;
                    el.style.background = `${scene.accent}12`;
                    el.style.color = scene.accent;
                    el.style.boxShadow = `0 0 10px ${scene.accent}22`;
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget;
                    el.style.border = `1px solid ${isFiring ? scene.accent : "rgba(255,255,255,0.06)"}`;
                    el.style.background = isFiring ? `${scene.accent}16` : "rgba(255,255,255,0.025)";
                    el.style.color = isFiring ? scene.accent : "#3d5068";
                    el.style.boxShadow = isFiring ? `0 0 14px ${scene.accent}30` : "none";
                  }}
                >
                  <span style={{ fontSize: 15 }}>{scene.icon}</span>
                  <span style={{ letterSpacing: "0.05em", textTransform: "uppercase" as const, fontSize: 8 }}>
                    {isFiring ? "···" : scene.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── White panel ── */}
      {tab === "white" && supports("colorTem") && (
        <div className="panel-slide" style={{ display: "grid", gap: 9 }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: 10, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" as const,
          }}>
            <span>Color Temp</span>
            <span style={{ color: state.on ? "#cbd5e1" : "#334155" }}>{state.colorTem}K</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute", inset: 0, borderRadius: 4,
              background: "linear-gradient(90deg, #ff9a3c 0%, #fff5e0 38%, #d0eaff 68%, #a8d4ff 100%)",
              pointerEvents: "none",
              opacity: state.on ? 0.55 : 0.15,
            }} />
            <input
              type="range"
              min={temRange.min} max={temRange.max} step={100}
              value={state.colorTem}
              disabled={!state.on || pending}
              onChange={(e) => {
                const v = Number(e.target.value);
                setState((s) => ({ ...s, colorTem: v }));
                if (colorTemTimer.current) clearTimeout(colorTemTimer.current);
                colorTemTimer.current = setTimeout(() => send({ name: "colorTem", value: v }), 300);
              }}
              style={{ width: "100%", cursor: state.on ? "pointer" : "not-allowed", position: "relative", background: "transparent" }}
            />
          </div>
          {/* Temp presets */}
          <div style={{ display: "flex", gap: 4 }}>
            {[
              { label: "Candle",  k: 2700, c: "#ff9a3c" },
              { label: "Warm",    k: 3500, c: "#ffd0a0" },
              { label: "Neutral", k: 4500, c: "#f0f0e0" },
              { label: "Cool",    k: 6000, c: "#a8d4ff" },
            ].map((p) => {
              const isActive = Math.abs(state.colorTem - p.k) < 300;
              return (
                <button
                  key={p.k}
                  disabled={!state.on || pending}
                  onClick={() => {
                    setState((s) => ({ ...s, colorTem: p.k }));
                    send({ name: "colorTem", value: p.k });
                  }}
                  style={{
                    flex: 1, padding: "5px 0", borderRadius: 6,
                    border: `1px solid ${isActive ? p.c : "rgba(255,255,255,0.06)"}`,
                    background: isActive ? `${p.c}18` : "rgba(255,255,255,0.02)",
                    color: isActive ? p.c : "#475569",
                    fontSize: 9, fontFamily: "inherit", letterSpacing: "0.04em",
                    cursor: state.on ? "pointer" : "not-allowed",
                    transition: "all 0.15s",
                    boxShadow: isActive ? `0 0 8px ${p.c}30` : "none",
                  }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Color panel ── */}
      {tab === "color" && supports("color") && (
        <div className="panel-slide" style={{ display: "grid", gap: 12 }}>
          {/* Picker + preview */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={colorHex}
              disabled={!state.on || pending}
              onChange={(e) => applyColor(hexToRgb(e.target.value))}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "none", cursor: state.on ? "pointer" : "not-allowed",
                padding: 2, flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1, height: 36, borderRadius: 8,
                background: state.on ? colorHex : "rgba(255,255,255,0.04)",
                boxShadow: state.on
                  ? `0 0 28px ${colorHex}70, inset 0 0 12px ${colorHex}25`
                  : "none",
                transition: "all 0.35s ease",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <span style={{
              fontSize: 9, color: "#475569", fontFamily: "monospace",
              letterSpacing: "0.04em", minWidth: 52,
            }}>
              {colorHex.toUpperCase()}
            </span>
          </div>

          {/* Swatch palette */}
          <div>
            <div style={{
              fontSize: 9, color: "#1e2d40", letterSpacing: "0.13em",
              textTransform: "uppercase" as const, marginBottom: 8,
            }}>
              Palette
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 7 }}>
              {SWATCHES.map((sw, i) => {
                const hex = rgbToHex(sw);
                const isSelected = state.color.r === sw.r && state.color.g === sw.g && state.color.b === sw.b;
                const isHovered = hoveredSwatch === hex;
                return (
                  <button
                    key={hex}
                    disabled={!state.on || pending}
                    onClick={() => applyColor(sw)}
                    className={`swatch-pop swatch-btn${isSelected ? " selected" : ""}`}
                    onMouseEnter={() => setHoveredSwatch(hex)}
                    onMouseLeave={() => setHoveredSwatch(null)}
                    style={{
                      width: "100%", aspectRatio: "1 / 1", borderRadius: 9,
                      border: isSelected
                        ? `2px solid rgba(255,255,255,0.6)`
                        : "2px solid rgba(255,255,255,0.06)",
                      background: hex,
                      cursor: state.on ? "pointer" : "not-allowed",
                      position: "relative",
                      boxShadow: isSelected
                        ? `0 0 18px ${hex}bb, 0 0 6px ${hex}`
                        : isHovered
                        ? `0 0 12px ${hex}77`
                        : `0 2px 6px ${hex}44`,
                      animationDelay: `${i * 16}ms`,
                      outline: "none", padding: 0,
                    }}
                  >
                    {isSelected && (
                      <span
                        className="ring-ping"
                        style={{
                          position: "absolute", inset: -5, borderRadius: 12,
                          border: `2px solid ${hex}`,
                          pointerEvents: "none", display: "block",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Vibe panel ── */}
      {tab === "vibe" && (
        <div className="panel-slide" style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 9, color: "#1e2d40", letterSpacing: "0.13em", textTransform: "uppercase" as const }}>
            Random Vibe
          </div>

          {/* Current color preview */}
          <div
            style={{
              height: 52, borderRadius: 12,
              background: state.on && state.mode === "color"
                ? `linear-gradient(120deg, ${colorHex}cc, ${colorHex}55)`
                : "rgba(255,255,255,0.04)",
              boxShadow: state.on && state.mode === "color"
                ? `0 0 36px ${colorHex}66, inset 0 1px 0 rgba(255,255,255,0.12)`
                : "none",
              transition: "all 0.5s ease",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {(!state.on || state.mode !== "color") && (
              <span style={{ fontSize: 10, color: "#2a3a50", letterSpacing: "0.08em" }}>—</span>
            )}
          </div>

          {/* Vibe mini-palette preview */}
          <div style={{ display: "flex", gap: 5 }}>
            {VIBE_PALETTE.map((c, i) => (
              <div
                key={`${c.r}-${c.g}-${c.b}`}
                style={{
                  flex: 1, height: 6, borderRadius: 999,
                  background: rgbToHex(c),
                  boxShadow: `0 0 6px ${rgbToHex(c)}88`,
                  opacity: 0.7,
                  animation: "color-breathe 2s ease-in-out infinite",
                  animationDelay: `${i * 200}ms`,
                }}
              />
            ))}
          </div>

          <button
            disabled={!state.on || vibing}
            onClick={fireVibe}
            style={{
              padding: "12px 0", borderRadius: 10,
              border: `1px solid ${state.on ? "rgba(255,154,60,0.5)" : "rgba(255,255,255,0.06)"}`,
              background: vibing
                ? "rgba(255,154,60,0.07)"
                : state.on
                ? "rgba(255,154,60,0.14)"
                : "rgba(255,255,255,0.02)",
              color: state.on ? "#ff9a3c" : "#334155",
              fontSize: 11, fontFamily: "inherit",
              cursor: state.on ? "pointer" : "not-allowed",
              letterSpacing: "0.12em", textTransform: "uppercase" as const, fontWeight: 700,
              transition: "all 0.2s",
              boxShadow: state.on && !vibing ? "0 0 20px rgba(255,154,60,0.14)" : "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 16, display: "inline-block",
                animation: vibing ? "spin 0.5s linear infinite" : "none",
              }}
            >
              ⚡
            </span>
            {vibing ? "Vibing···" : "Generate Vibe"}
          </button>
          <p style={{
            margin: 0, fontSize: 10, color: "#2a3a50",
            textAlign: "center" as const, lineHeight: 1.6,
            fontFamily: "system-ui, sans-serif",
          }}>
            Picks a random neon from 10 curated colors.
          </p>
        </div>
      )}

      {/* Offline badge */}
      {!device.controllable && (
        <div style={{
          padding: "6px 10px", borderRadius: 7,
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.15)",
          fontSize: 10, color: "#ef4444",
          letterSpacing: "0.08em", textAlign: "center" as const,
        }}>
          Device offline
        </div>
      )}
    </article>
  );
}

// ─── Room Section ─────────────────────────────────────────────────────────────

function RoomSection({ name, devices, realStates }: { name: string; devices: GoveeDevice[]; realStates: RealStates }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <button
        onClick={() => setCollapsed((c) => !c)}
        style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%",
        }}
      >
        <span style={{
          fontSize: 10, color: NEON, letterSpacing: "0.16em",
          textTransform: "uppercase" as const, opacity: 0.8, fontFamily: "inherit",
        }}>
          {name}
        </span>
        <div style={{ flex: 1, height: 1, background: "rgba(0,255,180,0.08)" }} />
        <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.08em" }}>
          {devices.length} {devices.length === 1 ? "device" : "devices"}
        </span>
        <span style={{ fontSize: 10, color: "#334155", transform: collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>
      {!collapsed && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {devices.map((d) => <DeviceCard key={d.device} device={d} realState={realStates[d.device]} />)}
        </div>
      )}
    </div>
  );
}

// ─── Scene Bar ────────────────────────────────────────────────────────────────

function SceneBar({ devices }: { devices: GoveeDevice[] }) {
  const [active, setActive] = useState<string | null>(null);
  const [firing, setFiring] = useState(false);

  const fireScene = useCallback(async (scene: Scene) => {
    if (firing) return;
    setFiring(true);
    setActive(scene.name);
    const { cmds, state: sceneState } = scene.apply();
    try {
      for (const d of devices.filter((d) => d.controllable)) {
        for (const cmd of cmds) await sendCommand(d.device, d.model, cmd);
      }
      persistScene(devices, sceneState);
    } finally {
      setFiring(false);
    }
  }, [firing, devices]);

  return (
    <div style={{
      padding: "14px 18px", borderRadius: 14,
      background: CARD_BG, border: `1px solid ${CARD_BORDER}`,
      backdropFilter: "blur(12px)",
      display: "flex", gap: 8, flexWrap: "wrap" as const, alignItems: "center",
    }}>
      <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginRight: 4 }}>
        Scenes
      </span>
      {SCENES.map((scene) => (
        <button
          key={scene.name}
          onClick={() => fireScene(scene)}
          disabled={firing}
          style={{
            padding: "6px 14px", borderRadius: 8,
            border: `1px solid ${active === scene.name ? scene.accent : "rgba(255,255,255,0.07)"}`,
            background: active === scene.name ? `${scene.accent}15` : "rgba(255,255,255,0.02)",
            color: active === scene.name ? scene.accent : "#64748b",
            fontSize: 11, fontFamily: "inherit",
            cursor: firing ? "wait" : "pointer",
            transition: "all 0.15s",
            display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.04em",
            boxShadow: active === scene.name ? `0 0 12px ${scene.accent}33` : "none",
          }}
        >
          <span style={{ fontSize: 12 }}>{scene.icon}</span>
          {scene.name}
        </button>
      ))}
    </div>
  );
}

// ─── Master Bar ───────────────────────────────────────────────────────────────

function MasterBar({ devices, onRefresh, refreshing }: { devices: GoveeDevice[]; onRefresh: () => void; refreshing: boolean }) {
  const [masterPending, setMasterPending] = useState(false);

  const allOn = useCallback(async () => {
    setMasterPending(true);
    try {
      await Promise.all(
        devices.filter((d) => d.controllable).map((d) =>
          sendCommand(d.device, d.model, { name: "turn", value: "on" })
        )
      );
      persistScene(devices, { on: true });
    } finally { setMasterPending(false); }
  }, [devices]);

  const allOff = useCallback(async () => {
    setMasterPending(true);
    try {
      await Promise.all(
        devices.filter((d) => d.controllable).map((d) =>
          sendCommand(d.device, d.model, { name: "turn", value: "off" })
        )
      );
      persistScene(devices, { on: false });
    } finally { setMasterPending(false); }
  }, [devices]);

  return (
    <div style={{
      display: "flex", gap: 10, alignItems: "center",
      padding: "10px 16px", borderRadius: 12,
      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" as const, flex: 1 }}>
        Master
      </span>
      <button
        onClick={allOn} disabled={masterPending}
        style={{
          padding: "6px 14px", borderRadius: 7,
          border: `1px solid rgba(0,255,180,0.3)`,
          background: "rgba(0,255,180,0.07)", color: NEON,
          fontSize: 11, fontFamily: "inherit",
          cursor: masterPending ? "wait" : "pointer",
          letterSpacing: "0.06em", transition: "all 0.15s",
        }}
      >
        All On
      </button>
      <button
        onClick={allOff} disabled={masterPending}
        style={{
          padding: "6px 14px", borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)", color: "#64748b",
          fontSize: 11, fontFamily: "inherit",
          cursor: masterPending ? "wait" : "pointer",
          letterSpacing: "0.06em", transition: "all 0.15s",
        }}
      >
        All Off
      </button>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.05)" }} />
      <button
        onClick={onRefresh} disabled={refreshing}
        style={{
          padding: "6px 12px", borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "transparent", color: "#334155",
          fontSize: 11, fontFamily: "inherit",
          cursor: refreshing ? "wait" : "pointer", letterSpacing: "0.06em",
        }}
      >
        {refreshing ? "···" : "↻"}
      </button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GoveeHud() {
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [realStates, setRealStates] = useState<RealStates>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      bust("devices", "states");
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let devs = getCached<GoveeDevice[]>("devices");
      if (!devs) {
        const r = await fetch(`${API}/lights/`, { headers: HEADERS });
        if (!r.ok) throw new Error(`API ${r.status}`);
        devs = (await r.json()).data?.devices ?? [];
        setCached("devices", devs);
      }
      setDevices(devs!);
      setLoading(false);
      setRefreshing(false);

      const cachedStates = getCached<RealStates>("states");
      if (cachedStates) {
        setRealStates(cachedStates);
      } else {
        fetchRealStates(HEADERS).then((states) => {
          setCached("states", states);
          setRealStates(states);
          const all = loadStored();
          for (const [id, s] of Object.entries(states)) {
            all[id] = { ...(all[id] ?? {}), ...s };
          }
          try { localStorage.setItem("govee-hud-states", JSON.stringify(all)); } catch {}
        }).catch(() => {});
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div style={{ display: "grid", gap: 24 }}>
        <div className="skeleton" style={{ height: 52, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 52, borderRadius: 14 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: "20px 24px", borderRadius: 14,
        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
        display: "grid", gap: 12,
      }}>
        <p style={{ margin: 0, color: "#f87171", fontSize: 14 }}>✕ {error}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
          Make sure the FastAPI server is running: <code style={{ color: "#94a3b8" }}>uvicorn app.main:app --reload</code>
        </p>
        <button
          onClick={() => load()}
          style={{
            alignSelf: "start", padding: "8px 16px", borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)",
            color: "#f87171", fontSize: 12, fontFamily: "inherit",
            cursor: "pointer", letterSpacing: "0.06em",
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!devices.length) {
    return <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>No devices found.</p>;
  }

  const grouped = groupByRoom(devices);
  const roomsInOrder = ROOM_ORDER.filter((r) => grouped[r]);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <MasterBar devices={devices} onRefresh={() => load(true)} refreshing={refreshing} />
      <SceneBar devices={devices} />
      {roomsInOrder.map((room) => (
        <RoomSection key={room} name={room} devices={grouped[room]} realStates={realStates} />
      ))}
    </div>
  );
}
