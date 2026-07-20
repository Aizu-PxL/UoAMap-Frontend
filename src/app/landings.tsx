import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { getPlace } from "../data/places";
import { repository } from "../data/repository";
import { createResolvedQrSearch } from "../features/qr/qrValue";

/**
 * QRの着地ルート /q/:qrId(SPEC.md 3.2)。
 * qrIdをPlaceに解決し、現在地をセットした / へ正規化する。
 * 目的地(?to=)が既にURLにあれば引き継ぐ。
 */
export function QrLanding() {
  const { qrId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
        navigate(
          {
            pathname: "/",
            search: createResolvedQrSearch(searchParams, qr.placeId),
          },
          { replace: true },
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
  }, [navigate, qrId, searchParams]);

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
    const params = new URLSearchParams(searchParams);
    if (placeId) {
      params.set("focus", placeId);
    }
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
