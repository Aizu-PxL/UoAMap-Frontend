export const HISTORY_LIMIT = 100;

export type EditableSnapshot = {
  maps: readonly unknown[];
  qrPlacements: readonly unknown[];
  placeProposals: readonly unknown[];
  [key: string]: unknown;
};

export type EditorHistoryEntry<TSnapshot extends EditableSnapshot> = {
  label: string;
  before: TSnapshot;
  after: TSnapshot;
};

export type EditorHistory<TSnapshot extends EditableSnapshot> = {
  limit: number;
  undo: readonly EditorHistoryEntry<TSnapshot>[];
  redo: readonly EditorHistoryEntry<TSnapshot>[];
};

export type EditorHistoryRestore<TSnapshot extends EditableSnapshot> = {
  history: EditorHistory<TSnapshot>;
  entry: EditorHistoryEntry<TSnapshot> | null;
  snapshot: TSnapshot | null;
};

export function editableSnapshotKey(snapshot: EditableSnapshot): string {
  return JSON.stringify({
    maps: snapshot.maps,
    qrPlacements: snapshot.qrPlacements,
    placeProposals: snapshot.placeProposals,
  });
}

export function createEditorHistory<TSnapshot extends EditableSnapshot>(
  limit = HISTORY_LIMIT,
): EditorHistory<TSnapshot> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError("履歴上限は1以上の整数で指定してください");
  }
  return { limit, undo: [], redo: [] };
}

export function resetEditorHistory<TSnapshot extends EditableSnapshot>(
  history: EditorHistory<TSnapshot>,
): EditorHistory<TSnapshot> {
  if (history.undo.length === 0 && history.redo.length === 0) return history;
  return { ...history, undo: [], redo: [] };
}

export function recordEditorHistory<TSnapshot extends EditableSnapshot>(
  history: EditorHistory<TSnapshot>,
  label: string,
  before: TSnapshot,
  after: TSnapshot,
): { history: EditorHistory<TSnapshot>; recorded: boolean } {
  if (editableSnapshotKey(before) === editableSnapshotKey(after)) {
    return { history, recorded: false };
  }

  const undo = [...history.undo, { label, before, after }].slice(-history.limit);
  return {
    history: { ...history, undo, redo: [] },
    recorded: true,
  };
}

export function undoEditorHistory<TSnapshot extends EditableSnapshot>(
  history: EditorHistory<TSnapshot>,
): EditorHistoryRestore<TSnapshot> {
  const entry = history.undo.at(-1) ?? null;
  if (!entry) return { history, entry: null, snapshot: null };
  return {
    history: {
      ...history,
      undo: history.undo.slice(0, -1),
      redo: [...history.redo, entry],
    },
    entry,
    snapshot: entry.before,
  };
}

export function redoEditorHistory<TSnapshot extends EditableSnapshot>(
  history: EditorHistory<TSnapshot>,
): EditorHistoryRestore<TSnapshot> {
  const entry = history.redo.at(-1) ?? null;
  if (!entry) return { history, entry: null, snapshot: null };
  return {
    history: {
      ...history,
      undo: [...history.undo, entry],
      redo: history.redo.slice(0, -1),
    },
    entry,
    snapshot: entry.after,
  };
}

export const routeEditorHistory = {
  createEditorHistory,
  editableSnapshotKey,
  recordEditorHistory,
  redoEditorHistory,
  resetEditorHistory,
  undoEditorHistory,
};

export type RouteEditorHistory = typeof routeEditorHistory;
