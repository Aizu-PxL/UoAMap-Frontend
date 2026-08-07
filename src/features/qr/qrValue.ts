export type QrLandingLocation = {
  pathname: string;
  search: string;
};

export const PUBLIC_QR_PATH_PREFIX = "/UoAMap-Frontend/q/";
export const PUBLIC_QR_ROUTE_PATH = `${PUBLIC_QR_PATH_PREFIX}:qrId`;

/**
 * QRに格納されたURLから、このアプリのQR着地ルートに対応するIDだけを取り出す。
 * 外部サイトのQRをアプリ内の現在地として誤認しないよう、originと許可パスを照合する。
 */
export function extractQrIdFromAppUrl(
  rawValue: string,
  currentAppUrl: string,
  appBaseUrl: string,
): string | null {
  let scannedUrl: URL;
  let appUrl: URL;

  try {
    appUrl = new URL(currentAppUrl);
    scannedUrl = new URL(rawValue.trim(), appUrl);
  } catch {
    return null;
  }

  if (scannedUrl.origin !== appUrl.origin) {
    return null;
  }

  const qrPathPrefixes = new Set([
    `${normalizeBasePath(appBaseUrl)}q/`,
    PUBLIC_QR_PATH_PREFIX,
  ]);
  const qrPathPrefix = [...qrPathPrefixes].find((pathPrefix) =>
    scannedUrl.pathname.startsWith(pathPrefix),
  );
  if (!qrPathPrefix) {
    return null;
  }

  const encodedQrId = scannedUrl.pathname.slice(qrPathPrefix.length);
  if (!encodedQrId || encodedQrId.includes("/")) {
    return null;
  }

  let qrId: string;
  try {
    qrId = decodeURIComponent(encodedQrId);
  } catch {
    return null;
  }

  if (
    !qrId ||
    qrId !== qrId.trim() ||
    qrId.includes("/") ||
    qrId.includes("\\") ||
    /[\u0000-\u001f\u007f]/u.test(qrId)
  ) {
    return null;
  }

  return qrId;
}

/** スキャン前の at / to / focus を保持したまま既存のQR着地ルートへ渡す。 */
export function createQrLandingLocation(
  qrId: string,
  currentSearch: string,
): QrLandingLocation {
  const search =
    currentSearch && !currentSearch.startsWith("?")
      ? `?${currentSearch}`
      : currentSearch;

  return {
    pathname: `/q/${encodeURIComponent(qrId)}`,
    search,
  };
}

function normalizeBasePath(baseUrl: string): string {
  let pathname: string;

  try {
    pathname = new URL(baseUrl, "https://app.invalid/").pathname;
  } catch {
    pathname = "/";
  }

  if (!pathname.startsWith("/")) {
    pathname = `/${pathname}`;
  }

  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}
