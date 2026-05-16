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

type RealStates = Record<string, Partial<DeviceState>>;

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

const API = "http://localhost:8000";
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
    name: "All Off",
    icon: "○",
    accent: "#475569",
    apply: () => ({
      state: { on: false },
      cmds: [{ name: "turn", value: "off" }],
    }),
  },
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
      <div className="skeleton" style={{ height: 220 }} />
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
        width: 46,
        height: 25,
        borderRadius: 999,
        border: on ? `1px solid ${NEON}` : "1px solid rgba(255,255,255,0.12)",
        cursor: disabled ? "not-allowed" : "pointer",
        background: on ? "rgba(0,255,180,0.18)" : "rgba(255,255,255,0.04)",
        position: "relative",
        transition: "all 0.2s ease",
        flexShrink: 0,
        boxShadow: on ? `0 0 14px rgba(0,255,180,0.3)` : "none",
        outline: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 4,
          left: on ? 22 : 4,
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: on ? NEON : "rgba(255,255,255,0.25)",
          transition: "all 0.2s ease",
          boxShadow: on ? `0 0 8px ${NEON}` : "none",
        }}
      />
    </button>
  );
}

// ─── Device Card ──────────────────────────────────────────────────────────────

function DeviceCard({ device, realState }: { device: GoveeDevice; realState?: Partial<DeviceState> }) {
  const [state, setState] = useState<DeviceState>(() => {
    const stored = loadStored()[device.device];
    return {
      on: false,
      brightness: 100,
      color: { r: 255, g: 255, b: 255 },
      colorTem: device.properties.colorTem?.range.min ?? 2700,
      mode: "white",
      ...stored,
    };
  });
  const [pending, setPending] = useState(false);
  const brightnessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTemTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Merge real hardware state when it arrives from the API
  useEffect(() => {
    if (!realState || Object.keys(realState).length === 0) return;
    setState((s) => {
      const next = { ...s, ...realState };
      persistDevice(device.device, next);
      return next;
    });
  }, [realState, device.device]);

  const supports = useCallback((cmd: string) => device.supportCmds.includes(cmd), [device]);

  const send = useCallback(
    async (cmd: object, optimistic?: Partial<DeviceState>) => {
      if (optimistic) {
        setState((s) => {
          const next = { ...s, ...optimistic };
          persistDevice(device.device, next);
          return next;
        });
      }
      setPending(true);
      try { await sendCommand(device.device, device.model, cmd); }
      finally { setPending(false); }
    },
    [device]
  );

  const colorHex = rgbToHex(state.color);
  const temRange = device.properties.colorTem?.range ?? { min: 2700, max: 6500 };

  const glowColor =
    state.on && state.mode === "color"
      ? `rgba(${state.color.r},${state.color.g},${state.color.b},0.2)`
      : state.on
      ? "rgba(0,255,180,0.1)"
      : "transparent";

  return (
    <article
      className="fade-up"
      style={{
        padding: "20px 20px 18px",
        borderRadius: 16,
        background: CARD_BG,
        border: state.on ? `1px solid rgba(0,255,180,0.22)` : `1px solid ${CARD_BORDER}`,
        boxShadow: state.on
          ? `0 0 32px ${glowColor}, 0 4px 24px rgba(0,0,0,0.4)`
          : `0 4px 20px rgba(0,0,0,0.35)`,
        transition: "all 0.3s ease",
        display: "grid",
        gap: 16,
        opacity: pending ? 0.72 : 1,
        backdropFilter: "blur(14px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient fill when on with color */}
      {state.on && state.mode === "color" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 0% 0%, rgba(${state.color.r},${state.color.g},${state.color.b},0.07), transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3
            style={{
              margin: "0 0 3px",
              fontSize: 14,
              fontWeight: 700,
              color: "#f1f5f9",
              fontFamily: "system-ui, sans-serif",
              letterSpacing: "-0.01em",
            }}
          >
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

      {/* Brightness */}
      {supports("brightness") && (
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            <span>Brightness</span>
            <span style={{ color: state.on ? NEON : "#334155" }}>{state.brightness}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={100}
            value={state.brightness}
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

      {/* Mode tabs */}
      {(supports("color") || supports("colorTem")) && (
        <div style={{ display: "flex", gap: 4 }}>
          {supports("colorTem") && (
            <button
              onClick={() => setState((s) => ({ ...s, mode: "white" }))}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                borderRadius: 6,
                border: "1px solid",
                borderColor: state.mode === "white" ? NEON : "rgba(255,255,255,0.07)",
                background: state.mode === "white" ? NEON_DIM : "transparent",
                color: state.mode === "white" ? NEON : "#334155",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              White
            </button>
          )}
          {supports("color") && (
            <button
              onClick={() => setState((s) => ({ ...s, mode: "color" }))}
              style={{
                flex: 1,
                padding: "5px 0",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase" as const,
                borderRadius: 6,
                border: "1px solid",
                borderColor: state.mode === "color" ? NEON : "rgba(255,255,255,0.07)",
                background: state.mode === "color" ? NEON_DIM : "transparent",
                color: state.mode === "color" ? NEON : "#334155",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
              }}
            >
              Color
            </button>
          )}
        </div>
      )}

      {/* Color temp */}
      {supports("colorTem") && state.mode === "white" && (
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            <span>Color Temp</span>
            <span style={{ color: state.on ? "#cbd5e1" : "#334155" }}>{state.colorTem}K</span>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{
              position: "absolute",
              inset: 0,
              borderRadius: 4,
              background: "linear-gradient(90deg, #ff9a3c 0%, #fff5e0 40%, #d0eaff 70%, #a8d4ff 100%)",
              pointerEvents: "none",
              opacity: state.on ? 0.5 : 0.15,
            }} />
            <input
              type="range"
              min={temRange.min}
              max={temRange.max}
              step={100}
              value={state.colorTem}
              disabled={!state.on || pending}
              onChange={(e) => {
                const v = Number(e.target.value);
                setState((s) => ({ ...s, colorTem: v }));
                if (colorTemTimer.current) clearTimeout(colorTemTimer.current);
                colorTemTimer.current = setTimeout(() => send({ name: "colorTem", value: v }), 300);
              }}
              style={{
                width: "100%",
                cursor: state.on ? "pointer" : "not-allowed",
                position: "relative",
                background: "transparent",
              }}
            />
          </div>
        </div>
      )}

      {/* Color picker */}
      {supports("color") && state.mode === "color" && (
        <div style={{ display: "grid", gap: 7 }}>
          <div style={{ fontSize: 10, color: "#475569", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
            Color
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="color"
              value={colorHex}
              disabled={!state.on || pending}
              onChange={(e) => {
                const rgb = hexToRgb(e.target.value);
                setState((s) => {
                  const next = { ...s, color: rgb };
                  persistDevice(device.device, next);
                  return next;
                });
                if (colorTimer.current) clearTimeout(colorTimer.current);
                colorTimer.current = setTimeout(() => send({ name: "color", value: rgb }), 500);
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "none",
                cursor: state.on ? "pointer" : "not-allowed",
                padding: 2,
                flexShrink: 0,
              }}
            />
            <div
              style={{
                flex: 1,
                height: 36,
                borderRadius: 8,
                background: state.on ? colorHex : "rgba(255,255,255,0.04)",
                boxShadow: state.on ? `0 0 20px ${colorHex}55` : "none",
                transition: "all 0.2s",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            />
            <span style={{ fontSize: 10, color: "#475569", fontFamily: "inherit" }}>
              {colorHex.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Offline badge */}
      {!device.controllable && (
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 7,
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.15)",
            fontSize: 10,
            color: "#ef4444",
            letterSpacing: "0.08em",
            textAlign: "center" as const,
          }}
        >
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
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          width: "100%",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: NEON,
            letterSpacing: "0.16em",
            textTransform: "uppercase" as const,
            opacity: 0.8,
            fontFamily: "inherit",
          }}
        >
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
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
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
      await Promise.all(
        devices.filter((d) => d.controllable).map(async (d) => {
          for (const cmd of cmds) await sendCommand(d.device, d.model, cmd);
        })
      );
      persistScene(devices, sceneState);
    } finally {
      setFiring(false);
    }
  }, [firing, devices]);

  return (
    <div
      style={{
        padding: "14px 18px",
        borderRadius: 14,
        background: CARD_BG,
        border: `1px solid ${CARD_BORDER}`,
        backdropFilter: "blur(12px)",
        display: "flex",
        gap: 8,
        flexWrap: "wrap" as const,
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginRight: 4 }}>
        Scenes
      </span>
      {SCENES.map((scene) => (
        <button
          key={scene.name}
          onClick={() => fireScene(scene)}
          disabled={firing}
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: `1px solid ${active === scene.name ? scene.accent : "rgba(255,255,255,0.07)"}`,
            background: active === scene.name ? `${scene.accent}15` : "rgba(255,255,255,0.02)",
            color: active === scene.name ? scene.accent : "#64748b",
            fontSize: 11,
            fontFamily: "inherit",
            cursor: firing ? "wait" : "pointer",
            transition: "all 0.15s",
            display: "flex",
            alignItems: "center",
            gap: 6,
            letterSpacing: "0.04em",
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
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: "10px 16px",
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <span style={{ fontSize: 10, color: "#334155", letterSpacing: "0.12em", textTransform: "uppercase" as const, flex: 1 }}>
        Master
      </span>
      <button
        onClick={allOn}
        disabled={masterPending}
        style={{
          padding: "6px 14px",
          borderRadius: 7,
          border: `1px solid rgba(0,255,180,0.3)`,
          background: "rgba(0,255,180,0.07)",
          color: NEON,
          fontSize: 11,
          fontFamily: "inherit",
          cursor: masterPending ? "wait" : "pointer",
          letterSpacing: "0.06em",
          transition: "all 0.15s",
        }}
      >
        All On
      </button>
      <button
        onClick={allOff}
        disabled={masterPending}
        style={{
          padding: "6px 14px",
          borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          color: "#64748b",
          fontSize: 11,
          fontFamily: "inherit",
          cursor: masterPending ? "wait" : "pointer",
          letterSpacing: "0.06em",
          transition: "all 0.15s",
        }}
      >
        All Off
      </button>
      <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.05)" }} />
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          padding: "6px 12px",
          borderRadius: 7,
          border: "1px solid rgba(255,255,255,0.06)",
          background: "transparent",
          color: "#334155",
          fontSize: 11,
          fontFamily: "inherit",
          cursor: refreshing ? "wait" : "pointer",
          letterSpacing: "0.06em",
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
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const r = await fetch(`${API}/lights/`, { headers: HEADERS });
      if (!r.ok) throw new Error(`API ${r.status}`);
      const json = await r.json();
      const devs: GoveeDevice[] = json.data?.devices ?? [];
      setDevices(devs);
      setLoading(false);
      setRefreshing(false);

      // Fetch real hardware states in background — cards update when this resolves
      fetchRealStates(HEADERS)
        .then((states) => {
          setRealStates(states);
          // Seed localStorage so rooms page also benefits
          const all = loadStored();
          for (const [id, s] of Object.entries(states)) {
            all[id] = { ...(all[id] ?? {}), ...s };
          }
          try { localStorage.setItem("govee-hud-states", JSON.stringify(all)); } catch {}
        })
        .catch(() => {/* states are best-effort */});
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
      <div
        style={{
          padding: "20px 24px",
          borderRadius: 14,
          background: "rgba(239,68,68,0.07)",
          border: "1px solid rgba(239,68,68,0.18)",
          display: "grid",
          gap: 12,
        }}
      >
        <p style={{ margin: 0, color: "#f87171", fontSize: 14 }}>✕ {error}</p>
        <p style={{ margin: 0, fontSize: 12, color: "#64748b", fontFamily: "system-ui, sans-serif" }}>
          Make sure the FastAPI server is running: <code style={{ color: "#94a3b8" }}>uvicorn app.main:app --reload</code>
        </p>
        <button
          onClick={() => load()}
          style={{
            alignSelf: "start",
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.3)",
            background: "rgba(239,68,68,0.08)",
            color: "#f87171",
            fontSize: 12,
            fontFamily: "inherit",
            cursor: "pointer",
            letterSpacing: "0.06em",
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
