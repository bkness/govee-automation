"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GoveeDevice {
  device: string;
  model: string;
  deviceName: string;
  controllable: boolean;
  retrievable: boolean;
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

const ROOM_META: Record<string, { icon: string; color: string; glow: string; desc: string }> = {
  "Living room": {
    icon: "◈",
    color: "#ff9a3c",
    glow: "rgba(255,154,60,0.2)",
    desc: "Main living space — strip lights and ambient panels",
  },
  Kitchen: {
    icon: "◇",
    color: "#00d4ff",
    glow: "rgba(0,212,255,0.2)",
    desc: "Kitchen overhead and counter lighting",
  },
  Office: {
    icon: "◉",
    color: NEON,
    glow: "rgba(0,255,180,0.2)",
    desc: "Desk and monitor ambient lighting",
  },
  Hallway: {
    icon: "▷",
    color: "#a78bfa",
    glow: "rgba(167,139,250,0.2)",
    desc: "Hallway passage lighting",
  },
  Other: {
    icon: "○",
    color: "#64748b",
    glow: "rgba(100,116,139,0.15)",
    desc: "Ungrouped devices",
  },
};

const ROOM_ORDER = ["Living room", "Kitchen", "Office", "Hallway", "Other"];

function getRoomName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("living room")) return "Living room";
  if (n.includes("kitchen")) return "Kitchen";
  if (n.includes("office")) return "Office";
  if (n.includes("hallway")) return "Hallway";
  return "Other";
}

async function sendCommand(device: string, model: string, cmd: object) {
  return fetch(
    `${API}/lights/${encodeURIComponent(device)}/control?model=${encodeURIComponent(model)}`,
    { method: "PUT", headers: HEADERS, body: JSON.stringify(cmd) }
  );
}

function SkeletonCard() {
  return (
    <div
      className="skeleton"
      style={{ height: 220, borderRadius: 20, border: `1px solid ${CARD_BORDER}` }}
    />
  );
}

function RoomCard({
  name,
  devices,
}: {
  name: string;
  devices: GoveeDevice[];
}) {
  const meta = ROOM_META[name] ?? ROOM_META["Other"];
  const [roomOn, setRoomOn] = useState(false);
  const [pending, setPending] = useState(false);

  const toggle = useCallback(async () => {
    const next = !roomOn;
    setRoomOn(next);
    setPending(true);
    try {
      await Promise.all(
        devices
          .filter((d) => d.controllable)
          .map((d) => sendCommand(d.device, d.model, { name: "turn", value: next ? "on" : "off" }))
      );
    } finally {
      setPending(false);
    }
  }, [roomOn, devices]);

  const controllable = devices.filter((d) => d.controllable).length;

  return (
    <article
      className="fade-up"
      style={{
        borderRadius: 20,
        background: CARD_BG,
        border: roomOn
          ? `1px solid ${meta.color}55`
          : `1px solid ${CARD_BORDER}`,
        boxShadow: roomOn
          ? `0 0 40px ${meta.glow}, 0 8px 32px rgba(0,0,0,0.4)`
          : `0 4px 24px rgba(0,0,0,0.3)`,
        padding: "28px 28px 24px",
        display: "grid",
        gap: 20,
        transition: "all 0.4s ease",
        backdropFilter: "blur(16px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient fill when on */}
      {roomOn && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at 20% 0%, ${meta.glow} 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <span
            style={{
              fontSize: 28,
              color: meta.color,
              textShadow: roomOn ? `0 0 20px ${meta.color}` : "none",
              transition: "text-shadow 0.3s",
              lineHeight: 1,
            }}
          >
            {meta.icon}
          </span>
          <div>
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: 22,
                fontWeight: 800,
                color: "#f1f5f9",
                fontFamily: "system-ui, sans-serif",
                letterSpacing: "-0.02em",
              }}
            >
              {name}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                color: "#475569",
                fontFamily: "system-ui, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {meta.desc}
            </p>
          </div>
        </div>

        {/* Master toggle */}
        <button
          onClick={toggle}
          disabled={pending || controllable === 0}
          style={{
            padding: "8px 18px",
            borderRadius: 10,
            border: `1px solid ${roomOn ? meta.color : "rgba(255,255,255,0.1)"}`,
            background: roomOn ? `${meta.color}20` : "rgba(255,255,255,0.03)",
            color: roomOn ? meta.color : "#64748b",
            fontSize: 11,
            fontFamily: "inherit",
            letterSpacing: "0.1em",
            textTransform: "uppercase" as const,
            cursor: pending ? "wait" : controllable === 0 ? "not-allowed" : "pointer",
            fontWeight: 700,
            transition: "all 0.15s",
            boxShadow: roomOn ? `0 0 16px ${meta.glow}` : "none",
            flexShrink: 0,
          }}
        >
          {pending ? "···" : roomOn ? "On" : "Off"}
        </button>
      </div>

      {/* Device list */}
      <div style={{ display: "grid", gap: 6 }}>
        {devices.map((d) => (
          <div
            key={d.device}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "7px 12px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.04)",
            }}
          >
            <span style={{ fontSize: 12, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>
              {d.deviceName}
            </span>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.04)",
                  color: "#334155",
                  letterSpacing: "0.06em",
                }}
              >
                {d.model}
              </span>
              {!d.controllable && (
                <span style={{ fontSize: 9, color: "#ef4444", letterSpacing: "0.06em" }}>
                  OFFLINE
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: 4,
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <span style={{ fontSize: 11, color: "#334155", letterSpacing: "0.06em" }}>
          {controllable}/{devices.length} controllable
        </span>
        <Link
          href={`/dashboard`}
          style={{
            fontSize: 11,
            color: meta.color,
            textDecoration: "none",
            letterSpacing: "0.08em",
            opacity: 0.7,
          }}
        >
          Fine control →
        </Link>
      </div>
    </article>
  );
}

export default function RoomsPage() {
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

  const grouped = devices.reduce<Record<string, GoveeDevice[]>>((acc, d) => {
    const room = getRoomName(d.deviceName);
    if (!acc[room]) acc[room] = [];
    acc[room].push(d);
    return acc;
  }, {});

  const rooms = ROOM_ORDER.filter((r) => grouped[r]);

  return (
    <main style={{ display: "grid", gap: 32 }}>
      {/* Page header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ display: "grid", gap: 6 }}>
          <p style={{ margin: 0, fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase" as const, opacity: 0.7 }}>
            Govee · Rooms
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
            Room Control
          </h1>
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.03)",
            color: "#64748b",
            fontSize: 11,
            fontFamily: "inherit",
            letterSpacing: "0.08em",
            cursor: loading ? "wait" : "pointer",
            transition: "all 0.15s",
          }}
        >
          {loading ? "···" : "↻ Refresh"}
        </button>
      </header>

      {/* Error */}
      {error && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
            fontSize: 13,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>✕ {error}</span>
          <button
            onClick={load}
            style={{
              background: "none",
              border: "none",
              color: "#f87171",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.08em",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: 16,
        }}
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : rooms.map((room) => (
              <RoomCard key={room} name={room} devices={grouped[room]} />
            ))}
      </div>

      {!loading && !error && rooms.length === 0 && (
        <p style={{ margin: 0, color: "#475569", fontSize: 13 }}>No devices found.</p>
      )}
    </main>
  );
}
