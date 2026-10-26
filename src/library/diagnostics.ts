import { runtime } from "../scene/runtime";
export function diagnosticSnapshot() {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const navigation = performance.getEntriesByType("navigation")[0] as
    | PerformanceNavigationTiming
    | undefined;
  return {
    revision: "v3-reliability-audio",
    time: new Date().toISOString(),
    userAgent: navigator.userAgent,
    viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
    route: location.pathname.replace(/\/[a-zA-Z0-9_-]{20,}\//g, "/:record/"),
    navigation: {
      domContentLoadedMs: navigation?.domContentLoadedEventEnd,
      loadMs: navigation?.loadEventEnd,
    },
    resourceCount: resources.length,
    resourceTransferBytes: resources.reduce((n, r) => n + r.transferSize, 0),
    resourceEncodedBytes: resources.reduce((n, r) => n + r.encodedBodySize, 0),
    resources: resources
      .filter((r) => r.name.startsWith(location.origin))
      .map((r) => ({
        path: r.name.replace(location.origin, ""),
        durationMs: r.duration,
        transferBytes: r.transferSize,
        encodedBytes: r.encodedBodySize,
      })),
    world: runtime.snapshot(),
    note: "本地诊断不含资料正文及附件。FPS 仅在显式启动 3D 采样后有值；桌面暂停 WebGL，不能将暂停状态称为 60 FPS。",
  };
}
