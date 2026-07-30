import { useEffect, useRef, useState } from "react";
import QrScanner from "qr-scanner";
import { useLocation, useNavigate } from "react-router";
import {
  createQrLandingLocation,
  extractQrIdFromAppUrl,
} from "./qrValue";
import { shouldRunQrScanner } from "./qrVisibility";

type ScannerPhase = "starting" | "scanning" | "failed";

export function QrPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanHandledRef = useRef(false);
  const [phase, setPhase] = useState<ScannerPhase>("starting");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [isDocumentVisible, setIsDocumentVisible] = useState(
    () => document.visibilityState === "visible",
  );
  const [isVideoVisible, setIsVideoVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const updateVisibility = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (!("IntersectionObserver" in window)) {
      setIsVideoVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsVideoVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.01 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !shouldRunQrScanner(isDocumentVisible, isVideoVisible)) {
      return;
    }

    let active = true;
    let scanner: QrScanner | null = null;
    scanHandledRef.current = false;
    setPhase("starting");
    setFeedback(null);

    if (!window.isSecureContext) {
      setPhase("failed");
      setFeedback(
        "カメラはHTTPSで開いたときだけ利用できます。サイトのURLをご確認ください。",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setPhase("failed");
      setFeedback("このブラウザではカメラを利用できません。");
      return;
    }

    scanner = new QrScanner(
      video,
      (result) => {
        if (!active || scanHandledRef.current) {
          return;
        }

        const qrId = extractQrIdFromAppUrl(
          result.data,
          window.location.href,
          import.meta.env.BASE_URL,
        );
        if (!qrId) {
          setFeedback(
            "道案内用のQRコードではありません。別のQRコードを読み込んでください。",
          );
          return;
        }

        scanHandledRef.current = true;
        void scanner?.pause(true);
        navigate(createQrLandingLocation(qrId, location.search));
      },
      {
        preferredCamera: "environment",
        maxScansPerSecond: 10,
        returnDetailedScanResult: true,
        onDecodeError: () => {
          // QRがフレームにない間は正常な待機状態なので表示を更新しない。
        },
      },
    );

    const startScanner = async () => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await scanner?.start();
          if (active) {
            setPhase("scanning");
          }
          return;
        } catch {
          if (!active) {
            return;
          }
          if (attempt === 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 400));
          }
        }
      }

      if (active) {
        setPhase("failed");
        setFeedback(
          "カメラを利用できません。ブラウザのカメラ許可を確認して、もう一度お試しください。",
        );
      }
    };

    void startScanner();

    return () => {
      active = false;
      scanHandledRef.current = false;
      void scanner?.pause(true);
      scanner?.destroy();
    };
  }, [isDocumentVisible, isVideoVisible, location.search, navigate, retryNonce]);

  return (
    <div className="qr-panel">
      <p className="qr-panel__copy">
        道案内QRコードを読み込んでください。
        <br />
        指定した場所へのルートが表示されます
      </p>
      <div className="qr-panel__camera">
        <video
          aria-label="QRコード読み取り用カメラ映像"
          className="qr-panel__video"
          muted
          playsInline
          ref={videoRef}
        />
        {phase !== "scanning" || feedback ? (
          <div
            className={`qr-panel__feedback qr-panel__feedback--${phase}`}
            role={phase === "failed" || feedback ? "alert" : "status"}
          >
            <p>
              {feedback ??
                (phase === "starting"
                  ? "カメラを起動しています…"
                  : "QRコードをカメラに映してください。")}
            </p>
            {phase === "failed" ? (
              <button
                className="qr-panel__retry"
                onClick={() => setRetryNonce((current) => current + 1)}
                type="button"
              >
                もう一度試す
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
