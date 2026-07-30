import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { useRepository } from "../data/DataProvider";
import { getPlace } from "../data/places";
import {
  createNextMapFocusRequestState,
  createResolvedQrNavigation,
  setFocusSearchParams,
} from "./navigationSearch";
import { useLayoutControl } from "./layoutControl";

/**
 * QRの着地ルート /q/:qrId(SPEC.md 3.2)。
 * qrIdをPlaceに解決し、現在地をセットした / へ正規化する。
 * 目的地(?to=)が既にURLにあれば引き継ぐ。
 */
export function QrLanding() {
  const repository = useRepository();
  const { qrId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { requestBottomSheetSnap } = useLayoutControl();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!qrId) {
      return;
    }
    let cancelled = false;
    repository
      .resolveQr(qrId)
      .then((qr) => {
        if (cancelled) {
          return;
        }
        if (!qr) {
          setError(`このQRコード（${qrId}）は登録されていません。`);
          return;
        }
        const destination = createResolvedQrNavigation(searchParams, qr.placeId);
        requestBottomSheetSnap(destination.sheetSnapPoint);
        navigate(
          {
            pathname: destination.pathname,
            search: destination.searchParams.toString(),
          },
          {
            replace: true,
            state: createNextMapFocusRequestState(
              undefined,
              destination.mapFocusPlaceId,
            ),
          },
        );
      })
      .catch(() => {
        if (!cancelled) {
          setError("QRコードの確認に失敗しました。もう一度お試しください。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [navigate, qrId, repository, requestBottomSheetSnap, searchParams]);

  if (error) {
    return (
      <div className="landing-message" role="alert">
        <p>{error}</p>
        <p>お手数ですが、近くのスタッフにお声がけください。</p>
      </div>
    );
  }

  return <div className="landing-message">現在地を確認しています…</div>;
}

/** /p/:placeId を ?focus= に正規化する着地ルート */
export function PlaceLanding() {
  const { placeId } = useParams();
  const [searchParams] = useSearchParams();

  const place = placeId ? getPlace(placeId) : undefined;
  const destination = useMemo(() => {
    const params = placeId
      ? setFocusSearchParams(searchParams, placeId)
      : new URLSearchParams(searchParams);
    return { pathname: "/", search: params.toString() };
  }, [placeId, searchParams]);

  if (!place) {
    return (
      <div className="landing-message" role="alert">
        地点「{placeId}」は登録されていません。
      </div>
    );
  }

  return <Navigate to={destination} replace />;
}
