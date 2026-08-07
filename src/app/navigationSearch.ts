export type MapFocusRequestState = {
  mapFocusRequestNonce: number;
  mapFocusPlaceId?: string;
};

export type GuidedNavigation = {
  pathname: "/" | "/qr";
  searchParams: URLSearchParams;
  sheetSnapPoint: 22 | 82;
  mapFocusPlaceId?: string;
};

export function setDestinationSearchParams(
  currentSearch: URLSearchParams,
  eventKey: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("to", eventKey);
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
  eventKey: string,
): URLSearchParams {
  const params = new URLSearchParams(currentSearch);
  params.set("highlight", eventKey);
  return params;
}

export function createDestinationNavigation(
  currentSearch: URLSearchParams,
  eventKey: string,
  routableCurrentPlaceId: string | null,
): GuidedNavigation {
  const searchParams = setDestinationSearchParams(currentSearch, eventKey);
  return routableCurrentPlaceId
    ? {
        pathname: "/",
        searchParams,
        sheetSnapPoint: 22,
        mapFocusPlaceId: routableCurrentPlaceId,
      }
    : { pathname: "/qr", searchParams, sheetSnapPoint: 82 };
}

export function createResolvedQrNavigation(
  currentSearch: URLSearchParams,
  placeId: string,
): GuidedNavigation {
  return {
    pathname: "/",
    searchParams: setResolvedQrSearchParams(currentSearch, placeId),
    sheetSnapPoint: 22,
    mapFocusPlaceId: placeId,
  };
}

export function getEventDetailPath(eventKey: string, eventId?: string): string {
  return eventId
    ? `/e/${encodeURIComponent(eventId)}`
    : `/events/${encodeURIComponent(eventKey)}`;
}

export function getEntrySheetSnapPoint(pathname: string): 82 | null {
  const pathSegments = pathname.split("/").filter(Boolean);
  if (pathSegments.length === 1 && pathSegments[0] === "qr") {
    return 82;
  }

  if (
    pathSegments.length === 2 &&
    (pathSegments[0] === "e" || pathSegments[0] === "events")
  ) {
    return 82;
  }

  return null;
}

// Date.now()シード: history.stateに残った過去ドキュメントのnonceとリロード後に
// 衝突しないよう、ドキュメントごとに単調増加かつ全ドキュメント横断でほぼ一意にする。
let mapFocusRequestNonceSource = Date.now();

export function createNextMapFocusRequestState(
  mapFocusPlaceId?: string,
): MapFocusRequestState {
  mapFocusRequestNonceSource += 1;
  return {
    mapFocusRequestNonce: mapFocusRequestNonceSource,
    ...(mapFocusPlaceId ? { mapFocusPlaceId } : {}),
  };
}

// 0は「location.stateにフォーカス要求がない」センチネル(AppLayoutが生成)。
export function isNewMapFocusRequest(
  lastHandledNonce: number,
  nonce: number,
): boolean {
  return nonce !== 0 && nonce !== lastHandledNonce;
}
