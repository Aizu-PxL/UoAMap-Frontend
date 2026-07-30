import * as fs from "fs";
import * as path from "path";
import placeProposals from "../uoamap-place-proposals.json";
import qrMappings from "../uoamap-qr-mappings.json";
import qrPlacementPlan from "../uoamap-qr-placement-plan.json";
import { mockEvents } from "../src/data/mock/events.js";
import { mockRepository } from "../src/data/mock/mockRepository.js";
import { floors, mapSheets, places } from "../src/data/places.js";

const EXPECTED_PLACE_COUNT = 109;
const EXPECTED_QR_COUNT = 74;
const EXPECTED_EVENT_COUNT = 60;
const EXPECTED_EVENT_ID_COUNT = 55;
const EXPECTED_EVENT_CATEGORIES = [
  ["A", "大学説明会"],
  ["L", "入試説明会"],
  ["E", "早期（飛び）入試説明会"],
  ["U", "保護者向け説明会"],
  ["P", "研究室公開"],
  ["T", "キャンパスツアー"],
  ["M", "体験授業"],
  ["G", "なんでも相談会"],
  ["R", "受験勉強相談"],
] as const;
const EVENT_CATEGORY_IDS: ReadonlySet<string> = new Set(
  EXPECTED_EVENT_CATEGORIES.map(([id]) => id),
);
const IDLESS_EVENT_KEYS = new Set([
  "service-reception",
  "service-self-guided-tour",
  "service-rest-area",
  "service-lunch",
  "service-shop",
]);
const EVENT_TIME_PATTERN =
  /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\+09:00$/;

const errors: string[] = [];
const floorById = new Map(floors.map((floor) => [floor.id, floor]));
const sheetById = new Map(mapSheets.map((sheet) => [sheet.id, sheet]));
const placeById = new Map(places.map((place) => [place.id, place]));
const mockTags = await mockRepository.getTags();

function fail(message: string) {
  errors.push(message);
}

function findDuplicates(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSvg(sheetId: string): { content: string; url: string } | undefined {
  const sheet = sheetById.get(sheetId);
  if (!sheet) return undefined;
  const filePath = path.join(
    import.meta.dirname,
    "..",
    "public",
    sheet.svgUrl.replace(/^\//, ""),
  );
  if (!fs.existsSync(filePath)) return undefined;
  return { content: fs.readFileSync(filePath, "utf-8"), url: sheet.svgUrl };
}

function getViewBox(content: string): [number, number, number, number] | undefined {
  const match = content.match(/<svg\b[^>]*\bviewBox="([^"]+)"/s);
  if (match) {
    const values = match[1].trim().split(/\s+/).map(Number);
    if (values.length === 4 && values.every((value) => Number.isFinite(value))) {
      return values as [number, number, number, number];
    }
  }
  const root = content.match(/<svg\b([^>]*)>/s)?.[1];
  const width = Number(root?.match(/\bwidth="([^"]+)"/)?.[1]);
  const height = Number(root?.match(/\bheight="([^"]+)"/)?.[1]);
  return Number.isFinite(width) && Number.isFinite(height)
    ? [0, 0, width, height]
    : undefined;
}

if (places.length !== EXPECTED_PLACE_COUNT) {
  fail(`Place件数: ${places.length}（期待値 ${EXPECTED_PLACE_COUNT}）`);
}
for (const duplicate of findDuplicates(places.map((place) => place.id))) {
  fail(`Place ID重複: ${duplicate}`);
}

for (const place of places) {
  const floor = floorById.get(place.floorId);
  if (!floor) {
    fail(`${place.id}: 未登録floor ${place.floorId}`);
    continue;
  }
  const svg = getSvg(floor.sheetId);
  if (!svg) {
    fail(`${place.id}: floor ${place.floorId} のSVGを読めません`);
    continue;
  }

  if (place.mapping === "svg") {
    const idPattern = new RegExp(`\\bid="${escapeRegExp(place.svgElementId)}"`);
    if (!idPattern.test(svg.content)) {
      fail(`${place.id}: id="${place.svgElementId}" が ${svg.url} にありません`);
    }
  } else if (place.mapping === "coordinates") {
    const viewBox = getViewBox(svg.content);
    if (!viewBox) {
      fail(`${place.id}: ${svg.url} のviewBoxを読めません`);
      continue;
    }
    const [minX, minY, width, height] = viewBox;
    const { x, y } = place.coordinates;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < minX ||
      x > minX + width ||
      y < minY ||
      y > minY + height
    ) {
      fail(`${place.id}: 座標 (${x}, ${y}) が ${svg.url} のviewBox外です`);
    }
  } else if (place.id !== "campus-all") {
    fail(`${place.id}: Route非対応Placeはcampus-allだけです`);
  }
}

