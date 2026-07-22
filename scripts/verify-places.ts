import * as fs from "fs";
import * as path from "path";
import { places, mapSheets, floors } from "../src/data/places.js";

type MappedPlace = Extract<
  (typeof places)[number],
  { mapping: "svg" }
>;

// places.ts から mapping: "svg" な地点だけをフィルタリング
const mappedPlaces = places.filter(
  (place): place is MappedPlace => place.mapping === "svg"
);

interface VerificationError {
  placeId: string;
  placeName: string;
  svgElementId: string;
  svgFile: string;
}

const errors: VerificationError[] = [];

// 各マップされた地点について検証
for (const place of mappedPlaces) {
  // floorId から sheetId を取得
  const floor = floors.find((f) => f.id === place.floorId);
  if (!floor) {
    errors.push({
      placeId: place.id,
      placeName: place.name,
      svgElementId: place.svgElementId,
      svgFile: "unknown",
    });
    continue;
  }

  // sheetId から SVG URL を取得
  const sheet = mapSheets.find((s) => s.id === floor.sheetId);
  if (!sheet) {
    errors.push({
      placeId: place.id,
      placeName: place.name,
      svgElementId: place.svgElementId,
      svgFile: "unknown",
    });
    continue;
  }

  // SVGファイルパスを構築
  const svgFilePath = path.join(
    import.meta.dirname,
    "..",
    "public",
    sheet.svgUrl.replace(/^\//, "")
  );

  // SVGファイルが存在するか確認
  if (!fs.existsSync(svgFilePath)) {
    errors.push({
      placeId: place.id,
      placeName: place.name,
      svgElementId: place.svgElementId,
      svgFile: sheet.svgUrl,
    });
    continue;
  }

  // SVGファイルを読んで、該当IDが存在するか確認
  const svgContent = fs.readFileSync(svgFilePath, "utf-8");
  const idPattern = new RegExp(`id="${place.svgElementId}"`);

  if (!idPattern.test(svgContent)) {
    errors.push({
      placeId: place.id,
      placeName: place.name,
      svgElementId: place.svgElementId,
      svgFile: sheet.svgUrl,
    });
  }
}

// 結果を出力
if (errors.length > 0) {
  console.error("SVG要素の検証失敗:");
  for (const error of errors) {
    console.error(
      `  - ${error.placeId} (${error.placeName}): id="${error.svgElementId}" が ${error.svgFile} に見つかりません`
    );
  }
  process.exit(1);
} else {
  console.log(`✓ 全 ${mappedPlaces.length} 個のマップされた地点の検証に成功しました`);
  process.exit(0);
}
