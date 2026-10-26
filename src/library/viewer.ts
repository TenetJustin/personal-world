/** Editing is a local development tool, never a visitor-facing URL capability. */
export function localEditorEnabled(
  development: boolean,
  search: string,
): boolean {
  return development && new URLSearchParams(search).get("editor") === "local";
}
