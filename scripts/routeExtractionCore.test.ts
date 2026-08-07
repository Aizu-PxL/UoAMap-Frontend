import { describe, expect, test } from "bun:test";
import * as path from "path";
import { floors, mapSheets, places } from "../src/data/places.js";
import type { Floor, MapSheet, Place } from "../src/data/types.js";
import {
  extractRouteGraph,
  serializeRouteGraph,
  type RouteSvgSource,
} from "./routeExtractionCore.js";
import { routeDistanceCalibrationPlan } from "./routeDistanceCalibration.js";

const repositoryRoot = path.join(import.meta.dirname, "..");

function coordinatePlace(id: string, floorId: string): Place {
  return {
    id,
    floorId,
    name: id,
    mapping: "coordinates",
    coordinates: { x: 0, y: 0 },
  };
}

async function extractSingle(
  svg: string,
  fixturePlaces: readonly Place[] = [],
) {
  const fixtureMapSheets: MapSheet[] = [
    { id: "sheet", name: "Sheet", svgUrl: "/maps/test.svg" },
  ];
  const fixtureFloors: Floor[] = [
    { id: "floor", sheetId: "sheet", name: "Floor" },
  ];
  return extractRouteGraph({
    sources: [{ svgUrl: "/maps/test.svg", content: svg }],
    mapSheets: fixtureMapSheets,
    floors: fixtureFloors,
    places: fixturePlaces,
  });
}

function routeGroup(children: string, attributes = "") {
  return `<svg><g id="Route" data-floor-id="floor"${attributes}>${children}</g></svg>`;
}

const nodeA =
  '<circle id="node_a" data-route-node="" data-kind="corridor" cx="0" cy="0" />';
const nodeB =
  '<circle id="node_b" data-route-node="" data-kind="corridor" cx="3" cy="4" />';