if (placeProposals.length !== EXPECTED_QR_COUNT) {
  fail(`Place案件数: ${placeProposals.length}（期待値 ${EXPECTED_QR_COUNT}）`);
}
for (const duplicate of findDuplicates(placeProposals.map((item) => item.id))) {
  fail(`Place案ID重複: ${duplicate}`);
}

if (qrPlacementPlan.schemaVersion !== 1) fail("計画JSON schemaVersionは1が必要です");
if (qrPlacementPlan.nextQrNumber !== 75) fail("計画JSON nextQrNumberは75が必要です");
if (qrPlacementPlan.placements.length !== EXPECTED_QR_COUNT) {
  fail(`計画placements件数: ${qrPlacementPlan.placements.length}`);
}
if (qrPlacementPlan.placeProposals.length !== EXPECTED_QR_COUNT) {
  fail(`計画placeProposals件数: ${qrPlacementPlan.placeProposals.length}`);
}

const planProposalById = new Map(
  qrPlacementPlan.placeProposals.map((proposal) => [proposal.id, proposal]),
);
for (const proposal of placeProposals) {
  const place = placeById.get(proposal.id);
  if (!place || place.mapping !== "coordinates") {
    fail(`${proposal.id}: Place案に対応する座標Placeがありません`);
  } else if (
    place.floorId !== proposal.floorId ||
    place.name !== proposal.name ||
    place.coordinates.x !== proposal.coordinates.x ||
    place.coordinates.y !== proposal.coordinates.y
  ) {
    fail(`${proposal.id}: Place案とplaces.tsが一致しません`);
  }

  const planProposal = planProposalById.get(proposal.id);
  if (
    !planProposal ||
    planProposal.floorId !== proposal.floorId ||
    planProposal.name !== proposal.name ||
    planProposal.x !== proposal.coordinates.x ||
    planProposal.y !== proposal.coordinates.y
  ) {
    fail(`${proposal.id}: Place案JSONと計画JSONのplaceProposalsが一致しません`);
  }
}

if (qrMappings.length !== EXPECTED_QR_COUNT) {
  fail(`QR対応表件数: ${qrMappings.length}（期待値 ${EXPECTED_QR_COUNT}）`);
}
for (const duplicate of findDuplicates(qrMappings.map((item) => item.qrId))) {
  fail(`QR ID重複: ${duplicate}`);
}
for (let index = 0; index < EXPECTED_QR_COUNT; index += 1) {
  const expectedQrId = `Q${String(index + 1).padStart(3, "0")}`;
  const placement = qrPlacementPlan.placements[index];
  const mapping = qrMappings[index];
  if (placement?.qrId !== expectedQrId || mapping?.qrId !== expectedQrId) {
    fail(`QR順序: ${index + 1}番目は${expectedQrId}が必要です`);
    continue;
  }
  if (
    placement.placeId !== mapping.placeId ||
    placement.kind !== mapping.kind ||
    placement.installationNote !== mapping.installationNote
  ) {
    fail(`${expectedQrId}: 計画placementsとQR対応表が一致しません`);
  }
  if (placement.placeId !== placement.routeNodeId) {
    fail(`${expectedQrId}: placeIdとrouteNodeIdが一致しません`);
  }
  const proposal = placeProposals.find((item) => item.id === placement.placeId);
  if (
    !proposal ||
    proposal.floorId !== placement.floorId ||
    proposal.name !== placement.installationNote ||
    proposal.coordinates.x !== placement.x ||
    proposal.coordinates.y !== placement.y
  ) {
    fail(`${expectedQrId}: placementsとPlace案JSONのID・座標・名称が一致しません`);
  }
  if (!placeById.has(mapping.placeId)) fail(`${expectedQrId}: 未登録Place ${mapping.placeId}`);
}

