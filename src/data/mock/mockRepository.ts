import type { Repository } from "../repository";
import type { QrCode, Tag } from "../types";
import qrMappingsJson from "../../../uoamap-qr-mappings.json";
import { mockEvents } from "./events";

const mockTags: Tag[] = [
  { id: "A", label: "大学説明会" },
  { id: "L", label: "入試説明会" },
  { id: "E", label: "早期（飛び）入試説明会" },
  { id: "U", label: "保護者向け説明会" },
  { id: "P", label: "研究室公開" },
  { id: "T", label: "キャンパスツアー" },
  { id: "M", label: "体験授業" },
  { id: "G", label: "なんでも相談会" },
  { id: "R", label: "受験勉強相談" },
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
