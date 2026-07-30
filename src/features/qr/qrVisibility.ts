export function shouldRunQrScanner(
  isDocumentVisible: boolean,
  isVideoVisible: boolean,
): boolean {
  return isDocumentVisible && isVideoVisible;
}
