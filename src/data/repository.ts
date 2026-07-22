import type { Event, QrResolution, Tag } from "./types";

// docs/API.md の契約に対応するデータ取得層。
// UIはこのインターフェースだけに依存し、バックエンド完成時は
// ここでAPI実装に差し替える(SPEC.md 5.1)。

export interface Repository {
  /** GET /api/events 相当。起動時に全件取得し、検索はクライアント側で行う */
  getEvents(): Promise<Event[]>;
  /** GET /api/tags 相当 */
  getTags(): Promise<Tag[]>;
  /** GET /api/qrs/{qrId} 相当。未知のqrIdはnull */
  resolveQr(qrId: string): Promise<QrResolution | null>;
}
