export type MapFocusRequestState = {
  mapFocusRequestNonce: number;
};

export function setDestinationSearchParams(
  currentSearch: URLSearchParams,
  eventId: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("to", eventId);
  params.delete("focus");
  return params;
}

export function setFocusSearchParams(
  currentSearch: URLSearchParams,
  placeId: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("focus", placeId);
  return params;
}

export function setResolvedQrSearchParams(
  currentSearch: URLSearchParams,
  placeId: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("at", placeId);
  params.delete("focus");
  return params;
}

export function setEventHighlightSearchParams(
  currentSearch: URLSearchParams,
  eventId: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("highlight", eventId);
  return params;
}

export function createNextMapFocusRequestState(
  currentState: unknown,
): MapFocusRequestState {
  const previousNonce = getMapFocusRequestNonce(currentState);
  return { mapFocusRequestNonce: previousNonce + 1 };
}

function getMapFocusRequestNonce(currentState: unknown): number {
  if (typeof currentState !== "object" || currentState === null) {
    return 0;
  }

  const nonce = (currentState as Record<string, unknown>).mapFocusRequestNonce;
  return typeof nonce === "number" ? nonce : 0;
}
