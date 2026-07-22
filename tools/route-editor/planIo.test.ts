import { describe, expect, test } from "bun:test";
import * as path from "path";
import {
  compareQrPlacements,
  createCoordinatePlaceProposals,
  createQrMappings,
  createRouteEditorPlan,
  numericQrPart,
  parseRouteEditorPlan,
  serializeJson,
  serializeQrMappingsCsv,
  type PlanLocationResolver,
  type PlaceProposal,
  type QrPlacement,
} from "./planIo.js";

const placements: QrPlacement[] = [
  {
    qrId: "Q010",
    sheetId: "rq1f",
    routeNodeId: "route_node_b",
    placeId: "place-b",
    kind: "variable",
    installationNote: '  受付, 東側 "柱"\n付近  ',
  },
  {
    qrId: "Q002",
    sheetId: "campus",
    routeNodeId: "route_node_a",
    placeId: "place-a",
    kind: "fixed",
    installationNote: " 正門 ",
  },
];

const proposals: PlaceProposal[] = [
  {
    id: "place-b",
    name: "B地点",
    sheetId: "rq1f",
    routeNodeId: "route_node_b",
  },
  {
    id: "place-a",
    name: "A地点",
    sheetId: "campus",
    routeNodeId: "route_node_a",
  },
  {
    id: "place-missing",
    name: "未読込",
    sheetId: "missing",
    routeNodeId: "route_node_missing",
  },
];

const resolveLocation: PlanLocationResolver = (sheetId, routeNodeId) => {
  const key = `${sheetId}/${routeNodeId}`;
  if (key === "rq1f/route_node_b") {
    return { floorId: "rq-1f", x: 12.345, y: 67.899 };
  }
  if (key === "campus/route_node_a") {
    return { floorId: "campus", x: 1, y: 2 };
  }
  if (sheetId === "campus") {
    return { floorId: "campus", x: null, y: null };
  }
  return null;
};

function captureErrorMessage(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  return "";
}

