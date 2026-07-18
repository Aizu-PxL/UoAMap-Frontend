import type { Repository } from "../repository";
import type { QrCode, Tag } from "../types";
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

// QR対応表のモック。実際の設置地点・採番はSPEC.md 7章の未決事項
const mockQrCodes: QrCode[] = [
  {
    qrId: "Q001",
    placeId: "sh-hall",
    kind: "fixed",
    installationNote: "学生ホール ホール入口",
  },
  {
    qrId: "Q002",
    placeId: "ubic",
    kind: "variable",
    installationNote: "UBIC受付",
  },
  {
    qrId: "Q003",
    placeId: "lh-large",
    kind: "variable",
    installationNote: "講義棟 大講義室前",
  },
];

export const mockRepository: Repository = {
  getEvents: async () => mockEvents,
  getTags: async () => mockTags,
  resolveQr: async (qrId) => {
    const qr = mockQrCodes.find((candidate) => candidate.qrId === qrId);
    return qr ? { qrId: qr.qrId, placeId: qr.placeId } : null;
  },
};
