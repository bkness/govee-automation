export interface DeviceState {
  on: boolean;
  brightness: number;
  color: { r: number; g: number; b: number };
  colorTem: number;
  mode: "white" | "color";
}

export interface StoredDevice {
  device: string;
  [key: string]: unknown;
}

const KEY = "govee-hud-states";

export function loadStored(): Record<string, Partial<DeviceState>> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) ?? "{}"); }
  catch { return {}; }
}

export function persistDevice(deviceId: string, state: DeviceState) {
  if (typeof window === "undefined") return;
  try {
    const all = loadStored();
    all[deviceId] = state;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function persistMany(deviceIds: string[], partial: Partial<DeviceState>) {
  if (typeof window === "undefined") return;
  try {
    const all = loadStored();
    for (const id of deviceIds) all[id] = { ...(all[id] ?? {}), ...partial };
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export function roomIsOn(deviceIds: string[]): boolean {
  const all = loadStored();
  return deviceIds.some((id) => all[id]?.on === true);
}
