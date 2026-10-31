import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/index.jsx';

/** Whether this browser can read barcodes from the camera (Chrome on Android, most desktops). */
export const canScan = () =>
  typeof window !== 'undefined' &&
  'BarcodeDetector' in window &&
  Boolean(navigator.mediaDevices?.getUserMedia);

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];

/**
 * The camera, looking for a barcode. Calls onCode(digits) once and stops the camera. No library:
 * the browser's own BarcodeDetector (API ADR 0005). Where it is missing, type the digits instead.
 */
export function BarcodeScanner({ onCode, onCancel }) {
  const video = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let stream;
    let stopped = false;
    let timer;
    (async () => {
      try {
        const supported = await window.BarcodeDetector.getSupportedFormats();
        const detector = new window.BarcodeDetector({
          formats: FORMATS.filter((f) => supported.includes(f)),
        });
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (stopped) return;
        video.current.srcObject = stream;
        await video.current.play();
        const look = async () => {
          if (stopped) return;
          try {
            const [hit] = await detector.detect(video.current);
            const digits = hit?.rawValue?.replace(/\D/g, '');
            if (digits && digits.length >= 8 && digits.length <= 14) {
              stopped = true;
              onCode(digits);
              return;
            }
          } catch {
            // a frame that could not be read; try the next one
          }
          timer = setTimeout(look, 250);
        };
        look();
      } catch (err) {
        setError(
          err?.name === 'NotAllowedError'
            ? 'The camera is blocked. Allow it for this site, or type the numbers under the barcode.'
            : 'The camera could not start. Type the numbers under the barcode instead.',
        );
      }
    })();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onCode]);

  return (
    <div className="space-y-2">
      {error ? (
        <p role="alert" className="text-sm text-negative">
          {error}
        </p>
      ) : (
        <video
          ref={video}
          className="aspect-video w-full rounded-lg bg-black object-cover"
          muted
          playsInline
          aria-label="Camera: point it at the barcode"
        />
      )}
      <Button variant="ghost" onClick={onCancel}>
        Stop scanning
      </Button>
    </div>
  );
}
