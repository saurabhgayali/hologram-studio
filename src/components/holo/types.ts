export type PresetId = "crystal" | "fire" | "galaxy" | "custom";

export type TintId = "cyan" | "magenta" | "gold" | "matrix";

export const TINTS: Record<TintId, { label: string; hex: string }> = {
  cyan: { label: "Cyan", hex: "#38e8ff" },
  magenta: { label: "Magenta", hex: "#ff45d0" },
  gold: { label: "Gold", hex: "#ffc061" },
  matrix: { label: "Matrix", hex: "#4dff88" },
};

export interface HoloSettings {
  preset: PresetId;
  customUrl: string | null;
  tint: TintId;
  scanSpeed: number;
  opacity: number;
  glitch: number;
  lightIntensity: number;
  fire: boolean;
  fog: boolean;
  starfield: boolean;
  autoRotate: boolean;
}

export const DEFAULT_SETTINGS: HoloSettings = {
  preset: "crystal",
  customUrl: null,
  tint: "cyan",
  scanSpeed: 1,
  opacity: 0.9,
  glitch: 0.15,
  lightIntensity: 1.4,
  fire: false,
  fog: true,
  starfield: true,
  autoRotate: false,
};