if (mockEvents.length !== EXPECTED_EVENT_COUNT) {
  fail(`Event件数: ${mockEvents.length}（期待値 ${EXPECTED_EVENT_COUNT}）`);
}
if (
  JSON.stringify(mockTags.map(({ id, label }) => [id, label])) !==
  JSON.stringify(EXPECTED_EVENT_CATEGORIES)
) {
  fail("EventカテゴリはA/L/E/U/P/T/M/G/RのID・表示名・順序との完全一致が必要です");
}
for (const duplicate of findDuplicates(mockEvents.map((event) => event.key))) {
  fail(`Event key重複: ${duplicate}`);
}
const eventIds = mockEvents.flatMap((event) => (event.id ? [event.id] : []));
if (eventIds.length !== EXPECTED_EVENT_ID_COUNT) {
  fail(`正式Event ID件数: ${eventIds.length}（期待値 ${EXPECTED_EVENT_ID_COUNT}）`);
}
for (const duplicate of findDuplicates(eventIds)) {
  fail(`Event ID重複: ${duplicate}`);
}
for (const event of mockEvents) {
  if (!placeById.has(event.placeId)) fail(`${event.key}: 未登録Place ${event.placeId}`);
  if (event.id === undefined) {
    if (!IDLESS_EVENT_KEYS.has(event.key)) {
      fail(`${event.key}: 正式IDなしEventの内部keyが許可一覧にありません`);
    }
    if (event.tags.length !== 0) {
      fail(`${event.key}: 正式IDなしEventのtagsは空配列が必要です`);
    }
  } else {
    if (!/^[ALEUPTMGR]\d+$/.test(event.id)) {
      fail(`${event.key}: 正式Event IDはA/L/E/U/P/T/M/G/R + 数字が必要です`);
    }
    if (event.key !== event.id) {
      fail(`${event.key}: 正式IDありEventはkeyとidの一致が必要です`);
    }
    const expectedTagId = event.id[0];
    if (
      event.tags.length !== 1 ||
      event.tags[0] !== expectedTagId ||
      !EVENT_CATEGORY_IDS.has(expectedTagId)
    ) {
      fail(`${event.key}: Event.tagsは正式IDの先頭文字1件との一致が必要です`);
    }
  }
  if (event.timeSlots.length === 0) fail(`${event.key}: timeSlotsが空です`);

  let previousEnd = Number.NEGATIVE_INFINITY;
  for (const [index, timeSlot] of event.timeSlots.entries()) {
    const start = EVENT_TIME_PATTERN.test(timeSlot.start)
      ? Date.parse(timeSlot.start)
      : Number.NaN;
    const end =
      timeSlot.end === undefined
        ? undefined
        : EVENT_TIME_PATTERN.test(timeSlot.end)
          ? Date.parse(timeSlot.end)
          : Number.NaN;
    if (!Number.isFinite(start)) {
      fail(`${event.key}: timeSlots[${index}].startは+09:00付きISO 8601時刻が必要です`);
      continue;
    }
    if (end !== undefined && (!Number.isFinite(end) || end <= start)) {
      fail(`${event.key}: timeSlots[${index}].endが不正か開始時刻より後ではありません`);
    }
    if (start < previousEnd) {
      fail(`${event.key}: timeSlotsが時刻順でないか重複しています`);
    }
    previousEnd = end ?? start;
    const isStartOnlyConsultation = /^R[1-9]$/.test(event.id ?? "");
    if (isStartOnlyConsultation && end !== undefined) {
      fail(`${event.key}: 公式終了時刻がないためendは省略が必要です`);
    }
    if (end === undefined && !isStartOnlyConsultation) {
      fail(`${event.key}: 終了時刻を省略できるのはR1〜R9だけです`);
    }
  }
}

for (const key of IDLESS_EVENT_KEYS) {
  if (!mockEvents.some((event) => event.key === key && event.id === undefined)) {
    fail(`${key}: 正式IDなしEventがありません`);
  }
}

if (errors.length > 0) {
  console.error("Place・QR・Event検証失敗:");
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `✓ Place・QR・Event検証成功: ${places.length} Place / ${qrMappings.length} QR / ${mockEvents.length} Event`,
);
