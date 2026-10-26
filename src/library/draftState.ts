import type { Kind } from "./model.ts";

/** One flag per mounted editor; focusing a clean window cannot clear another. */
export type DraftWindow = Kind | "profile";
export type DraftState = Partial<Record<DraftWindow, boolean>>;
export const DRAFT_WINDOWS = [
  "notes",
  "photos",
  "projects",
  "resume",
  "profile",
] as const;

export function updateDraftState(
  state: DraftState,
  window: DraftWindow,
  dirty: boolean,
): DraftState {
  if ((state[window] ?? false) === dirty) return state;
  return { ...state, [window]: dirty };
}
export function anyDraftDirty(state: DraftState) {
  return DRAFT_WINDOWS.some((window) => state[window] === true);
}
export function otherDraftDirty(state: DraftState, current: DraftWindow) {
  return DRAFT_WINDOWS.some(
    (window) => window !== current && state[window] === true,
  );
}
/** Create once with useMemo; stable callbacks keep editor effects from retriggering. */
export function createDirtyCallbacks(
  report: (window: DraftWindow, dirty: boolean) => void,
) {
  return Object.fromEntries(
    DRAFT_WINDOWS.map((window) => [
      window,
      (dirty: boolean) => report(window, dirty),
    ]),
  ) as Record<DraftWindow, (dirty: boolean) => void>;
}

/** Only acknowledge the exact snapshot written; edits typed during an async save remain dirty. */
export function acknowledgeSavedDraft<T>(
  drafts: Record<string, T>,
  id: string,
  saved: T,
): Record<string, T> {
  if (drafts[id] !== saved) return drafts;
  const next = { ...drafts };
  delete next[id];
  return next;
}

/** Visual row order and persisted sortOrder must move together. Does not mutate source. */
export function moveProfileRow<T extends { sortOrder?: number }>(
  rows: readonly T[],
  from: number,
  to: number,
): T[] {
  if (
    from < 0 ||
    from >= rows.length ||
    to < 0 ||
    to >= rows.length ||
    from === to
  )
    return [...rows];
  const next = [...rows];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next.map((item, index) =>
    "sortOrder" in item ? { ...item, sortOrder: index } : item,
  );
}
