import {
  AlertCircle,
  Box,
  Flame,
  Gauge,
  Loader2,
  Maximize2,
  Orbit,
  RotateCcw,
  Sparkles,
  Stars,
  Sun,
  Upload,
  Waves,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { HoloSettings, PresetId, TintId } from "./types";
import { TINTS } from "./types";

const PRESETS: { id: PresetId; label: string; hint: string; icon: typeof Box }[] = [
  { id: "crystal", label: "Sci-Fi Crystal", hint: "Orbiting dust", icon: Sparkles },
  { id: "fire", label: "Fire Sphere", hint: "Volumetric flame", icon: Flame },
  { id: "galaxy", label: "Galaxy Core", hint: "Deep space", icon: Stars },
];

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  icon: typeof Box;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Icon className="size-3.5 text-primary" />
          {label}
        </span>
        <span className="font-mono text-primary">{value.toFixed(2)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="holo-range"
      />
    </label>
  );
}

function Toggle({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof Box;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] uppercase tracking-[0.12em] transition-all ${
        active
          ? "border-primary/70 bg-primary/15 text-primary shadow-[0_0_16px_-4px_var(--primary)]"
          : "border-border/70 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
      }`}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  );
}

export function ControlPanel({
  settings,
  set,
  onReset,
  onFullscreen,
}: {
  settings: HoloSettings;
  set: <K extends keyof HoloSettings>(key: K, value: HoloSettings[K]) => void;
  onReset: () => void;
  onFullscreen: () => void;
}) {
  const [tab, setTab] = useState<"preset" | "upload">("preset");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);

  const loadFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!/\.(glb|gltf)$/i.test(file.name)) {
        setError("Unsupported file. Please provide a .glb or .gltf model.");
        return;
      }
      if (file.size > 60 * 1024 * 1024) {
        setError("File too large (max 60 MB).");
        return;
      }
      setLoading(true);
      try {
        const buffer = await file.arrayBuffer();
        const isGlb = /\.glb$/i.test(file.name);
        if (isGlb) {
          if (buffer.byteLength < 20) throw new Error("File is empty or truncated.");
          const header = new DataView(buffer);
          // "glTF" magic + version + total length must match the actual bytes
          const magic = String.fromCharCode(
            header.getUint8(0),
            header.getUint8(1),
            header.getUint8(2),
            header.getUint8(3),
          );
          if (magic !== "glTF") throw new Error("Not a valid binary glTF (.glb) file.");
          const declared = header.getUint32(8, true);
          if (declared !== buffer.byteLength) {
            throw new Error("The .glb file appears corrupted or incomplete.");
          }
        } else {
          const text = new TextDecoder().decode(buffer);
          const json = JSON.parse(text) as { asset?: { version?: string } };
          if (!json.asset?.version) throw new Error("Not a valid .gltf document.");
        }

        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        const url = URL.createObjectURL(
          new Blob([buffer], {
            type: isGlb ? "model/gltf-binary" : "model/gltf+json",
          }),
        );
        urlRef.current = url;
        setFileName(file.name);
        set("customUrl", url);
        set("preset", "custom");
      } catch (err) {
        setFileName(null);
        setError(
          err instanceof Error ? err.message : "Could not read that model file.",
        );
      } finally {
        setLoading(false);
      }
    },
    [set],
  );

  return (
    <div className="pointer-events-auto w-[19rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border/70 bg-card/55 p-4 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.9)] backdrop-blur-xl">
      <div className="mb-3 flex items-center gap-2">
        <span className="size-2 animate-pulse rounded-full bg-primary shadow-[0_0_10px_var(--primary)]" />
        <h2 className="font-display text-xs uppercase tracking-[0.3em] text-foreground">
          Projector Console
        </h2>
      </div>

      {/* tabs */}
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-border/60 bg-background/50 p-1">
        {(["preset", "upload"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-2 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${
              tab === t
                ? "bg-primary/20 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "preset" ? "Presets" : "Upload GLB"}
          </button>
        ))}
      </div>

      {tab === "preset" ? (
        <div className="space-y-1.5">
          {PRESETS.map((p) => {
            const active = settings.preset === p.id;
            return (
              <button
                key={p.id}
                onClick={() => set("preset", p.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
                  active
                    ? "border-primary/70 bg-primary/10 shadow-[0_0_20px_-8px_var(--primary)]"
                    : "border-border/60 bg-background/40 hover:border-primary/40"
                }`}
              >
                <p.icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span>
                  <span className="block text-xs text-foreground">{p.label}</span>
                  <span className="block text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {p.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDrag(true);
            }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDrag(false);
              const f = e.dataTransfer.files?.[0];
              if (f) loadFile(f);
            }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-6 text-center transition-colors ${
              drag ? "border-primary bg-primary/10" : "border-border/70 bg-background/40"
            }`}
          >
            {loading ? (
              <Loader2 className="size-5 animate-spin text-primary" />
            ) : (
              <Upload className="size-5 text-primary" />
            )}
            <span className="text-xs text-foreground">
              {loading ? "Materializing model…" : "Drop .glb / .gltf here"}
            </span>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              or click to browse
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".glb,.gltf,model/gltf-binary"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) loadFile(f);
            }}
          />
          {fileName && !error && (
            <p className="mt-2 truncate text-[11px] text-primary">Loaded: {fileName}</p>
          )}
          {error && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-destructive">
              <AlertCircle className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          )}
        </div>
      )}

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* tint */}
      <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Hologram Tint
      </span>
      <div className="mb-4 grid grid-cols-4 gap-1.5">
        {(Object.keys(TINTS) as TintId[]).map((id) => (
          <button
            key={id}
            onClick={() => set("tint", id)}
            title={TINTS[id].label}
            className={`h-7 rounded-md border transition-all ${
              settings.tint === id
                ? "border-foreground/70 scale-105"
                : "border-border/60 hover:border-foreground/40"
            }`}
            style={{
              background: `linear-gradient(140deg, ${TINTS[id].hex}, transparent 140%)`,
              boxShadow: settings.tint === id ? `0 0 16px -2px ${TINTS[id].hex}` : undefined,
            }}
          />
        ))}
      </div>

      <div className="space-y-3">
        <Slider
          label="Scanline Speed"
          icon={Waves}
          value={settings.scanSpeed}
          min={0}
          max={4}
          step={0.05}
          onChange={(v) => set("scanSpeed", v)}
        />
        <Slider
          label="Transparency"
          icon={Gauge}
          value={settings.opacity}
          min={0.1}
          max={1.5}
          step={0.01}
          onChange={(v) => set("opacity", v)}
        />
        <Slider
          label="Glitch"
          icon={Sparkles}
          value={settings.glitch}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => set("glitch", v)}
        />
        <Slider
          label="Light Intensity"
          icon={Sun}
          value={settings.lightIntensity}
          min={0}
          max={3}
          step={0.05}
          onChange={(v) => set("lightIntensity", v)}
        />
      </div>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        Background FX
      </span>
      <div className="flex flex-wrap gap-1.5">
        <Toggle
          label="Fire"
          icon={Flame}
          active={settings.fire}
          onClick={() => set("fire", !settings.fire)}
        />
        <Toggle
          label="Fog"
          icon={Waves}
          active={settings.fog}
          onClick={() => set("fog", !settings.fog)}
        />
        <Toggle
          label="Stars"
          icon={Stars}
          active={settings.starfield}
          onClick={() => set("starfield", !settings.starfield)}
        />
      </div>

      <div className="my-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="flex flex-wrap gap-1.5">
        <Toggle
          label="Auto-Rotate"
          icon={Orbit}
          active={settings.autoRotate}
          onClick={() => set("autoRotate", !settings.autoRotate)}
        />
        <Toggle label="Reset View" icon={RotateCcw} active={false} onClick={onReset} />
        <Toggle label="Fullscreen" icon={Maximize2} active={false} onClick={onFullscreen} />
      </div>
    </div>
  );
}
