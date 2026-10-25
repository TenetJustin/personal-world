/** All application routes and public resources share Vite's deployment base. */
export const SITE_BASE = (import.meta.env?.BASE_URL ?? "/").replace(
  /\/?$/,
  "/",
);

export function assetURL(path: string): string {
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  return SITE_BASE + path.replace(/^\/+/, "");
}

/** Return an application-relative pathname; never infer the repository name. */
export function sitePath(pathname = window.location.pathname): string {
  const base = SITE_BASE.replace(/\/$/, "");
  if (base && pathname === base) return "/";
  if (base && pathname.startsWith(base + "/"))
    return pathname.slice(base.length);
  return pathname;
}

export function appURL(app?: string | null, id?: string | null): string {
  const path = app ? encodeURIComponent(app) + "/" : "";
  return SITE_BASE + path + (id ? "?id=" + encodeURIComponent(id) : "");
}
