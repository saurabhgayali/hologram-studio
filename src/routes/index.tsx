import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Experience } from "@/components/holo/Experience";
import { ControlPanel } from "@/components/holo/ControlPanel";
import { DEFAULT_SETTINGS, type HoloSettings } from "@/components/holo/types";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Holo-Deck MK-VII — 3D Interactive Holographic Card" },
      {
        name: "description",
        content:
          "A real-time WebGL holographic projection card: render-target holograms, scanlines, glitch FX, preset scenes and custom GLB uploads.",
      },
      { property: "og:title", content: "Holo-Deck MK-VII — 3D Holographic Card" },
      {
        property: "og:description",
        content:
          "Rotate a physical 3D card and look inside a live volumetric hologram. Presets, tints, scanlines and custom GLB models.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [settings, setSettings] = useState<HoloSettings>(DEFAULT_SETTINGS);
  const [resetSignal, setResetSignal] = useState(0);
  const shellRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    <K extends keyof HoloSettings>(key: K, value: HoloSettings[K]) =>
      setSettings((s) => ({ ...s, [key]: value })),
    [],
  );

  const onFullscreen = useCallback(() => {
    const el = shellRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  }, []);

  return (
    <div ref={shellRef} className="relative h-screen w-full overflow-hidden bg-background">
      <Experience settings={settings} resetSignal={resetSignal} />

      {/* vignette + grid overlay */}
      <div className="holo-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(0,0,0,0.85)_100%)]" />

      <header className="pointer-events-none absolute left-0 top-0 flex w-full items-start justify-between p-5">
        <div>
          <h1 className="font-display text-lg uppercase tracking-[0.42em] text-foreground drop-shadow-[0_0_18px_var(--primary)]">
            Holo-Deck
          </h1>
          <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Volumetric projection card · MK-VII
          </p>
        </div>
        <p className="hidden text-right text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
          Drag to orbit · Scroll to zoom
        </p>
      </header>

      <div className="pointer-events-none absolute bottom-0 right-0 top-0 flex items-center p-4">
        <ControlPanel
          settings={settings}
          set={set}
          onReset={() => setResetSignal((n) => n + 1)}
          onFullscreen={onFullscreen}
        />
      </div>
    </div>
  );
}
