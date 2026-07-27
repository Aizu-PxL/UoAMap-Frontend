import type { Repository } from "../repository";
import type { QrCode, Tag } from "../types";
import qrMappingsJson from "../../../uoamap-qr-mappings.json";
import { mockEvents } from "./events";

const mockTags: Tag[] = [
  { id: "info", label: "総合案内" },
  { id: "briefing", label: "説明会" },
  { id: "tour", label: "見学" },
  { id: "openlab", label: "研究室公開" },
  { id: "trial", label: "体験授業" },
  { id: "consult", label: "相談" },
  { id: "service", label: "休憩・買物" },
];

function qrKind(value: string): QrCode["kind"] {
  if (value === "fixed" || value === "variable") return value;
  throw new TypeError(`不正なQR種別です: ${value}`);
}

// Route Editor計画から今回手動出力したQR対応表。物理QRの印刷承認とは分離する。
const mockQrCodes: QrCode[] = qrMappingsJson.map((mapping) => ({
  qrId: mapping.qrId,
  placeId: mapping.placeId,
  kind: qrKind(mapping.kind),
  installationNote: mapping.installationNote,
}));

export const mockRepository: Repository = {
  getEvents: async () => mockEvents,
  getTags: async () => mockTags,
  resolveQr: async (qrId) => {
    const qr = mockQrCodes.find((candidate) => candidate.qrId === qrId);
    return qr ? { qrId: qr.qrId, placeId: qr.placeId } : null;
  },
};
