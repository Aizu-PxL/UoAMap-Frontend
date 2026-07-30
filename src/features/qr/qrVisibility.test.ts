import { describe, expect, test } from "bun:test";
import { shouldRunQrScanner } from "./qrVisibility";

describe("QR scanner visibility", () => {
  test("ページと映像領域の両方が見える場合だけカメラを動かす", () => {
    expect(shouldRunQrScanner(true, true)).toEqual(true);
    expect(shouldRunQrScanner(false, true)).toEqual(false);
    expect(shouldRunQrScanner(true, false)).toEqual(false);
    expect(shouldRunQrScanner(false, false)).toEqual(false);
  });
});
