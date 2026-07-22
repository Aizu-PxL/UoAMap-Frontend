export const PLAN_SCHEMA_VERSION = 1 as const;

export type QrPlacement = {
  qrId: string;
  sheetId: string;
  routeNodeId: string;
  placeId: string;
  kind: string;
  installationNote: string;
};

export type PlaceProposal = {
  id: string;
  name: string;
  sheetId: string;
  routeNodeId: string;
};

export type ResolvedPlanLocation = {
  floorId: string | null;
  x: number | null;
  y: number | null;
};

export type PlanLocationResolver = (
  sheetId: string,
  routeNodeId: string,
) => ResolvedPlanLocation | null;

export type PlanPlacement = QrPlacement & {
  floorId: string | null;
  x: number | null;
  y: number | null;
};

export type PlanPlaceProposal = PlaceProposal & {
  floorId: string | null;
  x: number | null;
  y: number | null;
};

export type RouteEditorPlan = {
  schemaVersion: typeof PLAN_SCHEMA_VERSION;
  nextQrNumber: number;
  placements: PlanPlacement[];
  placeProposals: PlanPlaceProposal[];
};

export type QrMapping = Pick<
  QrPlacement,
  "qrId" | "placeId" | "kind" | "installationNote"
>;

export type CoordinatePlaceProposal = {
  id: string;
  floorId: string | null;
  name: string;
  mapping: "coordinates";
  coordinates: { x: number; y: number };
};

export type ImportedRouteEditorPlan = {
  nextQrNumber: number;
  placements: QrPlacement[];
  placeProposals: PlaceProposal[];
};

export function numericQrPart(qrId: string): number {
  const match = /^Q(\d+)$/.exec(qrId);
  return match ? Number(match[1]) : -1;
}

export function compareQrPlacements(
  left: Pick<QrPlacement, "qrId">,
  right: Pick<QrPlacement, "qrId">,
): number {
  const leftNumber = numericQrPart(left.qrId);
  const rightNumber = numericQrPart(right.qrId);
  return leftNumber === rightNumber
    ? left.qrId.localeCompare(right.qrId)
    : leftNumber - rightNumber;
}

function roundCoordinate(value: number): number {
  return Math.round(value * 100) / 100;
}

function resolveInformationalLocation(
  sheetId: string,
  routeNodeId: string,
  resolveLocation: PlanLocationResolver,
): Pick<PlanPlacement, "floorId" | "x" | "y"> {
  const location = resolveLocation(sheetId, routeNodeId);
  return location
    ? {
        floorId: location.floorId,
        x: location.x === null ? null : roundCoordinate(location.x),
        y: location.y === null ? null : roundCoordinate(location.y),
      }
    : { floorId: null, x: null, y: null };
}

export function createRouteEditorPlan(input: {
  nextQrNumber: number;
  placements: readonly QrPlacement[];
  placeProposals: readonly PlaceProposal[];
  resolveLocation: PlanLocationResolver;
}): RouteEditorPlan {
  return {
    schemaVersion: PLAN_SCHEMA_VERSION,
    nextQrNumber: input.nextQrNumber,
    placements: [...input.placements]
      .sort(compareQrPlacements)
      .map((placement) => ({
        ...placement,
        ...resolveInformationalLocation(
          placement.sheetId,
          placement.routeNodeId,
          input.resolveLocation,
        ),
      })),
    placeProposals: [...input.placeProposals]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((proposal) => ({
        ...proposal,
        ...resolveInformationalLocation(
          proposal.sheetId,
          proposal.routeNodeId,
          input.resolveLocation,
        ),
      })),
  };
}

export function createQrMappings(
  placements: readonly QrPlacement[],
): QrMapping[] {
  return [...placements].sort(compareQrPlacements).map((placement) => ({
    qrId: placement.qrId,
    placeId: placement.placeId,
    kind: placement.kind,
    installationNote: placement.installationNote.trim(),
  }));
}

export function createCoordinatePlaceProposals(
  proposals: readonly PlaceProposal[],
  resolveLocation: PlanLocationResolver,
): CoordinatePlaceProposal[] {
  const result: CoordinatePlaceProposal[] = [];
  for (const proposal of [...proposals].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const location = resolveLocation(proposal.sheetId, proposal.routeNodeId);
    if (!location || location.x === null || location.y === null) continue;
    result.push({
      id: proposal.id,
      floorId: location.floorId,
      name: proposal.name,
      mapping: "coordinates",
      coordinates: {
        x: roundCoordinate(location.x),
        y: roundCoordinate(location.y),
      },
    });
  }
  return result;
}

export function serializeJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function csvCell(value: unknown): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeQrMappingsCsv(mappings: readonly QrMapping[]): string {
  const rows: unknown[][] = [
    ["qrId", "placeId", "kind", "installationNote"],
    ...mappings.map((mapping) => [
      mapping.qrId,
      mapping.placeId,
      mapping.kind,
      mapping.installationNote,
    ]),
  ];
  return `\ufeff${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asPlanEntry(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    throw new TypeError("計画JSONの要素が不正です");
  }
  return Object(value) as Record<string, unknown>;
}

function existingStringCoercion(value: unknown): string {
  return String(value || "");
}

export function parseRouteEditorPlan(data: unknown): ImportedRouteEditorPlan {
  const plan = asRecord(data);
  if (
    plan.schemaVersion !== PLAN_SCHEMA_VERSION ||
    !Array.isArray(plan.placements) ||
    !Array.isArray(plan.placeProposals)
  ) {
    throw new Error("対応していない計画JSONです");
  }

  const ids = new Set<string>();
  const placements: QrPlacement[] = [];
  for (const raw of plan.placements) {
    const value = asPlanEntry(raw);
    const placement = {
      qrId: existingStringCoercion(value.qrId),
      sheetId: existingStringCoercion(value.sheetId),
      routeNodeId: existingStringCoercion(value.routeNodeId),
      placeId: existingStringCoercion(value.placeId),
      kind: existingStringCoercion(value.kind),
      installationNote: existingStringCoercion(value.installationNote),
    };
    if (ids.has(placement.qrId)) {
      throw new Error(`QR IDが重複しています: ${placement.qrId}`);
    }
    ids.add(placement.qrId);
    placements.push(placement);
  }

  const proposalIds = new Set<string>();
  const placeProposals: PlaceProposal[] = [];
  for (const raw of plan.placeProposals) {
    const value = asPlanEntry(raw);
    const proposal = {
      id: existingStringCoercion(value.id),
      name: existingStringCoercion(value.name),
      sheetId: existingStringCoercion(value.sheetId),
      routeNodeId: existingStringCoercion(value.routeNodeId),
    };
    if (proposalIds.has(proposal.id)) {
      throw new Error(`Place案IDが重複しています: ${proposal.id}`);
    }
    proposalIds.add(proposal.id);
    placeProposals.push(proposal);
  }

  const maxQrNumber = Math.max(
    0,
    ...placements.map((placement) => numericQrPart(placement.qrId)),
  );
  return {
    placements,
    placeProposals,
    nextQrNumber: Math.max(Number(plan.nextQrNumber) || 1, maxQrNumber + 1),
  };
}

export const routeEditorPlanIo = {
  compareQrPlacements,
  createCoordinatePlaceProposals,
  createQrMappings,
  createRouteEditorPlan,
  numericQrPart,
  parseRouteEditorPlan,
  serializeJson,
  serializeQrMappingsCsv,
};

export type RouteEditorPlanIo = typeof routeEditorPlanIo;