describe("extractRouteGraph", () => {
  test("実10 SVGを350 nodes / 448 edgesへ抽出し生成JSONと完全バイト一致する", async () => {
    const sources: RouteSvgSource[] = await Promise.all(
      mapSheets.map(async (sheet) => ({
        svgUrl: sheet.svgUrl,
        content: await Bun.file(
          path.join(repositoryRoot, "public", sheet.svgUrl.replace(/^\//, "")),
        ).text(),
      })),
    );
    const currentJson = await Bun.file(
      path.join(
        repositoryRoot,
        "src/features/routing/generated/routeGraph.json",
      ),
    ).text();

    const result = await extractRouteGraph({
      sources,
      mapSheets,
      floors,
      places,
      distanceCalibrationPlan: routeDistanceCalibrationPlan,
    });

    expect(result.errors).toEqual([]);
    expect([result.graph.nodes.length, result.graph.edges.length]).toEqual([
      350, 448,
    ]);
    expect(result.graph.distanceCalibration?.unit).toEqual("campus-svg-unit");
    expect(serializeRouteGraph(result.graph)).toEqual(currentJson);
  });

  test("Route groupの個数・ルート直下・floor一致を検証する", async () => {
    const duplicate = await extractSingle(
      '<svg><g id="Route" data-floor-id="floor"></g><g id="Route" data-floor-id="floor"></g></svg>',
    );
    const nested = await extractSingle(
      '<svg><g><g id="Route" data-floor-id="floor"></g></g></svg>',
    );
    const wrongFloor = await extractSingle(
      '<svg><g id="Route" data-floor-id="other"></g></svg>',
    );

    expect(duplicate.errors).toEqual([
      "/maps/test.svg: Routeグループは1つだけ配置してください",
    ]);
    expect(nested.errors).toEqual([
      "/maps/test.svg: RouteグループはSVGルート直下に配置してください",
    ]);
    expect(wrongFloor.errors).toEqual([
      '/maps/test.svg: data-floor-id="other" がFloor floor と一致しません',
    ]);
  });

  test("Routeと子要素のtransformおよび子data-floor-idを拒否する", async () => {
    const result = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="corridor" data-floor-id="floor" transform="translate(1 1)" cx="0" cy="0" />',
        ' transform="translate(1 1)"',
      ),
    );

    expect(result.errors).toEqual([
      "/maps/test.svg: node_aのdata-floor-idはRouteグループへ設定してください",
      "/maps/test.svg: Route内の Route にtransformは使用できません",
      "/maps/test.svg: Route内の node_a にtransformは使用できません",
    ]);
  });

  test("nodeの要素種別・kind・座標・Place参照を検証する", async () => {
    const wrongElement = await extractSingle(
      routeGroup(
        '<rect id="node_a" data-route-node="" data-kind="corridor" cx="0" cy="0" />',
      ),
    );
    const wrongKind = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="lift" cx="0" cy="0" />',
      ),
    );
    const wrongCoordinates = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="corridor" cx="" cy="0" />',
      ),
    );
    const unknownPlace = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="corridor" data-place-id="missing" cx="0" cy="0" />',
      ),
    );

    expect(wrongElement.errors).toEqual([
      "/maps/test.svg: Routeノードはcircleである必要があります",
    ]);
    expect(wrongKind.errors).toEqual([
      "/maps/test.svg: node_a のdata-kindが不正です",
    ]);
    expect(wrongCoordinates.errors).toEqual([
      "/maps/test.svg: node_a のcx/cyが不正です",
    ]);
    expect(unknownPlace.errors).toEqual([
      "/maps/test.svg: 未登録Place missing を参照しています",
    ]);
  });

  test("registry不足、ID文字、node/edge/place重複を検証する", async () => {
    const missingFloor = await extractRouteGraph({
      sources: [{ svgUrl: "/maps/test.svg", content: "<svg></svg>" }],
      mapSheets: [
        { id: "sheet", name: "Sheet", svgUrl: "/maps/test.svg" },
      ],
      floors: [],
      places: [],
    });
    const invalidId = await extractSingle(
      routeGroup(
        '<circle id="1bad" data-route-node="" data-kind="corridor" cx="0" cy="0" />',
      ),
    );
    const duplicateNode = await extractSingle(
      routeGroup(`${nodeA}${nodeA}`),
    );
    const duplicateEdge = await extractSingle(
      routeGroup(
        `${nodeA}${nodeB}<path id="edge_a" data-route-edge="" data-node-a="node_a" data-node-b="node_b" d="M 0 0 L 3 4" /><path id="edge_a" data-route-edge="" data-node-a="node_a" data-node-b="node_b" d="M 0 0 L 3 4" />`,
      ),
    );
    const duplicatePlace = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="corridor" data-place-id="place-a" cx="0" cy="0" /><circle id="node_b" data-route-node="" data-kind="corridor" data-place-id="place-a" cx="1" cy="1" />',
      ),
      [coordinatePlace("place-a", "floor")],
    );

    expect(missingFloor.errors).toEqual([
      "/maps/test.svg: MapSheetにはFloorを1つだけ登録してください（現在0件）",
    ]);
    expect(invalidId.errors).toEqual([
      "/maps/test.svg: RouteノードID 1bad に使用できない文字があります",
    ]);
    expect(duplicateNode.errors).toEqual([
      "/maps/test.svg: RouteノードID node_a がSVG内で重複しています",
    ]);
    expect(duplicateEdge.errors).toEqual([
      "/maps/test.svg: RouteエッジID edge_a がSVG内で重複しています",
    ]);
    expect(duplicatePlace.errors).toEqual([
      "/maps/test.svg: Place place-a のノードが floor:node_a と重複しています",
    ]);
  });

  test("edgeの未定義node・直線path・始終点一致を検証する", async () => {
    const undefinedNode = await extractSingle(
      routeGroup(
        `${nodeA}<path id="edge_a" data-route-edge="" data-node-a="node_a" data-node-b="missing" d="M 0 0 L 3 4" />`,
      ),
    );
    const curvedPath = await extractSingle(
      routeGroup(
        `${nodeA}${nodeB}<path id="edge_a" data-route-edge="" data-node-a="node_a" data-node-b="node_b" d="M 0 0 C 1 1 2 2 3 4" />`,
      ),
    );
    const mismatchedPath = await extractSingle(
      routeGroup(
        `${nodeA}${nodeB}<path id="edge_a" data-route-edge="" data-node-a="node_a" data-node-b="node_b" d="M 1 0 L 3 4" />`,
      ),
    );

    expect(undefinedNode.errors).toEqual([
      "/maps/test.svg: edge_a が未定義ノードを参照しています",
    ]);
    expect(curvedPath.errors).toEqual([
      "/maps/test.svg: edge_a は絶対座標の直線pathではありません",
    ]);
    expect(mismatchedPath.errors).toEqual([
      "/maps/test.svg: edge_a の始終点が参照ノード座標と一致しません",
    ]);
  });

  test("stair/entrance属性の要素種別と孤立IDを検証する", async () => {
    const wrongKinds = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="corridor" data-stair-id="stairs-a" data-entrance-id="entrance-a" cx="0" cy="0" />',
      ),
    );
    const isolated = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="stairs" data-stair-id="stairs-a" cx="0" cy="0" /><circle id="node_b" data-route-node="" data-kind="entrance" data-entrance-id="entrance-a" cx="1" cy="1" />',
      ),
    );

    expect(wrongKinds.errors).toEqual([
      "/maps/test.svg: node_a のdata-stair-idはstairsノードにのみ付けられます",
      "/maps/test.svg: node_a のdata-entrance-idはentranceノードにのみ付けられます",
    ]);
    expect(isolated.errors).toEqual([
      "data-stair-id stairs-a は2フロア以上に配置してください",
      "data-entrance-id entrance-a は2ノードに配置してください",
    ]);

    const invalidIds = await extractSingle(
      routeGroup(
        '<circle id="node_a" data-route-node="" data-kind="stairs" data-stair-id="bad!" cx="0" cy="0" /><circle id="node_b" data-route-node="" data-kind="entrance" data-entrance-id="bad!" cx="1" cy="1" />',
      ),
    );
    expect(invalidIds.errors).toEqual([
      "/maps/test.svg: node_a のdata-stair-idが不正です",
      "/maps/test.svg: node_b のdata-entrance-idが不正です",
    ]);
  });

  test("stairの非連続floorとentranceのcampus/building組合せを検証する", async () => {
    const fixtureFloors: Floor[] = [
      { id: "f1", sheetId: "s1", name: "F1" },
      { id: "f2", sheetId: "s2", name: "F2" },
      { id: "f3", sheetId: "s3", name: "F3" },
    ];
    const fixtureMapSheets: MapSheet[] = fixtureFloors.map((floor) => ({
      id: floor.sheetId,
      name: floor.name,
      svgUrl: `/maps/${floor.sheetId}.svg`,
    }));
    const sourceFor = (floorId: string, children: string): RouteSvgSource => ({
      svgUrl: `/maps/s${floorId.slice(1)}.svg`,
      content: `<svg><g id="Route" data-floor-id="${floorId}">${children}</g></svg>`,
    });
    const result = await extractRouteGraph({
      sources: [
        sourceFor(
          "f1",
          '<circle id="stairs" data-route-node="" data-kind="stairs" data-stair-id="stairs-a" cx="0" cy="0" /><circle id="entrance" data-route-node="" data-kind="entrance" data-entrance-id="entrance-a" cx="1" cy="1" />',
        ),
        sourceFor(
          "f2",
          '<circle id="entrance" data-route-node="" data-kind="entrance" data-entrance-id="entrance-a" cx="1" cy="1" />',
        ),
        sourceFor(
          "f3",
          '<circle id="stairs" data-route-node="" data-kind="stairs" data-stair-id="stairs-a" cx="0" cy="0" />',
        ),
      ],
      mapSheets: fixtureMapSheets,
      floors: fixtureFloors,
      places: [coordinatePlace("unused", "f1")],
    });

    expect(result.errors).toEqual([
      "data-stair-id stairs-a のフロアはfloors配列順で連続している必要があります",
      "data-entrance-id entrance-a はcampus側1ノードと建物側1ノードに配置してください",
    ]);
  });
});