describe("route editor plan I/O", () => {
  test("QRは数値部で並び、不正形式と同値は既存の文字列順を維持する", () => {
    const values = ["Q010", "Q2", "Q002", "bad", "also-bad", "Q000"].map(
      (qrId) => ({ qrId }),
    );

    expect(numericQrPart("Q002")).toEqual(2);
    expect(numericQrPart("bad")).toEqual(-1);
    expect(values.sort(compareQrPlacements).map(({ qrId }) => qrId)).toEqual([
      "also-bad",
      "bad",
      "Q000",
      "Q002",
      "Q2",
      "Q010",
    ]);
  });

  test("schema v1計画JSONを所定順・情報用座標・末尾改行で出力する", () => {
    const plan = createRouteEditorPlan({
      nextQrNumber: 11,
      placements,
      placeProposals: proposals,
      resolveLocation,
    });

    expect(serializeJson(plan)).toEqual(`{
  "schemaVersion": 1,
  "nextQrNumber": 11,
  "placements": [
    {
      "qrId": "Q002",
      "sheetId": "campus",
      "routeNodeId": "route_node_a",
      "placeId": "place-a",
      "kind": "fixed",
      "installationNote": " 正門 ",
      "floorId": "campus",
      "x": 1,
      "y": 2
    },
    {
      "qrId": "Q010",
      "sheetId": "rq1f",
      "routeNodeId": "route_node_b",
      "placeId": "place-b",
      "kind": "variable",
      "installationNote": "  受付, 東側 \\"柱\\"\\n付近  ",
      "floorId": "rq-1f",
      "x": 12.35,
      "y": 67.9
    }
  ],
  "placeProposals": [
    {
      "id": "place-a",
      "name": "A地点",
      "sheetId": "campus",
      "routeNodeId": "route_node_a",
      "floorId": "campus",
      "x": 1,
      "y": 2
    },
    {
      "id": "place-b",
      "name": "B地点",
      "sheetId": "rq1f",
      "routeNodeId": "route_node_b",
      "floorId": "rq-1f",
      "x": 12.35,
      "y": 67.9
    },
    {
      "id": "place-missing",
      "name": "未読込",
      "sheetId": "missing",
      "routeNodeId": "route_node_missing",
      "floorId": null,
      "x": null,
      "y": null
    }
  ]
}
`);
    expect(
      createRouteEditorPlan({
        nextQrNumber: 1,
        placements: [{ ...placements[0]!, sheetId: "campus", routeNodeId: "missing" }],
        placeProposals: [],
        resolveLocation,
      }).placements[0],
    ).toEqual({
      ...placements[0],
      sheetId: "campus",
      routeNodeId: "missing",
      floorId: "campus",
      x: null,
      y: null,
    });
  });

  test("計画読込は文字列化・情報座標無視・nextQrNumber算出を維持する", () => {
    const imported = parseRouteEditorPlan({
      schemaVersion: 1,
      nextQrNumber: "5",
      placements: [
        {
          qrId: "Q010",
          sheetId: " rq1f ",
          routeNodeId: 123,
          placeId: false,
          kind: " fixed ",
          installationNote: " そのまま ",
          floorId: "偽のfloor",
          x: 999,
          y: 999,
        },
      ],
      placeProposals: [
        {
          id: " proposal ",
          name: 42,
          sheetId: "rq1f",
          routeNodeId: "route_node_b",
          floorId: "偽のfloor",
          x: 999,
          y: 999,
        },
      ],
    });

    expect(imported).toEqual({
      nextQrNumber: 11,
      placements: [
        {
          qrId: "Q010",
          sheetId: " rq1f ",
          routeNodeId: "123",
          placeId: "",
          kind: " fixed ",
          installationNote: " そのまま ",
        },
      ],
      placeProposals: [
        {
          id: " proposal ",
          name: "42",
          sheetId: "rq1f",
          routeNodeId: "route_node_b",
        },
      ],
    });
    expect(
      parseRouteEditorPlan({
        schemaVersion: 1,
        nextQrNumber: 20,
        placements: [{ qrId: "Q002" }],
        placeProposals: [],
      }).nextQrNumber,
    ).toEqual(20);
    expect(
      parseRouteEditorPlan({
        schemaVersion: 1,
        nextQrNumber: "invalid",
        placements: [],
        placeProposals: [],
      }).nextQrNumber,
    ).toEqual(1);
  });

  test("計画読込はschema・QR重複・Place案重複を既存文言で拒否する", () => {
    expect(captureErrorMessage(() => parseRouteEditorPlan({}))).toEqual(
      "対応していない計画JSONです",
    );
    expect(
      captureErrorMessage(() =>
        parseRouteEditorPlan({
          schemaVersion: 1,
          nextQrNumber: 1,
          placements: [{ qrId: "Q001" }, { qrId: "Q001" }],
          placeProposals: [],
        }),
      ),
    ).toEqual("QR IDが重複しています: Q001");
    expect(
      captureErrorMessage(() =>
        parseRouteEditorPlan({
          schemaVersion: 1,
          nextQrNumber: 1,
          placements: [],
          placeProposals: [{ id: "place-a" }, { id: "place-a" }],
        }),
      ),
    ).toEqual("Place案IDが重複しています: place-a");
    expect(
      captureErrorMessage(() =>
        parseRouteEditorPlan({
          schemaVersion: 1,
          nextQrNumber: 1,
          placements: [null],
          placeProposals: [],
        }),
      ),
    ).toEqual("計画JSONの要素が不正です");
    expect(
      captureErrorMessage(() =>
        parseRouteEditorPlan({
          schemaVersion: 1,
          nextQrNumber: 1,
          placements: [],
          placeProposals: [null],
        }),
      ),
    ).toEqual("計画JSONの要素が不正です");
  });

  test("QrCode JSON・BOM/CRLF CSV・座標Place案をexact出力する", () => {
    const mappings = createQrMappings(placements);
    const coordinateProposals = createCoordinatePlaceProposals(
      proposals,
      resolveLocation,
    );

    expect(serializeJson(mappings)).toEqual(`[
  {
    "qrId": "Q002",
    "placeId": "place-a",
    "kind": "fixed",
    "installationNote": "正門"
  },
  {
    "qrId": "Q010",
    "placeId": "place-b",
    "kind": "variable",
    "installationNote": "受付, 東側 \\"柱\\"\\n付近"
  }
]
`);
    expect(serializeQrMappingsCsv(mappings)).toEqual(
      '\ufeffqrId,placeId,kind,installationNote\r\nQ002,place-a,fixed,正門\r\nQ010,place-b,variable,"受付, 東側 ""柱""\n付近"\r\n',
    );
    expect(serializeJson(coordinateProposals)).toEqual(`[
  {
    "id": "place-a",
    "floorId": "campus",
    "name": "A地点",
    "mapping": "coordinates",
    "coordinates": {
      "x": 1,
      "y": 2
    }
  },
  {
    "id": "place-b",
    "floorId": "rq-1f",
    "name": "B地点",
    "mapping": "coordinates",
    "coordinates": {
      "x": 12.35,
      "y": 67.9
    }
  }
]
`);
  });

  test("生成IIFEがplan I/O globalを公開しinline editorが参照する", async () => {
    const html = await Bun.file(
      path.join(import.meta.dirname, "../route-editor.html"),
    ).text();

    expect(html.includes("globalThis.UOAMAP_ROUTE_EDITOR_PLAN_IO = routeEditorPlanIo")).toEqual(
      true,
    );
    expect(html.includes("} = globalThis.UOAMAP_ROUTE_EDITOR_PLAN_IO;")).toEqual(
      true,
    );
    expect(html.includes("const PLAN_SCHEMA_VERSION = 1;")).toEqual(false);
    expect(html.includes("function csvCell(value){")).toEqual(false);
  });
});
