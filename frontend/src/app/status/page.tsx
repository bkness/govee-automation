"use client";

import { useState, useEffect, useCallback } from "react";
import { getCached, setCached, bust } from "../lib/api-cache";

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

type ApiStatus = "checking" | "online" | "degraded" | "offline";

interface LogEntry {
  ts: string;
  level: "INFO" | "WARN" | "ERROR" | "OK";
  msg: string;
}

function ts() {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function StatusDot({ status }: { status: ApiStatus }) {
  const colors: Record<ApiStatus, string> = {
    checking: "#f59e0b",
    online: NEON,
    degraded: "#f59e0b",
    offline: "#ef4444",
  };
  return (
    <span
      className={status === "online" ? "pulse-dot" : undefined}
      style={{
        display: "inline-block",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: colors[status],
        boxShadow: `0 0 8px ${colors[status]}`,
        flexShrink: 0,
      }}
    />
  );
}

function LogLine({ entry }: { entry: LogEntry }) {
  const colors: Record<string, string> = {
    INFO: "#64748b",
    OK: NEON,
    WARN: "#f59e0b",
    ERROR: "#ef4444",
  };
  return (
    <div
      className="fade-up"
      style={{
        display: "grid",
        gridTemplateColumns: "80px 42px 1fr",
        gap: 12,
        padding: "5px 0",
        borderBottom: "1px solid rgba(255,255,255,0.03)",
        fontSize: 11,
        fontFamily: "inherit",
      }}
    >
      <span style={{ color: "#334155" }}>{entry.ts}</span>
      <span style={{ color: colors[entry.level] ?? "#64748b", fontWeight: 700 }}>
        [{entry.level}]
      </span>
      <span style={{ color: "#94a3b8" }}>{entry.msg}</span>
    </div>
  );
}

export default function StatusPage() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");
  const [devices, setDevices] = useState<GoveeDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<string>("");
  const [uptime, setUptime] = useState<number | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    { ts: ts(), level: "INFO", msg: "Status page initialized" },
  ]);

  const addLog = useCallback((level: LogEntry["level"], msg: string) => {
    setLogs((prev) => [{ ts: ts(), level, msg }, ...prev].slice(0, 40));
  }, []);

  const check = useCallback(async (forceRefresh = false) => {
    if (forceRefresh) bust("devices", "states");
    setApiStatus("checking");
    setLoading(true);
    addLog("INFO", forceRefresh ? "Force-refreshing API status..." : "Checking API health...");

    const start = Date.now();
    try {
      // Status page always hits the API live (it's a diagnostic tool),
      // but uses the cache on first auto-check to avoid extra calls on nav
      let devs = forceRefresh ? null : getCached<GoveeDevice[]>("devices");
      let elapsed = 0;

      if (!devs) {
        const res = await fetch(`${API}/lights/`, { headers: HEADERS });
        elapsed = Date.now() - start;
        if (!res.ok) {
          setApiStatus("degraded");
          addLog("WARN", `API responded with status ${res.status} (${elapsed}ms)`);
          setLoading(false);
          return;
        }
        const json = await res.json();
        devs = json.data?.devices ?? [];
        setCached("devices", devs);
      } else {
        elapsed = Date.now() - start;
        addLog("INFO", "Using cached device list");
      }

      setDevices(devs!);
      setApiStatus("online");
      setLastChecked(ts());

      // Pull uptime from /health
      try {
        const health = await fetch(`${API}/health`).then((r) => r.json());
        setUptime(health.uptime_s);
        addLog("INFO", `Server uptime: ${health.uptime_s}s`);
      } catch { /* health endpoint optional */ }

      const safeDevs = devs ?? [];
      addLog("OK", `API online — ${safeDevs.length} device(s) registered (${elapsed}ms)`);
      const controllable = safeDevs.filter((d) => d.controllable).length;
      addLog("INFO", `${controllable}/${safeDevs.length} devices controllable`);

      const models = [...new Set(safeDevs.map((d) => d.model))];
      addLog("INFO", `Models: ${models.join(", ")}`);
    } catch (e) {
      const elapsed = Date.now() - start;
      setApiStatus("offline");
      addLog("ERROR", `Connection failed after ${elapsed}ms — is the FastAPI server running?`);
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  useEffect(() => { check(); }, [check]);

  const statusLabel: Record<ApiStatus, string> = {
    checking: "Checking",
    online: "Online",
    degraded: "Degraded",
    offline: "Offline",
  };

  const controllable = devices.filter((d) => d.controllable).length;
  const models = [...new Set(devices.map((d) => d.model))];

  return (
    <main style={{ display: "grid", gap: 32 }}>
      {/* Header */}
      <header style={{ display: "grid", gap: 6 }}>
        <p style={{ margin: 0, fontSize: 11, color: NEON, letterSpacing: "0.16em", textTransform: "uppercase" as const, opacity: 0.7 }}>
          Govee · System
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
          System Status
        </h1>
      </header>

      {/* Status cards row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {[
          {
            label: "API Server",
            value: statusLabel[apiStatus],
            sub: lastChecked ? `Checked ${lastChecked}` : "Checking...",
            accent: apiStatus === "online" ? NEON : apiStatus === "offline" ? "#ef4444" : "#f59e0b",
            dot: true,
          },
          {
            label: "Uptime",
            value: uptime != null ? `${Math.floor(uptime)}s` : loading ? "···" : "—",
            sub: uptime != null && uptime > 60 ? `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s` : "Since last restart",
            accent: "#60b8ff",
            dot: false,
          },
          {
            label: "Devices",
            value: loading ? "···" : String(devices.length),
            sub: "Registered with Govee",
            accent: NEON,
            dot: false,
          },
          {
            label: "Controllable",
            value: loading ? "···" : String(controllable),
            sub: loading ? "" : `${devices.length - controllable} offline`,
            accent: controllable > 0 ? NEON : "#f59e0b",
            dot: false,
          },
          {
            label: "Models",
            value: loading ? "···" : String(models.length),
            sub: loading ? "" : models.join(", "),
            accent: "#60b8ff",
            dot: false,
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: "18px 20px",
              borderRadius: 14,
              background: "rgba(15,25,40,0.9)",
              border: "1px solid rgba(255,255,255,0.06)",
              display: "grid",
              gap: 6,
              backdropFilter: "blur(12px)",
            }}
          >
            <span style={{ fontSize: 10, color: "#475569", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
              {card.label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {card.dot && <StatusDot status={apiStatus} />}
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: card.accent,
                  fontFamily: "system-ui, sans-serif",
                  textShadow: `0 0 16px ${card.accent}66`,
                  lineHeight: 1,
                }}
              >
                {card.value}
              </span>
            </div>
            <span style={{ fontSize: 10, color: "#334155", lineHeight: 1.4, fontFamily: "system-ui, sans-serif" }}>
              {card.sub}
            </span>
          </div>
        ))}
      </div>

      {/* Device table */}
      <section style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2
            style={{
              margin: 0,
              fontSize: 11,
              color: "#475569",
              letterSpacing: "0.14em",
              textTransform: "uppercase" as const,
              fontWeight: 400,
            }}
          >
            Device Inventory
          </h2>
          <button
            onClick={() => check(true)}
            disabled={loading}
            style={{
              padding: "6px 14px",
              borderRadius: 7,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
              color: "#64748b",
              fontSize: 10,
              fontFamily: "inherit",
              letterSpacing: "0.08em",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "···" : "↻ Refresh"}
          </button>
        </div>

        <div
          style={{
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.06)",
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
              padding: "10px 16px",
              background: "rgba(255,255,255,0.02)",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              fontSize: 10,
              color: "#334155",
              letterSpacing: "0.1em",
              textTransform: "uppercase" as const,
              gap: 8,
            }}
          >
            <span>Name</span>
            <span>Model</span>
            <span>Commands</span>
            <span>Device ID</span>
            <span style={{ textAlign: "center" as const }}>Status</span>
          </div>

          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton"
                  style={{ height: 44, margin: "6px 12px", borderRadius: 6 }}
                />
              ))
            : devices.map((d, i) => (
                <div
                  key={d.device}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 80px",
                    padding: "12px 16px",
                    borderBottom: i < devices.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                    fontSize: 12,
                    gap: 8,
                    alignItems: "center",
                    background: i % 2 === 0 ? "rgba(15,25,40,0.9)" : "rgba(15,25,40,0.6)",
                    transition: "background 0.15s",
                  }}
                >
                  <span style={{ color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
                    {d.deviceName}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 11 }}>{d.model}</span>
                  <span style={{ color: "#475569", fontSize: 10 }}>
                    {d.supportCmds.join(", ")}
                  </span>
                  <span
                    style={{
                      color: "#334155",
                      fontSize: 9,
                      fontFamily: "inherit",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap" as const,
                    }}
                  >
                    {d.device}
                  </span>
                  <div style={{ display: "flex", justifyContent: "center" }}>
                    <span
                      style={{
                        fontSize: 9,
                        padding: "3px 8px",
                        borderRadius: 5,
                        background: d.controllable ? "rgba(0,255,180,0.08)" : "rgba(239,68,68,0.08)",
                        border: `1px solid ${d.controllable ? "rgba(0,255,180,0.2)" : "rgba(239,68,68,0.2)"}`,
                        color: d.controllable ? NEON : "#ef4444",
                        letterSpacing: "0.06em",
                      }}
                    >
                      {d.controllable ? "OK" : "OFFLINE"}
                    </span>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {/* Terminal log */}
      <section style={{ display: "grid", gap: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            color: "#475569",
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
            fontWeight: 400,
          }}
        >
          Session Log
        </h2>
        <div
          style={{
            borderRadius: 14,
            background: "rgba(6,12,20,0.95)",
            border: "1px solid rgba(255,255,255,0.05)",
            padding: "16px 20px",
            maxHeight: 280,
            overflowY: "auto" as const,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, display: "inline-block" }} />
              ))}
            </div>
            <span style={{ fontSize: 10, color: "#334155", marginLeft: 4, letterSpacing: "0.06em" }}>
              govee-hud — session
            </span>
          </div>
          {logs.map((entry, i) => (
            <LogLine key={i} entry={entry} />
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: "#1e293b" }}>
            <span style={{ animation: "blink 1s step-end infinite", display: "inline-block" }}>█</span>
          </div>
        </div>
      </section>

      {/* Stack info */}
      <section style={{ display: "grid", gap: 14 }}>
        <h2
          style={{
            margin: 0,
            fontSize: 11,
            color: "#475569",
            letterSpacing: "0.14em",
            textTransform: "uppercase" as const,
            fontWeight: 400,
          }}
        >
          Stack
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
          {[
            { layer: "Runtime", value: "Python 3.14" },
            { layer: "API Framework", value: "FastAPI" },
            { layer: "HTTP Client", value: "httpx (async)" },
            { layer: "Config", value: "pydantic-settings" },
            { layer: "Frontend", value: "Next.js 16" },
            { layer: "UI Library", value: "React 19" },
            { layer: "Language", value: "TypeScript" },
            { layer: "Package Manager", value: "uv (Python)" },
          ].map((item) => (
            <div
              key={item.layer}
              style={{
                padding: "12px 14px",
                borderRadius: 10,
                background: "rgba(15,25,40,0.7)",
                border: "1px solid rgba(255,255,255,0.05)",
                display: "grid",
                gap: 4,
              }}
            >
              <span style={{ fontSize: 9, color: "#334155", letterSpacing: "0.1em", textTransform: "uppercase" as const }}>
                {item.layer}
              </span>
              <span style={{ fontSize: 13, color: "#94a3b8", fontFamily: "system-ui, sans-serif" }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
