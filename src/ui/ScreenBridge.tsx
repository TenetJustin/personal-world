import { useEffect, useRef, type ReactNode } from "react";
import { journey } from "../scene/journey";
import {
  cssMatrix,
  homography,
  screenProjection,
} from "../scene/screenProjection";
import { drawScreenPreview } from "../scene/screenPreview";
export function ScreenBridge({
  active,
  full,
  children,
}: {
  active: boolean;
  full: boolean;
  children: ReactNode;
}) {
  const layer = useRef<HTMLDivElement>(null),
    preview = useRef<HTMLDivElement>(null),
    previewCanvas = useRef<HTMLCanvasElement>(null),
    live = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const canvas = previewCanvas.current;
    if (canvas) drawScreenPreview(canvas);
  }, []);
  useEffect(() => {
    if (!active) return;
    if (full) {
      if (layer.current) {
        layer.current.style.transform = "none";
        layer.current.style.width = "100vw";
        layer.current.style.height = "100vh";
      }
      if (preview.current) preview.current.style.opacity = "0";
      if (live.current) live.current.style.opacity = "1";
      return;
    }
    let frame = 0;
    const update = () => {
      const node = layer.current,
        p = full ? 1 : journey.dockProgress,
        w = innerWidth,
        h = innerHeight;
      if (node) {
        node.style.width = `${w}px`;
        node.style.height = `${h}px`;
        if (p >= 0.99999) node.style.transform = "none";
        else if (screenProjection.quad && screenProjection.valid) {
          const rect = [
              [0, 0],
              [w, 0],
              [w, h],
              [0, h],
            ],
            quad = screenProjection.quad.map(
              (c, i) =>
                [
                  c[0] + (rect[i][0] - c[0]) * p,
                  c[1] + (rect[i][1] - c[1]) * p,
                ] as const,
            ),
            matrix = homography(w, h, quad);
          if (matrix) {
            node.style.transform = cssMatrix(matrix);
            const corners =
              node.querySelectorAll<HTMLElement>(".bridge-corner");
            corners.forEach((corner, i) => {
              const r = corner.getBoundingClientRect();
              screenProjection.maxCornerErrorPixels = Math.max(
                screenProjection.maxCornerErrorPixels,
                Math.hypot(r.x - quad[i][0], r.y - quad[i][1]),
              );
            });
          }
        }
        const reveal = Math.max(0, Math.min(1, (p - 0.55) / 0.4));
        if (preview.current) preview.current.style.opacity = String(1 - reveal);
        if (live.current) live.current.style.opacity = String(reveal);
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, [active, full]);
  return (
    <div className="screen-bridge" hidden={!active} aria-hidden={!active}>
      <div className="screen-bridge-layer" ref={layer} inert={!full}>
        {[
          ["0%", "0%"],
          ["100%", "0%"],
          ["100%", "100%"],
          ["0%", "100%"],
        ].map(([left, top], i) => (
          <i
            key={i}
            className="bridge-corner"
            style={{ left, top }}
            aria-hidden="true"
          />
        ))}
        <div className="screen-bridge-preview" ref={preview} aria-hidden="true">
          <canvas ref={previewCanvas} aria-hidden="true" />
        </div>
        <div
          ref={live}
          className="screen-bridge-live"
          style={{ pointerEvents: full ? "auto" : "none" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
