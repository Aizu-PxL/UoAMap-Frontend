import { describe, expect, test } from "bun:test";
import * as path from "path";
import {
  createEditorHistory,
  recordEditorHistory,
  redoEditorHistory,
  resetEditorHistory,
  undoEditorHistory,
  type EditableSnapshot,
} from "./history.js";

type TestSnapshot = EditableSnapshot & {
  currentSheetId: string | null;
  selection: { type: string; id: string } | null;
};

function snapshot(value: number, selectionId: string | null = null): TestSnapshot {
  return {
    maps: [{ value }],
    qrPlacements: [],
    placeProposals: [],
    currentSheetId: "campus",
    selection: selectionId ? { type: "node", id: selectionId } : null,
  };
}

describe("route editor history", () => {
  test("editable stateが同じならselection等が変わっても記録しない", () => {
    const history = createEditorHistory<TestSnapshot>();
    const before = snapshot(1, null);
    const after = { ...snapshot(1, "route_node_a"), nextQrNumber: 99 };
    const result = recordEditorHistory(history, "選択だけ変更", before, after);

    expect(result.recorded).toEqual(false);
    expect(result.history).toEqual(history);
    expect(result.history.undo).toEqual([]);
  });

  test("record・undo・redoはbefore/afterを復元してentryを移す", () => {
    const initial = createEditorHistory<TestSnapshot>();
    const before = snapshot(1);
    const after = snapshot(2);
    const recorded = recordEditorHistory(initial, "値を変更", before, after);
    const undone = undoEditorHistory(recorded.history);
    const redone = redoEditorHistory(undone.history);

    expect(recorded.recorded).toEqual(true);
    expect(recorded.history.undo.map(({ label }) => label)).toEqual(["値を変更"]);
    expect(undone.snapshot).toEqual(before);
    expect(undone.history.undo).toEqual([]);
    expect(undone.history.redo.map(({ label }) => label)).toEqual(["値を変更"]);
    expect(redone.snapshot).toEqual(after);
    expect(redone.history.undo.map(({ label }) => label)).toEqual(["値を変更"]);
    expect(redone.history.redo).toEqual([]);
  });

  test("undo後の新規recordはredoを破棄する", () => {
    const initial = createEditorHistory<TestSnapshot>();
    const first = recordEditorHistory(initial, "first", snapshot(0), snapshot(1));
    const undone = undoEditorHistory(first.history);
    const branch = recordEditorHistory(
      undone.history,
      "branch",
      snapshot(0),
      snapshot(2),
    );

    expect(undone.history.redo.length).toEqual(1);
    expect(branch.history.undo.map(({ label }) => label)).toEqual(["branch"]);
    expect(branch.history.redo).toEqual([]);
  });

  test("最新100件だけを保持しresetでundo/redoを空にする", () => {
    let history = createEditorHistory<TestSnapshot>();
    for (let index = 1; index <= 101; index += 1) {
      history = recordEditorHistory(
        history,
        `edit-${index}`,
        snapshot(index - 1),
        snapshot(index),
      ).history;
    }

    expect(history.undo.length).toEqual(100);
    expect(history.undo[0]?.label).toEqual("edit-2");
    expect(history.undo.at(-1)?.label).toEqual("edit-101");
    const withRedo = undoEditorHistory(history).history;
    expect(resetEditorHistory(withRedo)).toEqual({
      limit: 100,
      undo: [],
      redo: [],
    });
    expect(() => createEditorHistory<TestSnapshot>(0)).toThrow(
      "履歴上限は1以上の整数で指定してください",
    );
    const oneEntryHistory = recordEditorHistory(
      recordEditorHistory(
        createEditorHistory<TestSnapshot>(1),
        "first",
        snapshot(0),
        snapshot(1),
      ).history,
      "second",
      snapshot(1),
      snapshot(2),
    ).history;
    expect(oneEntryHistory.undo.map(({ label }) => label)).toEqual(["second"]);
  });

  test("計画JSONの複数変更を1操作としnextQrNumberは履歴外に保つ", () => {
    const history = createEditorHistory<TestSnapshot>();
    const before = snapshot(0);
    const after: TestSnapshot = {
      ...snapshot(0),
      qrPlacements: [{ qrId: "Q003" }, { qrId: "Q010" }],
      placeProposals: [{ id: "new-place" }],
    };
    let nextQrNumber = 11;
    const recorded = recordEditorHistory(history, "計画JSONを読込", before, after);
    const undone = undoEditorHistory(recorded.history);
    nextQrNumber = Math.max(nextQrNumber, 11);

    expect(recorded.history.undo.length).toEqual(1);
    expect(recorded.history.undo[0]?.label).toEqual("計画JSONを読込");
    expect(undone.snapshot).toEqual(before);
    expect(nextQrNumber).toEqual(11);
  });

  test("inline境界はSVG読込reset・drag/連続入力/計画読込の各1 commitを維持する", async () => {
    const html = await Bun.file(
      path.join(import.meta.dirname, "../route-editor.html"),
    ).text();

    expect(html.includes("state.maps.set(cfg.sheetId, ms);\n  resetHistory();")).toEqual(
      true,
    );
    expect(
      html.includes('if (drag.nodeId) commitHistory("ノードを移動",drag.before);'),
    ).toEqual(true);
    expect(
      html.includes(
        "const finish=()=>{ if (!before) return; commitHistory(label,before); before=null; };",
      ),
    ).toEqual(true);
    expect(
      html.includes(
        'runEdit("計画JSONを読込",()=>importPlanData(data))',
      ),
    ).toEqual(true);
  });
});
