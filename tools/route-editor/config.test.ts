import { describe, expect, test } from "bun:test";
import * as path from "path";
import { floors, mapSheets, places } from "../../src/data/places.js";
import {
  routeEditorFloorNames,
  routeEditorFloorOrder,
  routeEditorMaps,
  toRouteEditorFloorName,
} from "./config.js";

const mapsDirectory = path.join(import.meta.dirname, "../../public/maps");
const editorHtmlPath = path.join(import.meta.dirname, "../route-editor.html");

describe("route editor map config", () => {
  test("mapSheets/floorsとsheet・floor・file・name・順序が一致する", () => {
    const expected = mapSheets.map((sheet) => {
      const floor = floors.find((candidate) => candidate.sheetId === sheet.id);
      return {
        sheetId: sheet.id,
        file: path.basename(sheet.svgUrl),
        floor: floor?.id ?? null,
        name: sheet.name,
      };
    });

    const actual: Array<{
      sheetId: string;
      file: string;
      floor: string | null;
      name: string;
    }> = routeEditorMaps.map(({ sheetId, file, floor, name }) => ({
      sheetId,
      file,
      floor,
      name,
    }));
    const actualFloorOrder: string[] = [...routeEditorFloorOrder];

    expect(actual).toEqual(expected);
    expect(actualFloorOrder).toEqual(floors.map((floor) => floor.id));
    expect(Object.keys(routeEditorFloorNames)).toEqual(
      floors.map((floor) => floor.id),
    );
    expect(routeEditorFloorNames).toEqual(
      Object.fromEntries(
        floors.map((floor) => [floor.id, toRouteEditorFloorName(floor.name)]),
      ),
    );
  });

  test("全Placeのfloorがeditor設定に存在する", () => {
    const configuredFloors = new Set<string>(routeEditorFloorOrder);
    expect(
      places
        .filter((place) => !configuredFloors.has(place.floorId))
        .map((place) => place.id),
    ).toEqual([]);
  });

  test("public/mapsの全10 SVGとeditor file一覧が完全一致する", () => {
    const actualFiles = [...new Bun.Glob("*.svg").scanSync(mapsDirectory)].sort();
    const configuredFiles: string[] = routeEditorMaps
      .map((config) => config.file)
      .sort();

    expect(actualFiles).toEqual(configuredFiles);
    expect(actualFiles.length).toEqual(10);
  });

  test("チェックインHTMLは生成configをinline化し外部scriptへ依存しない", async () => {
    const html = await Bun.file(editorHtmlPath).text();

    expect(html.includes("<!-- route-editor:generated:start -->")).toEqual(true);
    expect(html.includes("<!-- route-editor:generated:end -->")).toEqual(true);
    expect(html.includes("globalThis.UOAMAP_ROUTE_EDITOR_CONFIG")).toEqual(true);
    expect(/<script\b[^>]*\bsrc\s*=/.test(html)).toEqual(false);
  });
});
