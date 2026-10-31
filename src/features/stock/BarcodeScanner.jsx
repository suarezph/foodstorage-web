import { useEffect, useRef, useState } from 'react';
import { Button } from '../../components/ui/index.jsx';

/** Whether this browser has a camera to scan with. The barcode reader itself always works. */
export const canScan = () =>
  typeof window !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'itf'];

/**
 * The browser's own BarcodeDetector when it reads these formats (Chrome on Android), otherwise the
 * `barcode-detector` polyfill (ZXing in WebAssembly, for iPhone Safari). The polyfill is loaded
 * only when scanning starts, and its .wasm file comes from this site, never a CDN (API ADR 0005).
 */
async function makeDetector() {
  if ('BarcodeDetector' in window) {
    try {
      const supported = await window.BarcodeDetector.getSupportedFormats();
      const formats = FORMATS.filter((f) => supported.includes(f));
      if (formats.length) return new window.BarcodeDetector({ formats });
    } catch {
      // fall through to the polyfill
    }
  }
  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
    },
  });
  return new BarcodeDetector({ formats: FORMATS });
}

/**
 * The camera, looking for a barcode. Calls onCode(digits) once and stops the camera. If the camera
 * cannot start, the digits can be typed instead.
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
        const detector = await makeDetector();
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
